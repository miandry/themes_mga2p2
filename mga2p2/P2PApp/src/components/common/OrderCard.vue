<template>
  <div class="order-card" @click="$emit('click')">
    <div class="order-card__header">
      <div class="order-card__side" :class="order.side === 'BUY' ? 'buy' : 'sell'">
        {{ order.side }}
      </div>
      <span class="order-card__asset">{{ order.asset }}/{{ order.fiat }}</span>
      <span :class="['badge', statusBadgeClass]">{{ statusLabel }}</span>
    </div>

    <div v-if="countdownLine" class="order-card__countdown">
      <ion-icon :icon="timeOutline"></ion-icon>
      <span>{{ countdownLine }}</span>
    </div>

    <div class="order-card__body">
      <div class="order-card__row">
        <span class="label">Amount</span>
        <span class="value">{{ order.amount.toLocaleString() }} {{ order.asset }}</span>
      </div>
      <div class="order-card__row">
        <span class="label">Total</span>
        <span class="value highlight">{{ order.fiatAmount.toLocaleString() }} {{ order.fiat }}</span>
      </div>
      <div class="order-card__row">
        <span class="label">Price</span>
        <span class="value">{{ order.price.toLocaleString() }} {{ order.fiat }}/{{ order.asset }}</span>
      </div>
      <div class="order-card__row">
        <span class="label">Counterparty</span>
        <span class="value">{{ order.counterparty }}</span>
      </div>
      <div class="order-card__row">
        <span class="label">Payment</span>
        <span class="value">{{ order.paymentMethod }}</span>
      </div>
    </div>

    <div class="order-card__footer">
      <span class="order-no">#{{ order.orderNo }}</span>
      <span class="time">{{ timeAgo(order.updatedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import { timeOutline } from 'ionicons/icons';
import type { P2POrder } from '@/stores/orders';
import { getOrderCountdownContext } from '@/stores/orders';

const props = defineProps<{ order: P2POrder }>();
defineEmits<{ (e: 'click'): void }>();

const countdownLine = ref('');
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function updateCountdown() {
  const ctx = getOrderCountdownContext(props.order);
  if (!ctx) {
    countdownLine.value = '';
    return;
  }
  const diff = new Date(ctx.deadline).getTime() - Date.now();
  const prefix = ctx.kind === 'release' ? 'Release in' : 'Pay within';
  if (diff <= 0) {
    countdownLine.value = `${prefix}: ended`;
    return;
  }
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    countdownLine.value = `${prefix}: ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else {
    countdownLine.value = `${prefix}: ${m}:${String(s).padStart(2, '0')}`;
  }
}

watch(() => props.order, updateCountdown, { deep: true });

onMounted(() => {
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'In Progress',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  APPEALING: 'Appeal',
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'badge-pending',
  PROCESSING: 'badge-processing',
  PAID: 'badge-pending',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
  APPEALING: 'badge-sell',
};

const statusLabel = STATUS_LABELS[props.order.status] ?? props.order.status;
const statusBadgeClass = STATUS_CLASSES[props.order.status] ?? 'badge-pending';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
</script>

<style scoped>
.order-card {
  background: #1E2329;
  border: 1px solid #2B3139;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color .2s;
}
.order-card:active {
  border-color: #F0B90B;
}

.order-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.order-card__side {
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
}
.order-card__side.buy  { background: rgba(14,203,129,.15); color: #0ECB81; }
.order-card__side.sell { background: rgba(246,70, 93,.15);  color: #F6465D; }

.order-card__countdown {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(240, 185, 11, 0.08);
  border: 1px solid rgba(240, 185, 11, 0.25);
  font-size: 12px;
  font-weight: 600;
  color: #f0b90b;
}
.order-card__countdown ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.order-card__asset {
  font-size: 14px;
  font-weight: 600;
  color: #EAECEF;
  flex: 1;
}

.order-card__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.order-card__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.order-card__row .label { color: #848E9C; }
.order-card__row .value { color: #EAECEF; font-weight: 500; }
.order-card__row .value.highlight { color: #F0B90B; font-weight: 700; }

.order-card__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #2B3139;
  font-size: 11px;
  color: #848E9C;
}
</style>
