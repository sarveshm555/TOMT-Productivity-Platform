import apiClient from './axiosClient.js';

export function listCourses() {
  return apiClient.get('/placement/education').then((res) => res.data.courses);
}
export function getCourse(id) {
  return apiClient.get(`/placement/education/${id}`).then((res) => res.data.course);
}
export function createCourse(payload) {
  return apiClient.post('/placement/education', payload).then((res) => res.data.course);
}
export function updateCourse(id, payload) {
  return apiClient.put(`/placement/education/${id}`, payload).then((res) => res.data.course);
}
export function deleteCourse(id) {
  return apiClient.delete(`/placement/education/${id}`).then((res) => res.data);
}

export function listCourseLogs(courseId) {
  return apiClient.get(`/placement/education/${courseId}/logs`).then((res) => res.data.logs);
}
export function createCourseLog(courseId, payload) {
  return apiClient.post(`/placement/education/${courseId}/logs`, payload).then((res) => res.data.log);
}
export function updateCourseLog(courseId, logId, payload) {
  return apiClient.put(`/placement/education/${courseId}/logs/${logId}`, payload).then((res) => res.data.log);
}
export function deleteCourseLog(courseId, logId) {
  return apiClient.delete(`/placement/education/${courseId}/logs/${logId}`).then((res) => res.data);
}
