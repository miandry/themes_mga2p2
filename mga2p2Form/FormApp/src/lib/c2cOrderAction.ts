import { apiUrl } from '@/lib/apiUrl';

export type C2cOrderActionId = 'mark_paid' | 'release' | 'cancel';

export interface C2cOrderActionResponse {
  ok: boolean;
  message?: string;
  error?: string;
  binance?: { code?: number; msg?: string };
}

export async function executeC2cOrderAction(
  orderNo: string,
  action: C2cOrderActionId,
  payMethodName?: string,
): Promise<C2cOrderActionResponse> {
  const payload: Record<string, unknown> = { orderNo: orderNo.trim(), action };
  if (payMethodName) payload.payMethodName = payMethodName.trim();

  const res = await fetch(apiUrl('mga2p2-form/api/binance/c2c-order/action'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body: C2cOrderActionResponse = { ok: false };
  try {
    body = (await res.json()) as C2cOrderActionResponse;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }

  if (!res.ok || !body.ok) {
    const detail = body.binance?.msg ? ` (Binance: ${body.binance.msg})` : '';
    throw new Error((body.error || `HTTP ${res.status}`) + detail);
  }

  return body;
}
