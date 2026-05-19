<template>
  <div class="shell">
    <header v-if="loggedIn" class="app-hdr">
      <span class="app-hdr__user">{{ sessionUser?.name }}</span>
      <button type="button" class="app-hdr__out" @click="onLogout">Déconnexion</button>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { loggedIn, sessionUser, logoutSession } from '@/lib/formSession';

const router = useRouter();

async function onLogout() {
  await logoutSession();
  await router.push('/login');
}
</script>

<style scoped>
.shell {
  min-height: 100%;
}
.app-hdr {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #2b3139;
  background: #13161a;
}
.app-hdr__user {
  font-size: 12px;
  color: #aeb4bc;
  font-weight: 600;
}
.app-hdr__out {
  margin: 0;
  padding: 5px 10px;
  border-radius: 6px;
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
