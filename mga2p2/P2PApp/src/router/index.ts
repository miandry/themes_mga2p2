import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginPage.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/dashboard/DashboardPage.vue'),
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/orders/OrdersPage.vue'),
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('../views/orders/OrderDetailPage.vue'),
  },
  {
    path: '/ads',
    name: 'Ads',
    component: () => import('../views/posts/PostsPage.vue'),
  },
  {
    path: '/ads/:id/edit',
    name: 'EditAd',
    component: () => import('../views/posts/EditPostPage.vue'),
  },
  {
    path: '/chat',
    name: 'ChatList',
    component: () => import('../views/chat/ChatListPage.vue'),
  },
  {
    path: '/chat/:id',
    name: 'Chat',
    component: () => import('../views/chat/ChatPage.vue'),
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/account/AccountPage.vue'),
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/NotificationsPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated && localStorage.getItem('p2p_user')) {
    auth.init();
  }
  if (!auth.isAuthenticated && to.name !== 'Login') {
    return next('/login');
  }
  next();
});

export default router;
