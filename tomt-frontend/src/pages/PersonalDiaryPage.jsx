import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import * as diaryService from '../api/diaryService.js';
import apiClient from '../api/axiosClient.js';
import './PersonalDiaryPage.css';

const FONT_OPTIONS = [
  { value: 'Georgia, serif', label: 'Georgia (Serif)' },
  { value: "'Courier New', monospace", label: 'Courier New (Typewriter)' },
  { value: "'Brush Script MT', cursive", label: 'Brush Script (Handwriting)' },
  { value: "'Segoe UI', sans-serif", label: 'Segoe UI (Clean)' },
];

function isColorDark(color) {
  if (!color || typeof color !== 'string') return false;
  const c = color.trim().toLowerCase();
  if (c === '#000' || c === '#000000' || c === 'black' || c === '#101010' || c === '#1f202a' || c === '#16171d' || c === '#333333' || c === '#121111') {
    return true;
  }
  if (c.startsWith('#')) {
    const hex = c.replace('#', '');
    let r = 0;
    let g = 0;
    let b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 135;
  }
  return false;
}

/**
 * Personal Diary Page:
 * - Clean, distraction-free writing environment on the main page.
 * - Top-right "✏️ Edit" button opens the Diary Appearance / Customization modal.
 * - Supports updating historical diary records in-place without creating duplicates.
 */
export default function PersonalDiaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editEntryMeta, setEditEntryMeta] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [bgPreviewUrl, setBgPreviewUrl] = useState(null);
  const [frontCoverPreviewUrl, setFrontCoverPreviewUrl] = useState(null);
  const [backCoverPreviewUrl, setBackCoverPreviewUrl] = useState(null);

  useEffect(() => {
    document.title = isEditing ? 'Life Manager App - Edit Diary Entry' : 'Life Manager App - Personal Diary';
  }, [isEditing]);

  useEffect(() => {
    if (editId) {
      loadEntryForEdit(editId);
    } else {
      setIsEditing(false);
      setEditEntryMeta(null);
      setContent('');
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await diaryService.getSettings();
      setSettings(data);
      await loadPreviews(data);
    } catch (err) {
      setError('Could not load diary settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadEntryForEdit(id) {
    setLoading(true);
    setError('');
    try {
      const [settingsData, entryData] = await Promise.all([
        diaryService.getSettings(),
        diaryService.getEntry(id),
      ]);
      const entryTheme = entryData.theme || {};
      const activeSettings = {
        ...settingsData,
        textColor: entryTheme.textColor || settingsData.textColor || '#ffffff',
        fontFamily: entryTheme.fontFamily || settingsData.fontFamily || 'Georgia, serif',
      };
      setSettings(activeSettings);
      setContent(entryData.content || '');
      setIsEditing(true);
      setEditEntryMeta({
        id: entryData.id,
        displayDateTime: entryData.displayDateTime,
        dateTime: entryData.dateTime,
        bgImageUrl: entryTheme.bgImageUrl,
      });

      if (entryTheme.bgImageUrl) {
        setBgPreviewUrl(await fetchBlobUrl(entryTheme.bgImageUrl));
      } else {
        setBgPreviewUrl(await fetchBlobUrl(settingsData.bgImageUrl));
      }
      setFrontCoverPreviewUrl(await fetchBlobUrl(settingsData.frontCoverUrl));
      setBackCoverPreviewUrl(await fetchBlobUrl(settingsData.backCoverUrl));
    } catch (err) {
      setError('Could not load diary entry for editing.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPreviews(data) {
    setBgPreviewUrl(await fetchBlobUrl(data.bgImageUrl));
    setFrontCoverPreviewUrl(await fetchBlobUrl(data.frontCoverUrl));
    setBackCoverPreviewUrl(await fetchBlobUrl(data.backCoverUrl));
  }

  async function fetchBlobUrl(url) {
    if (!url) return null;
    try {
      const res = await apiClient.get(url, { responseType: 'blob' });
      return URL.createObjectURL(res.data);
    } catch (err) {
      return null;
    }
  }

  async function saveSettingsPatch(updates) {
    try {
      const updated = await diaryService.updateSettings(updates);
      setSettings(updated);
      await loadPreviews(updated);
    } catch (err) {
      setError('Could not save diary settings. Please try again.');
    }
  }

  function handleTextColorChange(e) {
    setSettings((s) => ({ ...s, textColor: e.target.value }));
    if (!isEditing) {
      saveSettingsPatch({ textColor: e.target.value });
    }
  }
  function handleFontChange(e) {
    setSettings((s) => ({ ...s, fontFamily: e.target.value }));
    if (!isEditing) {
      saveSettingsPatch({ fontFamily: e.target.value });
    }
  }
  function handlePenStyleToggle() {
    const next = settings.penStyle === 'default' ? 'pen-caret-thick' : 'default';
    setSettings((s) => ({ ...s, penStyle: next }));
    if (!isEditing) {
      saveSettingsPatch({ penStyle: next });
    }
  }

  function handleBgImageChange(e) {
    const file = e.target.files[0];
    if (file) saveSettingsPatch({ bgImage: file });
  }
  function clearBgImage() {
    saveSettingsPatch({ clearBgImage: 'true' });
  }

  function handleFrontCoverChange(e) {
    const file = e.target.files[0];
    if (file) saveSettingsPatch({ frontCover: file });
  }
  function resetFrontCover() {
    saveSettingsPatch({ resetFrontCover: 'true' });
  }

  function handleBackCoverChange(e) {
    const file = e.target.files[0];
    if (file) saveSettingsPatch({ backCover: file });
  }
  function resetBackCover() {
    saveSettingsPatch({ resetBackCover: 'true' });
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditEntryMeta(null);
    setContent('');
    navigate('/diary/view');
  }

  async function handleSaveEntry(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      // eslint-disable-next-line no-alert
      window.alert('The diary entry cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editEntryMeta) {
        await diaryService.updateEntry(editEntryMeta.id, {
          content: trimmed,
          theme: {
            textColor: settings.textColor,
            fontFamily: settings.fontFamily,
          },
        });
        // eslint-disable-next-line no-alert
        window.alert('Entry updated successfully!');
        navigate('/diary/view');
      } else {
        await diaryService.createEntry(trimmed);
        setContent('');
        // eslint-disable-next-line no-alert
        window.alert('Entry saved!');
      }
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save entry.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <div className="personal-diary-page-root" />;
  }

  const writingAreaStyle = {
    color: settings.textColor,
    fontFamily: settings.fontFamily,
    ...(bgPreviewUrl
      ? { backgroundImage: `url(${bgPreviewUrl})` }
      : isColorDark(settings.textColor)
      ? { backgroundColor: '#fcfcf7', color: settings.textColor }
      : { backgroundColor: 'var(--input-bg)', color: settings.textColor }),
  };

  return (
    <div className="personal-diary-page-root">
      <div className="app-container">
        <div className="header-row">
          <Link to="/hub" className="back-button">
            🏠 Back to Dashboard
          </Link>
          <div className="header-actions">
            <button
              type="button"
              className="btn-edit-appearance"
              title="Customize diary appearance (font, colors, cover)"
              onClick={() => setShowEditModal(true)}
            >
              ✏️ Edit
            </button>
            <button type="button" className="btn-view-history" onClick={() => navigate('/diary/view')}>
              📖 View Diary
            </button>
          </div>
        </div>

        <h2>{isEditing ? '✏️ Edit Diary Entry' : 'My Personal Diary'}</h2>

        {isEditing && editEntryMeta && (
          <div className="diary-edit-banner">
            <div className="edit-banner-info">
              <span className="edit-banner-badge">EDITING</span>
              <span>
                Entry Date: <strong>{editEntryMeta.displayDateTime}</strong>
              </span>
            </div>
            <button type="button" className="btn-cancel-edit" onClick={handleCancelEdit}>
              Cancel Edit
            </button>
          </div>
        )}

        {error && <div className="personal-diary-error">{error}</div>}

        <form id="diary-write-form" onSubmit={handleSaveEntry}>
          <textarea
            id="diary-textarea"
            className={`diary-textarea ${settings.penStyle === 'pen-caret-thick' ? 'pen-caret-thick' : ''}`}
            style={writingAreaStyle}
            placeholder="Dear Diary..."
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit" className="btn-save-entry" id="save-entry-btn" disabled={saving}>
            {saving ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? '💾 Update Entry' : '💾 Save Entry')}
          </button>
        </form>
      </div>

      {/* Edit Appearance & Customization Modal */}
      {showEditModal && (
        <div
          className="personal-diary-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="personal-diary-modal">
            <div className="personal-diary-modal-header">
              <h3>🎨 Diary Appearance</h3>
              <button
                type="button"
                className="personal-diary-modal-close"
                onClick={() => setShowEditModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="personal-diary-modal-body">
              <div className="settings-panel">
                <div className="setting-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    id="text-color-picker"
                    value={settings.textColor}
                    onChange={handleTextColorChange}
                  />
                </div>
                <div className="setting-group">
                  <label>Font</label>
                  <select id="font-picker" value={settings.fontFamily} onChange={handleFontChange}>
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="setting-group">
                  <label>Pen Style</label>
                  <button
                    type="button"
                    id="pen-style-toggle"
                    className="btn-pen-toggle"
                    onClick={handlePenStyleToggle}
                  >
                    {settings.penStyle === 'pen-caret-thick' ? '🖊️ Thick' : '✒️ Default'}
                  </button>
                </div>
                <div className="setting-group">
                  <label>Background Image</label>
                  <input type="file" id="bg-image-input" accept="image/*" onChange={handleBgImageChange} />
                  {bgPreviewUrl && (
                    <button type="button" className="btn-reset-cover" onClick={clearBgImage}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="setting-group">
                  <label>Front Cover</label>
                  <input type="file" id="front-cover-input" accept="image/*" onChange={handleFrontCoverChange} />
                  <img
                    className="cover-thumb"
                    src={frontCoverPreviewUrl || '/diary_front.jpeg'}
                    alt="Front cover"
                  />
                  {settings.frontCoverUrl && (
                    <button type="button" className="btn-reset-cover" onClick={resetFrontCover}>
                      Reset to Default
                    </button>
                  )}
                </div>
                <div className="setting-group">
                  <label>Back Cover</label>
                  <input type="file" id="back-cover-input" accept="image/*" onChange={handleBackCoverChange} />
                  <img className="cover-thumb" src={backCoverPreviewUrl || '/diary_back.jpeg'} alt="Back cover" />
                  {settings.backCoverUrl && (
                    <button type="button" className="btn-reset-cover" onClick={resetBackCover}>
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="personal-diary-modal-footer">
              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setShowEditModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
