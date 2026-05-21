import type { BinanceAdRow } from '@/types/binanceAds';

export type AdStatusKind = 'online' | 'offline' | 'closed' | 'derived' | 'unknown';

export interface AdStatusDisplay {
  kind: AdStatusKind;
  label: string;
  /** French short label for cards */
  shortLabel: string;
}

export function adStatusKind(row: BinanceAdRow): AdStatusKind {
  if (row.statusLabel === 'Derived' || row.priceType === 'DERIVED') {
    return 'derived';
  }
  if (row.status === 1 || row.statusLabel === 'Online') {
    return 'online';
  }
  if (row.status === 2 || row.statusLabel === 'Offline') {
    return 'offline';
  }
  if (row.status === 4 || row.statusLabel === 'Closed') {
    return 'closed';
  }
  return 'unknown';
}

export function adStatusDisplay(row: BinanceAdRow): AdStatusDisplay {
  const kind = adStatusKind(row);
  switch (kind) {
    case 'online':
      return { kind, label: 'En ligne', shortLabel: 'En ligne' };
    case 'offline':
      return { kind, label: 'Hors ligne', shortLabel: 'Hors ligne' };
    case 'closed':
      return { kind, label: 'Fermée', shortLabel: 'Fermée' };
    case 'derived':
      return { kind, label: 'Historique (dérivé)', shortLabel: 'Historique' };
    default:
      return { kind, label: row.statusLabel || 'Inconnu', shortLabel: row.statusLabel || '—' };
  }
}

export function statusBadgeClass(row: BinanceAdRow): string {
  return `status-pill--${adStatusKind(row)}`;
}

export function formatAdPrice(v: string | number | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function pairLabel(row: BinanceAdRow): string {
  const a = row.asset || '—';
  const f = row.fiat || '—';
  return `${a} · ${f}`;
}

export function sideLabel(t: string): string {
  return t === 'SELL' ? 'VENTE' : t === 'BUY' ? 'ACHAT' : t || '—';
}

export function sideClass(t: string): string {
  if (t === 'SELL') return 'sell';
  if (t === 'BUY') return 'buy';
  return 'neu';
}

export function limitLine(row: BinanceAdRow): string {
  const min = row.minSingleTransAmount?.trim();
  const max = row.maxSingleTransAmount?.trim();
  if (min && max) return `${formatAdPrice(min)} – ${formatAdPrice(max)} ${row.fiat}`;
  if (max) return `max ${formatAdPrice(max)} ${row.fiat}`;
  if (min) return `min ${formatAdPrice(min)} ${row.fiat}`;
  return '';
}

export function pct(rate: number | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)} %`;
}

export function formatSeen(ts: number | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
