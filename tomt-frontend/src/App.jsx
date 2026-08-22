import React from 'react';
import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute.jsx';

import LoadingPage from './pages/LoadingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HubPage from './pages/HubPage.jsx';
import TargetsPage from './pages/TargetsPage.jsx';
import RememberBlockPage from './pages/RememberBlockPage.jsx';
import MonitoringPage from './pages/MonitoringPage.jsx';
import NeedToApplyPage from './pages/NeedToApplyPage.jsx';
import OngoingPage from './pages/OngoingPage.jsx';
import DressCheckerPage from './pages/DressCheckerPage.jsx';
import WardrobePage from './pages/WardrobePage.jsx';
import ReflectionsPage from './pages/ReflectionsPage.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import DailyActivityPage from './pages/DailyActivityPage.jsx';
import RoutineTrackerPage from './pages/RoutineTrackerPage.jsx';
import RoutineHistoryPage from './pages/RoutineHistoryPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import PendingTasksPage from './pages/PendingTasksPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import PlacementProgressPage from './pages/PlacementProgressPage.jsx';
import InternshipTrackerPage from './pages/InternshipTrackerPage.jsx';
import AddInternshipPage from './pages/AddInternshipPage.jsx';
import CodingProfilesPage from './pages/CodingProfilesPage.jsx';
import AddCodingProfilePage from './pages/AddCodingProfilePage.jsx';
import DailyCodingLogPage from './pages/DailyCodingLogPage.jsx';
import EducationNotesPage from './pages/EducationNotesPage.jsx';
import DailyLearningTrackerPage from './pages/DailyLearningTrackerPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import InfoCopyPage from './pages/InfoCopyPage.jsx';
import ImportantNotePage from './pages/ImportantNotePage.jsx';
import PersonalDiaryPage from './pages/PersonalDiaryPage.jsx';
import ViewDiaryPage from './pages/ViewDiaryPage.jsx';
import SpaceForYouPage from './pages/SpaceForYouPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

/**
 * Route table for Phase 3.2 (frontend foundation only). Matches the
 * approved Phase 1 React Router Plan (Section 8):
 *   /            -> loading_page.html port, decides /login vs /dashboard
 *   /login       -> password_page.html's LOGIN + RESET_PASSWORD screens
 *   /register    -> password_page.html's SET_PASSWORD screen
 *   /dashboard   -> dashboard.html port (protected)
 *   /hub         -> index.html port (protected)
 *   *            -> placeholder for every business-module route not yet
 *                   built (monitoring, schedule, targets, remember,
 *                   notifications, dress-checker, reflections,
 *                   daily-activity, progress, pending-tasks, placement,
 *                   diary) - explicitly out of scope for this phase.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoadingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hub"
        element={
          <ProtectedRoute>
            <HubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/targets"
        element={
          <ProtectedRoute>
            <TargetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/remember"
        element={
          <ProtectedRoute>
            <RememberBlockPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <MonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring/apply"
        element={
          <ProtectedRoute>
            <NeedToApplyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring/ongoing"
        element={
          <ProtectedRoute>
            <OngoingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dress-checker"
        element={
          <ProtectedRoute>
            <DressCheckerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dress-checker/wardrobe"
        element={
          <ProtectedRoute>
            <WardrobePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reflections"
        element={
          <ProtectedRoute>
            <ReflectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reflections/problems"
        element={
          <ProtectedRoute>
            <ProblemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-activity"
        element={
          <ProtectedRoute>
            <DailyActivityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-activity/health"
        element={
          <ProtectedRoute>
            <RoutineTrackerPage type="health" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-activity/health/history"
        element={
          <ProtectedRoute>
            <RoutineHistoryPage type="health" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-activity/professional"
        element={
          <ProtectedRoute>
            <RoutineTrackerPage type="professional" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-activity/professional/history"
        element={
          <ProtectedRoute>
            <RoutineHistoryPage type="professional" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <ProgressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending-tasks"
        element={
          <ProtectedRoute>
            <PendingTasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement"
        element={
          <ProtectedRoute>
            <PlacementProgressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/internships"
        element={
          <ProtectedRoute>
            <InternshipTrackerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/internships/new"
        element={
          <ProtectedRoute>
            <AddInternshipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/coding-profiles"
        element={
          <ProtectedRoute>
            <CodingProfilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/coding-profiles/new"
        element={
          <ProtectedRoute>
            <AddCodingProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/coding-profiles/:profileId/log"
        element={
          <ProtectedRoute>
            <DailyCodingLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/education"
        element={
          <ProtectedRoute>
            <EducationNotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/education/:courseId/log"
        element={
          <ProtectedRoute>
            <DailyLearningTrackerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/links"
        element={
          <ProtectedRoute>
            <InfoCopyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placement/notes"
        element={
          <ProtectedRoute>
            <ImportantNotePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diary"
        element={
          <ProtectedRoute>
            <PersonalDiaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diary/view"
        element={
          <ProtectedRoute>
            <ViewDiaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/space-for-you"
        element={
          <ProtectedRoute>
            <SpaceForYouPage />
          </ProtectedRoute>
        }
      />

      {/* Every not-yet-built module route, and any unknown path, lands on
          the same protected placeholder. Must stay last - react-router
          matches routes in declaration order and "*" matches everything. */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
