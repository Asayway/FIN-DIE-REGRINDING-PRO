import { getMoldTypeForLine, getStagesForMoldType } from "../utils/moldMatrixUtils";
import { cleanStageName, deriveLogicalStage, DEFAULT_STAGE_GROUPS, isPartMatchingInteractiveStage } from "../utils/stageUtils";
import {
  LineLiveMonitoringData,
  LineActiveConfiguration,
  PartLiveTrackingItem,
  PartLifeStandard,
  PartMaster,
  InstalledQuantityRule,
  SpareStockItem,
  StockStatus,
  CombinedRiskLevel,
  ProcurementStatus,
  OrderStatus,
  ReplacementRecord,
  RegrindingRecord,
  RegrindMasterStandard,
  RegrindPartStatus,
  PositionReplacementDetail,
  ConditionInspectionRecord,
  ShotEntryRecord,
  AuditLogEntry,
  User,
  SystemSettings,
  PLCConfig,
  PLCRegisterMapping,
  GatewayStatusInfo,
  SystemAlertItem,
  ProductionLineId,
  UserRole,
  PositionLockRecord,
  PositionLockStatus,
  MachineStatus,
  DowntimeLogEntry,
  DowntimeCategory,
  DowntimeSummaryByLine,
  Downtime30DayReport
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_PART_MASTERS,
  INITIAL_LINE_CONFIGS,
  INITIAL_PART_LIFE_STANDARDS,
  INITIAL_LIVE_DATA_E1,
  INITIAL_SPARE_STOCKS,
  INITIAL_REPLACEMENT_HISTORY,
  INITIAL_REGRIND_RECORDS,
  INITIAL_REGRIND_MASTER_STANDARDS,
  INITIAL_INSPECTIONS,
  INITIAL_SHOT_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DOWNTIME_LOGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_PLC_CONFIG,
  DEFAULT_FACTORY_PLC_METERS,
  INITIAL_PLC_REGISTER_MAPPINGS,
  INITIAL_GATEWAY_STATUS,
  INITIAL_SYSTEM_ALERTS,
  SEED_DATA_VERSION,
  SEED_SOURCE_LABEL
} from '../data/seedData';

import { calculatePartMetrics, getPartProgressiveRank } from './calculationService';
import { safeStorage } from './safeStorage';

const STORAGE_KEYS = {
  USERS: 'fin_press_users',
  CURRENT_USER: 'fin_press_current_user',
  PART_MASTERS: 'fin_press_part_masters',
  LINE_CONFIGS: 'fin_press_line_configs',
  LIFE_STANDARDS: 'fin_press_life_standards',
  LINE_MONITORING: 'fin_press_line_monitoring',
  SPARE_STOCKS: 'fin_press_spare_stocks',
  REPLACEMENTS: 'fin_press_replacements',
  REPLACEMENT_DRAFTS: 'fin_press_replacement_drafts',
  REGRINDS: 'fin_press_regrinds',
  REGRIND_STANDARDS: 'fin_press_regrind_standards',
  INSPECTIONS: 'fin_press_inspections',
  SHOT_LOGS: 'fin_press_shot_logs',
  SHOT_DRAFTS: 'fin_press_shot_drafts',
  AUDIT_LOGS: 'fin_press_audit_logs',
  SETTINGS: 'fin_press_settings',
  PLC_CONFIG: 'fin_press_plc_config',
  PLC_MAPPINGS: 'fin_press_plc_mappings',
  GATEWAY_STATUS: 'fin_press_gateway_status',
  SYSTEM_ALERTS: 'fin_press_system_alerts',
  OFFLINE_BUFFER: 'fin_press_offline_buffer',
  POSITION_LOCKS: 'fin_press_position_locks',
  DOWNTIME_LOGS: 'fin_press_downtime_logs',
  ACTIVE_E3_FIN_DIE: 'fin_press_active_e3_fin_die',
  STAGE_GROUPS: 'fin_press_custom_stage_groups',
  TV_DISPLAY_CONFIGS: 'fin_press_tv_display_configs',
  SEED_INITIALIZED: 'fin_press_seed_init_v12_stages_2025'
};

type Listener = () => void;

class StorageService {
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    queueMicrotask(() => {
      this.listeners.forEach(fn => {
        try {
          fn();
        } catch (err) {
          console.error('Storage listener error:', err);
        }
      });
    });
  }

  private ensureInitialized() {
    this.cleanUpStorageQuota();
    const initialized = safeStorage.getItem(STORAGE_KEYS.SEED_INITIALIZED);
    const users = safeStorage.getItem(STORAGE_KEYS.USERS);
    const parts = safeStorage.getItem(STORAGE_KEYS.PART_MASTERS);
    const lines = safeStorage.getItem(STORAGE_KEYS.LINE_MONITORING);
    if (!initialized || !users || !parts || !lines || initialized !== SEED_DATA_VERSION) {
      this.resetToSeedData();
    }
    this.migrateStageNamesToEnglish();
  }

  private migrateStageNamesToEnglish() {
    try {
      let updatedParts = false;
      const parts = this.getPartMasters();
      parts.forEach(p => {
        const cleaned = cleanStageName(p.stageName);
        if (cleaned !== p.stageName) {
          p.stageName = cleaned;
          updatedParts = true;
        }
      });
      if (updatedParts) {
        safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
      }

      let updatedGroups = false;
      const groups = this.getStageGroups();
      const cleanedGroups = groups.map(g => {
        const cleaned = cleanStageName(g);
        if (cleaned !== g) updatedGroups = true;
        return cleaned;
      });
      if (updatedGroups) {
        // deduplicate just in case
        const uniqueGroups = Array.from(new Set(cleanedGroups));
        safeStorage.setItem(STORAGE_KEYS.STAGE_GROUPS, JSON.stringify(uniqueGroups));
      }
    } catch (e) {
      console.error('Error migrating stage names:', e);
    }
  }

  public cleanUpStorageQuota() {
    try {
      safeStorage.purgeObsoleteKeys();
      safeStorage.compactLogs();
      // 1. Purge oversized legacy interactive pin arrays
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('FIN_DIE_INTERACTIVE_PINS_') || key.startsWith('FIN_DIE_PINS_') || key.startsWith('fin_die_regrind_queue_v1') || key.startsWith('fin_die_regrind_queue_v2'))) {
          safeStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Storage quota cleanup exception:', e);
    }
  }

  public safeSetItem(key: string, value: string): boolean {
    return safeStorage.setItem(key, value);
  }

  public resetToSeedData() {
    this.cleanUpAllPinOverrides();
    safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    safeStorage.setItem(STORAGE_KEYS.STAGE_GROUPS, JSON.stringify(DEFAULT_STAGE_GROUPS));
    safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(INITIAL_PART_MASTERS));
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(INITIAL_LINE_CONFIGS));
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(INITIAL_PART_LIFE_STANDARDS));
    
    // Generate initial live monitoring dataset for 7 production lines (E1, E2, E3-1, E3-2, E3-3, E4, E5) with 0 initial shots
    const linesMonitoring: Record<ProductionLineId, LineLiveMonitoringData> = {
      'E1': INITIAL_LIVE_DATA_E1,
      'E2': this.generateLineMonitoring('E2', INITIAL_LINE_CONFIGS[1], 0),
      'E3-1': this.generateLineMonitoring('E3-1', INITIAL_LINE_CONFIGS[2], 0),
      'E3-2': this.generateLineMonitoring('E3-2', INITIAL_LINE_CONFIGS[3], 0),
      'E3-3': this.generateLineMonitoring('E3-3', INITIAL_LINE_CONFIGS[4], 0),
      'E4': this.generateLineMonitoring('E4', INITIAL_LINE_CONFIGS[5], 0),
      'E5': this.generateLineMonitoring('E5', INITIAL_LINE_CONFIGS[6], 0)
    };

    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(linesMonitoring));
    safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(INITIAL_SPARE_STOCKS));
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(INITIAL_REPLACEMENT_HISTORY));
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENT_DRAFTS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify(INITIAL_REGRIND_RECORDS));
    safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(INITIAL_REGRIND_MASTER_STANDARDS));
    safeStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(INITIAL_INSPECTIONS));
    safeStorage.setItem(STORAGE_KEYS.SHOT_LOGS, JSON.stringify(INITIAL_SHOT_LOGS));
    safeStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(INITIAL_DOWNTIME_LOGS));
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    safeStorage.setItem(STORAGE_KEYS.PLC_CONFIG, JSON.stringify(DEFAULT_PLC_CONFIG));
    safeStorage.setItem(STORAGE_KEYS.PLC_MAPPINGS, JSON.stringify(INITIAL_PLC_REGISTER_MAPPINGS));
    safeStorage.setItem(STORAGE_KEYS.GATEWAY_STATUS, JSON.stringify(INITIAL_GATEWAY_STATUS));
    safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify(INITIAL_SYSTEM_ALERTS));
    safeStorage.setItem(STORAGE_KEYS.OFFLINE_BUFFER, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.SEED_INITIALIZED, SEED_DATA_VERSION);

    this.notify();
  }

  // Clear all pin overrides across all lines
  public cleanUpAllPinOverrides() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('FIN_DIE_INTERACTIVE_PINS_') ||
          key.startsWith('FIN_DIE_PINS_') ||
          key.startsWith('FIN_DIE_COMPACT_PIN_OVERRIDES_') ||
          key.startsWith('FIN_DIE_PIN_OVERRIDES_V3_') ||
          key.startsWith('FIN_DIE_PIN_OVERRIDES_V4_') ||
          key.startsWith('FIN_DIE_PIN_OVERRIDES_V5_')
        )) {
          safeStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Error clearing pin overrides:', e);
    }
  }

  // Factory Go-Live Set 0 Reset Method with PLC Meter Baseline Support
  public resetToCleanGoLive(initialShotBaseline: number | Record<ProductionLineId, number> = DEFAULT_FACTORY_PLC_METERS) {
    this.cleanUpAllPinOverrides();

    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENT_DRAFTS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.SHOT_LOGS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify([]));
    safeStorage.setItem(STORAGE_KEYS.OFFLINE_BUFFER, JSON.stringify([]));

    const lineConfigs = this.getLineConfigs();

    const getBaseline = (lId: ProductionLineId): number => {
      if (typeof initialShotBaseline === 'number') {
        return initialShotBaseline;
      }
      return initialShotBaseline[lId] !== undefined ? initialShotBaseline[lId] : (DEFAULT_FACTORY_PLC_METERS[lId] || 0);
    };

    const linesMonitoring: Record<ProductionLineId, LineLiveMonitoringData> = {
      'E1': this.generateLineMonitoring('E1', lineConfigs.find(c => c.lineId === 'E1') || INITIAL_LINE_CONFIGS[0], getBaseline('E1')),
      'E2': this.generateLineMonitoring('E2', lineConfigs.find(c => c.lineId === 'E2') || INITIAL_LINE_CONFIGS[1], getBaseline('E2')),
      'E3-1': this.generateLineMonitoring('E3-1', lineConfigs.find(c => c.lineId === 'E3-1') || INITIAL_LINE_CONFIGS[2], getBaseline('E3-1')),
      'E3-2': this.generateLineMonitoring('E3-2', lineConfigs.find(c => c.lineId === 'E3-2') || INITIAL_LINE_CONFIGS[3], getBaseline('E3-2')),
      'E3-3': this.generateLineMonitoring('E3-3', lineConfigs.find(c => c.lineId === 'E3-3') || INITIAL_LINE_CONFIGS[4], getBaseline('E3-3')),
      'E4': this.generateLineMonitoring('E4', lineConfigs.find(c => c.lineId === 'E4') || INITIAL_LINE_CONFIGS[5], getBaseline('E4')),
      'E5': this.generateLineMonitoring('E5', lineConfigs.find(c => c.lineId === 'E5') || INITIAL_LINE_CONFIGS[6], getBaseline('E5'))
    };

    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(linesMonitoring));

    // Also align PLC registers currentVal in plcConfig
    const plcConfig = this.getPLCConfig();
    if (plcConfig && plcConfig.lineRegisters) {
      (Object.keys(linesMonitoring) as ProductionLineId[]).forEach(lId => {
        if (plcConfig.lineRegisters[lId]) {
          plcConfig.lineRegisters[lId].currentVal = linesMonitoring[lId].machineShotTotal;
          plcConfig.lineRegisters[lId].lastPulse = new Date().toLocaleTimeString('th-TH');
        }
      });
      safeStorage.setItem(STORAGE_KEYS.PLC_CONFIG, JSON.stringify(plcConfig));
    }

    this.addAuditLog(
      'SYSTEM',
      `Factory Go-Live Operational Reset (Set 0) executed. Line PLC meters aligned for real-time PLC LAN streaming.`
    );

    this.notify();
  }

  private generateLineMonitoring(
    lineId: ProductionLineId,
    config: LineActiveConfiguration,
    totalShots: number = 0
  ): LineLiveMonitoringData {
    const standards = INITIAL_PART_LIFE_STANDARDS;
    const stocks = INITIAL_SPARE_STOCKS;
    const partMasters = INITIAL_PART_MASTERS;

    const installedMap = config?.installedPartQuantities || {};
    const installedCodes = Object.keys(installedMap).filter(code => (installedMap[code] || 0) > 0);

    let baseItems: PartLiveTrackingItem[] = [];

    if (installedCodes.length > 0) {
      baseItems = installedCodes.map((code) => {
        const pm = partMasters.find(p => p.partCode === code);
        const std = standards.find(s => s.configKey?.partCode === code || s.partName === pm?.partName || s.stagePunchDie === pm?.stageName);
        const stock = stocks.find(s => s.partCode === code || s.partName === pm?.partName);
        const installQty = installedMap[code] || (pm ? 1 : 0);
        const lifeLimit = std?.lifeLimitShots || 15000000;

        return calculatePartMetrics(
          {
            slotId: `SLOT-${lineId}-${code}`,
            partCode: code,
            partName: pm?.partName || `Part ${code}`,
            stagePunchDie: pm?.stageName || 'Die Stage',
            position: pm?.stageName || 'ALL',
            installQty: installQty,
            backupQty: stock?.availableQuantity ?? 10,
            usedShot: 0,
            currentShot: 0,
            shotAtLastChange: totalShots,
            lastChangeShot: totalShots,
            regrindCount: 0,
            totalMmGround: 0,
            lifeLimit: lifeLimit
          },
          config,
          standards,
          stocks
        );
      });
    } else {
      baseItems = INITIAL_LIVE_DATA_E1.items.map((item, idx) => {
        return calculatePartMetrics(
          {
            slotId: `SLOT-${lineId}-${idx + 1}`,
            partCode: item.partCode,
            partName: item.partName,
            stagePunchDie: item.stagePunchDie,
            position: item.position,
            installQty: item.installQty,
            backupQty: item.backupQty,
            usedShot: 0,
            currentShot: 0,
            shotAtLastChange: totalShots,
            lastChangeShot: totalShots,
            regrindCount: 0,
            totalMmGround: 0,
            lifeLimit: item.lifeLimit || 15000000
          },
          config,
          standards,
          stocks
        );
      });
    }

    return {
      lineId,
      lineName: config?.lineName || `Fin Press Line ${lineId}`,
      machineStatus: 'IDLE',
      machineShotTotal: totalShots,
      shiftShot: 0,
      dailyShot: 0,
      monthlyShot: 0,
      shotSignal: 'NORMAL',
      lastUpdate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      activeConfig: config,
      dataSource: 'NO_DATA',
      dataFreshness: 'OFFLINE',
      items: baseItems
    };
  }

  // --- Getters ---
  public getUsers(): User[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.USERS);
      if (!raw) return INITIAL_USERS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public getCurrentUser(): User {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!raw) return INITIAL_USERS[0];
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.name) return parsed;
      return INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  }

  public setCurrentUser(user: User) {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.addAuditLog('SYSTEM', `Switched active user to ${user.name} (${user.role})`);
    this.notify();
  }

  public getStageGroups(): string[] {
    try {
      const stored = safeStorage.getItem(STORAGE_KEYS.STAGE_GROUPS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_STAGE_GROUPS;
    } catch {
      return DEFAULT_STAGE_GROUPS;
    }
  }

  public saveStageGroups(groups: string[]) {
    const seen = new Set<string>();
    const uniqueGroups: string[] = [];
    groups.forEach(g => {
      const trimmed = g.trim();
      if (!trimmed) return;
      const normalized = trimmed.toUpperCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueGroups.push(trimmed);
      }
    });
    safeStorage.setItem(STORAGE_KEYS.STAGE_GROUPS, JSON.stringify(uniqueGroups));
    this.notify();
  }

  public getPartMasters(): PartMaster[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.PART_MASTERS);
      if (!raw) return INITIAL_PART_MASTERS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PART_MASTERS;
    } catch {
      return INITIAL_PART_MASTERS;
    }
  }

  public savePartMaster(part: PartMaster): void {
    const list = this.getPartMasters();
    const idx = list.findIndex(p => p.partCode === part.partCode);
    if (idx >= 0) {
      list[idx] = part;
      // Sync names across configuration stores
      this.syncPartNameChanges(part.partCode, part.partName, part.stageName);
    } else {
      list.push(part);
    }
    safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(list));
    this.addAuditLog('SYSTEM', `Updated Part Master: ${part.partCode} (${part.partName})`, `อัปเดตข้อมูลชิ้นส่วนหลัก ${part.partName}`);
    this.notify();
  }

  private syncPartNameChanges(partCode: string, newName: string, newStage: string) {
    let changed = false;

    // Sync Life Standards
    const lifeStds = this.getLifeStandards();
    lifeStds.forEach(std => {
      if (std.configKey.partCode === partCode) {
        if (std.partName !== newName || std.stagePunchDie !== newStage) {
          std.partName = newName;
          std.stagePunchDie = newStage;
          changed = true;
        }
      }
    });
    if (changed) safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));

    // Sync Regrind Standards
    changed = false;
    const regrindStds = this.getRegrindMasterStandards();
    regrindStds.forEach(std => {
      if (std.partCode === partCode) {
        if (std.partName !== newName || std.stagePunchDie !== newStage) {
          std.partName = newName;
          std.stagePunchDie = newStage;
          changed = true;
        }
      }
    });
    if (changed) safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));

    // Sync Spare Stocks
    changed = false;
    const stocks = this.getSpareStocks();
    stocks.forEach(stk => {
      if (stk.partCode === partCode && stk.partName !== newName) {
        stk.partName = newName;
        changed = true;
      }
    });
    if (changed) safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));

    // Sync Position Locks
    changed = false;
    const locks = this.getPositionLocks();
    locks.forEach(lock => {
      if (lock.partCode === partCode && lock.partName !== newName) {
        lock.partName = newName;
        changed = true;
      }
    });
    if (changed) safeStorage.setItem(STORAGE_KEYS.POSITION_LOCKS, JSON.stringify(locks));

    // Sync Live Monitoring Items
    try {
      const allMonitoring = this.getLinesMonitoring();
      let monChanged = false;
      Object.values(allMonitoring).forEach(line => {
        line?.items?.forEach(item => {
          if (item.partCode === partCode) {
            if (item.partName !== newName || (newStage && item.stagePunchDie !== newStage)) {
              item.partName = newName;
              if (newStage) item.stagePunchDie = newStage;
              monChanged = true;
            }
          }
        });
      });
      if (monChanged) {
        safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
      }
    } catch (_) {}
  }

  public savePartMasters(parts: PartMaster[]): void {
    safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
    // Sync name changes across all stores
    parts.forEach(p => this.syncPartNameChanges(p.partCode, p.partName, p.stageName));
    this.addAuditLog('SYSTEM', `Bulk updated ${parts.length} Part Master catalog records`);
    this.notify();
  }

  public savePartMastersBulk(parts: PartMaster[], lifeStds: PartLifeStandard[]): void {
    // Save part masters
    safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
    
    // Save life standards
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));

    // Batch sync name/stage changes to other stores
    let regrindChanged = false;
    const regrindStds = this.getRegrindMasterStandards();
    
    let stocksChanged = false;
    const stocks = this.getSpareStocks();

    let locksChanged = false;
    const locks = this.getPositionLocks();

    let monChanged = false;
    const allMonitoring = this.getLinesMonitoring();

    parts.forEach(part => {
      const newName = part.partName;
      const newStage = part.stageName;

      regrindStds.forEach(std => {
        if (std.partCode === part.partCode) {
          if (std.partName !== newName || std.stagePunchDie !== newStage) {
            std.partName = newName;
            std.stagePunchDie = newStage;
            regrindChanged = true;
          }
        }
      });

      stocks.forEach(stk => {
        if (stk.partCode === part.partCode && stk.partName !== newName) {
          stk.partName = newName;
          stocksChanged = true;
        }
      });

      locks.forEach(lock => {
        if (lock.partCode === part.partCode && lock.partName !== newName) {
          lock.partName = newName;
          locksChanged = true;
        }
      });

      Object.values(allMonitoring).forEach(line => {
        line?.items?.forEach(item => {
          if (item.partCode === part.partCode) {
            if (item.partName !== newName || (newStage && item.stagePunchDie !== newStage)) {
              item.partName = newName;
              if (newStage) item.stagePunchDie = newStage;
              monChanged = true;
            }
          }
        });
      });
    });

    if (regrindChanged) {
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));
    }
    if (stocksChanged) {
      safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));
    }
    if (locksChanged) {
      safeStorage.setItem(STORAGE_KEYS.POSITION_LOCKS, JSON.stringify(locks));
    }
    if (monChanged) {
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
    }

    this.addAuditLog('SYSTEM', `Bulk updated ${parts.length} Part Master catalog and standards records`, `อัปเดตข้อมูลชิ้นส่วนหลักและมาตรฐานจำนวน ${parts.length} รายการ`);
    this.notify();
  }

  public renameStageGroup(oldStageName: string, newStageName: string): void {
    const oldNorm = oldStageName.trim().toUpperCase();
    const cleanNewName = newStageName.trim();
    const newNorm = cleanNewName.toUpperCase();

    const groups = this.getStageGroups();
    const newGroups: string[] = [];
    const seen = new Set<string>();

    groups.forEach(g => {
      const gNorm = g.trim().toUpperCase();
      if (gNorm === oldNorm) {
        if (!seen.has(newNorm)) {
          seen.add(newNorm);
          newGroups.push(cleanNewName);
        }
      } else {
        if (!seen.has(gNorm)) {
          seen.add(gNorm);
          newGroups.push(g.trim());
        }
      }
    });

    if (!seen.has(newNorm)) {
      newGroups.push(cleanNewName);
    }
    
    this.saveStageGroups(newGroups);

    // Update Part Masters
    const list = this.getPartMasters();
    let updatedCount = 0;
    list.forEach(p => {
      if (p.stageName && p.stageName.trim().toUpperCase() === oldNorm) {
        p.stageName = cleanNewName;
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(list));
    }

    // Also update Life Standards
    const lifeStds = this.getLifeStandards();
    let lifeUpdated = false;
    lifeStds.forEach(std => {
      if (std.stagePunchDie && std.stagePunchDie.trim().toUpperCase() === oldNorm) {
        std.stagePunchDie = cleanNewName;
        lifeUpdated = true;
      }
    });
    if (lifeUpdated) {
      safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));
    }

    // Also update Regrind Standards
    const regrindStds = this.getRegrindMasterStandards();
    let regrindUpdated = false;
    regrindStds.forEach(std => {
      if (std.stagePunchDie && std.stagePunchDie.trim().toUpperCase() === oldNorm) {
        std.stagePunchDie = cleanNewName;
        regrindUpdated = true;
      }
    });
    if (regrindUpdated) {
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));
    }

    // Also update Line items in production lines monitoring
    const allMonitoring = this.getLinesMonitoring();
    let monUpdated = false;
    if (allMonitoring && typeof allMonitoring === 'object') {
      Object.values(allMonitoring).forEach(mon => {
        mon?.items?.forEach(item => {
          if (item.stagePunchDie && item.stagePunchDie.trim().toUpperCase() === oldNorm) {
            item.stagePunchDie = cleanNewName;
            monUpdated = true;
          }
        });
      });
    }
    if (monUpdated) {
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
    }

    this.addAuditLog('SYSTEM', `Renamed Stage Group from "${oldStageName}" to "${cleanNewName}" across ${updatedCount} parts`);
    this.notify();
  }

  public deleteStageGroup(stageName: string): void {
    const stageNorm = stageName.trim().toUpperCase();
    const groups = this.getStageGroups();
    const newGroups = groups.filter(g => g.trim().toUpperCase() !== stageNorm);
    this.saveStageGroups(newGroups);

    const fallbackStage = newGroups[0] || 'UNASSIGNED';

    // Update Part Masters
    const list = this.getPartMasters();
    let updatedCount = 0;
    list.forEach(p => {
      if (p.stageName && p.stageName.trim().toUpperCase() === stageNorm) {
        p.stageName = fallbackStage;
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(list));
    }

    // Update Life Standards
    const lifeStds = this.getLifeStandards();
    let lifeUpdated = false;
    lifeStds.forEach(std => {
      if (std.stagePunchDie && std.stagePunchDie.trim().toUpperCase() === stageNorm) {
        std.stagePunchDie = fallbackStage;
        lifeUpdated = true;
      }
    });
    if (lifeUpdated) {
      safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));
    }

    // Update Regrind Standards
    const regrindStds = this.getRegrindMasterStandards();
    let regrindUpdated = false;
    regrindStds.forEach(std => {
      if (std.stagePunchDie && std.stagePunchDie.trim().toUpperCase() === stageNorm) {
        std.stagePunchDie = fallbackStage;
        regrindUpdated = true;
      }
    });
    if (regrindUpdated) {
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));
    }

    // Update Line items in production lines monitoring
    const allMonitoring = this.getLinesMonitoring();
    let monUpdated = false;
    if (allMonitoring && typeof allMonitoring === 'object') {
      Object.values(allMonitoring).forEach(mon => {
        mon?.items?.forEach(item => {
          if (item.stagePunchDie && item.stagePunchDie.trim().toUpperCase() === stageNorm) {
            item.stagePunchDie = fallbackStage;
            monUpdated = true;
          }
        });
      });
    }
    if (monUpdated) {
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
    }

    this.addAuditLog('SYSTEM', `Deleted Stage Group "${stageName}" and reassigned ${updatedCount} parts to "${fallbackStage}"`);
    this.notify();
  }

  public deletePartMaster(partCode: string): void {
    const list = this.getPartMasters();
    const idx = list.findIndex(p => p.partCode === partCode);
    if (idx >= 0) {
      const part = list[idx];
      list.splice(idx, 1);
      safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(list));
      
      // Cleanup orphaned records
      const lifeStds = this.getLifeStandards().filter(std => std.configKey.partCode !== partCode);
      safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));
      
      const regrindStds = this.getRegrindMasterStandards().filter(std => std.partCode !== partCode);
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));
      
      const stocks = this.getSpareStocks().filter(stk => stk.partCode !== partCode);
      safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));

      const configs = this.getLineConfigs();
      let configsChanged = false;
      configs.forEach(cfg => {
        if (cfg.installedPartQuantities && cfg.installedPartQuantities[partCode] !== undefined) {
          delete cfg.installedPartQuantities[partCode];
          configsChanged = true;
        }
      });
      if (configsChanged) safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));
      
      this.addAuditLog('SYSTEM', `Deleted Part Master: ${part.partCode} (${part.partName}) and related config records`, `ลบข้อมูลชิ้นส่วนหลัก ${part.partName}`);
      this.notify();
    }
  }

  public getLineConfigs(): LineActiveConfiguration[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.LINE_CONFIGS);
      if (!raw) return INITIAL_LINE_CONFIGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LINE_CONFIGS;
    } catch {
      return INITIAL_LINE_CONFIGS;
    }
  }

  public saveLineConfigs(configs: LineActiveConfiguration[]): void {
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    // Synchronize activeConfig and items' installedQty, backupQty, lineStockQty in LINE_MONITORING
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.LINE_MONITORING);
      if (raw) {
        const allMonitoring = JSON.parse(raw);
        if (allMonitoring && typeof allMonitoring === 'object') {
          const standards = this.getLifeStandards();
          const stocks = this.getSpareStocks();
          let changed = false;

          configs.forEach(cfg => {
            const lineId = cfg.lineId;
            if (allMonitoring[lineId]) {
              allMonitoring[lineId].activeConfig = { ...cfg };

              if (allMonitoring[lineId].items && Array.isArray(allMonitoring[lineId].items)) {
                allMonitoring[lineId].items = allMonitoring[lineId].items.map((item: any) => {
                  return calculatePartMetrics(item, cfg, standards, stocks, allMonitoring[lineId].dailyShot || 0);
                });
              }
              changed = true;
            }
          });

          if (changed) {
            safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
          }
        }
      }
    } catch {
      // Ignore parse failure if any
    }

    this.addAuditLog('CONFIGURATION', `Updated ${configs.length} Line Active Configurations & Install Quantities`);
    this.notify();
  }

  public getLifeStandards(): PartLifeStandard[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.LIFE_STANDARDS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(INITIAL_PART_LIFE_STANDARDS));
      return INITIAL_PART_LIFE_STANDARDS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(Boolean).map(std => ({
          ...std,
          regrindStandard: std.regrindStandard || {
            oneTimeRegrindMm: '0.20',
            totalRegrindMm: 3.0,
            maxRegrindCount: 7,
            disposeAfterUse: false
          }
        }));
      }
      return INITIAL_PART_LIFE_STANDARDS;
    } catch {
      return INITIAL_PART_LIFE_STANDARDS;
    }
  }

  public saveLifeStandards(standards: PartLifeStandard[]): void {
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(standards));
    this.addAuditLog('STANDARD_CHANGE', `Bulk updated ${standards.length} Part Life Standards`);
    this.notify();
  }

  public getLinesMonitoring(): Record<ProductionLineId, LineLiveMonitoringData> {
    const defaultLinesMonitoring: Record<ProductionLineId, LineLiveMonitoringData> = {
      'E1': INITIAL_LIVE_DATA_E1,
      'E2': this.generateLineMonitoring('E2', INITIAL_LINE_CONFIGS[1] || INITIAL_LINE_CONFIGS[0], 0),
      'E3-1': this.generateLineMonitoring('E3-1', INITIAL_LINE_CONFIGS[2] || INITIAL_LINE_CONFIGS[0], 0),
      'E3-2': this.generateLineMonitoring('E3-2', INITIAL_LINE_CONFIGS[3] || INITIAL_LINE_CONFIGS[0], 0),
      'E3-3': this.generateLineMonitoring('E3-3', INITIAL_LINE_CONFIGS[4] || INITIAL_LINE_CONFIGS[0], 0),
      'E4': this.generateLineMonitoring('E4', INITIAL_LINE_CONFIGS[5] || INITIAL_LINE_CONFIGS[0], 0),
      'E5': this.generateLineMonitoring('E5', INITIAL_LINE_CONFIGS[6] || INITIAL_LINE_CONFIGS[0], 0)
    };

    const raw = safeStorage.getItem(STORAGE_KEYS.LINE_MONITORING);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(defaultLinesMonitoring));
      return defaultLinesMonitoring;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const lineKeys: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
        let updated = false;
        lineKeys.forEach((lId, idx) => {
          if (!parsed[lId]) {
            parsed[lId] = defaultLinesMonitoring[lId] || this.generateLineMonitoring(lId, INITIAL_LINE_CONFIGS[idx] || INITIAL_LINE_CONFIGS[0], 100000000);
            updated = true;
          }
        });
        if (updated) {
          safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(parsed));
        }
        return parsed;
      }
      return defaultLinesMonitoring;
    } catch {
      return defaultLinesMonitoring;
    }
  }

  public getLineMonitoring(lineId: ProductionLineId): LineLiveMonitoringData | null {
    const all = this.getLinesMonitoring();
    if (!all || !all[lineId]) {
      const configs = this.getLineConfigs();
      const config = configs.find(c => c.lineId === lineId) || INITIAL_LINE_CONFIGS.find(c => c.lineId === lineId) || INITIAL_LINE_CONFIGS[0];
      const defaultData = this.generateLineMonitoring(lineId, config, 100000);
      const safeAll = all && typeof all === 'object' ? all : ({} as Record<ProductionLineId, LineLiveMonitoringData>);
      safeAll[lineId] = defaultData;
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(safeAll));
      return defaultData;
    }
    return all[lineId];
  }

  public getActiveE3FinDie(): 'E3-1' | 'E3-2' | 'E3-3' {
    const stored = safeStorage.getItem(STORAGE_KEYS.ACTIVE_E3_FIN_DIE);
    if (stored === 'E3-1' || stored === 'E3-2' || stored === 'E3-3') {
      return stored;
    }
    return 'E3-2'; // Default active Fin Die for Machine E3 is E3-2 (WL+ 4P)
  }

  public setActiveE3FinDie(dieId: 'E3-1' | 'E3-2' | 'E3-3', operatorName?: string): void {
    const prev = this.getActiveE3FinDie();
    if (prev === dieId) return;

    safeStorage.setItem(STORAGE_KEYS.ACTIVE_E3_FIN_DIE, dieId);

    // Also update line operational statuses in monitoring
    const all = this.getLinesMonitoring();
    const e3Lines: ProductionLineId[] = ['E3-1', 'E3-2', 'E3-3'];
    e3Lines.forEach(eId => {
      if (all[eId]) {
        if (eId === dieId) {
          all[eId].machineStatus = 'RUNNING';
          if (all[eId].activeConfig) {
            all[eId].activeConfig!.status = 'ACTIVE';
            all[eId].activeConfig!.isActive = true;
          }
        } else {
          all[eId].machineStatus = 'IDLE';
          if (all[eId].activeConfig) {
            all[eId].activeConfig!.status = 'INACTIVE';
            all[eId].activeConfig!.isActive = false;
          }
        }
      }
    });
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));

    const user = this.getCurrentUser();
    const by = operatorName || user.name;
    this.addAuditLog(
      'CONFIGURATION',
      `Line E3 switched Active Fin Die from ${prev} to ${dieId} by ${by}. Total machine shots will now accumulate on ${dieId} parts while ${prev} parts shot count stays frozen.`,
      `ไลน์ E3 สลับการใช้งาน Fin Die จาก ${prev} เป็น ${dieId} โดย ${by}`
    );

    this.notify();
  }

  public getSpareStocks(): SpareStockItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.SPARE_STOCKS);
      if (!raw) return INITIAL_SPARE_STOCKS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SPARE_STOCKS;
    } catch {
      return INITIAL_SPARE_STOCKS;
    }
  }

  public getReplacements(): ReplacementRecord[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.REPLACEMENTS);
      if (!raw) return INITIAL_REPLACEMENT_HISTORY;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_REPLACEMENT_HISTORY;
    } catch {
      return INITIAL_REPLACEMENT_HISTORY;
    }
  }

  public getReplacementDrafts(): any[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.REPLACEMENT_DRAFTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveReplacementDraft(draft: any): any {
    const drafts = this.getReplacementDrafts();
    const draftId = draft.id || `DRAFT-REP-${Date.now()}`;
    const draftRecord = {
      ...draft,
      id: draftId,
      updatedAt: new Date().toISOString()
    };
    const existingIdx = drafts.findIndex(d => d.id === draftId);
    if (existingIdx >= 0) {
      drafts[existingIdx] = draftRecord;
    } else {
      drafts.unshift(draftRecord);
    }
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENT_DRAFTS, JSON.stringify(drafts.slice(0, 50)));
    this.notify();
    return draftRecord;
  }

  public deleteReplacementDraft(draftId: string): void {
    const drafts = this.getReplacementDrafts().filter(d => d.id !== draftId);
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENT_DRAFTS, JSON.stringify(drafts));
    this.notify();
  }

  public getRegrindRecords(): RegrindingRecord[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.REGRINDS);
      if (!raw) return INITIAL_REGRIND_RECORDS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_REGRIND_RECORDS;
    } catch {
      return INITIAL_REGRIND_RECORDS;
    }
  }

  public getRegrindMasterStandards(): RegrindMasterStandard[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.REGRIND_STANDARDS);
    if (!raw) return INITIAL_REGRIND_MASTER_STANDARDS;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REGRIND_MASTER_STANDARDS;
    } catch {
      return INITIAL_REGRIND_MASTER_STANDARDS;
    }
  }

  public saveRegrindMasterStandard(standard: RegrindMasterStandard): void {
    const standards = this.getRegrindMasterStandards();
    const idx = standards.findIndex(s => s.partCode === standard.partCode);
    if (idx >= 0) {
      standards[idx] = standard;
    } else {
      standards.push(standard);
    }
    safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(standards));
    this.addAuditLog(
      'STANDARD_CHANGE',
      `Updated Regrind Standard for ${standard.partName} (${standard.partCode}): Grinding ${standard.grindingAmountPerTimeMm}mm/time, Max ${standard.maxRegrindCount} times`,
      `อัปเดตมาตรฐานการเจียระไนสำหรับ ${standard.partName}`
    );
    this.notify();
  }

  public deleteRegrindMasterStandard(partCode: string): void {
    const standards = this.getRegrindMasterStandards().filter(s => s.partCode !== partCode);
    safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(standards));
    this.addAuditLog(
      'STANDARD_CHANGE',
      `Deleted Regrind Standard for ${partCode}`,
      `ลบมาตรฐานการเจียระไนสำหรับ ${partCode}`
    );
    this.notify();
  }

  public deleteRegrindRecord(id: string): void {
    const regrinds = this.getRegrindRecords().filter(r => r.id !== id);
    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify(regrinds));
    this.addAuditLog(
      'REGRIND',
      `Deleted Regrind Record ${id}`,
      `ลบประวัติงานเจียระไน ${id}`
    );
    this.notify();
  }

  public getInspections(): ConditionInspectionRecord[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.INSPECTIONS);
      if (!raw) return INITIAL_INSPECTIONS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_INSPECTIONS;
    } catch {
      return INITIAL_INSPECTIONS;
    }
  }

  public getShotLogs(): ShotEntryRecord[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.SHOT_LOGS);
      if (!raw) return INITIAL_SHOT_LOGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_SHOT_LOGS;
    } catch {
      return INITIAL_SHOT_LOGS;
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (!raw) return INITIAL_AUDIT_LOGS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  public saveLinesMonitoring(lines: Record<ProductionLineId, LineLiveMonitoringData>): void {
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(lines));
    this.notify();
  }

  private safeSaveAuditLogs(logs: AuditLogEntry[]): void {
    const limits = [200, 100, 50, 20, 5];
    for (const limit of limits) {
      try {
        const ok = safeStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, limit)));
        if (ok) return;
      } catch (e) {
        console.warn(`[StorageService] Failed to save audit logs at limit ${limit}, trying smaller limit...`, e);
      }
    }
    // If even 5 logs fail, try saving just 1
    try {
      safeStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 1)));
    } catch (e) {
      console.warn('[StorageService] Soft fallback: Removing audit logs to preserve primary storage functionality.', e);
      try {
        safeStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
      } catch {
        // Safe fallback
      }
    }
  }

  private safeSaveShotLogs(logs: any[]): void {
    const limits = [200, 100, 50, 20, 5];
    for (const limit of limits) {
      try {
        const ok = safeStorage.setItem(STORAGE_KEYS.SHOT_LOGS, JSON.stringify(logs.slice(0, limit)));
        if (ok) return;
      } catch (e) {
        console.warn(`[StorageService] Failed to save shot logs at limit ${limit}, trying smaller limit...`, e);
      }
    }
    // If even 5 logs fail, try saving just 1
    try {
      safeStorage.setItem(STORAGE_KEYS.SHOT_LOGS, JSON.stringify(logs.slice(0, 1)));
    } catch (e) {
      console.warn('[StorageService] Soft fallback: Removing shot logs to preserve primary storage functionality.', e);
      try {
        safeStorage.removeItem(STORAGE_KEYS.SHOT_LOGS);
      } catch {
        // Safe fallback
      }
    }
  }

  public addAuditLog(
    category: AuditLogEntry['actionCategory'],
    details: string,
    detailsTh?: string,
    lineId?: ProductionLineId
  ) {
    try {
      const logs = this.getAuditLogs();
      const user = this.getCurrentUser();
      const nowIso = new Date().toISOString();
      const auditId = `AUD-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(logs.length + 1).padStart(3, '0')}`;
      
      const newEntry: AuditLogEntry = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        auditId,
        module: (category as any) || 'SYSTEM',
        recordId: lineId ? `LINE-${lineId}` : 'SYS-GLOBAL',
        action: category || 'UPDATE',
        fieldChanged: 'generalStatus',
        oldValue: '',
        newValue: '',
        reason: details,
        user: `${user.name} (${user.employeeId || user.role})`,
        userId: user.id,
        userName: user.name,
        role: user.role,
        userRole: user.role,
        dateTime: nowIso,
        timestamp: nowIso.replace('T', ' ').substring(0, 19),
        ipReference: '192.168.10.' + (Math.floor(10 + Math.random() * 80)),
        sessionReference: 'SES-' + user.id.replace('USR-', '10'),
        actionCategory: category,
        details,
        detailsTh,
        lineId
      };
      logs.unshift(newEntry);
      this.safeSaveAuditLogs(logs);
    } catch (err) {
      console.warn('[StorageService] addAuditLog failed gracefully:', err);
    }
  }

  public logStructuredAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'dateTime' | 'user' | 'role'> & {
    userOverride?: { name: string; id: string; role: UserRole; employeeId?: string };
  }) {
    try {
      const logs = this.getAuditLogs();
      const user = entry.userOverride || this.getCurrentUser();
      const nowIso = new Date().toISOString();
      const auditId = entry.auditId || `AUD-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(logs.length + 1).padStart(3, '0')}`;

      const newEntry: AuditLogEntry = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        auditId,
        module: entry.module,
        recordId: entry.recordId,
        action: entry.action,
        fieldChanged: entry.fieldChanged,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        reason: entry.reason,
        user: `${user.name} (${user.employeeId || user.role})`,
        userId: user.id,
        userName: user.name,
        role: user.role,
        userRole: user.role,
        dateTime: nowIso,
        timestamp: nowIso.replace('T', ' ').substring(0, 19),
        approvalRequestId: entry.approvalRequestId,
        ipReference: entry.ipReference || '192.168.10.45',
        sessionReference: entry.sessionReference || `SES-${user.id.replace('USR-', '10')}`,
        details: entry.details || `${entry.action} on ${entry.recordId} (${entry.fieldChanged}: ${entry.oldValue} -> ${entry.newValue})`,
        detailsTh: entry.detailsTh,
        lineId: entry.lineId,
        actionCategory: entry.actionCategory || 'SYSTEM'
      };

      logs.unshift(newEntry);
      this.safeSaveAuditLogs(logs);
      this.notify();
      return newEntry;
    } catch (err) {
      console.warn('[StorageService] logStructuredAudit failed gracefully:', err);
      return {} as any;
    }
  }

  /**
   * Safe Correction Workflow:
   * 1. Never silently overwrite an approved record.
   * 2. Create reversal record and new corrected record.
   * 3. Link correction to original record ID.
   * 4. Require mandatory reason.
   * 5. Preserve audit trail and attachments.
   */
  public submitSafeCorrection(params: {
    module: AuditLogEntry['module'];
    originalRecordId: string;
    actionType: 'REPLACEMENT_CORRECTION' | 'SHOT_CORRECTION' | 'STOCK_CORRECTION' | 'REGRIND_CORRECTION';
    fieldChanged: string;
    oldValue: any;
    newValue: any;
    reason: string;
    correctedData: any;
    isProductionImpacting?: boolean;
    approverName?: string;
  }): { success: boolean; message: string; reversalId?: string; correctionId?: string; error?: string } {
    if (!params.reason || params.reason.trim().length < 5) {
      return { 
        success: false, 
        message: 'A detailed reason (minimum 5 characters) is strictly mandatory for all safe corrections.', 
        error: 'A detailed reason (minimum 5 characters) is strictly mandatory for all safe corrections.' 
      };
    }

    const currentUser = this.getCurrentUser();
    const reversalId = `REV-${params.originalRecordId}-${Date.now().toString().slice(-4)}`;
    const correctionId = `CORR-${params.originalRecordId}-${Date.now().toString().slice(-4)}`;

    // Log the Reversal Audit Entry
    this.logStructuredAudit({
      module: params.module,
      recordId: params.originalRecordId,
      action: 'REVERSAL',
      fieldChanged: params.fieldChanged,
      oldValue: params.oldValue,
      newValue: `REVERSED (Ref: ${reversalId})`,
      reason: `Correction Reversal: ${params.reason}`,
      details: `Reversed original transaction ${params.originalRecordId} due to safe correction: ${params.reason}`,
      detailsTh: `ย้อนกลับรายการเดิม ${params.originalRecordId} เพื่อทำการแก้ไขอย่างปลอดภัย: ${params.reason}`,
      actionCategory: 'REPLACEMENT'
    });

    // Log the New Corrected Record Entry
    this.logStructuredAudit({
      module: params.module,
      recordId: correctionId,
      action: params.actionType,
      fieldChanged: params.fieldChanged,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
      details: `Applied safe correction ${correctionId} linking to original ${params.originalRecordId}. Field: ${params.fieldChanged} (${params.oldValue} -> ${params.newValue})`,
      detailsTh: `บันทึกรายการแก้ไขใหม่ ${correctionId} เชื่อมโยงกับรายการเดิม ${params.originalRecordId}`,
      actionCategory: 'REPLACEMENT'
    });

    this.notify();
    return {
      success: true,
      message: `Safe correction applied successfully. Reversal ref: ${reversalId}, New record ref: ${correctionId}. Original data audit preserved.`,
      reversalId,
      correctionId
    };
  }

  public getShotDrafts(): ShotEntryRecord[] {
    try {
      return JSON.parse(safeStorage.getItem(STORAGE_KEYS.SHOT_DRAFTS) || '[]');
    } catch {
      return [];
    }
  }

  public saveShotDraft(draft: Partial<ShotEntryRecord>): ShotEntryRecord {
    const user = this.getCurrentUser();
    const opName = (draft.operatorName && draft.operatorName.trim()) || user.name || 'System Operator';
    const drafts = this.getShotDrafts();
    const existingIdx = draft.id ? drafts.findIndex(d => d.id === draft.id) : -1;
    
    const draftRecord: ShotEntryRecord = {
      id: draft.id || `DRAFT-SHOT-${Date.now()}`,
      lineId: (draft.lineId as ProductionLineId) || 'E1',
      configurationId: draft.configurationId,
      configurationSlot: draft.configurationSlot,
      dieCode: draft.dieCode,
      productionDate: draft.productionDate || new Date().toISOString().substring(0, 10),
      shift: draft.shift || 'Shift 1 (Day)',
      inputMethod: draft.inputMethod || 'METER_READING',
      entryType: 'MANUAL_SHIFT',
      shotsAdded: Number(draft.shotsAdded) || 0,
      previousTotal: Number(draft.previousTotal) || 0,
      newTotal: Number(draft.newTotal) || 0,
      entryReason: draft.entryReason || 'Daily Shift Production',
      notes: draft.notes || '',
      operatorName: opName,
      operatorId: user.employeeId,
      timestamp: new Date().toISOString(),
      status: 'DRAFT',
      splitPeriods: draft.splitPeriods,
      allowMultiEntry: draft.allowMultiEntry || false
    };

    if (existingIdx >= 0) {
      drafts[existingIdx] = draftRecord;
    } else {
      drafts.unshift(draftRecord);
    }

    safeStorage.setItem(STORAGE_KEYS.SHOT_DRAFTS, JSON.stringify(drafts.slice(0, 50)));
    this.addAuditLog('SHOT_ADJUSTMENT', `Saved Shot Entry draft (${draftRecord.id}) for Line ${draftRecord.lineId}`);
    this.notify();
    return draftRecord;
  }

  public deleteShotDraft(draftId: string): void {
    const drafts = this.getShotDrafts().filter(d => d.id !== draftId);
    safeStorage.setItem(STORAGE_KEYS.SHOT_DRAFTS, JSON.stringify(drafts));
    this.notify();
  }

  public checkDuplicateShotEntry(
    lineId: ProductionLineId,
    productionDate: string,
    shift: string,
    excludeId?: string
  ): boolean {
    const logs = this.getShotLogs();
    return logs.some(log => 
      log.id !== excludeId &&
      log.lineId === lineId &&
      log.status !== 'REVERSED' &&
      log.shift === shift &&
      (log.productionDate === productionDate || log.timestamp.startsWith(productionDate))
    );
  }

  public previewShotSubmission(params: {
    lineId: ProductionLineId;
    shotsAdded: number;
    splitPeriods?: { configId: string; dieCode: string; shotsAdded: number }[];
  }) {
    const all = this.getLinesMonitoring();
    const line = all[params.lineId];
    const settings = this.getSettings();
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();

    if (!line) {
      return {
        line: null,
        affectedParts: [],
        excludedParts: [],
        hasMissingStandard: true,
        hasDataError: true,
        resultingMachineShot: 0,
        abnormalIncreaseWarning: false,
        error: `Production Line ${params.lineId} not found`
      };
    }

    const previousTotal = line.machineShotTotal;
    const resultingMachineShot = previousTotal + params.shotsAdded;
    const abnormalIncreaseWarning = params.shotsAdded > (settings.maxShotsPerShift || 150000);

    let hasMissingStandard = false;
    let hasDataError = false;

    const affectedParts: any[] = [];
    const excludedParts: any[] = [];

    line.items.forEach(item => {
      // Check exclusion conditions
      const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
      const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
      const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
      const isInactive = item.isActive === false;
      const isZeroInstall = (item.installQty || 0) <= 0;

      if (isNotControlled) {
        excludedParts.push({ ...item, reason: 'NOT_CONTROLLED_BY_SHOT (ชิ้นส่วนไม่ได้ควบคุมด้วยยอดช็อต)' });
        return;
      }
      if (isPaused) {
        excludedParts.push({ ...item, reason: 'PAUSED (หยุดใช้งานชั่วคราว)' });
        return;
      }
      if (isRemoved) {
        excludedParts.push({ ...item, reason: 'REMOVED (ถอดออกจากแม่พิมพ์)' });
        return;
      }
      if (isInactive || isZeroInstall) {
        excludedParts.push({ ...item, reason: 'INACTIVE (ไม่ได้ติดตั้งบนสายการผลิต)' });
        return;
      }

      // Calculate part shot addition
      let addedToPart = params.shotsAdded;
      if (params.splitPeriods && params.splitPeriods.length > 0) {
        // If split period configured, check if part belongs to matching config
        const matchedPeriod = params.splitPeriods.find(p => p.dieCode === line.activeConfig?.dieCode || p.configId === line.activeConfig?.id);
        addedToPart = matchedPeriod ? matchedPeriod.shotsAdded : params.shotsAdded;
      }

      const curUsed = item.usedShot !== undefined ? item.usedShot : (item.currentShot || 0);
      const postUsed = curUsed + addedToPart;

      const calculated = calculatePartMetrics(
        {
          ...item,
          currentShot: postUsed,
          usedShot: postUsed
        },
        line.activeConfig,
        standards,
        stocks
      );

      if (calculated.isStandardMissing) hasMissingStandard = true;
      if (calculated.isDataError) hasDataError = true;

      const statusChanged = (calculated.lifeStatus || 'NORMAL') !== (item.lifeStatus || 'NORMAL');

      affectedParts.push({
        ...calculated,
        oldShot: curUsed,
        addedShot: addedToPart,
        newShot: postUsed,
        oldUsage: item.usagePercent || 0,
        newUsage: calculated.usagePercent || 0,
        oldStatus: item.lifeStatus || 'NORMAL',
        newStatus: calculated.lifeStatus || 'NORMAL',
        statusChanged
      });
    });

    return {
      line,
      affectedParts,
      excludedParts,
      hasMissingStandard,
      hasDataError,
      resultingMachineShot,
      abnormalIncreaseWarning,
      error: null
    };
  }

  public submitShotEntry(params: {
    lineId: ProductionLineId;
    productionDate: string;
    shift: 'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)';
    inputMethod: 'METER_READING' | 'DIRECT_INCREMENT';
    previousTotal: number;
    newTotal: number;
    shotsAdded: number;
    entryReason?: string;
    notes?: string;
    operatorName?: string;
    draftId?: string;
    allowMultiEntry?: boolean;
    splitPeriods?: { configId: string; dieCode: string; configurationSlot?: string; shotsAdded: number; timeInterval?: string; reason?: string }[];
  }): { success: boolean; record?: ShotEntryRecord; error?: string } {
    // 1. Validation: Whole numbers & Mandatory Operator
    if (!params.operatorName || !params.operatorName.trim()) {
      return { success: false, error: 'กรุณาระบุชื่อพนักงานผู้บันทึก (Operator Name is strictly required - บังคับลงชื่อพนักงานทุกครั้ง)' };
    }
    if (!Number.isInteger(params.shotsAdded) || !Number.isInteger(params.previousTotal) || !Number.isInteger(params.newTotal)) {
      return { success: false, error: 'Shot counts must be strictly whole numbers (จำนวนช็อตต้องเป็นเลขจำนวนเต็มเท่านั้น)' };
    }
    if (params.shotsAdded <= 0) {
      return { success: false, error: 'Shot Increment must be greater than zero (ยอดช็อตที่เพิ่มต้องมากกว่า 0)' };
    }
    if (params.newTotal < params.previousTotal) {
      return { success: false, error: 'New Machine Reading cannot be lower than Previous Reading (ยอดอ่านใหม่ต้องไม่ต่ำกว่ายอดอ่านเดิม กรุณาใช้ฟังก์ชัน Counter Reset หากมีการรีเซ็ตมิเตอร์)' };
    }

    // 2. Duplicate validation
    if (!params.allowMultiEntry) {
      const isDup = this.checkDuplicateShotEntry(params.lineId, params.productionDate, params.shift);
      if (isDup) {
        return {
          success: false,
          error: `Duplicate Entry Detected: An active shot entry for Line ${params.lineId} on ${params.productionDate} (${params.shift}) already exists. Enable "Allow Multi-Entry" or use "Correct Entry" to adjust.`
        };
      }
    }

    const all = this.getLinesMonitoring();
    const line = all[params.lineId];
    if (!line) {
      return { success: false, error: `Production Line ${params.lineId} not found` };
    }

    // 3. Update Line Telemetry
    const previousMachineShot = line.machineShotTotal;
    line.machineShotTotal = params.newTotal;
    line.shiftShot = (line.shiftShot || 0) + params.shotsAdded;
    line.dailyShot = (line.dailyShot || 0) + params.shotsAdded;
    line.monthlyShot = (line.monthlyShot || 0) + params.shotsAdded;
    line.lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 4. Update Part Wear for Active Shot-Controlled Parts
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();
    let affectedCount = 0;
    let excludedCount = 0;

    line.items = line.items.map(item => {
      const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
      const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
      const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
      const isInactive = item.isActive === false;
      const isZeroInstall = (item.installQty || 0) <= 0;

      if (isNotControlled || isPaused || isRemoved || isInactive || isZeroInstall) {
        excludedCount++;
        return item;
      }

      affectedCount++;
      let partIncrement = params.shotsAdded;
      if (params.splitPeriods && params.splitPeriods.length > 0) {
        const matchedPeriod = params.splitPeriods.find(p => p.dieCode === line.activeConfig?.dieCode || p.configId === line.activeConfig?.id);
        partIncrement = matchedPeriod ? matchedPeriod.shotsAdded : params.shotsAdded;
      }

      const curShot = (item.usedShot !== undefined ? item.usedShot : (item.currentShot || 0)) + partIncrement;
      return calculatePartMetrics(
        {
          ...item,
          currentShot: curShot,
          usedShot: curShot
        },
        line.activeConfig,
        standards,
        stocks
      );
    });

    all[params.lineId] = line;
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));

    // 5. Create Shot Log Record
    const user = this.getCurrentUser();
    const logs = this.getShotLogs();
    const recordId = `SHOT-${Date.now()}`;
    const newRecord: ShotEntryRecord = {
      id: recordId,
      lineId: params.lineId,
      configurationId: line.activeConfig?.id,
      configurationSlot: line.activeConfig?.configurationSlot || 'SLOT-01',
      dieCode: line.activeConfig?.dieCode || 'UNKNOWN',
      productionDate: params.productionDate,
      shift: params.shift,
      inputMethod: params.inputMethod,
      entryType: 'MANUAL_SHIFT',
      shotsAdded: params.shotsAdded,
      previousTotal: params.previousTotal,
      newTotal: params.newTotal,
      entryReason: params.entryReason || 'Daily Shift Production',
      notes: params.notes,
      operatorName: params.operatorName || user.name,
      operatorId: user.employeeId,
      timestamp: new Date().toISOString(),
      status: 'SUBMITTED',
      splitPeriods: params.splitPeriods,
      affectedPartsCount: affectedCount,
      excludedPartsCount: excludedCount,
      allowMultiEntry: params.allowMultiEntry || false
    };

    logs.unshift(newRecord);
    this.safeSaveShotLogs(logs);

    // 6. Delete Draft if applicable
    if (params.draftId) {
      this.deleteShotDraft(params.draftId);
    }

    // 7. Audit Log
    this.addAuditLog(
      'SHOT_ADJUSTMENT',
      `Submitted ${params.shotsAdded.toLocaleString()} shots on Line ${params.lineId} (${params.shift}, ${params.productionDate}) [Total: ${params.newTotal.toLocaleString()}]`,
      `บันทึกยอดช็อตประจำกะ ${params.shotsAdded.toLocaleString()} ครั้ง ในสาย ${params.lineId} (${params.shift})`,
      params.lineId
    );

    this.notify();
    return { success: true, record: newRecord };
  }

  public recordShotIncrement(lineId: ProductionLineId, inc: number, reason: string = 'PLC Driver', operator: string = 'SYSTEM'): void {
    const all = this.getLinesMonitoring();
    const line = all[lineId];
    if (!line) return;

    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();
    const activeE3Die = this.getActiveE3FinDie();
    const isE3Line = lineId === 'E3-1' || lineId === 'E3-2' || lineId === 'E3-3';

    if (isE3Line) {
      const e3Lines: ProductionLineId[] = ['E3-1', 'E3-2', 'E3-3'];
      e3Lines.forEach(eId => {
        const eLine = all[eId];
        if (!eLine) return;

        const prevMachineTotal = eLine.machineShotTotal || 0;
        const newMachineTotal = prevMachineTotal + inc;

        if (eId === activeE3Die) {
          // Active E3 Fin Die: Accumulate shots on parts
          const updatedItems = eLine.items.map(item => {
            const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
            const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
            const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
            const isInactive = item.isActive === false;
            const isZeroInstall = (item.installQty || 0) <= 0;

            if (isNotControlled || isPaused || isRemoved || isInactive || isZeroInstall) {
              return item;
            }

            const curUsed = item.usedShot !== undefined ? item.usedShot : (item.currentShot || 0);
            const newUsed = curUsed + inc;

            return calculatePartMetrics(
              {
                ...item,
                currentShot: newUsed,
                usedShot: newUsed
              },
              eLine.activeConfig,
              standards,
              stocks
            );
          });

          all[eId] = {
            ...eLine,
            machineShotTotal: newMachineTotal,
            shiftShot: (eLine.shiftShot || 0) + inc,
            dailyShot: (eLine.dailyShot || 0) + inc,
            monthlyShot: (eLine.monthlyShot || 0) + inc,
            lastUpdate: new Date().toISOString(),
            items: updatedItems
          };
        } else {
          // Inactive E3 Fin Die: Update Machine Shot Total only, KEEP parts shot count (items) frozen!
          all[eId] = {
            ...eLine,
            machineShotTotal: newMachineTotal,
            lastUpdate: new Date().toISOString()
          };
        }
      });
    } else {
      // Lines E1, E2, E4, E5: Normal single die logic
      const previousTotal = line.machineShotTotal || 0;
      const newTotal = previousTotal + inc;

      const updatedItems = line.items.map(item => {
        const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
        const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
        const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
        const isInactive = item.isActive === false;
        const isZeroInstall = (item.installQty || 0) <= 0;

        if (isNotControlled || isPaused || isRemoved || isInactive || isZeroInstall) {
          return item;
        }

        const curUsed = item.usedShot !== undefined ? item.usedShot : (item.currentShot || 0);
        const newUsed = curUsed + inc;

        return calculatePartMetrics(
          {
            ...item,
            currentShot: newUsed,
            usedShot: newUsed
          },
          line.activeConfig,
          standards,
          stocks
        );
      });

      all[lineId] = {
        ...line,
        machineShotTotal: newTotal,
        shiftShot: (line.shiftShot || 0) + inc,
        dailyShot: (line.dailyShot || 0) + inc,
        monthlyShot: (line.monthlyShot || 0) + inc,
        lastUpdate: new Date().toISOString(),
        items: updatedItems
      };
    }

    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));
    this.notify();
  }

  public executeCounterReset(params: {
    lineId?: ProductionLineId;
    targetLine?: ProductionLineId | 'ALL';
    previousTotal?: number;
    newResetTotal: number;
    approvalId?: string;
    approvedBy?: string;
    resettedBy?: string;
    resetReason: string;
    shift?: 'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)';
    productionDate?: string;
    resetPartWear?: boolean;
    resetShiftCounters?: boolean;
    notes?: string;
  }): { success: boolean; records?: ShotEntryRecord[]; record?: ShotEntryRecord; affectedLines?: ProductionLineId[]; error?: string } {
    if (!params.resetReason || !params.resetReason.trim()) {
      return { success: false, error: 'กรุณาระบุเหตุผลการรีเซ็ต (Reset Reason is required)' };
    }
    if (!Number.isInteger(params.newResetTotal) || params.newResetTotal < 0) {
      return { success: false, error: 'Reset counter base reading must be a non-negative whole number (เลขมิเตอร์ต้องเป็นจำนวนเต็มบวกหรือศูนย์)' };
    }

    const all = this.getLinesMonitoring();
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();
    const user = this.getCurrentUser();
    const logs = this.getShotLogs();

    // Enforce single line reset
    const rawTarget = params.lineId || params.targetLine || 'E1';
    const targetLineId: ProductionLineId = (rawTarget === 'ALL' ? 'E1' : rawTarget) as ProductionLineId;
    const targetLineIds: ProductionLineId[] = [targetLineId];

    const approvalId = params.approvalId && params.approvalId.trim()
      ? params.approvalId.trim()
      : `RST-APPR-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const resettedBy = params.resettedBy && params.resettedBy.trim() ? params.resettedBy.trim() : user.name;
    const approvedBy = params.approvedBy && params.approvedBy.trim() ? params.approvedBy.trim() : resettedBy;

    const createdRecords: ShotEntryRecord[] = [];
    const executionTimestamp = new Date().toISOString();
    const resetDate = params.productionDate || executionTimestamp.substring(0, 10);
    const resetShift = params.shift || 'Shift 1 (Day)';
    const resetParts = params.resetPartWear !== false; // default true
    const resetTallies = params.resetShiftCounters !== false; // default true

    targetLineIds.forEach(lId => {
      const line = all[lId];
      if (!line) return;

      const oldTotal = line.machineShotTotal || 0;
      line.machineShotTotal = params.newResetTotal;
      if (resetTallies) {
        line.shiftShot = 0;
        line.dailyShot = 0;
        line.monthlyShot = 0;
      } else {
        line.shiftShot = 0;
      }
      line.lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (resetParts && line.items) {
        line.items = line.items.map(item => {
          return calculatePartMetrics(
            {
              ...item,
              usedShot: 0,
              currentShot: 0,
              shotAtLastChange: params.newResetTotal,
              lastChangeShot: params.newResetTotal
            },
            line.activeConfig,
            standards,
            stocks
          );
        });
      }

      all[lId] = line;

      const recordId = `SHOT-RST-${lId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const resetRecord: ShotEntryRecord = {
        id: recordId,
        lineId: lId,
        configurationId: line.activeConfig?.id,
        configurationSlot: line.activeConfig?.configurationSlot || 'SLOT-01',
        dieCode: line.activeConfig?.dieCode || `FD-${lId}-07`,
        productionDate: resetDate,
        shift: resetShift,
        inputMethod: 'METER_READING',
        entryType: 'COUNTER_RESET',
        shotsAdded: 0,
        previousTotal: oldTotal,
        newTotal: params.newResetTotal,
        entryReason: `Machine Counter Reset: ${params.resetReason}`,
        notes: params.notes || `Counter & Part wear reset from ${oldTotal.toLocaleString()} -> ${params.newResetTotal.toLocaleString()} shots`,
        operatorName: resettedBy,
        operatorId: user.employeeId,
        timestamp: executionTimestamp,
        status: 'COUNTER_RESET',
        isCounterReset: true,
        resetApprovalId: approvalId,
        resetApprovedBy: approvedBy,
        resetReason: params.resetReason
      };

      createdRecords.push(resetRecord);
      logs.unshift(resetRecord);
    });

    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));
    this.safeSaveShotLogs(logs);

    const linesDesc = `Line ${targetLineId}`;
    this.addAuditLog(
      'SHOT_ADJUSTMENT',
      `EXECUTED SHOT RESET on ${linesDesc}: Base meter -> ${params.newResetTotal.toLocaleString()} shots (Parts reset: ${resetParts ? 'YES' : 'NO'}, Shift tallies reset: ${resetTallies ? 'YES' : 'NO'}) [Approval: ${approvalId} by ${approvedBy}, Resetted by: ${resettedBy}]`,
      `รีเซ็ตยอดช็อตและมิเตอร์ ${linesDesc}: ค่าฐานใหม่ ${params.newResetTotal.toLocaleString()} ช็อต (ผู้ทำรายการ: ${resettedBy}, ผู้อนุมัติ: ${approvedBy}) [เหตุผล: ${params.resetReason}]`,
      targetLineId
    );

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('findie-shot-reset', {
          detail: {
            affectedLines: targetLineIds,
            isAllLines: false,
            newResetTotal: params.newResetTotal,
            resetParts,
            resetTallies,
            timestamp: new Date().toISOString()
          }
        }));
      }
    } catch (_) {}

    this.notify();
    return {
      success: true,
      records: createdRecords,
      record: createdRecords[0],
      affectedLines: targetLineIds
    };
  }

  public resetAllLinesShots(options?: {
    newResetTotal?: number;
    resetPartWear?: boolean;
    resetShiftCounters?: boolean;
    approvalId?: string;
    approvedBy?: string;
    resetReason?: string;
    notes?: string;
  }) {
    const user = this.getCurrentUser();
    return this.executeCounterReset({
      targetLine: 'ALL',
      newResetTotal: options?.newResetTotal ?? 0,
      resetPartWear: options?.resetPartWear ?? true,
      resetShiftCounters: options?.resetShiftCounters ?? true,
      approvalId: options?.approvalId || `RST-ALL-${Date.now().toString().slice(-6)}`,
      approvedBy: options?.approvedBy || user.name || 'System Admin',
      resetReason: options?.resetReason || 'Factory-wide Tooling & Meter Full Calibration (รีเซ็ตยอดช็อตและมิเตอร์ทุกสาย)',
      notes: options?.notes || 'Full synchronized reset across all 8 lines and TV monitors'
    });
  }

  public correctShotEntry(
    originalLogId: string,
    params: {
      correctedShotsAdded: number;
      newTotal: number;
      correctionReason: string;
      shift?: 'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)';
      productionDate?: string;
      notes?: string;
    }
  ): { success: boolean; reversalRecord?: ShotEntryRecord; correctedRecord?: ShotEntryRecord; error?: string } {
    if (!params.correctionReason || params.correctionReason.trim().length === 0) {
      return { success: false, error: 'A mandatory reason is required for manual shot correction' };
    }
    if (!Number.isInteger(params.correctedShotsAdded) || params.correctedShotsAdded <= 0) {
      return { success: false, error: 'Corrected Shot Increment must be a positive whole number' };
    }

    const logs = this.getShotLogs();
    const origIndex = logs.findIndex(l => l.id === originalLogId);
    if (origIndex === -1) {
      return { success: false, error: `Original entry ${originalLogId} not found` };
    }

    const originalRecord = logs[origIndex];
    if (originalRecord.status === 'REVERSED') {
      return { success: false, error: `Entry ${originalLogId} has already been reversed/corrected` };
    }

    const all = this.getLinesMonitoring();
    const line = all[originalRecord.lineId];
    if (!line) {
      return { success: false, error: `Production Line ${originalRecord.lineId} not found` };
    }

    const user = this.getCurrentUser();
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();

    // 1. Create Reversal Record
    const reversalId = `REV-${originalRecord.id}`;
    const reversalRecord: ShotEntryRecord = {
      id: reversalId,
      lineId: originalRecord.lineId,
      configurationId: originalRecord.configurationId,
      dieCode: originalRecord.dieCode,
      productionDate: originalRecord.productionDate || originalRecord.timestamp.substring(0, 10),
      shift: originalRecord.shift,
      entryType: 'CORRECTION',
      shotsAdded: -originalRecord.shotsAdded,
      previousTotal: line.machineShotTotal,
      newTotal: line.machineShotTotal - originalRecord.shotsAdded,
      entryReason: `REVERSAL of ${originalRecord.id}: ${params.correctionReason}`,
      notes: `Reversal of original ${originalRecord.shotsAdded.toLocaleString()} shots`,
      operatorName: user.name,
      operatorId: user.employeeId,
      timestamp: new Date().toISOString(),
      status: 'REVERSED',
      reversalOfId: originalRecord.id,
      correctionReason: params.correctionReason
    };

    // 2. Create Corrected Record
    const correctedId = `CORR-${Date.now()}`;
    const postReversalTotal = line.machineShotTotal - originalRecord.shotsAdded;
    const finalNewTotal = postReversalTotal + params.correctedShotsAdded;

    const correctedRecord: ShotEntryRecord = {
      id: correctedId,
      lineId: originalRecord.lineId,
      configurationId: originalRecord.configurationId,
      dieCode: originalRecord.dieCode,
      productionDate: params.productionDate || originalRecord.productionDate || new Date().toISOString().substring(0, 10),
      shift: params.shift || originalRecord.shift,
      entryType: 'CORRECTION',
      shotsAdded: params.correctedShotsAdded,
      previousTotal: postReversalTotal,
      newTotal: finalNewTotal,
      entryReason: `CORRECTED ENTRY for ${originalRecord.id}: ${params.correctionReason}`,
      notes: params.notes || originalRecord.notes,
      operatorName: user.name,
      operatorId: user.employeeId,
      timestamp: new Date().toISOString(),
      status: 'CORRECTION',
      isCorrection: true,
      correctedFromId: originalRecord.id,
      correctionReason: params.correctionReason
    };

    // 3. Apply Net Delta to Machine & Parts
    const netDelta = params.correctedShotsAdded - originalRecord.shotsAdded;
    line.machineShotTotal += netDelta;
    line.shiftShot = Math.max(0, (line.shiftShot || 0) + netDelta);
    line.dailyShot = Math.max(0, (line.dailyShot || 0) + netDelta);
    line.monthlyShot = Math.max(0, (line.monthlyShot || 0) + netDelta);
    line.lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    line.items = line.items.map(item => {
      const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
      const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
      const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
      const isInactive = item.isActive === false;

      if (isNotControlled || isPaused || isRemoved || isInactive) {
        return item;
      }

      const curShot = Math.max(0, (item.usedShot !== undefined ? item.usedShot : (item.currentShot || 0)) + netDelta);
      return calculatePartMetrics(
        {
          ...item,
          currentShot: curShot,
          usedShot: curShot
        },
        line.activeConfig,
        standards,
        stocks
      );
    });

    all[originalRecord.lineId] = line;
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));

    // 4. Update Original Record Status & Insert Reversal + Corrected Records
    logs[origIndex] = {
      ...originalRecord,
      status: 'REVERSED',
      notes: `${originalRecord.notes || ''} [REVERSED by ${reversalId}: ${params.correctionReason}]`
    };

    logs.unshift(reversalRecord);
    logs.unshift(correctedRecord);
    this.safeSaveShotLogs(logs);

    // 5. Comprehensive Audit Trail
    this.addAuditLog(
      'SHOT_ADJUSTMENT',
      `CORRECTED SHOT ENTRY ${originalRecord.id} on Line ${originalRecord.lineId}: Changed ${originalRecord.shotsAdded.toLocaleString()} -> ${params.correctedShotsAdded.toLocaleString()} shots. Reason: ${params.correctionReason}`,
      `แก้ไขรายการช็อต ${originalRecord.id} สาย ${originalRecord.lineId}: เปลี่ยนจาก ${originalRecord.shotsAdded.toLocaleString()} -> ${params.correctedShotsAdded.toLocaleString()} ช็อต (เหตุผล: ${params.correctionReason})`,
      originalRecord.lineId
    );

    this.notify();
    return { success: true, reversalRecord, correctedRecord };
  }

  public addShotEntry(
    lineId: ProductionLineId,
    shotsAdded: number,
    entryType: 'AUTOMATIC_PLC' | 'MANUAL_SHIFT',
    shift: 'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)',
    notes?: string
  ) {
    const all = this.getLinesMonitoring();
    const line = all[lineId];
    if (!line) return;

    // Enforce condition: Connected shots apply only if line is RUNNING
    if (entryType === 'AUTOMATIC_PLC' && line.machineStatus !== 'RUNNING') {
      return;
    }

    const previousTotal = line.machineShotTotal;
    const newTotal = previousTotal + shotsAdded;

    line.machineShotTotal = newTotal;
    line.shiftShot += shotsAdded;
    line.dailyShot += shotsAdded;
    line.monthlyShot += shotsAdded;
    line.lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Increment usedShot for all active tooling items on this line
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();

    line.items = line.items.map(item => {
      const isNotControlled = item.controlType === 'NOT_CONTROLLED_BY_SHOT' || (item as any).isNotControlledByShot;
      const isPaused = item.isPaused === true || item.installationStatus === 'PAUSED';
      const isRemoved = item.isRemoved === true || item.installationStatus === 'REMOVED';
      const isInactive = item.isActive === false;

      if (isNotControlled || isPaused || isRemoved || isInactive) {
        return item;
      }

      const curShot = (item.usedShot !== undefined ? item.usedShot : item.currentShot) + shotsAdded;
      return calculatePartMetrics(
        {
          ...item,
          currentShot: curShot,
          usedShot: curShot
        },
        line.activeConfig,
        standards,
        stocks
      );
    });

    all[lineId] = line;
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));

    // Add Shot log
    const user = this.getCurrentUser();
    const logs = this.getShotLogs();
    const newShotLog: ShotEntryRecord = {
      id: `SHOT-${Date.now()}`,
      lineId,
      entryType,
      shotsAdded,
      previousTotal,
      newTotal,
      shift,
      status: 'SUBMITTED',
      operatorName: user.name,
      operatorId: user.employeeId,
      notes,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newShotLog);
    this.safeSaveShotLogs(logs);

    this.addAuditLog(
      'SHOT_ADJUSTMENT',
      `Recorded ${shotsAdded.toLocaleString()} shots on Line ${lineId} (${entryType})`,
      `บันทึกยอดช็อต ${shotsAdded.toLocaleString()} ครั้ง ในสายการผลิต ${lineId}`,
      lineId
    );

    this.notify();
  }

  public previewReplacement(record: Partial<ReplacementRecord>) {
    const all = this.getLinesMonitoring();
    const lineId = record.lineId || 'E1';
    const line = all[lineId];
    const stocks = this.getSpareStocks();
    const standards = this.getLifeStandards();
    const regrindStandards = this.getRegrindMasterStandards();

    if (!line) {
      return {
        valid: false,
        error: `Production line ${lineId} not found`
      };
    }

    const item = line.items.find(i => i.partCode === record.partCode || (record.stageName && i.stagePunchDie === record.stageName));
    const stockItem = stocks.find(s => s.partCode === record.partCode);
    const regrindStd = regrindStandards.find(r => r.partCode === record.partCode);
    const machineShot = record.machineShotAtReplacement !== undefined ? Number(record.machineShotAtReplacement) : line.machineShotTotal;
    const installedQty = record.installedQuantity !== undefined ? Number(record.installedQuantity) : (item ? item.installQty : 1);
    const changedQty = record.changedQuantity !== undefined ? Number(record.changedQuantity) : installedQty;
    const isFullSet = record.fullSetOrPartial === 'FULL_SET' || record.replacementType === 'FULL SET REPLACEMENT';
    const isPartial = record.fullSetOrPartial === 'PARTIAL' || record.replacementType === 'PARTIAL REPLACEMENT';

    const warnings: string[] = [];
    const errors: string[] = [];

    // Validation Rule 5: Partial replacements require position numbers
    if (isPartial && (!record.position || record.position.trim() === '' || record.position.toUpperCase() === 'ALL')) {
      errors.push('Rule 5 Violation: Partial replacements require specific position numbers / station IDs.');
    }

    // Validation Rule 8 & 9: Full set quantity verification
    if (isFullSet && changedQty !== installedQty && (!record.quantityMismatchReason || record.quantityMismatchReason.trim() === '')) {
      errors.push(`Rule 8/9 Violation: Full set replacement changed quantity (${changedQty}) does not match installed quantity (${installedQty}). A mismatch reason & supervisor override is required.`);
    }

    // Validation Rule 10: Block scrapped parts
    if (record.newPartLotNumber && (record.newPartLotNumber.toUpperCase().includes('SCRAP') || record.newPartLotNumber.toUpperCase().includes('REJECT'))) {
      errors.push('Rule 10 Violation: Blocked attempt to install a part marked as SCRAP / REJECT.');
    }

    // Validation Rule 11: Prevent installation of parts exceeding max regrind count
    if (record.replacementType === 'RE-GROUND PART' && regrindStd) {
      const removedRegrind = record.removedPartRegrindCount || (item ? item.regrindCount : 0);
      if (removedRegrind >= regrindStd.maxRegrindCount) {
        warnings.push(`Rule 11 Notice: Part regrind count (${removedRegrind + 1}) will reach or exceed max allowed cycles (${regrindStd.maxRegrindCount}).`);
      }
    }

    // Stock check
    if (stockItem && stockItem.currentStockQty < changedQty) {
      warnings.push(`Inventory Warning: Requested change quantity (${changedQty}) exceeds available warehouse backup stock (${stockItem.currentStockQty} EA).`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      before: {
        machineShotTotal: line.machineShotTotal,
        partUsedShot: item ? (item.usedShot !== undefined ? item.usedShot : item.currentShot) : (record.removedPartUsedShot || 0),
        partRegrindCount: item ? item.regrindCount : (record.removedPartRegrindCount || 0),
        partUsagePercent: item ? item.usagePercent : 0,
        partAlertStatus: item ? item.alertStatus : 'NORMAL',
        warehouseStockQty: stockItem ? stockItem.currentStockQty : 0,
        lastChangeShot: item ? item.lastChangeShot : 0
      },
      after: {
        machineShotTotal: line.machineShotTotal,
        partUsedShot: 0, // Reset to 0 only through approved replacement
        partRegrindCount: record.replacementType === 'RE-GROUND PART' 
          ? ((item ? item.regrindCount : (record.removedPartRegrindCount || 0)) + 1)
          : 0,
        partUsagePercent: 0,
        partAlertStatus: 'NORMAL',
        warehouseStockQty: stockItem ? Math.max(0, stockItem.currentStockQty - changedQty) : 0,
        lastChangeShot: machineShot,
        preservedRemovedShot: item ? (item.usedShot !== undefined ? item.usedShot : item.currentShot) : (record.removedPartUsedShot || 0)
      }
    };
  }

  public recordReplacement(record: Partial<ReplacementRecord> & { draftId?: string }): { success: boolean; record?: ReplacementRecord; error?: string } {
    const user = this.getCurrentUser();
    const replacements = this.getReplacements();
    const all = this.getLinesMonitoring();
    const lineId: ProductionLineId = record.lineId || 'E1';
    const line = all[lineId];

    if (!line) {
      return { success: false, error: `Production line ${lineId} not found` };
    }

    const item = line.items.find(i => 
      i.partCode === record.partCode || 
      (record.stageName && isPartMatchingInteractiveStage(i, record.partCode || '', record.stageName))
    );
    const installedQty = record.installedQuantity !== undefined ? Number(record.installedQuantity) : (item ? item.installQty : 1);
    const changedQty = record.changedQuantity !== undefined ? Number(record.changedQuantity) : installedQty;
    const isFullSet = record.fullSetOrPartial === 'FULL_SET' || record.replacementType === 'FULL SET REPLACEMENT';
    const isPartial = record.fullSetOrPartial === 'PARTIAL' || record.replacementType === 'PARTIAL REPLACEMENT';

    // Rule 1 & 2: Life is started/reset ONLY through approved replacement transaction
    // Rule 5: Partial replacements require position numbers
    if (isPartial && (!record.position || record.position.trim() === '' || record.position.toUpperCase() === 'ALL')) {
      return { success: false, error: 'Rule 5 Error: Partial replacements require specific position numbers / station IDs.' };
    }

    // Rule 8 & 9: Full set quantity mismatch verification
    if (isFullSet && changedQty !== installedQty && (!record.quantityMismatchReason || record.quantityMismatchReason.trim() === '')) {
      return { success: false, error: `Rule 8/9 Error: Full set replacement changed quantity (${changedQty}) does not match installed quantity (${installedQty}). Reason and approval override required.` };
    }

    // Rule 10: Block scrapped parts
    if (record.newPartLotNumber && (record.newPartLotNumber.toUpperCase().includes('SCRAP') || record.newPartLotNumber.toUpperCase().includes('REJECT'))) {
      return { success: false, error: 'Rule 10 Error: Cannot install a part lot marked as SCRAP / REJECT.' };
    }

    const newId = `REP-${new Date().getFullYear()}-${String(replacements.length + 1).padStart(4, '0')}`;
    const machineShot = record.machineShotAtReplacement !== undefined ? Number(record.machineShotAtReplacement) : line.machineShotTotal;
    const removedShot = record.removedPartUsedShot !== undefined ? Number(record.removedPartUsedShot) : (item ? (item.usedShot !== undefined ? item.usedShot : item.currentShot) : 0);
    const removedRegrind = record.removedPartRegrindCount !== undefined ? Number(record.removedPartRegrindCount) : (item ? item.regrindCount : 0);

    const initialStatus = (record.approvalStatus as any) || (user.role === 'OPERATOR' ? 'SUBMITTED' : 'APPROVED');
    const isApprovedOrCompleted = initialStatus === 'APPROVED' || initialStatus === 'COMPLETED';

    const newRecord: ReplacementRecord = {
      id: newId,
      lineId: lineId,
      configurationId: record.configurationId || line.activeConfig?.id,
      configurationSlot: record.configurationSlot || line.activeConfig?.configurationSlot || 'Slot 1',
      dieCode: record.dieCode || line.activeConfig?.dieCode || 'UNKNOWN',
      partCode: record.partCode || (item ? item.partCode : 'UNKNOWN'),
      partName: record.partName || (item ? item.partName : 'Tooling Part'),
      stageName: record.stageName || (item ? item.stagePunchDie : record.partName || 'Tooling Stage'),
      position: record.position || 'ALL',
      replacementType: record.replacementType || 'NEW PART',
      fullSetOrPartial: isPartial ? 'PARTIAL' : 'FULL_SET',
      installedQuantity: installedQty,
      changedQuantity: changedQty,
      machineShotAtReplacement: machineShot,
      removedPartUsedShot: removedShot, // Rule 3: Preserve removed part's final actual shot
      removedPartRegrindCount: removedRegrind,
      newPartLotNumber: record.newPartLotNumber || `LOT-${new Date().getFullYear()}-NP01`,
      newPartSerialNumber: record.newPartSerialNumber || '',
      replacementDateTime: record.replacementDateTime || new Date().toISOString().replace('T', ' ').substring(0, 19),
      replacementReason: record.replacementReason || record.reason || 'Normal Preventive Life Limit Reached',
      workOrderNumber: record.workOrderNumber || `WO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      changedBy: record.changedBy || user.name,
      changedById: record.changedById || user.employeeId,
      verifiedBy: record.verifiedBy || (user.role !== 'OPERATOR' ? user.name : 'Supervisor'),
      verifiedById: record.verifiedById || (user.role !== 'OPERATOR' ? user.employeeId : 'EMP-SUP'),
      evidenceAttachment: record.evidenceAttachment,
      note: record.note || record.remarks,
      approvalStatus: initialStatus,
      quantityMismatchReason: record.quantityMismatchReason,
      quantityMismatchApprovedBy: record.quantityMismatchApprovedBy,
      positionDetails: record.positionDetails,
      stockUpdated: isApprovedOrCompleted,
      timestamp: new Date().toISOString(),

      // Aliases for compatibility
      replacedQty: changedQty,
      installQtyTotal: installedQty,
      shotAtChange: machineShot,
      shotAtReplacement: machineShot,
      partAccumulatedShots: removedShot,
      lifeLimitShots: item ? item.lifeLimit : 100000000,
      reason: record.replacementReason || record.reason || 'Normal Preventive Life Limit Reached',
      technicianName: record.changedBy || user.name,
      technicianId: record.changedById || user.employeeId,
      approverName: isApprovedOrCompleted ? (record.verifiedBy || user.name) : undefined,
      approverId: isApprovedOrCompleted ? (record.verifiedById || user.employeeId) : undefined,
      replacementDate: record.replacementDateTime || new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    replacements.unshift(newRecord);
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(replacements));

    // Delete draft if one was used
    if (record.draftId) {
      this.deleteReplacementDraft(record.draftId);
    }

    // Apply Live tooling & Stock updates if Approved/Completed
    if (isApprovedOrCompleted) {
      this.applyReplacementToMonitoringAndStock(newRecord);
    }

    // Rule 13: Create an AuditLog entry
    this.addAuditLog(
      'REPLACEMENT',
      `Registered ${newRecord.replacementType} for ${newRecord.partName} (${newRecord.changedQuantity}/${newRecord.installedQuantity} EA, Position: ${newRecord.position}) on Line ${newRecord.lineId}. Status: ${newRecord.approvalStatus}. Machine Shot: ${machineShot.toLocaleString()}, Removed Part Shot: ${removedShot.toLocaleString()}`,
      `บันทึกรายการเปลี่ยนอะไหล่ ${newRecord.partName} (${newRecord.changedQuantity} ชิ้น) สาย ${newRecord.lineId} สถานะ ${newRecord.approvalStatus}`,
      newRecord.lineId
    );

    this.notify();
    return { success: true, record: newRecord };
  }

  public approveReplacement(recordId: string, approverName: string, approverId: string): { success: boolean; error?: string } {
    const replacements = this.getReplacements();
    const idx = replacements.findIndex(r => r.id === recordId);
    if (idx === -1) return { success: false, error: `Replacement record ${recordId} not found` };

    const record = replacements[idx];
    if (record.approvalStatus === 'APPROVED' || record.approvalStatus === 'COMPLETED') {
      return { success: false, error: `Replacement record ${recordId} is already approved/completed` };
    }

    record.approvalStatus = 'COMPLETED';
    record.verifiedBy = approverName;
    record.verifiedById = approverId;
    record.approverName = approverName;
    record.approverId = approverId;
    record.completedAt = new Date().toISOString();
    record.stockUpdated = true;

    replacements[idx] = record;
    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(replacements));

    // Apply tooling reset and stock deduction upon approval
    this.applyReplacementToMonitoringAndStock(record);

    this.addAuditLog(
      'REPLACEMENT',
      `APPROVED Replacement ${record.id} for ${record.partName} on Line ${record.lineId} by ${approverName} (${approverId})`,
      `อนุมัติการเปลี่ยนอะไหล่ ${record.id} สำหรับ ${record.partName} สาย ${record.lineId} โดย ${approverName}`,
      record.lineId
    );

    this.notify();
    return { success: true };
  }

  public rejectReplacement(recordId: string, reason: string): { success: boolean; error?: string } {
    const replacements = this.getReplacements();
    const idx = replacements.findIndex(r => r.id === recordId);
    if (idx === -1) return { success: false, error: `Replacement record ${recordId} not found` };

    replacements[idx].approvalStatus = 'REJECTED';
    replacements[idx].note = `${replacements[idx].note || ''} [REJECTED: ${reason}]`;

    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(replacements));
    this.addAuditLog(
      'REPLACEMENT',
      `REJECTED Replacement ${recordId}: ${reason}`,
      `ปฏิเสธรายการเปลี่ยนอะไหล่ ${recordId}: ${reason}`,
      replacements[idx].lineId
    );

    this.notify();
    return { success: true };
  }

  public cancelReplacement(recordId: string, reason: string): { success: boolean; error?: string } {
    const replacements = this.getReplacements();
    const idx = replacements.findIndex(r => r.id === recordId);
    if (idx === -1) return { success: false, error: `Replacement record ${recordId} not found` };

    replacements[idx].approvalStatus = 'CANCELLED';
    replacements[idx].note = `${replacements[idx].note || ''} [CANCELLED: ${reason}]`;

    safeStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(replacements));
    this.addAuditLog(
      'REPLACEMENT',
      `CANCELLED Replacement ${recordId}: ${reason}`,
      `ยกเลิกรายการเปลี่ยนอะไหล่ ${recordId}: ${reason}`,
      replacements[idx].lineId
    );

    this.notify();
    return { success: true };
  }

  private applyReplacementToMonitoringAndStock(record: ReplacementRecord) {
    const all = this.getLinesMonitoring();
    const line = all[record.lineId];
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();

    if (line) {
      line.items = line.items.map(item => {
        if (
          item.partCode === record.partCode || 
          (record.stageName && isPartMatchingInteractiveStage(item, record.partCode || '', record.stageName))
        ) {
          // Rule 2 & 6 & 7: Start life from 0 on replacement, update last change shot to machine shot at replacement
          const nextRegrindCount = record.replacementType === 'RE-GROUND PART' ? (item.regrindCount + 1) : 0;
          return calculatePartMetrics(
            {
              slotId: item.slotId,
              partCode: item.partCode,
              partName: item.partName,
              stagePunchDie: item.stagePunchDie,
              position: item.position,
              installQty: item.installQty,
              backupQty: item.backupQty,
              currentShot: 0,
              usedShot: 0,
              lastChangeShot: record.machineShotAtReplacement || line.machineShotTotal,
              shotAtLastChange: record.machineShotAtReplacement || line.machineShotTotal,
              regrindCount: nextRegrindCount,
              totalMmGround: item.totalMmGround || 0
            },
            line.activeConfig,
            standards,
            stocks
          );
        }
        return item;
      });
      all[record.lineId] = line;
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));
    }

    // Rule 12: Update warehouse spare stock only after approval / completion
    const stockItem = stocks.find(s => s.partCode === record.partCode);
    if (stockItem) {
      stockItem.currentStockQty = Math.max(0, stockItem.currentStockQty - (record.changedQuantity || record.replacedQty || 1));
      safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));
    }
  }

  public previewRegrind(record: Partial<RegrindingRecord>) {
    const regrindStandards = this.getRegrindMasterStandards();
    const std = regrindStandards.find(r => r.partCode === record.partCode);

    const prevLength = record.previousLength !== undefined ? Number(record.previousLength) : (std ? std.nominalLengthMm : 50.0);
    const mmRemoved = record.actualGrindingRemovedMm !== undefined ? Number(record.actualGrindingRemovedMm) : (std ? std.grindingAmountPerTimeMm : 0.25);
    const curLength = record.currentLength !== undefined ? Number(record.currentLength) : Math.max(0, prevLength - mmRemoved);
    const regrindBefore = record.regrindCountBefore !== undefined ? Number(record.regrindCountBefore) : 0;
    const regrindAfter = regrindBefore + 1;
    const maxCycles = std ? std.maxRegrindCount : 4;
    const minLength = std ? std.minAllowedLengthMm : 48.0;
    const remainingCount = Math.max(0, maxCycles - regrindAfter);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1 & 2: Block regrinding if not allowed or if dispose after one use
    if (std && !std.regrindAllowed) {
      errors.push(`Rule 1 Error: Part ${std.partName} (${std.partCode}) is NOT allowed to be re-ground.`);
    }
    if (std && std.disposeAfterOneUse) {
      errors.push(`Rule 2 Error: Part ${std.partName} is single-use only (DISPOSE AFTER 1 USE). Regrinding is blocked.`);
    }

    // Rule 3: Max regrind check
    if (regrindAfter > maxCycles) {
      warnings.push(`Rule 3 Warning: Maximum regrind cycles (${maxCycles}) exceeded. Part will transition to MAXIMUM REGRIND / SCRAP.`);
    }

    // Rule 4: Dimensional minimum check
    if (curLength < minLength) {
      warnings.push(`Rule 4 Warning: Current length (${curLength.toFixed(2)} mm) is below minimum allowable limit (${minLength.toFixed(2)} mm). Part is out-of-spec.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      standard: std,
      calculated: {
        previousLength: prevLength,
        currentLength: curLength,
        actualGrindingRemovedMm: mmRemoved,
        regrindCountBefore: regrindBefore,
        regrindCountAfter: regrindAfter,
        remainingRegrindCount: remainingCount,
        minAllowedLengthMm: minLength,
        maxAllowedCycles: maxCycles
      }
    };
  }

  public recordRegrind(record: Partial<RegrindingRecord>): { success: boolean; record?: RegrindingRecord; error?: string } {
    const regrindStandards = this.getRegrindMasterStandards();
    const std = regrindStandards.find(r => r.partCode === record.partCode);
    const user = this.getCurrentUser();

    // Rule 1 & 2: Block if not allowed or single use
    if (std && !std.regrindAllowed) {
      return { success: false, error: `Rule 1 Error: Regrinding is not permitted for ${std.partName} (${std.partCode}).` };
    }
    if (std && std.disposeAfterOneUse) {
      return { success: false, error: `Rule 2 Error: ${std.partName} must be disposed after one use. Regrinding blocked.` };
    }

    const regrinds = this.getRegrindRecords();
    const newId = `RGD-${new Date().getFullYear()}-${String(regrinds.length + 1).padStart(4, '0')}`;
    const prevLength = record.previousLength !== undefined ? Number(record.previousLength) : (std ? std.nominalLengthMm : 50.0);
    const mmRemoved = record.actualGrindingRemovedMm !== undefined ? Number(record.actualGrindingRemovedMm) : (std ? std.grindingAmountPerTimeMm : 0.25);
    const curLength = record.currentLength !== undefined ? Number(record.currentLength) : Math.max(0, prevLength - mmRemoved);
    const regrindBefore = record.regrindCountBefore !== undefined ? Number(record.regrindCountBefore) : 0;
    const regrindAfter = regrindBefore + 1;
    const maxCycles = std ? std.maxRegrindCount : (record.maxAllowedCycles || 4);
    const minLength = std ? std.minAllowedLengthMm : (prevLength - (std ? std.totalGrindingAllowanceMm : 1.0));
    const remainingCount = Math.max(0, maxCycles - regrindAfter);

    const isInspectionPassed = record.inspectionResult === 'PASSED' || record.isInspectionApproved;
    let computedStatus: RegrindPartStatus = record.status || 'WAITING REGRIND';

    if (curLength < minLength) {
      computedStatus = 'SCRAP';
    } else if (regrindAfter >= maxCycles) {
      computedStatus = 'MAXIMUM REGRIND';
    } else if (isInspectionPassed) {
      computedStatus = 'READY TO USE';
    } else {
      computedStatus = 'HOLD';
    }

    const newRecord: RegrindingRecord = {
      id: newId,
      jobCode: record.jobCode || `JOB-RGD-${new Date().getFullYear()}-${String(regrinds.length + 1).padStart(3, '0')}`,
      partInstanceOrLot: record.partInstanceOrLot || record.serialNumber || `SN-${record.partCode || 'TOOL'}-${Date.now().toString().slice(-4)}`,
      partCode: record.partCode || (std ? std.partCode : 'P-TOOL-001'),
      partName: record.partName || (std ? std.partName : 'Tooling Element'),
      serialNumber: record.partInstanceOrLot || record.serialNumber,
      lineId: (record.lineId as ProductionLineId) || (record.lineLastUsed as ProductionLineId) || 'E1',
      lineLastUsed: (record.lineLastUsed as ProductionLineId) || (record.lineId as ProductionLineId) || 'E1',
      dieCode: record.dieCode || record.finDie || 'FD-E1-07',
      finDie: record.finDie || record.dieCode || 'FD-E1-07',
      previousLength: prevLength,
      currentLength: curLength,
      actualGrindingRemovedMm: mmRemoved,
      regrindCountBefore: regrindBefore,
      regrindCountAfter: regrindAfter,
      remainingRegrindCount: remainingCount,
      inspectionResult: record.inspectionResult || 'PENDING',
      regrindDate: record.regrindDate || new Date().toISOString().substring(0, 10),
      supplierOrInternalProcess: record.supplierOrInternalProcess || 'INTERNAL_TOOL_ROOM',
      vendorName: record.vendorName || (record.supplierOrInternalProcess === 'EXTERNAL_VENDOR' ? 'External Tooling Specialist' : 'Internal Die Tool Room'),
      workOrder: record.workOrder || `WO-RGD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      cost: record.cost !== undefined ? Number(record.cost) : 3500,
      performedBy: record.performedBy || user.name,
      verifiedBy: record.verifiedBy || (isInspectionPassed ? user.name : 'Pending Inspector'),
      evidence: record.evidence,
      note: record.note || record.remarks,
      status: computedStatus,
      isInspectionApproved: isInspectionPassed,
      inspectionApprovedBy: isInspectionPassed ? (record.verifiedBy || user.name) : undefined,
      inspectionApprovedAt: isInspectionPassed ? new Date().toISOString() : undefined,

      // Measurement aliases
      sentDate: record.sentDate || record.regrindDate || new Date().toISOString().substring(0, 10),
      returnedDate: record.returnedDate || record.regrindDate || new Date().toISOString().substring(0, 10),
      grinderVendor: record.vendorName || (record.supplierOrInternalProcess === 'EXTERNAL_VENDOR' ? 'External Tooling Specialist' : 'INTERNAL DIE SHOP'),
      mmRemovedThisCycle: mmRemoved,
      totalAccumulatedMmRemoved: ((std ? std.nominalLengthMm : 50.0) - curLength),
      regrindCycleCount: regrindAfter,
      maxAllowedMm: std ? std.totalGrindingAllowanceMm : 1.0,
      maxAllowedCycles: maxCycles,
      inspectionStatus: record.inspectionResult === 'PASSED' ? 'PASSED' : (record.inspectionResult === 'FAILED' ? 'FAILED_SCRAPPED' : 'PENDING'),
      surfaceRoughnessRa: record.measuredRa || (std ? 0.12 : 0.15),
      hardnessHrc: 63,
      inspectorName: isInspectionPassed ? (record.verifiedBy || user.name) : 'Pending Inspector',
      technicianName: record.performedBy || user.name,
      completionDate: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    // Rule 6 & 7: Preserve every regrind transaction in historical record (never overwrite)
    regrinds.unshift(newRecord);
    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify(regrinds));

    // Auto-update master standard current values
    if (std) {
      std.currentRegrindCount = regrindAfter;
      std.currentLengthMm = curLength;
      if (computedStatus === 'SCRAP') {
        std.isScrapped = true;
      }
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStandards));
    }

    this.addAuditLog(
      'REGRIND',
      `Logged re-grinding job ${newRecord.jobCode} for ${newRecord.partName} (${newRecord.partInstanceOrLot}): Length ${prevLength.toFixed(2)} -> ${curLength.toFixed(2)} mm (-${mmRemoved.toFixed(2)} mm). Cycle ${regrindAfter}/${maxCycles}. Status: ${newRecord.status}`,
      `บันทึกงานเจียระไน ${newRecord.jobCode} สำหรับ ${newRecord.partName} (${newRecord.partInstanceOrLot}) สถานะ ${newRecord.status}`,
      newRecord.lineId
    );

    this.notify();
    return { success: true, record: newRecord };
  }

  public approveRegrindInspection(
    regrindId: string, 
    inspectorName: string, 
    result: 'PASSED' | 'FAILED' | 'CONDITIONAL',
    notes?: string
  ): { success: boolean; error?: string } {
    const regrinds = this.getRegrindRecords();
    const idx = regrinds.findIndex(r => r.id === regrindId);
    if (idx === -1) return { success: false, error: `Regrinding record ${regrindId} not found` };

    const regrind = regrinds[idx];
    regrind.inspectionResult = result;
    regrind.inspectionStatus = result === 'PASSED' ? 'PASSED' : (result === 'FAILED' ? 'FAILED_SCRAPPED' : 'PENDING');
    regrind.isInspectionApproved = result === 'PASSED';
    regrind.inspectionApprovedBy = inspectorName;
    regrind.inspectionApprovedAt = new Date().toISOString();
    regrind.verifiedBy = inspectorName;
    regrind.inspectorName = inspectorName;
    if (notes) regrind.note = `${regrind.note || ''} [INSPECTION: ${notes}]`;

    // Status transition: Rule 5
    if (result === 'PASSED') {
      if ((regrind.currentLength || 0) < 45.0 && regrind.partCode === 'P-BUCK-001') {
        regrind.status = 'SCRAP';
      } else if ((regrind.regrindCountAfter || regrind.regrindCycleCount) >= (regrind.maxAllowedCycles || 4)) {
        regrind.status = 'MAXIMUM REGRIND';
      } else {
        regrind.status = 'READY TO USE';
      }
    } else if (result === 'FAILED') {
      regrind.status = 'SCRAP';
    } else {
      regrind.status = 'HOLD';
    }

    regrinds[idx] = regrind;
    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify(regrinds));

    this.addAuditLog(
      'REGRIND',
      `Inspection ${result} for Regrind Job ${regrind.jobCode} (${regrind.partName}) by ${inspectorName}. New status: ${regrind.status}`,
      `ผลตรวจการเจียระไน ${result} สำหรับงาน ${regrind.jobCode} (${regrind.partName}) โดย ${inspectorName}`,
      regrind.lineId
    );

    this.notify();
    return { success: true };
  }

  public updateRegrindStatus(regrindId: string, status: RegrindPartStatus, reason?: string): { success: boolean; error?: string } {
    const regrinds = this.getRegrindRecords();
    const idx = regrinds.findIndex(r => r.id === regrindId);
    if (idx === -1) return { success: false, error: `Regrind record ${regrindId} not found` };

    const oldStatus = regrinds[idx].status;
    regrinds[idx].status = status;
    if (reason) regrinds[idx].note = `${regrinds[idx].note || ''} [STATUS CHANGE ${oldStatus} -> ${status}: ${reason}]`;

    safeStorage.setItem(STORAGE_KEYS.REGRINDS, JSON.stringify(regrinds));

    this.addAuditLog(
      'REGRIND',
      `Updated Regrind Job ${regrinds[idx].jobCode} status from ${oldStatus} to ${status}${reason ? ` (Reason: ${reason})` : ''}`,
      `เปลี่ยนสถานะงานเจียระไน ${regrinds[idx].jobCode} จาก ${oldStatus} เป็น ${status}`,
      regrinds[idx].lineId
    );

    this.notify();
    return { success: true };
  }

  public addInspection(record: Omit<ConditionInspectionRecord, 'id'>) {
    const inspections = this.getInspections();
    const newId = `INSP-${Date.now()}`;
    const newRecord: ConditionInspectionRecord = {
      ...record,
      id: newId
    };
    inspections.unshift(newRecord);
    safeStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(inspections));

    this.addAuditLog(
      'SYSTEM',
      `Logged condition inspection on Line ${record.lineId}: Burr ${record.burrHeightMm}mm, Wear Rating ${record.visualWearRating}/5`,
      `บันทึกผลการตรวจสอบสภาพแม่พิมพ์ สาย ${record.lineId}`,
      record.lineId
    );

    this.notify();
  }

  public saveLifeStandard(standard: PartLifeStandard) {
    const standards = this.getLifeStandards();
    const idx = standards.findIndex(s => s.id === standard.id || s.compositeKeyString === standard.compositeKeyString);
    if (idx >= 0) {
      standards[idx] = { ...standard, updatedAt: new Date().toISOString() };
    } else {
      standards.push({
        ...standard,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(standards));

    this.addAuditLog(
      'STANDARD_CHANGE',
      `Updated Life Standard for ${standard.partName} (${standard.lifeLimitShots.toLocaleString()} shots). Key: ${standard.compositeKeyString}`,
      `อัปเดตเกณฑ์อายุการใช้งานสำหรับ ${standard.partName}`,
      standard.configKey.lineId === 'ALL' ? undefined : (standard.configKey.lineId as ProductionLineId)
    );

    this.notify();
  }

  public deleteLifeStandard(standardId: string): void {
    const standards = this.getLifeStandards();
    const target = standards.find(s => s.id === standardId);
    const filtered = standards.filter(s => s.id !== standardId);
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(filtered));
    if (target) {
      this.addAuditLog(
        'STANDARD_CHANGE',
        `Deleted Life Standard for ${target.partName} (${target.configKey?.partCode || target.id})`,
        `ลบเกณฑ์อายุการใช้งาน ${target.partName}`,
        target.configKey?.lineId === 'ALL' ? undefined : (target.configKey?.lineId as ProductionLineId)
      );
    }
    this.notify();
  }

  public saveLineConfig(config: LineActiveConfiguration) {
    const configs = this.getLineConfigs();
    const idx = configs.findIndex(c => c.id === config.id);
    if (idx >= 0) {
      configs[idx] = {
        ...config,
        status: config.status || (config.isActive ? 'ACTIVE' : 'DRAFT')
      };
    } else {
      configs.push({
        ...config,
        status: config.status || (config.isActive ? 'ACTIVE' : 'DRAFT')
      });
    }
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    // If active, update active config in live monitoring
    if (config.isActive) {
      const all = this.getLinesMonitoring();
      if (all[config.lineId]) {
        all[config.lineId].activeConfig = config;
        safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));
      }
    }

    this.addAuditLog(
      'CONFIGURATION',
      `Saved tooling configuration ${config.id} (${config.revision || 'Rev 1.0'}) for Line ${config.lineId}: Status ${config.status || 'DRAFT'}, Die ${config.dieCode}, Material ${config.material}`,
      `บันทึกข้อมูลโครงสร้างแม่พิมพ์ ${config.id} สำหรับสายการผลิต ${config.lineId}`,
      config.lineId
    );

    this.notify();
  }

  public updateLineMachineStatus(
    lineId: ProductionLineId,
    newStatus: MachineStatus,
    reason?: string,
    category?: DowntimeCategory
  ): { success: boolean; message: string } {
    const all = this.getLinesMonitoring();
    let line = all[lineId];
    if (!line) {
      line = this.getLineMonitoring(lineId); // Auto-initialize default data
    }

    const previousStatus = line.machineStatus || 'RUNNING';
    if (previousStatus === newStatus) {
      return { success: true, message: `Line ${lineId} is already in ${newStatus} state.` };
    }

    const user = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    // 1. Update line machine status in live monitoring
    line.machineStatus = newStatus;
    line.lastUpdate = nowIso.replace('T', ' ').substring(0, 19);
    all[lineId] = line;
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(all));

    // 2. Keep active configuration in sync
    const configs = this.getLineConfigs();
    const configIdx = configs.findIndex(c => c.lineId === lineId);
    if (configIdx >= 0) {
      configs[configIdx].isActive = true;
      configs[configIdx].status = newStatus === 'RUNNING' ? 'ACTIVE' : 'INACTIVE';
      safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));
    }

    const logs = this.getDowntimeLogs();

    // 3. If changing to MAINTENANCE or STOPPED (DOWN), create active downtime entry
    if (newStatus === 'MAINTENANCE' || newStatus === 'STOPPED') {
      const isMaint = newStatus === 'MAINTENANCE';
      const defaultCat: DowntimeCategory = isMaint ? 'SCHEDULED_MAINTENANCE' : 'UNPLANNED_DOWN';
      const defaultReason = isMaint 
        ? (reason || 'Scheduled Die Tooling Inspection / Preventive Maintenance') 
        : (reason || 'Emergency Line Stop / Mechanical Unplanned Breakdown');

      const newDt: DowntimeLogEntry = {
        id: `DT-${lineId}-${Date.now().toString().slice(-6)}`,
        lineId,
        startTime: nowIso,
        durationMinutes: 0,
        category: category || defaultCat,
        reason: defaultReason,
        reasonTh: isMaint ? 'บำรุงรักษาแม่พิมพ์/ซ่อมบำรุงตามรอบ' : 'หยุดสายการผลิตฉุกเฉิน/เครื่องจักรขัดข้อง',
        operatorOrTech: `${user.name} (${user.role})`,
        isResolved: false,
        notes: `Switched status from ${previousStatus} to ${newStatus}`
      };
      logs.unshift(newDt);
      safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(logs));
    }

    // 4. If switching back to RUNNING or IDLE, auto-resolve any open ongoing downtime for this line
    if (newStatus === 'RUNNING' || newStatus === 'IDLE') {
      let resolvedCount = 0;
      logs.forEach(l => {
        if (l.lineId === lineId && !l.isResolved) {
          const startMs = new Date(l.startTime).getTime();
          const endMs = new Date(nowIso).getTime();
          l.endTime = nowIso;
          l.durationMinutes = Math.max(1, Math.round((endMs - startMs) / (60 * 1000)));
          l.isResolved = true;
          resolvedCount++;
        }
      });
      if (resolvedCount > 0) {
        safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(logs));
      }
    }

    // 5. Structured Audit Trail
    this.logStructuredAudit({
      module: 'SYSTEM',
      recordId: `LINE-${lineId}`,
      action: 'STATUS_CHANGE',
      fieldChanged: 'machineStatus',
      oldValue: previousStatus,
      newValue: newStatus,
      reason: reason || `Line machine status manually updated to ${newStatus}`,
      details: `Machine status for Line ${lineId} updated from ${previousStatus} to ${newStatus}. (Operator: ${user.name})`,
      detailsTh: `เปลี่ยนสถานะเครื่องจักรสาย ${lineId} จาก ${previousStatus} เป็น ${newStatus} (โดย: ${user.name})`,
      lineId,
      actionCategory: 'CONFIGURATION'
    });

    this.notify();
    return {
      success: true,
      message: `Line ${lineId} status updated to ${newStatus}`
    };
  }

  /**
   * Activates a configuration following strict production workflow:
   * 1. Closes previous active configuration installation period at current machine shot.
   * 2. Preserves accumulated part shots for parts physically remaining installed.
   * 3. Pauses accumulation for removed parts.
   * 4. Does NOT reset part shots unless a replacement record is created.
   * 5. Requires reason and approver credentials.
   */
  
  public updateInstallQuantities(updates: Array<{ lineId: string, partCode: string, installQty: number }>): void {
    const configs = this.getLineConfigs();
    let configsChanged = false;

    configs.forEach(config => {
      updates.forEach(u => {
        if (config.lineId === u.lineId) {
          if (!config.installedPartQuantities) {
            config.installedPartQuantities = {};
          }
          config.installedPartQuantities[u.partCode] = u.installQty;
          configsChanged = true;
        }
      });
    });

    if (configsChanged) {
      safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));
    }

    const allMonitoring = this.getLinesMonitoring();
    let monitoringChanged = false;

    Object.keys(allMonitoring).forEach(lId => {
      const lineData = allMonitoring[lId as import('../types').ProductionLineId];
      if (lineData && lineData.activeConfig) {
        updates.forEach(u => {
          if (lineData.lineId === u.lineId) {
            if (!lineData.activeConfig!.installedPartQuantities) {
              lineData.activeConfig!.installedPartQuantities = {};
            }
            lineData.activeConfig!.installedPartQuantities[u.partCode] = u.installQty;
            monitoringChanged = true;
            
            if (lineData.items) {
               lineData.items.forEach(p => {
                 if (p.partCode === u.partCode) {
                    p.installQty = u.installQty;
                 }
               });
            }
          }
        });
      }
    });

    if (monitoringChanged) {
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
    }

    this.notify();
  }

  public activateLineConfig(
    configId: string, 
    reason: string, 
    approverName: string,
    effectiveDateTime?: string
  ): { success: boolean; message: string } {
    const configs = this.getLineConfigs();
    const targetConfigIdx = configs.findIndex(c => c.id === configId);
    if (targetConfigIdx === -1) {
      return { success: false, message: `Configuration ${configId} not found.` };
    }

    const targetConfig = configs[targetConfigIdx];
    const lineId = targetConfig.lineId;
    const nowIso = effectiveDateTime || new Date().toISOString();

    const allMonitoring = this.getLinesMonitoring();
    const lineData = allMonitoring[lineId];
    const currentMachineShot = lineData ? lineData.machineShotTotal : 0;

    // 1. Deactivate any previously active configs for this line without deleting them
    configs.forEach((cfg, idx) => {
      if (cfg.lineId === lineId && cfg.id !== configId && cfg.isActive) {
        configs[idx] = {
          ...cfg,
          isActive: false,
          status: 'INACTIVE',
          effectiveTo: nowIso,
          notes: cfg.notes ? `${cfg.notes} (Superseded at shot ${currentMachineShot.toLocaleString()})` : `Superseded by ${configId}`
        };
      }
    });

    // 2. Mark the target configuration as ACTIVE
    const activatedConfig: LineActiveConfiguration = {
      ...targetConfig,
      isActive: true,
      status: 'ACTIVE',
      effectiveFrom: nowIso,
      effectiveTo: undefined,
      reasonForChange: reason,
      approvedBy: approverName,
      approvedAt: nowIso
    };
    configs[targetConfigIdx] = activatedConfig;
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    // 3. Update line live monitoring items:
    // Continue accumulated shots for parts physically remaining installed
    if (lineData) {
      const standards = this.getLifeStandards();
      const stocks = this.getSpareStocks();
      const partMasters = this.getPartMasters();
      const existingItemsMap = new Map(lineData.items.map(item => [item.partCode, item]));

      const newTrackingItems: PartLiveTrackingItem[] = [];
      let slotIndex = 1;

      // For every part configured with install quantity > 0
      const configuredPartCodes = Object.keys(activatedConfig.installedPartQuantities || {});
      
      // If configuredPartCodes is empty, fallback to existing items or standards
      const partCodesToTrack = configuredPartCodes.length > 0
        ? configuredPartCodes.filter(code => (activatedConfig.installedPartQuantities[code] || 0) > 0)
        : lineData.items.map(i => i.partCode);

      partCodesToTrack.forEach(partCode => {
        const qty = activatedConfig.installedPartQuantities?.[partCode] || 1;
        const master = partMasters.find(p => p.partCode === partCode);
        const existing = existingItemsMap.get(partCode);

        // Retain existing accumulated shots if physically remained installed!
        const currentShot = existing ? (existing.usedShot ?? existing.currentShot ?? 0) : 0;
        const lastChangeShot = existing ? (existing.shotAtLastChange ?? existing.lastChangeShot ?? currentMachineShot) : currentMachineShot;
        const regrindCount = existing ? existing.regrindCount : 0;
        const totalMmGround = existing ? existing.totalMmGround : 0;
        const position = existing ? existing.position : 'ALL';

        const updatedItem = calculatePartMetrics(
          {
            slotId: existing ? existing.slotId : `SLOT-${lineId}-${slotIndex++}`,
            partCode,
            partName: master ? master.partName : (existing ? existing.partName : partCode),
            stagePunchDie: master ? master.stageName : (existing ? existing.stagePunchDie : 'Main Tooling'),
            position,
            installQty: qty,
            backupQty: existing ? existing.backupQty : (stocks.find(s => s.partCode === partCode)?.currentStockQty || 0),
            usedShot: currentShot,
            currentShot: currentShot,
            shotAtLastChange: lastChangeShot,
            lastChangeShot: lastChangeShot,
            regrindCount,
            totalMmGround
          },
          activatedConfig,
          standards,
          stocks
        );

        newTrackingItems.push(updatedItem);
      });

      lineData.activeConfig = activatedConfig;
      lineData.items = newTrackingItems;
      lineData.lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 19);
      allMonitoring[lineId] = lineData;
      safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
    }

    this.addAuditLog(
      'CONFIGURATION',
      `Activated configuration ${activatedConfig.id} (${activatedConfig.revision || 'Rev 1.0'}) on Line ${lineId}. Reason: ${reason}. Approved by: ${approverName}. Machine shot: ${currentMachineShot.toLocaleString()}`,
      `เปิดใช้งานคอนฟิกกูเรชัน ${activatedConfig.id} สำหรับสายการผลิต ${lineId} เหตุผล: ${reason}`,
      lineId
    );

    this.notify();
    return { success: true, message: `Configuration ${activatedConfig.id} activated successfully on Line ${lineId}.` };
  }

  public deactivateLineConfig(configId: string, reason: string): { success: boolean; message: string } {
    const configs = this.getLineConfigs();
    const idx = configs.findIndex(c => c.id === configId);
    if (idx === -1) return { success: false, message: 'Configuration not found.' };

    const cfg = configs[idx];
    configs[idx] = {
      ...cfg,
      isActive: false,
      status: 'INACTIVE',
      effectiveTo: new Date().toISOString(),
      notes: reason ? `${cfg.notes || ''} [Deactivated: ${reason}]` : cfg.notes
    };
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    this.addAuditLog(
      'CONFIGURATION',
      `Deactivated configuration ${cfg.id} on Line ${cfg.lineId}. Reason: ${reason || 'Manual deactivation'}`,
      `ปิดการใช้งานคอนฟิก ${cfg.id} สาย ${cfg.lineId}`,
      cfg.lineId
    );

    this.notify();
    return { success: true, message: `Configuration ${cfg.id} deactivated.` };
  }

  /**
   * Configures which parts are installed on a specific line and their installed quantities (target 12-20 items per line).
   * Immediately updates line monitoring data and notifies subscribers.
   */
  public saveLineInstalledParts(
    lineId: ProductionLineId,
    installedParts: Array<{ partCode: string; installQty: number; displaySeq?: number }>
  ): { success: boolean; message: string; itemCount: number } {
    const configs = this.getLineConfigs();
    let configIdx = configs.findIndex(c => c.lineId === lineId && c.isActive);
    if (configIdx === -1) {
      configIdx = configs.findIndex(c => c.lineId === lineId);
    }

    const installedQtyMap: Record<string, number> = {};
    installedParts.forEach(item => {
      if (item.partCode && item.installQty > 0) {
        installedQtyMap[item.partCode] = item.installQty;
      }
    });

    let currentConfig: LineActiveConfiguration;
    if (configIdx >= 0) {
      currentConfig = {
        ...configs[configIdx],
        installedPartQuantities: installedQtyMap
      };
      configs[configIdx] = currentConfig;
    } else {
      currentConfig = {
        id: `CFG-${lineId}-CUSTOM`,
        lineId,
        lineName: `Fin Press Line ${lineId}`,
        dieCode: `FD-${lineId}-07`,
        dieName: `Fin Die ${lineId}`,
        tubeSize: lineId.includes('5') || lineId === 'E2' || lineId === 'E4' || lineId === 'E5' ? 'Ø5' : 'Ø7',
        finType: 'Slit (half)',
        material: 'PCM',
        thicknessMm: 0.10,
        effectiveFrom: new Date().toISOString(),
        isActive: true,
        status: 'ACTIVE',
        installedPartQuantities: installedQtyMap
      };
      configs.push(currentConfig);
    }
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    // Update line monitoring live items
    const allMonitoring = this.getLinesMonitoring();
    const lineData = allMonitoring[lineId] || {
      lineId,
      lineName: lineId,
      machineStatus: 'RUNNING',
      machineShotTotal: 120000000,
      shiftShot: 210000,
      dailyShot: 4200000,
      monthlyShot: 45000000,
      shotSignal: 'NORMAL',
      lastUpdate: new Date().toISOString().substring(0, 19),
      activeConfig: currentConfig,
      items: []
    };

    const partMasters = this.getPartMasters();
    const standards = this.getLifeStandards();
    const stocks = this.getSpareStocks();
    const existingItemsMap = new Map((lineData.items || []).map(item => [item.partCode, item]));

    const newTrackingItems: PartLiveTrackingItem[] = [];

    installedParts.forEach((item, idx) => {
      if (!item.partCode || item.installQty <= 0) return;

      const partCode = item.partCode;
      const qty = item.installQty;
      const master = partMasters.find(p => p.partCode === partCode);
      const existing = existingItemsMap.get(partCode);

      const currentShot = existing ? (existing.usedShot ?? existing.currentShot ?? 0) : Math.round(Math.random() * 20000000);
      const lastChangeShot = existing ? (existing.shotAtLastChange ?? existing.lastChangeShot ?? lineData.machineShotTotal) : Math.max(0, lineData.machineShotTotal - currentShot);
      const regrindCount = existing ? existing.regrindCount : 0;
      const totalMmGround = existing ? existing.totalMmGround : 0;

      const updatedItem = calculatePartMetrics(
        {
          slotId: `SLOT-${lineId}-${String(item.displaySeq || idx + 1).padStart(2, '0')}`,
          partCode,
          partName: master ? master.partName : (existing ? existing.partName : partCode),
          stagePunchDie: master ? master.stageName : (existing ? existing.stagePunchDie : 'Fin Die Part'),
          position: existing ? existing.position : `Position #${idx + 1}`,
          installQty: qty,
          backupQty: existing ? existing.backupQty : (stocks.find(s => s.partCode === partCode)?.currentStockQty || 168),
          usedShot: currentShot,
          currentShot: currentShot,
          shotAtLastChange: lastChangeShot,
          lastChangeShot: lastChangeShot,
          regrindCount,
          totalMmGround
        },
        currentConfig,
        standards,
        stocks
      );

      newTrackingItems.push(updatedItem);
    });

    lineData.activeConfig = currentConfig;
    lineData.items = newTrackingItems;
    lineData.lastUpdate = new Date().toISOString().substring(0, 19);
    allMonitoring[lineId] = lineData;
    safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));

    this.addAuditLog(
      'CONFIGURATION',
      `Configured ${newTrackingItems.length} installed parts for Line ${lineId} (Target 12-20 items per line)`,
      `ตั้งค่าการติดตั้งชิ้นส่วน ${newTrackingItems.length} รายการ สำหรับไลน์ ${lineId}`,
      lineId
    );

    this.notify();
    return {
      success: true,
      message: `บันทึกรายการชิ้นส่วนติดตั้ง ${newTrackingItems.length} รายการ สำหรับไลน์ ${lineId} สำเร็จ`,
      itemCount: newTrackingItems.length
    };
  }

  public cloneLineConfig(configId: string, customSlotName?: string): LineActiveConfiguration | null {
    const configs = this.getLineConfigs();
    const source = configs.find(c => c.id === configId);
    if (!source) return null;

    const user = this.getCurrentUser();
    const newId = `CFG-${source.lineId}-${Date.now().toString().slice(-4)}-CLONE`;
    const newConfig: LineActiveConfiguration = {
      ...source,
      id: newId,
      configurationSlot: customSlotName || `CLONE of ${source.configurationSlot || source.id}`,
      status: 'DRAFT',
      isActive: false,
      revision: `${source.revision || 'Rev 1.0'}-CLONE`,
      versionNumber: (source.versionNumber || 1) + 1,
      reasonForChange: `Cloned from ${source.id} (${source.revision || 'Rev 1.0'})`,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      effectiveFrom: new Date().toISOString().substring(0, 16),
      effectiveTo: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      installedPartQuantities: { ...source.installedPartQuantities }
    };

    configs.push(newConfig);
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    this.addAuditLog(
      'CONFIGURATION',
      `Cloned configuration ${source.id} into new DRAFT ${newId} on Line ${source.lineId}`,
      `คัดลอกคอนฟิก ${source.id} เป็นฉบับร่างใหม่ ${newId}`,
      source.lineId
    );

    this.notify();
    return newConfig;
  }

  public createLineConfigRevision(configId: string, reason?: string): LineActiveConfiguration | null {
    const configs = this.getLineConfigs();
    const source = configs.find(c => c.id === configId);
    if (!source) return null;

    const user = this.getCurrentUser();
    const nextVer = (source.versionNumber || 1) + 1;
    const newId = `CFG-${source.lineId}-REV${nextVer}-${Date.now().toString().slice(-3)}`;
    const newConfig: LineActiveConfiguration = {
      ...source,
      id: newId,
      configurationSlot: `${source.configurationSlot || 'Production Slot'} (Rev ${nextVer}.0)`,
      status: 'DRAFT',
      isActive: false,
      revision: `Rev ${nextVer}.0`,
      versionNumber: nextVer,
      reasonForChange: reason || `Engineering revision upgraded from ${source.revision || 'Rev 1.0'}`,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      effectiveFrom: new Date().toISOString().substring(0, 16),
      effectiveTo: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      installedPartQuantities: { ...source.installedPartQuantities }
    };

    configs.push(newConfig);
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    this.addAuditLog(
      'CONFIGURATION',
      `Created new Revision ${newConfig.revision} (${newId}) from ${source.id} for Line ${source.lineId}`,
      `สร้าง Revision ใหม่ ${newConfig.revision} สำหรับสาย ${source.lineId}`,
      source.lineId
    );

    this.notify();
    return newConfig;
  }

  public submitConfigForApproval(configId: string): boolean {
    const configs = this.getLineConfigs();
    const idx = configs.findIndex(c => c.id === configId);
    if (idx === -1) return false;

    configs[idx].status = 'PENDING APPROVAL';
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));

    this.addAuditLog(
      'CONFIGURATION',
      `Submitted configuration ${configId} for approval`,
      `ส่งคอนฟิก ${configId} เพื่อรออนุมัติ`,
      configs[idx].lineId
    );

    this.notify();
    return true;
  }

  public deleteLineConfig(configId: string): { success: boolean; message: string } {
    const configs = this.getLineConfigs();
    const target = configs.find(c => c.id === configId);
    if (!target) return { success: false, message: 'Configuration not found.' };

    if (target.isActive) {
      return { success: false, message: 'Cannot delete an active configuration. Deactivate or switch active configuration first.' };
    }

    const filtered = configs.filter(c => c.id !== configId);
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(filtered));

    this.addAuditLog(
      'CONFIGURATION',
      `Deleted configuration ${configId} from Line ${target.lineId}`,
      `ลบคอนฟิก ${configId} สาย ${target.lineId}`,
      target.lineId
    );

    this.notify();
    return { success: true, message: `Configuration ${configId} removed.` };
  }

  public saveSpareStock(stock: Partial<SpareStockItem> & { id?: string; partCode: string; partName: string }): SpareStockItem {
    const stocks = this.getSpareStocks();
    const existingIdx = stocks.findIndex(s => (stock.id && s.id === stock.id) || s.partCode === stock.partCode);
    const existing = existingIdx >= 0 ? stocks[existingIdx] : null;

    const onHand = stock.onHandQuantity !== undefined ? Number(stock.onHandQuantity) : (existing?.onHandQuantity ?? (stock.currentStockQty ?? 0));
    const reserved = stock.reservedQuantity !== undefined ? Number(stock.reservedQuantity) : (existing?.reservedQuantity ?? 0);
    const quarantine = stock.quarantineQuantity !== undefined ? Number(stock.quarantineQuantity) : (existing?.quarantineQuantity ?? 0);
    const available = Math.max(0, onHand - reserved - quarantine);
    
    const requiredPerFull = stock.requiredQuantityPerFullReplacement !== undefined 
      ? Number(stock.requiredQuantityPerFullReplacement) 
      : (existing?.requiredQuantityPerFullReplacement ?? 1);
    
    const coverage = requiredPerFull > 0 ? Number((available / requiredPerFull).toFixed(2)) : 0;
    
    const minStock = stock.minimumStock !== undefined ? Number(stock.minimumStock) : (existing?.minimumStock ?? (stock.safetyStockMin ?? 10));
    const maxStock = stock.maximumStock !== undefined ? Number(stock.maximumStock) : (existing?.maximumStock ?? (stock.backupTargetQty ?? 50));

    let stockStatus: StockStatus = 'AVAILABLE';
    if (available === 0) stockStatus = 'NO_STOCK';
    else if (available < requiredPerFull) stockStatus = 'LOW_STOCK';
    else if (available <= minStock) stockStatus = 'MINIMUM';
    else stockStatus = 'AVAILABLE';

    // Delivery risk calculation
    const forecastDate = stock.forecastReplacementDate || existing?.forecastReplacementDate;
    const expectedDate = stock.expectedDeliveryDate || existing?.expectedDeliveryDate || stock.poEtaDate;
    let deliveryRiskDays = 0;
    let hasDeliveryRisk = false;

    if (forecastDate && expectedDate) {
      const fTime = new Date(forecastDate).getTime();
      const eTime = new Date(expectedDate).getTime();
      if (!isNaN(fTime) && !isNaN(eTime)) {
        const days = Math.ceil((eTime - fTime) / (1000 * 60 * 60 * 24));
        if (days > 0) {
          deliveryRiskDays = days;
          hasDeliveryRisk = true;
        }
      }
    }

    // Combined risk calculation
    let combinedRisk: CombinedRiskLevel = 'NORMAL';
    if (hasDeliveryRisk) {
      combinedRisk = 'DELIVERY RISK';
    } else if (available === 0) {
      combinedRisk = 'STOP RISK';
    } else if (available < requiredPerFull) {
      combinedRisk = 'CRITICAL SUPPLY';
    } else if (available <= minStock) {
      combinedRisk = 'WARNING';
    } else {
      combinedRisk = 'NORMAL';
    }

    const item: SpareStockItem = {
      id: stock.id || existing?.id || `STK-${Date.now()}`,
      partCode: stock.partCode,
      partName: stock.partName,
      specification: stock.specification || existing?.specification || `${stock.partName} specification standard`,
      warehouseLocation: stock.warehouseLocation || existing?.warehouseLocation || (stock.storageLocation || 'RACK-A-01'),
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      quarantineQuantity: quarantine,
      availableQuantity: available,
      minimumStock: minStock,
      maximumStock: maxStock,
      requiredQuantityPerFullReplacement: requiredPerFull,
      replacementCoverage: coverage,
      stockStatus: stock.stockStatus || stockStatus,
      purchaseRequirementStatus: stock.purchaseRequirementStatus || existing?.purchaseRequirementStatus || (stock.procurementStatus ? `STATUS: ${stock.procurementStatus}` : 'NOT REQUIRED'),
      prNumber: stock.prNumber !== undefined ? stock.prNumber : existing?.prNumber,
      prDate: stock.prDate !== undefined ? stock.prDate : existing?.prDate,
      prApprovalStatus: stock.prApprovalStatus !== undefined ? stock.prApprovalStatus : (existing?.prApprovalStatus || 'N/A'),
      poNumber: stock.poNumber !== undefined ? stock.poNumber : existing?.poNumber,
      poDate: stock.poDate !== undefined ? stock.poDate : existing?.poDate,
      supplier: stock.supplier || existing?.supplier || stock.supplierName || 'MISUMI THAILAND',
      orderedQuantity: stock.orderedQuantity !== undefined ? Number(stock.orderedQuantity) : (existing?.orderedQuantity ?? (stock.onOrderQty ?? 0)),
      confirmedQuantity: stock.confirmedQuantity !== undefined ? Number(stock.confirmedQuantity) : (existing?.confirmedQuantity ?? 0),
      expectedDeliveryDate: expectedDate,
      actualDeliveryDate: stock.actualDeliveryDate !== undefined ? stock.actualDeliveryDate : existing?.actualDeliveryDate,
      procurementStatus: (stock.procurementStatus as ProcurementStatus) || existing?.procurementStatus || 'NOT REQUIRED',
      buyer: stock.buyer || existing?.buyer || 'Thanaporn Srisuk (PUR-01)',
      note: stock.note || existing?.note,
      forecastReplacementDate: forecastDate,
      deliveryRiskDays,
      hasDeliveryRisk,
      combinedRisk,
      stageName: stock.stageName || existing?.stageName,
      tubeSize: stock.tubeSize || existing?.tubeSize || 'Ø7',
      unitCostThb: stock.unitCostThb || existing?.unitCostThb || stock.unitPriceThb || 12000,
      unitPriceThb: stock.unitPriceThb || existing?.unitPriceThb || 12000,
      currentStockQty: available,
      backupTargetQty: maxStock,
      safetyStockMin: minStock,
      safetyStockQty: minStock,
      onOrderQty: stock.orderedQuantity !== undefined ? Number(stock.orderedQuantity) : (existing?.orderedQuantity ?? 0),
      orderStatus: (stock.orderStatus as OrderStatus) || (stock.procurementStatus as any) || 'NOT REQUIRED',
      supplierName: stock.supplier || existing?.supplier || stock.supplierName,
      leadTimeDays: stock.leadTimeDays || existing?.leadTimeDays || 30,
      poEtaDate: expectedDate,
      storageLocation: stock.warehouseLocation || existing?.warehouseLocation || stock.storageLocation || 'RACK-A-01',
      isImportedSeed: existing?.isImportedSeed
    };

    if (existingIdx >= 0) {
      stocks[existingIdx] = item;
    } else {
      stocks.push(item);
    }
    safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));

    this.logStructuredAudit({
      module: 'SPARE_STOCK',
      recordId: item.id,
      action: existingIdx >= 0 ? 'STOCK_ADJUSTMENT' : 'CREATE',
      fieldChanged: 'onHandQuantity/procurementStatus',
      oldValue: existing ? `${existing.onHandQuantity} EA (Avail: ${existing.availableQuantity}, Status: ${existing.procurementStatus})` : 'NEW',
      newValue: `${item.onHandQuantity} EA (Avail: ${item.availableQuantity}, Coverage: ${item.replacementCoverage}x, Status: ${item.procurementStatus})`,
      reason: stock.note || `Spare Stock & Procurement record update for ${item.partCode}`,
      details: `Saved stock and procurement details for ${item.partCode} (${item.partName}): OnHand=${item.onHandQuantity}, Avail=${item.availableQuantity}, Coverage=${item.replacementCoverage}x, Status=${item.procurementStatus}`,
      detailsTh: `บันทึกข้อมูลสต็อกและการจัดซื้อสำหรับ ${item.partCode} (${item.partName})`,
      actionCategory: 'STOCK'
    });

    this.notify();
    return item;
  }

  public saveSpareStocksList(stocks: SpareStockItem[]): void {
    safeStorage.setItem(STORAGE_KEYS.SPARE_STOCKS, JSON.stringify(stocks));

    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.LINE_MONITORING);
      if (raw) {
        const allMonitoring = JSON.parse(raw);
        if (allMonitoring && typeof allMonitoring === 'object') {
          const standards = this.getLifeStandards();
          const lineConfigs = this.getLineConfigs();
          let changed = false;

          (Object.keys(allMonitoring) as ProductionLineId[]).forEach(lineId => {
            const lineData = allMonitoring[lineId];
            const lineCfg = lineConfigs.find(c => c.lineId === lineId) || lineData.activeConfig;
            if (lineData && lineData.items && Array.isArray(lineData.items)) {
              lineData.items = lineData.items.map((item: any) => {
                return calculatePartMetrics(item, lineCfg, standards, stocks, lineData.dailyShot || 0);
              });
              changed = true;
            }
          });

          if (changed) {
            safeStorage.setItem(STORAGE_KEYS.LINE_MONITORING, JSON.stringify(allMonitoring));
          }
        }
      }
    } catch {
      // Ignore parse failure if any
    }

    this.notify();
  }

  // ==========================================
  // POSITION LOCK (ล็อคตำแหน่ง) MANAGEMENT
  // ==========================================

  public getPositionLocks(lineId?: ProductionLineId): PositionLockRecord[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.POSITION_LOCKS);
    let locks: PositionLockRecord[] = [];
    try {
      locks = raw ? JSON.parse(raw) : [];
    } catch {
      locks = [];
    }
    
    if (locks.length === 0) {
      locks = this.initializeDefaultPositionLocks();
      safeStorage.setItem(STORAGE_KEYS.POSITION_LOCKS, JSON.stringify(locks));
    }

    if (lineId) {
      return locks.filter(l => l.lineId === lineId);
    }
    return locks;
  }


  private initializeDefaultPositionLocks(): PositionLockRecord[] {
    const lines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    const result: PositionLockRecord[] = [];

    lines.forEach(lineId => {
      let dieCode = `FD-${lineId}-07`;
      if (lineId === 'E2' || lineId === 'E4' || lineId === 'E5') {
        dieCode = `FD-${lineId}-05`;
      }
      const moldType = getMoldTypeForLine(lineId);
      const stages = getStagesForMoldType(moldType);

      stages.forEach(stg => {
        for (let i = 1; i <= stg.positions; i++) {
          const posStr = i < 10 ? `0${i}` : `${i}`;
          
          let lockType: PositionLockStatus = 'UNLOCKED';
          let lockReason = '';
          let lockedBy = '';
          let lockedAt = '';
          let notes = '';
          let isSampleLocked = false;

          // Sample locks for testing on Line E1
          if (lineId === 'E1' && stg.stageCode.includes('PRC') && (i === 4 || i === 12)) {
            isSampleLocked = true;
            if (i === 4) {
              lockType = 'LOCKED_MAINTENANCE';
              lockReason = 'Punch tip chipped - Bypassed for regrinding shift 2';
              lockedBy = 'Somchai M. (Tooling Lead)';
              lockedAt = '2026-08-28T14:30:00.000Z';
              notes = 'Slot isolated with dummy blanking pin.';
            } else if (i === 12) {
              lockType = 'LOCKED_TRIAL';
              lockReason = 'Trial PCM 0.10mm coating test position';
              lockedBy = 'Anan K. (Die Specialist)';
              lockedAt = '2026-08-29T08:00:00.000Z';
              notes = 'Counter frozen during sample coil run.';
            }
          } else if (lineId === 'E1' && stg.stageCode.includes('LOUV') && i === 18) {
            isSampleLocked = true;
            lockType = 'LOCKED_BYPASS';
            lockReason = 'Louver blade wear inspection hold';
            lockedBy = 'Kitti S. (Maintenance Tech)';
            lockedAt = '2026-08-29T09:15:00.000Z';
            notes = 'Clearance measured 0.012mm - Needs micro-grind.';
          }

          result.push({
            id: `POS-${lineId}-${stg.stageCode}-${posStr}`,
            lineId,
            dieCode,
            stageCode: stg.stageCode,
            stageName: stg.stageName,
            partCode: stg.partCode,
            partName: stg.partName,
            positionId: `P-${posStr}`,
            positionIndex: i,
            isLocked: isSampleLocked,
            lockType,
            lockReason,
            freezeShotCount: isSampleLocked,
            frozenAtShot: isSampleLocked ? 14200500 + i * 1000 : undefined,
            lockedBy: lockedBy || undefined,
            lockedAt: lockedAt || undefined,
            notes: notes || undefined
          });
        }
      });
    });

    return result;
  }

  public savePositionLock(
    id: string,
    isLocked: boolean,
    lockType: PositionLockStatus,
    lockReason: string,
    notes?: string,
    freezeShotCount: boolean = true
  ): PositionLockRecord {
    const raw = safeStorage.getItem(STORAGE_KEYS.POSITION_LOCKS);
    let locks: PositionLockRecord[] = [];
    try {
      locks = raw ? JSON.parse(raw) : this.initializeDefaultPositionLocks();
    } catch {
      locks = this.initializeDefaultPositionLocks();
    }
    const idx = locks.findIndex(l => l.id === id);
    const currentUser = this.getCurrentUser();

    if (idx < 0) {
      console.warn(`Position record ${id} not found.`);
      return {
        id,
        lineId: 'E1',
        dieCode: 'DIE-01',
        stageCode: 'STG-01',
        stageName: 'Piercing',
        partCode: '',
        partName: '',
        positionId: 'P-01',
        positionIndex: 0,
        isLocked: false,
        lockType: 'UNLOCKED',
        lockReason: '',
        freezeShotCount: false,
        notes: ''
      };
    }

    const previous = locks[idx];
    const updated: PositionLockRecord = {
      ...previous,
      isLocked,
      lockType: isLocked ? lockType : 'UNLOCKED',
      lockReason: isLocked ? lockReason : '',
      freezeShotCount: isLocked ? freezeShotCount : false,
      frozenAtShot: isLocked ? (previous.frozenAtShot || 14200500) : undefined,
      lockedBy: isLocked ? currentUser.name : undefined,
      lockedAt: isLocked ? new Date().toISOString() : undefined,
      notes: notes || ''
    };

    locks[idx] = updated;
    safeStorage.setItem(STORAGE_KEYS.POSITION_LOCKS, JSON.stringify(locks));

    this.logStructuredAudit({
      module: 'SECURITY',
      recordId: id,
      action: isLocked ? 'LOCK_POSITION' : 'UNLOCK_POSITION',
      fieldChanged: 'isLocked / lockType',
      oldValue: previous.isLocked ? `${previous.lockType} (${previous.lockReason})` : 'UNLOCKED',
      newValue: isLocked ? `${lockType} (${lockReason})` : 'UNLOCKED',
      reason: lockReason || (isLocked ? 'Position locked by technician' : 'Position unlocked & returned to production'),
      details: `${isLocked ? 'Locked' : 'Unlocked'} position ${updated.positionId} (${updated.stageName}, Die: ${updated.dieCode}, Line: ${updated.lineId}). Type: ${lockType}. Notes: ${notes || 'None'}`,
      detailsTh: `${isLocked ? 'ล็อคตำแหน่ง' : 'ปลดล็อคตำแหน่ง'} ${updated.positionId} ในสถานี ${updated.stageName} (Line ${updated.lineId})`,
      actionCategory: 'CONFIGURATION'
    });

    this.notify();
    return updated;
  }

  public batchUpdatePositionLocks(
    ids: string[],
    isLocked: boolean,
    lockType: PositionLockStatus,
    lockReason: string,
    notes?: string
  ): void {
    const raw = safeStorage.getItem(STORAGE_KEYS.POSITION_LOCKS);
    let locks: PositionLockRecord[] = [];
    try {
      locks = raw ? JSON.parse(raw) : this.initializeDefaultPositionLocks();
    } catch {
      locks = this.initializeDefaultPositionLocks();
    }
    const currentUser = this.getCurrentUser();

    locks = locks.map(item => {
      if (ids.includes(item.id)) {
        return {
          ...item,
          isLocked,
          lockType: isLocked ? lockType : 'UNLOCKED',
          lockReason: isLocked ? lockReason : '',
          freezeShotCount: isLocked,
          frozenAtShot: isLocked ? (item.frozenAtShot || 14200500) : undefined,
          lockedBy: isLocked ? currentUser.name : undefined,
          lockedAt: isLocked ? new Date().toISOString() : undefined,
          notes: notes || ''
        };
      }
      return item;
    });

    safeStorage.setItem(STORAGE_KEYS.POSITION_LOCKS, JSON.stringify(locks));

    this.logStructuredAudit({
      module: 'SECURITY',
      recordId: `BATCH-${ids.length}-POSITIONS`,
      action: isLocked ? 'BATCH_LOCK_POSITION' : 'BATCH_UNLOCK_POSITION',
      fieldChanged: 'isLocked / lockType',
      oldValue: 'MULTI',
      newValue: isLocked ? `${lockType} (${ids.length} positions)` : `UNLOCKED (${ids.length} positions)`,
      reason: lockReason || `Batch ${isLocked ? 'lock' : 'unlock'} of ${ids.length} die positions`,
      details: `Batch ${isLocked ? 'locked' : 'unlocked'} ${ids.length} positions with type: ${lockType}. Reason: ${lockReason}`,
      detailsTh: `ดำเนินการ${isLocked ? 'ล็อค' : 'ปลดล็อค'}กลุ่มตำแหน่งแม่พิมพ์จำนวน ${ids.length} จุดพร้อมกัน`,
      actionCategory: 'CONFIGURATION'
    });

    this.notify();
  }

  public applyMigration(parts: PartMaster[], regrindMasters: RegrindMasterStandard[], configs: LineActiveConfiguration[], lifeStandards: PartLifeStandard[]) {
    safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
    safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindMasters));
    safeStorage.setItem(STORAGE_KEYS.LINE_CONFIGS, JSON.stringify(configs));
    safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStandards));
    this.notify();
  }

  // ==========================================
  // PLC DIRECT INTEGRATION DRIVER CONFIGURATION
  // ==========================================

  public getPLCConfig(): PLCConfig {
    const raw = safeStorage.getItem(STORAGE_KEYS.PLC_CONFIG);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.PLC_CONFIG, JSON.stringify(DEFAULT_PLC_CONFIG));
      return DEFAULT_PLC_CONFIG;
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PLC_CONFIG, ...parsed };
    } catch {
      return DEFAULT_PLC_CONFIG;
    }
  }

  public savePLCConfig(config: PLCConfig): void {
    safeStorage.setItem(STORAGE_KEYS.PLC_CONFIG, JSON.stringify(config));
    this.addAuditLog('SYSTEM', 'Updated PLC Direct Driver configuration parameters and register mappings');
    this.notify();
  }

  // ==========================================
  // DOWNTIME TRACKING & STATUS MANAGEMENT (LAST 30 DAYS)
  // ==========================================

  public getDowntimeLogs(): DowntimeLogEntry[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.DOWNTIME_LOGS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(INITIAL_DOWNTIME_LOGS));
      return INITIAL_DOWNTIME_LOGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DOWNTIME_LOGS;
    }
  }

  public addDowntimeLog(entry: Omit<DowntimeLogEntry, 'id'>): DowntimeLogEntry {
    const logs = this.getDowntimeLogs();
    const newEntry: DowntimeLogEntry = {
      id: `DT-${entry.lineId}-${Date.now().toString().slice(-6)}`,
      ...entry
    };
    logs.unshift(newEntry);
    safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(logs));
    this.notify();
    return newEntry;
  }

  public resolveDowntimeLog(id: string, endTime?: string): void {
    const logs = this.getDowntimeLogs();
    const target = logs.find(l => l.id === id);
    if (target && !target.isResolved) {
      const end = endTime || new Date().toISOString();
      const startMs = new Date(target.startTime).getTime();
      const endMs = new Date(end).getTime();
      target.endTime = end;
      target.durationMinutes = Math.max(1, Math.round((endMs - startMs) / (60 * 1000)));
      target.isResolved = true;
      safeStorage.setItem(STORAGE_KEYS.DOWNTIME_LOGS, JSON.stringify(logs));
      this.notify();
    }
  }

  public getLineDowntimeSummary30Days(): Downtime30DayReport {
    const logs = this.getDowntimeLogs();
    const lineIds: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    const now = Date.now();
    const thirtyDaysAgoMs = now - (30 * 24 * 3600 * 1000);
    const plannedHoursPerLine = 30 * 24; // 720 hours in 30 days

    const lineSummaries: Record<ProductionLineId, DowntimeSummaryByLine> = {} as any;

    let totalFactoryMinutes = 0;

    lineIds.forEach(lId => {
      // Filter events in the last 30 days for this line
      const lineLogs = logs.filter(l => {
        const startMs = new Date(l.startTime).getTime();
        return l.lineId === lId && (startMs >= thirtyDaysAgoMs || !l.isResolved);
      });

      let totalMinutes = 0;
      let unplannedMinutes = 0;
      let maintenanceMinutes = 0;
      let changeoverMinutes = 0;
      let lastIncident: DowntimeLogEntry | undefined = undefined;

      lineLogs.forEach(l => {
        const startMs = new Date(l.startTime).getTime();
        let eventMinutes = l.durationMinutes || 0;
        if (!l.isResolved) {
          eventMinutes = Math.max(1, Math.round((now - startMs) / (60 * 1000)));
        }
        totalMinutes += eventMinutes;

        if (l.category === 'UNPLANNED_DOWN' || l.category === 'QUALITY_HOLD') {
          unplannedMinutes += eventMinutes;
        } else if (l.category === 'SCHEDULED_MAINTENANCE' || l.category === 'TOOLING_REPAIR') {
          maintenanceMinutes += eventMinutes;
        } else if (l.category === 'DIE_CHANGEOVER') {
          changeoverMinutes += eventMinutes;
        } else {
          unplannedMinutes += eventMinutes;
        }

        if (!lastIncident || new Date(l.startTime).getTime() > new Date(lastIncident.startTime).getTime()) {
          lastIncident = l;
        }
      });

      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const unplannedHours = Number((unplannedMinutes / 60).toFixed(1));
      const maintenanceHours = Number((maintenanceMinutes / 60).toFixed(1));
      const changeoverHours = Number((changeoverMinutes / 60).toFixed(1));
      const uptimePercent = Number(Math.max(0, Math.min(100, ((plannedHoursPerLine - totalHours) / plannedHoursPerLine) * 100)).toFixed(1));

      totalFactoryMinutes += totalMinutes;

      lineSummaries[lId] = {
        lineId: lId,
        lineName: `Line ${lId}`,
        totalDowntimeMinutes: totalMinutes,
        totalDowntimeHours: totalHours,
        eventCount: lineLogs.length,
        uptimePercent,
        unplannedHours,
        maintenanceHours,
        changeoverHours,
        lastIncident
      };
    });

    const totalFactoryHours = Number((totalFactoryMinutes / 60).toFixed(1));
    const averageLineDowntimeHours = Number((totalFactoryHours / lineIds.length).toFixed(1));
    const totalFactoryPlannedHours = plannedHoursPerLine * lineIds.length;
    const factoryUptimePercent = Number(Math.max(0, Math.min(100, ((totalFactoryPlannedHours - totalFactoryHours) / totalFactoryPlannedHours) * 100)).toFixed(1));

    // Find bottleneck line with highest downtime
    let bottleneckLineId: ProductionLineId = 'E4';
    let maxHours = -1;
    lineIds.forEach(lId => {
      if (lineSummaries[lId].totalDowntimeHours > maxHours) {
        maxHours = lineSummaries[lId].totalDowntimeHours;
        bottleneckLineId = lId;
      }
    });

    return {
      startDate: new Date(thirtyDaysAgoMs).toISOString().substring(0, 10),
      endDate: new Date(now).toISOString().substring(0, 10),
      totalFactoryDowntimeHours: totalFactoryHours,
      averageLineDowntimeHours,
      factoryUptimePercent,
      bottleneckLineId,
      lineSummaries
    };
  }

  // ==========================================
  // SYSTEM SETTINGS & THEMES
  // ==========================================

  public getSettings(): SystemSettings {
    const raw = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      return DEFAULT_SYSTEM_SETTINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      parsed.theme = 'dark';
      return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed, theme: 'dark' };
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  }

  public saveSettings(settings: Partial<SystemSettings>): void {
    const current = this.getSettings();
    const updated: SystemSettings = { ...current, ...settings, theme: 'dark' };
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.addAuditLog('SYSTEM', 'Updated system preferences & operational thresholds');
    this.notify();
  }

  public updateSettings(settings: Partial<SystemSettings>): void {
    this.saveSettings(settings);
  }

  // ==========================================
  // PLC REGISTER MAPPINGS (7 LINES)
  // ==========================================

  public getPLCRegisterMappings(): Record<ProductionLineId, PLCRegisterMapping> {
    const raw = safeStorage.getItem(STORAGE_KEYS.PLC_MAPPINGS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.PLC_MAPPINGS, JSON.stringify(INITIAL_PLC_REGISTER_MAPPINGS));
      return INITIAL_PLC_REGISTER_MAPPINGS;
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_PLC_REGISTER_MAPPINGS, ...parsed };
    } catch {
      return INITIAL_PLC_REGISTER_MAPPINGS;
    }
  }

  public savePLCRegisterMapping(mapping: PLCRegisterMapping): void {
    const all = this.getPLCRegisterMappings();
    all[mapping.lineId] = { ...mapping, readOnly: true };
    safeStorage.setItem(STORAGE_KEYS.PLC_MAPPINGS, JSON.stringify(all));
    const tag = mapping.tagName || mapping.plcTagName || 'ShotRegister';
    this.addAuditLog('CONFIGURATION', `Updated PLC Register mapping for Line ${mapping.lineId} (${tag} @ ${mapping.registerAddress})`, undefined, mapping.lineId);
    this.notify();
  }

  public savePLCRegisterMappings(mappings: Record<ProductionLineId, PLCRegisterMapping>): void {
    safeStorage.setItem(STORAGE_KEYS.PLC_MAPPINGS, JSON.stringify(mappings));
    this.addAuditLog('CONFIGURATION', 'Updated all PLC register telemetry mappings (7 lines)');
    this.notify();
  }

  // ==========================================
  // GATEWAY STATUS & HEARTBEAT
  // ==========================================

  public getGatewayStatus(): GatewayStatusInfo {
    const raw = safeStorage.getItem(STORAGE_KEYS.GATEWAY_STATUS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.GATEWAY_STATUS, JSON.stringify(INITIAL_GATEWAY_STATUS));
      return INITIAL_GATEWAY_STATUS;
    }
    try {
      return { ...INITIAL_GATEWAY_STATUS, ...JSON.parse(raw) };
    } catch {
      return INITIAL_GATEWAY_STATUS;
    }
  }

  public saveGatewayStatus(status: Partial<GatewayStatusInfo>): void {
    const current = this.getGatewayStatus();
    const updated: GatewayStatusInfo = { ...current, ...status, readOnlyEnforced: true };
    this.safeSetItem(STORAGE_KEYS.GATEWAY_STATUS, JSON.stringify(updated));
    const hasMeaningfulChange = 
      current.isOnline !== updated.isOnline ||
      current.syncStatus !== updated.syncStatus ||
      current.connectedLinesCount !== updated.connectedLinesCount ||
      current.gatewayStatus !== updated.gatewayStatus;
    if (hasMeaningfulChange) {
      this.notify();
    }
  }

  // ==========================================
  // SYSTEM ALERTS & NOTIFICATIONS
  // ==========================================

  public getSystemAlerts(): SystemAlertItem[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.SYSTEM_ALERTS);
    if (!raw) {
      safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify(INITIAL_SYSTEM_ALERTS));
      return INITIAL_SYSTEM_ALERTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SYSTEM_ALERTS;
    }
  }

  public addSystemAlert(alert: Omit<SystemAlertItem, 'id' | 'createdAt'>): SystemAlertItem {
    const alerts = this.getSystemAlerts();
    const newAlert: SystemAlertItem = {
      id: `ALT-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      isAcknowledged: false,
      ...alert
    };
    alerts.unshift(newAlert);
    if (alerts.length > 50) alerts.length = 50;
    safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify(alerts));
    this.notify();
    return newAlert;
  }

  public acknowledgeAlert(id: string, userName: string): void {
    const alerts = this.getSystemAlerts();
    const item = alerts.find(a => a.id === id);
    if (item) {
      item.isAcknowledged = true;
      item.acknowledgedBy = userName;
      item.acknowledgedAt = new Date().toISOString();
      item.isRead = true;
      safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify(alerts));
      this.notify();
    }
  }

  public markAlertAsRead(id: string): void {
    const alerts = this.getSystemAlerts();
    const item = alerts.find(a => a.id === id);
    if (item) {
      item.isRead = true;
      safeStorage.setItem(STORAGE_KEYS.SYSTEM_ALERTS, JSON.stringify(alerts));
      this.notify();
    }
  }

  // ==========================================
  // OFFLINE TELEMETRY BUFFER
  // ==========================================

  public getOfflineTelemetryBuffer(): any[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.OFFLINE_BUFFER);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public pushTelemetryBuffer(record: any): void {
    const buffer = this.getOfflineTelemetryBuffer();
    buffer.push(record);
    if (buffer.length > 500) {
      buffer.splice(0, buffer.length - 500);
    }
    safeStorage.setItem(STORAGE_KEYS.OFFLINE_BUFFER, JSON.stringify(buffer));
  }

  public clearTelemetryBuffer(): void {
    safeStorage.setItem(STORAGE_KEYS.OFFLINE_BUFFER, JSON.stringify([]));
  }

  /**
   * Performs a synchronization check across all part records to ensure all stage names 
   * exist in the custom stage groups list. Fixes broken references and casing mismatches.
   */
  public validateAndSyncStages(): { added: number; fixed: number } {
    const groups = this.getStageGroups();
    const seen = new Set<string>(groups.map(g => g.trim().toUpperCase()));
    const normalizedGroups = new Map<string, string>(groups.map(g => [g.trim().toUpperCase(), g.trim()]));
    
    let addedCount = 0;
    let fixedCount = 0;
    
    const parts = this.getPartMasters();
    const lifeStds = this.getLifeStandards();
    const regrindStds = this.getRegrindMasterStandards();

    // 1. Scan for missing stages and add them to groups
    const scanAndAdd = (stg: string | undefined) => {
      if (!stg || stg.trim() === '-' || stg.trim() === '') return;
      const trimmed = stg.trim();
      const upper = trimmed.toUpperCase();
      if (!seen.has(upper)) {
        groups.push(trimmed);
        seen.add(upper);
        normalizedGroups.set(upper, trimmed);
        addedCount++;
      }
    };

    parts.forEach(p => scanAndAdd(p.stageName));
    lifeStds.forEach(s => scanAndAdd(s.stagePunchDie));
    regrindStds.forEach(s => scanAndAdd(s.stagePunchDie));

    // 2. Fix casing mismatches in records to match official groups
    const fixCasing = (stg: string | undefined): string | null => {
      if (!stg || stg.trim() === '-' || stg.trim() === '') return null;
      const trimmed = stg.trim();
      const official = normalizedGroups.get(trimmed.toUpperCase());
      if (official && trimmed !== official) {
        return official;
      }
      return null;
    };

    parts.forEach(p => {
      const fixed = fixCasing(p.stageName);
      if (fixed) {
        p.stageName = fixed;
        fixedCount++;
      }
    });

    lifeStds.forEach(s => {
      const fixed = fixCasing(s.stagePunchDie);
      if (fixed) {
        s.stagePunchDie = fixed;
        fixedCount++;
      }
    });

    regrindStds.forEach(s => {
      const fixed = fixCasing(s.stagePunchDie);
      if (fixed) {
        s.stagePunchDie = fixed;
        fixedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveStageGroups(groups);
    }

    if (fixedCount > 0) {
      safeStorage.setItem(STORAGE_KEYS.PART_MASTERS, JSON.stringify(parts));
      safeStorage.setItem(STORAGE_KEYS.LIFE_STANDARDS, JSON.stringify(lifeStds));
      safeStorage.setItem(STORAGE_KEYS.REGRIND_STANDARDS, JSON.stringify(regrindStds));
    }

    if (addedCount > 0 || fixedCount > 0) {
      this.addAuditLog('SYSTEM', `Database Sync: Added ${addedCount} missing stages and fixed ${fixedCount} broken references.`);
      this.notify();
    }

    return { added: addedCount, fixed: fixedCount };
  }

  public getTvDisplayConfigs(): Record<ProductionLineId, string[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TV_DISPLAY_CONFIGS);
    let parsed: Record<ProductionLineId, string[]> = {} as Record<ProductionLineId, string[]>;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {} as Record<ProductionLineId, string[]>;
      }
    }

    const lines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    let needsSave = false;

    lines.forEach(lineId => {
      if (!parsed[lineId] || parsed[lineId].length === 0) {
        // Use curated progressive tooling order for the line if available
        if (DEFAULT_TV_DISPLAY_CONFIGS[lineId] && DEFAULT_TV_DISPLAY_CONFIGS[lineId].length > 0) {
          parsed[lineId] = [...DEFAULT_TV_DISPLAY_CONFIGS[lineId]];
          needsSave = true;
        } else {
          // Generate line-specific default list of installed parts sorted progressively
          const lineConfig = this.getLineConfigs().find(c => c.lineId === lineId);
          const installedMap = lineConfig?.installedPartQuantities || {};
          const installedCodes = Object.keys(installedMap).filter(code => (installedMap[code] || 0) > 0);
          const partMasters = this.getPartMasters();

          const sortedCodes = installedCodes
            .map(code => {
              const pm = partMasters.find(p => p.partCode === code);
              return {
                code,
                name: pm?.partName || '',
                stage: pm?.stageName || ''
              };
            })
            .sort((a, b) => {
              const rankA = getPartProgressiveRank(a.name, a.stage);
              const rankB = getPartProgressiveRank(b.name, b.stage);
              if (rankA !== rankB) return rankA - rankB;
              return a.code.localeCompare(b.code);
            })
            .map(p => p.code);

          parsed[lineId] = sortedCodes.slice(0, 14);
          needsSave = true;
        }
      }
    });

    if (needsSave) {
      safeStorage.setItem(STORAGE_KEYS.TV_DISPLAY_CONFIGS, JSON.stringify(parsed));
    }

    return parsed;
  }

  public saveTvDisplayConfigs(configs: Record<ProductionLineId, string[]>): void {
    safeStorage.setItem(STORAGE_KEYS.TV_DISPLAY_CONFIGS, JSON.stringify(configs));
    this.notify();
  }
}

export const storageService = new StorageService();

export const DEFAULT_TV_DISPLAY_CONFIGS: Record<ProductionLineId, string[]> = {
  'E1': [
    'DWG-PB-002', // PIERCE PUNCH (Ø7)
    'DWG-PB-004', // BURRING PUNCH (Ø7)
    'DWG-IR-003', // IRONING PUNCH (Ø7)
    'DWG-IR-004', // IRONING DIE (Ø7)
    'DWG-RF-002', // REFLARE PUNCH 7mm
    'DWG-RF-004', // REFLARE DIE (Ø7)
    'DWG-SL-010', // SLIT PUNCE NEW SLIT (Ø7)
    'DWG-SL-011', // SLIT DIE NEW SLIT (Ø7)
    'DWG-RS-001', // ROW SLIT BLADE (Ø7)
    'DWG-CO-004', // CUT OFF PUNCH (Ø7)
    'DWG-CO-006', // CUT OFF DIE (Ø7)
    'DWG-SC-002', // SIDE CUT PUNCH (3P) (Ø7)
    'DWG-SC-004', // SIDE CUT DIE (3P) (Ø7)
    'DWG-CC-001'  // CORNER CUT PUNCH A (Ø7)
  ],
  'E2': [
    'DWG-PB-001', // PIERCE PUNCH (Ø5)
    'DWG-PB-003', // BURRING PUNCH (Ø5)
    'DWG-IR-001', // IRONING PUNCH (Ø5)
    'DWG-IR-002', // IRONING DIE (Ø5)
    'DWG-RF-001', // REFLARE PUNCH 5mm
    'DWG-RF-003', // REFLARE DIE (Ø5)
    'DWG-RF-004', // REFLARE DIE (Ø7)
    'DWG-RS-002', // ROW SLIT BLADE (Ø5) A
    'DWG-RS-003', // ROW SLIT BLADE (Ø5) B
    'DWG-SL-001', // SLIT PUNCH (Ø5)
    'DWG-SL-002', // SLIT DIE A (Ø5) 3Row
    'DWG-SL-003', // SLIT DIE A (Ø5) 4Row
    'DWG-SL-004', // SLIT DIE B (Ø5) 3Row
    'DWG-SL-005'  // SLIT DIE B (Ø5) 4Row
  ],
  'E3-1': [
    'DWG-PB-002', // PIERCE PUNCH (Ø7)
    'DWG-PB-004', // BURRING PUNCH (Ø7)
    'DWG-IR-003', // IRONING PUNCH (Ø7)
    'DWG-IR-004', // IRONING DIE (Ø7)
    'DWG-RF-002', // REFLARE PUNCH 7mm
    'DWG-RF-004', // REFLARE DIE (Ø7)
    'DWG-SL-010', // SLIT PUNCE NEW SLIT (Ø7)
    'DWG-SL-011', // SLIT DIE NEW SLIT (Ø7)
    'DWG-RS-001', // ROW SLIT BLADE (Ø7)
    'DWG-CO-004', // CUT OFF PUNCH (Ø7)
    'DWG-CO-006', // CUT OFF DIE (Ø7)
    'DWG-SC-002', // SIDE CUT PUNCH (3P) (Ø7)
    'DWG-SC-004', // SIDE CUT DIE (3P) (Ø7)
    'DWG-SL-006'  // SLIT PUNCH A (Ø7) (Old)
  ],
  'E3-2': [
    'DWG-PB-005', // BURRING (WIDE LOWER)
    'DWG-LV-001', // LOUVER PUNCH (U)
    'DWG-LV-002', // LOUVER PUNCH (L)
    'DWG-WL-001', // LOUVER PUNCH (WIDE LOWER) UP
    'DWG-WL-002', // LOUVER PUNCH (WIDE LOWER) DOWN
    'DWG-RS-004', // ROW SLID BLADE (WIDE LOWER) 4P
    'DWG-CO-001', // CUT OFF PUNCH (WIDE LOWER)
    'DWG-CO-002', // CUT OFF DIE (WIDE LOWER)
    'DWG-SC-005', // SIDE CUT PUNCH (WIDE LOWER) 4P
    'DWG-SC-006', // SIDE CUT DIE (WIDE LOWER) 4P
    'DWG-HF-002'  // HITCH FEED PIN (Ø7)
  ],
  'E3-3': [
    'DWG-PB-005', // BURRING (WIDE LOWER)
    'DWG-WL-001', // LOUVER PUNCH (WIDE LOWER) UP
    'DWG-WL-002', // LOUVER PUNCH (WIDE LOWER) DOWN
    'DWG-RS-002', // ROW SLIT BLADE (Ø5) A
    'DWG-RS-003', // ROW SLIT BLADE (Ø5) B
    'DWG-RS-004', // ROW SLID BLADE (WIDE LOWER) 4P
    'DWG-CO-001', // CUT OFF PUNCH (WIDE LOWER)
    'DWG-CO-002', // CUT OFF DIE (WIDE LOWER)
    'DWG-SC-005', // SIDE CUT PUNCH (WIDE LOWER) 4P
    'DWG-SC-006', // SIDE CUT DIE (WIDE LOWER) 4P
    'DWG-HF-002'  // HITCH FEED PIN (Ø7)
  ],
  'E4': [
    'DWG-PB-001', // PIERCE PUNCH (Ø5)
    'DWG-PB-003', // BURRING PUNCH (Ø5)
    'DWG-IR-001', // IRONING PUNCH (Ø5)
    'DWG-IR-002', // IRONING DIE (Ø5)
    'DWG-RF-001', // REFLARE PUNCH 5mm
    'DWG-RF-003', // REFLARE DIE (Ø5)
    'DWG-RF-004', // REFLARE DIE (Ø7)
    'DWG-RS-002', // ROW SLIT BLADE (Ø5) A
    'DWG-RS-003', // ROW SLIT BLADE (Ø5) B
    'DWG-SL-001', // SLIT PUNCH (Ø5)
    'DWG-SL-002', // SLIT DIE A (Ø5) 3Row
    'DWG-SL-003', // SLIT DIE A (Ø5) 4Row
    'DWG-SL-004', // SLIT DIE B (Ø5) 3Row
    'DWG-SL-005'  // SLIT DIE B (Ø5) 4Row
  ],
  'E5': [
    'DWG-PB-001', // PIERCE PUNCH (Ø5)
    'DWG-PB-003', // BURRING PUNCH (Ø5)
    'DWG-IR-001', // IRONING PUNCH (Ø5)
    'DWG-IR-002', // IRONING DIE (Ø5)
    'DWG-RF-001', // REFLARE PUNCH 5mm
    'DWG-RF-003', // REFLARE DIE (Ø5)
    'DWG-RF-004', // REFLARE DIE (Ø7)
    'DWG-SL-001', // SLIT PUNCH (Ø5)
    'DWG-SL-002', // SLIT DIE A (Ø5) 3Row
    'DWG-SL-003', // SLIT DIE A (Ø5) 4Row
    'DWG-SL-004', // SLIT DIE B (Ø5) 3Row
    'DWG-SL-005', // SLIT DIE B (Ø5) 4Row
    'DWG-SC-001', // SIDE CUT PUNCH (3P) (Ø5)
    'DWG-SC-003'  // SIDE CUT DIE (3P) (Ø5)
  ]
};


