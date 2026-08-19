import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import * as progressService from '../api/progressService.js';
import './ProgressPage.css';

// Chart.js is loaded from the same CDN/version the original used (via a
// <script> tag), but only when this page mounts - no other page needs it.
const CHARTJS_SRC = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

function loadChartJs() {
  if (window.Chart) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHARTJS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = CHARTJS_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

// Ported 1:1 from progress.html's getStatusColors().
function getStatusColors(key) {
  const colors = {
    Applied: '#007bff',
    Interview: '#17a2b8',
    Offer: '#28a745',
    Rejected: '#dc3545',
    palette: ['#9c27b0', '#00bcd4', '#ff9800', '#e91e63', '#4caf50', '#3f51b5'],
  };
  return colors[key] || colors.palette;
}

/**
 * Ports progress.html exactly - same markup, classes, copy, button
 * highlighting behavior, and the three Chart.js renderers (pie/line/bar),
 * with the identical formulas for value extraction, time parsing, and
 * date grouping. localStorage reads are replaced with
 * progressService.loadHistory()/loadConfig() (see progressService.js) -
 * everything else, including the imperative Chart.js instantiate/destroy
 * lifecycle, is unchanged.
 */
export default function ProgressPage() {
  const [currentTracker, setCurrentTracker] = useState(null);
  const [currentChartType, setCurrentChartType] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [message, setMessage] = useState('Please select a **Tracker File** above to begin visualization.');
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [chartControlsVisible, setChartControlsVisible] = useState(false);

  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    document.title = 'Progress Dashboard';
  }, []);

  useEffect(() => {
    loadChartJs();
  }, []);

  function destroyChart() {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    setCanvasVisible(false);
  }

  async function populateMetricSelector(tracker) {
    let nextMetrics = [];

    if (tracker === 'internship') {
      nextMetrics.push({ key: 'status', name: 'Application Status' });
    } else {
      const config = await progressService.loadConfig(tracker);
      if (tracker === 'health') {
        nextMetrics.push({ key: 'wakeUpTime', name: 'Wake Up Time' });
      }
      if (config) {
        config.forEach((q) => {
          if (['number', 'select', 'yn'].includes(q.type)) {
            nextMetrics.push({ key: q.key, name: q.name });
          }
        });
      }
    }

    setMetrics(nextMetrics);
    setSelectedMetric(nextMetrics.length > 0 ? nextMetrics[0].key : '');
  }

  function handleTrackerSelection(tracker) {
    setCurrentTracker(tracker);
    setCurrentChartType(null);
    destroyChart();
    setChartControlsVisible(true);
    populateMetricSelector(tracker);
    setMessage('Now select a chart type.');
  }

  function handleChartTypeSelection(type) {
    setCurrentChartType(type);
  }

  // Ported from renderChart() - re-runs whenever the tracker, chart type,
  // or selected metric changes, exactly matching the original's
  // event-driven re-render (button clicks + metric-selector 'change').
  useEffect(() => {
    async function renderChart() {
      destroyChart();
      if (!currentTracker || !currentChartType) return;

      const history = await progressService.loadHistory(currentTracker);
      if (history.length === 0) {
        setMessage('No data found for this tracker.');
        return;
      }

      await loadChartJs();
      setMessage('');
      setCanvasVisible(true);

      if (currentChartType === 'pie') renderPieChart(history);
      else if (currentChartType === 'line') renderLineChart(history);
      else if (currentChartType === 'bar') renderBarChart(history);
    }

    renderChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTracker, currentChartType, selectedMetric]);

  function renderPieChart(history) {
    const metricKey = selectedMetric;
    const counts = {};

    history.forEach((entry) => {
      const val = entry[metricKey] || (entry.data ? entry.data[metricKey] : null);
      if (val) counts[val] = (counts[val] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const bgColors = currentTracker === 'internship' ? labels.map(getStatusColors) : getStatusColors('palette');

    chartInstanceRef.current = new window.Chart(canvasRef.current, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: bgColors }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: 'white' } } },
      },
    });
  }

  function renderLineChart(history) {
    const metricKey = selectedMetric;
    const isTime = metricKey.toLowerCase().includes('time');

    const processed = history
      .map((entry) => {
        let val = entry[metricKey] || (entry.data ? entry.data[metricKey] : null);
        if (!val) return null;

        if (isTime && typeof val === 'string' && val.includes(':')) {
          const parts = val.split(':');
          val = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else {
          val = parseFloat(val);
        }
        return Number.isNaN(val) ? null : { x: new Date(entry.date || Date.now()), y: val };
      })
      .filter((d) => d)
      .sort((a, b) => a.x - b.x);

    const metricLabel = (metrics.find((m) => m.key === metricKey) || {}).name || metricKey;

    chartInstanceRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: processed.map((d) => d.x.toLocaleDateString()),
        datasets: [
          {
            label: metricLabel,
            data: processed.map((d) => d.y),
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.2)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              color: 'white',
              callback: (v) => (isTime ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : v),
            },
          },
          x: { ticks: { color: 'white' } },
        },
      },
    });
  }

  function renderBarChart(history) {
    const metricKey = selectedMetric;
    const counts = {};

    history.forEach((entry) => {
      const date = new Date(entry.date || Date.now()).toLocaleDateString();
      const val = entry[metricKey] || (entry.data ? entry.data[metricKey] : null);
      if (val) counts[date] = (counts[date] || 0) + (parseFloat(val) || 1);
    });

    chartInstanceRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: Object.keys(counts),
        datasets: [{ label: 'Value', data: Object.values(counts), backgroundColor: '#9c27b0' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: 'white' } },
          x: { ticks: { color: 'white' } },
        },
      },
    });
  }

  return (
    <div className="progress-page-root">
      <div className="header-container">
        <Link to="/hub" className="back-to-dashboard-btn">
          🏠 Back to Dashboard
        </Link>
      </div>

      <div className="dashboard-container">
        <h2>📈 Progress Visualization Dashboard</h2>

        <div id="main-controls">
          <h3>1. Select Tracker File</h3>
          {[
            { key: 'internship', label: 'Internship Tracker' },
            { key: 'professional', label: 'Professional Routine' },
            { key: 'health', label: 'Health Routine' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className="btn"
              style={{ backgroundColor: currentTracker === t.key ? 'var(--secondary-color)' : '#4a148c' }}
              onClick={() => handleTrackerSelection(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id="chart-controls" style={{ display: chartControlsVisible ? 'block' : 'none' }}>
          <h3>2. Select Visualization</h3>
          {[
            { key: 'pie', label: 'Pie Chart' },
            { key: 'line', label: 'Line Graph' },
            { key: 'bar', label: 'Bar Chart' },
          ].map((c) => (
            <button
              key={c.key}
              type="button"
              className="btn"
              style={{ backgroundColor: currentChartType === c.key ? 'var(--primary-color)' : 'var(--secondary-color)' }}
              onClick={() => handleChartTypeSelection(c.key)}
            >
              {c.label}
            </button>
          ))}

          <div id="metric-selection-area" style={{ marginTop: '15px' }}>
            <label htmlFor="metric-selector">Select Metric:</label>
            <select id="metric-selector" value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div id="chart-container">
          {!canvasVisible && (
            <div id="no-selection-message" className="no-data-message">
              {message}
            </div>
          )}
          <canvas id="chart-canvas" ref={canvasRef} style={{ display: canvasVisible ? 'block' : 'none' }} />
        </div>
      </div>
    </div>
  );
}
