import { request } from './client.js';

export function listInventory(filters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  }
  const suffix = query.size ? `?${query}` : '';
  return request(`/inventory${suffix}`);
}

export function getInventory(id) {
  return request(`/inventory/${encodeURIComponent(id)}`);
}

export function listTransactions(id) {
  return request(`/inventory/${encodeURIComponent(id)}/transactions`);
}

export function createTransaction(id, payload) {
  return request(`/inventory/${encodeURIComponent(id)}/transactions`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
