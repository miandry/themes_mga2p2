<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/ads" text="" :icon="arrowBack"></ion-back-button>
        </ion-buttons>
        <ion-title>Edit Advertisement</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" :disabled="saving" @click="save">
            <span style="color:#F0B90B;font-weight:700">{{ saving ? 'Saving…' : 'Save' }}</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="!ad" class="not-found">
        <p>Advertisement not found</p>
      </div>

      <template v-else>
        <!-- Side badge -->
        <div class="edit-hero" :class="ad.side.toLowerCase()">
          <div class="edit-side">{{ ad.side }}</div>
          <div class="edit-asset">{{ ad.asset }} / {{ ad.fiat }}</div>
          <div class="edit-stats">
            {{ ad.orderCount }} orders · {{ ad.completionRate }}% completion
          </div>
        </div>

        <div class="form-wrap">
          <!-- Price -->
          <div class="form-section">
            <div class="section-title">Pricing</div>

            <div class="form-row">
              <label>Price Type</label>
              <ion-segment v-model="form.priceType" class="mini-seg">
                <ion-segment-button value="FIXED">Fixed</ion-segment-button>
                <ion-segment-button value="FLOATING">Floating</ion-segment-button>
              </ion-segment>
            </div>

            <div v-if="form.priceType === 'FIXED'" class="form-row">
              <label>Price ({{ ad.fiat }})</label>
              <ion-input
                v-model.number="form.price"
                type="number"
                :min="0"
                inputmode="decimal"
                class="inp"
              ></ion-input>
            </div>

            <div v-else class="form-row">
              <label>Float ratio (%)</label>
              <ion-input
                v-model.number="form.floatingRatio"
                type="number"
                inputmode="decimal"
                class="inp"
              ></ion-input>
            </div>
          </div>

          <!-- Amount -->
          <div class="form-section">
            <div class="section-title">Amount & Limits</div>

            <div class="form-row">
              <label>Total Amount ({{ ad.asset }})</label>
              <ion-input v-model.number="form.totalAmount" type="number" class="inp"></ion-input>
            </div>
            <div class="form-row">
              <label>Min Limit ({{ ad.fiat }})</label>
              <ion-input v-model.number="form.minAmount" type="number" class="inp"></ion-input>
            </div>
            <div class="form-row">
              <label>Max Limit ({{ ad.fiat }})</label>
              <ion-input v-model.number="form.maxAmount" type="number" class="inp"></ion-input>
            </div>
          </div>

          <!-- Payment methods -->
          <div class="form-section">
            <div class="section-title">Payment Methods</div>
            <div class="payment-checks">
              <div
                v-for="method in allPaymentMethods"
                :key="method"
                class="payment-check"
                :class="{ selected: form.paymentMethods.includes(method) }"
                @click="togglePayment(method)"
              >
                {{ method }}
              </div>
            </div>
          </div>

          <!-- Remarks -->
          <div class="form-section">
            <div class="section-title">Remarks</div>
            <ion-textarea
              v-model="form.remarks"
              placeholder="Add instructions for buyers/sellers…"
              :auto-grow="true"
              :rows="3"
              class="inp"
            ></ion-textarea>
          </div>

          <!-- Auto reply -->
          <div class="form-section">
            <div class="section-title">Auto Reply</div>
            <ion-textarea
              v-model="form.autoReply"
              placeholder="Automatic first message when order is created…"
              :auto-grow="true"
              :rows="2"
              class="inp"
            ></ion-textarea>
          </div>

          <!-- Status -->
          <div class="form-section">
            <div class="section-title">Status</div>
            <div class="status-toggle">
              <span>Online</span>
              <ion-toggle
                :checked="form.status === 'ONLINE'"
                color="success"
                @ionChange="form.status = form.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'"
              ></ion-toggle>
            </div>
          </div>

          <div v-if="saveError" class="error-msg">{{ saveError }}</div>
          <div v-if="saveSuccess" class="success-msg">Advertisement updated successfully!</div>

          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
      </template>

      <div style="height:40px"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonBackButton, IonInput, IonTextarea,
  IonSegment, IonSegmentButton, IonToggle,
} from '@ionic/vue';
import { arrowBack } from 'ionicons/icons';
import { useAdStore, type P2PAd } from '@/stores/ads';

const route = useRoute();
const router = useRouter();
const adStore = useAdStore();

const ad = computed(() => adStore.getAd(route.params.id as string));

const form = ref({
  price: 0,
  priceType: 'FIXED' as 'FIXED' | 'FLOATING',
  floatingRatio: 1.02,
  totalAmount: 0,
  minAmount: 0,
  maxAmount: 0,
  paymentMethods: [] as string[],
  remarks: '',
  autoReply: '',
  status: 'ONLINE' as 'ONLINE' | 'OFFLINE',
});

const allPaymentMethods = ['Mobile Money', 'Bank Transfer', 'Cash', 'WeChat Pay', 'Alipay'];
const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref(false);

onMounted(() => {
  if (!ad.value) adStore.fetchAds();
  if (ad.value) populateForm(ad.value);
});

function populateForm(a: P2PAd) {
  form.value = {
    price: a.price,
    priceType: a.priceType,
    floatingRatio: a.floatingRatio ?? 1.02,
    totalAmount: a.totalAmount,
    minAmount: a.minAmount,
    maxAmount: a.maxAmount,
    paymentMethods: [...a.paymentMethods],
    remarks: a.remarks ?? '',
    autoReply: a.autoReply ?? '',
    status: a.status,
  };
}

function togglePayment(method: string) {
  const idx = form.value.paymentMethods.indexOf(method);
  if (idx === -1) form.value.paymentMethods.push(method);
  else form.value.paymentMethods.splice(idx, 1);
}

async function save() {
  if (!ad.value) return;
  saving.value = true;
  saveError.value = '';
  saveSuccess.value = false;
  const ok = await adStore.updateAd(ad.value.id, form.value);
  saving.value = false;
  if (ok) {
    saveSuccess.value = true;
    setTimeout(() => router.back(), 1200);
  } else {
    saveError.value = adStore.error ?? 'Failed to save';
  }
}
</script>

<style scoped>
.not-found { display: flex; justify-content: center; padding: 60px 24px; color: #848E9C; }

.edit-hero {
  padding: 20px 20px 16px;
  margin: 16px 16px 0;
  border-radius: 14px;
  border: 1px solid #2B3139;
}
.edit-hero.buy  { background: linear-gradient(135deg, rgba(14,203,129,.1), rgba(14,203,129,.03)); }
.edit-hero.sell { background: linear-gradient(135deg, rgba(246,70,93,.1),  rgba(246,70,93,.03)); }
.edit-side  { font-size: 11px; font-weight: 700; color: #848E9C; text-transform: uppercase; }
.edit-asset { font-size: 22px; font-weight: 800; color: #EAECEF; margin: 2px 0; }
.edit-stats { font-size: 12px; color: #848E9C; }

.form-wrap { padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
.form-section {
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.section-title { font-size: 12px; font-weight: 700; color: #848E9C; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: 12px; color: #848E9C; margin-bottom: 6px; }
.inp {
  --background: #2B3139;
  --color: #EAECEF;
  --placeholder-color: #848E9C;
  border-radius: 8px;
  border: 1px solid #2B3139;
  width: 100%;
}
.mini-seg { --background: #2B3139; }

.payment-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.payment-check {
  background: #2B3139;
  color: #848E9C;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all .15s;
}
.payment-check.selected {
  background: rgba(240,185,11,.15);
  color: #F0B90B;
  border-color: rgba(240,185,11,.4);
}

.status-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #EAECEF;
}

.error-msg   { background: rgba(246,70,93,.1); border: 1px solid rgba(246,70,93,.3); color: #F6465D; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
.success-msg { background: rgba(14,203,129,.1); border: 1px solid rgba(14,203,129,.3); color: #0ECB81; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
</style>
