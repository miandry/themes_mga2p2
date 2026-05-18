<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Orders</ion-title>
      </ion-toolbar>
      <ion-toolbar style="--background:#0B0E11;padding-bottom:8px">
        <ion-segment v-model="filter" class="ion-padding-horizontal">
          <ion-segment-button value="active">Active</ion-segment-button>
          <ion-segment-button value="completed">Completed</ion-segment-button>
          <ion-segment-button value="all">All</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar class="poll-toolbar">
        <div class="poll-row">
          <span class="poll-label">Auto refresh</span>
          <ion-toggle :checked="pollEnabled" @ionChange="onTogglePoll($event)"></ion-toggle>
        </div>
        <div class="poll-row poll-row--second">
          <span class="poll-label">Every</span>
          <ion-select
            :value="pollSeconds"
            interface="popover"
            :disabled="!pollEnabled"
            @ionChange="onSelectSeconds($event)"
          >
            <ion-select-option v-for="s in pollOptions" :key="s" :value="s">
              {{ formatEvery(s) }}
            </ion-select-option>
          </ion-select>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="orderStore.loading" class="center-spinner">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else-if="filtered.length === 0" class="empty-state">
        <ion-icon :icon="receiptOutline" style="font-size:48px;color:#848E9C"></ion-icon>
        <p>No orders found</p>
      </div>

      <div v-else class="list-wrap">
        <OrderCard
          v-for="order in filtered"
          :key="order.id"
          :order="order"
          @click="router.push(`/orders/${order.id}`)"
        />
      </div>

      <div style="height:80px"></div>
    </ion-content>

    <BottomNav active="orders" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent,
  IonToggle, IonSelect, IonSelectOption,
  onIonViewWillEnter, onIonViewDidLeave,
} from '@ionic/vue';
import { receiptOutline } from 'ionicons/icons';
import { useOrderStore } from '@/stores/orders';
import BottomNav from '@/components/common/BottomNav.vue';
import OrderCard from '@/components/common/OrderCard.vue';

const LS_POLL_ON = 'mga2p2_orders_poll_on';
const LS_POLL_SEC = 'mga2p2_orders_poll_sec';

const pollOptions = [5, 15, 30, 60, 120, 300] as const;

function isPollOption(n: number): n is (typeof pollOptions)[number] {
  return (pollOptions as readonly number[]).includes(n);
}

const envDefaultSec = Number(import.meta.env.VITE_ORDERS_POLL_SECONDS);
const defaultSeconds =
  Number.isFinite(envDefaultSec) && envDefaultSec >= 5 && isPollOption(envDefaultSec)
    ? envDefaultSec
    : 60;

function readPollEnabled(): boolean {
  const v = localStorage.getItem(LS_POLL_ON);
  if (v === null) return true;
  return v === '1';
}

function readPollSeconds(): number {
  const raw = localStorage.getItem(LS_POLL_SEC);
  const n = raw ? parseInt(raw, 10) : defaultSeconds;
  return isPollOption(n) ? n : defaultSeconds;
}

const router = useRouter();
const orderStore = useOrderStore();
const filter = ref<'active' | 'completed' | 'all'>('active');

const pollEnabled = ref(readPollEnabled());
const pollSeconds = ref(readPollSeconds());

let pollTimer: ReturnType<typeof setInterval> | null = null;

const filtered = computed(() => {
  if (filter.value === 'active')    return orderStore.activeOrders;
  if (filter.value === 'completed') return orderStore.completedOrders;
  return orderStore.orders;
});

function formatEvery(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec % 60 === 0) return `${sec / 60} min`;
  return `${sec}s`;
}

function stopPoll() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll() {
  stopPoll();
  if (!pollEnabled.value) return;
  const ms = Math.max(5, pollSeconds.value) * 1000;
  pollTimer = setInterval(() => {
    if (!orderStore.loading) {
      void orderStore.fetchOrders({ silent: true });
    }
  }, ms);
}

onIonViewWillEnter(async () => {
  pollEnabled.value = readPollEnabled();
  pollSeconds.value = readPollSeconds();
  await orderStore.fetchOrders();
  startPoll();
});

onIonViewDidLeave(() => {
  stopPoll();
});

function onTogglePoll(ev: CustomEvent) {
  const checked = (ev.detail as { checked: boolean }).checked;
  pollEnabled.value = checked;
  localStorage.setItem(LS_POLL_ON, checked ? '1' : '0');
  if (checked) startPoll();
  else stopPoll();
}

function onSelectSeconds(ev: CustomEvent) {
  const sec = Number((ev.detail as { value: number }).value);
  if (!isPollOption(sec)) return;
  pollSeconds.value = sec;
  localStorage.setItem(LS_POLL_SEC, String(sec));
  startPoll();
}

async function refresh(ev: CustomEvent) {
  await orderStore.fetchOrders();
  (ev.target as HTMLIonRefresherElement).complete();
}
</script>

<style scoped>
.poll-toolbar {
  --background: #0B0E11;
  --min-height: 44px;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 4px;
  --padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}
.poll-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.poll-row--second {
  padding-top: 2px;
}
.poll-label {
  font-size: 13px;
  color: #848e9c;
}
ion-select {
  max-width: 140px;
  font-size: 14px;
  color: #eaecef;
}
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
</style>
