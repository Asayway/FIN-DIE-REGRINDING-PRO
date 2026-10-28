import {
  PartCostMasterItem,
  RegrindingTransactionItem,
  DecisionSupportResult,
  DecisionVerdict,
  CostSummaryMetrics
} from '../types/costSaving';

export interface CalculationInput {
  // Machine & Labor Hours + Rates
  actualMachineHours?: number;
  actualSetupHours?: number;
  actualLaborHours?: number;
  machineCostRateRef?: number; // THB / hour
  laborRateRef?: number; // THB / hour
  includesLaborInMachineRate?: boolean; // Flag: true = machine rate already includes operator labor

  // Direct Cost Items
  actualConsumablesCost?: number;
  actualExternalRepairCost?: number;
  actualTransportationCost?: number;
  actualQcCost?: number;
  otherCost?: number;

  // Legacy fallback support
  repairCost?: number;
  transportationCost?: number;
  internalLaborCost?: number;

  // Budget / Estimate fields
  estimatedTotalRepairCost?: number;

  // Impact Costs & Tool Life
  downtimeCost?: number;
  qualityLossCost?: number;
  newPurchasePrice: number;
  expectedNewToolLife: number;
  actualNewToolLife?: number;
  expectedLifeAfterRepair: number;
  actualLifeAfterRepair?: number;
  regrindingNo: number;
  maxRegrindCount: number;
  nominalLengthMm?: number;
  minAllowedLengthMm?: number;
  remainingLengthMm?: number;
  disposeAfterOneUse?: boolean;
  qualityResult?: 'PASS' | 'CONDITIONAL' | 'REWORK' | 'SCRAP';
}

export interface CalculationOutput {
  machineCost: number;
  laborCost: number;
  directRepairCost: number;
  totalRepairCost: number;
  estimatedTotalRepairCost: number;
  costVarianceThb: number;
  costVariancePercentage: number;
  newPurchaseEquivalentCost: number;
  grossSaving: number;
  netSaving: number;
  savingPercentage: number;
  newToolCostPerShot: number;
  regrindingCostPerShot: number;
  costPerShotIsEstimated: boolean;
  effectiveLifeUsed: number;
  fairTargetShots: number;
  fairNewToolCost: number;
  fairRegrindEquivalentCost: number;
  fairNormalizedSaving: number;
  fairAssumptions: string;
  doubleCountingPreventedNote?: string;
}

/**
 * Core mathematical engine for Fin Die Cost Saving & Regrinding Management
 */
export class CostSavingCalculationService {
  /**
   * Rule 1: Direct Repair Cost = Machine Cost + Labor Cost (if not included) + Consumables + External Repair + Freight + QC + Other
   * Direct Repair Cost before downtime & quality scrap loss
   */
  public static calculateDirectRepairCost(
    machineCost: number,
    laborCost: number,
    consumablesCost: number,
    externalRepairCost: number,
    transportationCost: number,
    qcCost: number,
    otherCost: number
  ): number {
    const sum = (machineCost || 0) + 
      (laborCost || 0) + 
      (consumablesCost || 0) + 
      (externalRepairCost || 0) + 
      (transportationCost || 0) + 
      (qcCost || 0) + 
      (otherCost || 0);
    return Number(sum.toFixed(2));
  }

  /**
   * Rule 2: Total Repair Cost = Direct Repair Cost + Downtime Impact Cost + Quality Loss Cost
   */
  public static calculateTotalRepairCost(
    directRepairCost: number,
    downtimeCost: number = 0,
    qualityLossCost: number = 0
  ): number {
    return Number(((directRepairCost || 0) + (downtimeCost || 0) + (qualityLossCost || 0)).toFixed(2));
  }

  /**
   * Rule 3: Gross Saving = New Purchase Equivalent Cost - Total Repair Cost
   */
  public static calculateGrossSaving(
    newPurchaseEquivalentCost: number,
    totalRepairCost: number
  ): number {
    return Number(((newPurchaseEquivalentCost || 0) - (totalRepairCost || 0)).toFixed(2));
  }

  /**
   * Rule 4: Net Saving = Gross Saving - Additional Downtime Cost - Quality Loss Cost
   * If Total Repair Cost already includes downtime/loss, Net Saving = New Purchase Equivalent Cost - Total Repair Cost
   */
  public static calculateNetSaving(
    newPurchaseEquivalentCost: number,
    totalRepairCost: number
  ): number {
    return Number(((newPurchaseEquivalentCost || 0) - (totalRepairCost || 0)).toFixed(2));
  }

  /**
   * Rule 5: Saving Percentage = Net Saving / New Purchase Equivalent Cost × 100
   */
  public static calculateSavingPercentage(
    netSaving: number,
    newPurchaseEquivalentCost: number
  ): number {
    if (!newPurchaseEquivalentCost || newPurchaseEquivalentCost <= 0) return 0;
    const pct = (netSaving / newPurchaseEquivalentCost) * 100;
    return Number(pct.toFixed(2));
  }

  /**
   * Rule 6: Cost per Shot for New Tool & Reground Tool
   */
  public static calculateCostPerShot(
    price: number,
    lifeShots: number
  ): number {
    if (!lifeShots || lifeShots <= 0) return 0;
    return Number((price / lifeShots).toFixed(6));
  }

  /**
   * Fair Comparison on Normalized Target Shots Basis
   */
  public static calculateFairComparison(
    newPurchasePrice: number,
    newToolShots: number,
    totalRepairCost: number,
    regrindShots: number,
    customTargetShots?: number
  ): {
    fairTargetShots: number;
    fairNewToolCost: number;
    fairRegrindEquivalentCost: number;
    fairNormalizedSaving: number;
    fairAssumptions: string;
  } {
    const targetShots = customTargetShots && customTargetShots > 0 
      ? customTargetShots 
      : (newToolShots > 0 ? newToolShots : 15_000_000);

    const safeNewToolShots = newToolShots > 0 ? newToolShots : targetShots;
    const safeRegrindShots = regrindShots > 0 ? regrindShots : 1_500_000;

    const newToolsRequired = targetShots / safeNewToolShots;
    const fairNewToolCost = Number((newToolsRequired * newPurchasePrice).toFixed(2));

    const regrindsRequired = targetShots / safeRegrindShots;
    const fairRegrindEquivalentCost = Number((regrindsRequired * totalRepairCost).toFixed(2));

    const fairNormalizedSaving = Number((fairNewToolCost - fairRegrindEquivalentCost).toFixed(2));

    const assumptions = `เทียบเคียงสมมติฐานเป้าหมาย ${targetShots.toLocaleString()} Shots: ` +
      `ต้องเจียรซ่อม ${regrindsRequired.toFixed(1)} ครั้ง (@${safeRegrindShots.toLocaleString()} Shots/ครั้ง) ` +
      `เทียบกับจัดซื้อใหม่ ${newToolsRequired.toFixed(1)} ชิ้น (@${safeNewToolShots.toLocaleString()} Shots/ชิ้น)`;

    return {
      fairTargetShots: targetShots,
      fairNewToolCost,
      fairRegrindEquivalentCost,
      fairNormalizedSaving,
      fairAssumptions: assumptions
    };
  }

  /**
   * Execute full calculation pipeline for a single transaction with Grinding Machine & Labor Cost
   */
  public static computeTransactionMetrics(input: CalculationInput): CalculationOutput {
    const machineHours = input.actualMachineHours || 0;
    const machineRate = input.machineCostRateRef || 0;
    const machineCost = Number((machineHours * machineRate).toFixed(2));

    const includesLabor = !!input.includesLaborInMachineRate;
    const laborHours = input.actualLaborHours || 0;
    const laborRate = input.laborRateRef || 0;
    
    // CRITICAL DOUBLE-COUNTING SAFEGUARD:
    // If Machine Cost Rate already includes operator labor rate, set labor cost contribution to 0!
    let laborCost = 0;
    let doubleCountingNote: string | undefined = undefined;

    if (includesLabor) {
      laborCost = 0;
      doubleCountingNote = `อัตราเครื่องจักร (฿${machineRate}/ชม.) รวมค่าแรงช่างแล้ว ระบบจึงไม่คิดค่าแรงซ้ำ (Labor Cost set to 0)`;
    } else {
      laborCost = Number((laborHours * laborRate).toFixed(2));
      // Fallback for legacy data if internalLaborCost is explicitly provided without laborHours
      if (laborCost === 0 && (input.internalLaborCost || 0) > 0) {
        laborCost = Number((input.internalLaborCost || 0).toFixed(2));
      }
    }

    const consumables = (input.actualConsumablesCost !== undefined) ? input.actualConsumablesCost : (input.otherCost || 0);
    const externalRepair = (input.actualExternalRepairCost !== undefined) ? input.actualExternalRepairCost : (input.repairCost || 0);
    const transport = input.actualTransportationCost !== undefined ? input.actualTransportationCost : (input.transportationCost || 0);
    const qc = input.actualQcCost || 0;
    const other = input.otherCost || 0;

    const directRepairCost = this.calculateDirectRepairCost(
      machineCost,
      laborCost,
      consumables,
      externalRepair,
      transport,
      qc,
      other
    );

    const downtime = input.downtimeCost || 0;
    const qualityLoss = input.qualityLossCost || 0;
    const totalRepairCost = this.calculateTotalRepairCost(directRepairCost, downtime, qualityLoss);

    // Estimates vs Actual Variance
    const estTotal = input.estimatedTotalRepairCost || directRepairCost;
    const costVarianceThb = Number((totalRepairCost - estTotal).toFixed(2));
    const costVariancePercentage = estTotal > 0 ? Number((((totalRepairCost - estTotal) / estTotal) * 100).toFixed(2)) : 0;

    // Equivalent new purchase cost
    const newPurchaseEquivalentCost = input.newPurchasePrice;

    const grossSaving = this.calculateGrossSaving(newPurchaseEquivalentCost, totalRepairCost);
    const netSaving = this.calculateNetSaving(newPurchaseEquivalentCost, totalRepairCost);
    const savingPercentage = this.calculateSavingPercentage(netSaving, newPurchaseEquivalentCost);

    // Cost per shot
    const effectiveNewLife = (input.actualNewToolLife && input.actualNewToolLife > 0) 
      ? input.actualNewToolLife 
      : input.expectedNewToolLife;

    const hasActualRegrindLife = typeof input.actualLifeAfterRepair === 'number' && input.actualLifeAfterRepair > 0;
    const effectiveRegrindLife = hasActualRegrindLife 
      ? (input.actualLifeAfterRepair as number) 
      : input.expectedLifeAfterRepair;

    const newToolCostPerShot = this.calculateCostPerShot(input.newPurchasePrice, effectiveNewLife);
    const regrindingCostPerShot = this.calculateCostPerShot(totalRepairCost, effectiveRegrindLife);

    // Fair comparison
    const fair = this.calculateFairComparison(
      input.newPurchasePrice,
      effectiveNewLife,
      totalRepairCost,
      effectiveRegrindLife
    );

    return {
      machineCost,
      laborCost,
      directRepairCost,
      totalRepairCost,
      estimatedTotalRepairCost: estTotal,
      costVarianceThb,
      costVariancePercentage,
      newPurchaseEquivalentCost,
      grossSaving,
      netSaving,
      savingPercentage,
      newToolCostPerShot,
      regrindingCostPerShot,
      costPerShotIsEstimated: !hasActualRegrindLife,
      effectiveLifeUsed: effectiveRegrindLife,
      doubleCountingPreventedNote: doubleCountingNote,
      ...fair
    };
  }

  /**
   * Rule 7: Decision Support Engine
   */
  public static evaluateDecisionSupport(
    part: PartCostMasterItem,
    tx: Partial<RegrindingTransactionItem>,
    accumulatedShots: number = 0
  ): DecisionSupportResult {
    const reasons: string[] = [];
    const engineeringAlerts: string[] = [];
    let score = 100;

    const regrindingNo = tx.regrindingNo ?? 1;
    const maxRegrindCount = part.maxRegrindCount ?? 10;
    const remainingRegrindCycles = Math.max(0, maxRegrindCount - regrindingNo);
    const quality = tx.qualityResult || 'PASS';

    // 1. Dispose after one use policy
    if (part.disposeAfterOneUse) {
      return {
        partNo: part.partNo,
        partName: part.partName,
        regrindingNo,
        verdict: 'REPLACE',
        score: 0,
        summaryTh: 'ต้องเปลี่ยนใหม่: ชิ้นส่วนนี้ถูกกำหนดสเปควิศวกรรมให้ใช้งานครั้งเดียวทิ้ง (Dispose After One Use)',
        reasons: ['ข้อกำหนดวิศวกรรมแม่พิมพ์: ห้ามเจียรซ่อมสำหรับชิ้นส่วนประเภทนี้'],
        engineeringAlerts: ['Dispose After 1 Use Policy Enforced'],
        financialComparison: {
          regrindCostPerShot: 0,
          newToolCostPerShot: this.calculateCostPerShot(part.newPurchasePrice, part.expectedNewToolLife),
          savingPerShot: 0,
          isEstimated: true,
          breakEvenCycles: 0,
          fairComparisonSavingThb: 0
        },
        toolLifeMetrics: {
          remainingLifePercent: 0,
          remainingRegrindCycles: 0,
          accumulatedShots
        }
      };
    }

    // 2. Minimum Allowed Length
    const currentLength = tx.remainingLengthMm ?? part.nominalLengthMm;
    const minLength = part.minAllowedLengthMm;
    let lengthExceeded = false;
    let lengthNearLimit = false;

    if (currentLength && minLength) {
      if (currentLength <= minLength) {
        lengthExceeded = true;
        score -= 90;
        reasons.push(`ความยาวปัจจุบัน (${currentLength.toFixed(2)} mm) ถึงหรือต่ำกว่าเกณฑ์ความยาวปลอดภัยขั้นต่ำ (${minLength.toFixed(2)} mm)`);
        engineeringAlerts.push('CRITICAL: Tool Length at or Below Min Specification');
      } else if (currentLength - minLength <= 0.20) {
        lengthNearLimit = true;
        score -= 30;
        reasons.push(`ความยาวปัจจุบัน (${currentLength.toFixed(2)} mm) ใกล้ถึงเกณฑ์ขั้นต่ำ เหลือเนื้อเจียรได้อีกเพียง ${(currentLength - minLength).toFixed(2)} mm`);
        engineeringAlerts.push('WARNING: Tool grinding allowance near exhaustion');
      }
    }

    // 3. Regrind Cycles Exceeded
    let cyclesExceeded = false;
    let cyclesNearLimit = false;

    if (maxRegrindCount > 0) {
      if (regrindingNo >= maxRegrindCount) {
        cyclesExceeded = true;
        score -= 85;
        reasons.push(`จำนวนครั้งที่เจียร (${regrindingNo} ครั้ง) ถึงหรือเกินขีดจำกัดสูงสุด (${maxRegrindCount} ครั้ง)`);
        engineeringAlerts.push(`Max regrind cycles reached: ${regrindingNo}/${maxRegrindCount}`);
      } else if (regrindingNo >= maxRegrindCount - 1) {
        cyclesNearLimit = true;
        score -= 25;
        reasons.push(`จำนวนครั้งที่เจียร (${regrindingNo}/${maxRegrindCount}) อยู่ในรอบสุดท้ายก่อนปลดระวาง`);
      }
    }

    // 4. Quality Result
    if (quality === 'SCRAP') {
      score = 0;
      reasons.push('ผลการตรวจสอบคุณภาพระบุเป็น SCRAP (ชำรุดเสียหายเกินกว่าจะกอบกู้ได้)');
      engineeringAlerts.push('Quality Rejection: SCRAP');
    } else if (quality === 'REWORK') {
      score -= 35;
      reasons.push('ผลการตรวจสอบคุณภาพต้องแก้ไขซ้ำ (REWORK)');
    } else if (quality === 'CONDITIONAL') {
      score -= 20;
      reasons.push('ผลการตรวจสอบคุณภาพผ่านแบบมีเงื่อนไข (CONDITIONAL)');
    }

    // 5. Financial Comparison
    const regrindCost = tx.totalRepairCost || 1200;
    const regrindLife = tx.actualLifeAfterRepair || tx.expectedLifeAfterRepair || 1_500_000;
    const regrindCostPerShot = this.calculateCostPerShot(regrindCost, regrindLife);
    const newToolCostPerShot = this.calculateCostPerShot(part.newPurchasePrice, part.expectedNewToolLife);
    const savingPerShot = newToolCostPerShot - regrindCostPerShot;

    if (regrindCostPerShot >= newToolCostPerShot) {
      score -= 40;
      reasons.push(`ต้นทุนต่อช็อตของการเจียร (฿${regrindCostPerShot.toFixed(5)}/shot) สูงกว่าการซื้อใหม่ (฿${newToolCostPerShot.toFixed(5)}/shot)`);
    } else {
      reasons.push(`คุ้มค่าทางเศรษฐศาสตร์: ต้นทุนเจียร (฿${regrindCostPerShot.toFixed(5)}/shot) ต่ำกว่าซื้อใหม่ ประหยัดได้ ฿${savingPerShot.toFixed(5)}/shot`);
    }

    // Fair comparison
    const fair = this.calculateFairComparison(
      part.newPurchasePrice,
      part.expectedNewToolLife,
      regrindCost,
      regrindLife
    );

    // Calculate Remaining Tool Life %
    const cyclesPercent = maxRegrindCount > 0 ? (remainingRegrindCycles / maxRegrindCount) * 100 : 0;
    const remainingLifePercent = Math.max(0, Math.min(100, Math.round(cyclesPercent)));

    // Determine Final Verdict
    let verdict: DecisionVerdict = 'REGRIND';
    let summaryTh = 'แนะนำให้เจียรซ่อม (REGRIND): สเปควิศวกรรมสมบูรณ์ คุณภาพผ่าน และคุ้มค่าต้นทุนสูงสุด';

    if (lengthExceeded || cyclesExceeded || quality === 'SCRAP' || score < 30) {
      verdict = 'REPLACE';
      summaryTh = 'แนะนำให้เปลี่ยนชิ้นส่วนใหม่ (REPLACE): ถึงขีดจำกัดสเปค หรือไม่คุ้มค่าทางวิศวกรรมและความปลอดภัย';
    } else if (lengthNearLimit || cyclesNearLimit || quality === 'CONDITIONAL' || quality === 'REWORK' || score < 70) {
      verdict = 'MONITOR';
      summaryTh = 'แนะนำให้เฝ้าระวังเข้มงวด (MONITOR): สามารถเจียรซ่อมได้แต่ใกล้ถึงขีดจำกัด ควรตรวจวัดครีบและสเปคทุกกะ';
    }

    return {
      partNo: part.partNo,
      partName: part.partName,
      regrindingNo,
      verdict,
      score: Math.max(0, Math.min(100, score)),
      summaryTh,
      reasons,
      engineeringAlerts,
      financialComparison: {
        regrindCostPerShot,
        newToolCostPerShot,
        savingPerShot,
        isEstimated: !tx.hasActualLife,
        breakEvenCycles: Math.ceil(part.newPurchasePrice / (regrindCost || 1)),
        fairComparisonSavingThb: fair.fairNormalizedSaving
      },
      toolLifeMetrics: {
        remainingLifePercent,
        remainingRegrindCycles,
        currentLengthMm: currentLength,
        minAllowedLengthMm: minLength,
        accumulatedShots
      }
    };
  }

  /**
   * Aggregate Metrics for Filtered Dataset
   */
  public static aggregateMetrics(transactions: RegrindingTransactionItem[]): CostSummaryMetrics {
    if (!transactions || transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalRegrindingCost: 0,
        newPurchaseEquivalentCost: 0,
        grossSaving: 0,
        netSaving: 0,
        savingPercentage: 0,
        totalMachineCost: 0,
        totalLaborCost: 0,
        totalConsumablesCost: 0,
        totalExternalRepairCost: 0,
        totalQcCost: 0,
        totalMachineHours: 0,
        totalLaborHours: 0,
        totalEstimatedRepairCost: 0,
        totalCostVarianceThb: 0,
        totalCostVariancePercentage: 0,
        actualTransactionsCount: 0,
        estimatedTransactionsCount: 0,
        actualNetSaving: 0,
        estimatedNetSaving: 0,
        directRepairCost: 0,
        transportationCost: 0,
        internalLaborCost: 0,
        otherCost: 0,
        downtimeCost: 0,
        qualityLossCost: 0,
        repairCostByPartNo: [],
        repairCostByMachine: [],
        monthlyCostTrend: [],
        avgSavingPerTransaction: 0,
        avgCostPerShotRatio: 0
      };
    }

    let totalRegrindingCost = 0;
    let newPurchaseEquivalentCost = 0;
    let grossSaving = 0;
    let netSaving = 0;
    let actualCount = 0;
    let estimatedCount = 0;
    let actualNetSaving = 0;
    let estimatedNetSaving = 0;

    let totalMachineCost = 0;
    let totalLaborCost = 0;
    let totalConsumablesCost = 0;
    let totalExternalRepairCost = 0;
    let totalQcCost = 0;
    let totalMachineHours = 0;
    let totalLaborHours = 0;

    let totalEstimatedRepairCost = 0;

    let directRepairCost = 0;
    let transportationCost = 0;
    let internalLaborCost = 0;
    let otherCost = 0;
    let downtimeCost = 0;
    let qualityLossCost = 0;

    let totalRegrindCostPerShot = 0;
    let totalNewCostPerShot = 0;

    const partMap = new Map<string, { partNo: string; partName: string; totalCost: number; grossSaving: number; netSaving: number; regrindCount: number }>();
    const machineMap = new Map<string, { machineName: string; totalCost: number; machineCost: number; laborCost: number; machineHours: number; laborHours: number; count: number }>();
    const monthMap = new Map<string, { monthLabel: string; totalCost: number; machineCost: number; laborCost: number; netSaving: number; regrindCount: number }>();

    transactions.forEach(tx => {
      const totCost = tx.totalRepairCost || 0;
      totalRegrindingCost += totCost;
      newPurchaseEquivalentCost += tx.newPurchaseEquivalentCost || 0;
      grossSaving += tx.grossSaving || 0;
      netSaving += tx.netSaving || 0;

      const mCost = tx.machineCost !== undefined ? tx.machineCost : 0;
      const lCost = tx.laborCost !== undefined ? tx.laborCost : (tx.internalLaborCost || 0);
      const cCost = tx.actualConsumablesCost !== undefined ? tx.actualConsumablesCost : (tx.otherCost || 0);
      const eCost = tx.actualExternalRepairCost !== undefined ? tx.actualExternalRepairCost : (tx.repairCost || 0);
      const qCost = tx.actualQcCost || 0;

      totalMachineCost += mCost;
      totalLaborCost += lCost;
      totalConsumablesCost += cCost;
      totalExternalRepairCost += eCost;
      totalQcCost += qCost;

      totalMachineHours += tx.actualMachineHours || 0;
      totalLaborHours += tx.actualLaborHours || 0;

      totalEstimatedRepairCost += (tx.estimatedTotalRepairCost || totCost);

      directRepairCost += (tx.directRepairCost || tx.repairCost || 0);
      transportationCost += (tx.actualTransportationCost || tx.transportationCost || 0);
      internalLaborCost += lCost;
      otherCost += (tx.otherDirectCost || tx.otherCost || 0);
      downtimeCost += (tx.downtimeCost || 0);
      qualityLossCost += (tx.qualityLossCost || 0);

      if (tx.hasActualLife) {
        actualCount += 1;
        actualNetSaving += tx.netSaving || 0;
      } else {
        estimatedCount += 1;
        estimatedNetSaving += tx.netSaving || 0;
      }

      totalRegrindCostPerShot += tx.costPerShotRegrind || 0;
      totalNewCostPerShot += tx.costPerShotNewTool || 0;

      // Aggregating by Part No.
      const pKey = tx.partNo;
      const existingPart = partMap.get(pKey) || { partNo: tx.partNo, partName: tx.partName || tx.partNo, totalCost: 0, grossSaving: 0, netSaving: 0, regrindCount: 0 };
      existingPart.totalCost += totCost;
      existingPart.grossSaving += (tx.grossSaving || 0);
      existingPart.netSaving += (tx.netSaving || 0);
      existingPart.regrindCount += 1;
      partMap.set(pKey, existingPart);

      // Aggregating by Machine
      const mKey = tx.rateMasterMachineName || tx.supplier || 'OKAMOTO Surface Grinder #1';
      const existingMachine = machineMap.get(mKey) || { machineName: mKey, totalCost: 0, machineCost: 0, laborCost: 0, machineHours: 0, laborHours: 0, count: 0 };
      existingMachine.totalCost += totCost;
      existingMachine.machineCost += mCost;
      existingMachine.laborCost += lCost;
      existingMachine.machineHours += (tx.actualMachineHours || 0);
      existingMachine.laborHours += (tx.actualLaborHours || 0);
      existingMachine.count += 1;
      machineMap.set(mKey, existingMachine);

      // Aggregating by Month Trend
      const monthLabel = tx.repairDate ? tx.repairDate.slice(0, 7) : '2026-10'; // YYYY-MM
      const existingMonth = monthMap.get(monthLabel) || { monthLabel, totalCost: 0, machineCost: 0, laborCost: 0, netSaving: 0, regrindCount: 0 };
      existingMonth.totalCost += totCost;
      existingMonth.machineCost += mCost;
      existingMonth.laborCost += lCost;
      existingMonth.netSaving += (tx.netSaving || 0);
      existingMonth.regrindCount += 1;
      monthMap.set(monthLabel, existingMonth);
    });

    const totalCostVarianceThb = Number((totalRegrindingCost - totalEstimatedRepairCost).toFixed(2));
    const totalCostVariancePercentage = totalEstimatedRepairCost > 0
      ? Number((((totalRegrindingCost - totalEstimatedRepairCost) / totalEstimatedRepairCost) * 100).toFixed(2))
      : 0;

    const savingPercentage = newPurchaseEquivalentCost > 0 
      ? Number(((netSaving / newPurchaseEquivalentCost) * 100).toFixed(2))
      : 0;

    const avgCostPerShotRatio = totalNewCostPerShot > 0 
      ? Number((totalRegrindCostPerShot / totalNewCostPerShot).toFixed(4))
      : 0;

    const repairCostByPartNo = Array.from(partMap.values()).sort((a, b) => b.totalCost - a.totalCost);
    const repairCostByMachine = Array.from(machineMap.values()).sort((a, b) => b.totalCost - a.totalCost);
    const monthlyCostTrend = Array.from(monthMap.values()).sort((a, b) => a.monthLabel.localeCompare(b.monthLabel));

    return {
      totalTransactions: transactions.length,
      totalRegrindingCost: Number(totalRegrindingCost.toFixed(2)),
      newPurchaseEquivalentCost: Number(newPurchaseEquivalentCost.toFixed(2)),
      grossSaving: Number(grossSaving.toFixed(2)),
      netSaving: Number(netSaving.toFixed(2)),
      savingPercentage,
      totalMachineCost: Number(totalMachineCost.toFixed(2)),
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
      totalConsumablesCost: Number(totalConsumablesCost.toFixed(2)),
      totalExternalRepairCost: Number(totalExternalRepairCost.toFixed(2)),
      totalQcCost: Number(totalQcCost.toFixed(2)),
      totalMachineHours: Number(totalMachineHours.toFixed(2)),
      totalLaborHours: Number(totalLaborHours.toFixed(2)),
      totalEstimatedRepairCost: Number(totalEstimatedRepairCost.toFixed(2)),
      totalCostVarianceThb,
      totalCostVariancePercentage,
      actualTransactionsCount: actualCount,
      estimatedTransactionsCount: estimatedCount,
      actualNetSaving: Number(actualNetSaving.toFixed(2)),
      estimatedNetSaving: Number(estimatedNetSaving.toFixed(2)),
      directRepairCost: Number(directRepairCost.toFixed(2)),
      transportationCost: Number(transportationCost.toFixed(2)),
      internalLaborCost: Number(internalLaborCost.toFixed(2)),
      otherCost: Number(otherCost.toFixed(2)),
      downtimeCost: Number(downtimeCost.toFixed(2)),
      qualityLossCost: Number(qualityLossCost.toFixed(2)),
      repairCostByPartNo,
      repairCostByMachine,
      monthlyCostTrend,
      avgSavingPerTransaction: Number((netSaving / transactions.length).toFixed(2)),
      avgCostPerShotRatio
    };
  }

  /**
   * Predefined verification test cases to validate calculations
   */
  public static runVerificationTestCases(): Array<{
    name: string;
    description: string;
    input: CalculationInput;
    expected: Partial<CalculationOutput>;
    actual: CalculationOutput;
    passed: boolean;
  }> {
    const testCases: Array<{
      name: string;
      description: string;
      input: CalculationInput;
      expected: Partial<CalculationOutput>;
    }> = [
      {
        name: 'Case 1: Machine Rate Excludes Labor (Separate Calculation)',
        description: 'Machine: 2.0 hrs @ 350 THB/hr = 700 THB. Labor: 1.5 hrs @ 180 THB/hr = 270 THB. Consumables = 50 THB. Direct = 1020 THB.',
        input: {
          actualMachineHours: 2.0,
          actualSetupHours: 0.5,
          actualLaborHours: 1.5,
          machineCostRateRef: 350,
          laborRateRef: 180,
          includesLaborInMachineRate: false,
          actualConsumablesCost: 50,
          actualExternalRepairCost: 0,
          actualTransportationCost: 0,
          actualQcCost: 0,
          newPurchasePrice: 12000,
          expectedNewToolLife: 15000000,
          expectedLifeAfterRepair: 1500000,
          regrindingNo: 1,
          maxRegrindCount: 12
        },
        expected: {
          machineCost: 700,
          laborCost: 270,
          directRepairCost: 1020,
          totalRepairCost: 1020,
          netSaving: 10980,
          savingPercentage: 91.5
        }
      },
      {
        name: 'Case 2: Double-Counting Safeguard (Machine Rate INCLUDES Labor)',
        description: 'Machine: 2.0 hrs @ 550 THB/hr (Includes Labor) = 1100 THB. Labor cost MUST be set to 0 to prevent double-counting.',
        input: {
          actualMachineHours: 2.0,
          actualSetupHours: 0.5,
          actualLaborHours: 1.5,
          machineCostRateRef: 550,
          laborRateRef: 180,
          includesLaborInMachineRate: true,
          actualConsumablesCost: 50,
          actualExternalRepairCost: 0,
          actualTransportationCost: 0,
          actualQcCost: 0,
          newPurchasePrice: 12000,
          expectedNewToolLife: 15000000,
          expectedLifeAfterRepair: 1500000,
          regrindingNo: 1,
          maxRegrindCount: 12
        },
        expected: {
          machineCost: 1100,
          laborCost: 0,
          directRepairCost: 1150,
          totalRepairCost: 1150,
          netSaving: 10850
        }
      },
      {
        name: 'Case 3: Estimate vs Actual Variance Test',
        description: 'Estimated Repair = 1000 THB. Actual Total = 1250 THB. Variance = +250 THB (+25.0%).',
        input: {
          actualMachineHours: 2.5,
          machineCostRateRef: 350,
          actualLaborHours: 2.0,
          laborRateRef: 180,
          includesLaborInMachineRate: false,
          estimatedTotalRepairCost: 1000,
          newPurchasePrice: 15000,
          expectedNewToolLife: 15000000,
          expectedLifeAfterRepair: 1500000,
          regrindingNo: 2,
          maxRegrindCount: 10
        },
        expected: {
          directRepairCost: 1235,
          totalRepairCost: 1235,
          estimatedTotalRepairCost: 1000,
          costVarianceThb: 235,
          costVariancePercentage: 23.5
        }
      }
    ];

    return testCases.map(tc => {
      const actual = this.computeTransactionMetrics(tc.input);
      let passed = true;

      if (tc.expected.machineCost !== undefined && Math.abs(actual.machineCost - tc.expected.machineCost) > 0.05) passed = false;
      if (tc.expected.laborCost !== undefined && Math.abs(actual.laborCost - tc.expected.laborCost) > 0.05) passed = false;
      if (tc.expected.directRepairCost !== undefined && Math.abs(actual.directRepairCost - tc.expected.directRepairCost) > 0.05) passed = false;
      if (tc.expected.totalRepairCost !== undefined && Math.abs(actual.totalRepairCost - tc.expected.totalRepairCost) > 0.05) passed = false;
      if (tc.expected.netSaving !== undefined && Math.abs(actual.netSaving - tc.expected.netSaving) > 0.05) passed = false;
      if (tc.expected.costVarianceThb !== undefined && Math.abs(actual.costVarianceThb - tc.expected.costVarianceThb) > 0.05) passed = false;

      return {
        name: tc.name,
        description: tc.description,
        input: tc.input,
        expected: tc.expected,
        actual,
        passed
      };
    });
  }
}

