<template>
  <div class="wrap">
    <header class="hdr">
      <h1>Connexion</h1>
      <p class="sub">Formulaire MGA — identifiants Drupal du site.</p>
    </header>

    <section class="card">
      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="lbl">Nom d’utilisateur</span>
          <input v-model="name" type="text" class="inp" name="name" autocomplete="username" required />
        </label>
        <label class="field">
          <span class="lbl">Mot de passe</span>
          <input
            v-model="pass"
            type="password"
            class="inp"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button type="submit" class="primary" :disabled="busy">
          {{ busy ? 'Connexion…' : 'Se connecter' }}
        </button>
        <p v-if="err" class="err">{{ err }}</p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Connexion : POST JSON vers `mga2p2-form/api/login` (session Drupal, même origine).
 * @see loginWithPassword + MGA2P2_FORM_API_LOGIN dans `@/lib/formSession`
 */
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginWithPassword } from '@/lib/formSession';

const route = useRoute();
const router = useRouter();

const name = ref('');
const pass = ref('');
const busy = ref(false);
const err = ref('');

function safeRedirectTarget(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '/orders';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/orders';
  return raw;
}

async function onSubmit() {
  err.value = '';
  busy.value = true;
  try {
    const r = await loginWithPassword(name.value, pass.value);
    if (!r.ok) {
      err.value = r.error || 'Échec';
      return;
    }
    pass.value = '';
    await router.replace(safeRedirectTarget(route.query.redirect));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.wrap {
  max-width: 400px;
  margin: 0 auto;
  padding: 24px 14px 40px;
}
.hdr {
  margin-bottom: 16px;
}
.hdr h1 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
  color: #f0b90b;
}
.sub {
  margin: 0;
  font-size: 12px;
  color: #848e9c;
  line-height: 1.4;
}
.card {
  background: #1e2329;
  border: 1px solid #2b3139;
  border-radius: 12px;
  padding: 18px 16px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.lbl {
  font-size: 10px;
  font-weight: 700;
  color: #5e6673;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.inp {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2b3139;
  background: #0b0e11;
  color: #eaecef;
  font-size: 14px;
}
.inp:focus {
  outline: none;
  border-color: #f0b90b;
}
.primary {
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: #f0b90b;
  color: #0b0e11;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.err {
  margin: 0;
  font-size: 12px;
  color: #f6465d;
}
</style>
