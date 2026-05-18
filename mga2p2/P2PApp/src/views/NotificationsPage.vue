<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dashboard" text="" :icon="arrowBack"></ion-back-button>
        </ion-buttons>
        <ion-title>Notifications</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="notifications.length === 0" class="empty-state">
        <ion-icon :icon="notificationsOffOutline" style="font-size:48px;color:#848E9C"></ion-icon>
        <p>No notifications</p>
      </div>

      <div v-else class="notif-list">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.read }"
          @click="handleNotif(n)"
        >
          <div class="notif-icon-wrap" :class="n.type">
            <ion-icon :icon="notifIcon(n.type)"></ion-icon>
          </div>
          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-msg">{{ n.message }}</div>
            <div class="notif-time">{{ timeAgo(n.createdAt) }}</div>
          </div>
          <div v-if="!n.read" class="notif-dot"></div>
        </div>
      </div>

      <div style="height:40px"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon,
} from '@ionic/vue';
import {
  arrowBack, notificationsOffOutline,
  checkmarkCircleOutline, chatbubbleOutline,
  alertCircleOutline, newspaperOutline,
} from 'ionicons/icons';

const router = useRouter();

interface Notif {
  id: string;
  type: 'order' | 'chat' | 'system' | 'ad';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const now = new Date();
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

const notifications = ref<Notif[]>([
  { id: '1', type: 'order', title: 'Payment Received', message: 'Haja_buy marked payment as completed for order #202405071234', link: '/orders/1', read: false, createdAt: ago(5) },
  { id: '2', type: 'chat', title: 'New Message', message: 'Haja_buy: I have sent the payment, please check.', link: '/chat/chat_1', read: false, createdAt: ago(5) },
  { id: '3', type: 'order', title: 'Order Created', message: 'New order #202405071235 from Tojo_seller for 50 USDT', link: '/orders/2', read: true, createdAt: ago(120) },
  { id: '4', type: 'system', title: 'System Update', message: 'Your P2P merchant account has been renewed.', read: true, createdAt: ago(1440) },
  { id: '5', type: 'ad', title: 'Ad Impressions', message: 'Your SELL ad received 24 views today', link: '/ads', read: true, createdAt: ago(480) },
]);

function notifIcon(type: string) {
  switch (type) {
    case 'order':  return checkmarkCircleOutline;
    case 'chat':   return chatbubbleOutline;
    case 'ad':     return newspaperOutline;
    default:       return alertCircleOutline;
  }
}

function handleNotif(n: Notif) {
  n.read = true;
  if (n.link) router.push(n.link);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) > 1 ? 's' : ''} ago`;
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  color: #848E9C;
  gap: 12px;
}

.notif-list { padding-top: 4px; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #2B3139;
  cursor: pointer;
  transition: background .15s;
}
.notif-item.unread { background: rgba(240,185,11,.04); }
.notif-item:active { background: #1E2329; }

.notif-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.notif-icon-wrap.order  { background: rgba(14,203,129,.15); color: #0ECB81; }
.notif-icon-wrap.chat   { background: rgba(240,185,11,.15); color: #F0B90B; }
.notif-icon-wrap.ad     { background: rgba(51,117,187,.15); color: #3375BB; }
.notif-icon-wrap.system { background: rgba(132,142,156,.15); color: #848E9C; }

.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 14px; font-weight: 600; color: #EAECEF; margin-bottom: 2px; }
.notif-msg   { font-size: 13px; color: #848E9C; line-height: 1.4; margin-bottom: 4px; }
.notif-time  { font-size: 11px; color: #848E9C; }

.notif-dot {
  width: 8px;
  height: 8px;
  background: #F0B90B;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
</style>
