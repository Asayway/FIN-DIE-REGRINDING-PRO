import { ProductionLineId } from './index';

export type PartCategoryType = 
  | 'PUNCH'
  | 'DIE'
  | 'BLADE'
  | 'PIN'
  | 'CORNER_CUT'
  | 'CENTER_PUNCH'
  | 'OTHER';

export type CurrencyCode = 'THB' | 'USD' | 'JPY' | 'EUR';

export type QualityResultCode = 'PASS' | 'CONDITIONAL' | 'REWORK' | 'SCRAP';

export type DecisionVerdict = 'REGRIND' | 'MONITOR' | 'REPLACE';

export interface PriceRevisionHistoryEntry {
  id: string;
  revisionDate: string; // ISO or YYYY-MM-DD
  oldPrice: number;
  newPrice: number;
  currency: CurrencyCode;
  changedBy: string;
  reason: string;
  effectiveDate: string;
}

export interface RateRevisionHistoryEntry {
  id: string;
  revisionDate: string; // ISO
  oldMachineRate: number;
  newMachineRate: number;
  oldLaborRate: number;
  newLaborRate: number;
  changedBy: string;
  reason: string;
  effectiveDate: string;
  includesLaborInMachineRate: boolean;
}

export interface CostRateMasterItem {
  id: string;
  machineId: string; // e.g. "GRIND-01", "GRIND-02", "INTERNAL_CELL"
  machineName: string; // e.g. "OKAMOTO High-Precision Surface Grinder #1"
  machineCostRatePerHour: number; // THB / hour
  operatorLaborRatePerHour: number; // THB / hour
  consumablesCostRatePerHour?: number; // THB / hour or default
  qcCostRatePerHour?: number; // THB / hour
  includesLaborInMachineRate: boolean; // Flag: TRUE = Machine rate already includes operator labor (prevent double-counting!)
  rateCalculationMethod: 'FULL_COSTING' | 'DIRECT_COSTING' | 'ACTIVITY_BASED' | 'STANDARD_FACTORY_APPROVED' | string;
  currency: CurrencyCode; // 'THB'
  effectiveDate: string; // YYYY-MM-DD
  updatedBy: string;
  isActive: boolean;
  notes?: string; // Depreciation, power, maintenance allocation notes
  rateRevisionHistory: RateRevisionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PartCostMasterItem {
  id: string;
  partNo: string; // e.g. "DWG-PB-001", "E1-DWG-PB-001"
  partName: string;
  partType: PartCategoryType;
  machineLine: ProductionLineId | 'ALL';
  newPurchasePrice: number;
  expectedNewToolLife: number; // In Shots, e.g. 15,000,000
  actualNewToolLife?: number; // In Shots (if confirmed by production history)
  supplier: string;
  currency: CurrencyCode;
  effectiveDate: string; // YYYY-MM-DD
  drawingNo?: string;
  nominalLengthMm: number;
  minAllowedLengthMm: number;
  maxRegrindCount: number;
  disposeAfterOneUse?: boolean;
  priceRevisionHistory: PriceRevisionHistoryEntry[];
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export interface RegrindingTransactionItem {
  id: string;
  repairId: string; // e.g. "REP-2026-0001"
  partNo: string;
  partName: string;
  machineLine: ProductionLineId;
  repairDate: string; // YYYY-MM-DD
  regrindingNo: number; // 1st, 2nd, 3rd, etc.
  
  // Rate Master References & Hours
  rateMasterId?: string;
  rateMasterMachineName?: string;
  actualMachineHours: number; // Actual Grinding Machine Hours
  actualSetupHours: number; // Actual Setup Hours (separated from grinding hours)
  actualLaborHours: number; // Actual Operator Labor Hours
  machineCostRateRef: number; // Machine Cost Rate THB/hr used for this job
  laborRateRef: number; // Labor Rate THB/hr used for this job
  includesLaborInMachineRate: boolean; // Copied flag: TRUE = labor included in machine rate

  // Computed & Input Cost Components
  machineCost: number; // actualMachineHours * machineCostRateRef
  laborCost: number; // includesLaborInMachineRate ? 0 : (actualLaborHours * laborRateRef)
  actualConsumablesCost: number; // Wheel wear, coolant, shims
  actualExternalRepairCost: number; // Vendor fee if outsourced
  actualTransportationCost: number; // Delivery / freight
  actualQcCost: number; // QC / Inspection cost
  otherDirectCost: number; // Coatings, misc direct cost
  
  // Direct Repair Cost = machineCost + laborCost + actualConsumablesCost + actualExternalRepairCost + actualTransportationCost + actualQcCost + otherDirectCost
  directRepairCost: number;

  // Legacy field support (mapped to directRepairCost or external repair)
  repairCost: number;
  transportationCost: number;
  internalLaborCost: number;
  otherCost: number;

  // Budget / Estimate Breakdown (Estimate vs Actual)
  estimatedMachineHours?: number;
  estimatedSetupHours?: number;
  estimatedLaborHours?: number;
  estimatedConsumablesCost?: number;
  estimatedTotalRepairCost?: number;
  costVarianceThb?: number; // actualTotalRepairCost - estimatedTotalRepairCost
  costVariancePercentage?: number;

  // Total Repair Cost = directRepairCost + downtimeCost + qualityLossCost
  totalRepairCost: number;

  // Shot Counts & Tool Life
  shotCountBeforeRepair: number; // Cumulative shots when pulled from die
  shotCountAfterRepair: number; // Starting shot baseline
  expectedLifeAfterRepair: number; // Expected shots for this regrind cycle
  actualLifeAfterRepair?: number; // Actual shots until next pulled/scrapped
  hasActualLife: boolean; // TRUE = Actual data; FALSE = Estimated (Expected)

  // Service & Quality
  supplier: string; // Vendor or Internal Shop
  qualityResult: QualityResultCode;

  // Impact Costs
  downtimeCost: number; // Additional downtime loss during change
  qualityLossCost: number; // Scrap workpiece loss due to wear

  // Financial Calculations
  newPurchaseEquivalentCost: number; // Baseline equivalent new tool purchase
  grossSaving: number; // newPurchaseEquivalentCost - totalRepairCost
  netSaving: number; // grossSaving - downtimeCost - qualityLossCost
  savingPercentage: number; // (netSaving / newPurchaseEquivalentCost) * 100

  // Cost per shot metrics
  costPerShotNewTool: number; // newPurchasePrice / (actualNewToolLife || expectedNewToolLife)
  costPerShotRegrind: number; // totalRepairCost / (actualLifeAfterRepair || expectedLifeAfterRepair)
  costPerShotIsEstimated: boolean; // True if using expected life

  // Fair Comparison (Normalized Target Life)
  fairTargetShots: number;
  fairNewToolCost: number;
  fairRegrindEquivalentCost: number;
  fairNormalizedSaving: number;
  fairAssumptions: string;

  // Physical specs
  remainingLengthMm?: number;
  grindDepthMm?: number;
  surfaceRoughnessRa?: number;
  inspectorName?: string;
  technicianName?: string;
  remarks?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DecisionSupportResult {
  partNo: string;
  partName: string;
  regrindingNo: number;
  verdict: DecisionVerdict; // REGRIND (Green) | MONITOR (Yellow) | REPLACE (Red)
  score: number; // 0 - 100 confidence score
  summaryTh: string;
  reasons: string[];
  engineeringAlerts: string[];
  financialComparison: {
    regrindCostPerShot: number;
    newToolCostPerShot: number;
    savingPerShot: number;
    isEstimated: boolean;
    breakEvenCycles: number;
    fairComparisonSavingThb: number;
  };
  toolLifeMetrics: {
    remainingLifePercent: number; // Remaining tool life %
    remainingRegrindCycles: number;
    currentLengthMm?: number;
    minAllowedLengthMm?: number;
    accumulatedShots: number;
  };
}

export type CostPeriodFilter = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

export interface CostDashboardFilter {
  periodType: CostPeriodFilter;
  year: number;
  month?: number; // 1-12
  quarter?: number; // 1-4
  startDate?: string;
  endDate?: string;
  lineId: string; // 'ALL' or ProductionLineId
  partNo: string; // 'ALL' or partNo
  partType: string; // 'ALL' or PartCategoryType
  qualityStatus: string; // 'ALL' or QualityResultCode
  dataTypeFilter: 'ALL' | 'ACTUAL_ONLY' | 'ESTIMATED_ONLY';
}

export interface MachineCostBreakdownItem {
  machineName: string;
  totalCost: number;
  machineCost: number;
  laborCost: number;
  machineHours: number;
  laborHours: number;
  count: number;
}

export interface PartCostBreakdownItem {
  partNo: string;
  partName: string;
  totalCost: number;
  grossSaving: number;
  netSaving: number;
  regrindCount: number;
}

export interface MonthlyCostTrendItem {
  monthLabel: string;
  totalCost: number;
  machineCost: number;
  laborCost: number;
  netSaving: number;
  regrindCount: number;
}

export interface CostSummaryMetrics {
  totalTransactions: number;
  totalRegrindingCost: number;
  newPurchaseEquivalentCost: number;
  grossSaving: number;
  netSaving: number;
  savingPercentage: number;
  
  // Machine & Labor Cost Additions
  totalMachineCost: number;
  totalLaborCost: number;
  totalConsumablesCost: number;
  totalExternalRepairCost: number;
  totalQcCost: number;
  totalMachineHours: number;
  totalLaborHours: number;

  // Estimates vs Actuals Variance
  totalEstimatedRepairCost: number;
  totalCostVarianceThb: number;
  totalCostVariancePercentage: number;

  // Separation of Actual vs Estimated
  actualTransactionsCount: number;
  estimatedTransactionsCount: number;
  actualNetSaving: number;
  estimatedNetSaving: number;

  // Cost component breakdowns
  directRepairCost: number;
  transportationCost: number;
  internalLaborCost: number;
  otherCost: number;
  downtimeCost: number;
  qualityLossCost: number;

  // Aggregated breakdowns for charts
  repairCostByPartNo: PartCostBreakdownItem[];
  repairCostByMachine: MachineCostBreakdownItem[];
  monthlyCostTrend: MonthlyCostTrendItem[];

  // Efficiency
  avgSavingPerTransaction: number;
  avgCostPerShotRatio: number; // regrindCostPerShot / newToolCostPerShot
}

