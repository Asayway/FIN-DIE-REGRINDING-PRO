import { ProductionLineId, UserRole } from './index';

export type RegrindQueueStatus = 'PENDING' | 'IN_PROCESS' | 'PAUSED' | 'READY' | 'SCRAP';

export type DefectReasonCode = 
  | 'NORMAL_WEAR'
  | 'CHIPPED'
  | 'BROKEN'
  | 'COATING_PEELED'
  | 'GALLING_SCRATCHED'
  | 'OUT_OF_TOLERANCE'
  | 'BURR_EXCESSIVE'
  | 'CRACKED'
  | 'IMPROPER_SHARPENING'
  | 'OTHER';

export const DEFECT_REASON_LABELS: Record<DefectReasonCode, { en: string; th: string; color: string }> = {
  NORMAL_WEAR: {
    en: 'Normal Wear (End of Life)',
    th: 'สึกหรอตามอายุการใช้งานปกติ',
    color: 'bg-slate-100 text-slate-800 border-slate-300'
  },
  CHIPPED: {
    en: 'Edge Chipped (Micro-Fracture)',
    th: 'คมบิ่น / ขอบแตกหักเล็กน้อย',
    color: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  BROKEN: {
    en: 'Broken / Severe Fracture',
    th: 'หัก / แตกหักรุนแรง',
    color: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  COATING_PEELED: {
    en: 'Coating Delamination / Peeled',
    th: 'ผิวเคลือบหลุดร่อน (Coating Peeled)',
    color: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  GALLING_SCRATCHED: {
    en: 'Galling / Deep Surface Scratches',
    th: 'เกิดรอยขูดขีด / อะลูมิเนียมติดคม (Galling)',
    color: 'bg-orange-100 text-orange-900 border-orange-300'
  },
  OUT_OF_TOLERANCE: {
    en: 'Out of Tolerance (Dimension Min)',
    th: 'ขนาดความยาวต่ำกว่าสเปค (Under Min Spec)',
    color: 'bg-red-100 text-red-900 border-red-300'
  },
  BURR_EXCESSIVE: {
    en: 'Excessive Product Burr (Burr NG)',
    th: 'ทำให้เกิดครีบชิ้นงานเกินกำหนด (Burr NG)',
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300'
  },
  CRACKED: {
    en: 'Internal Micro-Cracks',
    th: 'พบรอยร้าวภายใน (Crack Alert)',
    color: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  IMPROPER_SHARPENING: {
    en: 'Improper Previous Regrind',
    th: 'การเจียรครั้งก่อนผิดมุมองศา',
    color: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  OTHER: {
    en: 'Other Specified Reason',
    th: 'สาเหตุอื่นๆ (ระบุในหมายเหตุ)',
    color: 'bg-slate-100 text-slate-800 border-slate-300'
  }
};

export type ToolingCategory = 
  | 'PUNCH'
  | 'DIE'
  | 'BLADE'
  | 'EXPANDER'
  | 'BUSHING'
  | 'SHIM_PLATE'
  | 'MISC';

export interface ToolingPartMasterItem {
  id: string;
  partName: string;
  partCode: string;
  category: ToolingCategory;
  tubeSize: 'Ø5' | 'Ø7' | 'COMMON';
  nominalLengthMm: number;
  minAllowedLengthMm: number;
  grindingAmountPerTimeMm: number;
  totalGrindingAllowanceMm: number;
  maxRegrindCount: number;
  regrindAllowed: boolean;
  disposeAfterOneUse: boolean;
  drawingNo: string;
  picCategory: string;
  currentSpareStock: number;
  minSpareStock: number;
  unitPriceThb: number;
  supplierName: string;
  descriptionTh: string;
}

export interface RegrindWorkTicket {
  id: string; // e.g. "RGD-2026-0012"
  jobCode: string;
  qrCode: string; // e.g. "QR-E1-BURR-07-004"
  partName: string;
  partCode: string;
  lineId: ProductionLineId;
  stageName?: string;
  positionId?: string; // e.g. "P-04", "SLIT-02"
  picCategory: string;
  status: RegrindQueueStatus;
  urgency: 'EMERGENCY' | 'HIGH' | 'NORMAL' | 'LOW';
  source: 'AUTO_FROM_DIE_LAYOUT' | 'MANUAL_ENTRY' | 'SCHEDULED_PM';

  // Queue Sequencing & Emergency Preemption Model
  queueOrder?: number; // 1-based position in active queue
  originalQueueOrder?: number; // Original position before emergency shift
  isEmergency?: boolean; // Flagged as emergency top-of-queue job
  preemptedByJobCode?: string; // Job code of emergency ticket that shifted this job down
  shiftedCount?: number; // Number of times shifted down by emergency insertions
  scheduledDate?: string; // YYYY-MM-DD calendar schedule date
  sequenceInDate?: number; // 1-based sequence within scheduledDate cell
  pausedAt?: string; // ISO timestamp if paused due to emergency preemption
  
  // Dates & Ownership
  receivedDate: string; // ISO
  targetCompletionDate?: string; // ISO or YYYY-MM-DD THH:mm for overdue & planning board
  inProcessDate?: string;
  completedDate?: string;
  receivedBy: string;
  assignedTechnician?: string;
  verifiedBy?: string;
  quantity?: number;
  isDelayed?: boolean;

  // ETA & Machine Tracking
  etaMinutes?: number;
  etaTargetTime?: string;
  machineAssigned?: string;
  
  // Defect & Inspection Info
  defectReason: DefectReasonCode;
  defectNotes?: string;
  
  // Dimensional Tracking (World-Class Standard)
  nominalLengthMm: number;
  minAllowedLengthMm: number;
  previousLengthMm: number;
  grindDepthMm: number;
  lengthAfterGrindMm: number;
  shimAddedMm: number;
  toolMaterial?: 'SKD11' | 'SKD61' | 'CARBIDE' | 'HSS' | string;
  surfaceRoughnessRa?: number; // Optional legacy
  hardnessHrc?: number; // Optional legacy
  
  // Regrind Counter & Limits
  regrindCountBefore: number;
  regrindCountAfter: number;
  maxRegrindAllowed: number;
  
  // Stock & Purchasing Requisition
  isScrapped: boolean;
  scrapReason?: string;
  purchasingAlertSent?: boolean;
  purchasingPrNumber?: string; // e.g. "PR-2026-0891"
  addedToSpareStock?: boolean;
  
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExcelCalendarDailyRow {
  partName: string;
  partCode: string;
  picCategory: string;
  category: 'REPAIR' | 'DEFECT_SCRAP';
  dailyCounts: Record<number, number>; // day 1 to 31 -> count
  total: number;
}

export interface MonthlyCalendarMatrix {
  year: number;
  month: number; // 1-12
  monthLabelEn: string; // "JANUARY 2026"
  repairRows: ExcelCalendarDailyRow[];
  defectRows: ExcelCalendarDailyRow[];
  grandTotalRepair: number;
  grandTotalDefect: number;
}

export interface PurchasingRequisitionItem {
  id: string;
  prNumber: string;
  partName: string;
  partCode: string;
  quantityRequested: number;
  reason: 'SCRAPPED_TOOLING_REPLACEMENT' | 'SAFETY_STOCK_DEPLETED';
  workTicketId: string;
  lineId: ProductionLineId;
  estimatedCostThb: number;
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PO_ISSUED' | 'RECEIVED';
  urgency: 'HIGH' | 'NORMAL';
}
