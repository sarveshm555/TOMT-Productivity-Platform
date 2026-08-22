import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import * as internshipService from '../api/internshipService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './AddInternshipPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ports add-internship.html dual-mode behavior driven by `?edit=<id>`.
 * Includes dedicated Track Links section for saving and managing multiple labeled URLs.
 */
export default function AddInternshipPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [status, setStatus] = useState('NeedToApply');
  const [trackLinks, setTrackLinks] = useState([{ label: '', url: '' }]);

  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
  const [error, setError] = useState('');

  const [deletingTrackIndex, setDeletingTrackIndex] = useState(null);

  useEffect(() => {
    document.title = 'Add Internship - Life Manager';
  }, []);

  useEffect(() => {
    if (!editId) {
      setDateApplied(getTodayDateString());
      return;
    }

    let cancelled = false;
    internshipService
      .listInternships()
      .then((all) => {
        if (cancelled) return;
        const app = all.find((a) => a.id === editId);
        if (app) {
          setCompany(app.company);
          setRole(app.role);
          setDateApplied(app.dateApplied);
          setStatus(app.status);
          if (Array.isArray(app.trackLinks) && app.trackLinks.length > 0) {
            setTrackLinks(app.trackLinks.map((l) => ({ label: l.label || '', url: l.url || '' })));
          } else {
            setTrackLinks([{ label: '', url: '' }]);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the application to edit.');
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  function addTrackLinkRow() {
    setTrackLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function updateTrackLink(index, field, value) {
    setTrackLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRemoveLinkClick(index) {
    const item = trackLinks[index];
    const isBlank = !item.label.trim() && !item.url.trim();
    if (isBlank) {
      setTrackLinks((prev) => prev.filter((_, i) => i !== index));
    } else {
      setDeletingTrackIndex(index);
    }
  }

  function confirmRemoveTrackLink() {
    if (deletingTrackIndex !== null) {
      setTrackLinks((prev) => prev.filter((_, i) => i !== deletingTrackIndex));
      setDeletingTrackIndex(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const sanitizedLinks = [];
    for (let i = 0; i < trackLinks.length; i++) {
      const item = trackLinks[i];
      const trimmedLabel = item.label ? item.label.trim() : '';
      let trimmedUrl = item.url ? item.url.trim() : '';

      if (!trimmedLabel && !trimmedUrl) {
        continue;
      }

      if (!trimmedUrl) {
        setError(`Track Link #${i + 1} requires a URL.`);
        return;
      }

      if (!/^https?:\/\//i.test(trimmedUrl)) {
        trimmedUrl = 'https://' + trimmedUrl;
      }

      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setError(`Track Link #${i + 1} must be a valid HTTP or HTTPS URL.`);
          return;
        }
        sanitizedLinks.push({ label: trimmedLabel, url: parsed.href });
      } catch (err) {
        setError(`Track Link #${i + 1} has an invalid URL format.`);
        return;
      }
    }

    const payload = {
      company: company.trim(),
      role: role.trim(),
      dateApplied,
      status,
      trackLinks: sanitizedLinks,
    };

    try {
      if (editId) {
        await internshipService.updateInternship(editId, payload);
      } else {
        await internshipService.createInternship(payload);
      }
      navigate('/placement/internships');
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save application.';
      setError(message);
    }
  }

  if (loadingExisting) {
    return <div className="add-internship-page-root" />;
  }

  const deletingItem = deletingTrackIndex !== null ? trackLinks[deletingTrackIndex] : null;
  const deletingItemName = deletingItem ? `"${deletingItem.label || deletingItem.url}"` : null;

  return (
    <div className="add-internship-page-root">
      <div className="app-container">
        <h2 id="form-title">{editId ? '✏️ Edit Application' : '➕ Add Application'}</h2>
        <form id="add-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" id="company-name" required value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role Applied For</label>
              <input type="text" id="role-name" required value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date Logged</label>
              <input type="date" id="date-applied" required value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select id="application-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="NeedToApply">Need To Apply</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="track-links-section">
            <div className="track-links-header">
              <label className="track-links-title">🔗 Track Links (Useful Links for this Application)</label>
              <span className="track-links-subtitle">
                Save ChatGPT chats, company careers pages, job descriptions, assessment links, etc.
              </span>
            </div>

            {trackLinks.map((linkItem, idx) => (
              <div key={idx} className="track-link-row">
                <div className="form-group track-link-label-group">
                  <label>Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ChatGPT, Careers Page, OA Link"
                    value={linkItem.label}
                    onChange={(e) => updateTrackLink(idx, 'label', e.target.value)}
                  />
                </div>
                <div className="form-group track-link-url-group">
                  <label>URL (Required)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkItem.url}
                    onChange={(e) => updateTrackLink(idx, 'url', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-remove-link"
                  title="Remove Link"
                  onClick={() => handleRemoveLinkClick(idx)}
                >
                  🗑️ Remove
                </button>
              </div>
            ))}

            <button type="button" className="btn-add-link-row" onClick={addTrackLinkRow}>
              ➕ Add Another Link
            </button>
          </div>

          {error && <div className="add-internship-error">{error}</div>}

          <div className="btn-row">
            <button type="submit" className="btn btn-add" id="submit-btn">
              {editId ? '💾 Save Changes' : '➕ Add Application'}
            </button>
            <Link to="/placement/internships" className="btn btn-back">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingTrackIndex !== null}
        title="Delete Track Link?"
        message="Are you sure you want to remove this Track Link? This action cannot be undone."
        itemPreview={deletingItemName}
        confirmWord="DELETE"
        onClose={() => setDeletingTrackIndex(null)}
        onConfirm={confirmRemoveTrackLink}
      />
    </div>
  );
}

