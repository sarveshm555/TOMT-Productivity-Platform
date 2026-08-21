import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import * as educationService from '../api/educationService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './EducationNotesPage.css';

/**
 * Ports education-notes.html exactly - same markup, classes, copy, search,
 * and add/edit form toggle. The original's `currentLearningCourse`
 * localStorage handoff is replaced with a real route param (same pattern
 * as CodingProfilesPage.jsx -> DailyCodingLogPage.jsx).
 */
export default function EducationNotesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseSource, setCourseSource] = useState('');

  const [deletingCourseId, setDeletingCourseId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Education Notes';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setCourses(await educationService.listCourses());
    } catch (err) {
      setError('Could not load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return courses.filter((c) => c.name.toLowerCase().includes(term) || c.source.toLowerCase().includes(term));
  }, [courses, searchTerm]);

  function resetForm() {
    setEditId('');
    setCourseName('');
    setCourseSource('');
  }

  function toggleForm() {
    setFormVisible((v) => {
      const next = !v;
      if (!next) resetForm();
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { name: courseName.trim(), source: courseSource.trim() };

    try {
      if (editId) {
        const updated = await educationService.updateCourse(editId, payload);
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await educationService.createCourse(payload);
        setCourses((prev) => [created, ...prev]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save course.';
      setError(message);
    }
  }

  function viewProgress(id) {
    navigate(`/placement/education/${id}/log`);
  }

  function editCourse(course) {
    setEditId(course.id);
    setCourseName(course.name);
    setCourseSource(course.source);
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCourse(id) {
    try {
      await educationService.deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError('Could not delete course. Please try again.');
    }
  }

  const activeDeletingCourse = courses.find((c) => c.id === deletingCourseId);

  return (
    <div className="education-notes-page-root">
      <div className="app-container">
        <div className="header-top">
          <Link to="/placement" className="back-button">
            <span>🏠</span> Dashboard
          </Link>
          <button type="button" className="btn-toggle-form" id="toggle-form-btn" onClick={toggleForm}>
            {formVisible ? '❌ Close' : '➕ Add New Course'}
          </button>
        </div>

        <h2>📚 Education Notes</h2>

        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search courses or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="education-notes-error">{error}</div>}

        {formVisible && (
          <div id="course-form-container" style={{ display: 'block' }}>
            <form id="course-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-name">Learning Topic / Course Name</label>
                  <input
                    type="text"
                    id="course-name"
                    placeholder="e.g., Java Fundamentals"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-source">Source</label>
                  <input
                    type="text"
                    id="course-source"
                    placeholder="YouTube Channel Name"
                    required
                    value={courseSource}
                    onChange={(e) => setCourseSource(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-add" id="submit-button">
                {editId ? '💾 Save Changes' : '➕ Save Course'}
              </button>
            </form>
          </div>
        )}

        <h3>Your Courses</h3>
        <ul id="courses-list">
          {loading ? (
            <li className="course-item" style={{ borderLeftColor: '#888', justifyContent: 'center', color: '#888' }}>
              Loading...
            </li>
          ) : filtered.length === 0 ? (
            <li className="course-item" style={{ borderLeftColor: '#888', justifyContent: 'center', color: '#888' }}>
              No results found.
            </li>
          ) : (
            filtered.map((course) => (
              <li className="course-item" key={course.id}>
                <div className="course-details">
                  <div className="course-name">{course.name}</div>
                  <div className="course-source">Source: {course.source}</div>
                  <div style={{ marginTop: '5px', fontSize: '0.9em', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    Progress: {course.logCount} day(s) logged
                  </div>
                </div>
                <div className="course-actions">
                  <button type="button" className="action-btn btn-progress" onClick={() => viewProgress(course.id)}>
                    View Progress
                  </button>
                  <button type="button" className="action-btn" onClick={() => editCourse(course)}>
                    ✏️
                  </button>
                  <button type="button" className="btn-delete" onClick={() => setDeletingCourseId(course.id)}>
                    🗑️
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingCourseId !== null}
        title="Delete Education Course?"
        message="Are you sure you want to permanently delete this course and all associated logs? This action cannot be undone."
        itemPreview={activeDeletingCourse ? `"${activeDeletingCourse.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingCourseId(null)}
        onConfirm={async () => {
          const id = deletingCourseId;
          setDeletingCourseId(null);
          await deleteCourse(id);
        }}
      />
    </div>
  );
}
