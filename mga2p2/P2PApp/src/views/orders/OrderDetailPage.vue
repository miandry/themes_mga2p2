<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" :icon="arrowBack"></ion-back-button>
        </ion-buttons>
        <ion-title>Order Detail</ion-title>
        <ion-buttons v-if="effectiveChatId" slot="end">
          <ion-button fill="clear" @click="goChat">
            <ion-icon :icon="chatbubbleOutline" style="color:#F0B90B"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="!order" class="not-found">
        <p>Order not found</p>
        <ion-button fill="outline" @click="router.back()">Go back</ion-button>
      </div>

      <template v-else>
        <!-- Status banner -->
        <div class="status-banner" :class="order.side.toLowerCase()">
          <div class="status-banner__side">{{ order.side }}</div>
          <div class="status-banner__asset">{{ order.amount }} {{ order.asset }}</div>
          <div class="status-banner__fiat">≈ {{ order.fiatAmount.toLocaleString() }} {{ order.fiat }}</div>
          <span :class="['badge', statusBadgeClass]">{{ statusLabel }}</span>
        </div>

        <!-- Countdown for active orders -->
        <div v-if="countdownVisible" class="countdown-bar">
          <ion-icon :icon="timeOutline"></ion-icon>
          <span>Release in: <strong>{{ countdown }}</strong></span>
        </div>

        <!-- Details card -->
        <div class="detail-card">
          <div class="detail-row">
            <span class="dl">Order No.</span>
            <span class="dv mono">{{ order.orderNo }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Price</span>
            <span class="dv">{{ order.price.toLocaleString() }} {{ order.fiat }}/{{ order.asset }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Amount</span>
            <span class="dv">{{ order.amount }} {{ order.asset }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Total</span>
            <span class="dv yellow">{{ order.fiatAmount.toLocaleString() }} {{ order.fiat }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Payment</span>
            <span class="dv">{{ order.paymentMethod }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Counterparty</span>
            <span class="dv">{{ order.counterparty }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Created</span>
            <span class="dv">{{ formatDate(order.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="dl">Updated</span>
            <span class="dv">{{ formatDate(order.updatedAt) }}</span>
          </div>
        </div>

        <!-- Chat history for this order -->
        <div class="chat-history-card">
          <div class="chat-history-title">Chat history</div>
          <div v-if="chatHistoryLoading" class="chat-history-loading">
            <ion-spinner name="crescent" color="warning"></ion-spinner>
          </div>
          <div v-else-if="chatMessages.length === 0" class="chat-history-empty">
            <ion-icon :icon="chatbubbleOutline" style="font-size:28px;color:#848E9C"></ion-icon>
            <p>No messages for this order</p>
          </div>
          <div v-else class="chat-history-messages">
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              class="msg-row"
              :class="msg.senderId === myId ? 'me' : 'them'"
            >
              <div class="msg-bubble" :class="msg.senderId === myId ? 'bubble-me' : 'bubble-them'">
                <div v-if="msg.type === 'IMAGE' && msg.imageUrl" class="msg-img">
                  <img :src="msg.imageUrl" alt="" />
                </div>
                <div v-else-if="msg.type === 'SYSTEM'" class="msg-system">{{ msg.content }}</div>
                <div v-else class="msg-text">{{ msg.content }}</div>
                <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <ion-button
            v-if="showTransferredBtn"
            expand="block"
            fill="solid"
            color="warning"
            class="transfer-btn"
            :disabled="transferring"
            @click="showTransferAlert = true"
          >
            <ion-icon slot="start" :icon="swapHorizontalOutline"></ion-icon>
            {{ transferring ? 'Saving…' : 'Transferred' }}
          </ion-button>

          <ion-button
            v-if="order.canRelease"
            expand="block"
            color="success"
            class="release-btn"
            :disabled="releasing"
            @click="confirmRelease"
          >
            <ion-icon slot="start" :icon="checkmarkCircle"></ion-icon>
            {{ releasing ? 'Releasing…' : 'Release Crypto' }}
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            color="warning"
            @click="goChat"
          >
            <ion-icon slot="start" :icon="chatbubbleOutline"></ion-icon>
            Open Chat
          </ion-button>
        </div>

        <!-- Release confirm modal -->
        <ion-alert
          :is-open="showReleaseAlert"
          header="Confirm Release"
          :message="`You are about to release ${order.amount} ${order.asset} to ${order.counterparty}. Have you received the payment of ${order.fiatAmount.toLocaleString()} ${order.fiat}?`"
          :buttons="releaseAlertButtons"
          @didDismiss="showReleaseAlert = false"
        ></ion-alert>

        <ion-alert
          :is-open="showTransferAlert"
          header="Payment transferred"
          message="Confirm you have sent the fiat / payment for this order. The counterparty will be notified."
          :buttons="transferAlertButtons"
          @didDismiss="showTransferAlert = false"
        ></ion-alert>
      </template>

      <div style="height:40px"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, toValue } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonBackButton, IonIcon, IonAlert, IonSpinner,
} from '@ionic/vue';
import {
  arrowBack, chatbubbleOutline, timeOutline,
  checkmarkCircle, swapHorizontalOutline,
} from 'ionicons/icons';
import { useOrderStore } from '@/stores/orders';
import { useAuthStore } from '@/stores/auth';
import { apiFetch } from '@/services/api';
import type { ChatMessage } from '@/stores/chat';

const router = useRouter();
const route = useRoute();
const orderStore = useOrderStore();
const authStore = useAuthStore();

const order = computed(() => orderStore.getOrder(route.params.id as string));
const releasing = ref(false);
const transferring = ref(false);
const showReleaseAlert = ref(false);
const showTransferAlert = ref(false);

const myId = computed(() => authStore.user?.uid ?? 'me');

/** Chat thread: explicit chatId on order, or stub pattern chat_{orderId}. */
const effectiveChatId = computed(() => {
  const o = order.value;
  if (!o) return '';
  return o.chatId || `chat_${o.id}`;
});

const chatMessages = ref<ChatMessage[]>([]);
const chatHistoryLoading = ref(false);

const showTransferredBtn = computed(() => {
  const o = order.value;
  if (!o || o.side !== 'BUY') return false;
  return ['PENDING', 'PROCESSING'].includes(o.status);
});

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', PROCESSING: 'In Progress', PAID: 'Paid ✓',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', APPEALING: 'Appeal',
};
const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'badge-pending', PROCESSING: 'badge-processing', PAID: 'badge-pending',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled', APPEALING: 'badge-sell',
};

const statusLabel = computed(() => STATUS_LABELS[order.value?.status ?? ''] ?? '');
const statusBadgeClass = computed(() => STATUS_CLASSES[order.value?.status ?? ''] ?? 'badge-pending');

// Countdown
const countdown = ref('—');
let timer: ReturnType<typeof setInterval> | null = null;

const countdownVisible = computed(() =>
  order.value?.canRelease && !!order.value?.releaseDeadline,
);

function updateCountdown() {
  if (!order.value?.releaseDeadline) return;
  const diff = new Date(order.value.releaseDeadline).getTime() - Date.now();
  if (diff <= 0) { countdown.value = 'Expired'; return; }
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  countdown.value = `${m}:${String(s).padStart(2, '0')}`;
}

onMounted(async () => {
  if (!order.value) {
    await orderStore.fetchOrders();
  }
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
  await loadChatHistory();
});
onUnmounted(() => { if (timer) clearInterval(timer); });

function sortChatMessagesByTime(rows: ChatMessage[]): ChatMessage[] {
  return [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

async function loadChatHistory() {
  const o = order.value;
  const cid = effectiveChatId.value;
  if (!o || !cid) {
    chatMessages.value = [];
    return;
  }
  const token = toValue(authStore.token);
  chatHistoryLoading.value = true;
  try {
    const data = await apiFetch<{ data: ChatMessage[] }>(
      `/api_solutions/p2p/chats/${encodeURIComponent(cid)}/messages`,
      {},
      token,
    );
    let rows = data.data ?? [];
    if (rows.length === 0) {
      try {
        const list = await apiFetch<{ data: { id: string; orderId: string; orderNo: string; messages: ChatMessage[] }[] }>(
          '/api_solutions/p2p/chats',
          {},
          token,
        );
        const hit = list.data?.find(
          c => c.orderId === o.id || c.orderNo === o.orderNo,
        );
        if (hit?.messages?.length) {
          rows = hit.messages;
        }
      } catch {
        /* keep rows as [] */
      }
    }
    chatMessages.value = sortChatMessagesByTime(rows);
  } catch {
    chatMessages.value = [];
  } finally {
    chatHistoryLoading.value = false;
  }
}

watch(
  () => [order.value?.id, effectiveChatId.value] as const,
  () => {
    void loadChatHistory();
  },
  { immediate: true },
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function goChat() {
  const id = order.value?.chatId || effectiveChatId.value;
  if (id) router.push(`/chat/${id}`);
}

function confirmRelease() {
  showReleaseAlert.value = true;
}

const releaseAlertButtons = computed(() => [
  { text: 'Cancel', role: 'cancel' },
  {
    text: 'Release',
    cssClass: 'alert-release-btn',
    handler: async () => {
      releasing.value = true;
      await orderStore.releaseOrder(order.value!.id);
      releasing.value = false;
      await loadChatHistory();
    },
  },
]);

const transferAlertButtons = computed(() => [
  { text: 'Cancel', role: 'cancel' },
  {
    text: 'Transferred',
    cssClass: 'alert-transfer-btn',
    handler: async () => {
      transferring.value = true;
      await orderStore.markOrderTransferred(order.value!.id);
      transferring.value = false;
      await loadChatHistory();
    },
  },
]);
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  gap: 12px;
  color: #848E9C;
}

.status-banner {
  margin: 16px;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #2B3139;
}
.status-banner.buy  { background: linear-gradient(135deg, rgba(14,203,129,.12), rgba(14,203,129,.04)); }
.status-banner.sell { background: linear-gradient(135deg, rgba(246,70,93,.12),  rgba(246,70,93,.04)); }

.status-banner__side { font-size: 12px; font-weight: 700; color: #848E9C; text-transform: uppercase; }
.status-banner__asset { font-size: 28px; font-weight: 800; color: #EAECEF; }
.status-banner__fiat  { font-size: 14px; color: #848E9C; margin-bottom: 8px; }

.countdown-bar {
  margin: 0 16px 8px;
  background: rgba(240,185,11,.1);
  border: 1px solid rgba(240,185,11,.3);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #F0B90B;
  font-size: 13px;
}

.detail-card {
  margin: 0 16px;
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  overflow: hidden;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2B3139;
  font-size: 13px;
}
.detail-row:last-child { border-bottom: none; }
.dl { color: #848E9C; }
.dv { color: #EAECEF; font-weight: 500; }
.dv.yellow { color: #F0B90B; font-weight: 700; }
.dv.mono { font-family: monospace; font-size: 12px; }

.actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.transfer-btn {
  --background: #F0B90B;
  --color: #000;
  font-weight: 700;
  font-size: 15px;
  height: 48px;
}
.release-btn {
  --background: #0ECB81;
  --color: #fff;
  font-weight: 700;
  font-size: 16px;
  height: 52px;
}

.chat-history-card {
  margin: 0 16px 12px;
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  padding: 12px 12px 14px;
}
.chat-history-title {
  font-size: 12px;
  font-weight: 700;
  color: #848e9c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.chat-history-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}
.chat-history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  color: #848e9c;
  font-size: 13px;
}
.chat-history-messages {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}
.msg-row { display: flex; }
.msg-row.me { justify-content: flex-end; }
.msg-row.them { justify-content: flex-start; }
.msg-bubble { max-width: 85%; min-width: 56px; }
.bubble-me {
  background: #F0B90B;
  color: #000;
  border-radius: 14px 4px 14px 14px;
  padding: 8px 10px;
}
.bubble-them {
  background: #2B3139;
  color: #eaecef;
  border: 1px solid #2b3139;
  border-radius: 4px 14px 14px 14px;
  padding: 8px 10px;
}
.msg-text { font-size: 13px; line-height: 1.45; word-break: break-word; }
.msg-system {
  font-size: 11px;
  color: #848e9c;
  text-align: center;
  font-style: italic;
}
.msg-img img { max-width: 160px; border-radius: 8px; }
.msg-time {
  font-size: 9px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}
</style>
