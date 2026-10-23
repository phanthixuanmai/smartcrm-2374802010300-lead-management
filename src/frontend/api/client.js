const API_BASE = window.location.port === '3000'
  ? '/api'
  : `${window.location.protocol}//${window.location.hostname}:3000/api`;

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    const networkError = new Error('Không thể kết nối đến máy chủ API. Kiểm tra backend và thử lại.');
    networkError.cause = error;
    throw networkError;
  }
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    if (window.location.pathname !== '/login') {
      window.location.hash = 'login';
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const error = new Error(body && body.error ? body.error : `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}
