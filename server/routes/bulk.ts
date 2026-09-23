import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { products, categories, storeInventory, stores, stockActivityLogs } from '../../src/db/schema.ts';
import { eq, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../../src/middleware/auth.ts';

const router = Router();

// POST bulk import products & stock (Admin only)
router.post('/import', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { items, targetStoreId } = req.body;
    const user = req.user!;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Data impor kosong atau format tidak valid.' });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Pre-fetch all categories for quick name-to-id mapping
    const existingCategories = await db.select().from(categories);
    const categoryMap = new Map<string, number>();
    existingCategories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

    // Determine target store
    let storeId = targetStoreId ? parseInt(targetStoreId) : 1;

    // Process items in chunks of 100 for high performance
    for (const row of items) {
      try {
        const sku = String(row.sku || row.SKU || '').trim().toUpperCase();
        const barcode = String(row.barcode || row.Barcode || '').trim();
        const name = String(row.name || row['Nama Barang'] || row['Nama'] || '').trim();

        if (!sku || !barcode || !name) {
          failedCount++;
          errors.push(`Baris dilewati (SKU/Barcode/Nama tidak lengkap): ${JSON.stringify(row)}`);
          continue;
        }

        // Category mapping or creation
        let categoryId: number | null = null;
        const categoryName = String(row.category || row['Kategori'] || '').trim();
        if (categoryName) {
          const lowerCat = categoryName.toLowerCase();
          if (categoryMap.has(lowerCat)) {
            categoryId = categoryMap.get(lowerCat)!;
          } else {
            // Create category on the fly
            const [newCat] = await db
              .insert(categories)
              .values({
                name: categoryName,
                code: categoryName.slice(0, 3).toUpperCase(),
              })
              .returning();
            categoryMap.set(lowerCat, newCat.id);
            categoryId = newCat.id;
          }
        }

        const unit = String(row.unit || row['Satuan'] || 'pcs').trim();
        const costPrice = parseInt(String(row.costPrice || row['Harga Beli'] || 0)) || 0;
        const sellingPrice = parseInt(String(row.sellingPrice || row['Harga Jual'] || 0)) || 0;
        const minStockThreshold = parseInt(String(row.minStockThreshold || row['Batas Minimum'] || 10)) || 10;
        const stockQty = parseInt(String(row.stockQuantity || row['Stok'] || row['Jumlah Stok'] || 0)) || 0;

        // Upsert product
        const [upsertedProduct] = await db
          .insert(products)
          .values({
            sku,
            barcode,
            name,
            categoryId,
            unit,
            costPrice,
            sellingPrice,
            minStockThreshold,
          })
          .onConflictDoUpdate({
            target: products.sku,
            set: {
              barcode,
              name,
              categoryId,
              unit,
              costPrice,
              sellingPrice,
              minStockThreshold,
            },
          })
          .returning();

        // Upsert store inventory if stock provided
        const [existingInv] = await db
          .select()
          .from(storeInventory)
          .where(sql`${storeInventory.storeId} = ${storeId} AND ${storeInventory.productId} = ${upsertedProduct.id}`);

        const prevStock = existingInv ? existingInv.stockQuantity : 0;
        const newStock = existingInv ? stockQty : stockQty;

        if (existingInv) {
          await db
            .update(storeInventory)
            .set({ stockQuantity: newStock, lastUpdated: new Date() })
            .where(eq(storeInventory.id, existingInv.id));
        } else {
          await db.insert(storeInventory).values({
            storeId,
            productId: upsertedProduct.id,
            stockQuantity: newStock,
          });
        }

        // Log mass import change if stock changed
        if (newStock !== prevStock) {
          await db.insert(stockActivityLogs).values({
            storeId,
            productId: upsertedProduct.id,
            changeType: 'ADJUSTMENT',
            quantityDelta: newStock - prevStock,
            stockBefore: prevStock,
            stockAfter: newStock,
            referenceNumber: `MASS-IMPORT-${Date.now().toString().slice(-6)}`,
            notes: 'Pembaruan data massal via Excel/CSV',
            performedByUid: user.uid,
            performedByName: user.name,
          });
        }

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Gagal memproses item: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Impor massal selesai: ${successCount} berhasil diproses, ${failedCount} gagal.`,
      successCount,
      failedCount,
      errors: errors.slice(0, 10), // return first 10 errors
    });
  } catch (error: any) {
    console.error('Error during bulk import:', error);
    res.status(500).json({ error: error.message || 'Gagal melakukan impor massal' });
  }
});

// GET bulk export data
router.get('/export', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : 1;

    const data = await db
      .select({
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        category: categories.name,
        unit: products.unit,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockThreshold: products.minStockThreshold,
        stockQuantity: storeInventory.stockQuantity,
        storeName: stores.name,
        lastUpdated: storeInventory.lastUpdated,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .innerJoin(stores, eq(storeInventory.storeId, stores.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(storeInventory.storeId, storeId))
      .orderBy(products.name);

    res.json({
      exportedAt: new Date().toISOString(),
      storeId,
      totalRows: data.length,
      rows: data,
    });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Gagal mengekspor data inventaris' });
  }
});

export default router;
