import {
  AlertSeverity,
  LifeStatus,
  StockStatus,
  LifeStandardConfigKey,
  PartLifeStandard,
  PartLiveTrackingItem,
  LineActiveConfiguration,
  ProductionLineId,
  SpareStockItem
} from '../types';

/**
 * Builds the mandatory composite configuration key:
 * Line + Configuration ID + Die Code + Fin Type + Material + Thickness + Tube Size + Part Code + Position + Effective Date
 */
export function generateCompositeKey(key: Partial<LifeStandardConfigKey>): string {
  const line = key.lineId || 'ALL';
  const configId = key.configurationId || 'DEFAULT';
  const dieCode = key.dieCode || 'N/A';
  const finType = key.finType || 'Standard';
  const material = key.material || 'PCM';
  const thickness = key.thicknessMm !== undefined ? `${Number(key.thicknessMm).toFixed(2)}mm` : '0.10mm';
  const tube = key.tubeSize || 'Ø7';
  const part = key.partCode || 'N/A';
  const pos = key.position || 'ALL';
  const date = key.effectiveDate || '2025-01-31';

  return `${line}|${configId}|${dieCode}|${finType}|${material}|${thickness}|${tube}|${part}|${pos}|${date}`;
}

/**
 * Finds matching Part Life Standard using hierarchical configuration key resolution:
 * 1. Exact match on all 10 composite keys
 * 2. Match with lineId = 'ALL' or position = 'ALL'
 * 3. Match with common material and tube size
 */
export function findMatchingLifeStandard(
  standards: PartLifeStandard[],
  activeConfig: LineActiveConfiguration | null,
  partCode: string,
  position: string = 'ALL'
): PartLifeStandard | null {
  if (!activeConfig || !standards || standards.length === 0) {
    return null;
  }

  const validStandards = standards.filter((s): s is PartLifeStandard => !!s && !!s.configKey);

  // 1. Exact Match
  const exact = validStandards.find(
    s =>
      s.configKey.lineId === activeConfig.lineId &&
      s.configKey.dieCode === activeConfig.dieCode &&
      s.configKey.material?.toUpperCase() === activeConfig.material?.toUpperCase() &&
      s.configKey.tubeSize === activeConfig.tubeSize &&
      s.configKey.partCode === partCode &&
      (s.configKey.position === position || s.configKey.position === 'ALL')
  );
  if (exact) return exact;

  // 2. Generic line match
  const genericLine = validStandards.find(
    s =>
      (s.configKey.lineId === 'ALL' || s.configKey.lineId === activeConfig.lineId) &&
      s.configKey.material?.toUpperCase() === activeConfig.material?.toUpperCase() &&
      s.configKey.tubeSize === activeConfig.tubeSize &&
      s.configKey.partCode === partCode
  );
  if (genericLine) return genericLine;

  // 3. Fallback on partCode + material
  const partMaterialMatch = validStandards.find(
    s =>
      s.configKey.partCode === partCode &&
      s.configKey.material?.toUpperCase() === activeConfig.material?.toUpperCase()
  );
  if (partMaterialMatch) return partMaterialMatch;

  // 4. Any standard for this part
  return validStandards.find(s => s.configKey.partCode === partCode) || null;
}

/**
 * Categorize life status strictly per specified industrial thresholds:
 * - NORMAL: 0% - 69.9% (<70%)
 * - WARNING: 70% - 84.9% (70-84%)
 * - PREPARE: 85% - 94.9% (85-94%)
 * - CRITICAL: 95% - 99.9% (95-99%)
 * - OVER_LIFE: >= 100%
 * - STANDARD_MISSING: missing standard
 * - DATA_ERROR: invalid baseline
 */
export function determineLifeStatus(
  usagePercent: number | null | undefined,
  isStandardMissing: boolean = false,
  isDataError: boolean = false,
  customThresholds?: {
    warningThresholdPercent?: number;
    prepareThresholdPercent?: number;
    criticalThresholdPercent?: number;
  }
): LifeStatus {
  if (isDataError) return 'DATA_ERROR';
  
  if (isStandardMissing || usagePercent === null || usagePercent === undefined || isNaN(usagePercent)) {
    return 'STANDARD_MISSING';
  }

  const warningTh = customThresholds?.warningThresholdPercent ?? 70;
  const prepareTh = customThresholds?.prepareThresholdPercent ?? 85;
  const criticalTh = customThresholds?.criticalThresholdPercent ?? 95;

  if (usagePercent >= 100) return 'OVER_LIFE';
  if (usagePercent >= criticalTh) return 'CRITICAL';
  if (usagePercent >= prepareTh) return 'PREPARE';
  if (usagePercent >= warningTh) return 'WARNING';
  
  return 'NORMAL';
}

export function determineAlertSeverity(
  usagePercent: number,
  warningTh: number = 70,
  prepareTh: number = 85,
  criticalTh: number = 95
): AlertSeverity {
  return determineLifeStatus(usagePercent, false, false, {
    warningThresholdPercent: warningTh,
    prepareThresholdPercent: prepareTh,
    criticalThresholdPercent: criticalTh
  });
}

/**
 * Calculate Available Quantity:
 * availableQuantity = onHandQuantity - reservedQuantity - quarantineQuantity
 */
export function calculateAvailableQuantity(
  onHandQuantity: number,
  reservedQuantity: number = 0,
  quarantineQuantity: number = 0
): number {
  return Math.max(0, (onHandQuantity || 0) - (reservedQuantity || 0) - (quarantineQuantity || 0));
}

/**
 * Calculate Replacement Coverage:
 * replacementCoverage = availableQuantity / requiredQuantityPerFullReplacement
 */
export function calculateReplacementCoverage(
  availableQuantity: number,
  requiredQuantityPerFullReplacement: number
): number {
  if (!requiredQuantityPerFullReplacement || requiredQuantityPerFullReplacement <= 0) return 0;
  return Number((availableQuantity / requiredQuantityPerFullReplacement).toFixed(2));
}

/**
 * Calculate Delivery Risk:
 * forecastReplacementDate compared with expectedDeliveryDate.
 * If expected delivery is later than forecast replacement:
 * show DELIVERY RISK and the number of days late.
 */
export function calculateDeliveryRisk(
  forecastReplacementDate?: string,
  expectedDeliveryDate?: string
): { hasDeliveryRisk: boolean; daysLate: number } {
  if (!forecastReplacementDate || !expectedDeliveryDate) {
    return { hasDeliveryRisk: false, daysLate: 0 };
  }

  const forecast = new Date(forecastReplacementDate);
  const delivery = new Date(expectedDeliveryDate);

  if (isNaN(forecast.getTime()) || isNaN(delivery.getTime())) {
    return { hasDeliveryRisk: false, daysLate: 0 };
  }

  const msDiff = delivery.getTime() - forecast.getTime();
  const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff > 0) {
    return { hasDeliveryRisk: true, daysLate: daysDiff };
  }

  return { hasDeliveryRisk: false, daysLate: 0 };
}

/**
 * Combine Life and Stock Risk Matrix:
 * - Life normal + Stock normal = NORMAL
 * - Life warning + Stock sufficient = WARNING
 * - Life prepare + Stock insufficient = CRITICAL SUPPLY
 * - Life critical + Stock zero = STOP RISK
 * - PO ETA later than forecast = DELIVERY RISK
 * 
 * Note: Keeps technical part-life calculation and procurement status separate.
 */
export function calculateCombinedRisk(
  lifeStatus: LifeStatus,
  stockStatus: StockStatus,
  hasDeliveryRisk: boolean,
  availableQty: number = 0,
  requiredPerChange: number = 1
): 'NORMAL' | 'WARNING' | 'CRITICAL SUPPLY' | 'STOP RISK' | 'DELIVERY RISK' {
  if (hasDeliveryRisk) {
    return 'DELIVERY RISK';
  }

  const isStockZero = stockStatus === 'NO_STOCK' || availableQty <= 0;
  const isStockInsufficient = isStockZero || stockStatus === 'LOW_STOCK' || availableQty < requiredPerChange;
  const isStockSufficient = !isStockInsufficient;

  if ((lifeStatus === 'CRITICAL' || lifeStatus === 'OVER_LIFE') && isStockZero) {
    return 'STOP RISK';
  }

  if (lifeStatus === 'PREPARE' && isStockInsufficient) {
    return 'CRITICAL SUPPLY';
  }

  if (lifeStatus === 'CRITICAL' || lifeStatus === 'OVER_LIFE') {
    return isStockZero ? 'STOP RISK' : 'CRITICAL SUPPLY';
  }

  if (lifeStatus === 'WARNING') {
    return isStockSufficient ? 'WARNING' : 'CRITICAL SUPPLY';
  }

  if (lifeStatus === 'NORMAL') {
    return isStockSufficient ? 'NORMAL' : 'WARNING';
  }

  return 'NORMAL';
}

/**
 * Determine Spare Stock readiness status:
 * - NO STOCK: availableQty === 0
 * - LOW STOCK: availableQty > 0 && availableQty < requiredQtyPerReplacement (or installQty)
 * - MINIMUM: availableQty >= requiredQtyPerReplacement && availableQty <= minimumStock
 * - AVAILABLE: availableQty > minimumStock
 * - STOCK DATA MISSING: when stockItem is undefined
 */
export function determineStockStatus(
  stockItem: SpareStockItem | undefined,
  installQty: number
): StockStatus {
  if (!stockItem) return 'STOCK_DATA_MISSING';
  const available = stockItem.availableQuantity !== undefined 
    ? stockItem.availableQuantity 
    : (stockItem.currentStockQty ?? 0);
  const minStock = stockItem.minimumStock ?? stockItem.safetyStockMin ?? installQty;
  const requiredQty = stockItem.requiredQuantityPerFullReplacement ?? installQty;

  if (available === 0) return 'NO_STOCK';
  if (available > 0 && available < requiredQty) return 'LOW_STOCK';
  if (available >= requiredQty && available <= minStock) return 'MINIMUM';
  return 'AVAILABLE';
}

/**
 * Calculate full part live tracking metrics with complete data integrity
 */
export function calculatePartMetrics(
  part: {
    slotId: string;
    partCode: string;
    partName: string;
    stagePunchDie: string;
    position: string;
    installQty: number;
    backupQty?: number;
    currentShot?: number;
    usedShot?: number;
    lastChangeShot?: number;
    shotAtLastChange?: number;
    regrindCount?: number;
    totalMmGround?: number;
    lifeLimit?: number;
  },
  activeConfig: LineActiveConfiguration | null,
  standards: PartLifeStandard[],
  stockItems: SpareStockItem[],
  dailyShotRate: number = 0
): PartLiveTrackingItem {
  const usedShotVal = part.usedShot !== undefined ? part.usedShot : (part.currentShot || 0);
  const shotAtLastChangeVal = part.shotAtLastChange !== undefined ? part.shotAtLastChange : (part.lastChangeShot || 0);

  // Baseline data validation (negative shots or corrupted integers)
  const isDataError = isNaN(usedShotVal) || usedShotVal < 0 || isNaN(shotAtLastChangeVal);

  const rawCode = (part.partCode || '').trim();
  const normCode = rawCode.toUpperCase();
  const strippedCode = normCode.replace(/^(E\d+(?:-\d+)?-)/i, '').trim();

  const standard = activeConfig ? findMatchingLifeStandard(standards, activeConfig, part.partCode, part.position) : null;
  const stock = stockItems.find(s => 
    s.partCode.toUpperCase() === normCode || 
    s.partCode.toUpperCase() === strippedCode ||
    (s.partName && part.partName && s.partName.trim().toLowerCase() === part.partName.trim().toLowerCase())
  );

  const totalStockQty = stock 
    ? (stock.availableQuantity !== undefined ? stock.availableQuantity : (stock.currentStockQty !== undefined ? stock.currentStockQty : stock.onHandQuantity)) 
    : (part.backupQty || 0);

  // Normalize line stock quantities lookup from activeConfig
  let lineStockQty: number | undefined = undefined;
  if (activeConfig && activeConfig.stockQuantities) {
    const normStockMap = Object.entries(activeConfig.stockQuantities).reduce((acc, [k, v]) => {
      const cleanK = k.trim().toUpperCase();
      acc[cleanK] = v;
      const strippedK = cleanK.replace(/^(E\d+(?:-\d+)?-)/i, '').trim();
      if (strippedK) acc[strippedK] = v;
      return acc;
    }, {} as Record<string, number>);

    if (normCode && normStockMap[normCode] !== undefined) {
      lineStockQty = normStockMap[normCode];
    } else if (strippedCode && normStockMap[strippedCode] !== undefined) {
      lineStockQty = normStockMap[strippedCode];
    } else if (stock && normStockMap[stock.partCode.trim().toUpperCase()] !== undefined) {
      lineStockQty = normStockMap[stock.partCode.trim().toUpperCase()];
    } else {
      lineStockQty = 0;
    }
  }

  // Normalize line installed part quantities lookup from activeConfig if installQty is not explicitly set
  let resolvedInstallQty = part.installQty;
  if (activeConfig && activeConfig.installedPartQuantities) {
    const normInstallMap = Object.entries(activeConfig.installedPartQuantities).reduce((acc, [k, v]) => {
      const cleanK = k.trim().toUpperCase();
      acc[cleanK] = v;
      const strippedK = cleanK.replace(/^(E\d+(?:-\d+)?-)/i, '').trim();
      if (strippedK) acc[strippedK] = v;
      return acc;
    }, {} as Record<string, number>);

    if (normCode && normInstallMap[normCode] !== undefined) {
      resolvedInstallQty = normInstallMap[normCode];
    } else if (strippedCode && normInstallMap[strippedCode] !== undefined) {
      resolvedInstallQty = normInstallMap[strippedCode];
    } else if (stock && normInstallMap[stock.partCode.trim().toUpperCase()] !== undefined) {
      resolvedInstallQty = normInstallMap[stock.partCode.trim().toUpperCase()];
    }
  }

  const availableSpare = lineStockQty !== undefined ? lineStockQty : (part.backupQty !== undefined ? part.backupQty : totalStockQty);
  const stockStatus = determineStockStatus(stock, resolvedInstallQty);
  const orderStatus = stock ? stock.orderStatus : 'NOT REQUIRED';
  const etaDeliveryDate = stock?.poEtaDate;

  const resolvedLifeLimit = standard?.lifeLimitShots || part.lifeLimit || 0;

  if (resolvedLifeLimit <= 0) {
    return {
      slotId: part.slotId,
      partCode: part.partCode,
      partName: part.partName,
      stagePunchDie: part.stagePunchDie,
      position: part.position,
      installQty: resolvedInstallQty,
      backupQty: availableSpare,
      availableSpare,
      lineStockQty,
      totalStockQty,
      lifeLimit: 0,
      currentShot: usedShotVal,
      usedShot: usedShotVal,
      lastChangeShot: shotAtLastChangeVal,
      shotAtLastChange: shotAtLastChangeVal,
      usagePercent: 0,
      remainingShot: 0,
      regrindCount: part.regrindCount || 0,
      totalMmGround: part.totalMmGround || 0,
      maxRegrindCount: 0,
      regrindSpec: !activeConfig ? 'CONFIGURATION MISSING' : 'STANDARD MISSING',
      lifeStatus: isDataError ? 'DATA_ERROR' : 'STANDARD_MISSING',
      stockStatus,
      orderStatus,
      alertStatus: isDataError ? 'DATA_ERROR' : 'STANDARD_MISSING',
      configKeyString: activeConfig ? generateCompositeKey({
        lineId: activeConfig.lineId,
        configurationId: activeConfig.id,
        dieCode: activeConfig.dieCode,
        finType: activeConfig.finType,
        material: activeConfig.material,
        thicknessMm: activeConfig.thicknessMm,
        tubeSize: activeConfig.tubeSize,
        partCode: part.partCode,
        position: part.position,
        effectiveDate: activeConfig.effectiveFrom
      }) : 'CONFIGURATION MISSING',
      isStandardMissing: true,
      isConfigMissing: !activeConfig,
      isDataError
    };
  }

  const lifeLimit = resolvedLifeLimit;
  const remainingShot = Math.max(0, lifeLimit - usedShotVal);
  const usagePercent = Math.min(100, Math.round((usedShotVal / lifeLimit) * 100));
  const lifeStatus = determineLifeStatus(usagePercent, false, isDataError);
  const alertStatus = lifeStatus;

  let daysRemainingForecast = 0;
  if (dailyShotRate > 0 && remainingShot > 0) {
    daysRemainingForecast = Math.ceil(remainingShot / dailyShotRate);
  }

  let deliveryRiskDays: number | undefined;
  if (stock && stock.poEtaDate && daysRemainingForecast > 0) {
    const today = new Date();
    const eta = new Date(stock.poEtaDate);
    const msDiff = eta.getTime() - today.getTime();
    const etaDaysFromNow = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    if (etaDaysFromNow > daysRemainingForecast) {
      deliveryRiskDays = etaDaysFromNow - daysRemainingForecast;
    }
  }

  const regrindSpec = standard?.regrindStandard?.disposeAfterUse
    ? 'Dispose after 1 use'
    : standard?.regrindStandard
      ? `${standard.regrindStandard?.oneTimeRegrindMm || '0.10'} mm (Max ${(Number(standard.regrindStandard?.totalRegrindMm) || 1.5).toFixed(2)} mm)`
      : 'Standard specification';

  return {
    slotId: part.slotId,
    partCode: part.partCode,
    partName: standard?.partName || part.partName,
    stagePunchDie: standard?.stagePunchDie || part.stagePunchDie,
    position: part.position,
    installQty: resolvedInstallQty,
    backupQty: availableSpare,
    availableSpare,
    lineStockQty,
    totalStockQty,
    lifeLimit,
    currentShot: usedShotVal,
    usedShot: usedShotVal,
    lastChangeShot: shotAtLastChangeVal,
    shotAtLastChange: shotAtLastChangeVal,
    usagePercent,
    remainingShot,
    regrindCount: part.regrindCount || 0,
    totalMmGround: part.totalMmGround || 0,
    maxRegrindCount: standard?.regrindStandard?.maxRegrindCount || 0,
    regrindSpec,
    lifeStatus,
    stockStatus,
    orderStatus,
    alertStatus,
    etaDeliveryDate,
    deliveryRiskDays,
    daysRemainingForecast,
    configKeyString: standard?.compositeKeyString || (activeConfig ? generateCompositeKey({
      lineId: activeConfig.lineId,
      configurationId: activeConfig.id,
      dieCode: activeConfig.dieCode,
      finType: activeConfig.finType,
      material: activeConfig.material,
      thicknessMm: activeConfig.thicknessMm,
      tubeSize: activeConfig.tubeSize,
      partCode: part.partCode,
      position: part.position,
      effectiveDate: activeConfig.effectiveFrom
    }) : 'STANDARD_DEFAULT'),
    isDataError
  };
}

/**
 * Priority sorting for table records:
 * 1. OVER LIFE
 * 2. CRITICAL
 * 3. PREPARE
 * 4. WARNING
 * 5. NORMAL
 * 6. STANDARD MISSING
 * 7. DATA ERROR
 * Secondary sort: usagePercent descending
 */
/**
 * Helper to calculate progressive die progressive rank based on physical progressive order:
 * 1. Pierce Punch
 * 2. Burring Punch
 * 3. Ironing Punch
 * 4. Ironing Die
 * 5. Louver Punch
 * 6. Louver Die
 * 7. Reflare Punch
 * 8. Reflare Die
 * 9. Row slit blade / Slit Blade
 * 10. Side cutting Punch
 * 11. Side cutting Die
 * 12. Cut off Punch
 * 13. Cut off Die
 */
export function getPartProgressiveRank(partName: string, stageName: string): number {
  const pName = (partName || '').toUpperCase();
  const sName = (stageName || '').toUpperCase();

  let stageRank = 999;
  let subRank = 99;

  if (sName.includes('PIERCE & BURRING') || pName.includes('PIERCE') || pName.includes('BURRING') || sName.includes('PIERCE') || sName.includes('BURRING')) {
    stageRank = 10;
    if (pName.includes('PIERCE PUNCH') || pName.includes('PIERCE P')) subRank = 1;
    else if (pName.includes('BURRING PUNCH') || pName.includes('BURRING P')) subRank = 2;
    else if (pName.includes('PIERCE DIE') || pName.includes('PIERCE D')) subRank = 3;
    else if (pName.includes('BURRING DIE') || pName.includes('BURRING D')) subRank = 4;
  } else if (sName.includes('IRONING') || pName.includes('IRONING')) {
    stageRank = 20;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('LOUVER') || pName.includes('LOUVER')) {
    stageRank = 30;
    if (pName.includes('PUNCH') || pName.includes('BLADE') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('REFLARE') || sName.includes('REFLAIRE') || sName.includes('REFALRE') || pName.includes('REFLARE') || pName.includes('REFLAIRE') || pName.includes('REFALRE')) {
    stageRank = 40;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('S5 CENTER NOTCH') || pName.includes('S5 CENTER NOTCH') || sName.includes('CENTER NOTCH')) {
    stageRank = 50;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('ROW SLIT') || sName.includes('SLIT') || pName.includes('ROW SLIT') || pName.includes('SLIT')) {
    stageRank = 60;
    if (pName.includes('BLADE') || pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('WIDE LOWER') || pName.includes('WIDE LOWER')) {
    stageRank = 70;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('CORNER CUT') || pName.includes('CORNER CUT')) {
    stageRank = 80;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('SIDE CUT') || sName.includes('SIDE CUTTING') || sName.includes('SIDE_CUT') || sName.includes('SIDECUT') || pName.includes('SIDE CUT')) {
    stageRank = 90;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('CUT OFF') || sName.includes('CUTOFF') || pName.includes('CUT OFF') || pName.includes('CUTOFF')) {
    stageRank = 100;
    if (pName.includes('PUNCH') || pName.includes('P')) subRank = 1;
    else if (pName.includes('DIE') || pName.includes('D')) subRank = 2;
  } else if (sName.includes('HITCH FEED') || sName.includes('FEED') || pName.includes('HITCH FEED') || pName.includes('FEED')) {
    stageRank = 110;
  }

  return stageRank * 100 + subRank;
}

export type TvSortMode = 'INDUSTRIAL_PRIORITY' | 'USAGE_DESC' | 'USAGE_ASC' | 'REMAINING_ASC' | 'STAGE_ORDER' | 'CUSTOM_SEQUENCE';

/**
 * Flexible sorting for TV monitoring table records:
 * - INDUSTRIAL_PRIORITY: OVER LIFE -> CRITICAL -> PREPARE -> WARNING -> NORMAL (default)
 * - USAGE_DESC: Usage % descending
 * - USAGE_ASC: Usage % ascending
 * - REMAINING_ASC: Remaining shots ascending (closest to replacement first)
 * - STAGE_ORDER: Stage / Part name order
 * - CUSTOM_SEQUENCE: Custom slot/sequence order
 */
export function sortTrackingItems(
  items: PartLiveTrackingItem[], 
  sortMode: TvSortMode | string = 'INDUSTRIAL_PRIORITY'
): PartLiveTrackingItem[] {
  const statusRank: Record<LifeStatus, number> = {
    'OVER_LIFE': 1,
    'CRITICAL': 2,
    'PREPARE': 3,
    'WARNING': 4,
    'NORMAL': 5,
    'STANDARD_MISSING': 6,
    'DATA_ERROR': 7
  };

  return [...items].sort((a, b) => {
    if (sortMode === 'USAGE_DESC') {
      return (b.usagePercent || 0) - (a.usagePercent || 0);
    }
    if (sortMode === 'USAGE_ASC') {
      return (a.usagePercent || 0) - (b.usagePercent || 0);
    }
    if (sortMode === 'REMAINING_ASC') {
      // Missing standard at the end
      if (a.isStandardMissing && !b.isStandardMissing) return 1;
      if (!a.isStandardMissing && b.isStandardMissing) return -1;
      return (a.remainingShot ?? 999999999) - (b.remainingShot ?? 999999999);
    }
    if (sortMode === 'STAGE_ORDER') {
      const rankA = getPartProgressiveRank(a.partName, a.stagePunchDie);
      const rankB = getPartProgressiveRank(b.partName, b.stagePunchDie);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.partName.localeCompare(b.partName);
    }
    if (sortMode === 'CUSTOM_SEQUENCE') {
      const parseSlot = (s: string) => {
        const num = parseInt((s || '').replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 999 : num;
      };
      return parseSlot(a.slotId) - parseSlot(b.slotId);
    }

    // Default: INDUSTRIAL_PRIORITY
    const statusA = a.lifeStatus || a.alertStatus || 'NORMAL';
    const statusB = b.lifeStatus || b.alertStatus || 'NORMAL';
    const rankA = statusRank[statusA] ?? 99;
    const rankB = statusRank[statusB] ?? 99;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return (b.usagePercent || 0) - (a.usagePercent || 0);
  });
}

/**
 * Summary card statistics derived dynamically from displayed items
 */
export function calculateSummaryStats(items: PartLiveTrackingItem[]) {
  const totalItems = items.length;
  let normalCount = 0;
  let warningCount = 0;
  let prepareCount = 0;
  let criticalCount = 0;
  let overLifeCount = 0;
  let lowStockCount = 0;
  let deliveryRiskCount = 0;

  for (const item of items) {
    const status = item.lifeStatus || item.alertStatus;
    if (status === 'NORMAL') normalCount++;
    else if (status === 'WARNING') warningCount++;
    else if (status === 'PREPARE') prepareCount++;
    else if (status === 'CRITICAL') criticalCount++;
    else if (status === 'OVER_LIFE') overLifeCount++;

    const stock = item.stockStatus;
    const spare = item.availableSpare ?? item.backupQty;
    if (stock === 'NO_STOCK' || stock === 'LOW_STOCK' || spare < item.installQty) {
      lowStockCount++;
    }

    if ((item.deliveryRiskDays || 0) > 0) {
      deliveryRiskCount++;
    }
  }

  return {
    totalItems,
    normalCount,
    warningCount,
    prepareCount,
    criticalCount,
    overLifeCount,
    lowStockCount,
    deliveryRiskCount
  };
}

/**
 * Generates dynamic Alert Ticker message matching calculated data source
 */
export function generateDynamicAlertTicker(
  items: PartLiveTrackingItem[],
  lineId: ProductionLineId
): string {
  if (!items || items.length === 0) {
    return `LINE ${lineId} - NO ACTIVE TOOLING RECORDS MONITORED`;
  }

  const overLife = items.filter(i => (i.lifeStatus || i.alertStatus) === 'OVER_LIFE');
  if (overLife.length > 0) {
    const top = overLife[0];
    const exceeded = Math.abs(top.remainingShot);
    return `[OVER LIFE] ${top.stagePunchDie || top.partName}: ${top.usagePercent}% | Exceeded by ${formatShots(exceeded)} Shot | URGENT TOOLING REPLACEMENT REQUIRED`;
  }

  const critical = items.filter(i => (i.lifeStatus || i.alertStatus) === 'CRITICAL');
  if (critical.length > 0) {
    const top = critical[0];
    const spare = top.availableSpare ?? top.backupQty;
    if ((top.deliveryRiskDays || 0) > 0) {
      return `[CRITICAL] ${top.stagePunchDie || top.partName}: ${top.usagePercent}% (Remaining ${formatShots(top.remainingShot)} Shot) | Spare Stock ${spare}/${top.installQty} EA | PO ETA ${top.etaDeliveryDate || 'TBD'} (DELIVERY RISK: ${top.deliveryRiskDays} DAYS LATE)`;
    }
    return `[CRITICAL] ${top.stagePunchDie || top.partName}: ${top.usagePercent}% (Remaining ${formatShots(top.remainingShot)} Shot) | Spare Stock ${spare}/${top.installQty} EA | PREPARE TOOLING CHANGEOVER`;
  }

  const prepare = items.filter(i => (i.lifeStatus || i.alertStatus) === 'PREPARE');
  if (prepare.length > 0) {
    const top = prepare[0];
    const spare = top.availableSpare ?? top.backupQty;
    return `[PREPARE] ${top.stagePunchDie || top.partName}: ${top.usagePercent}% (Remaining ${formatShots(top.remainingShot)} Shot) | Spare Stock ${spare}/${top.installQty} EA | SCHEDULE SHIFT CHANGEOVER`;
  }

  const warning = items.filter(i => (i.lifeStatus || i.alertStatus) === 'WARNING');
  if (warning.length > 0) {
    const top = warning[0];
    return `[WARNING] ${top.stagePunchDie || top.partName}: ${top.usagePercent}% (Remaining ${formatShots(top.remainingShot)} Shot) | Routine Inspection Due`;
  }

  return `ALL TOOLING OPERATING WITHIN NOMINAL SHOT SPECIFICATIONS | LINE ${lineId} STATUS: NORMAL`;
}

/**
 * Format numbers with comma separators for clean industrial displays
 */
export function formatShots(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format currency in THB
 */
export function formatThb(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '฿0';
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
