/**
 * Binance C2C via mga2p2 module (binance-proxy + c2c-order-history).
 */
import { apiUrl } from '@/lib/apiUrl';

function proxyBaseUrl(): string {
  const env = import.meta.env.VITE_BINANCE_PROXY_URL as string | undefined;
  if (env) return env;
  return apiUrl('binance-proxy');
}

async function proxyGet<T = unknown>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const qs = new URLSearchParams({
    path,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }).toString();
  const res = await fetch(`${proxyBaseUrl()}?${qs}`, {
    method: 'GET',
    credentials: 'same-origin',
  });
  let data: unknown = null;
  try {
    data = await res.json();
  }
  catch {
    /* non-JSON */
  }
  const err = data as { msg?: string; error?: string } | null;
  if (!res.ok) {
    throw new Error(err?.msg || err?.error || `Proxy ${res.status}`);
  }
  const binance = data as { code?: string; msg?: string } | null;
  if (binance?.code && binance.code !== '000000' && binance.msg) {
    throw new Error(binance.msg);
  }
  return data as T;
}

export type C2CTradeType = 'BUY' | 'SELL';
export type C2COrderStatus =
  | 'PENDING'
  | 'TRADING'
  | 'BUYER_PAYED'
  | 'DISTRIBUTING'
  | 'COMPLETED'
  | 'IN_APPEAL'
  | 'CANCELLED'
  | 'CANCELLED_BY_SYSTEM';

export interface C2COrder {
  orderNumber: string;
  advNo: string;
  tradeType: C2CTradeType;
  asset: string;
  fiat: string;
  fiatSymbol: string;
  amount: string;
  totalPrice: string;
  unitPrice: string;
  orderStatus: C2COrderStatus;
  createTime: number;
  commission: string;
  counterPartNickName: string;
  advertisementRole: string;
  payMethodName?: string;
  notifyPayEndTime?: number;
  notifyReleaseEndTime?: number;
}

export interface C2COrderHistoryResponse {
  code: string;
  message: string | null;
  data: C2COrder[];
  total: number;
  success: boolean;
}

export interface BinanceOrderRow {
  orderNumber: string;
  advNo: string;
  tradeType: C2CTradeType;
  asset: string;
  fiat: string;
  amount: number;
  totalPrice: number;
  unitPrice: number;
  status: C2COrderStatus;
  statusLabel: string;
  counterparty: string;
  paymentMethod: string;
  commission: string;
  advertisementRole: string;
  createTime: number;
  notifyPayEndTime?: number;
  notifyReleaseEndTime?: number;
}

const STATUS_LABELS: Record<C2COrderStatus, string> = {
  PENDING: 'En attente',
  TRADING: 'En cours',
  BUYER_PAYED: 'Payé',
  DISTRIBUTING: 'Distribution',
  COMPLETED: 'Terminé',
  IN_APPEAL: 'Litige',
  CANCELLED: 'Annulé',
  CANCELLED_BY_SYSTEM: 'Annulé (système)',
};

export function mapC2COrderRow(o: C2COrder): BinanceOrderRow {
  return {
    orderNumber: o.orderNumber,
    advNo: o.advNo || '',
    tradeType: o.tradeType,
    asset: o.asset,
    fiat: o.fiat,
    amount: parseFloat(o.amount) || 0,
    totalPrice: parseFloat(o.totalPrice) || 0,
    unitPrice: parseFloat(o.unitPrice) || 0,
    status: o.orderStatus,
    statusLabel: STATUS_LABELS[o.orderStatus] ?? o.orderStatus,
    counterparty: o.counterPartNickName || '—',
    paymentMethod: o.payMethodName?.trim() || '—',
    commission: o.commission || '',
    advertisementRole: o.advertisementRole || '',
    createTime: o.createTime,
    notifyPayEndTime: typeof o.notifyPayEndTime === 'number' ? o.notifyPayEndTime : undefined,
    notifyReleaseEndTime: typeof o.notifyReleaseEndTime === 'number' ? o.notifyReleaseEndTime : undefined,
  };
}

/** Load a single BUY order from recent history (up to 100 rows per request). */
export async function fetchBuyOrderByNumber(orderNumber: string): Promise<BinanceOrderRow | null> {
  const id = orderNumber.trim();
  if (!id) return null;

  const find = (list: C2COrder[] | undefined) => {
    const hit = (list ?? []).find(o => String(o.orderNumber) === id);
    return hit ? mapC2COrderRow(hit) : null;
  };

  try {
    const res = await fetchC2COrderHistoryModule('BUY', 1, 100);
    const row = find(res.data);
    if (row) return row;
  }
  catch {
    /* fallback */
  }

  try {
    const res = await fetchC2COrderHistoryProxy('BUY', 1, 100);
    return find(res.data);
  }
  catch {
    return null;
  }
}

export async function fetchC2COrderHistoryProxy(
  tradeType: C2CTradeType,
  page = 1,
  rows = 100,
): Promise<C2COrderHistoryResponse> {
  return proxyGet<C2COrderHistoryResponse>(
    '/sapi/v1/c2c/orderMatch/listUserOrderHistory',
    { tradeType, page, rows },
  );
}

export async function fetchC2COrderHistoryModule(
  tradeType: C2CTradeType,
  page = 1,
  rows = 100,
  totalPriceInt?: number,
): Promise<C2COrderHistoryResponse> {
  const params: Record<string, string | number> = { tradeType, page, rows };
  if (totalPriceInt != null && totalPriceInt > 0) {
    params.totalPrice = totalPriceInt;
  }
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(apiUrl(`mga2p2/api/binance/c2c-order-history?${qs}`), {
    method: 'GET',
    credentials: 'same-origin',
  });
  let data: C2COrderHistoryResponse | null = null;
  try {
    data = await res.json();
  }
  catch {
    /* */
  }
  const err = data as { error?: string; message?: string } | null;
  if (!res.ok) {
    throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
  }
  if (data && data.success === false && data.message) {
    throw new Error(data.message);
  }
  return data as C2COrderHistoryResponse;
}

export async function fetchAllC2COrdersModule(
  page = 1,
  rows = 100,
  totalPriceInt?: number,
): Promise<C2COrder[]> {
  const [buys, sells] = await Promise.all([
    fetchC2COrderHistoryModule('BUY', page, rows, totalPriceInt),
    fetchC2COrderHistoryModule('SELL', page, rows, totalPriceInt),
  ]);
  return [...(buys.data ?? []), ...(sells.data ?? [])].sort(
    (a, b) => b.createTime - a.createTime,
  );
}

export async function fetchAllC2COrdersProxy(page = 1, rows = 100): Promise<C2COrder[]> {
  const [buys, sells] = await Promise.all([
    fetchC2COrderHistoryProxy('BUY', page, rows),
    fetchC2COrderHistoryProxy('SELL', page, rows),
  ]);
  return [...(buys.data ?? []), ...(sells.data ?? [])].sort(
    (a, b) => b.createTime - a.createTime,
  );
}
