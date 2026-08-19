import apiClient from './axiosClient.js';

export function getWardrobe() {
  return apiClient.get('/dress-checker/wardrobe').then((res) => res.data.wardrobe);
}
export function addWardrobeItem(type, name) {
  return apiClient.post('/dress-checker/wardrobe/items', { type, name }).then((res) => res.data.wardrobe);
}
export function deleteWardrobeItem(type, name) {
  return apiClient.delete('/dress-checker/wardrobe/items', { data: { type, name } }).then((res) => res.data.wardrobe);
}

export function getRules() {
  return apiClient.get('/dress-checker/rules').then((res) => res.data.rules);
}
export function saveRules(rules) {
  return apiClient.put('/dress-checker/rules', { rules }).then((res) => res.data.rules);
}
export function resetRules() {
  return apiClient.delete('/dress-checker/rules').then((res) => res.data.rules);
}

export function suggestOutfit(dateStr) {
  return apiClient.get('/dress-checker/suggest', { params: { date: dateStr } }).then((res) => res.data.result);
}
