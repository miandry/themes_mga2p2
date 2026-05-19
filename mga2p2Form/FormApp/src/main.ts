import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import ReceiptFormPage from './views/ReceiptFormPage.vue';
import OrderMgaListPage from './views/OrderMgaListPage.vue';
import OrderMgaDetailPage from './views/OrderMgaDetailPage.vue';
import MobileUssdSettingsPage from './views/MobileUssdSettingsPage.vue';

const router = createRouter({
  history: createWebHistory('/form'),
  routes: [
    { path: '/settings/mobile-ussd', name: 'settings-mobile-ussd', component: MobileUssdSettingsPage },
    { path: '/orders/:nid(\\d+)', name: 'order-mga-detail', component: OrderMgaDetailPage },
    { path: '/orders', name: 'orders-mga', component: OrderMgaListPage },
    { path: '/:pathMatch(.*)*', name: 'receipt', component: ReceiptFormPage },
  ],
});

createApp(App).use(router).mount('#form-app');
