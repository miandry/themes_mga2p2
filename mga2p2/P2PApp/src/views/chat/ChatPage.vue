<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/chat" text="" :icon="arrowBack"></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="chat-title-wrap">
            <span class="chat-title-name">{{ chat?.counterparty ?? 'Chat' }}</span>
            <span v-if="chat" class="chat-title-order">#{{ chat.orderNo }}</span>
          </div>
        </ion-title>
        <ion-buttons v-if="chat?.orderId" slot="end">
          <ion-button fill="clear" @click="router.push(`/orders/${chat.orderId}`)">
            <ion-icon :icon="receiptOutline" style="color:#F0B90B"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :fullscreen="true" :scroll-events="true">
      <div class="messages-wrap">
        <div v-if="!chat || chat.messages.length === 0" class="empty-chat">
          <ion-icon :icon="chatbubbleOutline" style="font-size:36px;color:#848E9C"></ion-icon>
          <p>No messages yet</p>
        </div>

        <template v-else>
          <div
            v-for="msg in chat.messages"
            :key="msg.id"
            class="msg-row"
            :class="msg.senderId === myId ? 'me' : 'them'"
          >
            <div class="msg-bubble" :class="msg.senderId === myId ? 'bubble-me' : 'bubble-them'">
              <div v-if="msg.type === 'IMAGE' && msg.imageUrl" class="msg-img">
                <img :src="msg.imageUrl" alt="image" />
              </div>
              <div v-else-if="msg.type === 'SYSTEM'" class="msg-system">{{ msg.content }}</div>
              <div v-else class="msg-text">{{ msg.content }}</div>
              <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
            </div>
          </div>
        </template>
      </div>
    </ion-content>

    <!-- Input bar -->
    <ion-footer class="ion-no-border">
      <div class="input-bar">
        <ion-button fill="clear" size="small">
          <ion-icon :icon="imageOutline" style="color:#848E9C;font-size:22px"></ion-icon>
        </ion-button>
        <div class="input-wrap">
          <ion-textarea
            v-model="draft"
            placeholder="Type a message…"
            :auto-grow="true"
            :rows="1"
            :max-rows="4"
            @keydown.enter.exact.prevent="send"
          ></ion-textarea>
        </div>
        <ion-button fill="clear" size="small" :disabled="!draft.trim() || chatStore.sending" @click="send">
          <ion-icon :icon="sendOutline" :style="{ color: draft.trim() ? '#F0B90B' : '#848E9C', fontSize: '22px' }"></ion-icon>
        </ion-button>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFooter, IonButtons, IonButton, IonBackButton, IonIcon,
  IonTextarea,
} from '@ionic/vue';
import { arrowBack, receiptOutline, chatbubbleOutline, imageOutline, sendOutline } from 'ionicons/icons';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const chatStore = useChatStore();
const authStore = useAuthStore();

const contentRef = ref<HTMLIonContentElement | null>(null);
const draft = ref('');

const chat = computed(() => chatStore.getChat(route.params.id as string));
const myId = computed(() => authStore.user?.uid ?? 'me');

onMounted(async () => {
  if (chatStore.chats.length === 0) await chatStore.fetchChats();
  await chatStore.fetchMessages(route.params.id as string);
  scrollBottom();
});

watch(() => chat.value?.messages.length, () => nextTick(scrollBottom));

function scrollBottom() {
  contentRef.value?.scrollToBottom(200);
}

async function send() {
  const text = draft.value.trim();
  if (!text || !chat.value) return;
  draft.value = '';
  await chatStore.sendMessage(chat.value.id, text);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.chat-title-wrap { display: flex; flex-direction: column; gap: 1px; }
.chat-title-name { font-size: 15px; font-weight: 700; }
.chat-title-order { font-size: 11px; color: #848E9C; }

.messages-wrap {
  padding: 12px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100%;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px 24px;
  color: #848E9C;
  gap: 10px;
}

.msg-row {
  display: flex;
}
.msg-row.me   { justify-content: flex-end; }
.msg-row.them { justify-content: flex-start; }

.msg-bubble { max-width: 75%; min-width: 60px; }

.bubble-me {
  background: #F0B90B;
  color: #000;
  border-radius: 16px 4px 16px 16px;
  padding: 10px 12px;
}
.bubble-them {
  background: #1E2329;
  color: #EAECEF;
  border-radius: 4px 16px 16px 16px;
  border: 1px solid #2B3139;
  padding: 10px 12px;
}

.msg-text { font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-system {
  font-size: 12px;
  color: #848E9C;
  text-align: center;
  font-style: italic;
}
.msg-img img { max-width: 200px; border-radius: 8px; }
.msg-time {
  font-size: 10px;
  opacity: .65;
  margin-top: 4px;
  text-align: right;
}

/* Input bar */
.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 8px max(8px, env(safe-area-inset-bottom));
  background: #1E2329;
  border-top: 1px solid #2B3139;
}
.input-wrap {
  flex: 1;
  background: #2B3139;
  border-radius: 20px;
  padding: 4px 12px;
}
ion-textarea {
  --background: transparent;
  --color: #EAECEF;
  --placeholder-color: #848E9C;
  --padding-top: 6px;
  --padding-bottom: 6px;
  font-size: 14px;
}
</style>
