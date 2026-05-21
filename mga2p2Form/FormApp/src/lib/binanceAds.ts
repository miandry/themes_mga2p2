import { apiUrl } from '@/lib/apiUrl';
import type { BinanceAdsResponse, BinanceMarketPricesResponse } from '@/types/binanceAds';

export async function fetchBinanceAds(params: {
  page?: number;
  rows?: number;
  asset?: string;
  fiat?: string;
}): Promise<BinanceAdsResponse> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.rows != null) qs.set('rows', String(params.rows));
  if (params.asset?.trim()) qs.set('asset', params.asset.trim());
  if (params.fiat?.trim()) qs.set('fiat', params.fiat.trim());

  const res = await fetch(apiUrl(`mga2p2-form/api/binance/ads?${qs.toString()}`), {
    credentials: 'same-origin',
  });

  let body: BinanceAdsResponse & { error?: string } = {
    data: [],
    total: 0,
    source: 'none',
    page: params.page ?? 1,
    rows: params.rows ?? 50,
  };

  try {
    body = (await res.json()) as typeof body;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return {
    data: Array.isArray(body.data) ? body.data : [],
    total: typeof body.total === 'number' ? body.total : 0,
    source: body.source ?? 'none',
    page: typeof body.page === 'number' ? body.page : 1,
    rows: typeof body.rows === 'number' ? body.rows : 50,
    error: body.error,
  };
}

export async function fetchBinanceAdByAdvNo(
  advNo: string,
  params?: { asset?: string; fiat?: string },
): Promise<{
  ad: import('@/types/binanceAds').BinanceAdRow | null;
  source: import('@/types/binanceAds').BinanceAdsSource;
  error?: string;
}> {
  const qs = new URLSearchParams();
  qs.set('adv_no', advNo.trim());
  qs.set('page', '1');
  qs.set('rows', '1');
  if (params?.asset?.trim()) qs.set('asset', params.asset.trim());
  if (params?.fiat?.trim()) qs.set('fiat', params.fiat.trim());

  const res = await fetch(apiUrl(`mga2p2-form/api/binance/ads?${qs.toString()}`), {
    credentials: 'same-origin',
  });
  let body: BinanceAdsResponse & { error?: string } = {
    data: [],
    total: 0,
    source: 'none',
    page: 1,
    rows: 1,
  };
  try {
    body = (await res.json()) as typeof body;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const ad = Array.isArray(body.data) && body.data[0] ? body.data[0] : null;
  return {
    ad,
    source: body.source ?? 'none',
    error: body.error ?? (ad ? undefined : 'Annonce introuvable'),
  };
}

export interface UpdateBinanceAdPriceResponse {
  ok: boolean;
  message?: string;
  error?: string;
  ad?: import('@/types/binanceAds').BinanceAdRow;
}

export async function fetchBinanceAdMarketPrices(params: {
  asset: string;
  fiat: string;
  tradeType: string;
  advNo?: string;
  pages?: number;
}): Promise<BinanceMarketPricesResponse> {
  const qs = new URLSearchParams();
  qs.set('asset', params.asset.trim());
  qs.set('fiat', params.fiat.trim());
  qs.set('tradeType', params.tradeType.trim());
  if (params.advNo?.trim()) qs.set('adv_no', params.advNo.trim());
  if (params.pages != null) qs.set('pages', String(params.pages));

  const res = await fetch(apiUrl(`mga2p2-form/api/binance/ads/market-prices?${qs.toString()}`), {
    credentials: 'same-origin',
  });

  let body: BinanceMarketPricesResponse = {
    data: [],
    highest: [],
    lowest: [],
    total: 0,
    searchTradeType: '',
    source: 'none',
  };

  try {
    body = (await res.json()) as BinanceMarketPricesResponse;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }

  if (!res.ok && body.error) {
    throw new Error(body.error);
  }

  return body;
}

export async function updateBinanceAdPrice(params: {
  advNo: string;
  price: string;
  asset?: string;
  fiat?: string;
}): Promise<UpdateBinanceAdPriceResponse> {
  const res = await fetch(apiUrl('mga2p2-form/api/binance/ads/price'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advNo: params.advNo.trim(),
      price: String(params.price).trim(),
      asset: params.asset?.trim() || undefined,
      fiat: params.fiat?.trim() || undefined,
    }),
  });

  let body: UpdateBinanceAdPriceResponse = { ok: false };
  try {
    body = (await res.json()) as UpdateBinanceAdPriceResponse;
  }
  catch {
    throw new Error(res.ok ? 'Réponse invalide' : `HTTP ${res.status}`);
  }

  if (!res.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return body;
}
