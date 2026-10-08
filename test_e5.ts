const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => {}
};

async function run() {
  const { storageService } = await import("./src/services/storageService");
  const { calculatePartMetrics } = await import("./src/services/calculationService");

  // Get line configs and change E5 PIERCE PUNCH to 10 (just like user did in Stock Matrix)
  const configs = storageService.getLineConfigs();
  const e5Config = configs.find(c => c.lineId === 'E5');
  console.log("Original E5 config stockQuantities for DWG-PB-001:", e5Config?.stockQuantities?.['DWG-PB-001']);
  
  if (e5Config) {
    e5Config.stockQuantities = {
      ...(e5Config.stockQuantities || {}),
      'DWG-PB-001': 10
    };
    storageService.saveLineConfigs(configs);
  }

  // Now simulate TvDashboardView.reloadData() for 'E5'
  const selectedLineId = 'E5';
  const rawData = storageService.getLineMonitoring(selectedLineId);
  const standards = storageService.getLifeStandards();
  const stocks = storageService.getSpareStocks();
  const partMasters = storageService.getPartMasters();
  const lineConfigs = storageService.getLineConfigs();

  const activeConfig = lineConfigs.find(c => c.lineId === selectedLineId && c.isActive) || rawData?.activeConfig;

  console.log("activeConfig id:", activeConfig?.id, "isActive:", activeConfig?.isActive);
  console.log("activeConfig stockQuantities['DWG-PB-001']:", activeConfig?.stockQuantities?.['DWG-PB-001']);

  const lineInstalledMap = activeConfig?.installedPartQuantities || {};
  const installedPartCodes = Object.keys(lineInstalledMap).filter(code => (lineInstalledMap[code] || 0) > 0);
  const existingPartCodes = new Set((rawData?.items || []).map(i => (i.partCode || '').trim().toUpperCase()));

  const missingInstalledParts = installedPartCodes
    .filter(code => !existingPartCodes.has(code.trim().toUpperCase()))
    .map(code => {
      const pm = partMasters.find(p => p.partCode === code);
      const std = standards.find(s => s.configKey?.partCode === code || s.partName === pm?.partName || s.stagePunchDie === pm?.stageName);
      const stock = stocks.find(s => s.partCode === code || s.partName === pm?.partName);
      const installQty = lineInstalledMap[code] || (pm ? 1 : 0);
      const lifeLimit = std?.lifeLimitShots || 15000000;
      const totalShots = rawData?.machineShotTotal || 0;
      const curShot = 0;

      return {
        slotId: `SLOT-${selectedLineId}-${code}`,
        partCode: code,
        partName: pm?.partName || `Part ${code}`,
        stagePunchDie: pm?.stageName || 'Die Stage',
        position: pm?.stageName || 'ALL',
        installQty: installQty,
        backupQty: stock?.availableQuantity ?? 10,
        usedShot: curShot,
        currentShot: curShot,
        shotAtLastChange: Math.max(0, totalShots - curShot),
        lastChangeShot: Math.max(0, totalShots - curShot),
        regrindCount: 0,
        totalMmGround: 0,
        lifeLimit: lifeLimit
      };
    });

  const allCandidateItems = [...(rawData?.items || []), ...missingInstalledParts];

  console.log("Candidate items count:", allCandidateItems.length);

  const recalculatedItems = allCandidateItems.map((item) => {
    const rawCode = (item.partCode || '').trim();
    const strippedCode = rawCode.replace(/^(E\d+(?:-\d+)?-)/i, '').trim();
    const rawName = (item.partName || '').trim();
    const cleanName = rawName.replace(/\s*\(.*?\)/g, '').trim().toLowerCase();

    let matchedPart = partMasters.find(p => 
      p.partCode.toLowerCase() === rawCode.toLowerCase() ||
      p.partCode.toLowerCase() === strippedCode.toLowerCase()
    );

    if (!matchedPart && rawName) {
      matchedPart = partMasters.find(p => 
        p.partName.toLowerCase() === rawName.toLowerCase() ||
        p.partName.replace(/\s*\(.*?\)/g, '').trim().toLowerCase() === cleanName
      );
    }

    const matchedStd = standards.find(s => 
      (item.partCode && ((s as any).partCode === item.partCode || s.configKey?.partCode === item.partCode)) || 
      (strippedCode && ((s as any).partCode === strippedCode || s.configKey?.partCode === strippedCode)) ||
      (matchedPart && ((s as any).partCode === matchedPart.partCode || s.configKey?.partCode === matchedPart.partCode)) ||
      (item.partName && s.partName === item.partName) ||
      (matchedPart && s.partName === matchedPart.partName)
    );

    const matchedStock = stocks.find(s => 
      (item.partCode && s.partCode === item.partCode) || 
      (strippedCode && s.partCode === strippedCode) ||
      (matchedPart && s.partCode === matchedPart.partCode) ||
      (item.partName && s.partName === item.partName) ||
      (matchedPart && s.partName === matchedPart.partName)
    );

    const permanentPartCode = matchedPart?.partCode || strippedCode || item.partCode || '';
    const legacyCode = item.partCode || '';
    const permanentSlotId = item.slotId || (permanentPartCode ? `SLOT-${permanentPartCode}` : (item.stagePunchDie ? `SLOT-${item.stagePunchDie.replace(/\s+/g, '_')}` : 'SLOT-UNASSIGNED'));

    let installQtyVal: number | undefined = undefined;
    if (activeConfig && activeConfig.installedPartQuantities) {
      const normInstallMap = Object.entries(activeConfig.installedPartQuantities).reduce((acc, [k, v]) => {
        acc[k.trim().toUpperCase()] = v;
        return acc;
      }, {} as Record<string, number>);

      const lookupCode = permanentPartCode?.trim().toUpperCase() || legacyCode?.trim().toUpperCase();
      if (lookupCode && normInstallMap[lookupCode] !== undefined) {
        installQtyVal = normInstallMap[lookupCode];
      }
    }
    if (installQtyVal === undefined) {
      installQtyVal = item.installQty > 0 ? item.installQty : (matchedStock?.requiredQuantityPerFullReplacement || 0);
    }

    let stockQtyVal: number | undefined = undefined;
    if (activeConfig && activeConfig.stockQuantities) {
      const normStockMap = Object.entries(activeConfig.stockQuantities).reduce((acc, [k, v]) => {
        acc[k.trim().toUpperCase()] = v;
        return acc;
      }, {} as Record<string, number>);

      const lookupCode = permanentPartCode?.trim().toUpperCase() || legacyCode?.trim().toUpperCase();
      if (lookupCode && normStockMap[lookupCode] !== undefined) {
        stockQtyVal = normStockMap[lookupCode];
      } else {
        stockQtyVal = 0;
      }
    }
    if (stockQtyVal === undefined) {
      stockQtyVal = matchedStock 
        ? (matchedStock.availableQuantity !== undefined ? matchedStock.availableQuantity : (matchedStock.currentStockQty !== undefined ? matchedStock.currentStockQty : matchedStock.onHandQuantity)) 
        : (item.backupQty || 0);
    }

    const lifeLimitVal = item.lifeLimit > 0 ? item.lifeLimit : (matchedStd?.lifeLimitShots || 0);
    const partDisplayName = item.partName || matchedPart?.partName || item.stagePunchDie || 'Tooling Component';
    const stageName = item.stagePunchDie || matchedPart?.stageName || item.partName || 'Die Stage';

    const res = calculatePartMetrics(
      {
        slotId: permanentSlotId,
        partCode: permanentPartCode,
        partName: partDisplayName,
        stagePunchDie: stageName,
        position: item.position || stageName,
        installQty: installQtyVal,
        backupQty: stockQtyVal,
        usedShot: item.usedShot !== undefined ? item.usedShot : item.currentShot,
        currentShot: item.usedShot !== undefined ? item.usedShot : item.currentShot,
        shotAtLastChange: item.shotAtLastChange !== undefined ? item.shotAtLastChange : item.lastChangeShot,
        lastChangeShot: item.shotAtLastChange !== undefined ? item.shotAtLastChange : item.lastChangeShot,
        regrindCount: item.regrindCount,
        totalMmGround: item.totalMmGround,
        lifeLimit: lifeLimitVal
      },
      activeConfig,
      standards,
      stocks,
      rawData?.dailyShot || 0
    );

    if (permanentPartCode === 'DWG-PB-001' || item.partCode === 'DWG-PB-001' || item.partName.includes('PIERCE')) {
      console.log("RECALCULATED PIERCE PUNCH:", {
        slotId: res.slotId,
        partCode: res.partCode,
        partName: res.partName,
        stagePunchDie: res.stagePunchDie,
        installQty: res.installQty,
        backupQty: res.backupQty,
        lineStockQty: res.lineStockQty,
        totalStockQty: res.totalStockQty
      });
    }
    return res;
  });
}

run();
