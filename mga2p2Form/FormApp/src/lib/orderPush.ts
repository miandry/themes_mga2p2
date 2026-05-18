import { apiUrl } from './apiUrl';

const LS_KEY = 'mga2p2_order_push_enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function absoluteFromApi(path: string): string {
  const u = apiUrl(path);
  if (u.startsWith('http')) return u;
  return `${window.location.origin}${u.startsWith('/') ? u : `/${u}`}`;
}

export function isOrderPushOptedIn(): boolean {
  return localStorage.getItem(LS_KEY) === '1';
}

export function setOrderPushOptedIn(on: boolean): void {
  if (on) {
    localStorage.setItem(LS_KEY, '1');
  }
  else {
    localStorage.removeItem(LS_KEY);
  }
}

/**
 * Registers the service worker, asks permission, stores subscription on the server.
 */
export async function registerOrderMgaWebPush(): Promise<{ ok: boolean; message?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: 'Notifications non supportées par ce navigateur.' };
  }

  const cfgR = await fetch(apiUrl('mga2p2-form/api/push-config'), { credentials: 'same-origin' });
  const cfg = (await cfgR.json()) as { enabled?: boolean; publicKey?: string | null };
  if (!cfgR.ok || !cfg.enabled || !cfg.publicKey) {
    return { ok: false, message: 'Notifications serveur non configurées (VAPID / composer).' };
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, message: 'Permission de notification refusée.' };
  }

  const swUrl = absoluteFromApi('mga2p2-form/order-push-sw.js');
  const scope = absoluteFromApi('form/');
  await navigator.serviceWorker.register(swUrl, { scope });

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
    });
  }

  const body = typeof sub.toJSON === 'function' ? sub.toJSON() : sub;
  const subR = await fetch(apiUrl('mga2p2-form/api/push-subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const subJ = (await subR.json().catch(() => ({}))) as { error?: string };
  if (!subR.ok) {
    return { ok: false, message: subJ.error || subR.statusText };
  }
  setOrderPushOptedIn(true);
  return { ok: true };
}

export async function unregisterOrderMgaWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const ep = sub.endpoint;
    await fetch(apiUrl('mga2p2-form/api/push-unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ endpoint: ep }),
    });
    await sub.unsubscribe();
  }
  setOrderPushOptedIn(false);
}

/**
 * If user opted in before, re-sync subscription (e.g. after VAPID rotation).
 */
export async function resyncOrderMgaWebPushIfOptedIn(): Promise<void> {
  if (!isOrderPushOptedIn()) return;
  await registerOrderMgaWebPush().catch(() => undefined);
}
