import { storageService } from '../../services/storageService';
import { PartMaster, PartLifeStandard, LineActiveConfiguration, RegrindMasterStandard } from '../../types';
import { embeddedFinDieStandards } from './migrationData';

// Shared normalization function
export const normalizeName = (name: string) => {
  return name
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/Φ/g, 'Ø')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
};

export const parseReGrinding = (row: any, isDefault44to69: boolean) => {
  if (row.disposeAfterOneUse) {
    return {
      maintenancePolicy: 'DISPOSE_AFTER_ONE_USE',
      disposeAfterUse: true,
      maxUseCount: 1,
      regrindAllowed: false,
      grindMinMm: undefined,
      grindMaxMm: undefined,
      oneTimeRegrindMm: '0',
      totalRegrindMm: 0,
      regrindMinCount: 0,
      regrindMaxCount: 0,
      maxRegrindCount: 0
    };
  }
  
  if (row.changeIntervalDays) {
    return {
      maintenancePolicy: 'PERIODIC_REPLACEMENT',
      changeIntervalMinDays: row.changeIntervalDays[0],
      changeIntervalMaxDays: row.changeIntervalDays[1],
      regrindAllowed: false,
      grindMinMm: undefined,
      grindMaxMm: undefined,
      oneTimeRegrindMm: row.grindPerTimeText || '0',
      totalRegrindMm: row.totalGrindingMm || 0,
      regrindMinCount: row.regrindCountText ? parseInt(row.regrindCountText) : 0,
      regrindMaxCount: row.regrindCountText ? parseInt(row.regrindCountText.split('-').pop()) : 0,
      maxRegrindCount: row.regrindCountText ? parseInt(row.regrindCountText.split('-').pop()) : 0
    };
  }

  // General parsing or Default applying
  let grindMinMm = undefined;
  let grindMaxMm = undefined;
  let minCount = 0;
  let maxCount = 0;

  if (isDefault44to69) {
    grindMinMm = 0.25;
    grindMaxMm = 0.35;
    minCount = 4;
    maxCount = 5;
    return {
      maintenancePolicy: 'SHOT_AND_REGRINDING_CONTROL',
      grindMinMm,
      grindMaxMm,
      oneTimeRegrindMm: '0.25-0.35',
      totalRegrindMm: 1.50,
      regrindMinCount: minCount,
      regrindMaxCount: maxCount,
      maxRegrindCount: maxCount,
      regrindAllowed: true
    };
  }

  if (row.grindPerTimeText) {
    const pts = row.grindPerTimeText.split('-');
    if (pts.length === 2) {
      grindMinMm = parseFloat(pts[0]);
      grindMaxMm = parseFloat(pts[1]);
    } else {
      grindMinMm = parseFloat(pts[0]);
      grindMaxMm = parseFloat(pts[0]);
    }
  }

  if (row.regrindCountText) {
    const text = row.regrindCountText.replace(' time', '');
    const pts = text.split('-');
    if (pts.length === 2) {
      minCount = parseInt(pts[0]);
      maxCount = parseInt(pts[1]);
    } else {
      minCount = parseInt(pts[0]);
      maxCount = parseInt(pts[0]);
    }
  }

  return {
    maintenancePolicy: 'SHOT_AND_REGRINDING_CONTROL',
    grindMinMm,
    grindMaxMm,
    oneTimeRegrindMm: row.grindPerTimeText || '',
    totalRegrindMm: row.totalGrindingMm || 0,
    regrindMinCount: minCount,
    regrindMaxCount: maxCount,
    maxRegrindCount: maxCount,
    regrindAllowed: maxCount > 0
  };
};

export const performValidation = () => {
  const parts = storageService.getPartMasters();
  
  // 7 Lines: E1, E2, E3-1, E3-2, E3-3, E4, E5
  // Match configuration to active configs
  const activeConfigs = storageService.getLineConfigs().filter(c => c.isActive);
  const findConfig = (lineId: string) => activeConfigs.find(c => c.lineId === lineId);
  
  const lineMapping = [
    findConfig('E1'),
    findConfig('E2'),
    findConfig('E3-1'),
    findConfig('E3-2'),
    findConfig('E3-3'),
    findConfig('E4'),
    findConfig('E5')
  ];

  const results: any[] = [];
  let exactMatches = 0;
  let newParts = 0;
  let needsReview = 0;
  let possibleDuplicates = 0;
  let validationErrors = 0;
  let grandTotal = 0;

  // Since we are only migrating No. 15 to 71, we should add the total from No. 1 to 14 to reach 11,281
  // Let's check existing parts in the line configs (seed data) to compute the existing total.
  const existingTotal = lineMapping.reduce((acc, config) => {
    if (!config || !config.installedPartQuantities) return acc;
    return acc + Object.values(config.installedPartQuantities).reduce((a, b) => a + b, 0);
  }, 0);

  embeddedFinDieStandards.forEach(row => {
    let matchStatus = 'NEW_PART';
    let matchedPart: PartMaster | null = null;
    let warning = '';
    
    // Spelling check warning
    const spellingWarnings = ["SLIT PUNCE", "ROW SLID", "SIECH"];
    if (spellingWarnings.some(w => row.partNameOriginal.includes(w))) {
      warning = 'Source spelling requires review.';
    }

    // Attempt matching
    const normName = normalizeName(row.partNameOriginal);
    const existing = parts.find(p => p.partCode === row.partNameOriginal || normalizeName(p.partName) === normName || p.partName === row.partNameOriginal);
    
    if (existing) {
      matchedPart = existing;
      matchStatus = 'EXACT_MATCH';
      exactMatches++;
    } else {
      // Basic heuristic for duplicate?
      const possible = parts.find(p => normalizeName(p.partName).includes(normName.split(' ')[0]));
      if (possible && false) { // Skip advanced heuristic unless needed
        matchStatus = 'POSSIBLE_DUPLICATE';
        possibleDuplicates++;
      } else {
        newParts++;
      }
    }

    // Validate Total
    const calculated = (row.install || []).reduce((a: number, b: number) => a + (b || 0), 0);
    grandTotal += calculated;
    const totalValid = calculated === row.total;
    if (!totalValid) {
      matchStatus = 'VALIDATION_FAIL';
      validationErrors++;
    }

    const isDefault44to69 = row.no >= 44 && row.no <= 69;
    const regrindParams = parseReGrinding(row, isDefault44to69);
    
    let lifeMillion = row.lifeMillion;
    if (isDefault44to69 && (!lifeMillion || lifeMillion[0] === null)) {
      lifeMillion = [27,70,27,70,70,70,70,27];
    }

    results.push({
      ...row,
      normalizedSearchName: normName,
      matchStatus,
      matchedPart,
      calculatedTotal: calculated,
      totalValid,
      regrindParams,
      lifeMillionMapped: lifeMillion,
      warning
    });
  });

  return {
    records: results,
    stats: {
      totalEmbedded: embeddedFinDieStandards.length,
      exactMatches,
      newParts,
      needsReview,
      possibleDuplicates,
      validationErrors,
      grandTotal: existingTotal + grandTotal,
      lineMapping
    }
  };
};

export const commitMigration = (analyzedRecords: any[], stats: any) => {
  const parts = storageService.getPartMasters();
  const configs = storageService.getLineConfigs();
  const lifeStandards = storageService.getLifeStandards();
  const regrindMasters = storageService.getRegrindMasterStandards();
  
  const { lineMapping } = stats;
  
  analyzedRecords.forEach(r => {
    let partCode = r.matchedPart?.partCode;
    
    // 1. Upsert PartMaster
    if (!partCode) {
      partCode = `MIG-${r.no}-${r.normalizedSearchName.replace(/[^A-Z0-9]/g, '').substring(0, 8)}`;
      const newPart: PartMaster = {
        partCode,
        partName: r.partNameOriginal,
        partNameTh: r.partNameOriginal,
        category: 'OTHER',
        stageName: r.partNameOriginal,
        tubeSizeCompat: r.normalizedSearchName.includes('Ø5') ? 'Ø5' : (r.normalizedSearchName.includes('Ø7') ? 'Ø7' : 'BOTH'),
        drawingNumber: '-',
        unit: 'EA',
        unitCostThb: 0,
        isImportedSeed: true
      };
      parts.push(newPart);
    }

    // 2. Regrind Master Standard
    let regrindM = regrindMasters.find(x => x.partCode === partCode);
    if (!regrindM) {
      regrindM = {
        id: `RMS-${partCode}`,
        partCode,
        partName: r.partNameOriginal,
        nominalLengthMm: 50,
        grindingAmountPerTimeMm: r.regrindParams.grindMaxMm || 0,
        grindMinMm: r.regrindParams.grindMinMm,
        grindMaxMm: r.regrindParams.grindMaxMm,
        totalGrindingAllowanceMm: r.regrindParams.totalRegrindMm,
        minAllowedLengthMm: 50 - r.regrindParams.totalRegrindMm,
        maxRegrindCount: r.regrindParams.maxRegrindCount,
        regrindMinCount: r.regrindParams.regrindMinCount,
        regrindMaxCount: r.regrindParams.regrindMaxCount,
        regrindAllowed: r.regrindParams.regrindAllowed,
        disposeAfterOneUse: !!r.regrindParams.disposeAfterUse,
        maintenancePolicy: r.regrindParams.maintenancePolicy,
        changeIntervalMinDays: r.regrindParams.changeIntervalMinDays,
        changeIntervalMaxDays: r.regrindParams.changeIntervalMaxDays,
        maxUseCount: r.regrindParams.maxUseCount,
        inspectionRequirements: 'Standard Visual Inspection',
        notes: 'Migrated from FIN_DIE_STD_TH_2025_01_31'
      };
      regrindMasters.push(regrindM);
    } else {
      regrindM.grindMinMm = r.regrindParams.grindMinMm;
      regrindM.grindMaxMm = r.regrindParams.grindMaxMm;
      regrindM.totalGrindingAllowanceMm = r.regrindParams.totalRegrindMm;
      regrindM.maxRegrindCount = r.regrindParams.maxRegrindCount;
      regrindM.regrindMinCount = r.regrindParams.regrindMinCount;
      regrindM.regrindMaxCount = r.regrindParams.regrindMaxCount;
      regrindM.regrindAllowed = r.regrindParams.regrindAllowed;
      regrindM.disposeAfterOneUse = !!r.regrindParams.disposeAfterUse;
      regrindM.maintenancePolicy = r.regrindParams.maintenancePolicy;
      regrindM.changeIntervalMinDays = r.regrindParams.changeIntervalMinDays;
      regrindM.changeIntervalMaxDays = r.regrindParams.changeIntervalMaxDays;
      regrindM.maxUseCount = r.regrindParams.maxUseCount;
    }

    // 3. Update Line Configs and Life Standards
    r.install.forEach((qty: number, idx: number) => {
      const config = lineMapping[idx];
      if (config) {
        // Only add life standard if install qty > 0 OR life limit exists
        const lifeLimitMillion = r.lifeMillionMapped?.[idx];
        if (qty > 0 || (lifeLimitMillion !== undefined && lifeLimitMillion !== null)) {
          // Update install qty
          if (qty > 0) {
            if (!config.installedPartQuantities) config.installedPartQuantities = {};
            config.installedPartQuantities[partCode] = qty;
          }

          // Upsert Part Life Standard
          if (lifeLimitMillion) {
            const lifeLimitShots = lifeLimitMillion * 1000000;
            const compKey = `${config.lineId}|${config.id}|${config.dieCode}|${config.finType}|${config.material}|${config.thicknessMm.toFixed(2)}mm|${config.tubeSize}|${partCode}|ALL|2025-01-31`;
            
            let ls = lifeStandards.find(x => x.compositeKeyString === compKey);
            if (!ls) {
              ls = {
                id: `PLS-${config.lineId}-${partCode}-${Date.now()}-${idx}`,
                configKey: {
                  lineId: config.lineId,
                  configurationId: config.id,
                  dieCode: config.dieCode,
                  finType: config.finType,
                  material: config.material,
                  thicknessMm: config.thicknessMm,
                  tubeSize: config.tubeSize,
                  partCode,
                  position: 'ALL',
                  effectiveDate: '2025-01-31'
                },
                compositeKeyString: compKey,
                partName: r.partNameOriginal,
                stagePunchDie: r.partNameOriginal,
                lifeLimitShots,
                regrindStandard: {
                  oneTimeRegrindMm: r.regrindParams.oneTimeRegrindMm,
                  grindMinMm: r.regrindParams.grindMinMm,
                  grindMaxMm: r.regrindParams.grindMaxMm,
                  totalRegrindMm: r.regrindParams.totalRegrindMm,
                  maxRegrindCount: r.regrindParams.maxRegrindCount,
                  regrindMinCount: r.regrindParams.regrindMinCount,
                  regrindMaxCount: r.regrindParams.regrindMaxCount,
                  disposeAfterUse: r.regrindParams.disposeAfterUse,
                  maintenancePolicy: r.regrindParams.maintenancePolicy,
                  changeIntervalMinDays: r.regrindParams.changeIntervalMinDays,
                  changeIntervalMaxDays: r.regrindParams.changeIntervalMaxDays,
                  maxUseCount: r.regrindParams.maxUseCount
                },
                createdBy: 'SYSTEM_MIGRATION',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isImportedSeed: true
              };
              lifeStandards.push(ls);
            } else {
              ls.lifeLimitShots = lifeLimitShots;
              ls.regrindStandard = { ...ls.regrindStandard, ...r.regrindParams };
              ls.updatedAt = new Date().toISOString();
            }
          }
        }
      }
    });
  });

  storageService.applyMigration(parts, regrindMasters, configs, lifeStandards);
  
  return true;
};
