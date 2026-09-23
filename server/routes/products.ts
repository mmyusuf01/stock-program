import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { products, categories, storeInventory, stores } from '../../src/db/schema.ts';
import { eq, sql, and, desc } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../../src/middleware/auth.ts';

const router = Router();

// GET all categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const list = await db.select().from(categories).orderBy(categories.name);
    res.json(list);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Gagal memuat kategori produk' });
  }
});

// GET products with pagination, category filter & search (optimized for 50,000 SKUs)
router.get('/', requireAuth, async (req, res) => {
  try {
    const search = req.query.search as string;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    let conditions = [];
    if (search && search.trim().length > 0) {
      const q = search.trim();
      conditions.push(
        sql`(${products.name} ILIKE ${`%${q}%`} OR ${products.sku} ILIKE ${`%${q}%`} OR ${products.barcode} ILIKE ${`%${q}%`})`
      );
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        unit: products.unit,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockThreshold: products.minStockThreshold,
        description: products.description,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(products.id))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Gagal memuat katalog barang' });
  }
});

// GET single product by barcode (Crucial for Barcode Scanner!)
router.get('/barcode/:barcode', requireAuth, async (req, res) => {
  try {
    const rawBarcode = req.params.barcode.trim();
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

    const [product] = await db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        unit: products.unit,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockThreshold: products.minStockThreshold,
        description: products.description,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(sql`${products.barcode} = ${rawBarcode} OR ${products.sku} = ${rawBarcode}`);

    if (!product) {
      return res.status(404).json({ error: `Barang dengan barcode/SKU '${rawBarcode}' tidak ditemukan.` });
    }

    // If storeId is provided, also attach current stock at this store
    let currentStock = 0;
    if (storeId) {
      const [inv] = await db
        .select({ stockQuantity: storeInventory.stockQuantity })
        .from(storeInventory)
        .where(and(eq(storeInventory.storeId, storeId), eq(storeInventory.productId, product.id)));
      if (inv) {
        currentStock = inv.stockQuantity;
      }
    }

    res.json({
      product,
      currentStock,
    });
  } catch (error: any) {
    console.error('Error scanning barcode:', error);
    res.status(500).json({ error: 'Gagal mencari barang via barcode' });
  }
});

// POST create product (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { sku, barcode, name, categoryId, unit, costPrice, sellingPrice, minStockThreshold, description, initialStock, initialStoreId } = req.body;

    if (!sku || !barcode || !name) {
      return res.status(400).json({ error: 'SKU, Barcode, dan Nama Barang wajib diisi.' });
    }

    // Check unique sku & barcode
    const [existing] = await db
      .select()
      .from(products)
      .where(sql`${products.sku} = ${sku} OR ${products.barcode} = ${barcode}`);
    if (existing) {
      return res.status(409).json({ error: 'SKU atau Barcode sudah digunakan oleh produk lain.' });
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        name: name.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        unit: unit || 'pcs',
        costPrice: parseInt(costPrice) || 0,
        sellingPrice: parseInt(sellingPrice) || 0,
        minStockThreshold: parseInt(minStockThreshold) || 10,
        description: description ? description.trim() : null,
      })
      .returning();

    // Auto initialize stock for stores
    const activeStores = await db.select({ id: stores.id }).from(stores).where(eq(stores.isActive, true));
    const invRows = activeStores.map((s) => ({
      storeId: s.id,
      productId: newProduct.id,
      stockQuantity: initialStoreId && s.id === parseInt(initialStoreId) ? (parseInt(initialStock) || 0) : 0,
    }));

    if (invRows.length > 0) {
      await db.insert(storeInventory).values(invRows).onConflictDoNothing();
    }

    res.status(201).json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Gagal menyimpan barang baru' });
  }
});

// PUT update product (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, categoryId, unit, costPrice, sellingPrice, minStockThreshold, description } = req.body;

    const [updated] = await db
      .update(products)
      .set({
        name: name?.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        unit: unit || 'pcs',
        costPrice: parseInt(costPrice) || 0,
        sellingPrice: parseInt(sellingPrice) || 0,
        minStockThreshold: parseInt(minStockThreshold) || 10,
        description: description ? description.trim() : null,
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Barang tidak ditemukan' });
    }

    res.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message || 'Gagal memperbarui data barang' });
  }
});

export default router;
