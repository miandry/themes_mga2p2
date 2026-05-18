/**
 * Binance API client (browser side).
 *
 * All requests go through the Drupal `mga2p2` module proxy at
 * /binance-proxy. The module signs each request server-side with the
 * configured HMAC secret and adds CORS headers, so:
 *   1. The secret never reaches the browser.
 *   2. There are no CORS issues — api.binance.com refuses browser calls.
 *
 * Override the URL at build time with VITE_BINANCE_PROXY_URL if Drupal is
 * installed in a subdirectory (e.g. "/platforme/binance-proxy").
 */

import { apiUrl } from './api';

function proxyBaseUrl(): string {
  const env = import.meta.env.VITE_BINANCE_PROXY_URL as string | undefined;
  if (env) {
    return env;
  }
  return apiUrl('/binance-proxy');
}

// ── Low-level proxy GET ──────────────────────────────────────────────────────

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

  let data: any = null;
  try { data = await res.json(); } catch { /* upstream returned non-JSON */ }

  if (!res.ok) {
    throw new Error(data?.msg || data?.error || `Proxy ${res.status}`);
  }
  if (data && typeof data === 'object' && data.code && data.code !== '000000' && data.msg) {
    throw new Error(data.msg);
  }
  return data as T;
}

// ── Low-level proxy POST (signed server-side, same whitelist as GET) ─────────

async function proxyPost<T = unknown>(
  path: string,
  body: Record<string, string | number> = {},
): Promise<T> {
  const qs = new URLSearchParams({ path }).toString();
  const payload = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, typeof v === 'number' ? v : String(v)]),
  );
  const res = await fetch(`${proxyBaseUrl()}?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await res.json();
  }
  catch {
    /* non-JSON */
  }

  if (!res.ok) {
    throw new Error(data?.msg || data?.message || data?.error || `Proxy ${res.status}`);
  }
  if (data && typeof data === 'object' && data.code != null && data.code !== '000000' && data.code !== 0 && (data.msg || data.message)) {
    const m = data.msg || data.message;
    throw new Error(`[${data.code}] ${m}`);
  }
  return data as T;
}

/** Buyer marks fiat as transferred → Binance moves order toward paid / seller release. */
export async function markC2COrderAsPaid(
  orderNo: string,
  payId?: number,
): Promise<void> {
  const body: Record<string, string | number> = {
    // C2C mark-order-as-paid expects orderNo (list history still labels it orderNumber).
    orderNo: String(orderNo),
  };
  if (payId != null && Number.isFinite(payId)) {
    body.payId = payId;
  }
  await proxyPost('/sapi/v1/c2c/orderMatch/markOrderAsPaid', body);
}

// ── Config check ──────────────────────────────────────────────────────────────

/**
 * Returns true if the proxy is reachable. Credential validation happens
 * server-side, so we always return true here; errors surface on first call.
 */
export function binanceConfigured(): boolean {
  return true;
}

// ── Account / Balance ─────────────────────────────────────────────────────────

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceAccount {
  makerCommission: number;
  takerCommission: number;
  balances: BinanceBalance[];
  accountType: string;
  /** Present on live API; used for UI only. */
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  updateTime?: number;
  permissions?: string[];
}

export async function fetchAccount(): Promise<BinanceAccount> {
  return proxyGet<BinanceAccount>('/api/v3/account');
}

export async function fetchBalance(asset = 'USDT'): Promise<BinanceBalance | null> {
  const account = await fetchAccount();
  return account.balances.find(b => b.asset === asset) ?? null;
}

// ── C2C / P2P order history ───────────────────────────────────────────────────

export type C2CTradeType   = 'BUY' | 'SELL';
export type C2COrderStatus =
  | 'PENDING' | 'TRADING' | 'BUYER_PAYED' | 'DISTRIBUTING'
  | 'COMPLETED' | 'IN_APPEAL' | 'CANCELLED' | 'CANCELLED_BY_SYSTEM';

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
  /** Milliseconds; may be present on live API responses. */
  notifyPayEndTime?: number;
  /** Milliseconds; release / auto-confirm window. */
  notifyReleaseEndTime?: number;
  /** Payment method id for mark-as-paid on some BUY orders. */
  payId?: number | string;
}

export interface C2COrderHistoryResponse {
  code: string;
  message: string | null;
  data: C2COrder[];
  total: number;
  success: boolean;
}

export async function fetchC2COrderHistory(
  tradeType: C2CTradeType,
  page = 1,
  rows = 100,
  startTimestamp?: number,
  endTimestamp?: number,
): Promise<C2COrderHistoryResponse> {
  const params: Record<string, string | number> = { tradeType, page, rows };
  if (startTimestamp) params.startTimestamp = startTimestamp;
  if (endTimestamp)   params.endTimestamp   = endTimestamp;
  return proxyGet<C2COrderHistoryResponse>(
    '/sapi/v1/c2c/orderMatch/listUserOrderHistory',
    params,
  );
}

export async function fetchAllC2COrders(page = 1, rows = 100): Promise<C2COrder[]> {
  const [buys, sells] = await Promise.all([
    fetchC2COrderHistory('BUY',  page, rows),
    fetchC2COrderHistory('SELL', page, rows),
  ]);
  return [...(buys.data ?? []), ...(sells.data ?? [])].sort(
    (a, b) => b.createTime - a.createTime,
  );
}

// ── Derived Ads (no official Binance API for listing own ads) ────────────────

/**
 * Binance does NOT expose an official REST endpoint to list a user's own
 * P2P advertisements. The internal /bapi/c2c/v2/private/c2c/ad/list endpoint
 * requires browser session cookies (not API keys) and is not part of the
 * official public API.
 *
 * As a workaround we derive ads from the user's recent order history,
 * grouping by advNo. Each distinct advNo becomes an "Ad" row with stats
 * computed from the orders that used it.
 */
export interface DerivedAd {
  advNo: string;
  side: C2CTradeType;
  asset: string;
  fiat: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalVolume: number;
  totalFiat: number;
  orderCount: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
  paymentMethods: string[];
  firstSeen: number;
  lastSeen: number;
}

export async function fetchDerivedAds(rows = 100): Promise<DerivedAd[]> {
  const orders = await fetchAllC2COrders(1, rows);

  const byAd: Record<string, C2COrder[]> = {};
  for (const o of orders) {
    if (!o.advNo) continue;
    (byAd[o.advNo] ??= []).push(o);
  }

  return Object.entries(byAd).map(([advNo, list]) => {
    const prices    = list.map(o => parseFloat(o.unitPrice));
    const volume    = list.reduce((s, o) => s + parseFloat(o.amount), 0);
    const fiat      = list.reduce((s, o) => s + parseFloat(o.totalPrice), 0);
    const completed = list.filter(o => o.orderStatus === 'COMPLETED').length;
    const cancelled = list.filter(o => o.orderStatus.startsWith('CANCELLED')).length;
    const times     = list.map(o => o.createTime);
    const payments  = Array.from(new Set(list.map(o => o.payMethodName).filter(Boolean) as string[]));
    return {
      advNo,
      side:           list[0].tradeType,
      asset:          list[0].asset,
      fiat:           list[0].fiat,
      avgPrice:       prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice:       Math.min(...prices),
      maxPrice:       Math.max(...prices),
      totalVolume:    volume,
      totalFiat:      fiat,
      orderCount:     list.length,
      completedCount: completed,
      cancelledCount: cancelled,
      completionRate: list.length ? completed / list.length : 0,
      paymentMethods: payments,
      firstSeen:      Math.min(...times),
      lastSeen:       Math.max(...times),
    };
  }).sort((a, b) => b.lastSeen - a.lastSeen);
}
