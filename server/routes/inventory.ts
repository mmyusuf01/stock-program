import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { storeInventory, products, stores, stockActivityLogs, notifications, categories } from '../../src/db/schema.ts';
import { eq, sql, and, desc, lte } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../../src/middleware/auth.ts';

const router = Router();

// GET inventory for a store with filtering & pagination
router.get('/', requireAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.query.storeId as string) || 1;
    const filter = (req.query.filter as string) || 'all'; // 'all' | 'low_stock' | 'out_of_stock'
    const search = req.query.search as string;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    let conditions = [eq(storeInventory.storeId, storeId)];

    if (search && search.trim().length > 0) {
      const q = search.trim();
      conditions.push(
        sql`(${products.name} ILIKE ${`%${q}%`} OR ${products.sku} ILIKE ${`%${q}%`} OR ${products.barcode} ILIKE ${`%${q}%`})`
      );
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (filter === 'low_stock') {
      conditions.push(
        sql`${storeInventory.stockQuantity} <= ${products.minStockThreshold} AND ${storeInventory.stockQuantity} > 0`
      );
    } else if (filter === 'out_of_stock') {
      conditions.push(eq(storeInventory.stockQuantity, 0));
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select({
        inventoryId: storeInventory.id,
        storeId: storeInventory.storeId,
        productId: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        categoryName: categories.name,
        unit: products.unit,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockThreshold: products.minStockThreshold,
        stockQuantity: storeInventory.stockQuantity,
        lastUpdated: storeInventory.lastUpdated,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(products.name)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .where(whereClause);

    res.json({
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Gagal memuat inventaris toko' });
  }
});

// POST single stock movement (RESTOCK_IN, SALE_OUT, ADJUSTMENT, RETURN)
router.post('/movement', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { storeId, productId, changeType, quantityDelta, referenceNumber, notes } = req.body;
    const user = req.user!;

    if (!storeId || !productId || !changeType || quantityDelta === undefined) {
      return res.status(400).json({ error: 'Parameter storeId, productId, changeType, dan quantityDelta wajib diisi.' });
    }

    const delta = parseInt(quantityDelta);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ error: 'Perubahan jumlah stok harus bukan 0.' });
    }

    // Look up product and current inventory
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      return res.status(404).json({ error: 'Barang tidak ditemukan' });
    }

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId));
    if (!store) {
      return res.status(404).json({ error: 'Toko tidak ditemukan' });
    }

    // Upsert or fetch store_inventory row
    let [inventory] = await db
      .select()
      .from(storeInventory)
      .where(and(eq(storeInventory.storeId, storeId), eq(storeInventory.productId, productId)));

    const stockBefore = inventory ? inventory.stockQuantity : 0;
    const stockAfter = Math.max(0, stockBefore + delta);

    if (stockBefore + delta < 0 && (changeType === 'SALE_OUT' || delta < 0)) {
      return res.status(400).json({
        error: `Stok tidak mencukupi. Stok saat ini: ${stockBefore}, permintaan pengurangan: ${Math.abs(delta)}.`,
      });
    }

    // Update or insert inventory
    if (inventory) {
      await db
        .update(storeInventory)
        .set({
          stockQuantity: stockAfter,
          lastUpdated: new Date(),
        })
        .where(eq(storeInventory.id, inventory.id));
    } else {
      await db.insert(storeInventory).values({
        storeId,
        productId,
        stockQuantity: stockAfter,
        lastUpdated: new Date(),
      });
    }

    // Insert Stock Activity Log (Audit Trail)
    const [log] = await db
      .insert(stockActivityLogs)
      .values({
        storeId,
        productId,
        changeType,
        quantityDelta: delta,
        stockBefore,
        stockAfter,
        referenceNumber: referenceNumber || `REF-${Date.now()}`,
        notes: notes || null,
        performedByUid: user.uid,
        performedByName: user.name,
      })
      .returning();

    // Check low stock threshold & trigger notification
    let triggeredAlert = null;
    if (stockAfter <= product.minStockThreshold) {
      const isOut = stockAfter === 0;
      const title = isOut ? `Stok Habis: ${product.name}` : `Stok Minimum: ${product.name}`;
      const message = `Sisa stok: ${stockAfter} ${product.unit} di ${store.name} (Batas minimum: ${product.minStockThreshold} ${product.unit}).`;

      const [notif] = await db
        .insert(notifications)
        .values({
          storeId,
          productId,
          type: isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          title,
          message,
          isRead: false,
        })
        .returning();
      triggeredAlert = notif;
    }

    res.json({
      success: true,
      stockBefore,
      stockAfter,
      delta,
      log,
      triggeredAlert,
      message: `Berhasil mencatat perubahan stok untuk ${product.name} (Stok baru: ${stockAfter} ${product.unit})`,
    });
  } catch (error: any) {
    console.error('Error recording stock movement:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses pergerakan stok' });
  }
});

// POST transfer stock between 2 stores
router.post('/transfer', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fromStoreId, toStoreId, productId, quantity, notes } = req.body;
    const user = req.user!;

    if (!fromStoreId || !toStoreId || !productId || !quantity) {
      return res.status(400).json({ error: 'Semua parameter transfer wajib diisi.' });
    }

    if (fromStoreId === toStoreId) {
      return res.status(400).json({ error: 'Toko asal dan toko tujuan tidak boleh sama.' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Jumlah transfer harus lebih dari 0.' });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      return res.status(404).json({ error: 'Barang tidak ditemukan' });
    }

    const [sourceStore] = await db.select().from(stores).where(eq(stores.id, fromStoreId));
    const [targetStore] = await db.select().from(stores).where(eq(stores.id, toStoreId));

    if (!sourceStore || !targetStore) {
      return res.status(404).json({ error: 'Toko asal atau toko tujuan tidak valid.' });
    }

    // Check source inventory
    const [sourceInv] = await db
      .select()
      .from(storeInventory)
      .where(and(eq(storeInventory.storeId, fromStoreId), eq(storeInventory.productId, productId)));

    const currentSourceStock = sourceInv ? sourceInv.stockQuantity : 0;
    if (currentSourceStock < qty) {
      return res.status(400).json({
        error: `Stok di ${sourceStore.name} tidak cukup (Tersedia: ${currentSourceStock}, diminta: ${qty}).`,
      });
    }

    const transferRef = `TRF-${Date.now().toString().slice(-6)}`;

    // 1. Deduct source store
    const newSourceStock = currentSourceStock - qty;
    await db
      .update(storeInventory)
      .set({ stockQuantity: newSourceStock, lastUpdated: new Date() })
      .where(eq(storeInventory.id, sourceInv!.id));

    await db.insert(stockActivityLogs).values({
      storeId: fromStoreId,
      productId,
      changeType: 'TRANSFER_OUT',
      quantityDelta: -qty,
      stockBefore: currentSourceStock,
      stockAfter: newSourceStock,
      referenceNumber: transferRef,
      notes: `Transfer keluar ke ${targetStore.name}. ${notes || ''}`,
      performedByUid: user.uid,
      performedByName: user.name,
    });

    // 2. Add to target store
    let [targetInv] = await db
      .select()
      .from(storeInventory)
      .where(and(eq(storeInventory.storeId, toStoreId), eq(storeInventory.productId, productId)));

    const currentTargetStock = targetInv ? targetInv.stockQuantity : 0;
    const newTargetStock = currentTargetStock + qty;

    if (targetInv) {
      await db
        .update(storeInventory)
        .set({ stockQuantity: newTargetStock, lastUpdated: new Date() })
        .where(eq(storeInventory.id, targetInv.id));
    } else {
      await db.insert(storeInventory).values({
        storeId: toStoreId,
        productId,
        stockQuantity: newTargetStock,
        lastUpdated: new Date(),
      });
    }

    await db.insert(stockActivityLogs).values({
      storeId: toStoreId,
      productId,
      changeType: 'TRANSFER_IN',
      quantityDelta: qty,
      stockBefore: currentTargetStock,
      stockAfter: newTargetStock,
      referenceNumber: transferRef,
      notes: `Transfer masuk dari ${sourceStore.name}. ${notes || ''}`,
      performedByUid: user.uid,
      performedByName: user.name,
    });

    res.json({
      success: true,
      referenceNumber: transferRef,
      message: `Berhasil mentransfer ${qty} ${product.unit} ${product.name} dari ${sourceStore.name} ke ${targetStore.name}.`,
    });
  } catch (error: any) {
    console.error('Error transferring stock:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses transfer stok' });
  }
});

export default router;
