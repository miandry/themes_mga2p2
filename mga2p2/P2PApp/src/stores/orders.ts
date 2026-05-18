import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/services/api';
import { useAuthStore } from './auth';
import {
  fetchAllC2COrders,
  binanceConfigured,
  markC2COrderAsPaid,
  type C2COrder,
  type C2COrderStatus,
} from '@/services/binance';

export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'APPEALING';

export interface P2POrder {
  id: string;
  orderNo: string;
  side: OrderSide;
  asset: string;          // e.g. USDT
  fiat: string;           // e.g. MGA
  amount: number;         // crypto amount
  fiatAmount: number;
  price: number;          // fiat per crypto
  status: OrderStatus;
  counterparty: string;
  counterpartyAvatar?: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  chatId?: string;
  adId?: string;
  canRelease?: boolean;
  canAppeal?: boolean;
  /** Seller must release crypto by this time (ISO). */
  releaseDeadline?: string;
  /** Pay / finish fiat transfer by this time (ISO). */
  paymentDeadline?: string;
  /** Binance C2C pay method id (for mark-as-paid when required). */
  payId?: number;
}

/** Default pay window when API does not send an end time (Binance-style ~15 min). */
const PAY_WINDOW_FALLBACK_MS = 15 * 60 * 1000;

/**
 * Next meaningful deadline for an in-flight order (payment or release), or null.
 */
export function getOrderCountdownContext(
  o: P2POrder,
): { deadline: string; kind: 'payment' | 'release' } | null {
  if (o.status === 'COMPLETED' || o.status === 'CANCELLED') return null;

  if (o.canRelease && o.releaseDeadline) {
    return { deadline: o.releaseDeadline, kind: 'release' };
  }
  if (o.status === 'PAID' && o.releaseDeadline) {
    return { deadline: o.releaseDeadline, kind: 'release' };
  }
  if (o.status === 'PENDING' || o.status === 'PROCESSING') {
    const deadline =
      o.paymentDeadline ??
      new Date(new Date(o.createdAt).getTime() + PAY_WINDOW_FALLBACK_MS).toISOString();
    return { deadline, kind: 'payment' };
  }
  return null;
}

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<P2POrder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /** True when the list was last filled from Binance C2C (not Drupal stub / demo). */
  const ordersLoadedFromBinance = ref(false);

  const activeOrders = computed(() =>
    orders.value.filter(o => ['PENDING', 'PROCESSING', 'PAID'].includes(o.status))
  );

  const completedOrders = computed(() =>
    orders.value.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status))
  );

  async function fetchOrders(opts?: { silent?: boolean }) {
    const silent = opts?.silent === true;
    const auth = useAuthStore();
    if (!silent) {
      loading.value = true;
    }
    error.value = null;
    try {
      // Use real Binance C2C API when keys are configured
      if (binanceConfigured()) {
        try {
          const c2cOrders = await fetchAllC2COrders();
          orders.value = c2cOrders.map(mapC2COrder);
          ordersLoadedFromBinance.value = true;
          return;
        }
        catch (e: any) {
          if (!silent) {
            error.value = e.message;
          }
          ordersLoadedFromBinance.value = false;
          if (!silent) {
            orders.value = DEMO_ORDERS;
          }
          return;
        }
      }
      ordersLoadedFromBinance.value = false;
      // Fall back to local backend
      const data = await apiFetch<{ data: P2POrder[] }>(
        '/api_solutions/p2p/orders',
        {},
        auth.token,
      );
      orders.value = data.data ?? [];
    } catch (e: any) {
      if (!silent) {
        error.value = e.message;
      }
      ordersLoadedFromBinance.value = false;
      if (!silent) {
        orders.value = DEMO_ORDERS;
      }
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  /** Map a raw Binance C2C order to the app's P2POrder shape. */
  function mapC2COrder(o: C2COrder): P2POrder {
    const statusMap: Record<C2COrderStatus, OrderStatus> = {
      PENDING:              'PENDING',
      TRADING:              'PROCESSING',
      BUYER_PAYED:          'PAID',
      DISTRIBUTING:         'PROCESSING',
      COMPLETED:            'COMPLETED',
      IN_APPEAL:            'APPEALING',
      CANCELLED:            'CANCELLED',
      CANCELLED_BY_SYSTEM:  'CANCELLED',
    };
    const createdAt = new Date(o.createTime).toISOString();
    const paymentDeadline =
      typeof o.notifyPayEndTime === 'number' && o.notifyPayEndTime > 0
        ? new Date(o.notifyPayEndTime).toISOString()
        : undefined;
    const releaseDeadline =
      typeof o.notifyReleaseEndTime === 'number' && o.notifyReleaseEndTime > 0
        ? new Date(o.notifyReleaseEndTime).toISOString()
        : undefined;
    const rawPayId = o.payId;
    const payId =
      typeof rawPayId === 'number' && Number.isFinite(rawPayId)
        ? rawPayId
        : typeof rawPayId === 'string' && rawPayId !== '' && Number.isFinite(Number(rawPayId))
          ? Number(rawPayId)
          : undefined;
    return {
      id:             o.orderNumber,
      orderNo:        o.orderNumber,
      side:           o.tradeType,
      asset:          o.asset,
      fiat:           o.fiat,
      amount:         parseFloat(o.amount),
      fiatAmount:     parseFloat(o.totalPrice),
      price:          parseFloat(o.unitPrice),
      status:         statusMap[o.orderStatus] ?? 'PENDING',
      counterparty:   o.counterPartNickName,
      paymentMethod:  o.payMethodName?.trim() || '—',
      createdAt,
      updatedAt:      createdAt,
      paymentDeadline,
      releaseDeadline,
      canRelease:     o.orderStatus === 'BUYER_PAYED',
      payId,
    };
  }

  /**
   * Buyer-side: fiat marked sent. Calls Binance C2C markOrderAsPaid when the list
   * is from Binance; otherwise uses the Drupal api_solutions stub (demo / local).
   */
  async function markOrderTransferred(orderId: string) {
    const auth = useAuthStore();
    error.value = null;
    try {
      if (ordersLoadedFromBinance.value) {
        const o = orders.value.find(x => x.id === orderId);
        await markC2COrderAsPaid(orderId, o?.payId);
      }
      else {
        await apiFetch(
          `/api_solutions/p2p/orders/${orderId}/transferred`,
          { method: 'POST' },
          auth.token,
        );
        const o = orders.value.find(x => x.id === orderId);
        if (o && o.side === 'BUY' && ['PENDING', 'PROCESSING'].includes(o.status)) {
          o.status = 'PAID';
          o.updatedAt = new Date().toISOString();
          o.canRelease = false;
        }
      }
      await fetchOrders({ silent: true });
      return true;
    } catch (e: any) {
      error.value = e.message;
      return false;
    }
  }

  async function releaseOrder(orderId: string) {
    const auth = useAuthStore();
    loading.value = true;
    error.value = null;
    try {
      await apiFetch(
        `/api_solutions/p2p/orders/${orderId}/release`,
        { method: 'POST' },
        auth.token,
      );
      const o = orders.value.find(x => x.id === orderId);
      if (o) {
        o.status = 'COMPLETED';
        o.canRelease = false;
      }
      return true;
    } catch (e: any) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  function getOrder(id: string) {
    return orders.value.find(o => o.id === id) ?? null;
  }

  return {
    orders,
    loading,
    error,
    activeOrders,
    completedOrders,
    fetchOrders,
    markOrderTransferred,
    releaseOrder,
    getOrder,
  };
});

const DEMO_ORDERS: P2POrder[] = [
  {
    id: '1',
    orderNo: '202405071234',
    side: 'SELL',
    asset: 'USDT',
    fiat: 'MGA',
    amount: 100,
    fiatAmount: 460000,
    price: 4600,
    status: 'PAID',
    counterparty: 'Haja_buy',
    paymentMethod: 'Mobile Money',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    chatId: 'chat_1',
    adId: 'ad_1',
    canRelease: true,
    releaseDeadline: new Date(Date.now() + 900000).toISOString(),
  },
  {
    id: '2',
    orderNo: '202405071235',
    side: 'BUY',
    asset: 'USDT',
    fiat: 'MGA',
    amount: 50,
    fiatAmount: 228000,
    price: 4560,
    status: 'PROCESSING',
    counterparty: 'Tojo_seller',
    paymentMethod: 'Bank Transfer',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    paymentDeadline: new Date(Date.now() + 11 * 60 * 1000).toISOString(),
    chatId: 'chat_2',
    adId: 'ad_2',
    canRelease: false,
  },
  {
    id: '3',
    orderNo: '202405061100',
    side: 'SELL',
    asset: 'USDT',
    fiat: 'MGA',
    amount: 200,
    fiatAmount: 924000,
    price: 4620,
    status: 'COMPLETED',
    counterparty: 'Ravo_trade',
    paymentMethod: 'Mobile Money',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 82800000).toISOString(),
    canRelease: false,
  },
];
