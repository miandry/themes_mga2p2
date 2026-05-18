/**
 * Same origin as the page (Drupal serves the SPA and /api_solutions/* on one host).
 * Paths are prefixed with Drupal `base_path()` when the site is in a subdirectory
 * (see `window.__drupalBasePath` in html.html.twig).
 */

declare global {
  interface Window {
    __drupalBasePath?: string;
  }
}

function drupalBasePrefix(): string {
  const raw = typeof window.__drupalBasePath === 'string' ? window.__drupalBasePath : '/';
  if (raw === '/' || raw === '') {
    return '';
  }
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/** Absolute URL for same-origin API routes (e.g. `/api_solutions/...`). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${drupalBasePrefix()}${p}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}
