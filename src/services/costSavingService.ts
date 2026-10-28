import {
  PartCostMasterItem,
  CostRateMasterItem,
  RateRevisionHistoryEntry,
  RegrindingTransactionItem,
  CostDashboardFilter,
  CostSummaryMetrics,
  PriceRevisionHistoryEntry
} from '../types/costSaving';
import { safeStorage } from './safeStorage';
import { storageService } from './storageService';
import { MOLD_DIE_MASTER_ITEMS_2025 } from '../data/moldDieMasterData';
import { CostSavingCalculationService } from './costSavingCalculationService';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  PART_COST_MASTERS: 'fin_die_part_cost_masters_v1',
  COST_RATE_MASTERS: 'fin_die_cost_rate_masters_v1',
  REGRIND_TRANSACTIONS: 'fin_die_regrind_transactions_v1'
};

type CostListener = () => void;

class CostSavingService {
  private listeners: Set<CostListener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: CostListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.warn('CostSavingService listener error:', err);
      }
    });
  }

  private ensureInitialized() {
    try {
      if (!safeStorage.getItem(STORAGE_KEYS.PART_COST_MASTERS)) {
        const initialMasters = this.generateInitialPartCostMasters();
        safeStorage.setItem(STORAGE_KEYS.PART_COST_MASTERS, JSON.stringify(initialMasters));
      }

      if (!safeStorage.getItem(STORAGE_KEYS.COST_RATE_MASTERS)) {
        const initialRates = this.generateInitialCostRateMasters();
        safeStorage.setItem(STORAGE_KEYS.COST_RATE_MASTERS, JSON.stringify(initialRates));
      }

      if (!safeStorage.getItem(STORAGE_KEYS.REGRIND_TRANSACTIONS)) {
        const initialTx = this.generateInitialTransactions();
        safeStorage.setItem(STORAGE_KEYS.REGRIND_TRANSACTIONS, JSON.stringify(initialTx));
      }
    } catch (e) {
      console.warn('CostSavingService storage init warning:', e);
    }
  }

  /**
   * Seed standard factory-approved Cost Rate Masters
   */
  private generateInitialCostRateMasters(): CostRateMasterItem[] {
    const now = '2025-01-01T08:00:00Z';
    return [
      {
        id: 'CR-GRIND-01',
        machineId: 'GRIND-01',
        machineName: 'OKAMOTO High-Precision Surface Grinder #1',
        machineCostRatePerHour: 350.00,
        operatorLaborRatePerHour: 180.00,
        consumablesCostRatePerHour: 50.00,
        qcCostRatePerHour: 120.00,
        includesLaborInMachineRate: false,
        rateCalculationMethod: 'STANDARD_FACTORY_APPROVED',
        currency: 'THB',
        effectiveDate: '2025-01-01',
        updatedBy: 'Somchai Prasert (Industrial Eng.)',
        isActive: true,
        notes: 'อัตรามาตรฐานโรงงาน: รวมค่าเสื่อมราคาเครื่องจักร (5 ปี Straight-Line), ค่าไฟฟ้า 15kW, coolant และ preventative maintenance แยกคิดค่าแรงช่างตามชั่วโมงจริง',
        rateRevisionHistory: [
          {
            id: 'REV-CR-01-001',
            revisionDate: now,
            oldMachineRate: 350.00,
            newMachineRate: 350.00,
            oldLaborRate: 180.00,
            newLaborRate: 180.00,
            changedBy: 'Somchai Prasert',
            reason: 'Baseline rate configuration 2025',
            effectiveDate: '2025-01-01',
            includesLaborInMachineRate: false
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'CR-GRIND-02',
        machineId: 'GRIND-02',
        machineName: 'WASINO CNC Optical Profile Grinder #2',
        machineCostRatePerHour: 580.00,
        operatorLaborRatePerHour: 220.00,
        consumablesCostRatePerHour: 80.00,
        qcCostRatePerHour: 150.00,
        includesLaborInMachineRate: false,
        rateCalculationMethod: 'FULL_COSTING',
        currency: 'THB',
        effectiveDate: '2025-01-01',
        updatedBy: 'Anan Suksamran (Tooling Dept Manager)',
        isActive: true,
        notes: 'เครื่องเจียรโปรไฟล์ความละเอียดสูงสำหรับ R-Punch Complex Form แยกคิดค่าแรงช่างอาชญานุภาพระดับ Master',
        rateRevisionHistory: [
          {
            id: 'REV-CR-02-001',
            revisionDate: now,
            oldMachineRate: 580.00,
            newMachineRate: 580.00,
            oldLaborRate: 220.00,
            newLaborRate: 220.00,
            changedBy: 'Anan Suksamran',
            reason: 'Full costing calibration 2025',
            effectiveDate: '2025-01-01',
            includesLaborInMachineRate: false
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'CR-GRIND-CELL-03',
        machineId: 'INTERNAL_CELL_01',
        machineName: 'Integrated Toolroom Repair Cell (Combined Rate)',
        machineCostRatePerHour: 550.00,
        operatorLaborRatePerHour: 0.00,
        consumablesCostRatePerHour: 60.00,
        qcCostRatePerHour: 100.00,
        includesLaborInMachineRate: true,
        rateCalculationMethod: 'FULL_COSTING',
        currency: 'THB',
        effectiveDate: '2025-01-01',
        updatedBy: 'Finance Controller',
        isActive: true,
        notes: 'อัตราเหมาจ่ายรวมค่าแรงช่างประจำเซลล์แล้ว (Machine Rate Includes Operator Labor) เพื่อป้องกันการนับค่าแรงซ้ำ (Prevent Double-Counting)',
        rateRevisionHistory: [
          {
            id: 'REV-CR-03-001',
            revisionDate: now,
            oldMachineRate: 550.00,
            newMachineRate: 550.00,
            oldLaborRate: 0.00,
            newLaborRate: 0.00,
            changedBy: 'Finance Controller',
            reason: 'Combined cell rate setup',
            effectiveDate: '2025-01-01',
            includesLaborInMachineRate: true
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'CR-EXT-SUPPLIER',
        machineId: 'SAN_EI_EXT',
        machineName: 'SAN-EI Precision External Service Rate',
        machineCostRatePerHour: 0.00,
        operatorLaborRatePerHour: 0.00,
        consumablesCostRatePerHour: 0.00,
        qcCostRatePerHour: 0.00,
        includesLaborInMachineRate: false,
        rateCalculationMethod: 'DIRECT_COSTING',
        currency: 'THB',
        effectiveDate: '2025-01-01',
        updatedBy: 'Procurement Specialist',
        isActive: true,
        notes: 'อัตราค่าบริการซัพพลายเออร์ภายนอก (คิดตามใบเสนอราคา/Invoice รวม)',
        rateRevisionHistory: [],
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  // =========================================================================
  // Cost Rate Master CRUD
  // =========================================================================

  public getCostRateMasters(): CostRateMasterItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.COST_RATE_MASTERS);
      if (!raw) return this.generateInitialCostRateMasters();
      return JSON.parse(raw);
    } catch {
      return this.generateInitialCostRateMasters();
    }
  }

  public getCostRateMasterById(id: string): CostRateMasterItem | undefined {
    const list = this.getCostRateMasters();
    return list.find(r => r.id === id || r.machineId === id);
  }

  public saveCostRateMaster(
    item: CostRateMasterItem,
    updatedBy: string = 'Authorized Engineer',
    revisionReason?: string
  ): { success: boolean; message: string; data?: CostRateMasterItem } {
    try {
      const list = this.getCostRateMasters();
      const existingIdx = list.findIndex(r => r.id === item.id || r.machineId.toUpperCase() === item.machineId.toUpperCase());
      const now = new Date().toISOString();
      const nowFormatted = now.slice(0, 10);

      if (existingIdx >= 0) {
        const existing = list[existingIdx];
        const revisions = [...(existing.rateRevisionHistory || [])];

        if (
          existing.machineCostRatePerHour !== item.machineCostRatePerHour ||
          existing.operatorLaborRatePerHour !== item.operatorLaborRatePerHour ||
          existing.includesLaborInMachineRate !== item.includesLaborInMachineRate
        ) {
          revisions.unshift({
            id: `REV-CR-${Date.now()}`,
            revisionDate: now,
            oldMachineRate: existing.machineCostRatePerHour,
            newMachineRate: item.machineCostRatePerHour,
            oldLaborRate: existing.operatorLaborRatePerHour,
            newLaborRate: item.operatorLaborRatePerHour,
            changedBy: updatedBy,
            reason: revisionReason || 'Rate Adjustment / Policy Change',
            effectiveDate: item.effectiveDate || nowFormatted,
            includesLaborInMachineRate: item.includesLaborInMachineRate
          });
        }

        const updated: CostRateMasterItem = {
          ...item,
          rateRevisionHistory: revisions,
          updatedAt: now
        };

        list[existingIdx] = updated;
        safeStorage.setItem(STORAGE_KEYS.COST_RATE_MASTERS, JSON.stringify(list));
        this.notify();
        return { success: true, message: `อัปเดตอัตราต้นทุนเครื่องจักร "${item.machineName}" สำเร็จ`, data: updated };
      } else {
        const duplicate = list.some(r => r.machineId.toUpperCase() === item.machineId.toUpperCase());
        if (duplicate) {
          return { success: false, message: `Machine ID "${item.machineId}" มีอยู่ในระบบแล้ว` };
        }

        const newEntry: CostRateMasterItem = {
          ...item,
          id: item.id || `CR-${item.machineId}-${Date.now()}`,
          rateRevisionHistory: [
            {
              id: `REV-CR-${Date.now()}`,
              revisionDate: now,
              oldMachineRate: item.machineCostRatePerHour,
              newMachineRate: item.machineCostRatePerHour,
              oldLaborRate: item.operatorLaborRatePerHour,
              newLaborRate: item.operatorLaborRatePerHour,
              changedBy: updatedBy,
              reason: revisionReason || 'Initial Registration',
              effectiveDate: item.effectiveDate || nowFormatted,
              includesLaborInMachineRate: item.includesLaborInMachineRate
            }
          ],
          createdAt: now,
          updatedAt: now
        };

        list.push(newEntry);
        safeStorage.setItem(STORAGE_KEYS.COST_RATE_MASTERS, JSON.stringify(list));
        this.notify();
        return { success: true, message: `บันทึกอัตราต้นทุนเครื่องจักรใหม่ "${item.machineName}" สำเร็จ`, data: newEntry };
      }
    } catch (err: any) {
      return { success: false, message: `ข้อผิดพลาดในการบันทึกอัตราต้นทุน: ${err.message}` };
    }
  }

  public toggleCostRateMasterActive(id: string): { success: boolean; message: string } {
    try {
      const list = this.getCostRateMasters();
      const idx = list.findIndex(r => r.id === id);
      if (idx < 0) return { success: false, message: 'ไม่พบรายการอัตราต้นทุน' };

      list[idx].isActive = !list[idx].isActive;
      list[idx].updatedAt = new Date().toISOString();
      safeStorage.setItem(STORAGE_KEYS.COST_RATE_MASTERS, JSON.stringify(list));
      this.notify();
      return { success: true, message: `เปลี่ยนสถานะ "${list[idx].machineName}" เรียบร้อยแล้ว` };
    } catch (err: any) {
      return { success: false, message: `ข้อผิดพลาด: ${err.message}` };
    }
  }

  /**
   * Seed authentic canonical part cost masters using the 79 canonical tooling items
   */
  private generateInitialPartCostMasters(): PartCostMasterItem[] {
    const list: PartCostMasterItem[] = [];

    MOLD_DIE_MASTER_ITEMS_2025.forEach((item, idx) => {
      const isDie = item.partName.toUpperCase().includes('DIE');
      const isBlade = item.partName.toUpperCase().includes('BLADE');
      const isPin = item.partName.toUpperCase().includes('PIN');
      const isCorner = item.partName.toUpperCase().includes('CORNER');
      const isCenter = item.partName.toUpperCase().includes('CENTER');

      const partType = isDie ? 'DIE' 
        : isBlade ? 'BLADE' 
        : isPin ? 'PIN' 
        : isCorner ? 'CORNER_CUT' 
        : isCenter ? 'CENTER_PUNCH' 
        : 'PUNCH';

      const isDisposable = item.regrindStandard.perGrindMm.toLowerCase().includes('dispose') ||
        item.regrindStandard.note.toLowerCase().includes('dispose');

      const newPrice = isDie ? 22000 
        : isBlade ? 28000 
        : isPin ? 4800 
        : isCorner ? 16500 
        : 12500;

      const cycles = isDisposable ? 0 : (parseInt(item.regrindStandard.regrindCycles) || 12);
      const totalGrindMm = parseFloat(item.regrindStandard.totalGrindMm) || (isDisposable ? 0 : 1.50);
      const nominalLengthMm = 45.00;
      const minAllowedLengthMm = Number((nominalLengthMm - totalGrindMm).toFixed(2));

      list.push({
        id: `PCM-${item.drawingNo}`,
        partNo: item.drawingNo,
        partName: item.partName,
        partType,
        machineLine: 'ALL',
        newPurchasePrice: newPrice,
        expectedNewToolLife: 15_000_000,
        actualNewToolLife: 15_200_000,
        supplier: 'MISUMI (THAILAND) CO., LTD.',
        currency: 'THB',
        effectiveDate: '2025-01-01',
        drawingNo: item.drawingNo,
        nominalLengthMm,
        minAllowedLengthMm,
        maxRegrindCount: cycles,
        disposeAfterOneUse: isDisposable,
        priceRevisionHistory: [
          {
            id: `REV-${item.drawingNo}-001`,
            revisionDate: '2025-01-01',
            oldPrice: newPrice,
            newPrice: newPrice,
            currency: 'THB',
            changedBy: 'Somchai Prasert (Die Engineering)',
            reason: 'Baseline engineering procurement contract 2025',
            effectiveDate: '2025-01-01'
          }
        ],
        notes: item.regrindStandard.note,
        createdAt: '2025-01-01T08:00:00Z',
        updatedAt: '2025-01-01T08:00:00Z'
      });
    });

    return list;
  }

  /**
   * Seed realistic historical regrinding transactions spanning 2025-2026
   */
  private generateInitialTransactions(): RegrindingTransactionItem[] {
    const masters = this.generateInitialPartCostMasters();
    const rateMasters = this.generateInitialCostRateMasters();
    const defaultRate = rateMasters[0];
    const transactions: RegrindingTransactionItem[] = [];

    const sampleSpecs = [
      { drawingNo: 'DWG-PB-001', line: 'E1', date: '2026-01-12', cycle: 1, mHrs: 1.8, lHrs: 1.5, mRate: 350, lRate: 180, incLabor: false, cons: 50, extRepair: 0, transport: 100, qcCost: 0, other: 0, quality: 'PASS', actualLife: 1540000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-PB-001', line: 'E1', date: '2026-02-18', cycle: 2, mHrs: 1.8, lHrs: 1.5, mRate: 350, lRate: 180, incLabor: false, cons: 50, extRepair: 0, transport: 100, qcCost: 0, other: 0, quality: 'PASS', actualLife: 1490000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-PB-002', line: 'E2', date: '2026-01-20', cycle: 1, mHrs: 2.0, lHrs: 1.8, mRate: 350, lRate: 180, incLabor: false, cons: 60, extRepair: 0, transport: 120, qcCost: 50, other: 0, quality: 'PASS', actualLife: 1520000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-PB-003', line: 'E2', date: '2026-02-05', cycle: 3, mHrs: 2.2, lHrs: 2.0, mRate: 350, lRate: 180, incLabor: false, cons: 80, extRepair: 0, transport: 150, qcCost: 80, other: 0, quality: 'PASS', actualLife: 1480000, dtCost: 300, qLossCost: 150 },
      { drawingNo: 'DWG-IR-006', line: 'E4', date: '2026-03-10', cycle: 2, mHrs: 2.5, lHrs: 2.2, mRate: 580, lRate: 220, incLabor: false, cons: 100, extRepair: 0, transport: 150, qcCost: 100, other: 0, quality: 'PASS', actualLife: 1500000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-IR-007', line: 'E4', date: '2026-03-24', cycle: 1, mHrs: 2.8, lHrs: 2.5, mRate: 580, lRate: 220, incLabor: false, cons: 120, extRepair: 0, transport: 200, qcCost: 120, other: 0, quality: 'PASS', actualLife: 1600000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-LV-010', line: 'E5', date: '2026-04-14', cycle: 4, mHrs: 2.0, lHrs: 1.8, mRate: 350, lRate: 180, incLabor: false, cons: 70, extRepair: 0, transport: 120, qcCost: 60, other: 0, quality: 'CONDITIONAL', actualLife: 1320000, dtCost: 450, qLossCost: 200 },
      { drawingNo: 'DWG-LV-011', line: 'E5', date: '2026-05-02', cycle: 2, mHrs: 2.2, lHrs: 2.0, mRate: 350, lRate: 180, incLabor: false, cons: 80, extRepair: 0, transport: 120, qcCost: 70, other: 0, quality: 'PASS', actualLife: 1510000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-RF-014', line: 'E3-1', date: '2026-05-20', cycle: 1, mHrs: 2.4, lHrs: 2.0, mRate: 350, lRate: 180, incLabor: false, cons: 90, extRepair: 0, transport: 150, qcCost: 80, other: 0, quality: 'PASS', actualLife: 1550000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-RF-015', line: 'E3-1', date: '2026-06-11', cycle: 2, mHrs: 2.5, lHrs: 2.2, mRate: 350, lRate: 180, incLabor: false, cons: 100, extRepair: 0, transport: 150, qcCost: 90, other: 0, quality: 'PASS', actualLife: 1480000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-CO-024', line: 'E1', date: '2026-07-08', cycle: 3, mHrs: 3.0, lHrs: 2.8, mRate: 580, lRate: 220, incLabor: false, cons: 150, extRepair: 0, transport: 200, qcCost: 150, other: 0, quality: 'PASS', actualLife: 1530000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-CO-025', line: 'E2', date: '2026-08-15', cycle: 5, mHrs: 3.2, lHrs: 3.0, mRate: 580, lRate: 220, incLabor: false, cons: 180, extRepair: 0, transport: 200, qcCost: 180, other: 0, quality: 'CONDITIONAL', actualLife: 1380000, dtCost: 600, qLossCost: 350 },
      { drawingNo: 'DWG-SC-030', line: 'E4', date: '2026-09-04', cycle: 2, mHrs: 2.6, lHrs: 2.4, mRate: 350, lRate: 180, incLabor: false, cons: 110, extRepair: 0, transport: 180, qcCost: 100, other: 0, quality: 'PASS', actualLife: 1520000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-CC-036', line: 'E5', date: '2026-09-22', cycle: 1, mHrs: 2.5, lHrs: 2.2, mRate: 350, lRate: 180, incLabor: false, cons: 100, extRepair: 0, transport: 160, qcCost: 90, other: 0, quality: 'PASS', actualLife: 1560000, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-PB-001', line: 'E1', date: '2026-10-05', cycle: 3, mHrs: 1.8, lHrs: 1.5, mRate: 350, lRate: 180, incLabor: false, cons: 50, extRepair: 0, transport: 100, qcCost: 50, other: 0, quality: 'PASS', actualLife: undefined, dtCost: 0, qLossCost: 0 },
      { drawingNo: 'DWG-PB-002', line: 'E1', date: '2026-10-18', cycle: 2, mHrs: 2.0, lHrs: 1.8, mRate: 350, lRate: 180, incLabor: false, cons: 60, extRepair: 0, transport: 110, qcCost: 60, other: 0, quality: 'PASS', actualLife: undefined, dtCost: 0, qLossCost: 0 }
    ];

    sampleSpecs.forEach((spec, idx) => {
      const master = masters.find(m => m.drawingNo === spec.drawingNo) || masters[0];
      const repairId = `REP-2026-${String(idx + 1).padStart(4, '0')}`;
      const hasActualLife = spec.actualLife !== undefined && spec.actualLife > 0;
      const expectedLife = 1_500_000;

      const calc = CostSavingCalculationService.computeTransactionMetrics({
        actualMachineHours: spec.mHrs,
        actualLaborHours: spec.lHrs,
        machineCostRateRef: spec.mRate,
        laborRateRef: spec.lRate,
        includesLaborInMachineRate: spec.incLabor,
        actualConsumablesCost: spec.cons,
        actualExternalRepairCost: spec.extRepair,
        actualTransportationCost: spec.transport,
        actualQcCost: spec.qcCost,
        otherCost: spec.other,
        downtimeCost: spec.dtCost,
        qualityLossCost: spec.qLossCost,
        newPurchasePrice: master.newPurchasePrice,
        expectedNewToolLife: master.expectedNewToolLife,
        actualNewToolLife: master.actualNewToolLife,
        expectedLifeAfterRepair: expectedLife,
        actualLifeAfterRepair: spec.actualLife,
        regrindingNo: spec.cycle,
        maxRegrindCount: master.maxRegrindCount
      });

      transactions.push({
        id: `TX-${repairId}`,
        repairId,
        partNo: master.partNo,
        partName: master.partName,
        machineLine: spec.line as any,
        repairDate: spec.date,
        regrindingNo: spec.cycle,
        rateMasterId: spec.mRate === 580 ? 'CR-GRIND-02' : 'CR-GRIND-01',
        rateMasterMachineName: spec.mRate === 580 ? 'WASINO CNC Optical Profile Grinder #2' : 'OKAMOTO High-Precision Surface Grinder #1',
        actualMachineHours: spec.mHrs,
        actualSetupHours: 0.5,
        actualLaborHours: spec.lHrs,
        machineCostRateRef: spec.mRate,
        laborRateRef: spec.lRate,
        includesLaborInMachineRate: spec.incLabor,
        machineCost: calc.machineCost,
        laborCost: calc.laborCost,
        actualConsumablesCost: spec.cons,
        actualExternalRepairCost: spec.extRepair,
        actualTransportationCost: spec.transport,
        actualQcCost: spec.qcCost,
        otherDirectCost: spec.other,
        directRepairCost: calc.directRepairCost,
        repairCost: calc.directRepairCost,
        transportationCost: spec.transport,
        internalLaborCost: calc.laborCost,
        otherCost: spec.other,
        estimatedMachineHours: spec.mHrs,
        estimatedSetupHours: 0.5,
        estimatedLaborHours: spec.lHrs,
        estimatedConsumablesCost: spec.cons,
        estimatedTotalRepairCost: calc.directRepairCost,
        costVarianceThb: calc.costVarianceThb,
        costVariancePercentage: calc.costVariancePercentage,
        totalRepairCost: calc.totalRepairCost,
        shotCountBeforeRepair: (spec.cycle - 1) * 1_500_000,
        shotCountAfterRepair: (spec.cycle - 1) * 1_500_000,
        expectedLifeAfterRepair: expectedLife,
        actualLifeAfterRepair: spec.actualLife,
        hasActualLife,
        supplier: 'SAN-EI PRECISION TOOLING (THAILAND)',
        qualityResult: spec.quality as any,
        downtimeCost: spec.dtCost,
        qualityLossCost: spec.qLossCost,
        newPurchaseEquivalentCost: calc.newPurchaseEquivalentCost,
        grossSaving: calc.grossSaving,
        netSaving: calc.netSaving,
        savingPercentage: calc.savingPercentage,
        costPerShotNewTool: calc.newToolCostPerShot,
        costPerShotRegrind: calc.regrindingCostPerShot,
        costPerShotIsEstimated: calc.costPerShotIsEstimated,
        fairTargetShots: calc.fairTargetShots,
        fairNewToolCost: calc.fairNewToolCost,
        fairRegrindEquivalentCost: calc.fairRegrindEquivalentCost,
        fairNormalizedSaving: calc.fairNormalizedSaving,
        fairAssumptions: calc.fairAssumptions,
        remainingLengthMm: Number((master.nominalLengthMm - (spec.cycle * 0.12)).toFixed(2)),
        grindDepthMm: 0.12,
        remarks: spec.dtCost > 0 ? 'พบ Downtime เล็กน้อยระหว่างสลับแม่พิมพ์' : 'งานเจียรสมบูรณ์ตามสเปค',
        createdAt: `${spec.date}T10:00:00Z`,
        updatedAt: `${spec.date}T10:00:00Z`
      });
    });

    return transactions;
  }



  // =========================================================================
  // Part Cost Master CRUD
  // =========================================================================

  public getPartCostMasters(): PartCostMasterItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.PART_COST_MASTERS);
      if (!raw) return this.generateInitialPartCostMasters();
      return JSON.parse(raw);
    } catch {
      return this.generateInitialPartCostMasters();
    }
  }

  public getPartCostMasterByPartNo(partNo: string): PartCostMasterItem | undefined {
    const list = this.getPartCostMasters();
    return list.find(p => p.partNo.toUpperCase() === partNo.toUpperCase() || (p.drawingNo && p.drawingNo.toUpperCase() === partNo.toUpperCase()));
  }

  public savePartCostMaster(
    item: PartCostMasterItem,
    updatedBy: string = 'Authorized Engineer',
    revisionReason?: string
  ): { success: boolean; message: string; data?: PartCostMasterItem } {
    try {
      const list = this.getPartCostMasters();
      const existingIdx = list.findIndex(p => p.id === item.id || p.partNo.toUpperCase() === item.partNo.toUpperCase());

      const now = new Date().toISOString();
      const nowFormatted = now.slice(0, 10);

      if (existingIdx >= 0) {
        const existing = list[existingIdx];
        const revisions = [...(existing.priceRevisionHistory || [])];

        // If price or currency changed, log revision history entry
        if (existing.newPurchasePrice !== item.newPurchasePrice || existing.currency !== item.currency) {
          const revEntry: PriceRevisionHistoryEntry = {
            id: `REV-${item.partNo}-${Date.now()}`,
            revisionDate: now,
            oldPrice: existing.newPurchasePrice,
            newPrice: item.newPurchasePrice,
            currency: item.currency,
            changedBy: updatedBy,
            reason: revisionReason || 'Manual Price Update / Contract Revision',
            effectiveDate: item.effectiveDate || nowFormatted
          };
          revisions.unshift(revEntry);
        }

        const updated: PartCostMasterItem = {
          ...item,
          priceRevisionHistory: revisions,
          updatedAt: now
        };

        list[existingIdx] = updated;
        safeStorage.setItem(STORAGE_KEYS.PART_COST_MASTERS, JSON.stringify(list));
        this.notify();
        return { success: true, message: `อัปเดต Part Cost Master "${item.partNo}" สำเร็จ`, data: updated };
      } else {
        // Prevent duplicate Part No
        const duplicate = list.some(p => p.partNo.toUpperCase() === item.partNo.toUpperCase());
        if (duplicate) {
          return { success: false, message: `รหัส Part No. "${item.partNo}" มีอยู่ในระบบแล้ว` };
        }

        const newEntry: PartCostMasterItem = {
          ...item,
          id: item.id || `PCM-${item.partNo}-${Date.now()}`,
          priceRevisionHistory: [
            {
              id: `REV-${item.partNo}-${Date.now()}`,
              revisionDate: now,
              oldPrice: item.newPurchasePrice,
              newPrice: item.newPurchasePrice,
              currency: item.currency,
              changedBy: updatedBy,
              reason: revisionReason || 'Initial Registration',
              effectiveDate: item.effectiveDate || nowFormatted
            }
          ],
          createdAt: now,
          updatedAt: now
        };

        list.push(newEntry);
        safeStorage.setItem(STORAGE_KEYS.PART_COST_MASTERS, JSON.stringify(list));
        this.notify();
        return { success: true, message: `บันทึกชิ้นส่วนใหม่ "${item.partNo}" สำเร็จ`, data: newEntry };
      }
    } catch (err: any) {
      return { success: false, message: `ข้อผิดพลาดในการบันทึก: ${err.message}` };
    }
  }

  // =========================================================================
  // Regrinding Transactions CRUD
  // =========================================================================

  public getTransactions(filter?: CostDashboardFilter): RegrindingTransactionItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.REGRIND_TRANSACTIONS);
      let list: RegrindingTransactionItem[] = raw ? JSON.parse(raw) : this.generateInitialTransactions();

      if (!filter) return list;

      return list.filter(tx => {
        // Line filter
        if (filter.lineId && filter.lineId !== 'ALL' && tx.machineLine !== filter.lineId) {
          return false;
        }

        // Part No filter
        if (filter.partNo && filter.partNo !== 'ALL' && tx.partNo.toUpperCase() !== filter.partNo.toUpperCase()) {
          return false;
        }

        // Quality status filter
        if (filter.qualityStatus && filter.qualityStatus !== 'ALL' && tx.qualityResult !== filter.qualityStatus) {
          return false;
        }

        // Actual vs Estimated filter
        if (filter.dataTypeFilter === 'ACTUAL_ONLY' && !tx.hasActualLife) {
          return false;
        }
        if (filter.dataTypeFilter === 'ESTIMATED_ONLY' && tx.hasActualLife) {
          return false;
        }

        // Date range filter
        if (filter.startDate && tx.repairDate < filter.startDate) {
          return false;
        }
        if (filter.endDate && tx.repairDate > filter.endDate) {
          return false;
        }

        // Period filter (Month / Quarter / Year)
        if (filter.periodType === 'YEARLY' && filter.year) {
          const yr = new Date(tx.repairDate).getFullYear();
          if (yr !== filter.year) return false;
        } else if (filter.periodType === 'MONTHLY' && filter.year && filter.month) {
          const d = new Date(tx.repairDate);
          if (d.getFullYear() !== filter.year || (d.getMonth() + 1) !== filter.month) return false;
        } else if (filter.periodType === 'QUARTERLY' && filter.year && filter.quarter) {
          const d = new Date(tx.repairDate);
          const q = Math.floor(d.getMonth() / 3) + 1;
          if (d.getFullYear() !== filter.year || q !== filter.quarter) return false;
        }

        return true;
      });
    } catch {
      return this.generateInitialTransactions();
    }
  }

  public getTransactionById(id: string): RegrindingTransactionItem | undefined {
    const list = this.getTransactions();
    return list.find(t => t.id === id || t.repairId === id);
  }

  /**
   * Save or Update a Regrinding Transaction with duplicate check and automated formula evaluation
   */
  public saveTransaction(txInput: Partial<RegrindingTransactionItem>): {
    success: boolean;
    message: string;
    data?: RegrindingTransactionItem;
  } {
    try {
      const list = this.getTransactions();
      const masters = this.getPartCostMasters();

      if (!txInput.partNo) {
        return { success: false, message: 'กรุณาระบุ Part No.' };
      }
      if (!txInput.repairDate) {
        return { success: false, message: 'กรุณาระบุวันที่ซ่อม (Repair Date)' };
      }

      const partMaster = masters.find(m => m.partNo.toUpperCase() === txInput.partNo?.toUpperCase());
      const newPurchasePrice = partMaster ? partMaster.newPurchasePrice : 15000;
      const expectedNewToolLife = partMaster ? partMaster.expectedNewToolLife : 15_000_000;
      const actualNewToolLife = partMaster?.actualNewToolLife;
      const maxRegrindCount = partMaster ? partMaster.maxRegrindCount : 12;

      // Duplicate prevention rule:
      // A transaction is considered duplicate if the same repairId exists (on edit, different id)
      // or if another transaction exists with the exact same partNo + regrindingNo + repairDate
      const isEdit = !!txInput.id;
      const isDuplicateRepairId = list.some(t => (!isEdit || t.id !== txInput.id) && t.repairId.toUpperCase() === txInput.repairId?.toUpperCase());
      if (isDuplicateRepairId && txInput.repairId) {
        return { success: false, message: `รหัสใบซ่อม (Repair ID: "${txInput.repairId}") มีอยู่ในระบบแล้ว ห้ามบันทึกซ้ำ` };
      }

      const isDuplicatePartCycleDate = list.some(t => 
        (!isEdit || t.id !== txInput.id) &&
        t.partNo.toUpperCase() === txInput.partNo?.toUpperCase() &&
        t.regrindingNo === txInput.regrindingNo &&
        t.repairDate === txInput.repairDate
      );
      if (isDuplicatePartCycleDate) {
        return { 
          success: false, 
          message: `พบรายการซ้ำ: Part No "${txInput.partNo}" รอบเจียรที่ ${txInput.regrindingNo} ในวันที่ ${txInput.repairDate} ได้ถูกบันทึกไปแล้ว` 
        };
      }

      const hasActualLife = typeof txInput.actualLifeAfterRepair === 'number' && txInput.actualLifeAfterRepair > 0;
      const expectedLife = txInput.expectedLifeAfterRepair || 1_500_000;

      // Execute calculation pipeline
      const calc = CostSavingCalculationService.computeTransactionMetrics({
        actualMachineHours: txInput.actualMachineHours || 0,
        actualSetupHours: txInput.actualSetupHours || 0,
        actualLaborHours: txInput.actualLaborHours || 0,
        machineCostRateRef: txInput.machineCostRateRef || 0,
        laborRateRef: txInput.laborRateRef || 0,
        includesLaborInMachineRate: txInput.includesLaborInMachineRate,
        actualConsumablesCost: txInput.actualConsumablesCost,
        actualExternalRepairCost: txInput.actualExternalRepairCost || txInput.repairCost,
        actualTransportationCost: txInput.actualTransportationCost || txInput.transportationCost,
        actualQcCost: txInput.actualQcCost,
        otherCost: txInput.otherDirectCost || txInput.otherCost,
        repairCost: txInput.repairCost || 0,
        transportationCost: txInput.transportationCost || 0,
        internalLaborCost: txInput.internalLaborCost || 0,
        estimatedTotalRepairCost: txInput.estimatedTotalRepairCost,
        downtimeCost: txInput.downtimeCost || 0,
        qualityLossCost: txInput.qualityLossCost || 0,
        newPurchasePrice,
        expectedNewToolLife,
        actualNewToolLife,
        expectedLifeAfterRepair: expectedLife,
        actualLifeAfterRepair: txInput.actualLifeAfterRepair,
        regrindingNo: txInput.regrindingNo || 1,
        maxRegrindCount
      });

      const now = new Date().toISOString();
      const repairId = txInput.repairId?.trim() || `REP-${Date.now().toString().slice(-6)}`;

      const completeRecord: RegrindingTransactionItem = {
        id: txInput.id || `TX-${repairId}-${Date.now()}`,
        repairId,
        partNo: txInput.partNo,
        partName: txInput.partName || partMaster?.partName || txInput.partNo,
        machineLine: txInput.machineLine || 'E1',
        repairDate: txInput.repairDate,
        regrindingNo: Number(txInput.regrindingNo || 1),

        // Rate Master References & Hours
        rateMasterId: txInput.rateMasterId,
        rateMasterMachineName: txInput.rateMasterMachineName || txInput.supplier,
        actualMachineHours: Number(txInput.actualMachineHours || 0),
        actualSetupHours: Number(txInput.actualSetupHours || 0),
        actualLaborHours: Number(txInput.actualLaborHours || 0),
        machineCostRateRef: Number(txInput.machineCostRateRef || 0),
        laborRateRef: Number(txInput.laborRateRef || 0),
        includesLaborInMachineRate: !!txInput.includesLaborInMachineRate,

        // Computed Costs
        machineCost: calc.machineCost,
        laborCost: calc.laborCost,
        actualConsumablesCost: Number(txInput.actualConsumablesCost || txInput.otherCost || 0),
        actualExternalRepairCost: Number(txInput.actualExternalRepairCost || txInput.repairCost || 0),
        actualTransportationCost: Number(txInput.actualTransportationCost || txInput.transportationCost || 0),
        actualQcCost: Number(txInput.actualQcCost || 0),
        otherDirectCost: Number(txInput.otherDirectCost || txInput.otherCost || 0),
        directRepairCost: calc.directRepairCost,

        // Legacy compatibility
        repairCost: calc.directRepairCost,
        transportationCost: Number(txInput.actualTransportationCost || txInput.transportationCost || 0),
        internalLaborCost: calc.laborCost,
        otherCost: Number(txInput.otherDirectCost || txInput.otherCost || 0),

        // Estimates vs Actuals
        estimatedMachineHours: txInput.estimatedMachineHours,
        estimatedSetupHours: txInput.estimatedSetupHours,
        estimatedLaborHours: txInput.estimatedLaborHours,
        estimatedConsumablesCost: txInput.estimatedConsumablesCost,
        estimatedTotalRepairCost: calc.estimatedTotalRepairCost,
        costVarianceThb: calc.costVarianceThb,
        costVariancePercentage: calc.costVariancePercentage,

        totalRepairCost: calc.totalRepairCost,
        shotCountBeforeRepair: Number(txInput.shotCountBeforeRepair || 0),
        shotCountAfterRepair: Number(txInput.shotCountAfterRepair || 0),
        expectedLifeAfterRepair: expectedLife,
        actualLifeAfterRepair: txInput.actualLifeAfterRepair,
        hasActualLife,
        supplier: txInput.supplier || 'Internal Tool Room',
        qualityResult: txInput.qualityResult || 'PASS',
        downtimeCost: Number(txInput.downtimeCost || 0),
        qualityLossCost: Number(txInput.qualityLossCost || 0),
        newPurchaseEquivalentCost: calc.newPurchaseEquivalentCost,
        grossSaving: calc.grossSaving,
        netSaving: calc.netSaving,
        savingPercentage: calc.savingPercentage,
        costPerShotNewTool: calc.newToolCostPerShot,
        costPerShotRegrind: calc.regrindingCostPerShot,
        costPerShotIsEstimated: calc.costPerShotIsEstimated,
        fairTargetShots: calc.fairTargetShots,
        fairNewToolCost: calc.fairNewToolCost,
        fairRegrindEquivalentCost: calc.fairRegrindEquivalentCost,
        fairNormalizedSaving: calc.fairNormalizedSaving,
        fairAssumptions: calc.fairAssumptions,
        remainingLengthMm: txInput.remainingLengthMm,
        grindDepthMm: txInput.grindDepthMm,
        surfaceRoughnessRa: txInput.surfaceRoughnessRa,
        remarks: txInput.remarks,
        technicianName: txInput.technicianName,
        inspectorName: txInput.inspectorName,
        createdAt: txInput.createdAt || now,
        updatedAt: now
      };

      if (isEdit) {
        const idx = list.findIndex(t => t.id === txInput.id);
        if (idx >= 0) {
          list[idx] = completeRecord;
        } else {
          list.unshift(completeRecord);
        }
      } else {
        list.unshift(completeRecord);
      }

      safeStorage.setItem(STORAGE_KEYS.REGRIND_TRANSACTIONS, JSON.stringify(list));
      this.notify();

      return {
        success: true,
        message: `บันทึกธุรกรรมการเจียร ${completeRecord.repairId} (${completeRecord.partNo}) สำเร็จแล้ว ประหยัดสุทธิ: ฿${completeRecord.netSaving.toLocaleString()}`,
        data: completeRecord
      };
    } catch (err: any) {
      return { success: false, message: `ข้อผิดพลาดในการบันทึกธุรกรรม: ${err.message}` };
    }
  }

  public deleteTransaction(id: string): { success: boolean; message: string } {
    try {
      const list = this.getTransactions();
      const filtered = list.filter(t => t.id !== id && t.repairId !== id);
      if (filtered.length === list.length) {
        return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };
      }
      safeStorage.setItem(STORAGE_KEYS.REGRIND_TRANSACTIONS, JSON.stringify(filtered));
      this.notify();
      return { success: true, message: 'ลบรายการธุรกรรมเรียบร้อยแล้ว' };
    } catch (err: any) {
      return { success: false, message: `ลบไม่สำเร็จ: ${err.message}` };
    }
  }

  /**
   * Rule 6: Get chronological regrinding history for a specific part
   */
  public getPartHistory(partNo: string): {
    part: PartCostMasterItem | undefined;
    history: Array<RegrindingTransactionItem & {
      cumulativeRepairCost: number;
      cumulativeShotsAchieved: number;
      remainingLifePercent: number;
    }>;
    totalSavingsThb: number;
    totalRepairCostThb: number;
    totalShotsAchieved: number;
  } {
    const part = this.getPartCostMasterByPartNo(partNo);
    const allTx = this.getTransactions();
    const partTx = allTx
      .filter(t => t.partNo.toUpperCase() === partNo.toUpperCase())
      .sort((a, b) => new Date(a.repairDate).getTime() - new Date(b.repairDate).getTime());

    let runningCost = 0;
    let runningShots = 0;
    let totalSavingsThb = 0;

    const maxCycles = part?.maxRegrindCount || 12;

    const enriched = partTx.map(tx => {
      runningCost += tx.totalRepairCost || 0;
      const shotsThisCycle = tx.hasActualLife ? (tx.actualLifeAfterRepair || 0) : (tx.expectedLifeAfterRepair || 0);
      runningShots += shotsThisCycle;
      totalSavingsThb += tx.netSaving || 0;

      const remainingCycles = Math.max(0, maxCycles - tx.regrindingNo);
      const remainingLifePercent = maxCycles > 0 ? Math.round((remainingCycles / maxCycles) * 100) : 0;

      return {
        ...tx,
        cumulativeRepairCost: Number(runningCost.toFixed(2)),
        cumulativeShotsAchieved: runningShots,
        remainingLifePercent
      };
    });

    return {
      part,
      history: enriched,
      totalSavingsThb: Number(totalSavingsThb.toFixed(2)),
      totalRepairCostThb: Number(runningCost.toFixed(2)),
      totalShotsAchieved: runningShots
    };
  }

  // =========================================================================
  // Rule 8: Exporting Reports to Excel (.xlsx) and CSV
  // =========================================================================

  public exportToExcel(
    transactions: RegrindingTransactionItem[],
    metrics: CostSummaryMetrics,
    periodLabel: string = 'All-Time'
  ): void {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Sheet
      const summaryData = [
        ['FIN DIE REGRINDING PRO - COST SAVING & REGRINDING EXECUTIVE REPORT'],
        ['Generated At:', new Date().toLocaleString()],
        ['Period Filter:', periodLabel],
        [''],
        ['EXECUTIVE KPI SUMMARY', 'VALUE', 'UNIT', 'REMARKS'],
        ['Total Regrinding Transactions', metrics.totalTransactions, 'Transactions', 'จำนวนครั้งที่เจียรทั้งหมด'],
        ['Total Regrinding Cost', metrics.totalRegrindingCost, 'THB', 'ต้นทุนค่าเจียรและค่าใช้จ่ายรวม'],
        ['New Purchase Equivalent Cost', metrics.newPurchaseEquivalentCost, 'THB', 'มูลค่าอ้างอิงหากจัดซื้อใหม่'],
        ['Gross Saving', metrics.grossSaving, 'THB', 'ยอดประหยัดขั้นต้น (Equivalent - Repair)'],
        ['Net Saving', metrics.netSaving, 'THB', 'ยอดประหยัดสุทธิ (หัก Downtime & Loss)'],
        ['Saving Percentage', `${metrics.savingPercentage}%`, '%', 'อัตราส่วนประหยัดสุทธิ'],
        [''],
        ['DATA INTEGRITY BREAKDOWN', 'VALUE', 'REMARKS'],
        ['Actual Life Records (Actual)', metrics.actualTransactionsCount, `Net Saving: ฿${metrics.actualNetSaving.toLocaleString()}`],
        ['Estimated Life Records (Expected)', metrics.estimatedTransactionsCount, `Net Saving: ฿${metrics.estimatedNetSaving.toLocaleString()} (แสดงค่าประมาณ)`],
        [''],
        ['COST COMPONENT BREAKDOWN', 'AMOUNT (THB)'],
        ['Direct Repair Cost', metrics.directRepairCost],
        ['Transportation Cost', metrics.transportationCost],
        ['Internal Labor Cost', metrics.internalLaborCost],
        ['Other Costs (Coating/Shims)', metrics.otherCost],
        ['Downtime Impact Cost', metrics.downtimeCost],
        ['Quality Scrap Loss Cost', metrics.qualityLossCost]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary KPI');

      // Sheet 2: Transaction Details Sheet
      const rows = transactions.map(t => ({
        'Repair ID': t.repairId,
        'Part No': t.partNo,
        'Part Name': t.partName,
        'Line': t.machineLine,
        'Repair Date': t.repairDate,
        'Regrind Cycle': t.regrindingNo,
        'Repair Cost (THB)': t.repairCost,
        'Transport Cost (THB)': t.transportationCost,
        'Labor Cost (THB)': t.internalLaborCost,
        'Other Cost (THB)': t.otherCost,
        'Total Repair Cost (THB)': t.totalRepairCost,
        'Downtime Cost (THB)': t.downtimeCost,
        'Quality Loss Cost (THB)': t.qualityLossCost,
        'New Purchase Equivalent (THB)': t.newPurchaseEquivalentCost,
        'Gross Saving (THB)': t.grossSaving,
        'Net Saving (THB)': t.netSaving,
        'Saving %': `${t.savingPercentage}%`,
        'Life Type': t.hasActualLife ? 'ACTUAL' : 'ESTIMATED (ประมาณการ)',
        'Shots After Repair': t.hasActualLife ? t.actualLifeAfterRepair : t.expectedLifeAfterRepair,
        'Cost Per Shot - New (THB)': t.costPerShotNewTool,
        'Cost Per Shot - Regrind (THB)': t.costPerShotRegrind,
        'Quality Result': t.qualityResult,
        'Supplier': t.supplier,
        'Fair Target Shots': t.fairTargetShots,
        'Fair Normalized Saving (THB)': t.fairNormalizedSaving,
        'Remarks': t.remarks || ''
      }));

      const wsDetails = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Transaction Details');

      // Trigger browser download
      XLSX.writeFile(wb, `FinDie_Cost_Saving_Report_${periodLabel.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      alert(`ไม่สามารถส่งออก Excel ได้: ${err.message}`);
    }
  }

  public exportToCsv(transactions: RegrindingTransactionItem[]): void {
    try {
      const headers = [
        'Repair_ID',
        'Part_No',
        'Part_Name',
        'Line',
        'Repair_Date',
        'Regrind_Cycle',
        'Repair_Cost_THB',
        'Transport_Cost_THB',
        'Labor_Cost_THB',
        'Other_Cost_THB',
        'Total_Repair_Cost_THB',
        'Downtime_Cost_THB',
        'Quality_Loss_Cost_THB',
        'New_Purchase_Equivalent_THB',
        'Gross_Saving_THB',
        'Net_Saving_THB',
        'Saving_Percent',
        'Data_Status',
        'Shots_Used',
        'Cost_Per_Shot_New',
        'Cost_Per_Shot_Regrind',
        'Quality_Result',
        'Supplier',
        'Fair_Normalized_Saving_THB'
      ];

      const csvRows = [headers.join(',')];

      transactions.forEach(t => {
        const row = [
          t.repairId,
          `"${t.partNo}"`,
          `"${t.partName.replace(/"/g, '""')}"`,
          t.machineLine,
          t.repairDate,
          t.regrindingNo,
          t.repairCost,
          t.transportationCost,
          t.internalLaborCost,
          t.otherCost,
          t.totalRepairCost,
          t.downtimeCost,
          t.qualityLossCost,
          t.newPurchaseEquivalentCost,
          t.grossSaving,
          t.netSaving,
          t.savingPercentage,
          t.hasActualLife ? 'ACTUAL' : 'ESTIMATED',
          t.hasActualLife ? t.actualLifeAfterRepair : t.expectedLifeAfterRepair,
          t.costPerShotNewTool,
          t.costPerShotRegrind,
          t.qualityResult,
          `"${t.supplier}"`,
          t.fairNormalizedSaving
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinDie_Cost_Saving_Data_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      alert(`ไม่สามารถส่งออก CSV ได้: ${err.message}`);
    }
  }
}

export const costSavingService = new CostSavingService();
