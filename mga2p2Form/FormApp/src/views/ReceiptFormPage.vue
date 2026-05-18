<template>
  <div class="wrap">
    <header class="hdr">
      <h1>Receipt scan</h1>
      <nav class="nav-links">
        <router-link class="link" to="/orders">Orders MGA</router-link>
        <a class="link" :href="p2pHome">← P2P app</a>
      </nav>
    </header>

    <section class="card">
      <h2>Upload image</h2>
      <p class="hint">JPEG, PNG ou WebP — max 8 Mo. Analysez l’image, complétez le formulaire, puis enregistrez.</p>
      <label class="file-label">
        <input type="file" accept="image/jpeg,image/png,image/webp" class="file-input" @change="onFile" />
        <span class="file-btn">Choisir un fichier</span>
      </label>
      <div v-if="fileName" class="fname">{{ fileName }}</div>
      <div v-if="previewUrl" class="preview-wrap">
        <img :src="previewUrl" alt="Preview" class="preview" />
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
          Le fichier reste en doublon tant que vous n’utilisez pas un nom unique ou une autre image.
        </p>
        <p v-if="duplicateModal.order_nid_if_created != null" class="dup-race">
          Le nœud commande order_mga
          <span class="mono">#{{ duplicateModal.order_nid_if_created }}</span>
          est déjà créé. « Enregistrer avec un nom unique » mettra à jour l’historique reçu seulement (sans nouvelle commande).
        </p>
        <div class="dup-actions">
          <button type="button" class="ghost" @click="closeDuplicateModal">Annuler</button>
          <button type="button" class="ghost" @click="applyFirstFieldsFromDuplicateModal">Copier le premier enregistrement</button>
          <button type="button" class="primary dup-primary" :disabled="loadingSave" @click="saveWithUniqueFilename">
            {{ loadingSave ? 'Enregistrement…' : 'Enregistrer avec un nom unique' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
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

function guessPaymentType(extracted: Record<string, unknown>): '' | 'mvola' | 'orange' {
  const bank = strFromExtracted(extracted.bank_name).toLowerCase();
  if (bank.includes('mvola') || bank.includes('m-vola')) return 'mvola';
  if (bank.includes('orange')) return 'orange';
  return '';
}

const file = ref<File | null>(null);
const fileName = ref('');
const previewUrl = ref('');
const loadingAnalyze = ref(false);
const loadingSave = ref(false);
const error = ref('');
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
  order_nid_if_created?: number;
  order_path_if_created?: string;
};

const duplicateModal = ref<DuplicateModalPayload | null>(null);
const duplicateJustCopied = ref(false);

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
}

function initFormFromExtracted(extracted: Record<string, unknown>) {
  formMontant.value = strFromExtracted(extracted.montant);
  formPhone.value = strFromExtracted(extracted.phone);
  formName.value = strFromExtracted(extracted.name);
  formReference.value = strFromExtracted(extracted.reference);
  formCurrency.value = strFromExtracted(extracted.currency);
  formBankName.value = strFromExtracted(extracted.bank_name);
  formPaymentType.value = guessPaymentType(extracted);
  formRemainMinutes.value = 20;
  formUserInfo.value = '';
}

function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const f = input.files?.[0] ?? null;
  file.value = f;
  fileName.value = f?.name ?? '';
  extractedPreview.value = null;
  error.value = '';
  resetForm();
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = f && f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
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

function truncateFilenameMax(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max);
}

function suggestUniqueFilename(filename: string): string {
  const base = filename.trim() === '' ? 'upload' : filename.trim();
  const rnd = Math.random().toString(36).slice(2, 9);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return truncateFilenameMax(`${base}_${rnd}`, 255);
  }
  const stem = base.slice(0, dot);
  const ext = base.slice(dot);
  return truncateFilenameMax(`${stem}_${rnd}${ext}`, 255);
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

async function executeReceiptHistoryOnly(order_nid: number, order_path: string | undefined): Promise<void> {
  const payload = buildSavePayload();
  if (!payload || !extractedPreview.value) return;

  const rRec = await fetch(apiUrl('mga2p2/form-api/receipt-save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const jRec = await parseJsonResponse(rRec);

  if (rRec.status === 409 && (jRec as { duplicate?: boolean }).duplicate) {
    const dup = parseDuplicatePayload(jRec);
    if (dup) {
      duplicateModal.value = {
        ...dup,
        order_nid_if_created: order_nid,
        order_path_if_created: order_path,
      };
    }
    error.value =
      (jRec as { error?: string }).error?.trim() ||
      'Historique reçus : doublon (même fichier). Utilisez la fenêtre pour enregistrer avec un nom unique.';
    return;
  }

  if (!rRec.ok) {
    throw new Error((jRec as { error?: string }).error || rRec.statusText);
  }

  await router.push({ name: 'orders-mga' });
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
  const order = jOrder as { nid: number; path?: string; title?: string };
  const order_nid = order.nid;
  const order_path = order.path;

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
      if (dup) {
        duplicateModal.value = {
          ...dup,
          order_nid_if_created: order_nid,
          order_path_if_created: order_path,
        };
      }
      error.value =
        (jRec as { error?: string }).error?.trim() ||
        'Historique reçus : doublon (même fichier). Utilisez la fenêtre pour enregistrer avec un nom unique.';
      return;
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
  duplicateJustCopied.value = false;
  try {
    const dup = await checkDuplicate(extractedPreview.value.filename);
    if (dup) {
      duplicateModal.value = dup;
      return;
    }
    await executeSave();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Échec enregistrement';
  } finally {
    loadingSave.value = false;
  }
}

async function saveWithUniqueFilename() {
  if (!extractedPreview.value || loadingSave.value) return;
  const snap = duplicateModal.value;
  const raceNid = snap?.order_nid_if_created;
  const racePath = snap?.order_path_if_created;
  duplicateModal.value = null;
  duplicateJustCopied.value = false;
  extractedPreview.value = {
    ...extractedPreview.value,
    filename: suggestUniqueFilename(extractedPreview.value.filename),
  };
  loadingSave.value = true;
  error.value = '';
  try {
    if (raceNid !== undefined) {
      await executeReceiptHistoryOnly(raceNid, racePath);
    }
    else {
      await executeSave();
    }
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
.preview { max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid #2b3139; }
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
