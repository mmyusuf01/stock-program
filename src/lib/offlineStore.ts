import { OfflineMutation, Product, Store, InventoryItem, AnalyticsSummary, TrendPoint, UrgentItem } from '../types.ts';

const STORAGE_KEYS = {
  STORES: 'rdbms_stores_cache',
  PRODUCTS: 'rdbms_products_cache',
  INVENTORY: 'rdbms_inventory_cache',
  OFFLINE_QUEUE: 'rdbms_offline_queue',
  LAST_SYNC: 'rdbms_last_sync_timestamp',
  DASHBOARD: 'rdbms_dashboard_cache',
};

interface DashboardCacheData {
  summary: AnalyticsSummary;
  trend: TrendPoint[];
  urgentItems: UrgentItem[];
  cachedAt: string;
}

export const offlineStorage = {
  // Stores cache
  setStores(stores: Store[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    } catch {}
  },
  getStores(): Store[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Products cache
  setProducts(products: Product[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {}
  },
  mergeProducts(newProducts: Product[]) {
    try {
      const existing = this.getProducts();
      const map = new Map<number, Product>();
      existing.forEach((p) => map.set(p.id, p));
      newProducts.forEach((p) => map.set(p.id, p));
      const merged = Array.from(map.values());
      this.setProducts(merged);
    } catch {}
  },
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Inventory cache
  setInventory(storeId: number, items: InventoryItem[]) {
    try {
      const existing = this.getAllInventory();
      existing[storeId] = items;
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(existing));
    } catch {}
  },
  mergeInventory(storeId: number, newItems: InventoryItem[]) {
    try {
      const existing = this.getStoreInventory(storeId);
      const map = new Map<number, InventoryItem>();
      existing.forEach((i) => map.set(i.productId, i));
      newItems.forEach((i) => map.set(i.productId, i));
      const merged = Array.from(map.values());
      this.setInventory(storeId, merged);
    } catch {}
  },
  getAllInventory(): Record<number, InventoryItem[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
  getStoreInventory(storeId: number): InventoryItem[] {
    const all = this.getAllInventory();
    return all[storeId] || [];
  },

  // Dashboard Cache
  setDashboardCache(storeId: number | null, data: { summary: AnalyticsSummary; trend: TrendPoint[]; urgentItems: UrgentItem[] }) {
    try {
      const key = `${STORAGE_KEYS.DASHBOARD}_${storeId || 'all'}`;
      const payload: DashboardCacheData = {
        ...data,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  },
  getDashboardCache(storeId: number | null): DashboardCacheData | null {
    try {
      const key = `${STORAGE_KEYS.DASHBOARD}_${storeId || 'all'}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Offline Mutation Queue
  enqueueMutation(mutation: OfflineMutation) {
    const queue = this.getQueue();
    queue.push(mutation);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch {}

    // Optimistically update local inventory cache
    const storeInv = this.getStoreInventory(mutation.storeId);
    const item = storeInv.find((i) => i.productId === mutation.productId);
    if (item) {
      item.stockQuantity = Math.max(0, item.stockQuantity + mutation.quantityDelta);
      this.setInventory(mutation.storeId, storeInv);
    }
  },

  getQueue(): OfflineMutation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  clearQueue() {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch {}
  },

  removeFromQueue(mutationId: string) {
    const queue = this.getQueue().filter((m) => m.id !== mutationId);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch {}
  },

  setLastSync(date: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, date);
    } catch {}
  },

  getLastSync(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch {
      return null;
    }
  },

  // Storage diagnosis and metrics
  getStorageStats() {
    const stores = this.getStores().length;
    const products = this.getProducts().length;
    const allInv = this.getAllInventory();
    const inventoryCount = Object.values(allInv).reduce((acc, curr) => acc + curr.length, 0);
    const pendingQueue = this.getQueue().length;
    const lastSync = this.getLastSync();

    let bytes = 0;
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const item = localStorage.getItem(key);
        if (item) bytes += item.length * 2;
      }
    } catch {}

    const kb = (bytes / 1024).toFixed(1);

    return {
      stores,
      products,
      inventoryCount,
      pendingQueue,
      lastSync,
      estimatedSizeKB: kb,
    };
  },

  // Export full local snapshot
  exportLocalSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      stores: this.getStores(),
      products: this.getProducts(),
      inventory: this.getAllInventory(),
      queue: this.getQueue(),
      lastSync: this.getLastSync(),
    };
  },

  // Clear cache except current session and offline queue
  clearCacheData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.STORES);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    } catch {}
  },
};
