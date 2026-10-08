import { pgTable, text, integer, timestamp, boolean, varchar, uniqueIndex, doublePrecision } from 'drizzle-orm/pg-core';

export const telemetryEvents = pgTable('telemetry_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  eventId: varchar('event_id', { length: 128 }).notNull().unique(),
  gatewayId: varchar('gateway_id', { length: 64 }).notNull(),
  machineId: varchar('machine_id', { length: 64 }).notNull(),
  lineId: varchar('line_id', { length: 16 }).notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  counterValue: integer('counter_value').notNull(),
  deltaValue: integer('delta_value').notNull(),
  machineStatus: varchar('machine_status', { length: 32 }).notNull(),
  sourceTimestamp: timestamp('source_timestamp').notNull(),
  gatewayTimestamp: timestamp('gateway_timestamp').notNull(),
  serverTimestamp: timestamp('server_timestamp').defaultNow().notNull(),
  dataQuality: varchar('data_quality', { length: 32 }).notNull(), // GOOD, BAD, etc.
  isSimulation: boolean('is_simulation').default(false).notNull(),
  configurationVersion: varchar('configuration_version', { length: 64 }),
  spm: integer('spm'),
}, (table) => {
  return {
    machineSeqIdx: uniqueIndex('machine_seq_idx').on(table.machineId, table.sequenceNumber),
  };
});

export const gatewayHeartbeats = pgTable('gateway_heartbeats', {
  id: varchar('id', { length: 64 }).primaryKey(),
  gatewayId: varchar('gateway_id', { length: 64 }).notNull(),
  softwareVersion: varchar('software_version', { length: 32 }),
  configurationVersion: varchar('configuration_version', { length: 64 }),
  timestamp: timestamp('timestamp').notNull(),
  serverTimestamp: timestamp('server_timestamp').defaultNow().notNull(),
  queueDepth: integer('queue_depth').default(0),
  lastPlcRead: timestamp('last_plc_read'),
  lastSync: timestamp('last_sync'),
  connectionStatus: varchar('connection_status', { length: 32 }), // ONLINE, OFFLINE, etc.
  deviceHealth: varchar('device_health', { length: 32 }),
  cpuUsage: doublePrecision('cpu_usage'),
  memoryUsage: doublePrecision('memory_usage'),
  errorCode: varchar('error_code', { length: 64 }),
});

export const machineBaselines = pgTable('machine_baselines', {
  machineId: varchar('machine_id', { length: 64 }).primaryKey(),
  lastVerifiedCounter: integer('last_verified_counter').notNull(),
  lastSequenceNumber: integer('last_sequence_number').notNull(),
  lastEventTimestamp: timestamp('last_event_timestamp').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
