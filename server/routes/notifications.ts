import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import { notifications, stores, products } from '../../src/db/schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAuth } from '../../src/middleware/auth.ts';

const router = Router();

// GET notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    let conditions = [];
    if (storeId) {
      conditions.push(sql`(${notifications.storeId} = ${storeId} OR ${notifications.storeId} IS NULL)`);
    }
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: notifications.id,
        storeId: notifications.storeId,
        storeName: stores.name,
        productId: notifications.productId,
        productName: products.name,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(stores, eq(notifications.storeId, stores.id))
      .leftJoin(products, eq(notifications.productId, products.id))
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [{ unreadCount }] = await db
      .select({ unreadCount: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.isRead, false), storeId ? sql`(${notifications.storeId} = ${storeId} OR ${notifications.storeId} IS NULL)` : sql`1=1`));

    res.json({
      notifications: list,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Gagal memuat notifikasi' });
  }
});

// PATCH mark notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
  }
});

// POST mark all as read
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const storeId = req.body.storeId ? parseInt(req.body.storeId) : undefined;
    if (storeId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(sql`${notifications.storeId} = ${storeId} OR ${notifications.storeId} IS NULL`);
    } else {
      await db.update(notifications).set({ isRead: true });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Gagal memperbarui notifikasi' });
  }
});

export default router;
