<template>
  <div class="wrap">
    <header class="hdr">
      <div class="hdr__left">
        <router-link class="link" :to="{ name: 'annonces' }">← Annonces</router-link>
        <h1>Détail annonce</h1>
      </div>
    </header>

    <p v-if="loading" class="loading">Chargement…</p>
    <p v-else-if="error" class="err card">{{ error }}</p>

    <template v-else-if="ad">
      <section class="card hero">
        <div class="hero__row">
          <span class="bcard__side" :class="sideClass(ad.tradeType)">{{ sideLabel(ad.tradeType) }}</span>
          <span class="status-pill" :class="statusBadgeClass(ad)">
            <span class="status-pill__dot" aria-hidden="true" />
            {{ statusInfo.shortLabel }}
          </span>
        </div>
        <p class="hero-price">
          {{ formatAdPrice(ad.price) }}
          <span class="muted">{{ ad.fiat }}</span>
        </p>
        <div v-if="canEditPrice" class="hero-actions">
          <button type="button" class="btn-edit" @click="openPriceEdit">Modifier le prix</button>
        </div>
        <p v-else-if="source === 'derived'" class="hero-hint">
          Prix issu de l'historique — modification impossible ici.
        </p>
        <p class="ref mono wrap-any">{{ ad.advNo }}</p>
        <p v-if="sourceLabel" class="hero-src">{{ sourceLabel }}</p>
      </section>

      <section class="card">
        <h3 class="card-title">Statut</h3>
        <div class="status-block" :class="`status-block--${statusInfo.kind}`">
          <span class="status-block__dot" aria-hidden="true" />
          <div>
            <p class="status-block__label">{{ statusInfo.label }}</p>
            <p v-if="statusInfo.kind === 'derived'" class="status-block__hint">
              Reconstruit à partir de l'historique des ordres (pas de statut marchand direct).
            </p>
            <p v-else-if="statusInfo.kind === 'online'" class="status-block__hint">
              L'annonce est visible et peut recevoir des ordres.
            </p>
            <p v-else-if="statusInfo.kind === 'offline'" class="status-block__hint">
              L'annonce est masquée ou inactive.
            </p>
          </div>
        </div>
      </section>

      <section class="card">
        <h3 class="card-title">Détails</h3>
        <dl class="dl">
          <div class="dl__row">
            <dt>N° annonce</dt>
            <dd class="mono wrap-any">{{ ad.advNo }}</dd>
          </div>
          <div class="dl__row">
            <dt>Type</dt>
            <dd>{{ sideLabel(ad.tradeType) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Paire</dt>
            <dd>{{ pairLabel(ad) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Prix</dt>
            <dd class="highlight">
              {{ formatAdPrice(ad.price) }} {{ ad.fiat }}
              <button v-if="canEditPrice" type="button" class="btn-edit-inline" @click="openPriceEdit">
                Modifier
              </button>
            </dd>
          </div>
          <div v-if="ad.priceType" class="dl__row">
            <dt>Type prix</dt>
            <dd>{{ ad.priceType }}</dd>
          </div>
          <div v-if="ad.surplusAmount" class="dl__row">
            <dt>Restant</dt>
            <dd>{{ formatAdPrice(ad.surplusAmount) }} {{ ad.asset }}</dd>
          </div>
          <div v-if="ad.initAmount" class="dl__row">
            <dt>Montant initial</dt>
            <dd>{{ formatAdPrice(ad.initAmount) }}</dd>
          </div>
          <div v-if="limitLine(ad)" class="dl__row">
            <dt>Limites</dt>
            <dd>{{ limitLine(ad) }}</dd>
          </div>
          <div v-if="ad.payTimeLimit" class="dl__row">
            <dt>Délai paiement</dt>
            <dd>{{ ad.payTimeLimit }} min</dd>
          </div>
          <div v-if="ad.paymentMethods?.length" class="dl__row">
            <dt>Paiement</dt>
            <dd>{{ ad.paymentMethods.join(', ') }}</dd>
          </div>
          <div v-if="ad.remarks" class="dl__row">
            <dt>Conditions</dt>
            <dd class="remarks">{{ ad.remarks }}</dd>
          </div>
          <div v-if="ad.autoReplyMsg" class="dl__row">
            <dt>Réponse auto</dt>
            <dd class="remarks">{{ ad.autoReplyMsg }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="ad.orderCount" class="card">
        <h3 class="card-title">Historique (dérivé)</h3>
        <dl class="dl">
          <div class="dl__row">
            <dt>Ordres</dt>
            <dd>{{ ad.orderCount }}</dd>
          </div>
          <div class="dl__row">
            <dt>Complétés</dt>
            <dd>{{ ad.completedCount ?? '—' }}</dd>
          </div>
          <div class="dl__row">
            <dt>Annulés</dt>
            <dd>{{ ad.cancelledCount ?? '—' }}</dd>
          </div>
          <div class="dl__row">
            <dt>Taux complétion</dt>
            <dd>{{ pct(ad.completionRate) }}</dd>
          </div>
          <div v-if="ad.totalVolume" class="dl__row">
            <dt>Volume</dt>
            <dd>{{ formatAdPrice(ad.totalVolume) }}</dd>
          </div>
          <div v-if="ad.lastSeen" class="dl__row">
            <dt>Dernière activité</dt>
            <dd>{{ formatSeen(ad.lastSeen) }}</dd>
          </div>
        </dl>
      </section>

      <div class="list-back">
        <router-link class="btn btn--list" :to="{ name: 'annonces' }">Retour à la liste</router-link>
      </div>
    </template>

    <div v-if="priceEditOpen" class="modal-backdrop" @click.self="closePriceEdit">
      <div class="modal modal--wide" role="dialog" aria-labelledby="price-edit-title" aria-modal="true">
        <h2 id="price-edit-title" class="modal__title">Modifier le prix</h2>
        <p class="modal__sub">
          {{ pairLabel(ad!) }} · {{ sideLabel(ad!.tradeType) }}
          <span v-if="marketPrices"> · {{ marketTotalLabel }}</span>
        </p>

        <section class="market-block">
          <div class="market-block__head">
            <h3 class="market-block__title">Prix concurrents P2P</h3>
            <button
              type="button"
              class="btn-refresh"
              :disabled="marketLoading || savingPrice"
              title="Rafraîchir"
              @click="loadMarketPrices"
            >
              ↻
            </button>
          </div>
          <p v-if="marketLoading" class="market-hint">Chargement du carnet P2P…</p>
          <p v-else-if="marketError" class="modal__err">{{ marketError }}</p>
          <p v-else-if="!marketPrices?.lowest.length && !marketPrices?.highest.length" class="market-hint">
            Aucun prix concurrent trouvé pour cette paire.
          </p>
          <div v-else class="market-cols">
            <div class="market-col">
              <h4 class="market-col__title market-col__title--low">5 prix les plus bas</h4>
              <ul class="market-list">
                <li v-for="(row, i) in marketPrices!.lowest" :key="'lo-' + row.advNo + i">
                  <button type="button" class="market-row" @click="applyCompetitorPrice(row.price)">
                    <span class="market-row__rank">{{ i + 1 }}</span>
                    <span class="market-row__price">{{ formatAdPrice(row.price) }} {{ ad!.fiat }}</span>
                    <span class="market-row__meta">{{ row.merchant }}</span>
                  </button>
                </li>
              </ul>
            </div>
            <div class="market-col">
              <h4 class="market-col__title market-col__title--high">5 prix les plus hauts</h4>
              <ul class="market-list">
                <li v-for="(row, i) in marketPrices!.highest" :key="'hi-' + row.advNo + i">
                  <button type="button" class="market-row" @click="applyCompetitorPrice(row.price)">
                    <span class="market-row__rank">{{ i + 1 }}</span>
                    <span class="market-row__price">{{ formatAdPrice(row.price) }} {{ ad!.fiat }}</span>
                    <span class="market-row__meta">{{ row.merchant }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <p v-if="marketPrices && !marketLoading" class="market-foot">
            Cliquez sur un prix pour le reprendre. Votre prix actuel :
            <strong>{{ formatAdPrice(ad!.price) }} {{ ad!.fiat }}</strong>
          </p>
          <router-link
            class="market-full-link"
            :to="{
              name: 'prix-concurrents',
              query: { asset: ad!.asset, fiat: ad!.fiat, side: ad!.tradeType },
            }"
          >
            Voir la liste complète des prix concurrents →
          </router-link>
        </section>

        <label class="modal__field">
          <span class="modal__lbl">Nouveau prix ({{ ad!.fiat }})</span>
          <input
            v-model="priceDraft"
            type="text"
            inputmode="decimal"
            class="modal__inp"
            autocomplete="off"
            :disabled="savingPrice"
            @keydown.enter.prevent="savePrice"
          />
        </label>
        <p v-if="priceEditError" class="modal__err">{{ priceEditError }}</p>
        <p v-if="priceEditSuccess" class="modal__ok">{{ priceEditSuccess }}</p>
        <div class="modal__actions">
          <button type="button" class="btn-modal btn-modal--ghost" :disabled="savingPrice" @click="closePriceEdit">
            Annuler
          </button>
          <button type="button" class="btn-modal btn-modal--primary" :disabled="savingPrice" @click="savePrice">
            {{ savingPrice ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchBinanceAdByAdvNo, fetchBinanceAdMarketPrices, updateBinanceAdPrice } from '@/lib/binanceAds';
import { adStatusKind } from '@/lib/binanceAdsDisplay';
import type { BinanceAdRow, BinanceAdsSource, BinanceMarketPricesResponse } from '@/types/binanceAds';
import {
  adStatusDisplay,
  statusBadgeClass,
  formatAdPrice,
  pairLabel,
  sideLabel,
  sideClass,
  limitLine,
  pct,
  formatSeen,
} from '@/lib/binanceAdsDisplay';

const route = useRoute();
const ad = ref<BinanceAdRow | null>(null);
const source = ref<BinanceAdsSource>('none');
const loading = ref(true);
const error = ref('');
const priceEditOpen = ref(false);
const priceDraft = ref('');
const savingPrice = ref(false);
const priceEditError = ref('');
const priceEditSuccess = ref('');
const marketLoading = ref(false);
const marketError = ref('');
const marketPrices = ref<BinanceMarketPricesResponse | null>(null);

const statusInfo = computed(() => (ad.value ? adStatusDisplay(ad.value) : { kind: 'unknown' as const, label: '—', shortLabel: '—' }));

const canEditPrice = computed(() => {
  if (!ad.value || source.value !== 'agent') return false;
  const kind = adStatusKind(ad.value);
  return kind === 'online' || kind === 'offline' || kind === 'unknown';
});

const sourceLabel = computed(() => {
  if (source.value === 'agent') return 'Source : API marchand';
  if (source.value === 'derived') return 'Source : historique ordres';
  return '';
});

const marketTotalLabel = computed(() => {
  if (!marketPrices.value) return '';
  const src = marketPrices.value.source === 'agent' ? 'API marchand' : marketPrices.value.source === 'public' ? 'P2P public' : '';
  return `${marketPrices.value.total} annonce(s)${src ? ` · ${src}` : ''}`;
});

async function load() {
  const advNo = String(route.params.advNo ?? '').trim();
  if (!advNo) {
    error.value = 'N° annonce manquant.';
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  ad.value = null;
  try {
    const asset = typeof route.query.asset === 'string' ? route.query.asset : 'USDT';
    const fiat = typeof route.query.fiat === 'string' ? route.query.fiat : 'MGA';
    const res = await fetchBinanceAdByAdvNo(advNo, { asset, fiat });
    source.value = res.source;
    if (res.ad) {
      ad.value = res.ad;
    }
    else {
      error.value = res.error || 'Annonce introuvable.';
    }
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Échec chargement';
  }
  finally {
    loading.value = false;
  }
}

async function loadMarketPrices() {
  if (!ad.value) return;
  marketLoading.value = true;
  marketError.value = '';
  try {
    marketPrices.value = await fetchBinanceAdMarketPrices({
      asset: ad.value.asset,
      fiat: ad.value.fiat,
      tradeType: ad.value.tradeType,
      advNo: ad.value.advNo,
    });
    if (marketPrices.value.error && marketPrices.value.total === 0) {
      marketError.value = marketPrices.value.error;
    }
  }
  catch (e: unknown) {
    marketError.value = e instanceof Error ? e.message : 'Échec chargement marché';
    marketPrices.value = null;
  }
  finally {
    marketLoading.value = false;
  }
}

function applyCompetitorPrice(price: string) {
  priceDraft.value = String(price).replace(',', '.');
  priceEditError.value = '';
}

function openPriceEdit() {
  if (!ad.value) return;
  priceDraft.value = String(ad.value.price ?? '').replace(',', '.');
  priceEditError.value = '';
  priceEditSuccess.value = '';
  marketError.value = '';
  marketPrices.value = null;
  priceEditOpen.value = true;
  void loadMarketPrices();
}

function closePriceEdit() {
  if (savingPrice.value) return;
  priceEditOpen.value = false;
  priceEditError.value = '';
  priceEditSuccess.value = '';
  marketPrices.value = null;
  marketError.value = '';
}

async function savePrice() {
  if (!ad.value || savingPrice.value) return;
  const raw = priceDraft.value.trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) {
    priceEditError.value = 'Saisissez un prix valide (> 0).';
    return;
  }

  const prev = formatAdPrice(ad.value.price);
  const next = formatAdPrice(raw);
  if (!window.confirm(`Confirmer le nouveau prix ?\n\n${prev} → ${next} ${ad.value.fiat}`)) {
    return;
  }

  savingPrice.value = true;
  priceEditError.value = '';
  priceEditSuccess.value = '';

  const asset = typeof route.query.asset === 'string' ? route.query.asset : ad.value.asset;
  const fiat = typeof route.query.fiat === 'string' ? route.query.fiat : ad.value.fiat;

  try {
    const res = await updateBinanceAdPrice({
      advNo: ad.value.advNo,
      price: raw,
      asset,
      fiat,
    });
    if (res.ad) {
      ad.value = res.ad;
    }
    else {
      ad.value = { ...ad.value, price: raw };
    }
    priceEditSuccess.value = res.message || 'Prix mis à jour.';
    setTimeout(() => {
      closePriceEdit();
    }, 600);
  }
  catch (e: unknown) {
    priceEditError.value = e instanceof Error ? e.message : 'Échec de la mise à jour';
  }
  finally {
    savingPrice.value = false;
  }
}

watch(() => route.params.advNo, () => {
  void load();
});

onMounted(() => {
  void load();
});
</script>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}
.hdr {
  margin-bottom: 16px;
}
.hdr__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hdr h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #f0b90b;
}
.link {
  font-size: 14px;
  color: #848e9c;
  text-decoration: none;
}
.link:hover {
  color: #f0b90b;
}
.loading {
  color: #848e9c;
  padding: 24px 0;
}
.card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.hero__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
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
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
}
.status-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-pill--online {
  background: rgba(14, 203, 129, 0.15);
  color: #0ecb81;
}
.status-pill--online .status-pill__dot {
  background: #0ecb81;
  box-shadow: 0 0 6px rgba(14, 203, 129, 0.8);
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
.hero-price {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #eaecef;
}
.hero-price .muted {
  font-size: 16px;
  font-weight: 600;
  color: #848e9c;
}
.ref {
  margin: 8px 0 0;
  font-size: 12px;
  color: #848e9c;
}
.hero-src {
  margin: 8px 0 0;
  font-size: 12px;
  color: #5e6673;
}
.hero-actions {
  margin-top: 12px;
}
.hero-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #848e9c;
}
.btn-edit {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(240, 185, 11, 0.5);
  background: rgba(240, 185, 11, 0.12);
  color: #f0b90b;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.btn-edit:hover {
  background: rgba(240, 185, 11, 0.2);
}
.btn-edit-inline {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(240, 185, 11, 0.15);
  color: #f0b90b;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  vertical-align: middle;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal {
  width: 100%;
  max-width: 400px;
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.modal--wide {
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal__title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
  color: #f0b90b;
}
.modal__sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: #848e9c;
}
.modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.modal__lbl {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #848e9c;
}
.modal__inp {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 18px;
  font-weight: 600;
}
.modal__inp:disabled {
  opacity: 0.6;
}
.modal__err {
  margin: 0 0 10px;
  font-size: 13px;
  color: #f6465d;
}
.modal__ok {
  margin: 0 0 10px;
  font-size: 13px;
  color: #0ecb81;
}
.modal__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn-modal {
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #2b3139;
}
.btn-modal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-modal--ghost {
  background: #13161a;
  color: #eaecef;
}
.btn-modal--primary {
  background: rgba(240, 185, 11, 0.15);
  border-color: rgba(240, 185, 11, 0.45);
  color: #f0b90b;
}
.market-block {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #2b3139;
  background: #13161a;
}
.market-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.market-block__title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #848e9c;
}
.btn-refresh {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #1e2329;
  color: #eaecef;
  cursor: pointer;
  font-size: 16px;
}
.btn-refresh:disabled {
  opacity: 0.45;
}
.market-hint {
  margin: 0;
  font-size: 12px;
  color: #848e9c;
}
.market-foot {
  margin: 10px 0 0;
  font-size: 11px;
  color: #5e6673;
  line-height: 1.45;
}
.market-foot strong {
  color: #f0b90b;
}
.market-full-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #f0b90b;
  text-decoration: none;
}
.market-full-link:hover {
  text-decoration: underline;
}
.market-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 520px) {
  .market-cols {
    grid-template-columns: 1fr;
  }
}
.market-col__title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
}
.market-col__title--low {
  color: #0ecb81;
}
.market-col__title--high {
  color: #f6465d;
}
.market-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.market-row {
  display: grid;
  grid-template-columns: 22px 1fr;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #1e2329;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.market-row:hover {
  border-color: rgba(240, 185, 11, 0.45);
  background: #252a31;
}
.market-row__rank {
  grid-row: 1 / span 2;
  align-self: center;
  font-size: 11px;
  font-weight: 800;
  color: #848e9c;
}
.market-row__price {
  font-size: 13px;
  font-weight: 700;
  color: #eaecef;
}
.market-row__meta {
  grid-column: 2;
  font-size: 10px;
  color: #848e9c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #848e9c;
}
.status-block {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #2b3139;
}
.status-block__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.status-block--online {
  background: rgba(14, 203, 129, 0.08);
  border-color: rgba(14, 203, 129, 0.35);
}
.status-block--online .status-block__dot {
  background: #0ecb81;
  box-shadow: 0 0 8px rgba(14, 203, 129, 0.7);
}
.status-block--offline {
  background: rgba(132, 142, 156, 0.08);
}
.status-block--offline .status-block__dot {
  background: #848e9c;
}
.status-block--closed {
  background: rgba(246, 70, 93, 0.08);
  border-color: rgba(246, 70, 93, 0.35);
}
.status-block--closed .status-block__dot {
  background: #f6465d;
}
.status-block--derived,
.status-block--unknown {
  background: rgba(240, 185, 11, 0.06);
  border-color: rgba(240, 185, 11, 0.3);
}
.status-block--derived .status-block__dot,
.status-block--unknown .status-block__dot {
  background: #f0b90b;
}
.status-block__label {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #eaecef;
}
.status-block__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #848e9c;
  line-height: 1.45;
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
}
.dl__row dd {
  margin: 0;
  color: #eaecef;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}
.dl__row dd.highlight {
  color: #f0b90b;
  font-weight: 700;
}
.remarks {
  text-align: left !important;
  line-height: 1.45;
  color: #aeb4bc !important;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.wrap-any {
  overflow-wrap: anywhere;
}
.list-back {
  margin-top: 8px;
}
.btn--list {
  display: inline-block;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #f0b90b;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
}
.err {
  color: #f6465d;
}
</style>
