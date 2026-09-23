import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Route handlers
import authRouter from './server/routes/auth.ts';
import storesRouter from './server/routes/stores.ts';
import productsRouter from './server/routes/products.ts';
import inventoryRouter from './server/routes/inventory.ts';
import analyticsRouter from './server/routes/analytics.ts';
import auditLogsRouter from './server/routes/auditLogs.ts';
import notificationsRouter from './server/routes/notifications.ts';
import bulkRouter from './server/routes/bulk.ts';
import syncRouter from './server/routes/sync.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for large bulk uploads (Excel / CSV)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Retail Inventory Management RDBMS Backend',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL (Cloud SQL)',
    });
  });

  // Microservice API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/bulk', bulkRouter);
  app.use('/api/sync', syncRouter);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inventory RDBMS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
