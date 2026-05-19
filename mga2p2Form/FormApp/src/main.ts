import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import ReceiptFormPage from './views/ReceiptFormPage.vue';
import OrderMgaListPage from './views/OrderMgaListPage.vue';
import OrderMgaDetailPage from './views/OrderMgaDetailPage.vue';
import MobileUssdSettingsPage from './views/MobileUssdSettingsPage.vue';
import FormLoginPage from './views/FormLoginPage.vue';
import { sessionChecked, loggedIn, fetchSession } from './lib/formSession';

const router = createRouter({
  history: createWebHistory('/form'),
  routes: [
    { path: '/', redirect: '/orders' },
    { path: '/login', name: 'form-login', component: FormLoginPage },
    { path: '/settings/mobile-ussd', name: 'settings-mobile-ussd', component: MobileUssdSettingsPage },
    { path: '/orders/:nid(\\d+)', name: 'order-mga-detail', component: OrderMgaDetailPage },
    { path: '/orders', name: 'orders-mga', component: OrderMgaListPage },
    { path: '/receipt', name: 'receipt', component: ReceiptFormPage },
    { path: '/:pathMatch(.*)*', redirect: '/orders' },
  ],
});

router.beforeEach(async (to) => {
  if (!sessionChecked.value) {
    await fetchSession();
  }
  const isLogin = to.name === 'form-login';
  if (!loggedIn.value && !isLogin) {
    return { name: 'form-login', query: { redirect: to.fullPath } };
  }
  if (loggedIn.value && isLogin) {
    return { path: '/orders' };
  }
  return true;
});

createApp(App).use(router).mount('#form-app');
