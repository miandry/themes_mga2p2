<template>
  <ion-footer class="ion-no-border">
    <div class="bottom-nav">
      <div
        v-for="item in navItems"
        :key="item.route"
        class="nav-item"
        :class="{ active: active === item.key }"
        @click="go(item.route)"
      >
        <div class="nav-icon-wrap">
          <ion-icon :icon="active === item.key ? item.iconFilled : item.iconOutline"></ion-icon>
          <span v-if="item.badge && item.badge > 0" class="nav-badge">{{ item.badge > 9 ? '9+' : item.badge }}</span>
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>
  </ion-footer>
</template>

<script setup lang="ts">
import { IonFooter, IonIcon } from '@ionic/vue';
import {
  home, homeOutline,
  listCircle, listCircleOutline,
  newspaper, newspaperOutline,
  chatbubbles, chatbubblesOutline,
  person, personOutline,
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { computed } from 'vue';

const props = defineProps<{ active: string }>();
const router = useRouter();
const chatStore = useChatStore();

const unread = computed(() => chatStore.totalUnread());

const navItems = computed(() => [
  { key: 'dashboard', route: '/dashboard', label: 'Home',    iconFilled: home,        iconOutline: homeOutline,        badge: 0 },
  { key: 'orders',    route: '/orders',    label: 'Orders',  iconFilled: listCircle,  iconOutline: listCircleOutline,  badge: 0 },
  { key: 'ads',       route: '/ads',       label: 'My Ads',  iconFilled: newspaper,   iconOutline: newspaperOutline,   badge: 0 },
  { key: 'chat',      route: '/chat',      label: 'Chat',    iconFilled: chatbubbles, iconOutline: chatbubblesOutline, badge: unread.value },
  { key: 'account',   route: '/account',   label: 'Account', iconFilled: person,      iconOutline: personOutline,      badge: 0 },
]);

function go(route: string) {
  router.push(route);
}
</script>

<style scoped>
.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #1E2329;
  border-top: 1px solid #2B3139;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #848E9C;
  font-size: 10px;
  cursor: pointer;
  flex: 1;
  transition: color .2s;
  gap: 3px;
  min-width: 0;
}

.nav-item.active {
  color: #F0B90B;
}

.nav-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

ion-icon {
  font-size: 22px;
}

.nav-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: #F6465D;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
