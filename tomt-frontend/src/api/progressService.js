import apiClient from './axiosClient.js';
import * as routineService from './routineService.js';

/**
 * Ported from progress.html's TRACKER_KEYS map. Deliberately introduces NO
 * new backend model/controller - "internship" reuses the future placement
 * module's endpoint (see Phase 1 Router Plan: /placement/internships),
 * "professional"/"health" reuse the already-migrated routine endpoints
 * (routineService.js) exactly as instructed - no duplicated storage.
 *
 * The Placement Progress module (internships) hasn't been migrated yet as
 * of this module. Calling GET /api/placement/internships before that route
 * exists will fail; listInternships() below catches that and returns an
 * empty array so this page degrades gracefully (shows "No data found for
 * this tracker", matching the original's own empty-history message)
 * instead of crashing. No code here will need to change once Placement
 * Progress is migrated - it will simply start returning real data.
 */
function listInternships() {
  return apiClient
    .get('/placement/internships')
    .then((res) => res.data.internships)
    .catch(() => []);
}

export async function loadHistory(tracker) {
  if (tracker === 'internship') return listInternships();
  return routineService.listHistory(tracker); // 'health' | 'professional'
}

export async function loadConfig(tracker) {
  if (tracker === 'internship') return null;
  return routineService.getConfig(tracker);
}
