import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as dressCheckerService from '../api/dressCheckerService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './WardrobePage.css';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Ports wardrobe.html exactly - same markup, classes, copy, tab-switching
 * behavior, and multi-select day-rules UI. localStorage reads/writes are
 * replaced with GET/POST/DELETE /api/dress-checker/wardrobe and
 * GET/PUT/DELETE /api/dress-checker/rules (see dressCheckerController.js).
 */
export default function WardrobePage() {
  const [wardrobe, setWardrobe] = useState({ shirts: [], pants: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'rules'

  const [itemType, setItemType] = useState('shirt');
  const [itemName, setItemName] = useState('');

  const [rules, setRules] = useState(null);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  // Working copy of each day's <select multiple> selections, keyed like
  // the original's `s-${day}` / `p-${day}` element ids.
  const [selections, setSelections] = useState({});

  const [deletingItem, setDeletingItem] = useState(null); // { type, name }
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    document.title = 'Life Manager App - Wardrobe Details';
  }, []);

  useEffect(() => {
    refreshWardrobe();
  }, []);

  async function refreshWardrobe() {
    setLoading(true);
    setError('');
    try {
      setWardrobe(await dressCheckerService.getWardrobe());
    } catch (err) {
      setError('Could not load wardrobe. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRules() {
    try {
      const data = await dressCheckerService.getRules();
      setRules(data);
      const nextSelections = {};
      DAYS.forEach((d) => {
        nextSelections[d] = {
          shirts: (data[d] && data[d].shirts) || [],
          pants: (data[d] && data[d].pants) || [],
        };
      });
      setSelections(nextSelections);
      setRulesLoaded(true);
    } catch (err) {
      setError('Could not load weekly rules. Please try again.');
    }
  }

  function selectTabItems() {
    setActiveTab('items');
  }

  function selectTabRules() {
    setActiveTab('rules');
    loadRules(); // ported from tab-rules' onclick, which always rebuilds the UI on open
  }

  async function deleteItem(type, name) {
    try {
      setWardrobe(await dressCheckerService.deleteWardrobeItem(type, name));
    } catch (err) {
      setError('Could not remove item. Please try again.');
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    const trimmed = itemName.trim();
    if (!trimmed) return;
    try {
      setWardrobe(await dressCheckerService.addWardrobeItem(itemType, trimmed));
      setItemName('');
    } catch (err) {
      setError('Could not add item. Please try again.');
    }
  }

  function handleMultiSelectChange(day, field, e) {
    const selectedValues = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelections((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: selectedValues },
    }));
  }

  async function saveDayRules() {
    const payload = {};
    DAYS.forEach((d) => {
      payload[d] = {
        shirts: selections[d] ? selections[d].shirts : [],
        pants: selections[d] ? selections[d].pants : [],
      };
    });
    try {
      const saved = await dressCheckerService.saveRules(payload);
      setRules(saved);
      // eslint-disable-next-line no-alert
      window.alert('Rules saved!');
    } catch (err) {
      setError('Could not save rules. Please try again.');
    }
  }

  async function clearRules() {
    try {
      const reset = await dressCheckerService.resetRules();
      setRules(reset);
      const nextSelections = {};
      DAYS.forEach((d) => {
        nextSelections[d] = { shirts: [], pants: [] };
      });
      setSelections(nextSelections);
    } catch (err) {
      setError('Could not reset rules. Please try again.');
    }
  }

  return (
    <div className="wardrobe-page-root">
      <div className="app-container">
        <div className="header-bar">
          <Link to="/dress-checker" className="back-btn">
            ⬅ Back to Generator
          </Link>
          <button type="button" id="clear-rules-btn" className="btn btn-secondary" onClick={() => setConfirmResetOpen(true)}>
            Reset All Rules
          </button>
        </div>

        <div className="content-wrapper">
          <h2 className="h2">Wardrobe Details &amp; Rules</h2>

          {error && <div className="wardrobe-error">{error}</div>}

          <div className="tabs">
            <button
              type="button"
              id="tab-items"
              className={`tab-btn${activeTab === 'items' ? ' active' : ''}`}
              onClick={selectTabItems}
            >
              Inventory
            </button>
            <button
              type="button"
              id="tab-rules"
              className={`tab-btn${activeTab === 'rules' ? ' active' : ''}`}
              onClick={selectTabRules}
            >
              Weekly Rules
            </button>
          </div>

          <div id="pane-items" className={`pane${activeTab === 'items' ? ' active' : ''}`}>
            <form id="add-item-form" onSubmit={handleAddItem}>
              <select id="item-type-select" value={itemType} onChange={(e) => setItemType(e.target.value)}>
                <option value="shirt">Shirt</option>
                <option value="pant">Pants</option>
              </select>
              <input
                id="item-name-input"
                placeholder="e.g. Blue Denim"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Add Item
              </button>
            </form>

            <div className="wardrobe-grid">
              <div className="list-column">
                <h5>Shirts</h5>
                <ul id="shirts-list" className="ul">
                  {!loading &&
                    wardrobe.shirts.map((name) => (
                      <li key={name} className="row">
                        <span>👕 {name}</span>
                        <button type="button" className="btn btn-secondary" onClick={() => setDeletingItem({ type: 'shirt', name })}>
                          Delete
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="list-column">
                <h5>Pants</h5>
                <ul id="pants-list" className="ul">
                  {!loading &&
                    wardrobe.pants.map((name) => (
                      <li key={name} className="row">
                        <span>👖 {name}</span>
                        <button type="button" className="btn btn-secondary" onClick={() => setDeletingItem({ type: 'pant', name })}>
                          Delete
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

          <div id="pane-rules" className={`pane${activeTab === 'rules' ? ' active' : ''}`}>
            <div id="day-rules-container">
              {rulesLoaded &&
                DAYS.map((d) => (
                  <div className="day-row" key={d}>
                    <label>{d.toUpperCase()}</label>
                    <select
                      multiple
                      className="select-multi"
                      id={`s-${d}`}
                      value={(selections[d] && selections[d].shirts) || []}
                      onChange={(e) => handleMultiSelectChange(d, 'shirts', e)}
                    >
                      {wardrobe.shirts.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      multiple
                      className="select-multi"
                      id={`p-${d}`}
                      value={(selections[d] && selections[d].pants) || []}
                      onChange={(e) => handleMultiSelectChange(d, 'pants', e)}
                    >
                      {wardrobe.pants.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
            <div className="save-rules">
              <button type="button" id="save-day-rules-btn" className="btn btn-tertiary" onClick={saveDayRules}>
                Save Weekly Setup
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingItem !== null}
        title="Remove Wardrobe Item?"
        message="Are you sure you want to remove this item from your wardrobe? This action cannot be undone."
        itemPreview={deletingItem ? `"${deletingItem.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          const { type, name } = deletingItem;
          setDeletingItem(null);
          await deleteItem(type, name);
        }}
      />

      <ConfirmDeleteModal
        isOpen={confirmResetOpen}
        title="Reset All Weekly Rules?"
        message="Are you sure you want to reset all daily outfit selection rules? This action cannot be undone."
        confirmWord="DELETE"
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={async () => {
          setConfirmResetOpen(false);
          await clearRules();
        }}
      />
    </div>
  );
}
