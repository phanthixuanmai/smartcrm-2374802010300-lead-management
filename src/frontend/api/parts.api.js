import { request } from './client.js';

export function listParts() {
  return request('/parts');
}

export function getPart(id) {
  return request(`/parts/${encodeURIComponent(id)}`);
}
