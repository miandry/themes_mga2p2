import type { BinanceOrderRow, C2COrderStatus } from '@/lib/binance';

/** Hide banned terms in UI (API may still return them). */
export function sanitizeDisplayText(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/binance/gi, '')
    .replace(/crypto/gi, '')
    .replace(/usdt/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function displayAsset(asset: string): string {
  return sanitizeDisplayText(asset);
}

export function pairLabel(row: BinanceOrderRow): string {
  const asset = displayAsset(row.asset);
  const fiat = sanitizeDisplayText(row.fiat) || row.fiat;
  if (asset && fiat) return `${asset} · ${fiat}`;
  return fiat || asset || '—';
}

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function formatAmountLine(row: BinanceOrderRow): string {
  const num = formatNum(row.amount);
  const asset = displayAsset(row.asset);
  return asset ? `${num} ${asset}` : num;
}

/** Alias for list cards. */
export function badgeClass(status: C2COrderStatus | string): string {
  return statusBadgeClass(status);
}

export function statusBadgeClass(status: C2COrderStatus | string): string {
  if (status === 'COMPLETED') return 'badge-completed';
  if (String(status).startsWith('CANCELLED')) return 'badge-cancelled';
  if (status === 'IN_APPEAL') return 'badge-appeal';
  return 'badge-pending';
}

export function formatCreated(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('fr-FR');
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function displayFiat(fiat: string): string {
  return sanitizeDisplayText(fiat) || fiat || '—';
}

export function remainingTimeLabel(row: BinanceOrderRow, nowMs = Date.now()): string {
  const deadlines = [row.notifyPayEndTime, row.notifyReleaseEndTime].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
  if (!deadlines.length) return '';
  const target = Math.max(...deadlines);
  const diff = target - nowMs;
  if (diff <= 0) return 'Temps écoulé';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `Reste ${h}h ${String(m).padStart(2, '0')}m`;
  return `Reste ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Integer part of a fiat total (no decimals), for matching order_mga montant. */
export function totalPriceInteger(totalPrice: number): number {
  if (!Number.isFinite(totalPrice)) return 0;
  return Math.floor(totalPrice + 1e-9);
}

const ACTIVE_C2C: C2COrderStatus[] = [
  'PENDING',
  'TRADING',
  'BUYER_PAYED',
  'DISTRIBUTING',
  'IN_APPEAL',
];

/** True when the external order is still open (not completed / cancelled). */
export function isOpenC2cOrder(status: C2COrderStatus): boolean {
  return ACTIVE_C2C.includes(status);
}
