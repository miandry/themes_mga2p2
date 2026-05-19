import { ref, shallowRef } from 'vue';
import { apiUrl } from '@/lib/apiUrl';

/** Drupal JSON routes (path after `drupal_base_path`, e.g. `/mga2p2-form/api/login`). */
export const MGA2P2_FORM_API_SESSION = 'mga2p2-form/api/session';
export const MGA2P2_FORM_API_LOGIN = 'mga2p2-form/api/login';
export const MGA2P2_FORM_API_LOGOUT = 'mga2p2-form/api/logout';

export interface FormSessionUser {
  uid: number;
  name: string;
}

export const sessionChecked = ref(false);
export const loggedIn = ref(false);
export const sessionUser = shallowRef<FormSessionUser | null>(null);

export async function fetchSession(): Promise<void> {
  try {
    const r = await fetch(apiUrl(MGA2P2_FORM_API_SESSION), { credentials: 'same-origin' });
    const j = (await r.json()) as { logged_in?: boolean; user?: FormSessionUser };
    loggedIn.value = !!j.logged_in;
    sessionUser.value = j.user ?? null;
  } catch {
    loggedIn.value = false;
    sessionUser.value = null;
  } finally {
    sessionChecked.value = true;
  }
}

export async function loginWithPassword(
  name: string,
  pass: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(apiUrl(MGA2P2_FORM_API_LOGIN), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ name: name.trim(), pass }),
  });
  let j: { logged_in?: boolean; error?: string; user?: FormSessionUser } = {};
  try {
    j = (await r.json()) as typeof j;
  } catch {
    return { ok: false, error: 'Réponse invalide.' };
  }
  if (!r.ok || !j.logged_in) {
    return { ok: false, error: j.error || 'Connexion refusée' };
  }
  loggedIn.value = true;
  sessionUser.value = j.user ?? null;
  sessionChecked.value = true;
  return { ok: true };
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch(apiUrl(MGA2P2_FORM_API_LOGOUT), {
      method: 'POST',
      credentials: 'same-origin',
    });
  } finally {
    loggedIn.value = false;
    sessionUser.value = null;
  }
}
