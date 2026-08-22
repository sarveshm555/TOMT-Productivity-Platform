import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import * as diaryService from '../api/diaryService.js';
import apiClient from '../api/axiosClient.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import { formatLocalDateTime } from '../utils/dateTimeUtils.js';
import './ViewDiaryPage.css';

const JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const HTML2CANVAS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

function loadScript(src, checkGlobal) {
  if (checkGlobal()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      existing.addEventListener('load', function () {
        resolve();
      });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = function () {
      resolve();
    };
    script.onerror = function () {
      reject(new Error('Failed to load ' + src));
    };
    document.head.appendChild(script);
  });
}

function isLightColor(color) {
  if (!color || typeof color !== 'string') return true;
  const c = color.trim().toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white' || c === '#f0f4f8' || c === '#fcfcf7' || c === '#f5f5f5') {
    return true;
  }
  if (c === '#000' || c === '#000000' || c === 'black' || c === '#101010' || c === '#1f202a' || c === '#16171d' || c === '#333333' || c === '#121111') {
    return false;
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
    return luminance > 160;
  }
  return false;
}

/**
 * Returns a readable text color for rendering on light paper (#fcfcf7) in the viewer/PDF.
 * If the page has a custom background image, the user's custom textColor is honored.
 * If the page has no custom background image (light paper background), and stored textColor is white/light,
 * safely falls back to a readable dark ink color (#2b2c37 / #333333).
 */
function getViewerTextColor(entry) {
  const storedColor = entry && entry.theme && entry.theme.textColor;
  const hasBgImage = Boolean(entry && entry.theme && entry.theme.bgImageUrl);
  if (hasBgImage) {
    return storedColor || '#ffffff';
  }
  if (!storedColor || isLightColor(storedColor)) {
    return '#2b2c37'; // Safe high-contrast dark text on light paper background
  }
  return storedColor;
}

/**
 * Ports view.html with full multi-layer page-stack "book" algorithm and
 * adds individual View, Edit, and Delete actions for every diary entry.
 */
export default function ViewDiaryPage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(0);

  const [frontCoverUrl, setFrontCoverUrl] = useState(null);
  const [backCoverUrl, setBackCoverUrl] = useState(null);
  const [entryBgUrls, setEntryBgUrls] = useState({});

  const pdfExportRef = useRef(null);
  const blobCacheRef = useRef({});
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(function () {
    document.title = 'Life Manager App - View Diary';
  }, []);

  useEffect(function () {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const entryList = await diaryService.listEntries();
      setEntries(entryList);
    } catch (err) {
      setError('Could not load your diary. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchBlobUrl(url) {
    if (!url) return null;
    if (blobCacheRef.current[url]) {
      return blobCacheRef.current[url];
    }
    try {
      const res = await apiClient.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      blobCacheRef.current[url] = blobUrl;
      return blobUrl;
    } catch (err) {
      return null;
    }
  }

  function renderHistoryIndex() {
    setMode('list');
  }

  async function displayAllEntriesAsBook() {
    if (entries.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert('No entries to view in the diary book.');
      return;
    }

    const settings = await diaryService.getSettings();
    const frontBlob = settings.frontCoverUrl ? await fetchBlobUrl(settings.frontCoverUrl) : null;
    const backBlob = settings.backCoverUrl ? await fetchBlobUrl(settings.backCoverUrl) : null;
    setFrontCoverUrl(frontBlob || '/diary_front.jpeg');
    setBackCoverUrl(backBlob || '/diary_back.jpeg');

    const withImages = entries.filter(function (e) {
      return e.theme && e.theme.bgImageUrl;
    });
    const fetched = await Promise.all(
      withImages.map(function (e) {
        return fetchBlobUrl(e.theme.bgImageUrl);
      })
    );
    const nextBgUrls = {};
    withImages.forEach(function (e, i) {
      nextBgUrls[e.id] = fetched[i];
    });
    setEntryBgUrls(nextBgUrls);

    setMode('book');
    setCurrentPage(0);
  }

  const bookEntries = React.useMemo(function () {
    return entries
      .slice()
      .sort(function (a, b) {
        return new Date(a.dateTime) - new Date(b.dateTime);
      });
  }, [entries]);
  const pageCount = bookEntries.length + 2;

  // Virtualized page window (renders only active page and adjacent pages)
  const visiblePages = React.useMemo(function () {
    if (mode !== 'book') return [];
    const pages = [];

    // Front cover when at start of book
    if (currentPage <= 1) {
      pages.push({ index: 0, type: 'front' });
    }

    // Active entry page range
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(bookEntries.length, currentPage + 1);

    for (let idx = start; idx <= end; idx++) {
      pages.push({
        index: idx,
        type: 'entry',
        entry: bookEntries[idx - 1],
      });
    }

    // Back cover when at end of book
    if (currentPage >= pageCount - 2) {
      pages.push({ index: pageCount - 1, type: 'back' });
    }

    return pages;
  }, [currentPage, bookEntries, pageCount, mode]);

  // Preload background images for active and adjacent pages
  useEffect(function () {
    if (mode !== 'book') return;
    const indicesToPreload = [currentPage - 1, currentPage, currentPage + 1];
    indicesToPreload.forEach(function (idx) {
      if (idx >= 1 && idx <= bookEntries.length) {
        const entry = bookEntries[idx - 1];
        if (entry && entry.theme && entry.theme.bgImageUrl) {
          fetchBlobUrl(entry.theme.bgImageUrl).then(function (blobUrl) {
            if (blobUrl) {
              setEntryBgUrls(function (prev) {
                if (prev[entry.id] === blobUrl) return prev;
                const next = Object.assign({}, prev);
                next[entry.id] = blobUrl;
                return next;
              });
            }
          });
        }
      }
    });
  }, [currentPage, mode, bookEntries]);

  // Clean up cached blob URLs on component unmount
  useEffect(function () {
    return function () {
      if (blobCacheRef.current) {
        Object.values(blobCacheRef.current).forEach(function (blobUrl) {
          if (blobUrl && typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
          }
        });
        blobCacheRef.current = {};
      }
    };
  }, []);

  const [deletingEntryId, setDeletingEntryId] = useState(null);

  async function openEntryInBook(entryId) {
    const targetIndex = bookEntries.findIndex(function (e) {
      return e.id === entryId;
    });
    await displayAllEntriesAsBook();
    if (targetIndex !== -1) {
      setCurrentPage(targetIndex + 1);
    }
  }

  async function deleteEntry(id) {
    try {
      await diaryService.deleteEntry(id);
      setEntries(function (prev) {
        return prev.filter(function (e) {
          return e.id !== id;
        });
      });
    } catch (err) {
      setError('Could not delete entry. Please try again.');
    }
  }

  const nextPage = React.useCallback(function () {
    setCurrentPage(function (p) {
      return Math.min(pageCount - 1, p + 1);
    });
  }, [pageCount]);

  const prevPage = React.useCallback(function () {
    setCurrentPage(function (p) {
      return Math.max(0, p - 1);
    });
  }, []);

  const pageStyle = React.useCallback(function (index, extra) {
    let transform;
    let zIndex;
    if (index < currentPage) {
      transform = 'rotateY(-180deg)';
      zIndex = index + 1;
    } else if (index === currentPage) {
      transform = 'rotateY(0deg)';
      zIndex = pageCount + 1;
    } else {
      transform = 'rotateY(0deg)';
      zIndex = pageCount - index;
    }
    return Object.assign({ transform: transform, zIndex: zIndex }, extra || {});
  }, [currentPage, pageCount]);

  async function downloadFullDiaryPDF() {
    await loadScript(JSPDF_SRC, function () {
      return window.jspdf && window.jspdf.jsPDF;
    });
    await loadScript(HTML2CANVAS_SRC, function () {
      return window.html2canvas;
    });

    if (!window.jspdf || !window.html2canvas) {
      // eslint-disable-next-line no-alert
      window.alert('Download failed: Required libraries (html2canvas, jspdf) are not fully loaded.');
      return;
    }
    if (entries.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert('No entries found to create a full diary PDF.');
      return;
    }

    setPdfBusy(true);
    try {
      const JsPdfCtor = window.jspdf.jsPDF;
      const settings = await diaryService.getSettings();
      const customFront = settings.frontCoverUrl ? await fetchBlobUrl(settings.frontCoverUrl) : null;
      const customBack = settings.backCoverUrl ? await fetchBlobUrl(settings.backCoverUrl) : null;
      const frontUrl = customFront || '/diary_front.jpeg';
      const backUrl = customBack || '/diary_back.jpeg';

      const container = pdfExportRef.current;
      container.innerHTML = '';

      const coverPage = document.createElement('div');
      coverPage.className = 'pdf-page-wrapper';
      coverPage.style.display = 'flex';
      coverPage.style.alignItems = 'center';
      coverPage.style.justifyContent = 'center';
      coverPage.style.backgroundImage = "url('" + frontUrl + "')";
      coverPage.style.backgroundSize = 'cover';
      coverPage.style.backgroundPosition = 'center';
      coverPage.style.backgroundColor = '#fcfcf7';
      container.appendChild(coverPage);

      const sorted = entries.slice().sort(function (a, b) {
        return new Date(a.dateTime) - new Date(b.dateTime);
      });

      for (const entry of sorted) {
        const entryHtml = entry.content.replace(/\n/g, '<br>');
        const bgUrl = (entry.theme && entry.theme.bgImageUrl) ? await fetchBlobUrl(entry.theme.bgImageUrl) : null;

        const page = document.createElement('div');
        page.className = 'pdf-page-wrapper';
        if (bgUrl) {
          page.style.backgroundImage = "url('" + bgUrl + "')";
          page.style.backgroundSize = 'cover';
          page.style.backgroundPosition = 'center';
        }
        const fontFamily = (entry.theme && entry.theme.fontFamily) || 'Georgia, serif';
        const textColor = getViewerTextColor(entry);
        const formattedDate = formatLocalDateTime(entry.dateTime, entry.displayDateTime);
        page.innerHTML =
          '<div style="text-align:center;margin-bottom:10pt;color:' +
          textColor +
          ';font-family:' +
          fontFamily +
          ';"><h4 style="margin:0;font-size:16pt;">' +
          formattedDate +
          '</h4></div><hr style="border-color:#5d4037;"><div style="white-space:pre-wrap;font-size:12pt;color:' +
          textColor +
          ';font-family:' +
          fontFamily +
          ';">' +
          entryHtml +
          '</div>';
        container.appendChild(page);
      }

      const backCoverPage = document.createElement('div');
      backCoverPage.className = 'pdf-page-wrapper';
      backCoverPage.style.display = 'flex';
      backCoverPage.style.alignItems = 'center';
      backCoverPage.style.justifyContent = 'center';
      backCoverPage.style.backgroundImage = "url('" + backUrl + "')";
      backCoverPage.style.backgroundSize = 'cover';
      backCoverPage.style.backgroundPosition = 'center';
      backCoverPage.style.backgroundColor = '#fcfcf7';
      container.appendChild(backCoverPage);

      const doc = new JsPdfCtor({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageElements = container.querySelectorAll('.pdf-page-wrapper');
      const pageWidth = 595;
      const pageHeight = 842;

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        if (i !== 0) doc.addPage();
        try {
          // eslint-disable-next-line no-await-in-loop
          const canvas = await window.html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#fcfcf7',
          });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, null, 'FAST');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('html2canvas failed on page:', i, err);
        }
      }

      doc.save('Full_Diary_' + new Date().toISOString().slice(0, 10) + '.pdf');
      container.innerHTML = '';
    } finally {
      setPdfBusy(false);
    }
  }

  const downloadDisabled = entries.length === 0;

  return (
    <div className="view-diary-page-root">
      <h2>{mode === 'list' ? 'All Entries' : 'Full Diary Book View'}</h2>

      {error && <div className="view-diary-error">{error}</div>}

      {mode === 'list' && (
        <div id="history-view-container" style={{ display: 'block' }}>
          <div className="action-buttons">
            <button type="button" className="btn btn-download" disabled={downloadDisabled} onClick={displayAllEntriesAsBook}>
              View All Entries (Book)
            </button>
            <button type="button" className="btn btn-download" disabled={downloadDisabled || pdfBusy} onClick={downloadFullDiaryPDF}>
              {pdfBusy ? 'Generating PDF...' : 'Download Fully Diary (PDF)'}
            </button>
            <Link to="/diary" className="btn btn-nav">
              Back to Writing
            </Link>
          </div>

          <ul id="history-list">
            {loading ? (
              <li className="history-item-view" style={{ justifyContent: 'center' }}>
                Loading...
              </li>
            ) : entries.length === 0 ? (
              <li
                className="history-item-view"
                style={{ justifyContent: 'center', backgroundColor: 'var(--input-bg)', borderLeftColor: 'var(--border-color)' }}
              >
                No entries saved yet.
              </li>
            ) : (
              entries.map(function (entry) {
                const formattedDate = formatLocalDateTime(entry.dateTime, entry.displayDateTime);
                return (
                  <li className="history-item-view" key={entry.id}>
                    <span className="entry-title-date">{formattedDate}</span>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="btn btn-view-entry"
                        title="View this entry in the diary book"
                        onClick={function () { openEntryInBook(entry.id); }}
                      >
                        📖 View
                      </button>
                      <button
                        type="button"
                        className="btn btn-edit-entry"
                        title="Edit this diary entry"
                        onClick={function () { navigate('/diary?edit=' + entry.id); }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        title="Delete this diary entry"
                        onClick={function () { setDeletingEntryId(entry.id); }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {mode === 'book' && (
        <div className="book-view-wrapper">
          <div className="book-stage-container">
            <div id="book-container" style={{ display: 'block' }}>
              {visiblePages.map(function (pageItem) {
                const index = pageItem.index;
                const type = pageItem.type;
                const entry = pageItem.entry;

                if (type === 'front') {
                  return (
                    <div
                      key="cover-front"
                      id="cover-front"
                      className="page"
                      style={pageStyle(0, {
                        backgroundImage: "url('" + (frontCoverUrl || '/diary_front.jpeg') + "')",
                        backgroundColor: 'transparent',
                      })}
                    />
                  );
                }

                if (type === 'back') {
                  return (
                    <div
                      key="cover-back"
                      id="cover-back"
                      className="page"
                      style={pageStyle(pageCount - 1, {
                        backgroundImage: "url('" + (backCoverUrl || '/diary_back.jpeg') + "')",
                        backgroundColor: 'transparent',
                      })}
                    />
                  );
                }

                const bgUrl = entryBgUrls[entry.id];
                const textColor = getViewerTextColor(entry);
                const fontFamily = (entry.theme && entry.theme.fontFamily) || 'Georgia, serif';
                const formattedDate = formatLocalDateTime(entry.dateTime, entry.displayDateTime);

                return (
                  <div
                    key={entry.id}
                    className="page page-content dynamic-page"
                    style={pageStyle(index, {
                      backgroundImage: bgUrl ? 'url(' + bgUrl + ')' : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: 'var(--print-page-bg)',
                      color: textColor,
                      fontFamily: fontFamily,
                    })}
                  >
                    <div style={{ color: textColor, fontFamily: fontFamily }}>
                      <strong>Date:</strong> {formattedDate}
                    </div>
                    <hr style={{ borderColor: '#999' }} />
                    <div style={{ whiteSpace: 'pre-wrap', color: textColor, fontFamily: fontFamily }}>
                      {entry.content}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '30px',
                        fontSize: '0.8em',
                        color: '#666',
                        opacity: 0.6,
                      }}
                    >
                      Page {index} of {bookEntries.length}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="book-controls-bar">
            <div className="action-buttons" id="book-navigation-actions" style={{ display: 'flex' }}>
              <button
                type="button"
                className="btn btn-nav"
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                Previous Page
              </button>
              <button
                type="button"
                className="btn btn-nav"
                onClick={nextPage}
                disabled={currentPage === pageCount - 1}
              >
                Next Page
              </button>
              <button type="button" className="btn btn-nav" onClick={renderHistoryIndex}>
                Back to List
              </button>
            </div>
            <div className="page-indicator">
              Page {currentPage === 0 ? 'Cover' : currentPage === pageCount - 1 ? 'End Cover' : `${currentPage} of ${bookEntries.length}`}
            </div>
          </div>
        </div>
      )}

      <div id="pdf-export-container" ref={pdfExportRef} />

      <ConfirmDeleteModal
        isOpen={deletingEntryId !== null}
        title="Delete Diary Entry?"
        message="Are you sure you want to permanently delete this diary entry? This action cannot be undone."
        confirmWord="DELETE"
        onClose={function () { setDeletingEntryId(null); }}
        onConfirm={async function () {
          const id = deletingEntryId;
          setDeletingEntryId(null);
          await deleteEntry(id);
        }}
      />
    </div>
  );
}
