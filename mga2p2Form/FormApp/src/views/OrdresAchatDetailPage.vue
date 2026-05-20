<template>
  <div class="wrap">
    <header class="hdr">
      <div class="hdr__left">
        <router-link class="link" :to="{ name: 'ordres-achat' }">← Liste</router-link>
        <h1 v-if="order">Ordre achat</h1>
        <h1 v-else>Détail ordre</h1>
      </div>
    </header>

    <p v-if="loading" class="loading">Chargement…</p>
    <p v-else-if="error" class="err card">{{ error }}</p>

    <template v-else-if="order">
      <section class="card hero">
        <div class="hero__row">
          <span class="bcard__side buy">ACHAT</span>
          <span class="badge" :class="statusBadgeClass(order.status)">{{ order.statusLabel }}</span>
        </div>
        <p class="hero-total">
          {{ formatNum(order.totalPrice) }}
          <span class="muted">{{ displayFiat(order.fiat) }}</span>
        </p>
        <p class="ref mono">#{{ order.orderNumber }}</p>
      </section>

      <div class="list-back">
        <router-link class="btn btn--list" :to="{ name: 'ordres-achat' }">Retour à la liste</router-link>
      </div>

      <section class="card">
        <h3 class="card-title">Détails</h3>
        <dl class="dl">
          <div class="dl__row">
            <dt>N° ordre</dt>
            <dd class="mono wrap-any">{{ order.orderNumber }}</dd>
          </div>
          <div v-if="order.advNo" class="dl__row">
            <dt>Annonce</dt>
            <dd class="mono wrap-any">{{ order.advNo }}</dd>
          </div>
          <div class="dl__row">
            <dt>Créé</dt>
            <dd>{{ formatCreated(order.createTime) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Statut</dt>
            <dd>{{ order.statusLabel }}</dd>
          </div>
          <div class="dl__row">
            <dt>Quantité</dt>
            <dd>{{ formatAmountLine(order) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Total</dt>
            <dd class="highlight">{{ formatNum(order.totalPrice) }} {{ displayFiat(order.fiat) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Prix unitaire</dt>
            <dd>{{ formatNum(order.unitPrice) }} {{ displayFiat(order.fiat) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Contrepartie</dt>
            <dd>{{ sanitizeDisplayText(order.counterparty) || order.counterparty }}</dd>
          </div>
          <div class="dl__row">
            <dt>Paiement</dt>
            <dd>{{ sanitizeDisplayText(order.paymentMethod) || order.paymentMethod }}</dd>
          </div>
          <div v-if="order.commission" class="dl__row">
            <dt>Commission</dt>
            <dd>{{ sanitizeDisplayText(order.commission) || order.commission }}</dd>
          </div>
          <div v-if="order.advertisementRole" class="dl__row">
            <dt>Rôle annonce</dt>
            <dd>{{ sanitizeDisplayText(order.advertisementRole) || order.advertisementRole }}</dd>
          </div>
          <div class="dl__row">
            <dt>Paire</dt>
            <dd>{{ pairLabel(order) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="showMgaMatch" class="card actions">
        <h3 class="card-title">Commandes MGA (montant)</h3>
        <p class="hint">
          Recherche les commandes <strong>en cours</strong> dont le montant (partie entière) correspond au
          total de cet ordre : <strong>{{ montantIntLabel }}</strong>.
        </p>
        <div class="btn-row">
          <button type="button" class="btn btn--primary" :disabled="mgaSearchLoading" @click="searchMgaOrders">
            {{ mgaSearchLoading ? 'Recherche…' : 'Chercher commandes MGA' }}
          </button>
        </div>
        <p v-if="mgaSearchError" class="err-inline">{{ mgaSearchError }}</p>
        <p v-else-if="mgaSearched && !mgaMatches.length" class="hint">
          Aucune commande MGA en cours avec ce montant.
        </p>
        <ul v-if="mgaMatches.length" class="mga-match-list">
          <li v-for="row in mgaMatches" :key="row.nid" class="mga-match-item">
            <div class="mga-match-head">
              <span class="badge badge--en_cours">En cours</span>
              <span class="mga-match-montant">{{ row.montant || '—' }}</span>
            </div>
            <p class="mga-match-meta">
              <span v-if="row.nom">{{ row.nom }}</span>
              <span v-if="row.nom && row.phone"> · </span>
              <span v-if="row.phone" class="mono">{{ row.phone }}</span>
            </p>
            <p v-if="row.reference" class="mga-match-ref mono">Réf. {{ row.reference }}</p>
            <router-link
              class="btn btn--sm"
              :to="{ name: 'order-mga-detail', params: { nid: String(row.nid) } }"
            >
              Ouvrir commande #{{ row.nid }}
            </router-link>
          </li>
        </ul>
      </section>

      <section class="card actions">
        <h3 class="card-title">Actions</h3>
        <div class="btn-row">
          <button type="button" class="btn" @click="copyOrderNumber">Copier le n° ordre</button>
        </div>
        <p v-if="copyHint" class="copy-hint">{{ copyHint }}</p>
      </section>
    </template>

    <p v-else class="err card">Ordre introuvable.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { fetchBuyOrderByNumber, type BinanceOrderRow } from '@/lib/binance';
import { cacheOrdresAchat, getOrdreAchat } from '@/lib/ordresAchatCache';
import { fetchOrderMgaByMontantInt } from '@/lib/orderMgaApi';
import type { OrderMgaRow } from '@/types/orderMga';
import {
  displayFiat,
  formatAmountLine,
  formatCreated,
  formatNum,
  isOpenC2cOrder,
  pairLabel,
  sanitizeDisplayText,
  statusBadgeClass,
  totalPriceInteger,
} from '@/lib/ordresAchatDisplay';

const route = useRoute();
const orderNo = computed(() => decodeURIComponent(String(route.params.orderNo ?? '')));

const order = ref<BinanceOrderRow | null>(null);
const loading = ref(true);
const error = ref('');
const copyHint = ref('');
const mgaSearchLoading = ref(false);
const mgaSearchError = ref('');
const mgaSearched = ref(false);
const mgaMatches = ref<OrderMgaRow[]>([]);

const showMgaMatch = computed(() => order.value != null && isOpenC2cOrder(order.value.status));

const montantIntLabel = computed(() => {
  if (!order.value) return '—';
  return formatNum(totalPriceInteger(order.value.totalPrice));
});

async function load() {
  loading.value = true;
  error.value = '';
  copyHint.value = '';
  const id = orderNo.value.trim();
  if (!id) {
    order.value = null;
    error.value = 'Numéro d’ordre manquant.';
    loading.value = false;
    return;
  }

  let row = getOrdreAchat(id);
  if (!row) {
    try {
      row = await fetchBuyOrderByNumber(id);
      if (row) {
        cacheOrdresAchat([row]);
      }
    }
    catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Échec chargement';
      error.value = sanitizeDisplayText(raw) || 'Échec chargement';
      order.value = null;
      loading.value = false;
      return;
    }
  }

  order.value = row;
  loading.value = false;
}

async function searchMgaOrders() {
  if (!order.value) return;
  const montantInt = totalPriceInteger(order.value.totalPrice);
  if (montantInt < 1) {
    mgaSearchError.value = 'Montant invalide pour la recherche.';
    mgaMatches.value = [];
    mgaSearched.value = true;
    return;
  }
  mgaSearchLoading.value = true;
  mgaSearchError.value = '';
  mgaSearched.value = false;
  try {
    const res = await fetchOrderMgaByMontantInt(montantInt);
    mgaMatches.value = res.data;
    mgaSearched.value = true;
  }
  catch (e: unknown) {
    mgaSearchError.value = e instanceof Error ? e.message : 'Échec recherche';
    mgaMatches.value = [];
    mgaSearched.value = true;
  }
  finally {
    mgaSearchLoading.value = false;
  }
}

async function copyOrderNumber() {
  if (!order.value?.orderNumber) return;
  const text = order.value.orderNumber;
  try {
    await navigator.clipboard.writeText(text);
    copyHint.value = 'Copié dans le presse-papiers.';
  }
  catch {
    copyHint.value = text;
  }
}

watch(order, () => {
  mgaMatches.value = [];
  mgaSearched.value = false;
  mgaSearchError.value = '';
});

onMounted(() => {
  void load();
});
</script>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 14px 12px 32px;
}
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.hdr__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.hdr h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #f0b90b;
}
.link {
  color: #848e9c;
  text-decoration: none;
  font-size: 12px;
}
.link:hover {
  color: #eaecef;
}
.loading {
  padding: 24px 16px;
  color: #848e9c;
  text-align: center;
}
.card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.card-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  color: #848e9c;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.hero__row {
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
}
.bcard__side.buy {
  background: rgba(14, 203, 129, 0.15);
  color: #0ecb81;
}
.badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
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
}
.hero-total {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #f0b90b;
}
.ref {
  margin: 8px 0 0;
  font-size: 11px;
  color: #848e9c;
}
.muted {
  font-size: 14px;
  font-weight: 600;
  color: #848e9c;
}
.list-back {
  margin: 0 0 10px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #eaecef;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.btn--list {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}
.btn--list:hover {
  border-color: #f0b90b;
  color: #f0b90b;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn--primary {
  border-color: #f0b90b;
  background: rgba(240, 185, 11, 0.12);
  color: #f0b90b;
}
.btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--sm {
  margin-top: 8px;
  font-size: 12px;
  padding: 8px 12px;
}
.hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: #848e9c;
}
.hint strong {
  color: #eaecef;
}
.err-inline {
  margin: 10px 0 0;
  font-size: 13px;
  color: #f6465d;
}
.mga-match-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mga-match-item {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
}
.mga-match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.mga-match-montant {
  font-weight: 700;
  color: #f0b90b;
  font-size: 14px;
}
.mga-match-meta {
  margin: 0 0 4px;
  font-size: 12px;
  color: #cfd2d7;
}
.mga-match-ref {
  margin: 0 0 4px;
  font-size: 11px;
  color: #848e9c;
}
.badge--en_cours {
  color: #f0b90b;
  border-color: rgba(240, 185, 11, 0.4);
  background: rgba(240, 185, 11, 0.1);
}
.copy-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #0ecb81;
}
.dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dl__row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 4px 12px;
  font-size: 13px;
  align-items: baseline;
}
.dl__row dt {
  margin: 0;
  color: #848e9c;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.dl__row dd {
  margin: 0;
  color: #eaecef;
  font-weight: 500;
  word-break: break-word;
  text-align: right;
}
.dl__row dd.highlight {
  color: #f0b90b;
  font-weight: 700;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.wrap-any {
  overflow-wrap: anywhere;
}
.err {
  color: #f6465d;
  font-size: 14px;
}
</style>
