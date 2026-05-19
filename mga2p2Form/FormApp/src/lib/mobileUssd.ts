/** Defaults (MVola / Orange — same as server install config). */
export const DEFAULT_MOBILE_USSD = {
  mvola: '#111*1*3*3*1*NUM*MONTANT*1#',
  orange: '#144*1*1*NUMÉRO*MONTANT#',
} as const;

/** Browser persistence for `/form/settings/mobile-ussd` (used by orders list tel: links). */
export const MOBILE_USSD_STORAGE_KEY = 'mga2p2_form.settings.mobile_ussd';

export interface MobileUssdPatterns {
  mvola: string;
  orange: string;
}

/** True when `localStorage` has a non-empty entry for {@link MOBILE_USSD_STORAGE_KEY}. */
export function hasMobileUssdStorage(): boolean {
  try {
    const raw = localStorage.getItem(MOBILE_USSD_STORAGE_KEY);
    return raw !== null && String(raw).trim() !== '';
  } catch {
    return false;
  }
}

/**
 * Reads patterns from localStorage; falls back to defaults if missing or invalid.
 */
export function readMobileUssdPatternsFromStorage(): MobileUssdPatterns {
  try {
    const raw = localStorage.getItem(MOBILE_USSD_STORAGE_KEY);
    if (!raw) {
      return { mvola: DEFAULT_MOBILE_USSD.mvola, orange: DEFAULT_MOBILE_USSD.orange };
    }
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') {
      return { mvola: DEFAULT_MOBILE_USSD.mvola, orange: DEFAULT_MOBILE_USSD.orange };
    }
    const mv =
      typeof (j as { mvola_pattern?: unknown }).mvola_pattern === 'string'
        ? (j as { mvola_pattern: string }).mvola_pattern.trim()
        : '';
    const or =
      typeof (j as { orange_pattern?: unknown }).orange_pattern === 'string'
        ? (j as { orange_pattern: string }).orange_pattern.trim()
        : '';
    return {
      mvola: mv || DEFAULT_MOBILE_USSD.mvola,
      orange: or || DEFAULT_MOBILE_USSD.orange,
    };
  } catch {
    return { mvola: DEFAULT_MOBILE_USSD.mvola, orange: DEFAULT_MOBILE_USSD.orange };
  }
}

/** Persists patterns to localStorage (JSON). */
export function saveMobileUssdPatternsToStorage(mvola: string, orange: string): void {
  const mvola_pattern = mvola.trim() || DEFAULT_MOBILE_USSD.mvola;
  const orange_pattern = orange.trim() || DEFAULT_MOBILE_USSD.orange;
  localStorage.setItem(
    MOBILE_USSD_STORAGE_KEY,
    JSON.stringify({ mvola_pattern, orange_pattern }),
  );
}

/**
 * Replaces placeholders with digits-only phone and amount.
 * Order: NUMÉRO, NUMERO, NUM, then MONTANT (so NUM does not split NUMÉRO).
 */
export function applyMobileUssdPlaceholders(
  pattern: string,
  phoneDigits: string,
  montantDigits: string,
): string {
  let s = pattern;
  if (s.includes('NUMÉRO')) {
    s = s.split('NUMÉRO').join(phoneDigits);
  }
  if (s.includes('NUMERO')) {
    s = s.split('NUMERO').join(phoneDigits);
  }
  if (s.includes('NUM')) {
    s = s.split('NUM').join(phoneDigits);
  }
  if (s.includes('MONTANT')) {
    s = s.split('MONTANT').join(montantDigits);
  }
  return s;
}
