import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiUrl } from '@/services/api';
import { fetchAccount } from '@/services/binance';

export interface User {
  uid: string;
  name: string;
  mail: string;
  roles?: string[];
  binance_uid?: string;
  trust_score?: number;
  avatar?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * "Login" via Binance: validates the server-side API key by calling
   * GET /api/v3/account through the Drupal proxy. Binance has no username /
   * password REST login — only API key + HMAC signing.
   */
  async function loginWithBinance() {
    loading.value = true;
    error.value = null;
    try {
      const account = await fetchAccount();
      const u: User = {
        uid: 'binance-api',
        name: `Binance · ${account.accountType || 'SPOT'}`,
        mail: '',
        roles: account.permissions,
        binance_uid: account.updateTime ? String(account.updateTime) : undefined,
        trust_score: account.canTrade === false ? 0 : 100,
        avatar: undefined,
      };
      user.value = u;
      isAuthenticated.value = true;
      token.value = null;
      localStorage.setItem('p2p_user', JSON.stringify(u));
      localStorage.removeItem('p2p_token');
      localStorage.setItem('p2p_auth_source', 'binance');
      return true;
    } catch (e: any) {
      error.value =
        e?.message ||
        'Could not reach Binance. Check /admin/config/system/mga2p2 (API keys), proxy access, and that this site can call /binance-proxy.';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: { name: string; password: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(apiUrl('/api_solutions/user/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        user.value = data.data;
        isAuthenticated.value = true;
        localStorage.setItem('p2p_user', JSON.stringify(data.data));
        if (data.token) {
          token.value = data.token;
          localStorage.setItem('p2p_token', data.token);
        }
        localStorage.setItem('p2p_auth_source', 'drupal');
        return true;
      }
      error.value = data.error || data.message || 'Invalid credentials';
      return false;
    } catch (e) {
      error.value = 'Connection error';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem('p2p_user');
    localStorage.removeItem('p2p_token');
    localStorage.removeItem('p2p_auth_source');
  }

  function init() {
    const saved = localStorage.getItem('p2p_user');
    const savedToken = localStorage.getItem('p2p_token');
    if (saved) {
      user.value = JSON.parse(saved);
      isAuthenticated.value = true;
    }
    if (savedToken) token.value = savedToken;
  }

  return { user, token, isAuthenticated, loading, error, login, loginWithBinance, logout, init };
});
