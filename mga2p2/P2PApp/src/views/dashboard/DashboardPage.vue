<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title class="dashboard-title">
          <span class="title-b">MGA</span> P2P
        </ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/notifications" fill="clear">
            <ion-icon :icon="notificationsOutline" style="color:#848E9C;font-size:22px"></ion-icon>
          </ion-button>
          <ion-button router-link="/account" fill="clear">
            <div class="avatar">{{ initials }}</div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Trust account banner -->
      <div class="trust-banner">
        <div class="trust-banner__left">
          <div class="trust-label">Trust Account</div>
          <div class="trust-name">{{ authStore.user?.name ?? '—' }}</div>
          <div class="trust-score">
            <ion-icon :icon="shieldCheckmark" style="color:#F0B90B"></ion-icon>
            <span>{{ authStore.user?.trust_score ?? 98 }}% trust score</span>
          </div>
        </div>
        <div class="trust-banner__right">
          <div class="binance-tag">Binance P2P</div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card" @click="goOrders('active')">
          <div class="stat-val">{{ orderStore.activeOrders.length }}</div>
          <div class="stat-label">Active Orders</div>
        </div>
        <div class="stat-card" @click="goOrders('all')">
          <div class="stat-val">{{ orderStore.orders.length }}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card" @click="router.push('/ads')">
          <div class="stat-val">{{ adStore.ads.filter(a=>a.status==='ONLINE').length }}</div>
          <div class="stat-label">Active Ads</div>
        </div>
        <div class="stat-card" @click="router.push('/chat')">
          <div class="stat-val highlight">{{ totalUnread }}</div>
          <div class="stat-label">Unread</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:4px">
        <span>Receipt scan (AI)</span>
        <a class="section-link" href="/form">Open →</a>
      </div>
      <div class="form-teaser">
        <a href="/form" class="form-teaser__link">Upload receipt → extract montant, téléphone, nom & save</a>
      </div>

      <!-- Active orders section -->
      <div class="section-header">
        <span>Active Orders</span>
        <span class="section-link" @click="router.push('/orders')">View all →</span>
      </div>

      <div v-if="orderStore.loading" class="center-spinner">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
      <div v-else-if="orderStore.activeOrders.length === 0" class="empty-state">
        <ion-icon :icon="checkmarkCircleOutline" style="font-size:40px;color:#848E9C"></ion-icon>
        <p>No active orders</p>
      </div>
      <div v-else class="list-section">
        <OrderCard
          v-for="order in orderStore.activeOrders.slice(0, 3)"
          :key="order.id"
          :order="order"
          @click="router.push(`/orders/${order.id}`)"
        />
      </div>

      <!-- My ads quick view -->
      <div class="section-header" style="margin-top:8px">
        <span>My Advertisements</span>
        <span class="section-link" @click="router.push('/ads')">Manage →</span>
      </div>

      <div class="ads-quick">
        <div
          v-for="ad in adStore.ads"
          :key="ad.id"
          class="ad-chip"
          :class="ad.side.toLowerCase()"
          @click="router.push(`/ads/${ad.id}/edit`)"
        >
          <span class="ad-chip__side">{{ ad.side }}</span>
          <span class="ad-chip__info">{{ ad.asset }} · {{ ad.price.toLocaleString() }} {{ ad.fiat }}</span>
          <span :class="['ad-chip__status', ad.status === 'ONLINE' ? 'on' : 'off']">
            {{ ad.status }}
          </span>
        </div>
        <div v-if="adStore.ads.length === 0" class="empty-state">
          <p>No advertisements yet</p>
        </div>
      </div>

      <div style="height:80px"></div>
    </ion-content>

    <BottomNav active="dashboard" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue';
import {
  notificationsOutline, shieldCheckmark,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';
import { useOrderStore } from '@/stores/orders';
import { useAdStore } from '@/stores/ads';
import { useChatStore } from '@/stores/chat';
import BottomNav from '@/components/common/BottomNav.vue';
import OrderCard from '@/components/common/OrderCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const orderStore = useOrderStore();
const adStore = useAdStore();
const chatStore = useChatStore();

const initials = computed(() => {
  const n = authStore.user?.name ?? 'U';
  return n.slice(0, 2).toUpperCase();
});

const totalUnread = computed(() => chatStore.totalUnread());

onMounted(async () => {
  await Promise.all([
    orderStore.fetchOrders(),
    adStore.fetchAds(),
    chatStore.fetchChats(),
  ]);
});

async function refresh(ev: CustomEvent) {
  await Promise.all([orderStore.fetchOrders(), adStore.fetchAds(), chatStore.fetchChats()]);
  (ev.target as HTMLIonRefresherElement).complete();
}

function goOrders(filter: string) {
  router.push('/orders');
}
</script>

<style scoped>
.dashboard-title { font-size: 20px; font-weight: 800; }
.title-b { color: #F0B90B; }

.avatar {
  width: 32px;
  height: 32px;
  background: #2B3139;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #F0B90B;
  border: 1.5px solid #F0B90B;
}

/* Trust banner */
.trust-banner {
  margin: 16px;
  background: linear-gradient(135deg, #1E2329 0%, #2B3139 100%);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #2B3139;
  position: relative;
  overflow: hidden;
}
.trust-banner::before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: rgba(240,185,11,.08);
  border-radius: 50%;
}
.trust-label { font-size: 11px; color: #848E9C; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.trust-name  { font-size: 20px; font-weight: 700; color: #EAECEF; }
.trust-score { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #F0B90B; margin-top: 6px; }
.binance-tag {
  background: rgba(240,185,11,.15);
  color: #F0B90B;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(240,185,11,.3);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0 16px 16px;
}
.stat-card {
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  transition: border-color .2s;
}
.stat-card:active { border-color: #F0B90B; }
.stat-val { font-size: 22px; font-weight: 800; color: #EAECEF; }
.stat-val.highlight { color: #F0B90B; }
.stat-label { font-size: 10px; color: #848E9C; margin-top: 2px; }

/* Sections */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 16px 8px;
  font-size: 15px;
  font-weight: 700;
  color: #EAECEF;
}
.section-link { font-size: 12px; color: #F0B90B; cursor: pointer; }
.list-section { padding: 0 16px; }

.center-spinner { display: flex; justify-content: center; padding: 24px; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: #848E9C;
  font-size: 14px;
  gap: 8px;
}

/* Ads quick */
.ads-quick { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }
.ad-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
}
.ad-chip__side {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}
.ad-chip.buy .ad-chip__side  { background: rgba(14,203,129,.15); color: #0ECB81; }
.ad-chip.sell .ad-chip__side { background: rgba(246,70, 93,.15);  color: #F6465D; }
.ad-chip__info  { flex: 1; font-size: 13px; color: #EAECEF; }
.ad-chip__status { font-size: 11px; font-weight: 600; }
.ad-chip__status.on  { color: #0ECB81; }
.ad-chip__status.off { color: #848E9C; }

.form-teaser {
  margin: 0 16px 12px;
  padding: 12px 14px;
  background: rgba(240, 185, 11, 0.08);
  border: 1px solid rgba(240, 185, 11, 0.25);
  border-radius: 10px;
}
.form-teaser__link {
  color: #f0b90b;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.form-teaser__link:hover { text-decoration: underline; }
</style>
