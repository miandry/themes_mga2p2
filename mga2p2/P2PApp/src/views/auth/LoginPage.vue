<template>
  <ion-page>
    <ion-content class="ion-padding login-bg" :fullscreen="true">
      <div class="login-wrap">

        <div class="login-logo">
          <div class="logo-circle">
            <span class="logo-b">B</span>
          </div>
          <h1 class="logo-title">MGA P2P</h1>
          <p class="logo-sub">Binance P2P Manager</p>
        </div>

        <p class="login-info">
          Binance does not provide email/password login over the REST API.
          Access is via <strong>API key + HMAC</strong>, configured in Drupal at
          <strong>Configuration → MGA P2P</strong>. Use the button below to verify
          that key against <code>GET /api/v3/account</code>.
        </p>

        <div v-if="authStore.error" class="error-msg">
          <ion-icon :icon="alertCircleOutline"></ion-icon>
          {{ authStore.error }}
        </div>

        <button class="btn-primary" :disabled="authStore.loading" @click="handleBinance">
          <ion-spinner v-if="authStore.loading" name="crescent" style="width:20px;height:20px"></ion-spinner>
          <span v-else>Connect with Binance (API)</span>
        </button>

        <ion-accordion-group class="alt-login">
          <ion-accordion value="drupal">
            <ion-item slot="header" lines="none" class="accordion-header">
              <ion-label>Alternative: site account</ion-label>
            </ion-item>
            <div slot="content" class="accordion-body">
              <div class="field-group">
                <label>Username</label>
                <ion-input
                  v-model="form.name"
                  type="text"
                  placeholder="Drupal username"
                  :clear-input="true"
                  @keyup.enter="handleDrupal"
                ></ion-input>
              </div>
              <div class="field-group">
                <label>Password</label>
                <ion-input
                  v-model="form.password"
                  :type="showPwd ? 'text' : 'password'"
                  placeholder="Password"
                  @keyup.enter="handleDrupal"
                >
                  <ion-button
                    slot="end"
                    fill="clear"
                    size="small"
                    @click="showPwd = !showPwd"
                  >
                    <ion-icon :icon="showPwd ? eyeOff : eye" style="color:#848E9C"></ion-icon>
                  </ion-button>
                </ion-input>
              </div>
              <button class="btn-ghost" type="button" :disabled="authStore.loading" @click="handleDrupal">
                Sign in with site account
              </button>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <p class="login-footer">MGA P2P · API keys stay on the server (Drupal)</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonInput, IonButton, IonIcon, IonSpinner,
  IonAccordionGroup, IonAccordion, IonItem, IonLabel,
} from '@ionic/vue';
import { eye, eyeOff, alertCircleOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const showPwd = ref(false);
const form = ref({ name: '', password: '' });

async function handleBinance() {
  const ok = await authStore.loginWithBinance();
  if (ok) router.replace('/dashboard');
}

async function handleDrupal() {
  if (!form.value.name || !form.value.password) return;
  const ok = await authStore.login(form.value);
  if (ok) router.replace('/dashboard');
}
</script>

<style scoped>
.login-bg {
  --background: #0B0E11;
}
.login-wrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 24px;
  gap: 20px;
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.logo-circle {
  width: 72px;
  height: 72px;
  background: #F0B90B;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(240,185,11,.35);
}
.logo-b {
  font-size: 40px;
  font-weight: 900;
  color: #000;
  line-height: 1;
}
.logo-title {
  font-size: 26px;
  font-weight: 800;
  color: #EAECEF;
  margin: 0;
}
.logo-sub {
  font-size: 13px;
  color: #848E9C;
  margin: 0;
}

.login-info {
  font-size: 13px;
  line-height: 1.55;
  color: #848E9C;
  margin: 0;
}
.login-info code {
  font-size: 11px;
  color: #F0B90B;
  background: #1E2329;
  padding: 1px 6px;
  border-radius: 4px;
}
.login-info strong {
  color: #EAECEF;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.field-group label {
  font-size: 12px;
  font-weight: 600;
  color: #848E9C;
  text-transform: uppercase;
  letter-spacing: .5px;
}
ion-input {
  --background: #1E2329;
  --color: #EAECEF;
  --placeholder-color: #848E9C;
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border-radius: 10px;
  border: 1px solid #2B3139;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(246,70,93,.12);
  border: 1px solid rgba(246,70,93,.3);
  color: #F6465D;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.alt-login {
  background: #1E2329;
  border-radius: 12px;
  border: 1px solid #2B3139;
  overflow: hidden;
}
.accordion-header {
  --background: #1E2329;
  --color: #EAECEF;
}
.accordion-body {
  padding: 8px 16px 16px;
}

.btn-ghost {
  width: 100%;
  background: transparent;
  color: #F0B90B;
  border: 1px solid #F0B90B;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-ghost:active {
  opacity: 0.85;
}

.login-footer {
  text-align: center;
  font-size: 11px;
  color: #848E9C;
  margin-top: 8px;
}
</style>
