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
  ratedPowerKw?: number;
  loadFactorPercent?: number;
  electricityPricePerKwh?: number;
  consumablesVariableRatePerHour?: number;
  consumablesFixedCostPerJob?: number;
}

export interface CostRateMasterItem {
  id: string;
  machineId: string; // e.g. "GRIND-01", "GRIND-02", "INTERNAL_CELL"
  machineName: string; // e.g. "OKAMOTO High-Precision Surface Grinder #1"
  machineCostRatePerHour: number; // THB / hour (Machine Cost Rate)
  operatorLaborRatePerHour: number; // THB / hour (Labor Rate)
  consumablesCostRatePerHour?: number; // THB / hour (Variable Consumables Rate)
  consumablesFixedCostPerJob?: number; // THB / job (Fixed Consumables Cost per repair job)
  qcCostRatePerHour?: number; // THB / hour (QC Inspection Rate)
  includesLaborInMachineRate: boolean; // Flag: TRUE = Machine rate already includes operator labor (prevent double-counting!)
  
  // SECTION A: Physical Machine & Electricity Engineering Parameters
  ratedPowerKw?: number; // Rated Power in kW (default: 15 kW)
  loadFactorPercent?: number; // Load Factor in % (default: 75%)
  electricityPricePerKwh?: number; // Electricity price in THB/kWh (default: 4.50 THB/kWh)
  auxiliaryPowerKw?: number; // Auxiliary Power in kW (default: 0 kW)

  // Optional Granular Machine Cost Breakdown (THB/hour)
  depreciationCostPerHour?: number; // Depreciation Cost
  maintenanceCostPerHour?: number; // Preventative & Corrective Maintenance Cost
  coolantCostPerHour?: number; // Coolant & Lubrication Cost
  machineToolingCostPerHour?: number; // Grinding Wheel & Tooling Cost
  factoryOverheadCostPerHour?: number; // Factory Overhead Allocation
  otherMachineCostPerHour?: number; // Other Machine Direct Costs

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
  purchasePriceUsd?: number;
  expectedNewToolLife: number; // In Shots, e.g. 15,000,000
  actualNewToolLife?: number; // In Shots (if confirmed by production history)
  supplier: string;
  currency: CurrencyCode;
  effectiveDate: string; // YYYY-MM-DD
  drawingNo?: string;
  stage?: string;
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
  
  laborHours?: number; // Direct labor hours field / alias
  sparePartsUsed?: string; // Spare parts / shims consumed during repair
  sparePartsCost?: number; // Cost of spare parts consumed

  // Direct Repair Cost = machineCost + laborCost + actualConsumablesCost + actualExternalRepairCost + actualTransportationCost + actualQcCost + sparePartsCost + otherDirectCost
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

export type CostPeriodFilter = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ALL' | 'CUSTOM';

export interface CostDashboardFilter {
  periodType: CostPeriodFilter;
  year: number;
  month?: number; // 1-12
  quarter?: number; // 1-4
  selectedDate?: string; // YYYY-MM-DD for DAILY / WEEKLY
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
  totalSparePartsCost?: number;
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

// ==========================================
// STEP-BY-STEP TRUE GRINDING COST SIMULATION
// ==========================================

export type TechnicianSkillGrade = 'GRADE_C' | 'GRADE_B' | 'GRADE_A' | 'GRADE_S';
export type OvertimeMultiplierType = 'NORMAL' | 'OT_1_5X' | 'OT_2_0X' | 'OT_3_0X';

export interface TrueJobCostSimulationInput {
  // Step 1: Machine Capital, Useful Life & Electricity
  machineAssetValueThb: number; // e.g. 2,400,000 THB
  usefulLifeHours: number; // e.g. 20,000 operating hours (Depreciation = 120 THB/hr)
  maintenanceReservePerHour: number; // e.g. 35 THB/hr
  ratedPowerKw: number; // e.g. 15 kW
  loadFactorPercent: number; // e.g. 75%
  electricityPricePerKwh: number; // e.g. 4.50 THB/kWh
  machineRunningHours: number; // from repair job, e.g. 1.5 hrs

  // Step 2: Employee Labor, Overtime & Skill Tier
  baseLaborRatePerHour: number; // e.g. 150 THB/hr
  skillGrade: TechnicianSkillGrade; // e.g. GRADE_A (+50 THB/hr)
  overtimeCondition: OvertimeMultiplierType; // NORMAL (1x), OT_1_5X (1.5x), OT_2_0X (2x), OT_3_0X (3x)
  setupLaborHours: number; // e.g. 0.5 hr
  directLaborHours: number; // e.g. 1.0 hr
  includesLaborInMachineRate: boolean; // Flag to prevent double counting

  // Step 3: Consumables & Abrasive Tooling Wear
  wheelWearCostPerJob: number; // CBN / Diamond wheel wear, e.g. 45 THB
  dressingToolWearCost: number; // Diamond dresser tip amortized, e.g. 15 THB
  consumableSundriesCost: number; // Wiping rags, deburring brushes, abrasive paste, e.g. 25 THB
  coolantCostPerJob: number; // Synthetic coolant fluid usage, e.g. 20 THB

  // Step 4: Quality Control & Overhead
  qcInspectionHours: number; // e.g. 0.25 hr (15 mins)
  qcHourlyRate: number; // e.g. 120 THB/hr
  shopfloorOverheadFixedThb: number; // e.g. 50 THB allocated overhead

  // Step 5: Output & Tooling Benchmark
  quantityPieces: number; // e.g. 5 pcs in this job batch
  newPurchasePricePerPiece: number; // e.g. 2,500 THB per new tool
  targetToolLifeShots?: number; // e.g. 15,000,000 shots
}

export interface TrueJobCostSimulationResult {
  // Step 1 Subtotals
  depreciationPerHour: number;
  electricityPerHour: number;
  totalMachineRatePerHour: number;
  step1MachineDepreciationCost: number;
  step1ElectricityCost: number;
  step1MaintenanceCost: number;
  step1TotalMachineAndPower: number;

  // Step 2 Subtotals
  skillAllowancePerHour: number;
  effectiveBaseRatePerHour: number;
  otMultiplier: number;
  effectiveOtRatePerHour: number;
  step2SetupLaborCost: number;
  step2DirectLaborCost: number;
  step2TotalLaborCost: number;
  laborDoubleCountingPrevented: boolean;

  // Step 3 Subtotals
  step3WheelWearCost: number;
  step3DressingToolCost: number;
  step3SundriesCost: number;
  step3CoolantCost: number;
  step3TotalConsumables: number;

  // Step 4 Subtotals
  step4QcCost: number;
  step4OverheadCost: number;
  step4TotalQcAndOverhead: number;

  // Step 5 Grand Totals & Economics
  step5GrandTotalJobCost: number;
  step5CostPerPiece: number;
  step5TotalNewToolEquivalentCost: number;
  step5NetCostSaving: number;
  step5SavingPercentage: number;
}


