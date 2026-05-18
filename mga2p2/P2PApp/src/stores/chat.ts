import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/services/api';
import { useAuthStore } from './auth';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface Chat {
  id: string;
  orderId: string;
  orderNo: string;
  counterparty: string;
  counterpartyAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);

  async function fetchChats() {
    const auth = useAuthStore();
    loading.value = true;
    error.value = null;
    try {
      const data = await apiFetch<{ data: Chat[] }>(
        '/api_solutions/p2p/chats',
        {},
        auth.token,
      );
      chats.value = data.data ?? [];
    } catch {
      chats.value = DEMO_CHATS;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMessages(chatId: string) {
    const auth = useAuthStore();
    try {
      const data = await apiFetch<{ data: ChatMessage[] }>(
        `/api_solutions/p2p/chats/${chatId}/messages`,
        {},
        auth.token,
      );
      const chat = chats.value.find(c => c.id === chatId);
      if (chat) {
        chat.messages = data.data ?? [];
        chat.unreadCount = 0;
      }
    } catch {
      // keep demo messages
    }
  }

  async function sendMessage(chatId: string, content: string, type: 'TEXT' | 'IMAGE' = 'TEXT') {
    const auth = useAuthStore();
    sending.value = true;
    try {
      const msg: ChatMessage = {
        id: Date.now().toString(),
        chatId,
        senderId: auth.user?.uid ?? 'me',
        senderName: auth.user?.name ?? 'Me',
        content,
        type,
        createdAt: new Date().toISOString(),
        read: false,
      };
      // Optimistic insert
      const chat = chats.value.find(c => c.id === chatId);
      if (chat) {
        chat.messages.push(msg);
        chat.lastMessage = content;
        chat.lastMessageAt = msg.createdAt;
      }
      // Fire and forget real API
      apiFetch(
        `/api_solutions/p2p/chats/${chatId}/messages`,
        { method: 'POST', body: JSON.stringify({ content, type }) },
        auth.token,
      ).catch(() => {});
      return msg;
    } finally {
      sending.value = false;
    }
  }

  function getChat(id: string) {
    return chats.value.find(c => c.id === id) ?? null;
  }

  const totalUnread = () => chats.value.reduce((s, c) => s + c.unreadCount, 0);

  return { chats, loading, sending, error, fetchChats, fetchMessages, sendMessage, getChat, totalUnread };
});

const now = new Date();
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

const DEMO_CHATS: Chat[] = [
  {
    id: 'chat_1',
    orderId: '1',
    orderNo: '202405071234',
    counterparty: 'Haja_buy',
    lastMessage: 'I have sent the payment, please check.',
    lastMessageAt: ago(5),
    unreadCount: 2,
    messages: [
      { id: 'm1', chatId: 'chat_1', senderId: 'haja', senderName: 'Haja_buy', content: 'Hi, I want to buy 100 USDT', type: 'TEXT', createdAt: ago(30), read: true },
      { id: 'm2', chatId: 'chat_1', senderId: 'me', senderName: 'Me', content: 'Sure, please send MGA 460,000 to Mobile Money 034 00 000 00', type: 'TEXT', createdAt: ago(28), read: true },
      { id: 'm3', chatId: 'chat_1', senderId: 'haja', senderName: 'Haja_buy', content: 'I have sent the payment, please check.', type: 'TEXT', createdAt: ago(5), read: false },
    ],
  },
  {
    id: 'chat_2',
    orderId: '2',
    orderNo: '202405071235',
    counterparty: 'Tojo_seller',
    lastMessage: 'Waiting for your payment confirmation',
    lastMessageAt: ago(40),
    unreadCount: 0,
    messages: [
      { id: 'm4', chatId: 'chat_2', senderId: 'tojo', senderName: 'Tojo_seller', content: 'Hello, I am the seller. Please pay within 15 minutes.', type: 'TEXT', createdAt: ago(60), read: true },
      { id: 'm5', chatId: 'chat_2', senderId: 'me', senderName: 'Me', content: 'Ok I will pay now', type: 'TEXT', createdAt: ago(50), read: true },
      { id: 'm6', chatId: 'chat_2', senderId: 'tojo', senderName: 'Tojo_seller', content: 'Waiting for your payment confirmation', type: 'TEXT', createdAt: ago(40), read: true },
    ],
  },
];
