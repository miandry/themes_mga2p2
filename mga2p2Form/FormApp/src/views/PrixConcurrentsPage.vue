<template>
  <div class="market-page">
    <header class="market-head">
      <div class="market-head__bar">
        <div class="market-head__titles">
          <h1 class="market-head__h1">Prix concurrents P2P</h1>
          <p class="market-head__sub">
            Carnet marché Binance
            <span v-if="sourceLabel"> · {{ sourceLabel }}</span>
          </p>
        </div>
        <div class="market-head__links">
          <button type="button" class="icon-btn" :disabled="loading" title="Rafraîchir" @click="reload">
            ↻
          </button>
        </div>
      </div>

      <div class="market-tools">
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

      <div class="market-segment" role="tablist" aria-label="Côté annonce">
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
    </header>

    <main class="market-body">
      <div v-if="loading && !rows.length" class="center-spinner">
        <span class="spinner" aria-hidden="true" />
      </div>

      <template v-else-if="rows.length">
        <section v-if="stats" class="stats-row">
          <div class="stat-card">
            <span class="stat-card__lbl">Annonces</span>
            <span class="stat-card__val">{{ stats.total }}</span>
          </div>
          <div class="stat-card stat-card--low">
            <span class="stat-card__lbl">Min</span>
            <span class="stat-card__val">{{ formatAdPrice(stats.min) }} {{ filterFiat }}</span>
          </div>
          <div class="stat-card stat-card--avg">
            <span class="stat-card__lbl">Moyenne</span>
            <span class="stat-card__val">{{ formatAdPrice(stats.avg) }} {{ filterFiat }}</span>
          </div>
          <div class="stat-card stat-card--high">
            <span class="stat-card__lbl">Max</span>
            <span class="stat-card__val">{{ formatAdPrice(stats.max) }} {{ filterFiat }}</span>
          </div>
        </section>

        <section class="list-section">
          <h2 class="list-section__title">Liste complète ({{ rows.length }}) · du plus haut au plus bas</h2>
          <div class="table-wrap">
            <table class="price-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prix</th>
                  <th>Marchand</th>
                  <th>Restant</th>
                  <th>Limites</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in displayRows"
                  :key="row.advNo || i"
                  :class="rowClass(i, displayRows.length)"
                >
                  <td class="mono">{{ i + 1 }}</td>
                  <td class="price-cell">
                    <strong>{{ formatAdPrice(row.price) }}</strong>
                    <span class="fiat-tag">{{ filterFiat }}</span>
                  </td>
                  <td>{{ row.merchant }}</td>
                  <td>{{ row.surplusAmount ? `${formatAdPrice(row.surplusAmount)} ${row.asset}` : '—' }}</td>
                  <td class="limits-cell">{{ limitLine(row) || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="empty-state">
        <span class="empty-ico" aria-hidden="true">◇</span>
        <p>{{ emptyMessage }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchBinanceAdMarketPrices } from '@/lib/binanceAds';
import { formatAdPrice, limitLine, sideLabel } from '@/lib/binanceAdsDisplay';
import type { BinanceMarketPriceRow } from '@/types/binanceAds';

const route = useRoute();
const router = useRouter();

const sideFilterOptions = [
  { value: 'BUY', label: "J'achète" },
  { value: 'SELL', label: 'Je vends' },
] as const;

type SideFilter = (typeof sideFilterOptions)[number]['value'];

const filterAsset = ref('USDT');
const filterFiat = ref('MGA');
const sideFilter = ref<SideFilter>('BUY');
const rows = ref<BinanceMarketPriceRow[]>([]);
const topLow = ref<BinanceMarketPriceRow[]>([]);
const topHigh = ref<BinanceMarketPriceRow[]>([]);
const source = ref('');
const loading = ref(false);
const error = ref('');
const stats = ref<{ total: number; min: number; max: number; avg: number } | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const sourceLabel = computed(() => {
  if (source.value === 'agent') return 'API marchand';
  if (source.value === 'public') return 'P2P public';
  return '';
});

const metaLabel = computed(() => {
  if (loading.value && !rows.value.length) return '';
  const side = sideLabel(sideFilter.value);
  return `${rows.value.length} prix · ${filterAsset.value}/${filterFiat.value} · ${side}`;
});

const emptyMessage = computed(() => {
  if (error.value) return 'Impossible de charger les prix concurrents.';
  return 'Aucune annonce sur ce marché.';
});

/** Full list sorted highest price first. */
const displayRows = computed(() => [...rows.value].reverse());

function rowClass(index: number, total: number): string {
  if (index < 5) return 'row--high';
  if (index >= total - 5) return 'row--low';
  return '';
}

function syncQuery() {
  router.replace({
    query: {
      asset: filterAsset.value.trim() || undefined,
      fiat: filterFiat.value.trim() || undefined,
      side: sideFilter.value,
    },
  });
}

function readQuery() {
  const q = route.query;
  if (typeof q.asset === 'string' && q.asset.trim()) filterAsset.value = q.asset.trim();
  if (typeof q.fiat === 'string' && q.fiat.trim()) filterFiat.value = q.fiat.trim();
  if (q.side === 'BUY' || q.side === 'SELL') sideFilter.value = q.side;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetchBinanceAdMarketPrices({
      asset: filterAsset.value,
      fiat: filterFiat.value,
      tradeType: sideFilter.value,
      pages: 6,
    });
    source.value = res.source;
    rows.value = Array.isArray(res.data) ? res.data : [];
    topLow.value = res.lowest ?? [];
    topHigh.value = res.highest ?? [];
    if (res.minPrice != null && res.maxPrice != null && res.avgPrice != null) {
      stats.value = {
        total: res.total,
        min: res.minPrice,
        max: res.maxPrice,
        avg: res.avgPrice,
      };
    }
    else if (rows.value.length) {
      const nums = rows.value.map(r => parseFloat(r.price) || 0).filter(n => n > 0);
      stats.value = {
        total: rows.value.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      };
    }
    else {
      stats.value = null;
    }
    if (res.error && rows.value.length === 0) {
      error.value = res.error;
    }
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Échec chargement';
    rows.value = [];
    topLow.value = [];
    topHigh.value = [];
    stats.value = null;
  }
  finally {
    loading.value = false;
  }
}

function reload() {
  syncQuery();
  void load();
}

watch([filterAsset, filterFiat, sideFilter], () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => reload(), 400);
});

onMounted(() => {
  readQuery();
  void load();
});
</script>

<style scoped>
.market-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 0 48px;
}
.market-head {
  padding: 0 16px 12px;
}
.market-head__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.market-head__h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #f0b90b;
}
.market-head__sub {
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
.market-tools {
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
.market-segment {
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
.market-body {
  padding: 0 16px;
}
.center-spinner {
  display: flex;
  justify-content: center;
  padding: 48px;
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
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
@media (min-width: 560px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
  }
}
.stat-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #2b3139;
  background: #1e2329;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-card--low {
  border-color: rgba(14, 203, 129, 0.35);
}
.stat-card--high {
  border-color: rgba(246, 70, 93, 0.35);
}
.stat-card--avg {
  border-color: rgba(240, 185, 11, 0.35);
}
.stat-card__lbl {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #848e9c;
}
.stat-card__val {
  font-size: 14px;
  font-weight: 700;
  color: #eaecef;
}
.stat-card--low .stat-card__val {
  color: #0ecb81;
}
.stat-card--high .stat-card__val {
  color: #f6465d;
}
.stat-card--avg .stat-card__val {
  color: #f0b90b;
}

.list-section__title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #848e9c;
}
.table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #2b3139;
}
.price-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.price-table th {
  text-align: left;
  padding: 10px 12px;
  background: #13161a;
  color: #848e9c;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}
.price-table td {
  padding: 10px 12px;
  border-top: 1px solid #2b3139;
  color: #cfd2d7;
}
.price-table tbody tr {
  background: #1e2329;
}
.price-table tbody tr.row--low {
  background: rgba(14, 203, 129, 0.06);
}
.price-table tbody tr.row--high {
  background: rgba(246, 70, 93, 0.06);
}
.price-cell strong {
  color: #f0b90b;
}
.fiat-tag {
  margin-left: 4px;
  font-size: 11px;
  color: #848e9c;
}
.limits-cell {
  font-size: 11px;
  color: #848e9c;
}
.mono {
  font-family: ui-monospace, monospace;
  color: #848e9c;
}
</style>
