import apiClient from './axiosClient.js';

export function listQuestions() {
  return apiClient.get('/reflections/questions').then((res) => res.data.questions);
}
export function addQuestion(text) {
  return apiClient.post('/reflections/questions', { text }).then((res) => res.data.questions);
}
export function removeQuestion(index) {
  return apiClient.delete(`/reflections/questions/${index}`).then((res) => res.data.questions);
}

export function listEntries() {
  return apiClient.get('/reflections/entries').then((res) => res.data.entries);
}
export function saveEntry(answers) {
  return apiClient.post('/reflections/entries', { answers }).then((res) => res.data.entry);
}
export function deleteEntry(dateKey) {
  return apiClient.delete(`/reflections/entries/${dateKey}`).then((res) => res.data);
}
export function clearEntries() {
  return apiClient.delete('/reflections/entries').then((res) => res.data);
}

export function listProblems() {
  return apiClient.get('/reflections/problems').then((res) => res.data.problems);
}
export function createProblem(problem, solution) {
  return apiClient.post('/reflections/problems', { problem, solution }).then((res) => res.data.problem);
}
export function deleteProblem(id) {
  return apiClient.delete(`/reflections/problems/${id}`).then((res) => res.data);
}
export function clearProblems() {
  return apiClient.delete('/reflections/problems').then((res) => res.data);
}
