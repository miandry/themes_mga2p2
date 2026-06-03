<template>
  <div class="shell" :class="{ 'shell--nav-open': navOpen && narrow && loggedIn }">
    <template v-if="loggedIn && !isLoginRoute">
      <button
        v-show="narrow"
        type="button"
        class="form-menu-btn"
        :aria-expanded="navOpen"
        aria-controls="form-sidebar-nav"
        aria-label="Ouvrir le menu"
        @click="toggleNav"
      >
        <span class="form-menu-btn__bars" aria-hidden="true" />
      </button>

      <div
        v-show="narrow && navOpen"
        class="form-backdrop"
        aria-hidden="true"
        @click="navOpen = false"
      />

      <aside id="form-sidebar" class="form-sidebar" aria-label="Navigation formulaire MGA">
        <div class="form-sidebar__head">
          <div class="form-sidebar__brand">
            <span class="form-sidebar__logo">MGA</span>
            <span class="form-sidebar__title">Formulaire</span>
          </div>
          <button
            v-show="narrow"
            type="button"
            class="form-sidebar__close"
            aria-label="Fermer le menu"
            @click="navOpen = false"
          >
            ×
          </button>
        </div>
        <nav id="form-sidebar-nav" class="form-sidebar__nav">
          <RouterLink
            class="form-nav-link"
            to="/orders"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Commandes
          </RouterLink>
          <RouterLink
            v-if="isFormAdministrator"
            class="form-nav-link"
            to="/receipt"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Reçu (scan)
          </RouterLink>
          <RouterLink
            v-if="isFormAdministrator"
            class="form-nav-link"
            to="/ordres-achat"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Ordres achat
          </RouterLink>
          <RouterLink
            v-if="isFormAdministrator"
            class="form-nav-link"
            to="/annonces"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Annonces
          </RouterLink>
          <RouterLink
            v-if="isFormAdministrator"
            class="form-nav-link"
            to="/prix-concurrents"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Prix concurrents
          </RouterLink>
          <RouterLink
            class="form-nav-link"
            to="/settings/mobile-ussd"
            active-class="form-nav-link--active"
            @click="closeNav"
          >
            Codes USSD
          </RouterLink>
          <a v-if="isFormAdministrator" class="form-nav-link form-nav-link--ext" :href="p2pUrl">App P2P</a>
        </nav>
        <div class="form-sidebar__foot">
          <p class="form-sidebar__user">{{ sessionUser?.name }}</p>
          <button type="button" class="form-nav-logout" @click="onLogout">Déconnexion</button>
        </div>
      </aside>

      <header v-if="!narrow" class="app-hdr">
        <nav class="app-hdr__nav" aria-label="Navigation">
          <RouterLink class="hdr-link" to="/orders" active-class="hdr-link--active">Commandes</RouterLink>
          <RouterLink v-if="isFormAdministrator" class="hdr-link" to="/receipt" active-class="hdr-link--active">Reçu</RouterLink>
          <RouterLink v-if="isFormAdministrator" class="hdr-link" to="/ordres-achat" active-class="hdr-link--active">Ordres achat</RouterLink>
          <RouterLink v-if="isFormAdministrator" class="hdr-link" to="/annonces" active-class="hdr-link--active">Annonces</RouterLink>
          <RouterLink v-if="isFormAdministrator" class="hdr-link" to="/prix-concurrents" active-class="hdr-link--active">Prix P2P</RouterLink>
          <RouterLink class="hdr-link" to="/settings/mobile-ussd" active-class="hdr-link--active">USSD</RouterLink>
          <a v-if="isFormAdministrator" class="hdr-link hdr-link--ext" :href="p2pUrl">P2P</a>
        </nav>
        <div class="app-hdr__right">
          <span class="app-hdr__user">{{ sessionUser?.name }}</span>
          <button type="button" class="app-hdr__out" @click="onLogout">Déconnexion</button>
        </div>
      </header>

      <main class="form-main" :class="{ 'form-main--mobile': narrow }">
        <router-view />
      </main>
    </template>
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { apiUrl } from '@/lib/apiUrl';
import { loggedIn, sessionUser, isFormAdministrator, logoutSession } from '@/lib/formSession';

const route = useRoute();
const router = useRouter();

const isLoginRoute = computed(() => route.name === 'form-login' || route.path === '/login');

const p2pUrl = apiUrl('dashboard');

const narrow = ref(false);
const navOpen = ref(false);
let mql: MediaQueryList | null = null;

function applyMq() {
  if (!mql) return;
  narrow.value = !mql.matches;
  if (mql.matches) {
    navOpen.value = false;
  }
}

function toggleNav() {
  navOpen.value = !navOpen.value;
}

function closeNav() {
  if (narrow.value) {
    navOpen.value = false;
  }
}

async function onLogout() {
  closeNav();
  await logoutSession();
  await router.push('/login');
}

function mqListener() {
  applyMq();
}

watch(
  () => route.fullPath,
  () => {
    closeNav();
  },
);

onMounted(() => {
  mql = window.matchMedia('(min-width: 900px)');
  applyMq();
  mql.addEventListener('change', mqListener);
});

onUnmounted(() => {
  mql?.removeEventListener('change', mqListener);
});
</script>

<style scoped>
.shell {
  min-height: 100%;
  position: relative;
}

.form-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 2100;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid #2b3139;
  border-radius: 12px;
  background: #1e2329;
  color: #f0b90b;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.form-menu-btn__bars {
  display: block;
  width: 20px;
  height: 2px;
  background: #f0b90b;
  border-radius: 1px;
  box-shadow:
    0 -6px 0 #f0b90b,
    0 6px 0 #f0b90b;
}

.form-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1990;
  background: rgba(0, 0, 0, 0.55);
}

.form-sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  min-height: 100vh;
  background: #13161a;
  border-right: 1px solid #2b3139;
  z-index: 2000;
}

.form-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 14px 14px;
  border-bottom: 1px solid #2b3139;
}

.form-sidebar__brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.form-sidebar__logo {
  font-weight: 800;
  font-size: 22px;
  color: #f0b90b;
  letter-spacing: -0.02em;
}

.form-sidebar__title {
  font-weight: 600;
  font-size: 14px;
  color: #eaecef;
}

.form-sidebar__close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #848e9c;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.form-sidebar__close:hover {
  color: #eaecef;
  background: rgba(255, 255, 255, 0.06);
}

.form-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px;
  flex: 1;
  overflow-y: auto;
}

.form-nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border-radius: 10px;
  text-decoration: none;
  color: #848e9c;
  font-size: 15px;
  font-weight: 600;
  transition:
    background 0.15s,
    color 0.15s;
}
.form-nav-link:hover {
  color: #eaecef;
  background: rgba(240, 185, 11, 0.08);
}
.form-nav-link--active {
  color: #f0b90b;
  background: rgba(240, 185, 11, 0.12);
}
.form-nav-link--ext {
  margin-top: 8px;
  border-top: 1px solid #2b3139;
  padding-top: 18px;
}

.form-sidebar__foot {
  padding: 14px 12px 22px;
  border-top: 1px solid #2b3139;
}

.form-sidebar__user {
  margin: 0 0 10px;
  font-size: 12px;
  color: #aeb4bc;
  font-weight: 600;
  word-break: break-word;
}

.form-nav-logout {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(246, 70, 93, 0.35);
  background: transparent;
  color: #f6465d;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.form-nav-logout:hover {
  background: rgba(246, 70, 93, 0.1);
}

.form-main {
  flex: 1;
  min-width: 0;
}

.app-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid #2b3139;
  background: #13161a;
}

.app-hdr__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
}

.hdr-link {
  color: #848e9c;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 4px;
  border-radius: 6px;
}
.hdr-link:hover {
  color: #eaecef;
}
.hdr-link--active {
  color: #f0b90b;
}
.hdr-link--ext {
  border-left: 1px solid #2b3139;
  padding-left: 14px;
  margin-left: 4px;
}

.app-hdr__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-hdr__user {
  font-size: 12px;
  color: #aeb4bc;
  font-weight: 600;
}

.app-hdr__out {
  margin: 0;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #3d4f5c;
  background: transparent;
  color: #eaecef;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.app-hdr__out:hover {
  border-color: #f6465d;
  color: #f6465d;
}

@media (max-width: 899px) {
  .form-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.24s ease;
    box-shadow: 8px 0 28px rgba(0, 0, 0, 0.45);
  }

  .shell--nav-open .form-sidebar {
    transform: translateX(0);
  }

  .form-main--mobile {
    padding-top: 62px;
  }
}

@media (min-width: 900px) {
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .form-sidebar {
    display: none !important;
  }

  .form-backdrop {
    display: none !important;
  }

  .form-menu-btn {
    display: none !important;
  }

  .form-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
</style>

<style>
html,
body {
  margin: 0;
  min-height: 100%;
  background: #0b0e11;
  color: #eaecef;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
