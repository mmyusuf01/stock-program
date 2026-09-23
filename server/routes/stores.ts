import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { stores, storeInventory, products } from '../../src/db/schema.ts';
import { eq, ilike, sql, desc, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../../src/middleware/auth.ts';

const router = Router();

// GET all stores (with search & pagination for >100 stores scalability)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const search = req.query.search as string;
    const city = req.query.city as string;
    const limit = parseInt(req.query.limit as string) || 200;
    const offset = parseInt(req.query.offset as string) || 0;

    let conditions = [];
    if (search) {
      conditions.push(
        sql`(${stores.name} ILIKE ${`%${search}%`} OR ${stores.code} ILIKE ${`%${search}%`} OR ${stores.city} ILIKE ${`%${search}%`})`
      );
    }
    if (city) {
      conditions.push(eq(stores.city, city));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const storeList = await db
      .select()
      .from(stores)
      .where(whereClause)
      .orderBy(stores.id)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(stores)
      .where(whereClause);

    res.json({
      stores: storeList,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Gagal memuat daftar toko' });
  }
});

// GET single store with inventory summary
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId));

    if (!store) {
      return res.status(404).json({ error: 'Toko tidak ditemukan' });
    }

    // Get basic stats for this store
    const [stats] = await db
      .select({
        totalItems: sql<number>`COALESCE(count(${storeInventory.id}), 0)::int`,
        totalStock: sql<number>`COALESCE(sum(${storeInventory.stockQuantity}), 0)::int`,
        lowStockItems: sql<number>`COALESCE(sum(CASE WHEN ${storeInventory.stockQuantity} <= ${products.minStockThreshold} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .where(eq(storeInventory.storeId, storeId));

    res.json({
      store,
      stats: stats || { totalItems: 0, totalStock: 0, lowStockItems: 0 },
    });
  } catch (error: any) {
    console.error('Error fetching store detail:', error);
    res.status(500).json({ error: 'Gagal memuat detail toko' });
  }
});

// POST new store (Admin Only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code, name, city, address, phone } = req.body;

    if (!code || !name || !city) {
      return res.status(400).json({ error: 'Kode toko, nama toko, dan kota wajib diisi.' });
    }

    // Check duplicate code
    const [existing] = await db.select().from(stores).where(eq(stores.code, code.toUpperCase().trim()));
    if (existing) {
      return res.status(409).json({ error: `Kode toko ${code} sudah terdaftar.` });
    }

    const [newStore] = await db
      .insert(stores)
      .values({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        city: city.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        isActive: true,
      })
      .returning();

    // Auto seed zero inventory for existing active products
    const allProducts = await db.select({ id: products.id }).from(products);
    if (allProducts.length > 0) {
      const inventoryRows = allProducts.map((p) => ({
        storeId: newStore.id,
        productId: p.id,
        stockQuantity: 0,
      }));
      // Batch insert inventory rows
      for (let i = 0; i < inventoryRows.length; i += 200) {
        await db.insert(storeInventory).values(inventoryRows.slice(i, i + 200)).onConflictDoNothing();
      }
    }

    res.status(201).json({ success: true, store: newStore });
  } catch (error: any) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: error.message || 'Gagal menambahkan toko baru' });
  }
});

export default router;
