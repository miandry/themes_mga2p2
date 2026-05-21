import { apiUrl } from '@/lib/apiUrl';

export type C2cOrderActionId = 'mark_paid' | 'release' | 'cancel';

export interface C2cOrderActionResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function executeC2cOrderAction(
  orderNo: string,
  action: C2cOrderActionId,
): Promise<C2cOrderActionResponse> {
  const res = await fetch(apiUrl('mga2p2-form/api/binance/c2c-order/action'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNo: orderNo.trim(), action }),
  });

  let body: C2cOrderActionResponse = { ok: false };
  try {
    body = (await res.json()) as C2cOrderActionResponse;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }

  if (!res.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return body;
}
