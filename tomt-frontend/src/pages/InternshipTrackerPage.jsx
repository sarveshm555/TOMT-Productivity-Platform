import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import * as internshipService from '../api/internshipService.js';
import './InternshipTrackerPage.css';

const FILTERS = ['All', 'NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'];
const FILTER_LABELS = {
  All: 'All',
  NeedToApply: 'Need To Apply',
  Applied: 'Applied',
  Interview: 'Interview',
  Offer: 'Offer',
  Rejected: 'Rejected',
};

function getStatusColor(status) {
  switch (status) {
    case 'Offer':
      return 'var(--success-color)';
    case 'Rejected':
      return 'var(--danger-color)';
    case 'Applied':
      return 'var(--applied-color)';
    default:
      return '#ff9800';
  }
}

/**
 * Ports internship-tracker.html - same markup, classes, copy,
 * filter/search behavior, and reject-analysis modal.
 * Sorted strictly by newest entry/creation date to oldest.
 */
export default function InternshipTrackerPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [currentFilter, setCurrentFilter] = useState('All');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [mistakeInput, setMistakeInput] = useState('');

  useEffect(() => {
    document.title = 'Internship Tracker - Mobile Responsive';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setApps(await internshipService.listInternships());
    } catch (err) {
      setError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const sortedApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      // 1. Sort by dateApplied (entry date) descending (newest first)
      const dateA = a.dateApplied ? new Date(a.dateApplied).getTime() : 0;
      const dateB = b.dateApplied ? new Date(b.dateApplied).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      // 2. Sort by record createdAt timestamp descending
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdB !== createdA) {
        return createdB - createdA;
      }
      // 3. Fallback to ID descending
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [apps]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return sortedApps.filter((app) => {
      const matchesFilter = currentFilter === 'All' || app.status === currentFilter;
      const matchesSearch =
        (app.company && app.company.toLowerCase().includes(term)) ||
        (app.role && app.role.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [sortedApps, search, currentFilter]);

  async function updateStatus(id, status, msg = '') {
    try {
      const updated = await internshipService.updateInternshipStatus(id, status, msg);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (err) {
      setError('Could not update application status. Please try again.');
    }
  }

  function editApp(id) {
    navigate(`/placement/internships/new?edit=${id}`);
  }

  async function deleteApp(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete application?')) return;
    try {
      await internshipService.deleteInternship(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError('Could not delete application. Please try again.');
    }
  }

  function openRejectModal(id) {
    setActiveRejectId(id);
    setMistakeInput('');
    setRejectModalOpen(true);
  }
  function closeModal() {
    setRejectModalOpen(false);
  }
  function confirmReject() {
    const msg = mistakeInput.trim();
    if (!msg) {
      // eslint-disable-next-line no-alert
      window.alert('Please enter the mistake analysis');
      return;
    }
    updateStatus(activeRejectId, 'Rejected', msg);
    setMistakeInput('');
    closeModal();
  }

  return (
    <div className="internship-page-root">
      <div className="app-container">
        <Link to="/placement" className="back-button">
          <span>🏠</span> Back to Dashboard
        </Link>

        <div className="header-section">
          <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>🚀 Application Tracker</h2>
          <Link to="/placement/internships/new" className="btn-nav-add">
            ➕ Add New
          </Link>
        </div>

        <div className="search-box">
          <input
            type="text"
            id="search-input"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div id="filter-buttons">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn${currentFilter === f ? ' active' : ''}`}
              onClick={() => setCurrentFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {error && <div className="internship-error">{error}</div>}

        <div id="applications-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No applications found.</div>
          ) : (
            filtered.map((app) => (
              <div className="app-item" key={app.id}>
                <div>
                  <strong>{app.company}</strong>
                  <br />
                  <small style={{ color: '#888' }}>{app.role}</small>
                </div>
                <div style={{ fontSize: '0.85em' }}>📅 {app.dateApplied}</div>
                <div>
                  <span style={{ fontWeight: 'bold', color: getStatusColor(app.status) }}>{app.status}</span>
                </div>
                <div className="item-actions">
                  <div className="action-group">
                    {(app.status === 'Applied' || app.status === 'Interview') && (
                      <>
                        <button
                          type="button"
                          className="btn-sm"
                          style={{ background: 'var(--success-color)' }}
                          onClick={() => updateStatus(app.id, 'Offer')}
                        >
                          Success
                        </button>
                        <button
                          type="button"
                          className="btn-sm"
                          style={{ background: 'var(--danger-color)' }}
                          onClick={() => openRejectModal(app.id)}
                        >
                          Failed
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-sm"
                      style={{ background: 'var(--secondary-color)' }}
                      onClick={() => editApp(app.id)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="btn-sm"
                      style={{ background: '#444' }}
                      onClick={() => deleteApp(app.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {app.mistakeMessage && (
                  <div className="mistake-tag">
                    <strong>🚨 Mistake Analysis:</strong> {app.mistakeMessage}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div id="reject-modal" className="modal" style={{ display: rejectModalOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <h3 style={{ color: 'var(--danger-color)', marginTop: 0 }}>🚨 Failure Analysis</h3>
          <p>Describe what went wrong/learning point:</p>
          <textarea
            id="mistake-input"
            rows="4"
            style={{ width: '100%', background: '#000', color: 'white', borderRadius: '5px', padding: '10px', border: '1px solid #333' }}
            value={mistakeInput}
            onChange={(e) => setMistakeInput(e.target.value)}
          />
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--danger-color)', flex: 1, padding: '10px' }} onClick={confirmReject}>
              Save Analysis
            </button>
            <button type="button" className="btn-sm" style={{ background: '#444', flex: 1 }} onClick={closeModal}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

