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
  // A 401 means an expired session — except during sign-in itself, where it
  // simply means the email or password was wrong.
  const authAttempt = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/change-password');
  if (res.status === 401 && !authAttempt) {
    setToken('');
    window.dispatchEvent(new Event('kinder-logout'));
    throw new Error('Session expired — please log in again');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
