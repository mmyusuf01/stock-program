export interface User {
  uid: string;
  id?: number;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  assignedStoreId?: number | null;
  storeName?: string;
  storeCity?: string;
  storeCode?: string;
  phone?: string | null;
  status?: 'active' | 'inactive';
  pin?: string | null;
  createdAt?: string;
}

export interface Store {
  id: number;
  code: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  code: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  categoryId?: number | null;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  description?: string | null;
  createdAt?: string;
}

export interface InventoryItem {
  inventoryId: number;
  storeId: number;
  productId: number;
  sku: string;
  barcode: string;
  name: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  stockQuantity: number;
  lastUpdated?: string;
}

export interface ActivityLog {
  id: number;
  storeId: number;
  storeName: string;
  productId: number;
  productName: string;
  sku: string;
  unit: string;
  changeType: 'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN';
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  referenceNumber?: string | null;
  notes?: string | null;
  performedByUid: string;
  performedByName: string;
  timestamp: string;
}

export interface NotificationItem {
  id: number;
  storeId?: number | null;
  storeName?: string;
  productId?: number | null;
  productName?: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TRANSFER_UPDATE' | 'SYNC_SUCCESS';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalStores: number;
  totalCatalogSkus: number;
  totalStockUnits: number;
  totalCostValuation: number;
  totalSellingValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockInToday: number;
  stockOutToday: number;
  transactionCountToday: number;
}

export interface TrendPoint {
  date: string;
  stockIn: number;
  stockOut: number;
}

export interface UrgentItem {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  minStockThreshold: number;
  stockQuantity: number;
  storeName: string;
}

export interface OfflineMutation {
  id: string;
  storeId: number;
  productId: number;
  changeType: 'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT';
  quantityDelta: number;
  referenceNumber: string;
  notes: string;
  offlineTimestamp: string;
  productName: string;
}
