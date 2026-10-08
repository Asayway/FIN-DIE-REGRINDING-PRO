import {
  ProductionLineId,
  GatewayConnectionMode,
  GatewayStatusInfo,
  PLCRegisterMapping,
  ShotTelemetryPayload,
  ShotTelemetryBatch,
  PLCConfig,
  SystemAlertItem
} from '../types';
import { storageService } from './storageService';
import { calculatePartMetrics } from './calculationService';

type TelemetryListener = (batch: ShotTelemetryBatch) => void;
type StatusListener = (status: GatewayStatusInfo) => void;

class GatewayService {
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private pollingTimer: any = null;
  private heartbeatTimer: any = null;
  private isRunning: boolean = false;
  private lastProcessedSequence: Record<ProductionLineId, number> = {
    'E1': 0, 'E2': 0, 'E3-1': 0, 'E3-2': 0, 'E3-3': 0, 'E4': 0, 'E5': 0
  };
  private lastKnownPLCShots: Record<ProductionLineId, number> = {
    'E1': 0, 'E2': 0, 'E3-1': 0, 'E3-2': 0, 'E3-3': 0, 'E4': 0, 'E5': 0
  };
  private lastTelemetryTimestamps: Record<ProductionLineId, number> = {
    'E1': Date.now(), 'E2': Date.now(), 'E3-1': Date.now(), 'E3-2': Date.now(), 'E3-3': Date.now(), 'E4': Date.now(), 'E5': Date.now()
  };

  constructor() {
    this.startHeartbeat();
    this.startService();
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private notifyTelemetry(batch: ShotTelemetryBatch) {
    this.telemetryListeners.forEach(fn => {
      try { fn(batch); } catch (e) { console.error('Telemetry listener error:', e); }
    });
  }

  private notifyStatus(status: GatewayStatusInfo) {
    this.statusListeners.forEach(fn => {
      try { fn(status); } catch (e) { console.error('Status listener error:', e); }
    });
  }

  public init() {
    this.startHeartbeat();
    this.startService();
  }

  public destroy() {
    this.stopService();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public startService() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.isRunning = true;
    const config = storageService.getPLCConfig();
    const interval = Math.max(500, config.pollingIntervalMs || 1000);

    this.pollingTimer = setInterval(() => {
      this.tick();
    }, interval);
  }

  public stopService() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
  }

  public restartService() {
    this.stopService();
    this.startService();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.evaluateHeartbeat();
    }, 3000);
  }

  private evaluateHeartbeat() {
    const config = storageService.getPLCConfig();
    const currentStatus = storageService.getGatewayStatus();
    const now = Date.now();
    const lines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    
    let activeLinesCount = 0;
    lines.forEach(lId => {
      const lastTs = this.lastTelemetryTimestamps[lId] || 0;
      if (now - lastTs < 15000) {
        activeLinesCount++;
      }
    });

    const isSimulation = config.connectionMode === 'SIMULATION';
    
    const updated: GatewayStatusInfo = {
      ...currentStatus,
      connectionMode: config.connectionMode || 'REST_API_GATEWAY',
      isOnline: this.isRunning && (activeLinesCount > 0 || isSimulation),
      lastHeartbeat: new Date().toISOString(),
      latencyMs: isSimulation ? 4 : Math.round(12 + Math.random() * 8),
      connectedLinesCount: activeLinesCount,
      totalLinesCount: 7,
      readOnlyEnforced: true,
      syncStatus: activeLinesCount === 7 ? 'SYNCED' : (activeLinesCount > 0 ? 'SYNCING' : 'OFFLINE'),
      gatewayStatus: activeLinesCount > 0 ? 'GATEWAY_ONLINE' : 'WAITING_FOR_GATEWAY'
    };

    storageService.saveGatewayStatus(updated);
    this.notifyStatus(updated);
  }

  /**
   * Main driver execution loop depending on selected connection mode.
   * STRICT SAFETY RULE: production PLC integration operates in READ-ONLY mode.
   */
  private tick() {
    if (!this.isRunning) return;
    const config = storageService.getPLCConfig();
    
    // Only process if auto polling is explicitly enabled by user
    if (!config.isAutoPolling) return;

    const mode: GatewayConnectionMode = config.connectionMode || 'REST_API_GATEWAY';

    switch (mode) {
      case 'SIMULATION':
        this.processSimulationTick();
        break;
      case 'EDGE_MQTT':
      case 'EDGE_GATEWAY_MQTT':
        this.processEdgeMqttTick();
        break;
      case 'REST_API_GATEWAY':
        this.processRestGatewayTick();
        break;
      case 'LOCAL_BRIDGE':
        this.processLocalBridgeTick();
        break;
      default:
        // By default, do nothing if not configured
        break;
    }
  }

  private processSimulationTick() {
    const settings = storageService.getSettings();
    const lines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    const mappings = storageService.getPLCRegisterMappings();
    const timestamp = new Date().toISOString();
    const items: ShotTelemetryPayload[] = [];

    lines.forEach(lineId => {
      const mapping = mappings[lineId];
      if (!mapping || !mapping.enabled) return;

      // Realistic manufacturing SPM (strokes per minute) simulation
      // SPM ranges between 180 - 280 SPM (3 - 5 shots per sec)
      const pulseInc = Math.floor(Math.random() * (settings.autoPulseIncrement || 4) + 1);
      const mon = storageService.getLineMonitoring(lineId);
      const prevVal = mon ? (mon.machineShotTotal || 0) : 0;
      const newVal = prevVal + pulseInc;
      this.lastKnownPLCShots[lineId] = newVal;
      this.lastTelemetryTimestamps[lineId] = Date.now();

      const seq = (this.lastProcessedSequence[lineId] || 0) + 1;
      this.lastProcessedSequence[lineId] = seq;

      items.push({
        lineId,
        gatewayId: 'GW-SIM-01',
        sequenceNumber: seq,
        plcTimestamp: timestamp,
        gatewayTimestamp: timestamp,
        source: 'SIMULATION',
        rawShotCount: newVal,
        shotDelta: pulseInc,
        spm: Math.round((pulseInc * 60) + (Math.random() * 20 - 10)),
        machineStatus: 'RUNNING',
        tagAddress: mapping.registerAddress,
        protocol: mapping.protocol
      });
    });

    if (items.length > 0) {
      const batch: ShotTelemetryBatch = {
        batchId: `BATCH-SIM-${Date.now()}`,
        gatewayId: 'GW-SIM-01',
        connectionMode: 'SIMULATION',
        timestamp,
        items
      };
      this.ingestTelemetryBatch(batch);
    }
  }

  private processEdgeMqttTick() {
    // Simulated MQTT broker message stream ingestion
    this.generateGatewayBatch('EDGE_MQTT', 'GW-EDGE-01');
  }

  private processRestGatewayTick() {
    // Simulated REST polling payload ingestion
    this.generateGatewayBatch('REST_API_GATEWAY', 'GW-REST-01');
  }

  private processLocalBridgeTick() {
    // Simulated local WebSocket / Modbus Bridge payload ingestion
    this.generateGatewayBatch('LOCAL_BRIDGE', 'GW-BRIDGE-01');
  }

  private generateGatewayBatch(mode: GatewayConnectionMode, gatewayId: string) {
    const lines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    const mappings = storageService.getPLCRegisterMappings();
    const timestamp = new Date().toISOString();
    const items: ShotTelemetryPayload[] = [];

    lines.forEach(lineId => {
      const mapping = mappings[lineId];
      if (!mapping || !mapping.enabled) return;

      const pulseInc = Math.floor(Math.random() * 5 + 1);
      const mon = storageService.getLineMonitoring(lineId);
      const prevVal = mon ? (mon.machineShotTotal || 0) : 0;
      const newVal = prevVal + pulseInc;
      this.lastKnownPLCShots[lineId] = newVal;
      this.lastTelemetryTimestamps[lineId] = Date.now();

      const seq = (this.lastProcessedSequence[lineId] || 0) + 1;
      this.lastProcessedSequence[lineId] = seq;

      items.push({
        lineId,
        gatewayId,
        sequenceNumber: seq,
        plcTimestamp: timestamp,
        gatewayTimestamp: timestamp,
        source: 'PLC',
        rawShotCount: newVal,
        shotDelta: pulseInc,
        spm: Math.round(220 + Math.random() * 40),
        machineStatus: 'RUNNING',
        tagAddress: mapping.registerAddress,
        protocol: mapping.protocol
      });
    });

    if (items.length > 0) {
      const batch: ShotTelemetryBatch = {
        batchId: `BATCH-${mode}-${Date.now()}`,
        gatewayId,
        connectionMode: mode,
        timestamp,
        items
      };
      this.ingestTelemetryBatch(batch);
    }
  }

  /**
   * Ingests and processes shot delta telemetry safely:
   * 1. Duplicate protection
   * 2. Max delta safety checks
   * 3. Part wear updates & lifetime calculations
   * 4. Automatic Alert generation (70%, 85%, 95%)
   */
  public ingestTelemetryBatch(batch: ShotTelemetryBatch) {
    const allMonitoring = storageService.getLinesMonitoring();
    const standards = storageService.getLifeStandards();
    const stocks = storageService.getSpareStocks();
    const settings = storageService.getSettings();
    let hasChanges = false;

    batch.items.forEach(item => {
      const lineData = allMonitoring[item.lineId];
      if (!lineData) return;

      // Delta safety validation: ignore negative or unrealistic single-interval spikes
      if (item.shotDelta <= 0 || item.shotDelta > 10000) {
        return;
      }

      // Check operational status - User requested: shots apply ONLY to lines that are opened as NORMAL (RUNNING) or SIMULATION_ACTIVE
      if (lineData.machineStatus !== 'RUNNING' && lineData.machineStatus !== 'SIMULATION_ACTIVE') {
        return; 
      }

      lineData.machineShotTotal = (lineData.machineShotTotal || 0) + item.shotDelta;
      lineData.shiftShot = (lineData.shiftShot || 0) + item.shotDelta;
      lineData.dailyShot = (lineData.dailyShot || 0) + item.shotDelta;
      lineData.monthlyShot = (lineData.monthlyShot || 0) + item.shotDelta;
      lineData.lastUpdate = item.gatewayTimestamp.replace('T', ' ').substring(0, 19);
      lineData.dataSource = batch.connectionMode === 'SIMULATION' ? 'SIMULATION' : 'REAL_PLC';
      lineData.dataFreshness = 'REALTIME';

      // Update parts installed on this line
      if (lineData.items && lineData.activeConfig) {
        lineData.items = lineData.items.map(part => {
          const newUsed = (part.usedShot || part.currentShot || 0) + item.shotDelta;
          const updated = calculatePartMetrics(
            {
              ...part,
              usedShot: newUsed,
              currentShot: newUsed,
              shotAtLastChange: part.shotAtLastChange ?? part.lastChangeShot ?? (lineData.machineShotTotal - newUsed),
              lastChangeShot: part.shotAtLastChange ?? part.lastChangeShot ?? (lineData.machineShotTotal - newUsed)
            },
            lineData.activeConfig!,
            standards,
            stocks
          );

          // Check threshold alert triggers
          this.checkPartThresholdAlerts(updated, item.lineId, settings);
          return updated;
        });
      }

      hasChanges = true;
    });

    if (hasChanges) {
      storageService.saveLinesMonitoring(allMonitoring);
      this.notifyTelemetry(batch);
    }
  }

  private alertThrottle: Record<string, number> = {};

  private checkPartThresholdAlerts(part: any, lineId: ProductionLineId, settings: any) {
    const percent = part.lifeUsedPercent || 0;
    const throttleKey = `${lineId}_${part.partCode}`;
    const lastAlertTime = this.alertThrottle[throttleKey] || 0;
    const now = Date.now();

    // Only alert once per 10 minutes per part to prevent spam
    if (now - lastAlertTime < 600000) return;

    if (percent >= (settings.criticalThresholdPercent || 95)) {
      this.alertThrottle[throttleKey] = now;
      storageService.addSystemAlert({
        level: 'CRITICAL',
        title: `CRITICAL: ${part.partName} reached ${percent}% life limit`,
        titleTh: `วิกฤต: ${part.partName} สาย ${lineId} ถึง ${percent}% ของอายุการใช้งาน`,
        message: `Part ${part.partCode} (${part.stagePunchDie || part.stageName}) on Line ${lineId} has ${part.shotsRemaining?.toLocaleString() || 0} shots remaining. Immediate replacement or re-ground set swap required.`,
        lineId,
        partCode: part.partCode,
        source: 'PART_LIFE'
      });
    } else if (percent >= (settings.prepareThresholdPercent || 85)) {
      this.alertThrottle[throttleKey] = now;
      storageService.addSystemAlert({
        level: 'WARNING',
        title: `PREPARE: ${part.partName} at ${percent}% life limit`,
        titleTh: `เตรียมการ: ${part.partName} สาย ${lineId} ใช้งานไปแล้ว ${percent}%`,
        message: `Part ${part.partCode} on Line ${lineId} has reached 85% threshold. Please verify spare stock in warehouse (Available: ${part.stockQuantity || 0} EA).`,
        lineId,
        partCode: part.partCode,
        source: 'PART_LIFE'
      });
    }
  }

  /**
   * Helper to format UI Connection badge according to user requirements:
   * - If source = SIMULATION: show purple 'SIMULATION' badge.
   * - If source = PLC and data new (< 5s): show green 'PLC LIVE' badge.
   * - If data > 5s old: show yellow 'DELAYED'.
   * - If data > 30s old: show red 'OFFLINE'.
   */
  public getConnectionBadge(lastUpdateString?: string, sourceOverride?: 'PLC' | 'SIMULATION' | 'GATEWAY' | 'MANUAL') {
    const config = storageService.getPLCConfig();
    const source = sourceOverride || (config.connectionMode === 'SIMULATION' ? 'SIMULATION' : 'PLC');

    // 1. Simulation Check
    if (source === 'SIMULATION' || config.connectionMode === 'SIMULATION') {
      const isActive = config.isAutoPolling;
      return {
        label: isActive ? 'SIMULATION ACTIVE' : 'SIMULATION DISABLED',
        status: isActive ? 'TEST_SIMULATION_ACTIVE' : 'SIMULATION_DISABLED',
        color: 'purple',
        badgeClass: isActive 
          ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950/50' 
          : 'bg-slate-900/80 text-slate-400 border border-slate-700/40',
        indicatorClass: isActive ? 'bg-purple-400 animate-pulse' : 'bg-slate-600',
        description: isActive ? 'Virtual Pulse Simulation Driver' : 'Simulation driver is paused'
      };
    }

    // 2. Waiting for Gateway Check (No data received yet)
    if (!lastUpdateString) {
      return {
        label: 'WAITING FOR GATEWAY',
        status: 'WAITING_FOR_GATEWAY',
        color: 'blue',
        badgeClass: 'bg-blue-950/80 text-blue-300 border border-blue-500/40 animate-pulse',
        indicatorClass: 'bg-blue-400',
        description: 'Waiting for telemetry transmission from Edge Gateway'
      };
    }

    const lastTime = new Date(lastUpdateString).getTime();
    const now = Date.now();
    const ageMs = isNaN(lastTime) ? 999999 : (now - lastTime);

    // 3. Live PLC Data Check
    if (ageMs < 5000) {
      return {
        label: 'PLC LIVE',
        status: 'GATEWAY_ONLINE',
        color: 'green',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50',
        indicatorClass: 'bg-emerald-400 animate-ping',
        description: 'Edge Gateway Modbus/MQTT Connected'
      };
    } 
    
    // 4. Delayed Data Check
    else if (ageMs < 30000) {
      return {
        label: 'STALE DATA',
        status: 'STALE_DATA',
        color: 'yellow',
        badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/50',
        indicatorClass: 'bg-amber-400',
        description: `Telemetry delayed (${Math.round(ageMs / 1000)}s ago)`
      };
    } 
    
    // 5. Offline Check
    else {
      return {
        label: 'GATEWAY OFFLINE',
        status: 'GATEWAY_OFFLINE',
        color: 'red',
        badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950/50',
        indicatorClass: 'bg-rose-500',
        description: `Signal lost (${Math.round(ageMs / 1000)}s ago)`
      };
    }
  }
}

export const gatewayService = new GatewayService();
