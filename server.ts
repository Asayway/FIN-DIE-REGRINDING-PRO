import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API health endpoint for Fin Die Regrinding & Cost Saving Pro
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Fin Die Regrinding & Cost Saving Management API',
      version: '2.4.0',
      timestamp: new Date().toISOString()
    });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fin Die Regrind Pro] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
