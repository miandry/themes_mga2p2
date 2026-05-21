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

export interface BinanceMarketPriceRow {
  advNo: string;
  price: string;
  priceNum: number;
  asset?: string;
  fiat?: string;
  surplusAmount?: string;
  minSingleTransAmount?: string;
  maxSingleTransAmount?: string;
  merchant: string;
  tradeType?: string;
}

export interface BinanceMarketPricesResponse {
  data: BinanceMarketPriceRow[];
  highest: BinanceMarketPriceRow[];
  lowest: BinanceMarketPriceRow[];
  total: number;
  searchTradeType: string;
  adTradeType?: string;
  source: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  avgPrice?: number | null;
  error?: string;
}

export interface BinanceAdsResponse {
  data: BinanceAdRow[];
  total: number;
  source: BinanceAdsSource;
  page: number;
  rows: number;
  error?: string;
}
