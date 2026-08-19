import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import * as internshipService from '../api/internshipService.js';
import './AddInternshipPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ports add-internship.html exactly - same markup, classes, copy, and the
 * add/edit dual-mode behavior driven by an `?edit=<id>` query param
 * (matching the original's `URLSearchParams`). localStorage reads/writes
 * replaced with /api/placement/internships (see internshipController.js).
 */
export default function AddInternshipPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [status, setStatus] = useState('NeedToApply');
  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
  const [error, setError] = useState('');

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

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { company: company.trim(), role: role.trim(), dateApplied, status };

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
    </div>
  );
}

