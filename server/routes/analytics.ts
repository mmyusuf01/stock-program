import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { stores, products, storeInventory, stockActivityLogs, categories } from '../../src/db/schema.ts';
import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { requireAuth } from '../../src/middleware/auth.ts';

const router = Router();

const getSummary = async (req: any, res: any) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

    // 1. Total Stores
    const [{ totalStores }] = await db
      .select({ totalStores: sql<number>`count(*)::int` })
      .from(stores)
      .where(eq(stores.isActive, true));

    // 2. Total Catalog SKUs
    const [{ totalCatalogSkus }] = await db
      .select({ totalCatalogSkus: sql<number>`count(*)::int` })
      .from(products);

    // 3. Stock on hand & Valuation
    const invConditions = [];
    if (storeId) {
      invConditions.push(eq(storeInventory.storeId, storeId));
    }
    const invWhere = invConditions.length > 0 ? and(...invConditions) : undefined;

    const [stockStats] = await db
      .select({
        totalStockUnits: sql<number>`COALESCE(sum(${storeInventory.stockQuantity}), 0)::int`,
        totalCostValuation: sql<number>`COALESCE(sum(${storeInventory.stockQuantity}::bigint * ${products.costPrice}::bigint), 0)::bigint`,
        totalSellingValuation: sql<number>`COALESCE(sum(${storeInventory.stockQuantity}::bigint * ${products.sellingPrice}::bigint), 0)::bigint`,
        lowStockCount: sql<number>`COALESCE(sum(CASE WHEN ${storeInventory.stockQuantity} <= ${products.minStockThreshold} AND ${storeInventory.stockQuantity} > 0 THEN 1 ELSE 0 END), 0)::int`,
        outOfStockCount: sql<number>`COALESCE(sum(CASE WHEN ${storeInventory.stockQuantity} = 0 THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .where(invWhere);

    // 4. Today's movement (Stock In vs Stock Out)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const logConditions = [gte(stockActivityLogs.timestamp, todayStart)];
    if (storeId) {
      logConditions.push(eq(stockActivityLogs.storeId, storeId));
    }

    const [todayMovements] = await db
      .select({
        stockInToday: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} > 0 THEN ${stockActivityLogs.quantityDelta} ELSE 0 END), 0)::int`,
        stockOutToday: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} < 0 THEN ABS(${stockActivityLogs.quantityDelta}) ELSE 0 END), 0)::int`,
        transactionCountToday: sql<number>`count(*)::int`,
      })
      .from(stockActivityLogs)
      .where(and(...logConditions));

    res.json({
      totalStores: Number(totalStores || 0),
      totalCatalogSkus: Number(totalCatalogSkus || 0),
      totalStockUnits: Number(stockStats?.totalStockUnits || 0),
      totalCostValuation: Number(stockStats?.totalCostValuation || 0),
      totalSellingValuation: Number(stockStats?.totalSellingValuation || 0),
      lowStockCount: Number(stockStats?.lowStockCount || 0),
      outOfStockCount: Number(stockStats?.outOfStockCount || 0),
      stockInToday: Number(todayMovements?.stockInToday || 0),
      stockOutToday: Number(todayMovements?.stockOutToday || 0),
      transactionCountToday: Number(todayMovements?.transactionCountToday || 0),
    });
  } catch (error: any) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Gagal memuat analitik dashboard' });
  }
};

router.get('/summary', requireAuth, getSummary);
router.get('/dashboard', requireAuth, getSummary);

// GET 7-day movement trends
router.get('/trends', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendConditions = [gte(stockActivityLogs.timestamp, sevenDaysAgo)];
    if (storeId) {
      trendConditions.push(eq(stockActivityLogs.storeId, storeId));
    }

    const trendRows = await db
      .select({
        date: sql<string>`TO_CHAR(${stockActivityLogs.timestamp}, 'YYYY-MM-DD')`,
        stockIn: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} > 0 THEN ${stockActivityLogs.quantityDelta} ELSE 0 END), 0)::int`,
        stockOut: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} < 0 THEN ABS(${stockActivityLogs.quantityDelta}) ELSE 0 END), 0)::int`,
      })
      .from(stockActivityLogs)
      .where(and(...trendConditions))
      .groupBy(sql`TO_CHAR(${stockActivityLogs.timestamp}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${stockActivityLogs.timestamp}, 'YYYY-MM-DD')`);

    // Ensure all 7 days exist
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = trendRows.find((r) => r.date === dateStr);
      result.push({
        date: dateStr,
        stockIn: found ? Number(found.stockIn) : 0,
        stockOut: found ? Number(found.stockOut) : 0,
      });
    }

    res.json({ trends: result });
  } catch (error: any) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Gagal memuat tren mutasi stok' });
  }
});

// GET urgent low stock items
router.get('/urgent-low-stock', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

    const urgentItems = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        unit: products.unit,
        minStockThreshold: products.minStockThreshold,
        stockQuantity: storeInventory.stockQuantity,
        storeName: stores.name,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .innerJoin(stores, eq(storeInventory.storeId, stores.id))
      .where(
        and(
          storeId ? eq(storeInventory.storeId, storeId) : sql`1=1`,
          sql`${storeInventory.stockQuantity} <= ${products.minStockThreshold}`
        )
      )
      .orderBy(storeInventory.stockQuantity)
      .limit(8);

    res.json({ urgentItems });
  } catch (error: any) {
    console.error('Error fetching urgent low stock items:', error);
    res.status(500).json({ error: 'Gagal memuat barang kritis' });
  }
});

// GET automated daily report
router.get('/daily-report', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
    const targetDate = req.query.date ? (req.query.date as string) : new Date().toISOString().slice(0, 10);

    // Breakdown per store
    const storeBreakdown = await db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        city: stores.city,
        stockIn: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} > 0 THEN ${stockActivityLogs.quantityDelta} ELSE 0 END), 0)::int`,
        stockOut: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} < 0 THEN ABS(${stockActivityLogs.quantityDelta}) ELSE 0 END), 0)::int`,
        adjustments: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.changeType} = 'ADJUSTMENT' THEN 1 ELSE 0 END), 0)::int`,
        transactions: sql<number>`COALESCE(count(${stockActivityLogs.id}), 0)::int`,
      })
      .from(stores)
      .leftJoin(
        stockActivityLogs,
        and(
          eq(stockActivityLogs.storeId, stores.id),
          sql`TO_CHAR(${stockActivityLogs.timestamp}, 'YYYY-MM-DD') = ${targetDate}`
        )
      )
      .where(storeId ? eq(stores.id, storeId) : eq(stores.isActive, true))
      .groupBy(stores.id, stores.name, stores.city)
      .orderBy(stores.name)
      .limit(105);

    // Calculate valuations
    const [totals] = await db
      .select({
        totalStockIn: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} > 0 THEN ${stockActivityLogs.quantityDelta} ELSE 0 END), 0)::int`,
        totalStockOut: sql<number>`COALESCE(sum(CASE WHEN ${stockActivityLogs.quantityDelta} < 0 THEN ABS(${stockActivityLogs.quantityDelta}) ELSE 0 END), 0)::int`,
      })
      .from(stockActivityLogs)
      .where(
        and(
          storeId ? eq(stockActivityLogs.storeId, storeId) : sql`1=1`,
          sql`TO_CHAR(${stockActivityLogs.timestamp}, 'YYYY-MM-DD') = ${targetDate}`
        )
      );

    const [valuationRow] = await db
      .select({
        totalValuation: sql<number>`COALESCE(sum(${storeInventory.stockQuantity}::bigint * ${products.sellingPrice}::bigint), 0)::bigint`,
      })
      .from(storeInventory)
      .innerJoin(products, eq(storeInventory.productId, products.id))
      .where(storeId ? eq(storeInventory.storeId, storeId) : undefined);

    const breakdownWithValuation = storeBreakdown.map((b) => ({
      ...b,
      valuation: Number(valuationRow?.totalValuation || 0) / (storeBreakdown.length || 1),
    }));

    res.json({
      targetDate,
      totalStockIn: Number(totals?.totalStockIn || 0),
      totalStockOut: Number(totals?.totalStockOut || 0),
      totalValuation: Number(valuationRow?.totalValuation || 0),
      breakdown: breakdownWithValuation,
    });
  } catch (error: any) {
    console.error('Error compiling daily report:', error);
    res.status(500).json({ error: 'Gagal menyusun laporan stok harian otomatis' });
  }
});

export default router;
