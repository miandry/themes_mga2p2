<template>
  <div class="wrap">
    <header class="hdr">
      <div class="hdr__left">
        <router-link class="link" to="/orders">← Liste</router-link>
        <h1 v-if="order">Commande #{{ order.nid }}</h1>
        <h1 v-else>Commande</h1>
      </div>
      <router-link class="link" to="/">Reçu</router-link>
    </header>

    <section class="card push-card">
      <div class="push-row">
        <button type="button" class="btn btn--push" :disabled="pushBusy" @click="onPushEnable">
          {{ pushBusy ? '…' : 'Notifications (statut)' }}
        </button>
        <button
          v-if="pushOptedIn"
          type="button"
          class="btn btn--push-off"
          :disabled="pushBusy"
          @click="onPushDisable"
        >
          Désactiver
        </button>
        <span v-if="pushHint" class="push-hint">{{ pushHint }}</span>
      </div>
    </section>

    <p v-if="loading" class="loading">Chargement…</p>
    <p v-else-if="error" class="err card">{{ error }}</p>
    <template v-else-if="order">
      <section class="card hero">
        <div class="hero__row">
          <span class="badge" :class="'badge--' + rowStatus(order)">{{ formatStatus(order.status) }}</span>
          <span
            :class="[
              'remain',
              isPaymentWindowExpired(order) ? 'remain--expired' : '',
              !paymentWindowActive(order) ? 'remain--frozen' : '',
            ]"
          >
            {{ formatRemain(order) }}
          </span>
        </div>
        <h2 class="title">{{ order.title }}</h2>
        <p v-if="order.reference" class="ref mono">{{ order.reference }}</p>
      </section>

      <div class="list-back">
        <router-link class="btn btn--list" :to="{ name: 'orders-mga' }">Retour à la liste</router-link>
      </div>

      <section class="card">
        <h3 class="card-title">Détails</h3>
        <dl class="dl">
          <div class="dl__row">
            <dt>Créé</dt>
            <dd class="mono">{{ formatCreated(order.created) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Montant</dt>
            <dd>{{ order.montant || '—' }}<span v-if="order.currency" class="muted"> {{ order.currency }}</span></dd>
          </div>
          <div v-if="order.nom" class="dl__row">
            <dt>Nom</dt>
            <dd>{{ order.nom }}</dd>
          </div>
          <div class="dl__row">
            <dt>Téléphone</dt>
            <dd class="mono">{{ order.phone || '—' }}</dd>
          </div>
          <div class="dl__row">
            <dt>Référence</dt>
            <dd class="mono">{{ order.reference || '—' }}</dd>
          </div>
          <div class="dl__row">
            <dt>Paiement</dt>
            <dd>{{ formatPayment(order.payment_type) }}</dd>
          </div>
          <div class="dl__row">
            <dt>Fenêtre</dt>
            <dd class="mono">{{ order.remain_minutes }} min</dd>
          </div>
          <div v-if="order.bank_name" class="dl__row">
            <dt>Opérateur</dt>
            <dd>{{ order.bank_name }}</dd>
          </div>
          <div v-if="order.receipt_filename" class="dl__row">
            <dt>Fichier reçu</dt>
            <dd class="mono wrap-any">{{ order.receipt_filename }}</dd>
          </div>
          <div v-if="order.payment_proof_url" class="dl__row dl__row--block">
            <dt>Preuve de paiement</dt>
            <dd class="proof-dd">
              <img :src="proofImgSrc(order.payment_proof_url)" alt="Preuve de paiement" class="proof-img" />
            </dd>
          </div>
          <div v-if="order.user_info" class="dl__row dl__row--block">
            <dt>Infos utilisateur</dt>
            <dd class="pre">{{ order.user_info }}</dd>
          </div>
        </dl>
      </section>

      <section class="card actions">
        <h3 class="card-title">Statut</h3>
        <p class="hint">
          « Marquer payé » ouvre le choix d’une image (preuve de paiement), enregistrée sur la commande. Les autres actions
          restent sans pièce jointe.
        </p>
        <input
          ref="proofInputRef"
          type="file"
          class="proof-file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          tabindex="-1"
          aria-hidden="true"
          @change="onPaymentProofChosen"
        />
        <div class="btn-row">
          <button
            v-if="rowStatus(order) !== 'paye'"
            type="button"
            class="btn btn--pay"
            :disabled="saving"
            @click="openPaymentProofPicker"
          >
            Marquer payé
          </button>
          <button
            v-if="rowStatus(order) !== 'archive'"
            type="button"
            class="btn btn--archive"
            :disabled="saving"
            @click="confirmAndSet('archive')"
          >
            Archiver
          </button>
          <button
            v-if="rowStatus(order) !== 'en_cours'"
            type="button"
            class="btn btn--draft"
            :disabled="saving"
            @click="confirmAndSet('en_cours')"
          >
            En cours
          </button>
        </div>
        <p v-if="saveError" class="err">{{ saveError }}</p>
      </section>

      <p class="foot">
        <a class="link" :href="nodeHref(order.path)">Voir sur Drupal →</a>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiUrl } from '@/lib/apiUrl';
import type { OrderMgaRow } from '@/types/orderMga';
import {
  isOrderPushOptedIn,
  registerOrderMgaWebPush,
  resyncOrderMgaWebPushIfOptedIn,
  unregisterOrderMgaWebPush,
} from '@/lib/orderPush';

const route = useRoute();
const nid = computed(() => String(route.params.nid || '').replace(/\D/g, ''));

const order = ref<OrderMgaRow | null>(null);
const loading = ref(true);
const error = ref('');
const saveError = ref('');
const saving = ref(false);
const pushBusy = ref(false);
const pushHint = ref('');
const pushOptedIn = ref(isOrderPushOptedIn());
const proofInputRef = ref<HTMLInputElement | null>(null);
const nowSec = ref(Math.floor(Date.now() / 1000));
let tick: ReturnType<typeof setInterval> | null = null;

function nodeHref(path: string): string {
  if (path.startsWith('http')) return path;
  return apiUrl(path.replace(/^\//, ''));
}

function formatPayment(t: string | null | undefined): string {
  if (t === 'mvola') return 'MVola';
  if (t === 'orange') return 'Orange Money';
  return '—';
}

function formatStatus(s: string | null | undefined): string {
  if (s === 'paye') return 'Payé';
  if (s === 'archive') return 'Archive';
  return 'En cours';
}

function formatCreated(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function rowStatus(row: OrderMgaRow): string {
  return row.status && row.status !== '' ? row.status : 'en_cours';
}

function paymentWindowActive(row: OrderMgaRow): boolean {
  return rowStatus(row) === 'en_cours';
}

function remainingFor(row: OrderMgaRow): number {
  return Math.max(0, row.deadline - nowSec.value);
}

function isPaymentWindowExpired(row: OrderMgaRow): boolean {
  return paymentWindowActive(row) && remainingFor(row) <= 0;
}

function formatRemain(row: OrderMgaRow): string {
  if (!paymentWindowActive(row)) return '—';
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

function confirmMessage(next: 'en_cours' | 'archive'): string {
  if (next === 'archive') {
    return `Archiver la commande #${nid.value} ?`;
  }
  return `Remettre la commande #${nid.value} au statut « En cours » ?`;
}

function proofImgSrc(url: string): string {
  if (url.startsWith('http')) return url;
  return apiUrl(url.replace(/^\//, ''));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function openPaymentProofPicker() {
  if (!order.value || saving.value) return;
  proofInputRef.value?.click();
}

async function onPaymentProofChosen(ev: Event) {
  const el = ev.target as HTMLInputElement;
  const f = el.files?.[0];
  el.value = '';
  if (!f || !order.value || saving.value) return;
  if (
    !window.confirm(
      `Marquer la commande #${order.value.nid} comme payée et enregistrer cette image comme preuve ?\n\n${f.name} (${formatFileSize(f.size)})`,
    )
  ) {
    return;
  }
  saving.value = true;
  saveError.value = '';
  try {
    const fd = new FormData();
    fd.append('image', f);
    const r = await fetch(apiUrl(`mga2p2-form/api/order-mga/${order.value.nid}/mark-paye-proof`), {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
    });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    await load();
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'Mise à jour impossible';
  } finally {
    saving.value = false;
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

async function load() {
  const id = nid.value;
  if (!id) {
    error.value = 'Identifiant de commande invalide.';
    loading.value = false;
    order.value = null;
    return;
  }
  loading.value = true;
  error.value = '';
  saveError.value = '';
  try {
    const r = await fetch(apiUrl(`mga2p2-form/api/order-mga/${id}`), { credentials: 'same-origin' });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    order.value = (j as { data?: OrderMgaRow }).data ?? null;
    if (!order.value) throw new Error('Données absentes.');
    nowSec.value = Math.floor(Date.now() / 1000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible';
    order.value = null;
  } finally {
    loading.value = false;
  }
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

async function confirmAndSet(next: 'en_cours' | 'archive') {
  if (!order.value || saving.value) return;
  if (!window.confirm(confirmMessage(next))) return;
  saving.value = true;
  saveError.value = '';
  try {
    const r = await fetch(apiUrl('mga2p2-form/api/order-mga-status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nid: order.value.nid, status: next }),
    });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    await load();
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'Mise à jour impossible';
  } finally {
    saving.value = false;
  }
}

watch(
  nid,
  () => {
    void load();
  },
  { immediate: true },
);

onMounted(() => {
  pushOptedIn.value = isOrderPushOptedIn();
  void resyncOrderMgaWebPushIfOptedIn();
  tick = setInterval(() => {
    nowSec.value = Math.floor(Date.now() / 1000);
  }, 1000);
});

onUnmounted(() => {
  if (tick) clearInterval(tick);
});
</script>

<style scoped>
.wrap {
  max-width: 560px;
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
.push-card {
  padding: 10px 12px;
  margin-bottom: 10px;
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
  flex: 1 1 120px;
  min-width: 0;
}
.btn--push {
  border-color: rgba(132, 142, 156, 0.35);
  color: #aeb4bc;
}
.btn--push-off {
  border-color: #3d4f5c;
  color: #848e9c;
}
.link {
  color: #848e9c;
  text-decoration: none;
  font-size: 12px;
}
.link:hover {
  color: #eaecef;
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
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}
.badge {
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
.badge--en_cours {
  color: #f0b90b;
  border-color: rgba(240, 185, 11, 0.4);
  background: rgba(240, 185, 11, 0.1);
}
.badge--paye {
  color: #0ecb81;
  border-color: rgba(14, 203, 129, 0.35);
  background: rgba(14, 203, 129, 0.1);
}
.badge--archive {
  color: #848e9c;
  border-color: #3d4f5c;
}
.remain {
  font-size: 12px;
  font-weight: 800;
  color: #0ecb81;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.remain--expired {
  color: #848e9c;
  font-weight: 600;
  font-size: 11px;
}
.remain--frozen {
  color: #848e9c;
  font-weight: 600;
  font-size: 11px;
}
.title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #eaecef;
  line-height: 1.35;
}
.ref {
  margin: 6px 0 0;
  font-size: 10px;
  color: #848e9c;
}
.list-back {
  margin: 0 0 10px;
}
.btn--list {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  text-decoration: none;
  border-color: #3d4f5c;
  color: #848e9c;
}
.btn--list:hover {
  color: #eaecef;
  border-color: #f0b90b;
  background: rgba(240, 185, 11, 0.08);
}
.dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dl__row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 4px 10px;
  font-size: 11px;
  align-items: baseline;
}
.dl__row--block {
  grid-template-columns: 1fr;
}
.dl__row dt {
  margin: 0;
  color: #848e9c;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.dl__row dd {
  margin: 0;
  color: #eaecef;
  font-weight: 500;
  word-break: break-word;
}
.pre {
  white-space: pre-wrap;
  font-size: 11px;
  line-height: 1.4;
}
.wrap-any {
  overflow-wrap: anywhere;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: #aeb4bc;
}
.muted {
  color: #848e9c;
  font-size: 10px;
}
.actions .hint {
  margin: 0 0 10px;
  font-size: 10px;
  color: #5e6673;
  line-height: 1.4;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn {
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #2b3139;
  background: #13161a;
  color: #eaecef;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--pay {
  border-color: rgba(14, 203, 129, 0.45);
  background: rgba(14, 203, 129, 0.12);
  color: #0ecb81;
}
.btn--archive {
  border-color: #3d4f5c;
  color: #848e9c;
}
.btn--draft {
  border-color: rgba(240, 185, 11, 0.35);
  background: rgba(240, 185, 11, 0.1);
  color: #f0b90b;
}
.loading {
  color: #848e9c;
  font-size: 12px;
  padding: 20px 8px;
  text-align: center;
}
.err {
  color: #f6465d;
  font-size: 11px;
  margin: 0;
}
.proof-file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}
.proof-dd {
  margin-top: 4px;
}
.proof-img {
  display: block;
  max-width: 100%;
  max-height: 280px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  object-fit: contain;
}
.foot {
  margin: 8px 0 0;
  text-align: center;
}
@media (max-width: 400px) {
  .dl__row {
    grid-template-columns: 1fr;
  }
}
</style>
