function normalizeBaseUrl(raw: string | undefined) {
  const v = String(raw || '').trim();
  if (!v) return '';
  const unwrapped =
    (v.startsWith('`') && v.endsWith('`')) ||
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
      ? v.slice(1, -1).trim()
      : v;
  return unwrapped.replace(/\/+$/, '');
}

const apiUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5174';

function getToken() {
  return localStorage.getItem('mbraces_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('mbraces_token', token);
  else localStorage.removeItem('mbraces_token');
}

export function getApiUrl() {
  return apiUrl;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type') && options?.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg = (body && typeof body === 'object' && 'error' in body) ? String(body.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}
