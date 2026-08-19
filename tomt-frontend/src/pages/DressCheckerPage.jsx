import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as dressCheckerService from '../api/dressCheckerService.js';
import './DressCheckerPage.css';

// Ported from generateOutfit(dt)'s date handling - builds a YYYY-MM-DD
// string from LOCAL date components (not toISOString(), which would shift
// the date near midnight due to UTC conversion), matching the original's
// use of a plain local `Date` object throughout.
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ports dress-checker.html exactly - same markup, classes, copy, and
 * outfit states (ok/off/error). generateOutfit()'s random-pick logic now
 * runs server-side (dressCheckerController.js) against the persisted
 * wardrobe/rules; the frontend just requests a suggestion for a date and
 * renders the result, same three states as before.
 */
export default function DressCheckerPage() {
  const [currentDateLabel, setCurrentDateLabel] = useState('Today');
  const [outputVisible, setOutputVisible] = useState(false);
  const [outfitText, setOutfitText] = useState('');
  const [outfitDay, setOutfitDay] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Life Manager App - Dress Checker';
  }, []);

  useEffect(() => {
    display(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function display(dt) {
    setError('');
    try {
      const result = await dressCheckerService.suggestOutfit(toLocalDateString(dt));
      setOutputVisible(true);
      setCurrentDateLabel(dt.toLocaleDateString('en-US', { weekday: 'long' }));

      if (result.status === 'ok') {
        setOutfitText(`${result.shirt} + ${result.pant}`);
        setOutfitDay('Ready to go!');
      } else {
        setOutfitText(result.text);
        setOutfitDay('');
      }
    } catch (err) {
      setError('Could not generate an outfit suggestion. Please try again.');
    }
  }

  function handleToday() {
    display(new Date());
  }

  function handleTomorrow() {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    display(t);
  }

  return (
    <div className="dress-checker-page-root">
      <div className="app-container">
        <div className="back-home-container">
          <Link to="/hub" className="back-home-button">
            🏠 Dashboard
          </Link>
        </div>

        <div className="content-wrapper">
          <h2 className="h2">👔 Dress Checker</h2>
          <div className="schedule-prompt">
            <p className="small">
              Checking for: <strong id="current-date-display">{currentDateLabel}</strong>
            </p>
            <div className="action-row">
              <button type="button" id="today-btn" className="btn btn-primary" onClick={handleToday}>
                Today
              </button>
              <button type="button" id="tomorrow-btn" className="btn btn-tertiary" onClick={handleTomorrow}>
                Tomorrow
              </button>
              <Link to="/dress-checker/wardrobe" className="btn btn-secondary">
                👗 Manage Wardrobe
              </Link>
            </div>

            {error && <div className="dress-checker-error">{error}</div>}

            {outputVisible && (
              <div id="dress-output" className="output-card" style={{ display: 'block' }}>
                <div className="small">Suggested Outfit</div>
                <div className="outfit-display" id="outfit-text">
                  {outfitText}
                </div>
                <div className="small" id="outfit-day">
                  {outfitDay}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
