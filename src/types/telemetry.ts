export interface GatewayTelemetryRequest {
  eventId: string;
  gatewayId: string;
  machineId: string;
  lineId: string;
  sequenceNumber: number;
  counterValue: number;
  machineStatus: 'RUNNING' | 'IDLE' | 'STOPPED' | 'MAINTENANCE' | 'CHANGEOVER';
  sourceTimestamp: string;
  gatewayTimestamp: string;
  dataQuality: 'GOOD' | 'BAD' | 'REVIEW_REQUIRED';
  isSimulation: boolean;
  configurationVersion: string;
  spm?: number;
}

export interface GatewayHeartbeatRequest {
  gatewayId: string;
  softwareVersion: string;
  configurationVersion: string;
  timestamp: string;
  queueDepth: number;
  lastPlcRead: string;
  lastSync: string;
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  deviceHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  cpuUsage?: number;
  memoryUsage?: number;
  errorCode?: string;
}
