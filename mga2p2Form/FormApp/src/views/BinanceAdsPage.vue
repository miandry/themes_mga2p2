<template>
  <div class="ads-page">
    <header class="ads-head">
      <div class="ads-head__bar">
        <div class="ads-head__titles">
          <h1 class="ads-head__h1">Annonces</h1>
          <p class="ads-head__sub">
            Mes annonces marchand
            <span v-if="source"> · {{ sourceLabel }}</span>
          </p>
        </div>
        <div class="ads-head__links">
          <button type="button" class="icon-btn" :disabled="loading" title="Rafraîchir" @click="reload">
            ↻
          </button>
        </div>
      </div>

      <div class="ads-tools">
        <label class="field-inline">
          <span class="field-inline__lbl">Actif</span>
          <input v-model="filterAsset" type="text" class="field-inline__inp" placeholder="USDT" autocomplete="off" />
        </label>
        <label class="field-inline">
          <span class="field-inline__lbl">Fiat</span>
          <input v-model="filterFiat" type="text" class="field-inline__inp" placeholder="MGA" autocomplete="off" />
        </label>
        <button type="button" class="btn-filter" :disabled="loading" @click="reload">Appliquer</button>
      </div>

      <div class="ads-segment" role="tablist" aria-label="Filtre type">
        <button
          v-for="opt in sideFilterOptions"
          :key="opt.value"
          type="button"
          role="tab"
          class="seg-btn seg-btn--sm"
          :class="{ 'seg-btn--on': sideFilter === opt.value }"
          @click="sideFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <p v-if="metaLabel" class="hint">{{ metaLabel }}</p>
      <p v-if="error" class="err">{{ error }}</p>
      <p v-if="apiError" class="err-warn">{{ apiError }}</p>
    </header>

    <main class="ads-body">
      <div v-if="loading && !rows.length" class="center-spinner">
        <span class="spinner" aria-hidden="true" />
      </div>

      <div v-else-if="!displayed.length" class="empty-state">
        <span class="empty-ico" aria-hidden="true">◇</span>
        <p>{{ emptyMessage }}</p>
      </div>

      <div v-else class="list-wrap">
        <article
          v-for="row in displayed"
          :key="row.advNo"
          class="bcard bcard--click"
          role="button"
          tabindex="0"
          @click="goDetail(row)"
          @keydown.enter.prevent="goDetail(row)"
        >
          <div class="bcard__header">
            <span class="bcard__side" :class="sideClass(row.tradeType)">{{ sideLabel(row.tradeType) }}</span>
            <span class="bcard__asset">{{ pairLabel(row) }}</span>
            <span class="status-pill" :class="statusBadgeClass(row)">
              <span class="status-pill__dot" aria-hidden="true" />
              {{ adStatusDisplay(row).shortLabel }}
            </span>
          </div>

          <div class="bcard__body">
            <div class="bcard__row bcard__row--status">
              <span class="label">Statut</span>
              <span class="status-pill status-pill--inline" :class="statusBadgeClass(row)">
                <span class="status-pill__dot" aria-hidden="true" />
                {{ adStatusDisplay(row).label }}
              </span>
            </div>
            <div class="bcard__row">
              <span class="label">Prix</span>
              <span class="value highlight">{{ formatAdPrice(row.price) }} {{ row.fiat }}</span>
            </div>
            <div v-if="row.surplusAmount" class="bcard__row">
              <span class="label">Restant</span>
              <span class="value">{{ formatAdPrice(row.surplusAmount) }} {{ row.asset }}</span>
            </div>
            <div v-if="row.initAmount && source === 'derived'" class="bcard__row">
              <span class="label">Volume (dérivé)</span>
              <span class="value">{{ formatAdPrice(row.initAmount) }}</span>
            </div>
            <div v-if="limitLine(row)" class="bcard__row">
              <span class="label">Limites</span>
              <span class="value">{{ limitLine(row) }}</span>
            </div>
            <div v-if="row.paymentMethods?.length" class="bcard__row">
              <span class="label">Paiement</span>
              <span class="value">{{ row.paymentMethods.join(', ') }}</span>
            </div>
            <div v-if="row.remarks" class="bcard__row bcard__row--block">
              <span class="label">Conditions</span>
              <span class="value value--muted">{{ row.remarks }}</span>
            </div>
            <div v-if="source === 'derived' && row.orderCount" class="bcard__row">
              <span class="label">Ordres liés</span>
              <span class="value">{{ row.orderCount }} ({{ pct(row.completionRate) }} complétés)</span>
            </div>
          </div>
        </article>
      </div>

      <div v-if="hasMore && !loading" class="load-more-wrap">
        <button type="button" class="btn-more" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Chargement…' : 'Voir plus' }}
        </button>
      </div>
      <div v-if="loading && rows.length" class="loading-more">
        <span class="spinner spinner--sm" aria-hidden="true" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchBinanceAds } from '@/lib/binanceAds';
import type { BinanceAdRow, BinanceAdsSource } from '@/types/binanceAds';
import {
  adStatusDisplay,
  statusBadgeClass,
  formatAdPrice,
  pairLabel,
  sideLabel,
  sideClass,
  limitLine,
  pct,
} from '@/lib/binanceAdsDisplay';

const router = useRouter();

const PAGE_SIZE = 50;

const sideFilterOptions = [
  { value: 'ALL', label: 'Tous' },
  { value: 'BUY', label: 'Achat' },
  { value: 'SELL', label: 'Vente' },
] as const;

type SideFilter = (typeof sideFilterOptions)[number]['value'];

const filterAsset = ref('USDT');
const filterFiat = ref('MGA');
const sideFilter = ref<SideFilter>('ALL');
const page = ref(1);
const total = ref(0);
const source = ref<BinanceAdsSource>('none');
const rows = ref<BinanceAdRow[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref('');
const apiError = ref('');

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const displayed = computed(() => {
  if (sideFilter.value === 'ALL') return rows.value;
  return rows.value.filter(r => r.tradeType === sideFilter.value);
});

const hasMore = computed(() => rows.value.length < total.value);

const sourceLabel = computed(() => {
  if (source.value === 'agent') return 'API marchand';
  if (source.value === 'derived') return 'Dérivé historique ordres';
  return '';
});

const metaLabel = computed(() => {
  if (loading.value && !rows.value.length) return '';
  const n = displayed.value.length;
  const parts = [`${n} annonce(s)`];
  if (sideFilter.value !== 'ALL') {
    parts.push(sideFilterOptions.find(o => o.value === sideFilter.value)?.label.toLowerCase() ?? '');
  }
  if (filterAsset.value.trim()) parts.push(filterAsset.value.trim());
  if (filterFiat.value.trim()) parts.push(filterFiat.value.trim());
  return parts.join(' · ');
});

const emptyMessage = computed(() => {
  if (error.value) return 'Impossible de charger les annonces.';
  return 'Aucune annonce pour ce filtre.';
});

function goDetail(row: BinanceAdRow) {
  router.push({
    name: 'annonces-detail',
    params: { advNo: row.advNo },
    query: {
      asset: filterAsset.value.trim() || row.asset,
      fiat: filterFiat.value.trim() || row.fiat,
    },
  });
}

async function load(reset = true) {
  if (reset) {
    loading.value = true;
    page.value = 1;
    rows.value = [];
  }
  else {
    loadingMore.value = true;
  }
  error.value = '';
  if (reset) apiError.value = '';

  try {
    const res = await fetchBinanceAds({
      page: page.value,
      rows: PAGE_SIZE,
      asset: filterAsset.value,
      fiat: filterFiat.value,
    });
    source.value = res.source;
    total.value = res.total;
    if (reset) {
      rows.value = res.data;
    }
    else {
      const seen = new Set(rows.value.map(r => r.advNo));
      for (const row of res.data) {
        if (!seen.has(row.advNo)) {
          seen.add(row.advNo);
          rows.value.push(row);
        }
      }
    }
    if (res.error) {
      apiError.value = res.error;
    }
  }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Échec chargement';
    if (reset) {
      error.value = msg;
      rows.value = [];
    }
    else {
      apiError.value = msg;
    }
  }
  finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function reload() {
  void load(true);
}

function loadMore() {
  if (!hasMore.value || loadingMore.value) return;
  page.value += 1;
  void load(false);
}

watch([filterAsset, filterFiat], () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => reload(), 400);
});

onMounted(() => {
  void load(true);
});
</script>

<style scoped>
.ads-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 0 48px;
}
.ads-head {
  padding: 0 16px 12px;
}
.ads-head__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.ads-head__h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #f0b90b;
}
.ads-head__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #848e9c;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #2b3139;
  background: #1e2329;
  color: #eaecef;
  font-size: 20px;
  cursor: pointer;
}
.icon-btn:disabled {
  opacity: 0.45;
}
.ads-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 12px;
}
.field-inline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 100px;
}
.field-inline__lbl {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #848e9c;
}
.field-inline__inp {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 14px;
}
.btn-filter {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(240, 185, 11, 0.45);
  background: rgba(240, 185, 11, 0.1);
  color: #f0b90b;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.btn-filter:disabled {
  opacity: 0.5;
}
.ads-segment {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.seg-btn {
  flex: 1;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #848e9c;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}
.seg-btn--on {
  border-color: #f0b90b;
  color: #f0b90b;
  background: rgba(240, 185, 11, 0.08);
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #5e6673;
}
.err {
  margin: 8px 0 0;
  color: #f6465d;
  font-size: 14px;
}
.err-warn {
  margin: 6px 0 0;
  color: #f0b90b;
  font-size: 12px;
}
.ads-body {
  padding: 0 0 24px;
}
.center-spinner {
  display: flex;
  justify-content: center;
  padding: 48px;
}
.loading-more {
  display: flex;
  justify-content: center;
  padding: 16px;
}
.spinner {
  display: block;
  width: 28px;
  height: 28px;
  border: 3px solid #2b3139;
  border-top-color: #f0b90b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.spinner--sm {
  width: 22px;
  height: 22px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px;
  color: #848e9c;
  gap: 12px;
}
.empty-ico {
  font-size: 40px;
  opacity: 0.5;
}
.list-wrap {
  padding: 12px 16px 0;
}
.bcard {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.bcard--click {
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.bcard--click:hover {
  border-color: rgba(240, 185, 11, 0.45);
  background: #252a31;
}
.bcard--click:focus-visible {
  outline: 2px solid #f0b90b;
  outline-offset: 2px;
}
.bcard__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.bcard__side {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
}
.bcard__side.buy {
  background: rgba(14, 203, 129, 0.15);
  color: #0ecb81;
}
.bcard__side.sell {
  background: rgba(246, 70, 93, 0.15);
  color: #f6465d;
}
.bcard__side.neu {
  background: rgba(132, 142, 156, 0.15);
  color: #aeb4bc;
}
.bcard__asset {
  font-size: 14px;
  font-weight: 600;
  color: #eaecef;
  flex: 1;
  min-width: 0;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
  flex-shrink: 0;
}
.status-pill--inline {
  font-size: 11px;
  text-transform: none;
}
.status-pill__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-pill--online {
  background: rgba(14, 203, 129, 0.15);
  color: #0ecb81;
}
.status-pill--online .status-pill__dot {
  background: #0ecb81;
  box-shadow: 0 0 5px rgba(14, 203, 129, 0.75);
}
.status-pill--offline {
  background: rgba(132, 142, 156, 0.15);
  color: #aeb4bc;
}
.status-pill--offline .status-pill__dot {
  background: #848e9c;
}
.status-pill--closed {
  background: rgba(246, 70, 93, 0.12);
  color: #f6465d;
}
.status-pill--closed .status-pill__dot {
  background: #f6465d;
}
.status-pill--derived,
.status-pill--unknown {
  background: rgba(240, 185, 11, 0.12);
  color: #f0b90b;
}
.status-pill--derived .status-pill__dot,
.status-pill--unknown .status-pill__dot {
  background: #f0b90b;
}
.bcard__row--status {
  padding-bottom: 4px;
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(43, 49, 57, 0.6);
}
.bcard__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bcard__row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.bcard__row--block {
  flex-direction: column;
  align-items: stretch;
}
.bcard__row .label {
  color: #848e9c;
  flex-shrink: 0;
}
.bcard__row .value {
  color: #eaecef;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}
.bcard__row--block .value {
  text-align: left;
}
.bcard__row .value.highlight {
  color: #f0b90b;
  font-weight: 700;
}
.value--muted {
  color: #aeb4bc !important;
  font-size: 12px;
  line-height: 1.4;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.wrap-any {
  overflow-wrap: anywhere;
}
.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 16px;
}
.btn-more {
  min-width: 160px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #f0b90b;
  font-weight: 700;
  cursor: pointer;
}
.btn-more:disabled {
  opacity: 0.5;
}
</style>
