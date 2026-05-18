<template>
  <div class="wrap">
    <header class="hdr">
      <h1>Orders MGA</h1>
      <router-link class="link" to="/">← Reçu</router-link>
    </header>

    <section class="card controls">
      <p class="hint">Fenêtre de paiement : temps restant depuis la création du nœud + « temps restant (minutes) » enregistré.</p>
      <div class="filters">
        <div class="filter-field status-filter" role="group" aria-labelledby="status-filter-lbl">
          <span id="status-filter-lbl" class="filter-lbl">Statut</span>
          <div class="status-btns">
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': filterStatus === 'en_cours' }"
              @click="setFilterStatus('en_cours')"
            >
              En cours
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': filterStatus === 'paye' }"
              @click="setFilterStatus('paye')"
            >
              Payé
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': filterStatus === 'archive' }"
              @click="setFilterStatus('archive')"
            >
              Archive
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': filterStatus === '' }"
              @click="setFilterStatus('')"
            >
              Tous
            </button>
          </div>
        </div>
        <label class="filter-field filter-field--grow">
          <span class="filter-lbl">Recherche</span>
          <input
            v-model="filterSearch"
            type="search"
            class="filter-inp"
            placeholder="Nom, téléphone, montant, type (MVola, Orange…)"
            autocomplete="off"
          />
        </label>
      </div>
      <div class="push-row">
        <button type="button" class="ghost push-btn" :disabled="pushBusy" @click="onPushEnable">
          {{ pushBusy ? '…' : 'Notifications (statut)' }}
        </button>
        <button
          v-if="pushOptedIn"
          type="button"
          class="ghost push-btn push-btn--off"
          :disabled="pushBusy"
          @click="onPushDisable"
        >
          Désactiver
        </button>
        <span v-if="pushHint" class="push-hint">{{ pushHint }}</span>
      </div>
      <div class="refresh-bar">
        <button type="button" class="ghost" :disabled="loading" @click="() => load(true)">Rafraîchir</button>
        <div class="auto-refresh" role="group" aria-labelledby="auto-refresh-lbl">
          <span id="auto-refresh-lbl" class="filter-lbl">Actualisation auto</span>
          <div class="status-btns">
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': autoRefreshMs === 5000 }"
              @click="setAutoRefresh(5000)"
            >
              5 s
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': autoRefreshMs === 10000 }"
              @click="setAutoRefresh(10000)"
            >
              10 s
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': autoRefreshMs === 15000 }"
              @click="setAutoRefresh(15000)"
            >
              15 s
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': autoRefreshMs === 60000 }"
              @click="setAutoRefresh(60000)"
            >
              1 min
            </button>
            <button
              type="button"
              class="status-btn"
              :class="{ 'status-btn--active': autoRefreshMs === 0 }"
              @click="setAutoRefresh(0)"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <p v-if="loading" class="loading">Chargement…</p>
    <div v-else-if="!rows.length" class="empty card">
      {{ hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun order_mga publié.' }}
    </div>
    <div v-else class="cards-grid">
      <article
        v-for="row in rows"
        :key="row.nid"
        class="order-card"
        :class="{ 'order-card--expired': isPaymentWindowExpired(row) }"
      >
        <div class="order-card__top">
          <span class="order-card__nid mono">#{{ row.nid }}</span>
          <span class="order-card__badges">
            <span class="order-card__status" :class="'order-card__status--' + (row.status || 'en_cours')">{{ formatStatus(row.status) }}</span>
            <span
              :class="[
                'order-card__remain',
                isPaymentWindowExpired(row) ? 'expired' : '',
                !paymentWindowActive(row) ? 'frozen' : '',
              ]"
            >
              {{ formatRemain(row) }}
            </span>
          </span>
        </div>
        <h2 class="order-card__title">{{ row.title }}</h2>
        <p v-if="row.reference" class="order-card__ref mono">{{ row.reference }}</p>
        <dl class="order-card__dl">
          <div class="order-card__row">
            <dt>Montant</dt>
            <dd>{{ row.montant || '—' }}<span v-if="row.currency" class="muted"> {{ row.currency }}</span></dd>
          </div>
          <div v-if="row.nom" class="order-card__row">
            <dt>Nom</dt>
            <dd>{{ row.nom }}</dd>
          </div>
          <div class="order-card__row">
            <dt>Téléphone</dt>
            <dd class="mono">{{ row.phone || '—' }}</dd>
          </div>
          <div class="order-card__row">
            <dt>Paiement</dt>
            <dd>{{ formatPayment(row.payment_type) }}</dd>
          </div>
          <div v-if="row.bank_name" class="order-card__row">
            <dt>Opérateur</dt>
            <dd>{{ row.bank_name }}</dd>
          </div>
        </dl>
        <div class="order-card__links">
          <a
            v-if="rowStatus(row) === 'en_cours' && mvolaItemPayTelHref(row)"
            class="order-card__link order-card__link--mvola"
            :href="mvolaItemPayTelHref(row)!"
            rel="nofollow"
          >
            MVola (composer)
          </a>
          <a
            v-if="rowStatus(row) === 'en_cours' && orangeItemPayTelHref(row)"
            class="order-card__link order-card__link--orange"
            :href="orangeItemPayTelHref(row)!"
            rel="nofollow"
          >
            Orange Money (composer)
          </a>
          <router-link class="order-card__detail" :to="{ name: 'order-mga-detail', params: { nid: String(row.nid) } }">
            Détails
          </router-link>
          <a class="order-card__link" :href="nodeHref(row.path)">Voir le nœud</a>
        </div>
      </article>
    </div>
    <div v-if="rows.length && hasMore && !loading" class="load-more-wrap">
      <button type="button" class="ghost load-more load-more--primary" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Chargement…' : 'Voir plus' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { apiUrl } from '@/lib/apiUrl';
import type { OrderMgaRow } from '@/types/orderMga';
import {
  isOrderPushOptedIn,
  registerOrderMgaWebPush,
  resyncOrderMgaWebPushIfOptedIn,
  unregisterOrderMgaWebPush,
} from '@/lib/orderPush';

const PAGE_SIZE = 5;

const rows = ref<OrderMgaRow[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const error = ref('');
const filterStatus = ref<'' | 'en_cours' | 'paye' | 'archive'>('');

function setFilterStatus(s: '' | 'en_cours' | 'paye' | 'archive') {
  if (filterStatus.value === s) return;
  filterStatus.value = s;
}
const filterSearch = ref('');
const pushBusy = ref(false);
const pushHint = ref('');
const pushOptedIn = ref(isOrderPushOptedIn());
let tick: ReturnType<typeof setInterval> | null = null;
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const nowSec = ref(Math.floor(Date.now() / 1000));

/** 0 = off; otherwise interval in ms */
const autoRefreshMs = ref(0);

const hasActiveFilters = computed(
  () => !!(filterStatus.value || filterSearch.value.trim()),
);

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

function setAutoRefresh(ms: 0 | 5000 | 10000 | 15000 | 60000) {
  autoRefreshMs.value = ms;
}

function syncAutoRefreshTimer() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  const ms = autoRefreshMs.value;
  if (ms <= 0) return;
  autoRefreshTimer = setInterval(() => {
    if (loading.value || loadingMore.value) return;
    void load(true);
  }, ms);
}

function nodeHref(path: string): string {
  if (path.startsWith('http')) return path;
  return apiUrl(path.replace(/^\//, ''));
}

function formatPayment(t: string | null | undefined): string {
  if (t === 'mvola') return 'MVola';
  if (t === 'orange') return 'Orange Money';
  return '—';
}

function digitsOnly(s: string | null | undefined): string {
  return String(s ?? '').replace(/\D/g, '');
}

/**
 * Lien tel: pour code MVola #111*1*3*2*{téléphone}*{montant}*2*1# (téléphone et montant = chiffres uniquement).
 * Affiché côté liste uniquement si statut en_cours (voir template).
 */
function mvolaItemPayTelHref(row: OrderMgaRow): string | null {
  if (row.payment_type !== 'mvola') return null;
  const phone = digitsOnly(row.phone);
  const montant = digitsOnly(row.montant);
  if (!phone || !montant) return null;
  const ussd = `#111*1*3*2*${phone}*${montant}*2*1#`;
  return `tel:${ussd.replace(/#/g, '%23')}`;
}

/**
 * Lien tel: pour Orange Money #144*1*1*{téléphone}*{téléphone}*{montant}*2# (chiffres uniquement).
 * Affiché côté liste uniquement si statut en_cours (voir template).
 */
function orangeItemPayTelHref(row: OrderMgaRow): string | null {
  if (row.payment_type !== 'orange') return null;
  const phone = digitsOnly(row.phone);
  const montant = digitsOnly(row.montant);
  if (!phone || !montant) return null;
  const ussd = `#144*1*1*${phone}*${phone}*${montant}*2#`;
  return `tel:${ussd.replace(/#/g, '%23')}`;
}

function formatStatus(s: string | null | undefined): string {
  if (s === 'paye') return 'Payé';
  if (s === 'archive') return 'Archive';
  return 'En cours';
}

function rowStatus(row: OrderMgaRow): string {
  return row.status && row.status !== '' ? row.status : 'en_cours';
}

function paymentWindowActive(row: OrderMgaRow): boolean {
  return rowStatus(row) === 'en_cours';
}

function isPaymentWindowExpired(row: OrderMgaRow): boolean {
  return paymentWindowActive(row) && remainingFor(row) <= 0;
}

function remainingFor(row: OrderMgaRow): number {
  return Math.max(0, row.deadline - nowSec.value);
}

function formatRemain(row: OrderMgaRow): string {
  if (!paymentWindowActive(row)) {
    return '—';
  }
  const sec = remainingFor(row);
  if (sec <= 0) return 'Expiré';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${String(mm).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

async function onPushEnable() {
  pushBusy.value = true;
  pushHint.value = '';
  try {
    const r = await registerOrderMgaWebPush();
    pushHint.value = r.ok ? 'Notifications activées.' : r.message || 'Échec';
    if (r.ok) pushOptedIn.value = true;
  } finally {
    pushBusy.value = false;
  }
}

async function onPushDisable() {
  pushBusy.value = true;
  pushHint.value = '';
  try {
    await unregisterOrderMgaWebPush();
    pushOptedIn.value = false;
    pushHint.value = 'Notifications désactivées.';
  } finally {
    pushBusy.value = false;
  }
}

async function parseJsonResponse(r: Response): Promise<unknown> {
  const text = await r.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(
      r.ok ? `Réponse invalide (pas JSON). ${snippet}` : `Erreur serveur (${r.status}). ${snippet}`,
    );
  }
}

async function load(reset = true) {
  if (reset) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  error.value = '';
  try {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', reset ? '0' : String(rows.value.length));
    if (filterStatus.value) {
      params.set('status', filterStatus.value);
    }
    const q = filterSearch.value.trim();
    if (q) {
      params.set('search', q);
    }
    const r = await fetch(apiUrl(`mga2p2-form/api/orders?${params.toString()}`), { credentials: 'same-origin' });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    const data = (j as { data?: OrderMgaRow[] }).data ?? [];
    const hm =
      typeof (j as { has_more?: boolean }).has_more === 'boolean'
        ? (j as { has_more: boolean }).has_more
        : data.length === PAGE_SIZE;
    if (reset) {
      rows.value = data;
      hasMore.value = hm;
    } else {
      const before = rows.value.length;
      const seen = new Set(rows.value.map((row) => row.nid));
      for (const row of data) {
        if (!seen.has(row.nid)) {
          seen.add(row.nid);
          rows.value.push(row);
        }
      }
      const added = rows.value.length - before;
      hasMore.value = hm && added > 0;
    }
    nowSec.value = Math.floor(Date.now() / 1000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible';
    if (reset) {
      rows.value = [];
      hasMore.value = false;
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadMore() {
  if (!hasMore.value || loadingMore.value || loading.value) return;
  void load(false);
}

watch(filterStatus, () => {
  void load(true);
});

watch(filterSearch, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    void load(true);
  }, 400);
});

watch(autoRefreshMs, () => {
  syncAutoRefreshTimer();
});

onMounted(() => {
  pushOptedIn.value = isOrderPushOptedIn();
  void resyncOrderMgaWebPushIfOptedIn();
  void load(true);
  tick = setInterval(() => {
    nowSec.value = Math.floor(Date.now() / 1000);
  }, 1000);
});

onUnmounted(() => {
  if (tick) clearInterval(tick);
  if (searchDebounce) clearTimeout(searchDebounce);
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});
</script>

<style scoped>
.wrap { max-width: 960px; margin: 0 auto; padding: 14px 12px 32px; }
.hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.hdr h1 { font-size: 17px; margin: 0; font-weight: 800; color: #f0b90b; }
.link { color: #848e9c; text-decoration: none; font-size: 12px; }
.link:hover { color: #eaecef; }
.card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 10px;
  padding: 12px 14px;
}
.controls { margin-bottom: 12px; }
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: flex-end;
  margin-bottom: 12px;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.filter-field--grow {
  flex: 1 1 200px;
}
.filter-lbl {
  font-size: 9px;
  font-weight: 700;
  color: #5e6673;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.filter-inp {
  box-sizing: border-box;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 11px;
  min-width: 0;
  width: 100%;
}
.filter-inp:focus {
  outline: none;
  border-color: #f0b90b;
}
.status-filter {
  flex: 0 1 auto;
}
.status-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.status-btn {
  margin: 0;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #848e9c;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.2;
}
.status-btn:hover {
  color: #eaecef;
  border-color: #3d4f5c;
}
.status-btn--active {
  color: #eaecef;
  border-color: #f0b90b;
  background: rgba(240, 185, 11, 0.12);
  box-shadow: 0 0 0 1px rgba(240, 185, 11, 0.15);
}
.status-btn:focus-visible {
  outline: none;
  border-color: #f0b90b;
}
.hint { color: #848e9c; font-size: 11px; line-height: 1.45; margin: 0 0 10px; }
.push-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.push-btn { margin-bottom: 0; }
.push-btn--off { opacity: 0.85; }
.push-hint {
  font-size: 10px;
  color: #5e6673;
  flex: 1 1 140px;
  min-width: 0;
}
.refresh-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 14px;
  margin-bottom: 8px;
}
.refresh-bar > .ghost {
  flex: 0 0 auto;
}
.auto-refresh {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ghost {
  margin-bottom: 0;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #2b3139;
  background: transparent;
  color: #eaecef;
  font-size: 11px;
  cursor: pointer;
}
.ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.err { color: #f6465d; font-size: 11px; margin: 8px 0 0; }
.loading { color: #848e9c; font-size: 12px; padding: 16px 8px; text-align: center; }
.empty { color: #848e9c; font-size: 12px; padding: 16px 14px; text-align: center; }

.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 14px;
  margin-bottom: 8px;
}
.load-more {
  min-width: 160px;
}
.load-more--primary {
  font-weight: 700;
  border-color: rgba(240, 185, 11, 0.45);
  color: #f0b90b;
}
.load-more--primary:hover:not(:disabled) {
  border-color: rgba(240, 185, 11, 0.65);
  background: rgba(240, 185, 11, 0.1);
  color: #fcd535;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.order-card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 10px;
  padding: 10px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s ease;
}
.order-card:hover { border-color: #3d4f5c; }
.order-card--expired { opacity: 0.92; }
.order-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.order-card__badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.order-card__status {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #2b3139;
  color: #eaecef;
  background: rgba(132, 142, 156, 0.15);
}
.order-card__status--en_cours { color: #f0b90b; border-color: rgba(240, 185, 11, 0.4); background: rgba(240, 185, 11, 0.1); }
.order-card__status--paye { color: #0ecb81; border-color: rgba(14, 203, 129, 0.35); background: rgba(14, 203, 129, 0.1); }
.order-card__status--archive { color: #848e9c; border-color: #3d4f5c; }
.order-card__nid {
  font-size: 10px;
  font-weight: 700;
  color: #848e9c;
  letter-spacing: 0.04em;
}
.order-card__remain {
  font-size: 12px;
  font-weight: 800;
  color: #0ecb81;
  font-variant-numeric: tabular-nums;
  text-align: right;
  line-height: 1.15;
}
.order-card__remain.expired { color: #848e9c; font-weight: 600; font-size: 11px; }
.order-card__remain.frozen {
  color: #848e9c;
  font-weight: 600;
  font-size: 11px;
}
.order-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #eaecef;
  line-height: 1.3;
}
.order-card__ref {
  margin: -2px 0 0;
  font-size: 10px;
  color: #848e9c;
}
.order-card__dl { margin: 0; display: flex; flex-direction: column; gap: 5px; }
.order-card__row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 4px 8px;
  font-size: 11px;
  align-items: baseline;
}
.order-card__row dt {
  margin: 0;
  color: #848e9c;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.order-card__row dd { margin: 0; color: #eaecef; font-weight: 500; word-break: break-word; }
.mono { font-family: ui-monospace, monospace; font-size: 10px; color: #aeb4bc; }
.muted { color: #848e9c; font-size: 10px; }
.order-card__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
}
.order-card__detail {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #3d4f5c;
  background: rgba(132, 142, 156, 0.1);
  color: #aeb4bc;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}
.order-card__detail:hover {
  border-color: #5e6673;
  color: #eaecef;
}
.order-card__link {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(240, 185, 11, 0.12);
  border: 1px solid rgba(240, 185, 11, 0.35);
  color: #f0b90b;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}
.order-card__link--mvola {
  background: rgba(14, 203, 129, 0.12);
  border-color: rgba(14, 203, 129, 0.45);
  color: #0ecb81;
}
.order-card__link.order-card__link--mvola:hover {
  background: rgba(14, 203, 129, 0.22);
  border-color: rgba(14, 203, 129, 0.65);
  color: #0ecb81;
}
.order-card__link--orange {
  background: rgba(255, 121, 0, 0.12);
  border-color: rgba(255, 121, 0, 0.45);
  color: #ff7900;
}
.order-card__link.order-card__link--orange:hover {
  background: rgba(255, 121, 0, 0.22);
  border-color: rgba(255, 121, 0, 0.65);
  color: #ff9500;
}
.order-card__link:hover { background: rgba(240, 185, 11, 0.2); color: #fcd535; }
@media (max-width: 400px) {
  .order-card__row { grid-template-columns: 1fr; gap: 2px; }
  .order-card__row dt { margin-bottom: -2px; }
}
</style>
