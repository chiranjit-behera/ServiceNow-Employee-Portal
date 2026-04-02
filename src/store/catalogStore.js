import { create } from 'zustand';
import serviceCatalogClient from '../api/serviceCatalogClient';

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const useCatalogStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  selectedItem: null,
  selectedIsLoading: false,
  selectedError: null,

  orderIsSubmitting: false,
  orderError: null,
  lastOrder: null,

  fetchCatalogItems: async ({ query = '', limit = 50 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Service Catalog API list endpoint. Note: response shape differs from Table API.
      const res = await serviceCatalogClient.get('/servicecatalog/items', {
        params: {
          sysparm_limit: limit,
          sysparm_offset: 0,
          sysparm_query: query || undefined,
        },
      });

      const raw = res?.data?.result || [];
      const items = Array.isArray(raw) ? raw : [];
      set({ items, isLoading: false });
    } catch (e) {
      set({ error: e?.message || 'Failed to load catalog items.', isLoading: false });
    }
  },

  fetchCatalogItem: async (sysId) => {
    if (!sysId) return;
    set({ selectedIsLoading: true, selectedError: null, selectedItem: null });
    try {
      const res = await serviceCatalogClient.get(`/servicecatalog/items/${sysId}`);
      set({ selectedItem: res?.data?.result || null, selectedIsLoading: false });
    } catch (e) {
      set({ selectedError: e?.message || 'Failed to load item.', selectedIsLoading: false });
    }
  },

  orderNow: async ({ sysId, quantity = 1, variables = {} }) => {
    if (!sysId) return { ok: false };
    set({ orderIsSubmitting: true, orderError: null, lastOrder: null });
    try {
      const qty = safeNum(quantity);
      const payload = {
        sysparm_quantity: String(qty && qty > 0 ? qty : 1),
        variables: variables && typeof variables === 'object' ? variables : {},
      };
      const res = await serviceCatalogClient.post(`/servicecatalog/items/${sysId}/order_now`, payload);
      set({ lastOrder: res?.data?.result || null, orderIsSubmitting: false });
      return { ok: true, result: res?.data?.result || null };
    } catch (e) {
      set({ orderError: e?.message || 'Order failed.', orderIsSubmitting: false });
      return { ok: false, error: e };
    }
  },

  clearSelected: () => set({ selectedItem: null, selectedError: null, selectedIsLoading: false }),
  clearOrder: () => set({ lastOrder: null, orderError: null, orderIsSubmitting: false }),
}));

