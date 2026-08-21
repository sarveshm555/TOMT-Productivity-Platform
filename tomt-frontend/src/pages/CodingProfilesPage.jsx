import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import * as codingProfileService from '../api/codingProfileService.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './CodingProfilesPage.css';

/**
 * Ports coding-profiles.html exactly - same markup, classes, copy, and
 * computed "Total Solved" stat (initial totalProblems + log count, now
 * computed server-side - see codingProfileController.js). The original's
 * `editProfileId`/`currentCodingProfile` localStorage handoffs are gone:
 * edit navigates to a route with the profile id, and "View Log" navigates
 * straight to `/placement/coding-profiles/:id/log` (a real route param
 * replaces the transient localStorage key, per Phase 1's plan).
 */
export default function CodingProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deletingProfileId, setDeletingProfileId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Coding Profiles';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setProfiles(await codingProfileService.listCodingProfiles());
    } catch (err) {
      setError('Could not load coding profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function viewLog(id) {
    navigate(`/placement/coding-profiles/${id}/log`);
  }
  function editProfile(id) {
    navigate(`/placement/coding-profiles/new?edit=${id}`);
  }
  async function deleteProfile(id) {
    try {
      await codingProfileService.deleteCodingProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Could not delete profile. Please try again.');
    }
  }

  const activeDeletingProfile = profiles.find((p) => p.id === deletingProfileId);

  return (
    <div className="coding-profiles-page-root">
      <div className="app-container">
        <Link to="/placement" className="back-button">
          <span>🏠</span> Back to Dashboard
        </Link>
        <div className="header-flex">
          <h2>💻 Coding Profile Manager</h2>
          <Link to="/placement/coding-profiles/new" className="btn-top-add">
            ➕ Add Profile
          </Link>
        </div>

        <h3>Your Coding Platforms</h3>

        {error && <div className="coding-profiles-error">{error}</div>}

        <ul id="profiles-list">
          {loading ? (
            <li className="profile-item" style={{ borderLeftColor: 'var(--muted)', justifyContent: 'center', color: 'var(--muted)' }}>
              Loading...
            </li>
          ) : profiles.length === 0 ? (
            <li className="profile-item" style={{ borderLeftColor: 'var(--muted)', justifyContent: 'center', color: 'var(--muted)' }}>
              No profiles added yet.
            </li>
          ) : (
            profiles.map((profile) => (
              <li className="profile-item" key={profile.id}>
                {profile.logoUrl && <AuthenticatedImage src={profile.logoUrl} className="profile-logo" alt={profile.name} />}
                <div className="profile-details">
                  <div className="profile-name">{profile.name}</div>
                  <div className="problems-count">Total Solved: {profile.totalSolved}</div>
                </div>
                <div className="profile-actions">
                  <a href={profile.link} target="_blank" rel="noreferrer" className="action-btn btn-link">
                    🔗 Link
                  </a>
                  <button type="button" className="action-btn btn-log" onClick={() => viewLog(profile.id)}>
                    View Log
                  </button>
                  <button type="button" className="action-btn" style={{ background: '#3f404e', color: 'white' }} onClick={() => editProfile(profile.id)}>
                    ✏️
                  </button>
                  <button type="button" className="btn-delete" onClick={() => setDeletingProfileId(profile.id)}>
                    🗑️
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingProfileId !== null}
        title="Delete Coding Profile?"
        message="Are you sure you want to permanently delete this coding profile and all its logged problems? This action cannot be undone."
        itemPreview={activeDeletingProfile ? `"${activeDeletingProfile.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingProfileId(null)}
        onConfirm={async () => {
          const id = deletingProfileId;
          setDeletingProfileId(null);
          await deleteProfile(id);
        }}
      />
    </div>
  );
}
