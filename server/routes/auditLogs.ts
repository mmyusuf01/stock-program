import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { stockActivityLogs, products, stores } from '../../src/db/schema.ts';
import { eq, sql, and, desc } from 'drizzle-orm';
import { requireAuth } from '../../src/middleware/auth.ts';

const router = Router();

// GET activity audit logs with filters & pagination
router.get('/', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
    const changeType = req.query.changeType as string;
    const search = req.query.search as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    let conditions = [];
    if (storeId) {
      conditions.push(eq(stockActivityLogs.storeId, storeId));
    }
    if (changeType && changeType !== 'ALL') {
      conditions.push(eq(stockActivityLogs.changeType, changeType));
    }
    if (search && search.trim().length > 0) {
      const q = search.trim();
      conditions.push(
        sql`(${products.name} ILIKE ${`%${q}%`} OR ${products.sku} ILIKE ${`%${q}%`} OR ${stockActivityLogs.referenceNumber} ILIKE ${`%${q}%`} OR ${stockActivityLogs.performedByName} ILIKE ${`%${q}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select({
        id: stockActivityLogs.id,
        storeId: stockActivityLogs.storeId,
        storeName: stores.name,
        productId: stockActivityLogs.productId,
        productName: products.name,
        sku: products.sku,
        unit: products.unit,
        changeType: stockActivityLogs.changeType,
        quantityDelta: stockActivityLogs.quantityDelta,
        stockBefore: stockActivityLogs.stockBefore,
        stockAfter: stockActivityLogs.stockAfter,
        referenceNumber: stockActivityLogs.referenceNumber,
        notes: stockActivityLogs.notes,
        performedByUid: stockActivityLogs.performedByUid,
        performedByName: stockActivityLogs.performedByName,
        timestamp: stockActivityLogs.timestamp,
      })
      .from(stockActivityLogs)
      .innerJoin(products, eq(stockActivityLogs.productId, products.id))
      .innerJoin(stores, eq(stockActivityLogs.storeId, stores.id))
      .where(whereClause)
      .orderBy(desc(stockActivityLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(stockActivityLogs)
      .innerJoin(products, eq(stockActivityLogs.productId, products.id))
      .innerJoin(stores, eq(stockActivityLogs.storeId, stores.id))
      .where(whereClause);

    res.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Gagal memuat log aktivitas stok' });
  }
});

export default router;
