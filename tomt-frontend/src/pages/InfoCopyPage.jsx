import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import * as profileLinkService from '../api/profileLinkService.js';
import './InfoCopyPage.css';

/**
 * Ports infocopy.html exactly - same markup, classes, copy, per-item
 * URL blur/reveal toggle, password badge, and the temporary checkmark
 * copy-confirmation swap. localStorage reads/writes are replaced with
 * /api/placement/links (see profileLinkController.js); search filtering
 * stays client-side, exactly like the original.
 */
export default function InfoCopyPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [formVisible, setFormVisible] = useState(false);

  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [password, setPassword] = useState('');

  const [visibleUrlIds, setVisibleUrlIds] = useState({});
  const [copiedButtonKey, setCopiedButtonKey] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Private Info';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setProfiles(await profileLinkService.listProfileLinks());
    } catch (err) {
      setError('Could not load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleForm() {
    setFormVisible((v) => !v);
  }

  const filtered = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return profiles.filter((p) => p.name.toLowerCase().includes(query));
  }, [profiles, searchTerm]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const created = await profileLinkService.createProfileLink({ name, link, password });
      setProfiles((prev) => [...prev, created]);
      setName('');
      setLink('');
      setPassword('');
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not add profile.';
      setError(message);
    }
  }

  function toggleUrl(id) {
    setVisibleUrlIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedButtonKey(key);
      setTimeout(() => setCopiedButtonKey((k) => (k === key ? null : k)), 1500);
    });
  }

  async function deleteProfile(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this profile?')) return;
    try {
      await profileLinkService.deleteProfileLink(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Could not delete profile. Please try again.');
    }
  }

  return (
    <div className="infocopy-page-root">
      <div className="app-container">
        <Link to="/placement" className="back-button">
          🏠 Back to Dashboard
        </Link>

        <div className="header-row">
          <h2>🔑 Important Profiles</h2>
          <button
            type="button"
            id="toggle-form-btn"
            className="btn btn-add"
            style={{ background: formVisible ? 'var(--danger-color)' : 'var(--accent-gradient)' }}
            onClick={toggleForm}
          >
            {formVisible ? '✖️ Close Form' : '➕ Add New Profile'}
          </button>
        </div>

        {formVisible && (
          <div id="add-form-container" style={{ display: 'block' }}>
            <form id="link-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="profile-name">Profile Name</label>
                <input type="text" id="profile-name" placeholder="e.g. Personal Gmail" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="form-inline-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="profile-link">Link (URL)</label>
                  <input type="url" id="profile-link" placeholder="https://..." required value={link} onChange={(e) => setLink(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="profile-password">Password (Optional)</label>
                  <input type="password" id="profile-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-add btn-submit">
                  ➕ Add Profile
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="search-section">
          <div className="form-group">
            <label htmlFor="profile-search" style={{ color: 'var(--secondary-color)' }}>
              🔍 Search Profiles
            </label>
            <input type="text" id="profile-search" placeholder="Type to filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {error && <div className="infocopy-error">{error}</div>}

        <h3 style={{ color: 'var(--heading-color)', fontSize: '1.1em', marginTop: '25px' }}>Stored Links</h3>
        <ul id="links-list">
          {loading ? (
            <li style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</li>
          ) : filtered.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No profiles found.</li>
          ) : (
            filtered.map((profile) => {
              const hasPass = profile.password && profile.password.trim() !== '';
              const urlVisible = Boolean(visibleUrlIds[profile.id]);

              return (
                <li className="link-item" key={profile.id}>
                  <div className="link-details">
                    <div className="link-name">{profile.name}</div>
                    <div className="link-url-container">
                      <div className={`link-url${urlVisible ? ' visible' : ''}`}>{profile.link}</div>
                      <button type="button" className="view-toggle" onClick={() => toggleUrl(profile.id)}>
                        {urlVisible ? 'Hide URL' : 'Show URL'}
                      </button>
                    </div>
                    {hasPass && <div className="link-password-badge">🔒 Password Protected</div>}
                  </div>
                  <div className="link-actions">
                    <a href={profile.link} target="_blank" rel="noreferrer" className="action-icon-btn" title="Open Link">
                      🔗
                    </a>
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Copy URL"
                      onClick={() => copyText(profile.link, `${profile.id}-url`)}
                    >
                      {copiedButtonKey === `${profile.id}-url` ? '✅' : '📋 URL'}
                    </button>
                    {hasPass && (
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Copy Pass"
                        onClick={() => copyText(profile.password, `${profile.id}-pass`)}
                      >
                        {copiedButtonKey === `${profile.id}-pass` ? '✅' : '📋 Pass'}
                      </button>
                    )}
                    <button type="button" className="action-icon-btn" style={{ color: 'var(--danger-color)' }} title="Delete" onClick={() => deleteProfile(profile.id)}>
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
