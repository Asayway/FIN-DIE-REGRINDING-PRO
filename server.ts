import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- TELEMETRY & GATEWAY API ---

  // In-memory store for development baseline & idempotency protection
  const eventCache = new Set<string>();
  const machineBaselines: Record<string, { lastCounter: number, lastSeq: number, lastTs: string }> = {};

  // POST /api/telemetry - Receiver for Edge Gateway telemetry
  app.post('/api/telemetry', (req, res) => {
    const data = req.body;
    
    // 1. Basic Structure Validation
    const requiredFields = ['eventId', 'gatewayId', 'machineId', 'lineId', 'sequenceNumber', 'counterValue', 'sourceTimestamp'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // 2. Idempotency Protection
    if (eventCache.has(data.eventId)) {
      return res.status(200).json({ 
        status: 'DUPLICATE_ACCEPTED', 
        message: 'Event already processed', 
        eventId: data.eventId 
      });
    }

    // 3. Machine Identity & Baseline Validation
    const baseline = machineBaselines[data.machineId];
    let delta = 0;
    let status = 'ACCEPTED';

    if (!baseline) {
      // First reading for this machine
      machineBaselines[data.machineId] = {
        lastCounter: data.counterValue,
        lastSeq: data.sequenceNumber,
        lastTs: data.sourceTimestamp
      };
      status = 'BASELINE_ESTABLISHED';
    } else {
      // Sequence validation
      if (data.sequenceNumber <= baseline.lastSeq) {
        return res.status(400).json({ error: 'Sequence number must be increasing' });
      }

      // Cumulative counter validation
      if (data.counterValue < baseline.lastCounter) {
        // Potential reset or rollover - mark as anomaly
        return res.status(422).json({ 
          error: 'COUNTER_ANOMALY', 
          message: 'Cumulative counter decreased unexpectedly. Reconciliation required.' 
        });
      }

      // Calculate accepted delta
      delta = data.counterValue - baseline.lastCounter;
      
      // Update baseline
      machineBaselines[data.machineId] = {
        lastCounter: data.counterValue,
        lastSeq: data.sequenceNumber,
        lastTs: data.sourceTimestamp
      };
    }

    // 4. Persistence (Simulated for Dev Prep)
    eventCache.add(data.eventId);
    if (eventCache.size > 5000) eventCache.clear(); // Simple cache pruning

    console.log(`[TELEMETRY] Received ${data.machineId} (Seq: ${data.sequenceNumber}, Delta: ${delta}) - Source: ${data.isSimulation ? 'SIM' : 'PLC'}`);

    res.json({
      success: true,
      status,
      delta,
      processedAt: new Date().toISOString(),
      eventId: data.eventId
    });
  });

  // POST /api/gateways/heartbeat - Receiver for Gateway health telemetry
  app.post('/api/gateways/heartbeat', (req, res) => {
    const { gatewayId, timestamp, connectionStatus, deviceHealth } = req.body;
    
    if (!gatewayId || !timestamp) {
      return res.status(400).json({ error: 'Missing gatewayId or timestamp' });
    }

    console.log(`[GATEWAY HEARTBEAT] ${gatewayId} - Status: ${connectionStatus}, Health: ${deviceHealth}`);

    res.json({
      success: true,
      serverTimestamp: new Date().toISOString()
    });
  });

  // API health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Fin Press & Fin Die Spare Parts Shot Control API',
      version: '1.0.0'
    });
  });

  // Simulated machine PLC shot pulse endpoint (for auto-shot counter integration)
  app.post('/api/shot-pulse', (req, res) => {
    const { lineId, shotsAdded, machineStatus, signalQuality } = req.body;
    res.json({
      success: true,
      received: { lineId, shotsAdded, machineStatus, signalQuality, timestamp: new Date().toISOString() }
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fin Press Shot Control] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
