<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Messages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="chatStore.loading" class="center-spinner">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else-if="chatStore.chats.length === 0" class="empty-state">
        <ion-icon :icon="chatbubblesOutline" style="font-size:48px;color:#848E9C"></ion-icon>
        <p>No conversations yet</p>
      </div>

      <div v-else class="chat-list">
        <div
          v-for="chat in chatStore.chats"
          :key="chat.id"
          class="chat-item"
          @click="router.push(`/chat/${chat.id}`)"
        >
          <div class="chat-avatar">
            {{ chat.counterparty.slice(0, 2).toUpperCase() }}
            <span v-if="chat.unreadCount > 0" class="unread-dot"></span>
          </div>
          <div class="chat-body">
            <div class="chat-top">
              <span class="chat-name">{{ chat.counterparty }}</span>
              <span class="chat-time">{{ timeAgo(chat.lastMessageAt ?? '') }}</span>
            </div>
            <div class="chat-preview">
              <span class="order-tag">#{{ chat.orderNo }}</span>
              <span class="preview-text">{{ chat.lastMessage }}</span>
            </div>
          </div>
          <div v-if="chat.unreadCount > 0" class="unread-badge">{{ chat.unreadCount }}</div>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonSpinner, IonRefresher, IonRefresherContent,
} from '@ionic/vue';
import { chatbubblesOutline } from 'ionicons/icons';
import { useChatStore } from '@/stores/chat';
const router = useRouter();
const chatStore = useChatStore();

onMounted(() => chatStore.fetchChats());

async function refresh(ev: CustomEvent) {
  await chatStore.fetchChats();
  (ev.target as HTMLIonRefresherElement).complete();
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
</script>

<style scoped>
.center-spinner { display: flex; justify-content: center; padding: 40px; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  color: #848E9C;
  gap: 12px;
}

.chat-list { padding-top: 4px; }

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #2B3139;
  cursor: pointer;
  transition: background .15s;
}
.chat-item:active { background: #1E2329; }

.chat-avatar {
  position: relative;
  width: 46px;
  height: 46px;
  background: #2B3139;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #F0B90B;
  flex-shrink: 0;
}
.unread-dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  background: #0ECB81;
  border-radius: 50%;
  border: 2px solid #0B0E11;
}

.chat-body { flex: 1; min-width: 0; }
.chat-top  { display: flex; justify-content: space-between; margin-bottom: 4px; }
.chat-name { font-size: 15px; font-weight: 600; color: #EAECEF; }
.chat-time { font-size: 11px; color: #848E9C; }
.chat-preview { display: flex; align-items: center; gap: 6px; }
.order-tag { font-size: 10px; background: #2B3139; color: #848E9C; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.preview-text { font-size: 13px; color: #848E9C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.unread-badge {
  background: #F6465D;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  flex-shrink: 0;
}
</style>
