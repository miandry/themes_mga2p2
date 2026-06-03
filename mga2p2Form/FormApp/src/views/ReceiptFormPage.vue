<template>
  <div class="wrap">
    <header class="hdr">
      <h1>Receipt scan</h1>
      <nav class="nav-links">
        <a class="link" :href="p2pHome">← App P2P</a>
      </nav>
    </header>

    <section class="card">
      <h2>Upload image</h2>
      <p class="hint">JPEG, PNG ou WebP — max 8 Mo. Analysez l’image, complétez le formulaire, puis enregistrez.</p>
      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': dropActive }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <p class="drop-zone__lead">
          <span class="drop-zone__ico" aria-hidden="true">↓</span>
          Glisser-déposer une image ici
        </p>
        <p class="drop-zone__or">ou</p>
        <label class="file-label">
          <input type="file" accept="image/jpeg,image/png,image/webp" class="file-input" @change="onFile" />
          <span class="file-btn">Choisir un fichier</span>
        </label>
      </div>
      <div v-if="fileName" class="fname">{{ fileName }}</div>
      <div v-if="previewUrl" class="preview-wrap">
        <button
          type="button"
          class="preview-btn"
          aria-label="Agrandir l’aperçu"
          @click="previewLightboxOpen = true"
        >
          <img :src="previewUrl" alt="" class="preview" />
        </button>
        <p class="preview-hint">Cliquer l’image pour l’afficher en grand.</p>
      </div>
      <button type="button" class="primary" :disabled="!file || loadingAnalyze" @click="runAnalyze">
        {{ loadingAnalyze ? 'Analyse de l’image…' : 'Analyser l’image' }}
      </button>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section v-if="extractedPreview" class="card preview-card">
      <h2>Saisie avant enregistrement</h2>
      <p class="hint subtle">Les champs sont préremplis à partir de l’image ; vous pouvez les corriger.</p>

      <div class="form-grid">
        <label class="field">
          <span class="lbl">Montant</span>
          <input v-model="formMontant" type="text" class="inp" autocomplete="off" />
        </label>
        <label class="field">
          <span class="lbl">Téléphone</span>
          <input v-model="formPhone" type="text" class="inp" autocomplete="tel" />
        </label>
        <label class="field">
          <span class="lbl">Nom</span>
          <input v-model="formName" type="text" class="inp" autocomplete="name" />
        </label>
        <label class="field">
          <span class="lbl">Type de paiement</span>
          <select v-model="formPaymentType" class="inp sel">
            <option value="">— Choisir —</option>
            <option value="mvola">MVola</option>
            <option value="orange">Orange Money</option>
          </select>
        </label>
        <label class="field">
          <span class="lbl">Temps restant (minutes)</span>
          <input v-model.number="formRemainMinutes" type="number" min="1" max="600" class="inp" />
        </label>
        <label class="field">
          <span class="lbl">Référence</span>
          <input v-model="formReference" type="text" class="inp" autocomplete="off" />
        </label>
        <label class="field">
          <span class="lbl">Devise</span>
          <input v-model="formCurrency" type="text" class="inp" autocomplete="off" placeholder="MGA, EUR…" />
        </label>
        <label class="field full">
          <span class="lbl">Banque / opérateur</span>
          <input v-model="formBankName" type="text" class="inp" autocomplete="off" placeholder="Surcharge si besoin (sinon selon type de paiement à l’enregistrement)" />
        </label>
        <label class="field full">
          <span class="lbl">Infos utilisateur</span>
          <textarea v-model="formUserInfo" class="inp ta" rows="3" placeholder="Notes, contexte, etc."></textarea>
        </label>
        <div v-if="extractedPreview" class="field full ro-field">
          <span class="lbl">Fichier (image analysée)</span>
          <div class="ro-val">{{ extractedPreview.filename }}</div>
        </div>
      </div>

      <button type="button" class="primary save-btn" :disabled="loadingSave" @click="runSave">
        {{ loadingSave ? 'Enregistrement…' : 'Enregistrer en base de données' }}
      </button>
      <p v-if="saveNotice" class="hint save-notice">{{ saveNotice }}</p>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="duplicateModal"
      class="dup-backdrop"
      role="presentation"
      @click.self="closeDuplicateModal"
    >
      <div
        class="dup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-title"
        @click.stop
      >
        <h3 id="dup-title" class="dup-title">Doublon (même nom de fichier image)</h3>
        <p class="dup-intro">
          Cette image est déjà enregistrée dans l’historique
          <span class="mono">#{{ duplicateModal.first_id }}</span>
          — {{ formatDate(duplicateModal.first_created) }}.
        </p>
        <p class="dup-intro dup-intro--sub">
          Comparez le <strong>premier enregistrement</strong> avec <strong>votre saisie</strong> (montant, téléphone, nom), puis choisissez une action.
        </p>
        <table class="dup-cmp" aria-label="Comparaison montant, téléphone, nom">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Premier enregistrement</th>
              <th scope="col">Votre saisie</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Montant</th>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_montant, formMontant) }">
                {{ displayField(duplicateModal.first_montant) }}
              </td>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_montant, formMontant) }">
                {{ displayField(formMontant) }}
              </td>
            </tr>
            <tr>
              <th scope="row">Téléphone</th>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_phone, formPhone) }">
                {{ displayField(duplicateModal.first_phone) }}
              </td>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_phone, formPhone) }">
                {{ displayField(formPhone) }}
              </td>
            </tr>
            <tr>
              <th scope="row">Nom</th>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_name, formName) }">
                {{ displayField(duplicateModal.first_name) }}
              </td>
              <td :class="{ 'dup-cell--diff': !sameField(duplicateModal.first_name, formName) }">
                {{ displayField(formName) }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="duplicateJustCopied" class="dup-note">
          Les champs montant, téléphone et nom du premier enregistrement ont été copiés dans le formulaire.
          Le nom de fichier reste bloqué tant que vous n’utilisez pas une autre image (ou un autre nom de fichier).
        </p>
        <div class="dup-actions">
          <button type="button" class="ghost" @click="closeDuplicateModal">Annuler</button>
          <button type="button" class="ghost" @click="applyFirstFieldsFromDuplicateModal">Copier le premier enregistrement</button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="previewLightboxOpen && previewUrl"
      class="img-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu en grand"
      @click.self="previewLightboxOpen = false"
    >
      <button
        type="button"
        class="img-lightbox-close"
        aria-label="Fermer"
        @click="previewLightboxOpen = false"
      >
        ×
      </button>
      <img :src="previewUrl" alt="Aperçu du reçu" class="img-lightbox-img" @click.stop />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '@/lib/apiUrl';

const router = useRouter();

async function parseJsonResponse(r: Response): Promise<unknown> {
  const text = await r.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(
      r.ok
        ? `Réponse invalide (pas JSON). ${snippet}`
        : `Erreur serveur (${r.status}). ${snippet}`,
    );
  }
}

function strFromExtracted(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}

/** Same prefix rules as AiReceiptExtractor (Madagascar P2P). Phone wins over bank_name. */
function inferPaymentTypeFromMgPhone(phone: string): '' | 'mvola' | 'orange' {
  let d = phone.replace(/\D+/g, '');
  if (d.startsWith('261')) d = d.slice(3);
  if (d.length >= 3 && d.startsWith('0')) {
    const p3 = d.slice(0, 3);
    if (p3 === '032' || p3 === '037') return 'orange';
    if (p3 === '034' || p3 === '038') return 'mvola';
    return '';
  }
  if (d.length >= 2 && d.startsWith('3')) {
    const p3 = `0${d.slice(0, 2)}`;
    if (p3 === '032' || p3 === '037') return 'orange';
    if (p3 === '034' || p3 === '038') return 'mvola';
  }
  return '';
}

function inferMgBankDisplayFromPhone(phone: string): string {
  const t = inferPaymentTypeFromMgPhone(phone);
  if (t === 'mvola') return 'MVola';
  if (t === 'orange') return 'Orange Money';
  return '';
}

function guessPaymentType(extracted: Record<string, unknown>): '' | 'mvola' | 'orange' {
  const fromPhone = inferPaymentTypeFromMgPhone(strFromExtracted(extracted.phone));
  if (fromPhone) return fromPhone;
  const bank = strFromExtracted(extracted.bank_name).toLowerCase();
  if (bank.includes('mvola') || bank.includes('m-vola')) return 'mvola';
  if (bank.includes('orange')) return 'orange';
  return '';
}

const file = ref<File | null>(null);
const fileName = ref('');
const previewUrl = ref('');
const previewLightboxOpen = ref(false);
const loadingAnalyze = ref(false);
const loadingSave = ref(false);
const error = ref('');
const saveNotice = ref('');
const extractedPreview = ref<{ extracted: Record<string, unknown>; filename: string } | null>(null);

const formMontant = ref('');
const formPhone = ref('');
const formName = ref('');
const formReference = ref('');
const formCurrency = ref('');
const formBankName = ref('');
const formPaymentType = ref<'' | 'mvola' | 'orange'>('');
const formRemainMinutes = ref(20);
const formUserInfo = ref('');

type DuplicateModalPayload = {
  first_id: number;
  first_created: number;
  first_montant: string | null;
  first_phone: string | null;
  first_name: string | null;
};

const duplicateModal = ref<DuplicateModalPayload | null>(null);
const duplicateJustCopied = ref(false);
const dropActive = ref(false);

const ACCEPT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

let dragDepth = 0;

const p2pHome = apiUrl('dashboard');

function resetForm() {
  formMontant.value = '';
  formPhone.value = '';
  formName.value = '';
  formReference.value = '';
  formCurrency.value = '';
  formBankName.value = '';
  formPaymentType.value = '';
  formRemainMinutes.value = 20;
  formUserInfo.value = '';
  saveNotice.value = '';
}

function initFormFromExtracted(extracted: Record<string, unknown>) {
  formMontant.value = strFromExtracted(extracted.montant);
  const phone = strFromExtracted(extracted.phone);
  formPhone.value = phone;
  formName.value = strFromExtracted(extracted.name);
  formReference.value = strFromExtracted(extracted.reference);
  formCurrency.value = strFromExtracted(extracted.currency);
  const inferredBank = inferMgBankDisplayFromPhone(phone);
  formBankName.value = inferredBank || strFromExtracted(extracted.bank_name);
  formPaymentType.value = guessPaymentType(extracted);
  formRemainMinutes.value = 20;
  formUserInfo.value = '';
}

function onPreviewLightboxEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    previewLightboxOpen.value = false;
  }
}

watch(previewLightboxOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onPreviewLightboxEscape);
  } else {
    window.removeEventListener('keydown', onPreviewLightboxEscape);
  }
});

function applySelectedFile(f: File) {
  if (!ACCEPT_IMAGE_TYPES.includes(f.type)) {
    error.value = 'Format non accepté. Utilisez JPEG, PNG ou WebP.';
    return;
  }
  if (f.size > MAX_IMAGE_BYTES) {
    error.value = 'Fichier trop volumineux (max 8 Mo).';
    return;
  }
  file.value = f;
  fileName.value = f.name;
  extractedPreview.value = null;
  error.value = '';
  resetForm();
  previewLightboxOpen.value = false;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(f);
}

function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) applySelectedFile(f);
}

function onDragEnter() {
  dragDepth++;
  dropActive.value = true;
}

function onDragOver() {
  dropActive.value = true;
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropActive.value = false;
}

function onDrop(ev: DragEvent) {
  dragDepth = 0;
  dropActive.value = false;
  const f = ev.dataTransfer?.files?.[0];
  if (f) applySelectedFile(f);
}

type BinanceSaveMeta = {
  status?: string;
  order_number?: string;
  candidates?: number;
  message?: string;
};

/** Reads `binance` from order-save / receipt-save JSON and updates reference + notice. */
function applyBinanceSaveNotice(payload: unknown): void {
  const o = payload as Record<string, unknown>;
  const b = o.binance as BinanceSaveMeta | undefined | null;
  if (!b || typeof b !== 'object') return;
  const status = String(b.status || '');
  if (status === 'ok' && b.order_number) {
    formReference.value = String(b.order_number);
    saveNotice.value = `Ordre Binance trouvé — référence mise à jour : ${String(b.order_number)}.`;
    return;
  }
  if (status === 'ambiguous') {
    saveNotice.value =
      (typeof b.message === 'string' && b.message.trim()) ||
      `Plusieurs ordres Binance (${b.candidates ?? '?'}) ont le même montant ; la référence n’a pas été modifiée.`;
    return;
  }
  if (status === 'none') {
    saveNotice.value =
      (typeof b.message === 'string' && b.message.trim()) ||
      'Aucun ordre Binance récent avec ce montant (partie entière).';
    return;
  }
  if (status === 'error' && typeof b.message === 'string' && b.message.trim()) {
    saveNotice.value = `Binance : ${b.message.trim()}`;
    return;
  }
}

async function runAnalyze() {
  if (!file.value) return;
  const fd = new FormData();
  fd.append('image', file.value);
  loadingAnalyze.value = true;
  error.value = '';
  extractedPreview.value = null;
  resetForm();
  try {
    const r = await fetch(apiUrl('mga2p2/form-api/receipt-preview'), {
      method: 'POST',
      body: fd,
      credentials: 'same-origin',
    });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    const extracted = (j as { extracted?: Record<string, unknown> }).extracted;
    const fn = (j as { filename?: string }).filename ?? file.value.name;
    if (!extracted || typeof extracted !== 'object') {
      throw new Error('Réponse sans champ « extracted ».');
    }
    extractedPreview.value = { extracted, filename: fn };
    initFormFromExtracted(extracted);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Échec analyse';
  } finally {
    loadingAnalyze.value = false;
  }
}

function displayField(v: string | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? '—' : s;
}

function sameField(stored: string | null | undefined, current: string): boolean {
  return String(stored ?? '').trim() === String(current ?? '').trim();
}

function parseDuplicatePayload(j: unknown): DuplicateModalPayload | null {
  if (!j || typeof j !== 'object') return null;
  const o = j as Record<string, unknown>;
  const fc = o.first_created;
  const created = typeof fc === 'number' ? fc : parseInt(String(fc), 10);
  if (!Number.isFinite(created) || created <= 0) return null;
  const coalesceStr = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  };
  return {
    first_id: typeof o.first_id === 'number' ? o.first_id : parseInt(String(o.first_id), 10) || 0,
    first_created: created,
    first_montant: coalesceStr(o.first_montant),
    first_phone: coalesceStr(o.first_phone),
    first_name: coalesceStr(o.first_name),
  };
}

async function checkDuplicate(filename: string): Promise<DuplicateModalPayload | null> {
  const dupR = await fetch(
    apiUrl(`mga2p2/form-api/receipt-duplicate?filename=${encodeURIComponent(filename)}`),
    { credentials: 'same-origin' },
  );
  const dupJ = await parseJsonResponse(dupR);
  const o = dupJ as Record<string, unknown>;
  if (!dupR.ok || !o.duplicate) return null;
  return parseDuplicatePayload(dupJ);
}

function buildSavePayload():
  | {
      extracted: Record<string, unknown>;
      filename: string;
      form: Record<string, string | number>;
    }
  | null {
  if (!extractedPreview.value) return null;
  const rm = Number.isFinite(formRemainMinutes.value)
    ? Math.min(600, Math.max(1, Math.floor(formRemainMinutes.value)))
    : 20;
  return {
    extracted: extractedPreview.value.extracted,
    filename: extractedPreview.value.filename,
    form: {
      montant: formMontant.value,
      phone: formPhone.value,
      name: formName.value,
      reference: formReference.value,
      currency: formCurrency.value,
      bank_name: formBankName.value,
      payment_type: formPaymentType.value,
      remain_minutes: rm,
      user_info: formUserInfo.value,
    },
  };
}

function closeDuplicateModal() {
  duplicateModal.value = null;
  duplicateJustCopied.value = false;
}

function applyFirstFieldsFromDuplicateModal() {
  const d = duplicateModal.value;
  if (!d) return;
  formMontant.value = d.first_montant ?? '';
  formPhone.value = d.first_phone ?? '';
  formName.value = d.first_name ?? '';
  duplicateJustCopied.value = true;
}

async function executeSave(): Promise<void> {
  const payload = buildSavePayload();
  if (!payload || !extractedPreview.value) return;

  const rOrder = await fetch(apiUrl('mga2p2-form/api/order-save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const jOrder = await parseJsonResponse(rOrder);
  if (!rOrder.ok) {
    throw new Error((jOrder as { error?: string }).error || rOrder.statusText);
  }
  applyBinanceSaveNotice(jOrder);

  try {
    const rRec = await fetch(apiUrl('mga2p2/form-api/receipt-save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const jRec = await parseJsonResponse(rRec);
    if (rRec.status === 409 && (jRec as { duplicate?: boolean }).duplicate) {
      const dup = parseDuplicatePayload(jRec);
      if (
        dup &&
        sameField(dup.first_montant, formMontant.value) &&
        sameField(dup.first_name, formName.value)
      ) {
        duplicateModal.value = dup;
        error.value =
          (jRec as { error?: string }).error?.trim() ||
          'Doublon exact : même fichier, même montant et même nom. Enregistrement bloqué.';
        return;
      }
      // Same filename but different fields — allow the save to proceed.
    }
  }
  catch {
    // Order is already saved; still send user to the orders list.
  }

  if (!duplicateModal.value) {
    await router.push({ name: 'orders-mga' });
  }
}

async function runSave() {
  if (!extractedPreview.value) return;
  loadingSave.value = true;
  error.value = '';
  saveNotice.value = '';
  duplicateJustCopied.value = false;
  try {
    const dup = await checkDuplicate(extractedPreview.value.filename);
    if (dup) {
      duplicateModal.value = dup;
      error.value = 'Doublon détecté : ce nom de fichier existe déjà. Utilisez une autre image.';
      return;
    }
    await executeSave();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Échec enregistrement';
  } finally {
    loadingSave.value = false;
  }
}

function formatDate(ts: unknown): string {
  const n = typeof ts === 'number' ? ts : parseInt(String(ts), 10);
  if (!n) return '—';
  return new Date(n * 1000).toLocaleString();
}

onUnmounted(() => {
  previewLightboxOpen.value = false;
  window.removeEventListener('keydown', onPreviewLightboxEscape);
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 48px; }
.hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.nav-links { display: flex; align-items: center; gap: 16px; }
.hdr h1 { font-size: 22px; margin: 0; font-weight: 800; color: #f0b90b; }
.link { color: #848e9c; text-decoration: none; font-size: 14px; }
.link:hover { color: #eaecef; }
.card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.preview-card { border-color: #3d4f5c; }
.card h2 { margin: 0 0 12px; font-size: 15px; color: #848e9c; text-transform: uppercase; letter-spacing: 0.04em; }
.hint { color: #848e9c; font-size: 13px; line-height: 1.5; margin: 0 0 14px; }
.hint.subtle { margin-top: -6px; font-size: 12px; }
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }
.lbl { font-size: 12px; font-weight: 600; color: #848e9c; text-transform: uppercase; letter-spacing: 0.03em; }
.inp {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 14px;
}
.inp:focus { outline: none; border-color: #f0b90b; }
.inp.sel { cursor: pointer; }
.inp.ta { resize: vertical; min-height: 72px; font-family: inherit; }
.ro-field { margin-top: 4px; }
.ro-val {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed #2b3139;
  background: #13161a;
  color: #848e9c;
  font-size: 13px;
  word-break: break-all;
}
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 12px 0 4px;
  padding: 28px 20px;
  border-radius: 12px;
  border: 2px dashed #2b3139;
  background: #13161a;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.drop-zone--active {
  border-color: #f0b90b;
  background: rgba(240, 185, 11, 0.08);
}
.drop-zone__lead {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #eaecef;
  text-align: center;
}
.drop-zone__ico {
  display: inline-block;
  margin-right: 6px;
  color: #f0b90b;
  font-size: 16px;
}
.drop-zone__or {
  margin: 0;
  font-size: 12px;
  color: #5e6673;
}
.file-input { position: absolute; width: 0; height: 0; opacity: 0; }
.file-label { display: inline-block; cursor: pointer; }
.file-btn {
  display: inline-block;
  padding: 10px 18px;
  background: #2b3139;
  border-radius: 8px;
  color: #eaecef;
  font-weight: 600;
  font-size: 14px;
}
.file-btn:hover { border-color: #f0b90b; color: #f0b90b; }
.fname { margin-top: 10px; font-size: 13px; color: #848e9c; word-break: break-all; }
.preview-wrap { margin: 14px 0; }
.preview-btn {
  display: block;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  border-radius: 8px;
  max-width: 100%;
}
.preview-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: #5e6673;
}
.preview { max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid #2b3139; display: block; }
.img-lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px 16px;
  box-sizing: border-box;
}
.img-lightbox-close {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 10001;
  width: 44px;
  height: 44px;
  border: 1px solid #3d4f5c;
  border-radius: 10px;
  background: #1e2329;
  color: #eaecef;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-lightbox-close:hover {
  border-color: #f0b90b;
  color: #f0b90b;
}
.img-lightbox-img {
  max-width: min(96vw, 1200px);
  max-height: calc(100vh - 32px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}
.primary {
  margin-top: 8px;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #f0b90b;
  color: #0b0e11;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
}
.primary.save-btn { margin-top: 16px; }
.primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ghost {
  margin-bottom: 12px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: transparent;
  color: #eaecef;
  cursor: pointer;
}
.err { color: #f6465d; font-size: 14px; margin-top: 12px; }
.save-notice {
  margin-top: 12px;
  color: #0ecb81;
  font-size: 13px;
  line-height: 1.45;
}
.mono { font-family: ui-monospace, monospace; }
.dup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}
.dup-dialog {
  width: 100%;
  max-width: 440px;
  max-height: min(92vh, 640px);
  overflow: auto;
  background: #1e2329;
  border: 1px solid #3d4f5c;
  border-radius: 12px;
  padding: 18px 20px 20px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  box-sizing: border-box;
}
.dup-title {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 800;
  color: #f0b90b;
}
.dup-intro {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.45;
  color: #eaecef;
}
.dup-intro--sub {
  color: #848e9c;
  font-size: 12px;
  margin-bottom: 12px;
}
.dup-cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 12px;
}
.dup-cmp th,
.dup-cmp td {
  border: 1px solid #2b3139;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
.dup-cmp thead th {
  background: #13161a;
  color: #848e9c;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.03em;
}
.dup-cmp tbody th[scope='row'] {
  color: #5e6673;
  font-weight: 700;
  width: 88px;
  background: #13161a;
}
.dup-cmp tbody td {
  color: #cfd2d7;
  word-break: break-word;
}
.dup-cell--diff {
  color: #f6465d;
  font-weight: 600;
}
.dup-note {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #0ecb81;
}
.dup-race {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: #f0b90b;
}
.dup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dup-actions .ghost {
  margin-bottom: 0;
  flex: 1 1 auto;
  min-width: 0;
}
.dup-primary {
  flex: 1 1 100%;
  margin-top: 4px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #f0b90b;
  color: #0b0e11;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
}
.dup-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
@media (max-width: 560px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
