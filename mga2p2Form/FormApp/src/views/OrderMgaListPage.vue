<template>
  <div class="orders-page">
    <header class="orders-head">
      <div class="orders-head__bar">
        <div class="orders-head__titles">
          <h1 class="orders-head__h1">Commandes</h1>
          <p class="orders-head__sub">Montants en Ar (ariary) · mobile money</p>
        </div>
        <div class="orders-head__links">
          <router-link class="top-link top-link--scan" :to="{ name: 'receipt' }">
            Scan reçu
          </router-link>
          <button type="button" class="icon-btn" :disabled="loading" title="Rafraîchir" @click="() => load(true)">
            ↻
          </button>
        </div>
      </div>

      <div class="orders-segment" role="tablist" aria-label="Filtre des commandes">
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ 'seg-btn--on': listSegment === 'active' }"
          @click="listSegment = 'active'"
        >
          En cours
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ 'seg-btn--on': listSegment === 'pay_in_progress' }"
          @click="listSegment = 'pay_in_progress'"
        >
          Payé en cours
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ 'seg-btn--on': listSegment === 'completed' }"
          @click="listSegment = 'completed'"
        >
          Terminées
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ 'seg-btn--on': listSegment === 'all' }"
          @click="listSegment = 'all'"
        >
          Toutes
        </button>
      </div>

      <div class="poll-toolbar">
        <div class="poll-row">
          <span class="poll-label">Actualisation auto</span>
          <label class="poll-toggle">
            <input v-model="pollEnabled" type="checkbox" class="poll-toggle__inp" />
            <span class="poll-toggle__ui" />
          </label>
        </div>
        <div class="poll-row poll-row--second">
          <span class="poll-label">Toutes les</span>
          <select v-model.number="pollIntervalSec" class="poll-select" :disabled="!pollEnabled">
            <option v-for="s in POLL_PRESETS_SEC" :key="s" :value="s">{{ formatPollLabel(s) }}</option>
          </select>
        </div>
      </div>

      <div class="orders-tools">
        <label class="search-wrap">
          <span class="search-lbl">Recherche</span>
          <input
            v-model="filterSearch"
            type="search"
            class="search-inp"
            placeholder="Nom, téléphone, montant, MVola…"
            autocomplete="off"
          />
        </label>
        <div class="push-row">
          <button type="button" class="ghost push-btn" :disabled="pushBusy" @click="onPushEnable">
            {{ pushBusy ? '…' : 'Notifications' }}
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
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <p v-if="markPayeError" class="err">{{ markPayeError }}</p>
    </header>

    <main class="orders-body">
      <div v-if="loading" class="center-spinner">
        <span class="spinner" aria-hidden="true" />
        <span class="sr-only">Chargement</span>
      </div>

      <div v-else-if="!rows.length" class="empty-state">
        <span class="empty-ico" aria-hidden="true">◇</span>
        <p>{{ emptyMessage }}</p>
      </div>

      <div v-else class="list-wrap">
        <article
          v-for="row in rows"
          :key="row.nid"
          class="bcard"
          :class="{ 'bcard--expired': isPaymentWindowExpired(row) }"
          @click="goDetail(row.nid)"
        >
          <div class="bcard__header">
            <span class="bcard__side" :class="paymentSideClass(row)">{{ paymentSideLabel(row) }}</span>
            <span class="bcard__asset">{{ row.title }}</span>
            <span class="badge" :class="statusBadgeClass(row)">{{ formatStatus(row.status) }}</span>
          </div>

          <div
            v-if="paymentWindowActive(row) && !isPaymentWindowExpired(row)"
            class="bcard__countdown"
          >
            <span class="bcard__clock" aria-hidden="true">⏱</span>
            <span>Payer sous {{ formatRemain(row) }}</span>
          </div>

          <div class="bcard__body">
            <div class="bcard__row">
              <span class="label">Montant</span>
              <span class="value highlight">{{ formatMontantAr(row) }}</span>
            </div>
            <div v-if="row.nom" class="bcard__row">
              <span class="label">Nom</span>
              <span class="value">{{ row.nom }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Téléphone</span>
              <span class="value mono">{{ row.phone || '—' }}</span>
            </div>
            <div class="bcard__row">
              <span class="label">Paiement</span>
              <span class="value">{{ formatPayment(row.payment_type) }}</span>
            </div>
            <div v-if="row.reference" class="bcard__row">
              <span class="label">Référence</span>
              <span class="value mono">{{ row.reference }}</span>
            </div>
            <div v-if="row.bank_name" class="bcard__row">
              <span class="label">Opérateur</span>
              <span class="value">{{ row.bank_name }}</span>
            </div>
            <div v-if="row.payment_proof_url" class="bcard__row bcard__row--proof">
              <span class="label">Preuve</span>
              <span class="value">
                <img
                  :src="proofImgSrc(row.payment_proof_url)"
                  alt=""
                  class="bcard__thumb"
                  loading="lazy"
                />
              </span>
            </div>
          </div>

          <div class="bcard__footer">
            <span class="order-no">#{{ row.nid }}</span>
            <span class="time">{{ timeAgo(row.created) }}</span>
          </div>

          <div class="bcard__actions" @click.stop>
            <button
              v-if="rowStatus(row) === 'en_cours' && mvolaItemPayTelHref(row)"
              type="button"
              class="act act--mvola"
              :disabled="markPayeBusyNid !== null"
              @click="onUssdPayClick(row, 'mvola')"
            >
              MVola
            </button>
            <button
              v-if="rowStatus(row) === 'en_cours' && orangeItemPayTelHref(row)"
              type="button"
              class="act act--orange"
              :disabled="markPayeBusyNid !== null"
              @click="onUssdPayClick(row, 'orange')"
            >
              Orange
            </button>
            <button
              v-if="isFormAdministrator && rowStatus(row) !== 'paye'"
              type="button"
              class="act act--pay"
              :disabled="markPayeBusyNid !== null"
              @click="markPayeDirect(row.nid)"
            >
              {{ markPayeBusyNid === row.nid ? '…' : 'Marquer payé' }}
            </button>
            <button
              v-if="ussdDialCodeForRow(row)"
              type="button"
              class="act act--muted"
              @click="copyUssdForRow(row)"
            >
              {{ copyUssdFlashNid === row.nid ? 'Copié !' : 'Copier code USSD' }}
            </button>
            <router-link class="act act--detail" :to="{ name: 'order-mga-detail', params: { nid: String(row.nid) } }">
              Détails
            </router-link>
          </div>
        </article>
      </div>

      <div v-if="rows.length && hasMore && !loading" class="load-more-wrap">
        <button type="button" class="ghost load-more load-more--primary" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Chargement…' : 'Voir plus' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '@/lib/apiUrl';
import type { OrderMgaRow } from '@/types/orderMga';
import { isFormAdministrator } from '@/lib/formSession';
import {
  isOrderPushOptedIn,
  registerOrderMgaWebPush,
  resyncOrderMgaWebPushIfOptedIn,
  unregisterOrderMgaWebPush,
} from '@/lib/orderPush';
import { readMobileUssdPatternsFromStorage, applyMobileUssdPlaceholders } from '@/lib/mobileUssd';

const PAGE_SIZE = 5;

const LS_POLL_ON = 'mga2p2_form_orders_poll_on';
const LS_POLL_SEC = 'mga2p2_form_orders_poll_sec';
const POLL_PRESETS_SEC = [5, 15, 30, 60, 120, 300] as const;
type PollSec = (typeof POLL_PRESETS_SEC)[number];

function readPollOn(): boolean {
  const v = localStorage.getItem(LS_POLL_ON);
  if (v === null) return true;
  return v === '1';
}

function readPollSec(): PollSec {
  const raw = localStorage.getItem(LS_POLL_SEC);
  const n = raw ? parseInt(raw, 10) : 60;
  return (POLL_PRESETS_SEC as readonly number[]).includes(n) ? (n as PollSec) : 60;
}

const router = useRouter();
const listSegment = ref<'active' | 'pay_in_progress' | 'completed' | 'all'>('active');
const pollEnabled = ref(readPollOn());
const pollIntervalSec = ref<PollSec>(readPollSec());

const mobileUssdPatterns = ref(readMobileUssdPatternsFromStorage());

function refreshPatternsFromStorage(): void {
  const p = readMobileUssdPatternsFromStorage();
  mobileUssdPatterns.value.mvola = p.mvola;
  mobileUssdPatterns.value.orange = p.orange;
}

const rows = ref<OrderMgaRow[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const error = ref('');
const filterSearch = ref('');
const pushBusy = ref(false);
const pushHint = ref('');
const pushOptedIn = ref(isOrderPushOptedIn());
const markPayeBusyNid = ref<number | null>(null);
const markPayeError = ref('');
const copyUssdFlashNid = ref<number | null>(null);
let copyUssdFlashTimer: ReturnType<typeof setTimeout> | null = null;
let tick: ReturnType<typeof setInterval> | null = null;
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const nowSec = ref(Math.floor(Date.now() / 1000));

const autoRefreshMs = computed(() => (pollEnabled.value ? pollIntervalSec.value * 1000 : 0));

const hasActiveFilters = computed(
  () => !!(listSegment.value !== 'all' || filterSearch.value.trim()),
);

const emptyMessage = computed(() => {
  if (hasActiveFilters.value) return 'Aucune commande pour ce filtre.';
  return 'Aucune commande publiée.';
});

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

function formatPollLabel(sec: number): string {
  if (sec < 60) return `${sec} s`;
  if (sec % 60 === 0) return `${sec / 60} min`;
  return `${sec} s`;
}

/** Maps UI segment → API `status` query (empty = all). */
function apiStatusForList(): '' | 'en_cours' | 'pay_en_cours' | 'paye' {
  if (listSegment.value === 'active') return 'en_cours';
  if (listSegment.value === 'pay_in_progress') return 'pay_en_cours';
  if (listSegment.value === 'completed') return 'paye';
  return '';
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

function goDetail(nid: number) {
  void router.push({ name: 'order-mga-detail', params: { nid: String(nid) } });
}

function timeAgo(tsSec: number): string {
  const diff = Date.now() - tsSec * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

function paymentSideLabel(row: OrderMgaRow): string {
  if (row.payment_type === 'mvola') return 'MVOLA';
  if (row.payment_type === 'orange') return 'ORANGE';
  return 'MGA';
}

function paymentSideClass(row: OrderMgaRow): string {
  if (row.payment_type === 'mvola') return 'buy';
  if (row.payment_type === 'orange') return 'orange';
  return 'neu';
}

function statusBadgeClass(row: OrderMgaRow): string {
  const s = rowStatus(row);
  if (s === 'paye' || s === 'pay_en_cours') return 'badge-completed';
  if (s === 'archive') return 'badge-cancelled';
  return 'badge-pending';
}

function proofImgSrc(url: string): string {
  if (url.startsWith('http')) return url;
  return apiUrl(url.replace(/^\//, ''));
}

function formatPayment(t: string | null | undefined): string {
  if (t === 'mvola') return 'MVola';
  if (t === 'orange') return 'Orange Money';
  return '—';
}

/** Montant affiché en ariary (Ar) — pas de libellé type USDT. */
function formatMontantAr(row: OrderMgaRow): string {
  const raw = row.montant;
  if (raw === undefined || raw === null || String(raw).trim() === '') return '—';
  const m = String(raw).trim();
  const cur = String(row.currency ?? '').trim().toUpperCase();
  if (
    cur === '' ||
    cur === 'MGA' ||
    cur === 'ARIARY' ||
    cur === 'AR' ||
    cur === 'USDT'
  ) {
    return `${m} Ar`;
  }
  return `${m} ${row.currency}`;
}

function digitsOnly(s: string | null | undefined): string {
  return String(s ?? '').replace(/\D/g, '');
}

function mvolaItemPayTelHref(row: OrderMgaRow): string | null {
  if (row.payment_type !== 'mvola') return null;
  const phone = digitsOnly(row.phone);
  const montant = digitsOnly(row.montant);
  if (!phone || !montant) return null;
  const ussd = applyMobileUssdPlaceholders(mobileUssdPatterns.value.mvola, phone, montant);
  return `tel:${ussd.replace(/#/g, '%23')}`;
}

function orangeItemPayTelHref(row: OrderMgaRow): string | null {
  if (row.payment_type !== 'orange') return null;
  const phone = digitsOnly(row.phone);
  const montant = digitsOnly(row.montant);
  if (!phone || !montant) return null;
  const ussd = applyMobileUssdPlaceholders(mobileUssdPatterns.value.orange, phone, montant);
  return `tel:${ussd.replace(/#/g, '%23')}`;
}

function ussdDialCodeForRow(row: OrderMgaRow): string | null {
  const phone = digitsOnly(row.phone);
  const montant = digitsOnly(row.montant);
  if (!phone || !montant) return null;
  if (row.payment_type === 'mvola') {
    return applyMobileUssdPlaceholders(mobileUssdPatterns.value.mvola, phone, montant);
  }
  if (row.payment_type === 'orange') {
    return applyMobileUssdPlaceholders(mobileUssdPatterns.value.orange, phone, montant);
  }
  return null;
}

async function copyUssdForRow(row: OrderMgaRow) {
  refreshPatternsFromStorage();
  const code = ussdDialCodeForRow(row);
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      return;
    }
  }
  if (copyUssdFlashTimer) clearTimeout(copyUssdFlashTimer);
  copyUssdFlashNid.value = row.nid;
  copyUssdFlashTimer = setTimeout(() => {
    copyUssdFlashNid.value = null;
    copyUssdFlashTimer = null;
  }, 2000);
}

function formatStatus(s: string | null | undefined): string {
  if (s === 'paye') return 'Payé';
  if (s === 'pay_en_cours') return 'Payé en cours';
  if (s === 'archive') return 'Archivée';
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

async function setOrderStatus(nid: number, status: 'paye' | 'pay_en_cours', askConfirm: boolean, confirmText: string) {
  if (markPayeBusyNid.value !== null) return;
  markPayeError.value = '';
  if (askConfirm && !window.confirm(confirmText)) {
    return;
  }
  markPayeBusyNid.value = nid;
  try {
    const r = await fetch(apiUrl('mga2p2-form/api/order-mga-status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nid, status }),
    });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    await load(true);
  } catch (e: unknown) {
    markPayeError.value = e instanceof Error ? e.message : 'Mise à jour impossible';
  } finally {
    markPayeBusyNid.value = null;
  }
}

async function markPayeDirect(nid: number) {
  await setOrderStatus(nid, 'paye', true, `Marquer la commande #${nid} comme payée ?`);
}

async function onUssdPayClick(row: OrderMgaRow, mode: 'mvola' | 'orange') {
  const href = mode === 'mvola' ? mvolaItemPayTelHref(row) : orangeItemPayTelHref(row);
  if (!href) return;
  const ok = window.confirm(
    `Passer la commande #${row.nid} au statut "Payé en cours" et ouvrir le code USSD ${mode === 'mvola' ? 'MVola' : 'Orange'} ?`,
  );
  if (!ok) return;
  await setOrderStatus(row.nid, 'pay_en_cours', false, '');
  if (!markPayeError.value) {
    window.location.href = href;
  }
}

function formatRemain(row: OrderMgaRow): string {
  if (!paymentWindowActive(row)) {
    return '—';
  }
  const sec = remainingFor(row);
  if (sec <= 0) return 'terminé';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h} h ${mm} min ${s} s`;
  }
  return `${m} min ${s} s`;
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
      r.ok ? `Réponse invalide (JSON). ${snippet}` : `Erreur serveur (${r.status}). ${snippet}`,
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
    refreshPatternsFromStorage();
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', reset ? '0' : String(rows.value.length));
    const st = apiStatusForList();
    if (st) {
      params.set('status', st);
    }
    const q = filterSearch.value.trim();
    if (q) {
      params.set('search', q);
    }
    const r = await fetch(apiUrl(`mga2p2-form/api/orders?${params.toString()}`), { credentials: 'same-origin' });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    const jPayload = j as {
      data?: OrderMgaRow[];
      has_more?: boolean;
    };
    const data = jPayload.data ?? [];
    const hm =
      typeof jPayload.has_more === 'boolean' ? jPayload.has_more : data.length === PAGE_SIZE;
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

watch(listSegment, () => {
  void load(true);
});

watch(filterSearch, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    void load(true);
  }, 400);
});

watch([pollEnabled, pollIntervalSec], () => {
  localStorage.setItem(LS_POLL_ON, pollEnabled.value ? '1' : '0');
  localStorage.setItem(LS_POLL_SEC, String(pollIntervalSec.value));
  syncAutoRefreshTimer();
});

onMounted(() => {
  pushOptedIn.value = isOrderPushOptedIn();
  void resyncOrderMgaWebPushIfOptedIn();
  void load(true);
  syncAutoRefreshTimer();
  tick = setInterval(() => {
    nowSec.value = Math.floor(Date.now() / 1000);
  }, 1000);
});

onUnmounted(() => {
  if (tick) clearInterval(tick);
  if (searchDebounce) clearTimeout(searchDebounce);
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  if (copyUssdFlashTimer) clearTimeout(copyUssdFlashTimer);
});
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.orders-page {
  min-height: 100%;
  background: #0b0e11;
  color: #eaecef;
  max-width: 560px;
  margin: 0 auto;
}

.orders-head {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #0b0e11;
  border-bottom: 1px solid #2b3139;
  padding-bottom: 8px;
}

.orders-head__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px 8px;
}

.orders-head__h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #eaecef;
}

.orders-head__sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: #848e9c;
}

.orders-head__links {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.top-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
}
.top-link--scan {
  color: #f0b90b;
  border-color: rgba(240, 185, 11, 0.45);
  background: rgba(240, 185, 11, 0.08);
}
.top-link--scan:hover {
  filter: brightness(1.08);
}

.link {
  color: #848e9c;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
}
.link:hover {
  color: #f0b90b;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #f0b90b;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.orders-segment {
  display: flex;
  padding: 0 16px 10px;
  gap: 0;
  background: #0b0e11;
}

.seg-btn {
  flex: 1;
  margin: 0;
  padding: 10px 8px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #848e9c;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.seg-btn--on {
  color: #f0b90b;
  border-bottom-color: #f0b90b;
}
.seg-btn:hover:not(.seg-btn--on) {
  color: #eaecef;
}

.poll-toolbar {
  background: #0b0e11;
  padding: 4px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.poll-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.poll-row--second {
  padding-top: 2px;
}
.poll-label {
  font-size: 13px;
  color: #848e9c;
}

.poll-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}
.poll-toggle__inp {
  opacity: 0;
  width: 0;
  height: 0;
}
.poll-toggle__ui {
  position: absolute;
  inset: 0;
  background: #2b3139;
  border-radius: 12px;
  transition: background 0.2s;
}
.poll-toggle__ui::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #848e9c;
  border-radius: 50%;
  transition: transform 0.2s;
}
.poll-toggle__inp:checked + .poll-toggle__ui {
  background: rgba(240, 185, 11, 0.35);
}
.poll-toggle__inp:checked + .poll-toggle__ui::after {
  transform: translateX(20px);
  background: #f0b90b;
}

.poll-select {
  max-width: 140px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #eaecef;
  font-size: 14px;
}

.orders-tools {
  padding: 0 16px 8px;
}
.search-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.search-lbl {
  font-size: 10px;
  font-weight: 700;
  color: #5e6673;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.search-inp {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #eaecef;
  font-size: 14px;
}
.search-inp:focus {
  outline: none;
  border-color: #f0b90b;
}

.push-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.push-hint {
  font-size: 10px;
  color: #5e6673;
  flex: 1 1 100px;
}
.ghost {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #2b3139;
  background: transparent;
  color: #eaecef;
  font-size: 11px;
  cursor: pointer;
}
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.push-btn--off {
  opacity: 0.85;
}

.err {
  color: #f6465d;
  font-size: 11px;
  margin: 0 16px 6px;
}

.orders-body {
  padding-bottom: 24px;
}

.center-spinner {
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}
.spinner {
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
  cursor: pointer;
  transition: border-color 0.2s;
}
.bcard:hover {
  border-color: #3d4f5c;
}
.bcard:active {
  border-color: #f0b90b;
}
.bcard--expired {
  opacity: 0.92;
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
.bcard__side.orange {
  background: rgba(255, 121, 0, 0.15);
  color: #ff7900;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.badge-pending {
  background: rgba(240, 185, 11, 0.12);
  color: #f0b90b;
  border: 1px solid rgba(240, 185, 11, 0.35);
}
.badge-completed {
  background: rgba(14, 203, 129, 0.12);
  color: #0ecb81;
  border: 1px solid rgba(14, 203, 129, 0.35);
}
.badge-cancelled {
  background: rgba(132, 142, 156, 0.12);
  color: #848e9c;
  border: 1px solid #3d4f5c;
}

.bcard__countdown {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(240, 185, 11, 0.08);
  border: 1px solid rgba(240, 185, 11, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: #f0b90b;
}
.bcard__clock {
  flex-shrink: 0;
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
  flex-shrink: 0;
}
.bcard__row .value {
  color: #eaecef;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}
.bcard__row .value.highlight {
  color: #f0b90b;
  font-weight: 700;
}
.bcard__row .mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.bcard__row--proof .value {
  text-align: right;
}
.bcard__thumb {
  display: inline-block;
  max-height: 48px;
  max-width: 120px;
  border-radius: 6px;
  border: 1px solid #2b3139;
  vertical-align: middle;
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
.order-no {
  font-weight: 600;
}

.bcard__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #eaecef;
  cursor: pointer;
  font-family: inherit;
}
.act--mvola {
  border-color: rgba(14, 203, 129, 0.45);
  color: #0ecb81;
  background: rgba(14, 203, 129, 0.1);
}
.act--orange {
  border-color: rgba(255, 121, 0, 0.45);
  color: #ff7900;
  background: rgba(255, 121, 0, 0.1);
}
.act--pay {
  border-color: rgba(14, 203, 129, 0.45);
  color: #0ecb81;
}
.act--muted {
  color: #aeb4bc;
}
.act--detail {
  border-color: #3d4f5c;
  color: #aeb4bc;
}
.act:hover {
  filter: brightness(1.08);
}
.act:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 16px;
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
}
</style>
