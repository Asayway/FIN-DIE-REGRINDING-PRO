import {
  ProductionLineId,
  PartMaster,
  PartLifeStandard,
  LineActiveConfiguration,
  InstalledQuantityRule,
  LineLiveMonitoringData,
  SpareStockItem,
  User,
  AuditLogEntry,
  ReplacementRecord,
  RegrindingRecord,
  RegrindMasterStandard,
  ConditionInspectionRecord,
  ShotEntryRecord,
  SystemSettings,
  PLCConfig,
  DowntimeLogEntry,
  PLCRegisterMapping,
  GatewayStatusInfo,
  SystemAlertItem
} from '../types';

import { MOLD_DIE_MASTER_ITEMS_2025 } from './moldDieMasterData';

export const SEED_DATA_VERSION = '2025.02-79-PARTS-CANONICAL-V7';
export const SEED_SOURCE_LABEL = 'List Spare Parts Mold & Die Heat Exchanger - 79 Canonical Parts 2025';

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Somchai Prasert',
    nameTh: 'สมชาย ประเสริฐ',
    email: 'somchai.p@heatexchange.co.th',
    role: 'SYSTEM_ADMIN',
    department: 'Die Engineering & IT Admin',
    employeeId: 'EMP-1001',
    isActive: true,
    lastLogin: '2026-08-28 14:45:00'
  },
  {
    id: 'USR-002',
    name: 'Anan Chaikit',
    nameTh: 'อนันต์ ชัยกิจ',
    email: 'anan.c@heatexchange.co.th',
    role: 'APPROVER',
    department: 'Fin Press Production Manager',
    employeeId: 'EMP-1045',
    isActive: true,
    lastLogin: '2026-08-28 14:10:00'
  },
  {
    id: 'USR-003',
    name: 'Kittisak Wongsuwan',
    nameTh: 'กิตติศักดิ์ วงศ์สุวรรณ',
    email: 'kittisak.w@heatexchange.co.th',
    role: 'TOOLING_ADMIN',
    department: 'Tooling & Regrind Shop Specialist',
    employeeId: 'EMP-2088',
    isActive: true,
    lastLogin: '2026-08-28 13:50:00'
  },
  {
    id: 'USR-004',
    name: 'Narongrit Promdee',
    nameTh: 'ณรงค์ฤทธิ์ พร้อมดี',
    email: 'narongrit.p@heatexchange.co.th',
    role: 'MAINTENANCE',
    department: 'Mechanical Maintenance Tech',
    employeeId: 'EMP-3012',
    isActive: true,
    lastLogin: '2026-08-28 12:30:00'
  },
  {
    id: 'USR-005',
    name: 'Wichai Raksapol',
    nameTh: 'วิชัย รักษาผล',
    email: 'wichai.r@heatexchange.co.th',
    role: 'OPERATOR',
    department: 'Line E5 Press Operator',
    employeeId: 'EMP-4091',
    isActive: true,
    lastLogin: '2026-08-28 14:55:00'
  },
  {
    id: 'USR-006',
    name: 'Kittichai Maneerat',
    nameTh: 'กิตติชัย มณีรัตน์',
    email: 'kittichai.m@heatexchange.co.th',
    role: 'LINE_LEADER',
    department: 'Fin Press Production Shift Leader',
    employeeId: 'EMP-1099',
    isActive: true,
    lastLogin: '2026-08-28 11:20:00'
  },
  {
    id: 'USR-007',
    name: 'Prakaidao Kaewkla',
    nameTh: 'ประกายดาว แก้วกล้า',
    email: 'prakaidao.k@heatexchange.co.th',
    role: 'WAREHOUSE',
    department: 'Tooling Spare Parts Warehouse',
    employeeId: 'EMP-5021',
    isActive: true,
    lastLogin: '2026-08-28 10:15:00'
  },
  {
    id: 'USR-008',
    name: 'Thanaporn Srisuk',
    nameTh: 'ธนพร ศรีสุข',
    email: 'thanaporn.s@heatexchange.co.th',
    role: 'PURCHASING',
    department: 'Procurement & Supply Chain Buyer',
    employeeId: 'EMP-6014',
    isActive: true,
    lastLogin: '2026-08-28 09:40:00'
  },
  {
    id: 'USR-009',
    name: 'Dr. Wittawat Bunma',
    nameTh: 'ดร. วิทวัส บุญมา',
    email: 'wittawat.b@heatexchange.co.th',
    role: 'ENGINEERING',
    department: 'Die Engineering & R&D Lead',
    employeeId: 'EMP-7002',
    isActive: true,
    lastLogin: '2026-08-28 08:30:00'
  },
  {
    id: 'USR-010',
    name: 'Natcha Somboon',
    nameTh: 'ณัชชา สมบูรณ์',
    email: 'natcha.s@heatexchange.co.th',
    role: 'VIEWER',
    department: 'Plant Executive & Monitoring',
    employeeId: 'EMP-8001',
    isActive: true,
    lastLogin: '2026-08-28 07:00:00'
  }
];

export function buildCompositeKey(
  lineId: string,
  configId: string,
  dieCode: string,
  finType: string,
  material: string,
  thickness: number,
  tubeSize: string,
  partCode: string,
  position: string = 'ALL',
  effectiveDate: string = '2025-01-31'
): string {
  const thicknessVal = thickness !== undefined && thickness !== null ? Number(thickness) : 0.10;
  return `${lineId}|${configId}|${dieCode}|${finType}|${material}|${thicknessVal.toFixed(2)}mm|${tubeSize}|${partCode}|${position}|${effectiveDate}`;
}

// Helper to check which active lines are for this part
export const getActiveLinesForPart = (item: any): ('E1' | 'E2' | 'E3-1' | 'E3-2' | 'E3-3' | 'E4' | 'E5')[] => {
  const lines: ('E1' | 'E2' | 'E3-1' | 'E3-2' | 'E3-3' | 'E4' | 'E5')[] = [];
  if ((item.installQty.e1 || 0) > 0) lines.push('E1');
  if ((item.installQty.e2 || 0) > 0) lines.push('E2');
  if ((item.installQty.e3_1 || 0) > 0) lines.push('E3-1');
  if ((item.installQty.e3_2 || 0) > 0) lines.push('E3-2');
  if ((item.installQty.e3_3 || 0) > 0) lines.push('E3-3');
  if ((item.installQty.e4 || 0) > 0) lines.push('E4');
  if ((item.installQty.e5 || 0) > 0) lines.push('E5');
  return lines;
};

// -------------------------------------------------------------
// 1. CANONICAL PART MASTERS (70 Canonical Parts matching Master Sheet 100%)
// -------------------------------------------------------------
export const INITIAL_PART_MASTERS: PartMaster[] = MOLD_DIE_MASTER_ITEMS_2025.map((item) => {
  const isDie = item.partName.toUpperCase().includes('DIE');
  const isBlade = item.partName.toUpperCase().includes('BLADE');
  const isPin = item.partName.toUpperCase().includes('PIN');
  const category = isDie ? 'DIE' : isBlade ? 'BLADE' : isPin ? 'PIN' : 'PUNCH';
  const tubeSizeCompat = item.partName.includes('Ø5') ? 'Ø5' : item.partName.includes('Ø7') ? 'Ø7' : 'BOTH';
  const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose') || item.regrindStandard.note.toLowerCase().includes('dispose');

  return {
    partCode: item.drawingNo || `PM-${String(item.no).padStart(3, '0')}`,
    partName: item.partName,
    partNameTh: item.partName,
    category,
    stageName: item.stage,
    tubeSizeCompat,
    drawingNumber: item.drawingNo,
    unit: 'EA',
    unitCostThb: isDie ? 18000 : 12000,
    description: `${item.stage} - ${item.partName}`,
    isImportedSeed: true,
    maintenanceType: isDisposable ? 'DISPOSE' : 'REGRIND',
    regrindStandard: item.regrindStandard,
    shotLifeCycle: item.shotLifeCycle,
    installQty: item.installQty,
    newSpecMm: item.newSpecMm,
    scrapLimitMm: item.scrapLimitMm,
    applicableLines: getActiveLinesForPart(item)
  } as any;
});

// Helper to extract installed parts for a line
const getLineInstalledQuantities = (lineKey: 'e1' | 'e2' | 'e3_1' | 'e3_2' | 'e3_3' | 'e4' | 'e5' | 'e6', _prefix?: string) => {
  const quantities: Record<string, number> = {};
  MOLD_DIE_MASTER_ITEMS_2025.forEach(item => {
    const qty = item.installQty[lineKey];
    if (qty !== undefined && qty > 0) {
      quantities[item.drawingNo] = qty;
    }
  });
  return quantities;
};

// Helper to extract stock quantities for a line
const getLineStockQuantities = (lineKey: 'e1' | 'e2' | 'e3_1' | 'e3_2' | 'e3_3' | 'e4' | 'e5' | 'e6', _prefix?: string) => {
  const stockQty: Record<string, number> = {};
  MOLD_DIE_MASTER_ITEMS_2025.forEach(item => {
    const qty = item.installQty[lineKey];
    if (qty !== undefined && qty > 0) {
      const safetyStock = Math.max(2, Math.ceil(qty * 0.2));
      const currentStock = Math.max(safetyStock, qty);
      stockQty[item.drawingNo] = currentStock;
    }
  });
  return stockQty;
};

// -------------------------------------------------------------
// 2. PRODUCTION LINE ACTIVE CONFIGURATIONS
// -------------------------------------------------------------
export const INITIAL_LINE_CONFIGS: LineActiveConfiguration[] = [
  {
    id: 'CFG-E1-001',
    lineId: 'E1',
    lineName: 'Fin Press Line E1',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E1 (OAK 100T)',
    mainFinDie: 'Fin Die E1 (Ø7 PCM Slit)',
    dieCode: 'FD-E1-07',
    dieName: 'Fin Die E1 (Ø7 PCM Slit)',
    tubeSize: 'Ø7',
    rowsCount: 60,
    columnsCount: 3,
    pathsCount: '3P',
    finType: 'Slit (half)',
    material: 'PCM',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Initial production baseline setup for Ø7 PCM line',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Standard high-speed condenser line',
    installedPartQuantities: getLineInstalledQuantities('e1', 'E1'),
    stockQuantities: getLineStockQuantities('e1', 'E1')
  },
  {
    id: 'CFG-E2-001',
    lineId: 'E2',
    lineName: 'Fin Press Line E2',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E2 (HIDAKA 80T)',
    mainFinDie: 'Fin Die E2 (Ø5 GOLD Slit)',
    dieCode: 'FD-E2-05',
    dieName: 'Fin Die E2 (Ø5 GOLD Slit)',
    tubeSize: 'Ø5',
    rowsCount: 68,
    columnsCount: 3,
    pathsCount: '3P',
    finType: 'Slit (half)',
    material: 'GOLD',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Initial production baseline for Ø5 Gold high efficiency coil',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Micro-groove high efficiency gold fin',
    installedPartQuantities: getLineInstalledQuantities('e2', 'E2'),
    stockQuantities: getLineStockQuantities('e2', 'E2')
  },
  {
    id: 'CFG-E3-1-001',
    lineId: 'E3-1',
    lineName: 'Fin Press Line E3-1',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E3-1 (OAK 100T)',
    mainFinDie: 'Fin Die E3-1 (Ø7 PCM Slit)',
    dieCode: 'FD-E31-07',
    dieName: 'Fin Die E3-1 (Ø7 PCM Slit)',
    tubeSize: 'Ø7',
    rowsCount: 42,
    columnsCount: 4,
    pathsCount: '4P',
    finType: 'Slit (half)',
    material: 'PCM',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Evaporator line tooling 1 baseline',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Evaporator line tooling 1',
    installedPartQuantities: getLineInstalledQuantities('e3_1', 'E3-1'),
    stockQuantities: getLineStockQuantities('e3_1', 'E3-1')
  },
  {
    id: 'CFG-E3-2-001',
    lineId: 'E3-2',
    lineName: 'Fin Press Line E3-2',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E3-2 (HIDAKA 100T)',
    mainFinDie: 'Fin Die E3-2 (Ø7 GOLD Lover)',
    dieCode: 'FD-E32-07',
    dieName: 'Fin Die E3-2 (Ø7 GOLD Lover)',
    tubeSize: 'Ø7',
    rowsCount: 42,
    columnsCount: 4,
    pathsCount: '4P',
    finType: 'Lover',
    material: 'GOLD',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Louvered gold fin tooling baseline',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Louvered gold fin tooling',
    installedPartQuantities: getLineInstalledQuantities('e3_2', 'E3-2'),
    stockQuantities: getLineStockQuantities('e3_2', 'E3-2')
  },
  {
    id: 'CFG-E3-3-001',
    lineId: 'E3-3',
    lineName: 'Fin Press Line E3-3',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E3-3 (OAK 100T)',
    mainFinDie: 'Fin Die E3-3 (Ø7 GOLD Wide +)',
    dieCode: 'FD-E33-07',
    dieName: 'Fin Die E3-3 (Ø7 GOLD Wide +)',
    tubeSize: 'Ø7',
    rowsCount: 42,
    columnsCount: 4,
    pathsCount: '4P',
    finType: 'Wide +',
    material: 'GOLD',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Wide lower 4P pitch fin die baseline',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Wide lower 4P pitch fin die',
    installedPartQuantities: getLineInstalledQuantities('e3_3', 'E3-3'),
    stockQuantities: getLineStockQuantities('e3_3', 'E3-3')
  },
  {
    id: 'CFG-E4-001',
    lineId: 'E4',
    lineName: 'Fin Press Line E4',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E4 (HIDAKA 80T)',
    mainFinDie: 'Fin Die E4 (Ø5 Bare Slit)',
    dieCode: 'FD-E4-05',
    dieName: 'Fin Die E4 (Ø5 Bare Slit)',
    tubeSize: 'Ø5',
    rowsCount: 68,
    columnsCount: 3,
    pathsCount: '3P',
    finType: 'Slit (half)',
    material: 'BARE',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Standard bare aluminum coil line baseline',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Standard bare aluminum coil line',
    installedPartQuantities: getLineInstalledQuantities('e4', 'E4'),
    stockQuantities: getLineStockQuantities('e4', 'E4')
  },
  {
    id: 'CFG-E5-001',
    lineId: 'E5',
    lineName: 'Fin Press Line E5',
    configurationSlot: 'SLOT-01 (Primary Run)',
    machineId: 'PRESS-E5 (OAK 100T)',
    mainFinDie: 'Fin Die E5 (Ø5 Bare Slit)',
    dieCode: 'FD-E5-05',
    dieName: 'Fin Die E5 (Ø5 Bare Slit)',
    tubeSize: 'Ø5',
    rowsCount: 66,
    columnsCount: 3,
    pathsCount: '3P',
    finType: 'Slit (half)',
    material: 'BARE',
    thicknessMm: 0.10,
    effectiveFrom: '2025-01-01T08:00',
    status: 'ACTIVE',
    isActive: true,
    defaultSpm: 120,
    revision: 'Rev 1.0',
    versionNumber: 1,
    reasonForChange: 'Standard bare aluminum coil line baseline',
    approvedBy: 'Somchai Prasert',
    approvedAt: '2025-01-01T08:00',
    notes: 'Standard bare aluminum coil line',
    installedPartQuantities: getLineInstalledQuantities('e5', 'E5'),
    stockQuantities: getLineStockQuantities('e5', 'E5')
  }
];

// -------------------------------------------------------------
// 3. PART LIFE STANDARDS (70 Canonical Parts + Line-Scoped)
// -------------------------------------------------------------
export const INITIAL_PART_LIFE_STANDARDS: PartLifeStandard[] = [];

// 3.1 First: Add Canonical 70 Part Life Standards (Direct 1:1 match with Drawing No)
MOLD_DIE_MASTER_ITEMS_2025.forEach((item) => {
  const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose') || item.regrindStandard.note.toLowerCase().includes('dispose');
  const perGrind = item.regrindStandard.perGrindMm;
  const totalGrindNum = parseFloat(item.regrindStandard.totalGrindMm) || 0;
  const cyclesNum = parseInt(item.regrindStandard.regrindCycles) || (isDisposable ? 0 : 15);
  const avgLifeM = Number(item.shotLifeCycle.e1_pcm || item.shotLifeCycle.e2_gold || item.shotLifeCycle.e3_1_pcm || 5.0);

  INITIAL_PART_LIFE_STANDARDS.push({
    id: `STD-${item.drawingNo}`,
    partCode: item.drawingNo,
    configKey: {
      lineId: 'E1',
      configurationId: 'CFG-ALL-001',
      dieCode: 'FD-CANONICAL',
      finType: 'All',
      material: 'ALL',
      thicknessMm: 0.10,
      tubeSize: item.partName.includes('Ø5') ? 'Ø5' : item.partName.includes('Ø7') ? 'Ø7' : 'BOTH',
      partCode: item.drawingNo,
      position: 'ALL',
      effectiveDate: '2025-01-31'
    },
    compositeKeyString: `ALL|CFG-ALL-001|FD-ALL-01|All|ALL|0.10mm|${item.partName.includes('Ø5') ? 'Ø5' : 'Ø7'}|${item.drawingNo}|ALL|2025-01-31`,
    partName: item.partName,
    stagePunchDie: item.stage,
    lifeLimitShots: Math.round(avgLifeM * 1_000_000),
    shotLifeStandards: {
      'E1': Math.round(Number(item.shotLifeCycle.e1_pcm ?? avgLifeM) * 1_000_000),
      'E2': Math.round(Number(item.shotLifeCycle.e2_gold ?? avgLifeM) * 1_000_000),
      'E3-1': Math.round(Number(item.shotLifeCycle.e3_1_pcm ?? avgLifeM) * 1_000_000),
      'E3-2': Math.round(Number(item.shotLifeCycle.e3_2_gold ?? avgLifeM) * 1_000_000),
      'E3-3': Math.round(Number(item.shotLifeCycle.e3_3_gold ?? avgLifeM) * 1_000_000),
      'E4': Math.round(Number(item.shotLifeCycle.e4_bare ?? avgLifeM) * 1_000_000),
      'E5': Math.round(Number(item.shotLifeCycle.e5_bare ?? avgLifeM) * 1_000_000),
      'E6': Math.round(Number(item.shotLifeCycle.e6_pcm ?? avgLifeM) * 1_000_000)
    },
    regrindStandard: {
      oneTimeRegrindMm: isDisposable ? 'Dispose of after 1 use' : perGrind,
      totalRegrindMm: totalGrindNum,
      maxRegrindCount: cyclesNum,
      disposeAfterUse: isDisposable
    },
    specialNotes: item.regrindStandard.note,
    newSpecMm: item.newSpecMm,
    scrapLimitMm: item.scrapLimitMm,
    createdBy: 'Somchai Prasert',
    createdAt: '2025-01-31T08:00:00Z',
    updatedAt: '2025-01-31T08:00:00Z',
    isImportedSeed: true
  } as any);
});

// 3.2 Second: Add Line-Scoped variants for line-specific queries
MOLD_DIE_MASTER_ITEMS_2025.forEach((item) => {
  const activeLines = getActiveLinesForPart(item);
  activeLines.forEach((lineId) => {
    const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose') || item.regrindStandard.note.toLowerCase().includes('dispose');
    const perGrind = item.regrindStandard.perGrindMm;
    const totalGrindNum = parseFloat(item.regrindStandard.totalGrindMm) || 0;
    const cyclesNum = parseInt(item.regrindStandard.regrindCycles) || (isDisposable ? 0 : 10);
    const avgLifeM = Number(item.shotLifeCycle.e1_pcm || item.shotLifeCycle.e2_gold || 5.0);

    const linePartCode = `${lineId}-${item.drawingNo}`;
    
    let keyForLife = lineId.replace('-', '_').toLowerCase() as keyof typeof item.shotLifeCycle;
    if (lineId === 'E3-1') keyForLife = 'e3_1_pcm';
    if (lineId === 'E3-2') keyForLife = 'e3_2_gold';
    if (lineId === 'E3-3') keyForLife = 'e3_3_gold';
    if (lineId === 'E4') keyForLife = 'e4_bare';
    if (lineId === 'E5') keyForLife = 'e5_bare';
    if (lineId === 'E1') keyForLife = 'e1_pcm';
    if (lineId === 'E2') keyForLife = 'e2_gold';

    const lifeLimitM = Number(item.shotLifeCycle[keyForLife] || avgLifeM);

    INITIAL_PART_LIFE_STANDARDS.push({
      id: `STD-${linePartCode}`,
      partCode: linePartCode,
      configKey: {
        lineId: lineId as any,
        configurationId: `CFG-${lineId}-001`,
        dieCode: `FD-${lineId}-01`,
        finType: 'All',
        material: 'ALL',
        thicknessMm: 0.10,
        tubeSize: item.partName.includes('Ø5') ? 'Ø5' : item.partName.includes('Ø7') ? 'Ø7' : 'BOTH',
        partCode: linePartCode,
        position: 'ALL',
        effectiveDate: '2025-01-31'
      },
      compositeKeyString: `${lineId}|CFG-${lineId}-001|FD-${lineId}-01|All|ALL|0.10mm|${item.partName.includes('Ø5') ? 'Ø5' : 'Ø7'}|${linePartCode}|ALL|2025-01-31`,
      partName: item.partName,
      stagePunchDie: item.stage,
      lifeLimitShots: Math.round(lifeLimitM * 1_000_000),
      shotLifeStandards: {
        'E1': Math.round(Number(item.shotLifeCycle.e1_pcm ?? avgLifeM) * 1_000_000),
        'E2': Math.round(Number(item.shotLifeCycle.e2_gold ?? avgLifeM) * 1_000_000),
        'E3-1': Math.round(Number(item.shotLifeCycle.e3_1_pcm ?? avgLifeM) * 1_000_000),
        'E3-2': Math.round(Number(item.shotLifeCycle.e3_2_gold ?? avgLifeM) * 1_000_000),
        'E3-3': Math.round(Number(item.shotLifeCycle.e3_3_gold ?? avgLifeM) * 1_000_000),
        'E4': Math.round(Number(item.shotLifeCycle.e4_bare ?? avgLifeM) * 1_000_000),
        'E5': Math.round(Number(item.shotLifeCycle.e5_bare ?? avgLifeM) * 1_000_000),
        'E6': Math.round(Number(item.shotLifeCycle.e6_pcm ?? avgLifeM) * 1_000_000)
      },
      regrindStandard: {
        oneTimeRegrindMm: isDisposable ? 'Dispose' : perGrind,
        totalRegrindMm: totalGrindNum,
        maxRegrindCount: cyclesNum,
        disposeAfterUse: isDisposable
      },
      specialNotes: item.regrindStandard.note,
      newSpecMm: item.newSpecMm,
      scrapLimitMm: item.scrapLimitMm,
      createdBy: 'Somchai Prasert',
      createdAt: '2025-01-31T08:00:00Z',
      updatedAt: '2025-01-31T08:00:00Z',
      isImportedSeed: true
    } as any);
  });
});

// -------------------------------------------------------------
// 4. REGRIND MASTER STANDARDS
// -------------------------------------------------------------
export const INITIAL_REGRIND_MASTER_STANDARDS: RegrindMasterStandard[] = [];
MOLD_DIE_MASTER_ITEMS_2025.forEach((item) => {
  const activeLines = getActiveLinesForPart(item);
  activeLines.forEach((lineId) => {
    const linePartCode = `${lineId}-${item.drawingNo}`;
    const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose') || item.regrindStandard.note.toLowerCase().includes('dispose');
    const perGrindNum = parseFloat(item.regrindStandard.perGrindMm) || 0.10;
    const totalGrindNum = parseFloat(item.regrindStandard.totalGrindMm) || (isDisposable ? 0 : 1.50);
    const cyclesNum = parseInt(item.regrindStandard.regrindCycles) || (isDisposable ? 0 : 15);
    const nominalLength = 45.00;

    INITIAL_REGRIND_MASTER_STANDARDS.push({
      id: `RGD-STD-${linePartCode}`,
      partCode: linePartCode,
      partName: item.partName,
      stagePunchDie: item.stage,
      nominalLengthMm: nominalLength,
      grindingAmountPerTimeMm: perGrindNum,
      grindMinMm: isDisposable ? 0 : 0.08,
      grindMaxMm: isDisposable ? 0 : 0.20,
      totalGrindingAllowanceMm: totalGrindNum,
      minAllowedLengthMm: Number((nominalLength - totalGrindNum).toFixed(2)),
      maxRegrindCount: cyclesNum,
      regrindAllowed: !isDisposable,
      disposeAfterOneUse: isDisposable,
      inspectionRequirements: isDisposable ? 'Visual inspection for defects. Dispose after run.' : 'Visual wear check, burr inspection, surface roughness Ra <= 0.20 µm.',
      notes: item.regrindStandard.note
    });
  });
});

// -------------------------------------------------------------
// 5. SPARE STOCKS
// -------------------------------------------------------------
export const INITIAL_SPARE_STOCKS: SpareStockItem[] = [];

// 5.1 First: Canonical Stock for each 70 tools
MOLD_DIE_MASTER_ITEMS_2025.forEach((item, idx) => {
  const totalInstalled = item.installQty.totalQty || 0;
  const safetyStock = Math.max(2, Math.ceil(totalInstalled * 0.2));
  const currentStock = Math.max(safetyStock, totalInstalled);

  INITIAL_SPARE_STOCKS.push({
    id: `STK-${item.drawingNo}`,
    partCode: item.drawingNo,
    partName: item.partName,
    specification: `${item.stage} tooling component (${item.drawingNo})`,
    warehouseLocation: `RACK-MAIN-${String((idx % 12) + 1).padStart(2, '0')}`,
    onHandQuantity: currentStock,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    availableQuantity: currentStock,
    minimumStock: safetyStock,
    maximumStock: Math.max(currentStock * 2, 20),
    requiredQuantityPerFullReplacement: totalInstalled,
    replacementCoverage: totalInstalled > 0 ? Number((currentStock / totalInstalled).toFixed(2)) : 1.0,
    stockStatus: 'AVAILABLE',
    purchaseRequirementStatus: 'NOT REQUIRED',
    prNumber: '',
    prDate: '',
    prApprovalStatus: 'N/A',
    poNumber: '',
    poDate: '',
    supplier: 'MISUMI THAILAND / SAN-EI',
    orderedQuantity: 0,
    confirmedQuantity: 0,
    expectedDeliveryDate: '',
    actualDeliveryDate: '',
    procurementStatus: 'NOT REQUIRED',
    buyer: 'Thanaporn Srisuk (PUR-01)',
    note: item.regrindStandard.note || 'Standard stock in tool room.',
    forecastReplacementDate: '',
    deliveryRiskDays: 0,
    hasDeliveryRisk: false,
    combinedRisk: 'NORMAL',
    stageName: item.stage,
    tubeSize: item.partName.includes('Ø5') ? 'Ø5' : item.partName.includes('Ø7') ? 'Ø7' : 'BOTH',
    unitCostThb: item.partName.toUpperCase().includes('DIE') ? 18000 : 12000,
    unitPriceThb: item.partName.toUpperCase().includes('DIE') ? 18000 : 12000,
    currentStockQty: currentStock,
    backupTargetQty: totalInstalled,
    safetyStockMin: safetyStock,
    safetyStockQty: safetyStock,
    onOrderQty: 0,
    orderStatus: 'NOT REQUIRED',
    storageBin: `BIN-${String((idx % 24) + 1).padStart(2, '0')}`
  } as any);
});

// 5.2 Second: Line-scoped spare stock
MOLD_DIE_MASTER_ITEMS_2025.forEach((item, idx) => {
  const activeLines = getActiveLinesForPart(item);
  activeLines.forEach((lineId) => {
    const lineKey = lineId.toLowerCase().replace('-', '_') as 'e1' | 'e2' | 'e3_1' | 'e3_2' | 'e3_3' | 'e4' | 'e5';
    const totalInstalled = item.installQty[lineKey] || 0;
    const safetyStock = Math.max(2, Math.ceil(totalInstalled * 0.2));
    const currentStock = Math.max(safetyStock, totalInstalled);

    const linePartCode = `${lineId}-${item.drawingNo}`;

    INITIAL_SPARE_STOCKS.push({
      id: `STK-${linePartCode}`,
      partCode: linePartCode,
      partName: item.partName,
      specification: `[${lineId}] ${item.stage} tooling component (${item.drawingNo})`,
      warehouseLocation: `RACK-${lineId}-${String((idx % 12) + 1).padStart(2, '0')}`,
      onHandQuantity: currentStock,
      reservedQuantity: 0,
      quarantineQuantity: 0,
      availableQuantity: currentStock,
      minimumStock: safetyStock,
      maximumStock: Math.max(currentStock * 2, 20),
      requiredQuantityPerFullReplacement: totalInstalled,
      replacementCoverage: totalInstalled > 0 ? Number((currentStock / totalInstalled).toFixed(2)) : 1.0,
      stockStatus: 'AVAILABLE',
      purchaseRequirementStatus: 'NOT REQUIRED',
      prNumber: '',
      prDate: '',
      prApprovalStatus: 'N/A',
      poNumber: '',
      poDate: '',
      supplier: 'MISUMI THAILAND / SAN-EI',
      orderedQuantity: 0,
      confirmedQuantity: 0,
      expectedDeliveryDate: '',
      actualDeliveryDate: '',
      procurementStatus: 'NOT REQUIRED',
      buyer: 'Thanaporn Srisuk (PUR-01)',
      note: item.regrindStandard.note || 'Standard stock in tool room.',
      forecastReplacementDate: '',
      deliveryRiskDays: 0,
      hasDeliveryRisk: false,
      combinedRisk: 'NORMAL',
      stageName: item.stage,
      tubeSize: item.partName.includes('Ø5') ? 'Ø5' : item.partName.includes('Ø7') ? 'Ø7' : 'BOTH',
      unitCostThb: item.partName.toUpperCase().includes('DIE') ? 18000 : 12000,
      unitPriceThb: item.partName.toUpperCase().includes('DIE') ? 18000 : 12000,
      currentStockQty: currentStock,
      backupTargetQty: totalInstalled,
      safetyStockMin: safetyStock,
      safetyStockQty: safetyStock,
      onOrderQty: 0,
      orderStatus: 'NOT REQUIRED',
      supplierName: 'MISUMI THAILAND / SAN-EI',
      leadTimeDays: 20,
      storageLocation: `RACK-${lineId}-${String((idx % 12) + 1).padStart(2, '0')}`,
      isImportedSeed: true
    } as any);
  });
});

// -------------------------------------------------------------
// 6. LIVE MONITORING DATA (LINE E1 - GO-LIVE BASELINE 0 SHOTS)
// -------------------------------------------------------------
const e1InstalledItems = MOLD_DIE_MASTER_ITEMS_2025.filter(i => (i.installQty.e1 || 0) > 0);

export const INITIAL_LIVE_DATA_E1: LineLiveMonitoringData = {
  lineId: 'E1',
  lineName: 'Fin Press Line E1',
  machineStatus: 'IDLE',
  machineShotTotal: 0,
  shiftShot: 0,
  dailyShot: 0,
  monthlyShot: 0,
  shotSignal: 'NORMAL',
  lastUpdate: new Date().toISOString().replace('T', ' ').slice(0, 19),
  activeConfig: INITIAL_LINE_CONFIGS[0],
  dataSource: 'NO_DATA',
  dataFreshness: 'OFFLINE',
  items: e1InstalledItems.map((item, idx) => {
    const lifeLimitShots = Math.round(Number(item.shotLifeCycle.e1_pcm || 5.0) * 1_000_000);
    const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose');
    const regrindCycles = parseInt(item.regrindStandard.regrindCycles) || (isDisposable ? 0 : 10);

    return {
      slotId: `SLOT-E1-${String(idx + 1).padStart(2, '0')}`,
      partCode: `E1-${item.drawingNo}`,
      partName: item.partName,
      stagePunchDie: item.stage,
      position: `${item.stage} Slot ${idx + 1}`,
      installQty: item.installQty.e1 || 0,
      backupQty: item.installQty.e1 || 0,
      lifeLimit: lifeLimitShots,
      currentShot: 0,
      lastChangeShot: 0,
      usagePercent: 0,
      remainingShot: lifeLimitShots,
      regrindCount: 0,
      totalMmGround: 0,
      maxRegrindCount: regrindCycles,
      regrindSpec: item.regrindStandard.perGrindMm,
      orderStatus: 'NOT REQUIRED',
      alertStatus: 'NORMAL',
      daysRemainingForecast: Math.max(1, Math.round(lifeLimitShots / 250000)),
      configKeyString: `E1|CFG-E1-001|FD-E1-07|Slit (half)|PCM|0.10mm|Ø7|E1-${item.drawingNo}|ALL|2025-01-31`
    };
  })
};

// -------------------------------------------------------------
// 7. CLEAN REPLACEMENT & REGRIND HISTORY (GO-LIVE READY)
// -------------------------------------------------------------
export const INITIAL_REPLACEMENT_HISTORY: ReplacementRecord[] = [];

export const INITIAL_REGRIND_RECORDS: RegrindingRecord[] = [];

export const INITIAL_INSPECTIONS: ConditionInspectionRecord[] = [];

export const INITIAL_SHOT_LOGS: ShotEntryRecord[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-GO-LIVE-001',
    auditId: 'AUD-GO-LIVE-INIT',
    module: 'LINE_CONFIG',
    recordId: 'CFG-GO-LIVE-001',
    action: 'CONFIGURATION_ACTIVATION',
    fieldChanged: 'systemStatus',
    oldValue: 'TEST_MODE',
    newValue: 'GO_LIVE_CLEAN_BASELINE',
    reason: 'System initialization and operational data reset (Set 0) for Factory Go-Live deployment',
    user: 'System Admin / IT Team',
    userId: 'USR-001',
    userName: 'Somchai Prasert',
    role: 'SYSTEM_ADMIN',
    userRole: 'SYSTEM_ADMIN',
    dateTime: new Date().toISOString(),
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    ipReference: '127.0.0.1',
    sessionReference: 'SES-GO-LIVE-01',
    lineId: 'E1',
    actionCategory: 'CONFIGURATION',
    details: 'System initialized to clean Go-Live baseline state with 0 shots and preserved Die Parts Master Data Dictionary.',
    detailsTh: 'ตั้งค่าระบบเริ่มต้นเป็น Set 0 พร้อมใช้งานจริงในโรงงาน คงข้อมูลมาตรฐาน Die Parts Master Data Dictionary ครบถ้วน'
  }
];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  language: 'DUAL',
  warningThresholdPercent: 70,
  prepareThresholdPercent: 85,
  criticalThresholdPercent: 95,
  autoShotPulseIntervalSec: 3,
  autoPulseIncrement: 45,
  maxShotsPerShift: 150000,
  allowMultiEntryPerShift: false,
  shift1Start: '08:00',
  shift2Start: '20:00',
  theme: 'dark',
  enableSoundAlerts: true,
  tvAutoCycleIntervalSec: 15,
  stageDisplayMode: 'DETAILED'
};

export const DEFAULT_PLC_CONFIG: PLCConfig = {
  connectionMode: 'SIMULATION',
  protocol: 'MODBUS_TCP',
  gatewayId: 'GW-EDGE-01',
  gatewayName: 'Fin Press Main Edge Gateway #1',
  gatewayUrl: 'http://192.168.10.200:8080',
  ip: '192.168.10.50',
  port: 502,
  slaveId: 1,
  unitId: 1,
  pollingIntervalMs: 1000,
  connectionTimeoutMs: 3000,
  retryIntervalMs: 2000,
  maxRetry: 5,
  heartbeatIntervalMs: 5000,
  apiToken: 'jwt_edge_gateway_token_prod_sec_v1',
  mqttBrokerUrl: 'mqtt://192.168.10.201:1883',
  mqttClientId: 'findie_shot_monitor_sub_01',
  mqttTopicPrefix: 'factory/finpress/telemetry',
  tlsEnabled: false,
  readOnlyMode: true,
  wsUrl: 'ws://192.168.10.200:1880/ws/plc',
  restApiUrl: 'http://192.168.10.200:8080/api/v1/telemetry/shots',
  uiThrottleMs: 1000,
  isAutoPolling: false,
  lineRegisters: {
    'E1': { lineId: 'E1', lineName: 'LINE E1 (Ø7 Slit)', address: '%MW100', active: true, currentVal: 0, lastPulse: '-' },
    'E2': { lineId: 'E2', lineName: 'LINE E2 (Ø5 Slit)', address: '%MW100', active: true, currentVal: 0, lastPulse: '-' },
    'E3-1': { lineId: 'E3-1', lineName: 'LINE E3-1 (Slit 3P)', address: 'DB100.DBD0', active: true, currentVal: 0, lastPulse: '-' },
    'E3-2': { lineId: 'E3-2', lineName: 'LINE E3-2 (WL+ 4P)', address: 'DB100.DBD4', active: true, currentVal: 0, lastPulse: '-' },
    'E3-3': { lineId: 'E3-3', lineName: 'LINE E3-3 (Corr 4P)', address: 'DB100.DBD8', active: true, currentVal: 0, lastPulse: '-' },
    'E4': { lineId: 'E4', lineName: 'LINE E4 (Ø5 Slit)', address: 'D1000', active: true, currentVal: 0, lastPulse: '-' },
    'E5': { lineId: 'E5', lineName: 'LINE E5 (Ø5 Slit)', address: 'DM100', active: true, currentVal: 0, lastPulse: '-' }
  }
};

export const DEFAULT_FACTORY_PLC_METERS: Record<ProductionLineId, number> = {
  'E1': 153474176,
  'E2': 142890520,
  'E3-1': 98450120,
  'E3-2': 112450890,
  'E3-3': 87620340,
  'E4': 168920150,
  'E5': 135400980
};

export const INITIAL_DOWNTIME_LOGS: DowntimeLogEntry[] = [];

export const INITIAL_PLC_REGISTER_MAPPINGS: Record<ProductionLineId, PLCRegisterMapping> = {
  'E1': {
    lineId: 'E1',
    lineName: 'Fin Press Line E1',
    machineModel: 'OAK FP-100 (100T)',
    protocol: 'MODBUS_TCP',
    ipAddress: '192.168.10.51',
    port: 502,
    unitId: 1,
    registerAddress: '%MW100',
    tagName: 'PLC_E1_TotalShot',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E2': {
    lineId: 'E2',
    lineName: 'Fin Press Line E2',
    machineModel: 'OAK FP-100 (100T)',
    protocol: 'MODBUS_TCP',
    ipAddress: '192.168.10.52',
    port: 502,
    unitId: 1,
    registerAddress: '%MW100',
    tagName: 'PLC_E2_TotalShot',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E3-1': {
    lineId: 'E3-1',
    lineName: 'Fin Press Line E3-1',
    machineModel: 'HIDAKA HP-80 (80T)',
    protocol: 'SIEMENS_S7',
    ipAddress: '192.168.10.53',
    port: 102,
    unitId: 1,
    dbNumber: 100,
    registerAddress: 'DB100.DBD0',
    tagName: 'DB_E3_1_ShotCount',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E3-2': {
    lineId: 'E3-2',
    lineName: 'Fin Press Line E3-2',
    machineModel: 'HIDAKA HP-80 (80T)',
    protocol: 'SIEMENS_S7',
    ipAddress: '192.168.10.53',
    port: 102,
    unitId: 1,
    dbNumber: 100,
    registerAddress: 'DB100.DBD4',
    tagName: 'DB_E3_2_ShotCount',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E3-3': {
    lineId: 'E3-3',
    lineName: 'Fin Press Line E3-3',
    machineModel: 'HIDAKA HP-80 (80T)',
    protocol: 'SIEMENS_S7',
    ipAddress: '192.168.10.53',
    port: 102,
    unitId: 1,
    dbNumber: 100,
    registerAddress: 'DB100.DBD8',
    tagName: 'DB_E3_3_ShotCount',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E4': {
    lineId: 'E4',
    lineName: 'Fin Press Line E4',
    machineModel: 'OAK FP-150 (150T)',
    protocol: 'MITSUBISHI_MC',
    ipAddress: '192.168.10.54',
    port: 5000,
    unitId: 1,
    registerAddress: 'D1000-D1001',
    tagName: 'D_E4_ShotAccum',
    dataType: 'UINT32',
    wordOrder: 'BADC',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  },
  'E5': {
    lineId: 'E5',
    lineName: 'Fin Press Line E5',
    machineModel: 'OAK FP-150 (150T)',
    protocol: 'OMRON_FINS',
    ipAddress: '192.168.10.55',
    port: 9600,
    unitId: 1,
    registerAddress: 'DM100-DM101',
    tagName: 'DM_E5_ShotAccum',
    dataType: 'UINT32',
    wordOrder: 'ABCD',
    scaleFactor: 1,
    pollIntervalMs: 1000,
    maxAllowedDeltaPerInterval: 500,
    readOnly: true,
    enabled: true
  }
};

export const INITIAL_GATEWAY_STATUS: GatewayStatusInfo = {
  gatewayId: 'GW-EDGE-01',
  gatewayName: 'Fin Press Main Edge Gateway #1',
  connectionMode: 'REST_API_GATEWAY',
  isOnline: false,
  lastHeartbeat: null as any,
  latencyMs: 0,
  connectedLinesCount: 0,
  totalLinesCount: 7,
  activeProtocol: 'REST_API_GATEWAY',
  firmwareVersion: 'v2.4.1-edge-arm64',
  uptimeSeconds: 0,
  cpuUsagePercent: 0,
  memoryUsagePercent: 0,
  bufferPendingRecordsCount: 0,
  syncStatus: 'OFFLINE',
  readOnlyEnforced: true,
  lastError: 'WAITING_FOR_GATEWAY'
};

export const INITIAL_SYSTEM_ALERTS: SystemAlertItem[] = [
  {
    id: 'ALT-2026-001',
    level: 'CRITICAL',
    title: 'Fin Die Part Life Alert',
    titleTh: 'แจ้งเตือนชิ้นส่วนแม่พิมพ์ใกล้หมดอายุ',
    message: 'System running with standard 12 stages configuration.',
    lineId: 'E1',
    partCode: 'DWG-PB-001',
    source: 'PART_LIFE',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    isAcknowledged: false
  }
];
