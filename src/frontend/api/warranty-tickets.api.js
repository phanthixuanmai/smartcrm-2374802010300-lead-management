import { request } from './client.js';

export function listOpenTickets() {
  return request('/warranty-tickets?status=OPEN');
}
