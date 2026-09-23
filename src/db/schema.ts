import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// 1. Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID / local system UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('staff'), // 'admin' | 'staff'
  assignedStoreId: integer('assigned_store_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Stores table (>100 stores supported)
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. 'STR-001'
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull(),
});

// 4. Products catalog (supporting up to 50,000 SKUs with indexes)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').notNull().unique(),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  unit: text('unit').notNull().default('pcs'),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  minStockThreshold: integer('min_stock_threshold').notNull().default(10),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('products_sku_idx').on(table.sku),
  index('products_barcode_idx').on(table.barcode),
  index('products_name_idx').on(table.name),
  index('products_category_idx').on(table.categoryId),
]);

// 5. Store Inventory (Per-store stock balances)
export const storeInventory = pgTable('store_inventory', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  productId: integer('product_id').notNull().references(() => products.id),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => [
  uniqueIndex('store_product_unique_idx').on(table.storeId, table.productId),
  index('inventory_store_idx').on(table.storeId),
  index('inventory_product_idx').on(table.productId),
]);

// 6. Stock Activity Logs (Audit Trail for every stock alteration)
export const stockActivityLogs = pgTable('stock_activity_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  productId: integer('product_id').notNull().references(() => products.id),
  changeType: text('change_type').notNull(), // 'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN'
  quantityDelta: integer('quantity_delta').notNull(), // positive (IN) or negative (OUT)
  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),
  referenceNumber: text('reference_number'), // e.g. PO, Invoice, Transfer Code
  notes: text('notes'),
  performedByUid: text('performed_by_uid').notNull(),
  performedByName: text('performed_by_name').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => [
  index('activity_store_idx').on(table.storeId),
  index('activity_product_idx').on(table.productId),
  index('activity_timestamp_idx').on(table.timestamp),
]);

// 7. Notifications table (Push/in-app alert for minimum stock)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  productId: integer('product_id').references(() => products.id),
  type: text('type').notNull(), // 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TRANSFER_UPDATE' | 'SYNC_SUCCESS'
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('notifications_store_idx').on(table.storeId),
  index('notifications_created_idx').on(table.createdAt),
]);

// Relations
export const storesRelations = relations(stores, ({ many }) => ({
  inventory: many(storeInventory),
  logs: many(stockActivityLogs),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventory: many(storeInventory),
  logs: many(stockActivityLogs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const storeInventoryRelations = relations(storeInventory, ({ one }) => ({
  store: one(stores, {
    fields: [storeInventory.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [storeInventory.productId],
    references: [products.id],
  }),
}));

export const stockActivityLogsRelations = relations(stockActivityLogs, ({ one }) => ({
  store: one(stores, {
    fields: [stockActivityLogs.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [stockActivityLogs.productId],
    references: [products.id],
  }),
}));
