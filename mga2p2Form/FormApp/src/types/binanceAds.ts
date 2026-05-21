/** Row from GET /mga2p2-form/api/binance/ads */
export interface BinanceAdRow {
  advNo: string;
  tradeType: string;
  asset: string;
  fiat: string;
  fiatSymbol?: string;
  price: string;
  priceType?: string;
  surplusAmount?: string;
  initAmount?: string;
  minSingleTransAmount?: string;
  maxSingleTransAmount?: string;
  status: number;
  statusLabel: string;
  remarks?: string;
  autoReplyMsg?: string;
  payTimeLimit?: number | null;
  paymentMethods?: string[];
  orderCount?: number;
  completedCount?: number;
  cancelledCount?: number;
  completionRate?: number;
  totalVolume?: number;
  totalFiat?: number;
  firstSeen?: number;
  lastSeen?: number;
}

export type BinanceAdsSource = 'agent' | 'derived' | 'none';

export interface BinanceAdsResponse {
  data: BinanceAdRow[];
  total: number;
  source: BinanceAdsSource;
  page: number;
  rows: number;
  error?: string;
}
