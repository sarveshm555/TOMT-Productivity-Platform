import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as reflectionService from '../api/reflectionService.js';
import './ProblemPage.css';

/**
 * Ports problem.html exactly - same markup, classes, copy, and toggle
 * behavior. localStorage reads/writes are replaced with the
 * /api/reflections/problems endpoints (see problemController.js); the
 * newest-first ordering and toggle-form UX are otherwise unchanged.
 */
export default function ProblemPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [problemText, setProblemText] = useState('');
  const [solutionText, setSolutionText] = useState('');

  useEffect(() => {
    document.title = 'Life Manager App - Problem Solver';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setProblems(await reflectionService.listProblems());
    } catch (err) {
      setError('Could not load problems. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleForm() {
    setFormVisible((v) => !v);
  }

  async function saveProblem() {
    const trimmed = problemText.trim();
    if (!trimmed) {
      // eslint-disable-next-line no-alert
      window.alert('Please describe the problem.');
      return;
    }

    try {
      const created = await reflectionService.createProblem(trimmed, solutionText.trim());
      setProblems((prev) => [created, ...prev]);
      setProblemText('');
      setSolutionText('');
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save problem.';
      setError(message);
    }
  }

  async function deleteProblem(id) {
    try {
      await reflectionService.deleteProblem(id);
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Could not update problem. Please try again.');
    }
  }

  async function clearAll() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Clear all history?')) return;
    try {
      await reflectionService.clearProblems();
      setProblems([]);
    } catch (err) {
      setError('Could not clear problems. Please try again.');
    }
  }

  return (
    <div className="problem-page-root">
      <div className="app-container">
        <div className="header-actions">
          <Link to="/reflections" className="back-home-button">
            🏠 Dashboard
          </Link>
          <div className="top-buttons-group">
            <button type="button" className="btn-toggle" id="toggle-form-btn" onClick={toggleForm}>
              {formVisible ? '✖ Close Form' : '➕ Report New Problem'}
            </button>
            <button type="button" className="btn-clear-top" id="clear-all" onClick={clearAll}>
              🗑️ Clear All
            </button>
          </div>
        </div>

        <h2>Problem &amp; Distraction Solver</h2>

        {error && <div className="problem-error">{error}</div>}

        {formVisible && (
          <div id="input-form-container" style={{ display: 'block' }}>
            <div className="input-group">
              <label>What is the Problem or Distraction?</label>
              <textarea
                id="problem-input"
                rows="3"
                placeholder="Describe what's bothering you..."
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Expected Solution (Optional)</label>
              <textarea
                id="solution-input"
                rows="3"
                placeholder="How will you overcome this?"
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
              />
            </div>

            <button type="button" className="btn-save" id="save-problem" onClick={saveProblem}>
              Log Problem
            </button>
          </div>
        )}

        <hr />

        <div id="problem-list">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#555' }}>Loading...</p>
          ) : problems.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#555' }}>No active problems.</p>
          ) : (
            problems.map((item) => (
              <div key={item.id} className="problem-card">
                <h4>Problem / Distraction</h4>
                <p>{item.problem}</p>
                {item.solution ? (
                  <div style={{ marginTop: '10px', borderTop: '1px solid #3f404e', paddingTop: '10px' }}>
                    <h4 style={{ color: 'var(--secondary-color)' }}>Expected Solution</h4>
                    <p className="solution-text">{item.solution}</p>
                  </div>
                ) : null}
                <span className="timestamp">Logged: {new Date(item.createdAt).toLocaleString()}</span>
                <button type="button" className="btn-solved" onClick={() => deleteProblem(item.id)}>
                  ✅ Now Solved
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
