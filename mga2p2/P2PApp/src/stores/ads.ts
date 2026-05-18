import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/services/api';
import { useAuthStore } from './auth';
import { fetchDerivedAds, binanceConfigured, type DerivedAd } from '@/services/binance';

export type AdSide   = 'BUY' | 'SELL';
export type AdStatus = 'ONLINE' | 'OFFLINE' | 'PAUSED';

export interface P2PAd {
  id: string;
  side: AdSide;
  asset: string;
  fiat: string;
  price: number;
  priceType: 'FIXED' | 'FLOATING';
  floatingRatio?: number;
  minAmount: number;
  maxAmount: number;
  totalAmount: number;
  availableAmount: number;
  paymentMethods: string[];
  status: AdStatus;
  orderCount: number;
  completionRate: number;
  remarks?: string;
  autoReply?: string;
  createdAt: string;
  updatedAt: string;
}

export const useAdStore = defineStore('ads', () => {
  const ads     = ref<P2PAd[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function fetchAds() {
    loading.value = true;
    error.value   = null;
    try {
      if (binanceConfigured()) {
        const derived = await fetchDerivedAds();
        if (derived.length) {
          ads.value = derived.map(mapDerivedAd);
          return;
        }
      }
      const auth = useAuthStore();
      const data = await apiFetch<{ data: P2PAd[] }>(
        '/api_solutions/p2p/ads', {}, auth.token,
      );
      ads.value = data.data ?? [];
    } catch (e: any) {
      error.value = e.message;
      ads.value   = DEMO_ADS;
    } finally {
      loading.value = false;
    }
  }

  async function updateAd(id: string, payload: Partial<P2PAd>) {
    const auth = useAuthStore();
    loading.value = true;
    error.value   = null;
    try {
      await apiFetch(
        `/api_solutions/p2p/ads/${id}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        auth.token,
      );
      const idx = ads.value.findIndex(a => a.id === id);
      if (idx !== -1) ads.value[idx] = { ...ads.value[idx], ...payload };
      return true;
    } catch (e: any) {
      error.value = e.message;
      const idx = ads.value.findIndex(a => a.id === id);
      if (idx !== -1) ads.value[idx] = { ...ads.value[idx], ...payload };
      return true;
    } finally {
      loading.value = false;
    }
  }

  async function toggleAdStatus(id: string) {
    const ad = ads.value.find(a => a.id === id);
    if (!ad) return;
    const next: AdStatus = ad.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    await updateAd(id, { status: next });
  }

  function getAd(id: string) {
    return ads.value.find(a => a.id === id) ?? null;
  }

  return { ads, loading, error, fetchAds, updateAd, toggleAdStatus, getAd };
});

// ── Map derived ad (from order history) → P2PAd ──────────────────────────────

function mapDerivedAd(a: DerivedAd): P2PAd {
  return {
    id:              a.advNo,
    side:            a.side,
    asset:           a.asset,
    fiat:            a.fiat,
    price:           Math.round(a.avgPrice * 100) / 100,
    priceType:       'FIXED',
    minAmount:       Math.round(a.minPrice),
    maxAmount:       Math.round(a.maxPrice),
    totalAmount:     Math.round(a.totalVolume * 100) / 100,
    availableAmount: 0,
    paymentMethods:  a.paymentMethods.length ? a.paymentMethods : ['—'],
    status:          'ONLINE',
    orderCount:      a.orderCount,
    completionRate:  Math.round(a.completionRate * 1000) / 10,
    remarks:         `${a.completedCount} completed · ${a.cancelledCount} cancelled`,
    createdAt:       new Date(a.firstSeen).toISOString(),
    updatedAt:       new Date(a.lastSeen).toISOString(),
  };
}

// ── Demo fallback ─────────────────────────────────────────────────────────────

const DEMO_ADS: P2PAd[] = [
  {
    id: 'ad_1',
    side: 'SELL',
    asset: 'USDT',
    fiat: 'MGA',
    price: 4600,
    priceType: 'FIXED',
    minAmount: 10000,
    maxAmount: 1000000,
    totalAmount: 5000,
    availableAmount: 4900,
    paymentMethods: ['Mobile Money', 'Bank Transfer'],
    status: 'ONLINE',
    orderCount: 142,
    completionRate: 98.5,
    remarks: 'Fast release. Please send the exact amount.',
    autoReply: 'Hello! Please proceed with payment and notify me via chat.',
    createdAt: new Date(Date.now() - 2592000000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ad_2',
    side: 'BUY',
    asset: 'USDT',
    fiat: 'MGA',
    price: 4560,
    priceType: 'FLOATING',
    floatingRatio: 1.02,
    minAmount: 50000,
    maxAmount: 500000,
    totalAmount: 2000,
    availableAmount: 1500,
    paymentMethods: ['Mobile Money'],
    status: 'ONLINE',
    orderCount: 89,
    completionRate: 97.2,
    remarks: 'I buy USDT quickly. Available 8am–10pm.',
    createdAt: new Date(Date.now() - 5184000000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];
