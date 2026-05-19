<template>
  <div class="wrap">
    <header class="hdr">
      <h1>Codes USSD mobile</h1>
      <div class="hdr__links">
        <router-link class="link" to="/orders">Orders MGA</router-link>
        <router-link class="link" to="/">← Reçu</router-link>
      </div>
    </header>

    <section class="card">
      <p class="hint">
        Modèles utilisés pour les liens « composer » sur la liste des commandes (MVola / Orange). Remplacez les
        jetons par les chiffres du téléphone et du montant&nbsp;:
        <strong>NUM</strong>, <strong>NUMERO</strong>, <strong>NUMÉRO</strong> (téléphone) et
        <strong>MONTANT</strong> (montant).
        <span class="hint__sub">
          Valeurs lues depuis le navigateur si la clé
          <code class="mono">mga2p2_form.settings.mobile_ussd</code> existe. Optionnel&nbsp;: synchro serveur
          <code class="mono">GET/POST …/mga2p2-form/api/mobile-ussd-settings</code> (CSRF pour POST).
        </span>
      </p>

      <label class="field">
        <span class="lbl">MVola</span>
        <input v-model="mvolaPattern" type="text" class="inp mono" spellcheck="false" autocomplete="off" />
      </label>

      <label class="field">
        <span class="lbl">Orange Money</span>
        <input v-model="orangePattern" type="text" class="inp mono" spellcheck="false" autocomplete="off" />
      </label>

      <div class="preview card card--inner">
        <h2 class="preview__title">Aperçu (exemple)</h2>
        <p class="preview__line mono">
          <span class="preview__k">MVola</span> {{ previewMvola }}
        </p>
        <p class="preview__line mono">
          <span class="preview__k">Orange</span> {{ previewOrange }}
        </p>
      </div>

      <p v-if="error" class="err">{{ error }}</p>
      <p v-if="savedHint" class="ok">{{ savedHint }}</p>

      <div class="actions">
        <button type="button" class="primary" :disabled="saving" @click="onSave">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
        <button type="button" class="ghost" :disabled="loading" @click="load">Recharger</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { apiUrl } from '@/lib/apiUrl';
import {
  applyMobileUssdPlaceholders,
  hasMobileUssdStorage,
  readMobileUssdPatternsFromStorage,
  saveMobileUssdPatternsToStorage,
} from '@/lib/mobileUssd';

const stored = readMobileUssdPatternsFromStorage();
const mvolaPattern = ref(stored.mvola);
const orangePattern = ref(stored.orange);
const csrfToken = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const savedHint = ref('');

const samplePhone = '0341234567';
const sampleMontant = '15000';

const previewMvola = computed(() =>
  applyMobileUssdPlaceholders(mvolaPattern.value, samplePhone.replace(/\D/g, ''), sampleMontant.replace(/\D/g, '')),
);
const previewOrange = computed(() =>
  applyMobileUssdPlaceholders(orangePattern.value, samplePhone.replace(/\D/g, ''), sampleMontant.replace(/\D/g, '')),
);

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
  loading.value = true;
  error.value = '';
  savedHint.value = '';
  const hadStored = hasMobileUssdStorage();
  const fromBrowser = readMobileUssdPatternsFromStorage();
  mvolaPattern.value = fromBrowser.mvola;
  orangePattern.value = fromBrowser.orange;
  try {
    const r = await fetch(apiUrl('mga2p2-form/api/mobile-ussd-settings'), { credentials: 'same-origin' });
    const j = await parseJsonResponse(r);
    if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
    const mv = (j as { mvola_pattern?: string }).mvola_pattern;
    const or = (j as { orange_pattern?: string }).orange_pattern;
    const tok = (j as { csrf_token?: string }).csrf_token;
    if (typeof tok === 'string' && tok) {
      csrfToken.value = tok;
    }
    if (!hadStored) {
      if (typeof mv === 'string' && mv.trim()) mvolaPattern.value = mv.trim();
      if (typeof or === 'string' && or.trim()) orangePattern.value = or.trim();
      saveMobileUssdPatternsToStorage(mvolaPattern.value, orangePattern.value);
    }
  } catch (e: unknown) {
    if (hadStored) {
      error.value = '';
    } else {
      error.value = e instanceof Error ? e.message : 'Chargement impossible';
    }
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  saving.value = true;
  error.value = '';
  savedHint.value = '';
  const mv = mvolaPattern.value.trim();
  const or = orangePattern.value.trim();
  try {
    saveMobileUssdPatternsToStorage(mv, or);

    if (!csrfToken.value) {
      await load();
    }
    if (csrfToken.value) {
      const r = await fetch(apiUrl('mga2p2-form/api/mobile-ussd-settings'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken.value,
        },
        body: JSON.stringify({
          mvola_pattern: mv,
          orange_pattern: or,
        }),
      });
      const j = await parseJsonResponse(r);
      if (!r.ok) throw new Error((j as { error?: string }).error || r.statusText);
      const mvR = (j as { mvola_pattern?: string }).mvola_pattern;
      const orR = (j as { orange_pattern?: string }).orange_pattern;
      const tok = (j as { csrf_token?: string }).csrf_token;
      if (typeof tok === 'string' && tok) {
        csrfToken.value = tok;
      }
      if (typeof mvR === 'string') mvolaPattern.value = mvR;
      if (typeof orR === 'string') orangePattern.value = orR;
      saveMobileUssdPatternsToStorage(mvolaPattern.value, orangePattern.value);
      savedHint.value = 'Enregistré dans le navigateur et sur le serveur.';
    } else {
      error.value = '';
      savedHint.value = 'Enregistré dans le navigateur (localStorage).';
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Enregistrement impossible';
    savedHint.value = 'Valeurs conservées dans le navigateur.';
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});

onActivated(() => {
  if (hasMobileUssdStorage()) {
    const p = readMobileUssdPatternsFromStorage();
    mvolaPattern.value = p.mvola;
    orangePattern.value = p.orange;
  }
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
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.hdr h1 {
  font-size: 17px;
  margin: 0;
  font-weight: 800;
  color: #f0b90b;
}
.hdr__links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
}
.card--inner {
  margin-top: 12px;
  background: #171a1e;
}
.hint {
  color: #848e9c;
  font-size: 11px;
  line-height: 1.45;
  margin: 0 0 14px;
}
.hint__sub {
  display: block;
  margin-top: 8px;
  font-size: 10px;
  color: #5e6673;
}
.hint__sub .mono {
  font-size: 10px;
  word-break: break-all;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.lbl {
  font-size: 11px;
  font-weight: 700;
  color: #aeb4bc;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.inp {
  border: 1px solid #2b3139;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  background: #0b0e11;
  color: #eaecef;
}
.inp:focus {
  outline: none;
  border-color: #f0b90b;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.preview__title {
  font-size: 12px;
  margin: 0 0 8px;
  color: #aeb4bc;
}
.preview__line {
  margin: 0 0 6px;
  word-break: break-all;
  color: #eaecef;
}
.preview__k {
  display: inline-block;
  min-width: 52px;
  color: #848e9c;
  font-weight: 700;
}
.err {
  color: #f6465d;
  font-size: 12px;
  margin: 10px 0 0;
}
.ok {
  color: #0ecb81;
  font-size: 12px;
  margin: 10px 0 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.primary {
  border: 1px solid #f0b90b;
  background: rgba(240, 185, 11, 0.15);
  color: #f0b90b;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ghost {
  border: 1px solid #3d4f5c;
  background: transparent;
  color: #aeb4bc;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
