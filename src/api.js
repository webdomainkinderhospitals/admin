export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function getToken() {
  return localStorage.getItem('kinder_token') || '';
}
export function setToken(t) {
  if (t) localStorage.setItem('kinder_token', t);
  else localStorage.removeItem('kinder_token');
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    setToken('');
    window.dispatchEvent(new Event('kinder-logout'));
    throw new Error('Session expired — please log in again');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
