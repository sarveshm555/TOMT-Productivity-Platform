import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as routineService from '../api/routineService.js';
import './RoutineHistoryPage.css';

// Real, confirmed differences between health-routine-history.html and
// professional-routine-history.html - preserved exactly, not merged away.
const VARIANTS = {
  health: {
    title: '📅 Health History',
    documentTitle: 'Health Routine - History',
    backHref: '/daily-activity/health',
    searchPlaceholder: 'Search by date, metric name, or notes...',
    deleteConfirmText: 'Delete this log entry forever?',
    // health's original filtered against JSON.stringify(entry) (the WHOLE
    // entry, including the raw ISO date string), not just entry.data.
    filterScope: 'entry',
    // health's original date format: full month name.
    dateFormatOptions: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    // health's original only rendered a value if it was truthy (hides "0"/"").
    shouldShowValue: (val) => Boolean(val),
    ynYesColor: '#4caf50',
    ynNoColor: '#e91e63',
  },
  professional: {
    title: '🛠️ Pro History',
    documentTitle: 'Professional Routine - History',
    backHref: '/daily-activity/professional',
    searchPlaceholder: 'Search by date, metric, or note content...',
    deleteConfirmText: 'Delete this entry?',
    // professional's original filtered against JSON.stringify(entry.data) only.
    filterScope: 'data',
    // professional's original date format: short month name.
    dateFormatOptions: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    // professional's original showed any defined, non-empty-string value
    // (so "0" is shown, unlike health).
    shouldShowValue: (val) => val !== undefined && val !== '',
    ynYesColor: 'var(--secondary-color)',
    ynNoColor: 'var(--danger-color)',
  },
};

/**
 * Ports health-routine-history.html / professional-routine-history.html
 * exactly (parameterized by `type` - see VARIANTS above for the real,
 * confirmed differences that are preserved rather than merged away).
 * localStorage reads replaced with GET /api/routines/:type/history;
 * deletion is by database id instead of array index (see
 * routineController.js's deleteHistoryEntry comment for why that's a
 * correctness improvement, not a behavior change, in the normal case).
 */
export default function RoutineHistoryPage({ type }) {
  const variant = VARIANTS[type];

  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    document.title = variant.documentTitle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [h, c] = await Promise.all([routineService.listHistory(type), routineService.getConfig(type)]);
      setHistory(h);
      setConfig(c);
    } catch (err) {
      setError('Could not load history. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(variant.deleteConfirmText)) return;
    try {
      await routineService.deleteHistoryEntry(type, id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError('Could not delete entry. Please try again.');
    }
  }

  const filterLower = searchText.toLowerCase();
  const filtered = history.filter((entry) => {
    const dateString = new Date(entry.date).toLocaleDateString().toLowerCase();
    const contentString =
      variant.filterScope === 'entry' ? JSON.stringify(entry).toLowerCase() : JSON.stringify(entry.data).toLowerCase();
    return contentString.includes(filterLower) || dateString.includes(filterLower);
  });

  return (
    <div className={`routine-history-page-root routine-type-${type}`}>
      <div className="container">
        <div className="header">
          <h2 style={{ color: 'var(--primary-color)' }}>{variant.title}</h2>
          <Link to={variant.backHref} className="btn btn-back">
            ⬅ Back to Tracker
          </Link>
        </div>

        <input
          type="text"
          id="searchInput"
          className="search-box"
          placeholder={variant.searchPlaceholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        {error && <div className="routine-history-error">{error}</div>}

        <div id="history-list">
          {loading ? (
            <div className="no-results">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="no-results">No entries found matching your search.</div>
          ) : (
            filtered.map((item) => {
              const dateObj = new Date(item.date);
              const dateStr = dateObj.toLocaleDateString('en-GB', variant.dateFormatOptions);

              return (
                <div className="history-entry" key={item.id}>
                  <span className="date-stamp">{dateStr}</span>
                  <button type="button" className="btn-delete" onClick={() => deleteEntry(item.id)}>
                    🗑️
                  </button>
                  <ul className="data-grid">
                    <li>
                      <strong>Wake Up:</strong> {item.data.wakeUpTime}
                    </li>
                    <li>
                      <strong>Target Sleep:</strong> {item.data.targetSleep}
                    </li>
                    {config.map((q) => {
                      const val = item.data[q.key];
                      if (!variant.shouldShowValue(val)) return null;
                      return (
                        <li key={q.key}>
                          <strong>{q.name}:</strong>{' '}
                          {q.type === 'yn' ? (
                            <span style={{ color: val === 'Yes' ? variant.ynYesColor : variant.ynNoColor, fontWeight: 'bold' }}>{val}</span>
                          ) : q.unit ? (
                            `${val} ${q.unit}`
                          ) : (
                            val
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {config.map((q) => {
                    const note = item.data[`${q.key}Note`];
                    if (!note) return null;
                    return (
                      <div className="note-box" key={`${q.key}-note`}>
                        <strong>{q.name} Note:</strong> {note}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
