import { API_BASE } from "../data/constants";

const TOKEN_KEY = "pcm_auth_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore (private mode etc.)
  }
}

export function clearToken() {
  setToken(null);
}

// Subscribers are notified when the token becomes invalid (e.g. 401),
// so the UI can drop the user back to the login screen.
const unauthorizedListeners = new Set();
export function onUnauthorized(fn) {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}
function notifyUnauthorized() {
  for (const fn of unauthorizedListeners) {
    try { fn(); } catch { /* noop */ }
  }
}

function buildUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Authenticated fetch: attaches Bearer token, JSON content-type by default,
// and surfaces 401s via onUnauthorized so the app can log out.
export async function apiFetch(path, options = {}) {
  const { headers = {}, body, json, auth = true, ...rest } = options;

  const finalHeaders = { ...headers };
  let finalBody = body;
  if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(json);
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  if (res.status === 401 && auth) {
    clearToken();
    notifyUnauthorized();
  }

  return res;
}

// Convenience: throws on non-2xx, returns parsed JSON.
export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  let payload = null;
  try { payload = await res.json(); } catch { /* tolerate empty body */ }
  if (!res.ok) {
    const err = new Error(payload?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export const auth = {
  async signup({ username, email, password }) {
    return apiJson("/api/auth/signup", {
      method: "POST",
      auth: false,
      json: { username, email, password },
    });
  },
  async login({ identifier, password }) {
    return apiJson("/api/auth/login", {
      method: "POST",
      auth: false,
      json: { identifier, password },
    });
  },
  async me() {
    return apiJson("/api/auth/me");
  },
};
