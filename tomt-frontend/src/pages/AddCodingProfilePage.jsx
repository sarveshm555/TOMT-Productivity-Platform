import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import * as codingProfileService from '../api/codingProfileService.js';
import './AddCodingProfilePage.css';

/**
 * Ports add-coding-profile.html exactly - same markup, classes, copy, and
 * the add/edit dual-mode behavior. The original's `editProfileId`
 * localStorage handoff is replaced with an `?edit=<id>` query param (same
 * pattern as AddInternshipPage.jsx). The logo file is uploaded as a real
 * multipart file (see codingProfileService.js) instead of being converted
 * to a Base64 data URL client-side - GridFS stores the bytes, not the app.
 */
export default function AddCodingProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [password, setPassword] = useState('');
  const [totalProblems, setTotalProblems] = useState(0);
  const [logoFile, setLogoFile] = useState(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Life Manager App - Add Coding Profile';
  }, []);

  useEffect(() => {
    if (!editId) return undefined;

    let cancelled = false;
    codingProfileService
      .getCodingProfile(editId)
      .then((profile) => {
        if (cancelled) return;
        setName(profile.name);
        setLink(profile.link);
        setPassword(profile.password || '');
        setTotalProblems(profile.totalProblems || 0);
        setExistingLogoUrl(profile.logoUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the profile to edit.');
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (file) setLogoFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { name: name.trim(), link: link.trim(), password: password.trim(), totalProblems, logoFile };

    try {
      if (editId) {
        await codingProfileService.updateCodingProfile(editId, payload);
      } else {
        await codingProfileService.createCodingProfile(payload);
      }
      navigate('/placement/coding-profiles');
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save profile.';
      setError(message);
    }
  }

  if (loadingExisting) {
    return <div className="add-coding-profile-page-root" />;
  }

  return (
    <div className="add-coding-profile-page-root">
      <div className="app-container">
        <h2 id="form-heading">{editId ? '✏️ Edit Coding Profile' : '➕ Add New Coding Profile'}</h2>
        <div id="profile-form-container">
          <form id="profile-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
                <label>Profile Name (e.g., LeetCode, Codeforces)</label>
                <input type="text" id="profile-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 3, minWidth: '300px' }}>
                <label>Profile URL (Link)</label>
                <input
                  type="url"
                  id="profile-link"
                  placeholder="https://leetcode.com/user_name"
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Logo Image (Optional)</label>
                <input type="file" id="profile-logo-file" accept="image/*" onChange={handleLogoChange} />
                <small style={{ color: 'var(--muted)', display: 'block' }}>
                  {existingLogoUrl && !logoFile
                    ? 'A logo is already set - choose a new file to replace it.'
                    : 'Upload logo image for easy recognition.'}
                </small>
              </div>
              <div className="form-group">
                <label>Password (Optional)</label>
                <input type="text" id="profile-password" placeholder="Stored password/token" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Initial Total Problems (Optional)</label>
                <input
                  type="number"
                  id="problems-total"
                  min="0"
                  value={totalProblems}
                  onChange={(e) => setTotalProblems(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="add-coding-profile-error">{error}</div>}

            <div style={{ marginTop: '15px' }}>
              <button type="submit" className="btn btn-add" id="submit-button">
                {editId ? '💾 Save Changes' : '➕ Add Profile'}
              </button>
              <Link to="/placement/coding-profiles" className="btn btn-cancel">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
