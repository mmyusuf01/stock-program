import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { storeInventory, products, stockActivityLogs, notifications } from '../../src/db/schema.ts';
import { eq, sql, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../../src/middleware/auth.ts';

const router = Router();

// POST batch sync offline mutations to PostgreSQL
router.post('/batch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { mutations } = req.body; // array of offline queued actions
    const user = req.user!;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.json({ syncedCount: 0, results: [] });
    }

    const results = [];
    let syncedCount = 0;

    for (const m of mutations) {
      try {
        const { storeId, productId, changeType, quantityDelta, referenceNumber, notes, offlineTimestamp } = m;
        const delta = parseInt(quantityDelta);

        const [product] = await db.select().from(products).where(eq(products.id, productId));
        if (!product) {
          results.push({ id: m.id, success: false, error: 'Barang tidak ditemukan' });
          continue;
        }

        // Fetch or create store inventory row
        let [inv] = await db
          .select()
          .from(storeInventory)
          .where(and(eq(storeInventory.storeId, storeId), eq(storeInventory.productId, productId)));

        const stockBefore = inv ? inv.stockQuantity : 0;
        const stockAfter = Math.max(0, stockBefore + delta);

        if (inv) {
          await db
            .update(storeInventory)
            .set({ stockQuantity: stockAfter, lastUpdated: new Date() })
            .where(eq(storeInventory.id, inv.id));
        } else {
          await db.insert(storeInventory).values({
            storeId,
            productId,
            stockQuantity: stockAfter,
            lastUpdated: new Date(),
          });
        }

        // Activity log
        await db.insert(stockActivityLogs).values({
          storeId,
          productId,
          changeType: changeType || 'RESTOCK_IN',
          quantityDelta: delta,
          stockBefore,
          stockAfter,
          referenceNumber: referenceNumber || `OFFLINE-SYNC-${Date.now().toString().slice(-4)}`,
          notes: `${notes || ''} [Sinkronisasi Offline, Dibuat: ${offlineTimestamp || 'Lokal'}]`,
          performedByUid: user.uid,
          performedByName: user.name,
        });

        // Threshold check
        if (stockAfter <= product.minStockThreshold) {
          await db.insert(notifications).values({
            storeId,
            productId,
            type: stockAfter === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            title: `Sinkronisasi Offline: ${product.name}`,
            message: `Stok saat ini ${stockAfter} ${product.unit} (Batas minimum: ${product.minStockThreshold}).`,
          });
        }

        syncedCount++;
        results.push({ id: m.id, success: true, newStock: stockAfter });
      } catch (err: any) {
        results.push({ id: m.id, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      syncedCount,
      totalReceived: mutations.length,
      results,
    });
  } catch (error: any) {
    console.error('Error during offline sync batch:', error);
    res.status(500).json({ error: error.message || 'Gagal menyinkronkan data offline' });
  }
});

export default router;
