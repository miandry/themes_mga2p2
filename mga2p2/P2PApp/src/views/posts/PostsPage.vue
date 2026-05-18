<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>My Advertisements</ion-title>
      </ion-toolbar>
      <ion-toolbar style="--background:#0B0E11;padding-bottom:8px">
        <ion-segment v-model="filter" class="ion-padding-horizontal">
          <ion-segment-button value="all">All</ion-segment-button>
          <ion-segment-button value="BUY">Buy</ion-segment-button>
          <ion-segment-button value="SELL">Sell</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- API error banner -->
      <div v-if="adStore.error" class="api-error">
        <ion-icon :icon="alertCircleOutline"></ion-icon>
        <div>
          <strong>Could not load ads from Binance</strong>
          <p>{{ adStore.error }}</p>
        </div>
      </div>

      <div v-if="adStore.loading" class="center-spinner">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else-if="filtered.length === 0" class="empty-state">
        <ion-icon :icon="newspaperOutline" style="font-size:48px;color:#848E9C"></ion-icon>
        <p>No advertisements</p>
      </div>

      <div v-else class="list-wrap">
        <div
          v-for="ad in filtered"
          :key="ad.id"
          class="ad-card"
        >
          <div class="ad-card__header">
            <div class="ad-side" :class="ad.side.toLowerCase()">{{ ad.side }}</div>
            <span class="ad-asset">{{ ad.asset }}/{{ ad.fiat }}</span>
            <ion-toggle
              :checked="ad.status === 'ONLINE'"
              color="success"
              @ionChange="adStore.toggleAdStatus(ad.id)"
            ></ion-toggle>
          </div>

          <div class="ad-price">
            <span class="price-val">{{ ad.price.toLocaleString() }}</span>
            <span class="price-fiat">{{ ad.fiat }}</span>
            <span v-if="ad.priceType === 'FLOATING'" class="price-float">
              {{ (ad.floatingRatio ?? 1) * 100 }}% market
            </span>
          </div>

          <div class="ad-meta-row">
            <div class="ad-meta">
              <span class="ml">Limit</span>
              <span class="mv">{{ ad.minAmount.toLocaleString() }} – {{ ad.maxAmount.toLocaleString() }} {{ ad.fiat }}</span>
            </div>
            <div class="ad-meta">
              <span class="ml">Available</span>
              <span class="mv">{{ ad.availableAmount.toLocaleString() }} / {{ ad.totalAmount.toLocaleString() }} {{ ad.asset }}</span>
            </div>
          </div>

          <div class="ad-payments">
            <span v-for="p in ad.paymentMethods" :key="p" class="payment-chip">{{ p }}</span>
          </div>

          <div class="ad-footer">
            <div class="ad-stats">
              <span>{{ ad.orderCount }} orders</span>
              <span class="dot">·</span>
              <span :class="ad.completionRate >= 95 ? 'text-buy' : 'text-warn'">
                {{ ad.completionRate }}% completion
              </span>
            </div>
            <ion-button fill="clear" size="small" color="warning" @click="router.push(`/ads/${ad.id}/edit`)">
              <ion-icon slot="start" :icon="createOutline"></ion-icon>
              Edit
            </ion-button>
          </div>
        </div>
      </div>

      <div style="height:80px"></div>
    </ion-content>

    <BottomNav active="ads" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonToggle, IonIcon,
  IonButton, IonSpinner, IonRefresher, IonRefresherContent,
} from '@ionic/vue';
import { newspaperOutline, createOutline, alertCircleOutline } from 'ionicons/icons';
import { useAdStore } from '@/stores/ads';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();
const adStore = useAdStore();
const filter = ref<'all' | 'BUY' | 'SELL'>('all');

const filtered = computed(() =>
  filter.value === 'all'
    ? adStore.ads
    : adStore.ads.filter(a => a.side === filter.value),
);

onMounted(() => adStore.fetchAds());

async function refresh(ev: CustomEvent) {
  await adStore.fetchAds();
  (ev.target as HTMLIonRefresherElement).complete();
}
</script>

<style scoped>
.api-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 16px 0;
  background: rgba(246,70,93,.1);
  border: 1px solid rgba(246,70,93,.3);
  border-radius: 10px;
  padding: 12px 14px;
  color: #F6465D;
  font-size: 13px;
}
.api-error ion-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.api-error p { margin: 4px 0 0; color: #848E9C; font-size: 12px; }

.list-wrap { padding: 12px 16px 0; }
.center-spinner { display: flex; justify-content: center; padding: 40px; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  color: #848E9C;
  gap: 12px;
}

.ad-card {
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.ad-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.ad-side {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
}
.ad-side.buy  { background: rgba(14,203,129,.15); color: #0ECB81; }
.ad-side.sell { background: rgba(246,70, 93,.15);  color: #F6465D; }
.ad-asset { flex: 1; font-size: 14px; font-weight: 600; color: #EAECEF; }

.ad-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}
.price-val  { font-size: 26px; font-weight: 800; color: #F0B90B; }
.price-fiat { font-size: 14px; color: #848E9C; }
.price-float { font-size: 11px; background: rgba(240,185,11,.1); color: #F0B90B; padding: 2px 8px; border-radius: 10px; margin-left: 4px; }

.ad-meta-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.ad-meta { display: flex; justify-content: space-between; font-size: 12px; }
.ml { color: #848E9C; }
.mv { color: #EAECEF; font-weight: 500; }

.ad-payments { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.payment-chip {
  background: #2B3139;
  color: #EAECEF;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
}

.ad-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #2B3139;
}
.ad-stats { font-size: 11px; color: #848E9C; display: flex; align-items: center; gap: 6px; }
.dot { color: #2B3139; }
</style>
