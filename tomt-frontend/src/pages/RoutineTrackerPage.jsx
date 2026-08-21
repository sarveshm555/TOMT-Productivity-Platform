import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as routineService from '../api/routineService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './RoutineTrackerPage.css';

// The two variants are genuinely identical in structure/logic (see
// RoutineConfig.js/RoutineHistory.js comments) - this object captures the
// real, confirmed differences between health-routine.html and
// professional-routine.html so nothing is silently merged away.
const VARIANTS = {
  health: {
    title: '💖 Health Routine Tracker',
    documentTitle: 'Life Manager App - Health Routine Tracker',
    backHref: '/daily-activity',
    backLabel: '🏠 Back to Daily Hub',
    historyHref: '/daily-activity/health/history',
    deleteConfirmText: 'Delete this metric?',
  },
  professional: {
    title: '🛠️ Professional Routine Tracker',
    documentTitle: 'Life Manager App - Professional Routine Tracker',
    backHref: '/daily-activity',
    backLabel: '🏠 Back to Daily Hub',
    historyHref: '/daily-activity/professional/history',
    // The original professional-routine.html's confirm() text genuinely
    // differs from health-routine.html's - preserved exactly, not merged.
    deleteConfirmText: 'Delete this metric? Data in history will remain.',
  },
};

/**
 * Ports health-routine.html / professional-routine.html exactly (parameterized
 * by `type`, since the two originals are structurally identical - see
 * VARIANTS above for the real differences that are preserved). Same markup,
 * classes, copy, and the custom-query builder / Yes-No button / modal
 * behavior. localStorage reads/writes replaced with /api/routines/:type/*
 * (see routineController.js).
 */
export default function RoutineTrackerPage({ type }) {
  const variant = VARIANTS[type];

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add-query form
  const [addFormVisible, setAddFormVisible] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryType, setQueryType] = useState('');
  const [queryUnit, setQueryUnit] = useState('');
  const [selectElements, setSelectElements] = useState('');
  const [textPlaceholderType, setTextPlaceholderType] = useState('');
  const [hasTextNote, setHasTextNote] = useState(false);
  const [textPlaceholder, setTextPlaceholder] = useState('');

  // Query management modal
  const [manageModalOpen, setManageModalOpen] = useState(false);

  // Daily log form
  const [wakeUpTime, setWakeUpTime] = useState('');
  const [targetSleepTime, setTargetSleepTime] = useState('');
  const [fieldValues, setFieldValues] = useState({}); // { [query.key]: value }
  const [fieldNotes, setFieldNotes] = useState({}); // { [query.key]: note }

  const [deletingQueryId, setDeletingQueryId] = useState(null);

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
      setQueries(await routineService.getConfig(type));
    } catch (err) {
      setError('Could not load your custom queries. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openAddQueryForm() {
    setAddFormVisible(true);
  }
  function closeAddQueryForm() {
    setAddFormVisible(false);
    setQueryName('');
    setQueryType('');
    setQueryUnit('');
    setSelectElements('');
    setTextPlaceholderType('');
    setHasTextNote(false);
    setTextPlaceholder('');
  }

  async function handleAddQuerySubmit(e) {
    e.preventDefault();
    try {
      const updated = await routineService.addConfigQuery(type, {
        name: queryName,
        type: queryType,
        unit: queryUnit,
        elements: selectElements,
        hasText: hasTextNote,
        textPlaceholder,
        mainPlaceholder: textPlaceholderType,
      });
      setQueries(updated);
      closeAddQueryForm();
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save query.';
      setError(message);
    }
  }

  async function deleteQuery(queryId) {
    try {
      const updated = await routineService.deleteConfigQuery(type, queryId);
      setQueries(updated);
    } catch (err) {
      setError('Could not delete query. Please try again.');
    }
  }

  function setYN(key, val) {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  }

  function setFieldValue(key, val) {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  }

  function setFieldNote(key, val) {
    setFieldNotes((prev) => ({ ...prev, [key]: val }));
  }

  async function handleDailyLogSubmit(e) {
    e.preventDefault();

    const data = { wakeUpTime, targetSleep: targetSleepTime };
    for (const q of queries) {
      data[q.key] = fieldValues[q.key] || '';
      if (q.hasText) data[`${q.key}Note`] = fieldNotes[q.key] || '';
    }

    try {
      await routineService.createHistoryEntry(type, data);
      // eslint-disable-next-line no-alert
      window.alert('Entry Saved!');
      setWakeUpTime('');
      setTargetSleepTime('');
      setFieldValues({});
      setFieldNotes({});
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save entry.';
      setError(message);
    }
  }

  const activeDeletingQuery = queries.find((q) => q.queryId === deletingQueryId);

  return (
    <div className={`routine-page-root routine-type-${type}`}>
      <div className="header-container">
        <Link to={variant.backHref} className="back-to-dashboard-btn">
          {variant.backLabel}
        </Link>
      </div>

      <div className="app-container">
        <h2>{variant.title}</h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-edit" onClick={() => setManageModalOpen(true)}>
            ⚙️ Manage Queries
          </button>
          <button type="button" className="btn btn-outline" onClick={openAddQueryForm}>
            ➕ Add New Query
          </button>
          <Link to={variant.historyHref} className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            📅 View History
          </Link>
        </div>

        {error && <div className="routine-error">{error}</div>}

        {addFormVisible && (
          <div id="add-query-form-container" className="control-box" style={{ display: 'block' }}>
            <h3>Define New Custom Query</h3>
            <form id="add-query-form" onSubmit={handleAddQuerySubmit}>
              <div className="form-group">
                <label>Query Name</label>
                <input type="text" id="query-name" required placeholder="e.g. Water Intake" value={queryName} onChange={(e) => setQueryName(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Value Type</label>
                  <select id="query-type" required value={queryType} onChange={(e) => setQueryType(e.target.value)}>
                    <option value="">-- Select Type --</option>
                    <option value="number">Numeric</option>
                    <option value="yn">Yes/No</option>
                    <option value="select">Dropdown</option>
                    <option value="text">Simple Text</option>
                  </select>
                </div>
                {queryType === 'number' && (
                  <div className="form-group" id="query-unit-group">
                    <label>Unit</label>
                    <input type="text" id="query-unit" placeholder="cups, mins, etc." value={queryUnit} onChange={(e) => setQueryUnit(e.target.value)} />
                  </div>
                )}
              </div>
              {queryType === 'select' && (
                <div id="select-elements-group" style={{ marginBottom: '10px' }}>
                  <label>Dropdown Options (comma separated)</label>
                  <input type="text" id="select-elements" placeholder="Good, Neutral, Bad" value={selectElements} onChange={(e) => setSelectElements(e.target.value)} />
                </div>
              )}
              {queryType === 'text' && (
                <div id="text-placeholder-type-group" style={{ marginBottom: '10px' }}>
                  <label>Input Placeholder</label>
                  <input
                    type="text"
                    id="text-placeholder-type"
                    placeholder="Describe your session..."
                    value={textPlaceholderType}
                    onChange={(e) => setTextPlaceholderType(e.target.value)}
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Add Detailed Note Field?</label>
                  <input type="checkbox" id="text-note-toggle" checked={hasTextNote} onChange={(e) => setHasTextNote(e.target.checked)} /> Yes
                </div>
                {hasTextNote && (
                  <div className="form-group" id="text-placeholder-group">
                    <label>Note Placeholder</label>
                    <input type="text" id="text-placeholder" placeholder="Specific details..." value={textPlaceholder} onChange={(e) => setTextPlaceholder(e.target.value)} />
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary">
                Save Query
              </button>
              <button type="button" className="btn btn-reset" onClick={closeAddQueryForm}>
                Cancel
              </button>
            </form>
          </div>
        )}

        <h3>Log Your Routine Data</h3>
        <form id="daily-log-form" onSubmit={handleDailyLogSubmit}>
          <div className="data-group">
            <div className="form-row">
              <div className="form-group">
                <label>Wake Up Time</label>
                <input type="time" id="wake-up-time" required value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Target Sleep Time</label>
                <input type="time" id="target-sleep-time" required value={targetSleepTime} onChange={(e) => setTargetSleepTime(e.target.value)} />
              </div>
            </div>
          </div>

          <div id="data-entry-form">
            {!loading && queries.length === 0 && <p style={{ color: 'var(--muted-text)' }}>No custom metrics yet.</p>}
            {queries.map((q) => (
              <div className="data-group" style={{ marginTop: '10px' }} key={q.queryId}>
                <label>
                  {q.name} {q.unit ? `(${q.unit})` : ''}
                </label>
                {q.type === 'number' && (
                  <input type="number" step="any" required value={fieldValues[q.key] || ''} onChange={(e) => setFieldValue(q.key, e.target.value)} />
                )}
                {q.type === 'text' && (
                  <input
                    type="text"
                    placeholder={q.mainPlaceholder}
                    required
                    value={fieldValues[q.key] || ''}
                    onChange={(e) => setFieldValue(q.key, e.target.value)}
                  />
                )}
                {q.type === 'select' && (
                  <select required value={fieldValues[q.key] || ''} onChange={(e) => setFieldValue(q.key, e.target.value)}>
                    <option value="">--Select--</option>
                    {q.elements.map((el) => (
                      <option key={el} value={el}>
                        {el}
                      </option>
                    ))}
                  </select>
                )}
                {q.type === 'yn' && (
                  <div className="yn-button-container">
                    <button
                      type="button"
                      className={`btn yn-button yes${fieldValues[q.key] === 'Yes' ? ' active-selected' : ''}`}
                      onClick={() => setYN(q.key, 'Yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`btn yn-button no${fieldValues[q.key] === 'No' ? ' active-selected' : ''}`}
                      onClick={() => setYN(q.key, 'No')}
                    >
                      No
                    </button>
                  </div>
                )}
                {q.hasText && (
                  <textarea
                    style={{ marginTop: '10px' }}
                    placeholder={q.textPlaceholder || 'Notes...'}
                    value={fieldNotes[q.key] || ''}
                    onChange={(e) => setFieldNote(q.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-success">
            ✅ Save Daily Entry
          </button>
        </form>
      </div>

      <div id="query-management-modal" className="modal-backdrop" style={{ display: manageModalOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <h3>⚙️ Manage Custom Queries</h3>
          <div id="custom-queries-list">
            {queries.length === 0 ? (
              <p>No queries.</p>
            ) : (
              queries.map((q) => (
                <div className="query-item" key={q.queryId}>
                  <span>{q.name}</span>
                  <button type="button" className="btn btn-danger" onClick={() => setDeletingQueryId(q.queryId)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
          <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }} onClick={() => setManageModalOpen(false)}>
            Close
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingQueryId !== null}
        title="Delete Custom Metric?"
        message={variant.deleteConfirmText}
        itemPreview={activeDeletingQuery ? `"${activeDeletingQuery.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingQueryId(null)}
        onConfirm={async () => {
          const id = deletingQueryId;
          setDeletingQueryId(null);
          await deleteQuery(id);
        }}
      />
    </div>
  );
}
