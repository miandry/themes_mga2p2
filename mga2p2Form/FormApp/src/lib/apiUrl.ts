declare global {
  interface Window {
    __drupalBasePath?: string;
  }
}

/** Same-origin path for Drupal routes (respects base_path in twig). */
export function apiUrl(path: string): string {
  const raw = typeof window.__drupalBasePath === 'string' ? window.__drupalBasePath : '/';
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${p}`;
}
