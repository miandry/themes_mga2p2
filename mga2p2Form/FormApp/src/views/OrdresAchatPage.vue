<template>
  <div class="orders-page">
    <header class="orders-head">
      <div class="orders-head__bar">
        <div class="orders-head__titles">
          <h1 class="orders-head__h1">Historique ordres</h1>
          <p class="orders-head__sub">Achats uniquement · API mga2p2 · montants en {{ fiatHint }}</p>
        </div>
        <div class="orders-head__links">
          <button type="button" class="icon-btn" :disabled="loading" title="Rafraîchir" @click="() => load()">
            ↻
          </button>
        </div>
      </div>

      <div class="orders-segment orders-segment--status" role="tablist" aria-label="Filtre statut">
        <button
          v-for="opt in statusFilterOptions"
          :key="opt.value"
          type="button"
          role="tab"
          class="seg-btn seg-btn--sm"
          :class="{ 'seg-btn--on': statusFilter === opt.value }"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="orders-tools">
        <label class="search-wrap">
          <span class="search-lbl">Montant total (entier)</span>
          <input
            v-model="totalPriceQuery"
            type="search"
            class="search-inp"
            placeholder="ex. 150000"
            inputmode="numeric"
            autocomplete="off"
            @input="onSearchInput"
          />
        </label>
      </div>

      <p v-if="sourceLabel" class="hint">{{ sourceLabel }}</p>
      <p v-if="error" class="err">{{ error }}</p>
    </header>

    <main class="orders-body">
      <div v-if="loading" class="center-spinner">
        <span class="spinner" aria-hidden="true" />
      </div>

      <div v-else-if="!displayed.length" class="empty-state">
        <span class="empty-ico" aria-hidden="true">◇</span>
        <p>{{ emptyMessage }}</p>
      </div>

      <div v-else class="list-wrap">
        <article
          v-for="row in displayed"
          :key="row.orderNumber"
          class="bcard bcard--click"
          role="button"
          tabindex="0"
          @click="goDetail(row.orderNumber)"
          @keydown.enter.prevent="goDetail(row.orderNumber)"
        >
          <div class="bcard__header">
            <span class="bcard__side buy">ACHAT</span>
            <span class="bcard__asset">{{ pairLabel(row) }}</span>
            <span class="badge" :class="badgeClass(row.status)">{{ row.statusLabel }}</span>
          </div>

          <div class="bcard__body">
            <div class="bcard__row">
              <span class="label">Quantité</span>
              <span class="value">{{ formatAmountLine(row) }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Total</span>
              <span class="value highlight">{{ formatNum(row.totalPrice) }} {{ sanitizeDisplayText(row.fiat) || row.fiat }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Prix unitaire</span>
              <span class="value">{{ formatNum(row.unitPrice) }} {{ sanitizeDisplayText(row.fiat) || row.fiat }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Contrepartie</span>
              <span class="value">{{ sanitizeDisplayText(row.counterparty) || row.counterparty }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Paiement</span>
              <span class="value">{{ sanitizeDisplayText(row.paymentMethod) || row.paymentMethod }}</span>
            </div>
            <div v-if="ACTIVE_STATUSES.includes(row.status)" class="bcard__row">
              <span class="label">Temps restant</span>
              <span class="value value-timer">{{ remainingTimeLabel(row, nowMs) || '—' }}</span>
            </div>
          </div>

          <div class="bcard__footer">
            <span class="order-no mono">#{{ row.orderNumber }}</span>
            <span>{{ timeAgo(row.createTime) }}</span>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  fetchC2COrderHistoryModule,
  fetchC2COrderHistoryProxy,
  mapC2COrderRow,
  type BinanceOrderRow,
  type C2COrderStatus,
} from '@/lib/binance';
import { cacheOrdresAchat } from '@/lib/ordresAchatCache';
import {
  badgeClass,
  formatAmountLine,
  formatNum,
  pairLabel,
  remainingTimeLabel,
  sanitizeDisplayText,
  timeAgo,
} from '@/lib/ordresAchatDisplay';

type StatusFilter = 'ALL' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES: C2COrderStatus[] = [
  'PENDING',
  'TRADING',
  'BUYER_PAYED',
  'DISTRIBUTING',
  'IN_APPEAL',
];

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'active', label: 'En cours' },
  { value: 'completed', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
];

const router = useRouter();
const statusFilter = ref<StatusFilter>('ALL');
const totalPriceQuery = ref('');
const loading = ref(false);
const error = ref('');
const rows = ref<BinanceOrderRow[]>([]);
const usedModuleApi = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
const nowMs = ref(Date.now());

const parsedTotalPrice = computed(() => {
  const digits = totalPriceQuery.value.replace(/\D+/g, '');
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
});

function matchesStatusFilter(status: C2COrderStatus): boolean {
  switch (statusFilter.value) {
    case 'active':
      return ACTIVE_STATUSES.includes(status);
    case 'completed':
      return status === 'COMPLETED';
    case 'cancelled':
      return status === 'CANCELLED' || status === 'CANCELLED_BY_SYSTEM';
    default:
      return true;
  }
}

const displayed = computed(() => rows.value.filter(r => matchesStatusFilter(r.status)));

const hasActiveFilters = computed(
  () => statusFilter.value !== 'ALL' || parsedTotalPrice.value != null,
);

const fiatHint = computed(() => {
  const f = rows.value[0]?.fiat;
  const clean = sanitizeDisplayText(f);
  return clean || f || 'Ar';
});

const emptyMessage = computed(() => {
  if (hasActiveFilters.value) {
    return 'Aucun ordre pour ce filtre.';
  }
  return 'Aucun ordre dans l’historique.';
});

const sourceLabel = computed(() => {
  if (loading.value) return '';
  const n = displayed.value.length;
  const parts: string[] = [`${n} ordre(s)`];
  if (statusFilter.value !== 'ALL') {
    const lbl = statusFilterOptions.find(o => o.value === statusFilter.value)?.label;
    if (lbl) parts.push(lbl.toLowerCase());
  }
  if (parsedTotalPrice.value) {
    parts.push(`montant ${parsedTotalPrice.value}`);
  }
  return parts.join(' · ');
});

function goDetail(orderNumber: string) {
  router.push({
    name: 'ordres-achat-detail',
    params: { orderNo: orderNumber },
  });
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void load(), 400);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const total = parsedTotalPrice.value;
    let raw;

    try {
      const res = await fetchC2COrderHistoryModule('BUY', 1, 100, total);
      raw = res.data ?? [];
      usedModuleApi.value = true;
    }
    catch {
      const res = await fetchC2COrderHistoryProxy('BUY', 1, 100);
      raw = res.data ?? [];
      usedModuleApi.value = false;
    }

    rows.value = raw.map(mapC2COrderRow);
    cacheOrdresAchat(rows.value);
  }
  catch (e: unknown) {
    const raw = e instanceof Error ? e.message : 'Échec chargement';
    error.value = sanitizeDisplayText(raw) || 'Échec chargement';
    rows.value = [];
  }
  finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
  ticker = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (ticker) clearInterval(ticker);
});
</script>

<style scoped>
.orders-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 0 48px;
}
.orders-head {
  padding: 0 16px 12px;
}
.orders-head__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.orders-head__h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #f0b90b;
}
.orders-head__sub {
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
.orders-segment {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.orders-segment--status {
  margin-top: -4px;
}
.seg-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #848e9c;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.seg-btn--sm {
  padding: 8px 6px;
  font-size: 12px;
}
.seg-btn--on {
  border-color: #f0b90b;
  color: #f0b90b;
  background: rgba(240, 185, 11, 0.08);
}
.orders-tools {
  margin-bottom: 8px;
}
.search-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.search-lbl {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #848e9c;
}
.search-inp {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 14px;
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
.orders-body {
  padding: 0 0 24px;
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
  transition: border-color 0.2s;
}
.bcard--click:hover {
  border-color: #3d4f5c;
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
}
.bcard__side {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  flex-shrink: 0;
}
.bcard__side.buy {
  background: rgba(14, 203, 129, 0.15);
  color: #0ecb81;
}
.bcard__side.sell {
  background: rgba(246, 70, 93, 0.15);
  color: #f6465d;
}
.bcard__asset {
  font-size: 14px;
  font-weight: 600;
  color: #eaecef;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.badge-pending {
  background: rgba(240, 185, 11, 0.12);
  color: #f0b90b;
}
.badge-completed {
  background: rgba(14, 203, 129, 0.12);
  color: #0ecb81;
}
.badge-cancelled {
  background: rgba(132, 142, 156, 0.12);
  color: #848e9c;
}
.badge-appeal {
  background: rgba(246, 70, 93, 0.12);
  color: #f6465d;
  border: 1px solid rgba(246, 70, 93, 0.35);
}
.bcard__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bcard__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  gap: 10px;
}
.bcard__row .label {
  color: #848e9c;
}
.bcard__row .value {
  color: #eaecef;
  font-weight: 500;
  text-align: right;
}
.bcard__row .value.highlight {
  color: #f0b90b;
  font-weight: 700;
}
.bcard__row .value.value-timer {
  color: #f0b90b;
  font-weight: 700;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.bcard__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #2b3139;
  font-size: 11px;
  color: #848e9c;
}
</style>
