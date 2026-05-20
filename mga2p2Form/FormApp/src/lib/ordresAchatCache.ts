import type { BinanceOrderRow } from '@/lib/binance';

const STORAGE_KEY = 'mga2p2_ordres_achat_v1';

function readMap(): Record<string, BinanceOrderRow> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BinanceOrderRow>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  catch {
    return {};
  }
}

export function cacheOrdresAchat(rows: BinanceOrderRow[]): void {
  const map = readMap();
  for (const row of rows) {
    if (row.orderNumber) {
      map[row.orderNumber] = row;
    }
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
  catch {
    /* quota / private mode */
  }
}

export function getOrdreAchat(orderNumber: string): BinanceOrderRow | null {
  if (!orderNumber) return null;
  return readMap()[orderNumber] ?? null;
}
