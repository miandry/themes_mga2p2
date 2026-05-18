<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Account</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="confirmLogout">
            <ion-icon :icon="logOutOutline" style="color:#F6465D;font-size:22px"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Profile hero -->
      <div class="profile-hero">
        <div class="profile-avatar">{{ initials }}</div>
        <div class="profile-name">{{ authStore.user?.name ?? '—' }}</div>
        <div class="profile-mail">{{ authStore.user?.mail ?? '' }}</div>
        <div class="profile-trust">
          <ion-icon :icon="shieldCheckmark" style="color:#F0B90B"></ion-icon>
          <span>Trust Score: <strong>{{ authStore.user?.trust_score ?? 98 }}%</strong></span>
        </div>
      </div>

      <!-- USDT Balance card (live from Binance API) -->
      <div v-if="hasBinance" class="balance-card">
        <div class="balance-card__label">
          <ion-icon :icon="walletOutline"></ion-icon>
          USDT Balance
        </div>
        <div v-if="balanceLoading" class="balance-card__val">
          <ion-spinner name="crescent" style="width:18px;height:18px;color:#F0B90B"></ion-spinner>
        </div>
        <div v-else-if="balanceError" class="balance-card__val" style="font-size:13px;color:#F6465D">
          {{ balanceError }}
        </div>
        <template v-else-if="usdtBalance">
          <div class="balance-card__val">{{ parseFloat(usdtBalance.free).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span class="balance-card__unit">USDT</span></div>
          <div class="balance-card__locked">Locked: {{ parseFloat(usdtBalance.locked).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} USDT</div>
        </template>
      </div>

      <!-- Binance account info -->
      <div class="section-title-row">Binance P2P Account</div>
      <div class="info-card">
        <div class="info-row">
          <ion-icon :icon="personCircleOutline" class="info-icon"></ion-icon>
          <div class="info-text">
            <span class="il">Binance UID</span>
            <span class="iv">{{ authStore.user?.binance_uid ?? 'Not linked' }}</span>
          </div>
        </div>
        <div class="info-row">
          <ion-icon :icon="shieldCheckmark" class="info-icon yellow"></ion-icon>
          <div class="info-text">
            <span class="il">Verification</span>
            <span class="iv green">Identity Verified ✓</span>
          </div>
        </div>
        <div class="info-row">
          <ion-icon :icon="starOutline" class="info-icon yellow"></ion-icon>
          <div class="info-text">
            <span class="il">Merchant Status</span>
            <span class="iv yellow">P2P Merchant</span>
          </div>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="section-title-row">Trading Statistics</div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="sb-val">{{ orderStore.orders.length }}</div>
          <div class="sb-label">Total Orders</div>
        </div>
        <div class="stat-box">
          <div class="sb-val green">{{ orderStore.completedOrders.length }}</div>
          <div class="sb-label">Completed</div>
        </div>
        <div class="stat-box">
          <div class="sb-val yellow">{{ adStore.ads.filter(a=>a.status==='ONLINE').length }}</div>
          <div class="sb-label">Active Ads</div>
        </div>
        <div class="stat-box">
          <div class="sb-val">{{ avgCompletion }}%</div>
          <div class="sb-label">Completion</div>
        </div>
      </div>

      <!-- Menu -->
      <div class="section-title-row">Settings</div>
      <div class="menu-list">
        <div class="menu-item" @click="router.push('/notifications')">
          <ion-icon :icon="notificationsOutline" class="menu-icon"></ion-icon>
          <span>Notifications</span>
          <ion-icon :icon="chevronForwardOutline" class="menu-arrow"></ion-icon>
        </div>
        <div class="menu-item">
          <ion-icon :icon="lockClosedOutline" class="menu-icon"></ion-icon>
          <span>Payment Methods</span>
          <ion-icon :icon="chevronForwardOutline" class="menu-arrow"></ion-icon>
        </div>
        <div class="menu-item">
          <ion-icon :icon="helpCircleOutline" class="menu-icon"></ion-icon>
          <span>Help & Support</span>
          <ion-icon :icon="chevronForwardOutline" class="menu-arrow"></ion-icon>
        </div>
      </div>

      <div class="logout-wrap">
        <button class="btn-logout" @click="confirmLogout">Sign Out</button>
      </div>

      <ion-alert
        :is-open="showLogoutAlert"
        header="Sign Out"
        message="Are you sure you want to sign out?"
        :buttons="logoutButtons"
        @didDismiss="showLogoutAlert = false"
      ></ion-alert>

      <div style="height:80px"></div>
    </ion-content>

    <BottomNav active="account" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonAlert, IonSpinner,
} from '@ionic/vue';
import {
  logOutOutline, shieldCheckmark, personCircleOutline,
  starOutline, notificationsOutline, lockClosedOutline,
  helpCircleOutline, chevronForwardOutline, walletOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';
import { useOrderStore } from '@/stores/orders';
import { useAdStore } from '@/stores/ads';
import { fetchBalance, fetchAccount, binanceConfigured } from '@/services/binance';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();
const authStore = useAuthStore();
const orderStore = useOrderStore();
const adStore = useAdStore();
const showLogoutAlert = ref(false);
const usdtBalance = ref<{ free: string; locked: string } | null>(null);
const balanceLoading = ref(false);
const balanceError = ref('');
const hasBinance = binanceConfigured();

const initials = computed(() => {
  const n = authStore.user?.name ?? 'U';
  return n.slice(0, 2).toUpperCase();
});

const avgCompletion = computed(() => {
  if (!adStore.ads.length) return 0;
  const sum = adStore.ads.reduce((s, a) => s + a.completionRate, 0);
  return (sum / adStore.ads.length).toFixed(1);
});

onMounted(async () => {
  if (!orderStore.orders.length) orderStore.fetchOrders();
  if (!adStore.ads.length) adStore.fetchAds();
  if (hasBinance) {
    balanceLoading.value = true;
    try {
      const bal = await fetchBalance('USDT');
      if (bal) usdtBalance.value = bal;
    } catch (e: any) {
      balanceError.value = e.message;
    } finally {
      balanceLoading.value = false;
    }
  }
});

function confirmLogout() {
  showLogoutAlert.value = true;
}

const logoutButtons = [
  { text: 'Cancel', role: 'cancel' },
  {
    text: 'Sign Out',
    cssClass: 'alert-danger-btn',
    handler: () => {
      authStore.logout();
      router.replace('/login');
    },
  },
];
</script>

<style scoped>
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 24px 20px;
  gap: 6px;
}
.profile-avatar {
  width: 72px;
  height: 72px;
  background: #2B3139;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: #F0B90B;
  border: 2px solid #F0B90B;
  margin-bottom: 8px;
}
.profile-name  { font-size: 20px; font-weight: 700; color: #EAECEF; }
.profile-mail  { font-size: 13px; color: #848E9C; }
.profile-trust { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #EAECEF; margin-top: 4px; }

.section-title-row {
  font-size: 12px;
  font-weight: 700;
  color: #848E9C;
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 0 16px 8px;
  margin-top: 8px;
}

.info-card {
  margin: 0 16px 8px;
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  overflow: hidden;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #2B3139;
}
.info-row:last-child { border-bottom: none; }
.info-icon { font-size: 20px; color: #848E9C; flex-shrink: 0; }
.info-icon.yellow { color: #F0B90B; }
.info-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.il { font-size: 11px; color: #848E9C; }
.iv { font-size: 14px; font-weight: 600; color: #EAECEF; }
.iv.green  { color: #0ECB81; }
.iv.yellow { color: #F0B90B; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0 16px 12px;
}
.stat-box {
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
}
.sb-val { font-size: 20px; font-weight: 800; color: #EAECEF; }
.sb-val.green  { color: #0ECB81; }
.sb-val.yellow { color: #F0B90B; }
.sb-label { font-size: 10px; color: #848E9C; margin-top: 2px; }

.menu-list {
  margin: 0 16px 8px;
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  overflow: hidden;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #2B3139;
  cursor: pointer;
  font-size: 14px;
  color: #EAECEF;
  transition: background .15s;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: #2B3139; }
.menu-icon  { font-size: 20px; color: #848E9C; flex-shrink: 0; }
.menu-arrow { font-size: 16px; color: #848E9C; margin-left: auto; }

.balance-card {
  margin: 0 16px 8px;
  background: linear-gradient(135deg, #1E2329, #2B3139);
  border: 1px solid rgba(240,185,11,.3);
  border-radius: 14px;
  padding: 16px 20px;
}
.balance-card__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #848E9C;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 8px;
}
.balance-card__val {
  font-size: 30px;
  font-weight: 800;
  color: #F0B90B;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.balance-card__unit  { font-size: 16px; color: #848E9C; font-weight: 600; }
.balance-card__locked { font-size: 12px; color: #848E9C; margin-top: 4px; }

.logout-wrap { padding: 16px; }
.btn-logout {
  width: 100%;
  background: rgba(246,70,93,.12);
  color: #F6465D;
  border: 1px solid rgba(246,70,93,.3);
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
</style>
