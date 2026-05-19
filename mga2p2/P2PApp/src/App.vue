<template>
  <ion-app>
    <template v-if="isLoginRoute">
      <ion-router-outlet />
    </template>
    <template v-else>
      <div class="p2p-shell" :class="{ 'p2p-shell--sidebar-open': sidebarOpen }">
        <button
          v-show="narrow"
          type="button"
          class="p2p-menu-btn"
          aria-label="Ouvrir le menu"
          @click="toggleSidebar"
        >
          <ion-icon :icon="menuOutline" />
        </button>
        <div
          v-show="narrow && sidebarOpen"
          class="p2p-backdrop"
          aria-hidden="true"
          @click="sidebarOpen = false"
        />
        <aside class="p2p-sidebar" aria-label="Navigation principale">
          <div class="p2p-sidebar__brand">
            <span class="p2p-sidebar__logo">MGA</span>
            <span class="p2p-sidebar__title">P2P</span>
          </div>
          <nav class="p2p-sidebar__nav">
            <RouterLink
              class="p2p-nav-link"
              to="/dashboard"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="gridOutline" aria-hidden="true" />
              <span>Dashboard</span>
            </RouterLink>
            <RouterLink
              class="p2p-nav-link"
              to="/orders"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="receiptOutline" aria-hidden="true" />
              <span>Orders</span>
            </RouterLink>
            <RouterLink
              class="p2p-nav-link"
              to="/ads"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="megaphoneOutline" aria-hidden="true" />
              <span>My ads</span>
            </RouterLink>
            <RouterLink
              class="p2p-nav-link"
              to="/chat"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="chatbubblesOutline" aria-hidden="true" />
              <span>Messages</span>
            </RouterLink>
            <RouterLink
              class="p2p-nav-link"
              to="/notifications"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="notificationsOutline" aria-hidden="true" />
              <span>Notifications</span>
            </RouterLink>
            <RouterLink
              class="p2p-nav-link"
              to="/account"
              active-class="p2p-nav-link--active"
              @click="closeMobileSidebar"
            >
              <ion-icon :icon="personOutline" aria-hidden="true" />
              <span>Account</span>
            </RouterLink>
          </nav>
          <div class="p2p-sidebar__footer">
            <button type="button" class="p2p-nav-logout" @click="onLogout">
              <ion-icon :icon="logOutOutline" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </aside>
        <main class="p2p-main">
          <ion-router-outlet />
        </main>
      </div>
    </template>
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { IonApp, IonIcon, IonRouterOutlet } from '@ionic/vue';
import {
  chatbubblesOutline,
  gridOutline,
  logOutOutline,
  megaphoneOutline,
  menuOutline,
  notificationsOutline,
  personOutline,
  receiptOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoginRoute = computed(() => route.name === 'Login' || route.path === '/login');

const narrow = ref(false);
const sidebarOpen = ref(false);
let mql: MediaQueryList | null = null;

function applyMq() {
  if (!mql) {
    return;
  }
  narrow.value = !mql.matches;
  sidebarOpen.value = mql.matches;
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function closeMobileSidebar() {
  if (narrow.value) {
    sidebarOpen.value = false;
  }
}

function onLogout() {
  authStore.logout();
  closeMobileSidebar();
  void router.push('/login');
}

function mqListener() {
  applyMq();
}

onMounted(() => {
  authStore.init();
  mql = window.matchMedia('(min-width: 900px)');
  applyMq();
  mql.addEventListener('change', mqListener);
});

onUnmounted(() => {
  mql?.removeEventListener('change', mqListener);
});
</script>

<style scoped>
.p2p-shell {
  display: flex;
  min-height: 100%;
  position: relative;
}

.p2p-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 2100;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--p2p-border, #2b3139);
  border-radius: 10px;
  background: var(--p2p-bg-secondary, #1e2329);
  color: var(--p2p-yellow, #f0b90b);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.p2p-menu-btn ion-icon {
  font-size: 24px;
}

.p2p-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1990;
  background: rgba(0, 0, 0, 0.55);
}

.p2p-sidebar {
  display: flex;
  flex-direction: column;
  width: 232px;
  flex-shrink: 0;
  background: var(--p2p-bg-secondary, #1e2329);
  border-right: 1px solid var(--p2p-border, #2b3139);
  min-height: 100vh;
  z-index: 2000;
}

.p2p-sidebar__brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 20px 18px 16px;
  border-bottom: 1px solid var(--p2p-border, #2b3139);
}

.p2p-sidebar__logo {
  font-weight: 800;
  font-size: 20px;
  color: var(--p2p-yellow, #f0b90b);
  letter-spacing: -0.02em;
}

.p2p-sidebar__title {
  font-weight: 600;
  font-size: 15px;
  color: var(--p2p-text, #eaecef);
}

.p2p-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 10px;
  flex: 1;
  overflow-y: auto;
}

.p2p-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: var(--p2p-text-secondary, #848e9c);
  font-size: 14px;
  font-weight: 600;
  transition:
    background 0.15s,
    color 0.15s;
}

.p2p-nav-link ion-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.p2p-nav-link:hover {
  color: var(--p2p-text, #eaecef);
  background: rgba(240, 185, 11, 0.06);
}

.p2p-nav-link--active {
  color: var(--p2p-yellow, #f0b90b);
  background: rgba(240, 185, 11, 0.12);
}

.p2p-sidebar__footer {
  padding: 12px 10px 20px;
  border-top: 1px solid var(--p2p-border, #2b3139);
}

.p2p-nav-logout {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 12px;
  border-radius: 10px;
  border: 1px solid rgba(246, 70, 93, 0.35);
  background: transparent;
  color: var(--p2p-red, #f6465d);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.p2p-nav-logout ion-icon {
  font-size: 22px;
}

.p2p-nav-logout:hover {
  background: rgba(246, 70, 93, 0.1);
}

.p2p-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 899px) {
  .p2p-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.35);
  }

  .p2p-shell--sidebar-open .p2p-sidebar {
    transform: translateX(0);
  }

  .p2p-main {
    width: 100%;
  }
}

@media (min-width: 900px) {
  .p2p-sidebar {
    position: relative;
    transform: none !important;
  }

  .p2p-backdrop {
    display: none !important;
  }

  .p2p-menu-btn {
    display: none !important;
  }
}
</style>
