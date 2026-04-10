// WordWise API client
// Change this to your production URL when deploying
const API_BASE = 'http://localhost:5000/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken()        { return localStorage.getItem('ww_token'); }
function setToken(t)       { localStorage.setItem('ww_token', t); }
function clearAuth()       { localStorage.removeItem('ww_token'); localStorage.removeItem('ww_user'); }
function getStoredUser()   { try { return JSON.parse(localStorage.getItem('ww_user')); } catch { return null; } }
function setStoredUser(u)  { localStorage.setItem('ww_user', JSON.stringify(u)); }
function isLoggedIn()      { return !!getToken(); }

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expired — force re-login
    clearAuth();
    showAuthScreen();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }

  return res.json();
}

// ── API surface ───────────────────────────────────────────────────────────────
const api = {
  auth: {
    register: (email, password) =>
      apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email, password) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },

  cards: {
    getAll: () => apiFetch('/cards'),
    bulk:   (cards) => apiFetch('/cards/bulk', { method: 'POST', body: JSON.stringify(cards) }),
    update: (localId, data) => apiFetch(`/cards/${localId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (localId) => apiFetch(`/cards/${localId}`, { method: 'DELETE' }),
  },

  folders: {
    getAll: () => apiFetch('/folders'),
    bulk:   (folders) => apiFetch('/folders/bulk', { method: 'POST', body: JSON.stringify(folders) }),
    update: (localId, data) => apiFetch(`/folders/${localId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (localId) => apiFetch(`/folders/${localId}`, { method: 'DELETE' }),
  },

  user: {
    getStats:    () => apiFetch('/user/stats'),
    updateStats: (data) => apiFetch('/user/stats', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
