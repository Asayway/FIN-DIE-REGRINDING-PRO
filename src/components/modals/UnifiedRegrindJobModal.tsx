import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Calendar as CalendarIcon,
  Wrench,
  X,
  Zap,
  Check,
  AlertTriangle,
  CheckCircle2,
  Play,
  Clock,
  PackageCheck
} from 'lucide-react';
import { ProductionLineId, LINE_INFO_MAP, RegrindMasterStandard } from '../../types';
import { RegrindWorkTicket, DefectReasonCode } from '../../types/regrind';
import { LineFilteredPartCombobox, FilteredLinePartItem, getFilteredPartsForLine } from '../common/LineFilteredPartCombobox';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { costSavingService } from '../../services/costSavingService';

const LINES_LIST: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

const DEFAULT_REMARKS_PRESETS: string[] = [
  'ลับคมด้วยหิน CBN #400',
  'ปาดหน้าขัดเงา Ra <= 0.1um',
  'รองชิมชดเชยระยะเจียร',
  'งานด่วนแทรกคิว #1'
];

export interface UnifiedRegrindJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string, createdOrUpdatedTicket?: RegrindWorkTicket) => void;
  /** Optional initial date (YYYY-MM-DD) */
  initialDateStr?: string;
  /** Optional initial production line */
  initialLineId?: ProductionLineId;
  /** Optional initial partCode or partName */
  initialPartCode?: string;
  initialPartName?: string;
  /** Default mode: false = Normal, true = Urgent/Emergency #1 */
  initialIsEmergency?: boolean;
  /** Category when opened from 31-day matrix ('REPAIR' | 'DEFECT_SCRAP') */
  matrixCategory?: 'REPAIR' | 'DEFECT_SCRAP';
  /** If editing or promoting an existing ticket, pass it here */
  existingTicket?: RegrindWorkTicket | null;
  /** Optional list of existing tickets on that same date/cell so user can click to inspect them */
  dayExistingTickets?: RegrindWorkTicket[];
  onSelectExistingTicket?: (ticket: RegrindWorkTicket) => void;
}

export const UnifiedRegrindJobModal: React.FC<UnifiedRegrindJobModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialDateStr,
  initialLineId = 'E1',
  initialPartCode,
  initialPartName,
  initialIsEmergency = false,
  matrixCategory = 'REPAIR',
  existingTicket = null,
  dayExistingTickets = [],
  onSelectExistingTicket
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Unified Mode: Normal vs Urgent/Emergency #1
  const [isEmergency, setIsEmergency] = useState<boolean>(initialIsEmergency);
  const [executionMode, setExecutionMode] = useState<'QUEUE_TICKET' | 'START_NOW' | 'SCRAP_NOW'>('QUEUE_TICKET');

  // Core Fields
  const [scheduledDate, setScheduledDate] = useState<string>(initialDateStr || todayStr);
  const [lineId, setLineId] = useState<ProductionLineId>(initialLineId);
  const [dieCode, setDieCode] = useState<string>(`FD-${initialLineId}-01`);
  const [partCode, setPartCode] = useState<string>(initialPartCode || 'FD-P7-BURR');
  const [partName, setPartName] = useState<string>(initialPartName || 'Burring Ø 7');
  const [serialOrLot, setSerialOrLot] = useState<string>('LOT-E1-01');
  const [quantity, setQuantity] = useState<number>(1);

  // Dimensional & Cycle Fields
  const [nominalLengthMm, setNominalLengthMm] = useState<number>(70.0);
  const [minAllowedLengthMm, setMinAllowedLengthMm] = useState<number>(65.0);
  const [previousLengthMm, setPreviousLengthMm] = useState<number>(70.0);
  const [grindDepthMm, setGrindDepthMm] = useState<number>(0.20);
  const [resultLengthMm, setResultLengthMm] = useState<number>(69.80);
  const [regrindCountBefore, setRegrindCountBefore] = useState<number>(0);
  const [maxRegrindAllowed, setMaxRegrindAllowed] = useState<number>(4);

  // Emergency Preemption Settings (when isEmergency === true)
  const [preemptActiveJob, setPreemptActiveJob] = useState<boolean>(true);
  const [shiftHours, setShiftHours] = useState<number>(2);

  // Operator, Reason & Remarks
  const [technician, setTechnician] = useState<string>('Thanakorn Phonpayung');
  const [defectReason, setDefectReason] = useState<DefectReasonCode>('NORMAL_WEAR');
  const [remarks, setRemarks] = useState<string>('');

  // Labor & Cost Control
  const [laborHours, setLaborHours] = useState<number>(1.0);
  const [laborTimeUnit, setLaborTimeUnit] = useState<'HOURS' | 'MINUTES'>('HOURS');
  const [sparePartsUsed, setSparePartsUsed] = useState<string>('');
  const [sparePartsCost, setSparePartsCost] = useState<number>(0);

  const standards: RegrindMasterStandard[] = useMemo(() => {
    return storageService.getRegrindMasterStandards();
  }, [isOpen]);

  const selectedPartCostMaster = useMemo(() => {
    const costMasters = costSavingService.getPartCostMasters();
    return costMasters.find(cm => cm.partNo === partCode || cm.partName.toLowerCase() === partName.toLowerCase()) || {
      newPurchasePrice: 25000,
      purchasePriceUsd: 720,
      expectedNewToolLife: 15000000,
      supplier: 'Standard Tooling Vendor',
      nominalLengthMm,
      minAllowedLengthMm,
      maxRegrindCount: maxRegrindAllowed
    };
  }, [isOpen, partCode, partName, nominalLengthMm, minAllowedLengthMm, maxRegrindAllowed]);

  const getDieCodeForLine = (lId: string): string => {
    try {
      const lineConfigs = storageService.getLineConfigs();
      const cfg = lineConfigs.find(c => c.lineId === lId);
      return cfg?.dieCode || `FD-${lId}-01`;
    } catch {
      return `FD-${lId}-01`;
    }
  };

  // Initialize form whenever modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (existingTicket) {
      const emg = Boolean(existingTicket.isEmergency || existingTicket.urgency === 'EMERGENCY' || initialIsEmergency);
      setIsEmergency(emg);
      setExecutionMode(existingTicket.status === 'SCRAP' ? 'SCRAP_NOW' : 'QUEUE_TICKET');
      setScheduledDate(existingTicket.scheduledDate || existingTicket.targetCompletionDate?.slice(0, 10) || initialDateStr || todayStr);
      const fallbackLine: ProductionLineId = (initialLineId as ProductionLineId) || 'E1';
      const existingLine: ProductionLineId = LINES_LIST.includes(existingTicket.lineId as any)
        ? (existingTicket.lineId as ProductionLineId)
        : fallbackLine;
      setLineId(existingLine);
      setDieCode(existingTicket.dieCode || getDieCodeForLine(existingLine));
      setPartCode(existingTicket.partCode);
      setPartName(existingTicket.partName);
      setSerialOrLot(existingTicket.qrCode || `LOT-${existingTicket.lineId}-01`);
      setQuantity(existingTicket.quantity || 1);

      const nom = existingTicket.nominalLengthMm || 70.0;
      const minLim = existingTicket.minAllowedLengthMm || 65.0;
      const prev = existingTicket.previousLengthMm || nom;
      const depth = existingTicket.grindDepthMm || 0.20;
      setNominalLengthMm(nom);
      setMinAllowedLengthMm(minLim);
      setPreviousLengthMm(prev);
      setGrindDepthMm(depth);
      setResultLengthMm(Number((prev - depth).toFixed(3)));
      setRegrindCountBefore(existingTicket.regrindCountBefore || 0);
      setMaxRegrindAllowed(existingTicket.maxRegrindAllowed || 4);
      setTechnician(existingTicket.assignedTechnician || 'Thanakorn Phonpayung');
      setDefectReason(existingTicket.defectReason || 'NORMAL_WEAR');
      setRemarks(
        existingTicket.remarks ||
          existingTicket.defectNotes ||
          (emg ? `งานด่วนแทรกคิว #1` : '')
      );
      setLaborHours(existingTicket.laborHours !== undefined ? existingTicket.laborHours : 1.0);
      setSparePartsUsed(existingTicket.sparePartsUsed || '');
      setSparePartsCost(existingTicket.sparePartsCost || 0);
      setPreemptActiveJob(true);
      setShiftHours(2);
    } else {
      const targetLine: ProductionLineId = (initialLineId as ProductionLineId) || ('E1' as ProductionLineId);
      setIsEmergency(initialIsEmergency);
      setExecutionMode(matrixCategory === 'DEFECT_SCRAP' ? 'SCRAP_NOW' : 'QUEUE_TICKET');
      setScheduledDate(initialDateStr || todayStr);
      setLineId(targetLine);
      setDieCode(getDieCodeForLine(targetLine));
      setQuantity(1);
      setTechnician('Thanakorn Phonpayung');
      setDefectReason(matrixCategory === 'DEFECT_SCRAP' ? 'CHIPPED' : 'NORMAL_WEAR');
      setLaborHours(1.0);
      setSparePartsUsed('');
      setSparePartsCost(0);
      setPreemptActiveJob(true);
      setShiftHours(2);

      const lineParts = getFilteredPartsForLine(targetLine, standards);
      const matchedPart =
        (initialPartCode ? lineParts.find(p => p.partCode === initialPartCode) : undefined) ||
        (initialPartName ? lineParts.find(p => p.partName.toLowerCase() === initialPartName.toLowerCase()) : undefined) ||
        lineParts[0];

      if (matchedPart) {
        applySelectedPartSpecs(matchedPart, targetLine);
      }

      setRemarks(
        initialIsEmergency
          ? `งานด่วนแทรกคิว #1`
          : matrixCategory === 'DEFECT_SCRAP'
          ? 'ชำรุดคัดทิ้ง (Scrap)'
          : 'ลับคมด้วยหิน CBN #400'
      );
    }
  }, [isOpen, existingTicket, initialDateStr, initialLineId, initialPartCode, initialPartName, initialIsEmergency, matrixCategory]);

  const applySelectedPartSpecs = (item: FilteredLinePartItem, currentLine: ProductionLineId = lineId) => {
    setPartCode(item.partCode);
    setPartName(item.partName);
    setNominalLengthMm(item.nominalLengthMm);
    setMinAllowedLengthMm(item.minAllowedLengthMm);
    setPreviousLengthMm(item.nominalLengthMm);
    setGrindDepthMm(item.grindingAmountPerTimeMm);
    setResultLengthMm(Number((item.nominalLengthMm - item.grindingAmountPerTimeMm).toFixed(3)));
    setMaxRegrindAllowed(item.maxRegrindCount);
    setSerialOrLot(`LOT-${currentLine}-${item.partCode.replace(/[^A-Za-z0-9]/g, '').slice(-5)}`);
  };

  const handleLineChange = (newLine: ProductionLineId) => {
    setLineId(newLine);
    setDieCode(getDieCodeForLine(newLine));
  };

  // Helper to sanitize numeric inputs to avoid unwanted leading zeros (e.g. "05" -> 5)
  const sanitizeNumberInput = (rawVal: string, fallback: number = 0): number => {
    if (!rawVal || rawVal.trim() === '') return fallback;
    // Strip leading zeros if followed by non-dot digit
    const cleaned = rawVal.replace(/^0+([1-9])/, '$1');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  };

  const handlePrevLengthChange = (valStrOrNum: string | number) => {
    const val = typeof valStrOrNum === 'number' ? valStrOrNum : sanitizeNumberInput(valStrOrNum, 0);
    setPreviousLengthMm(val);
    setResultLengthMm(Number((val - grindDepthMm).toFixed(3)));
  };

  const handleGrindDepthChange = (valStrOrNum: string | number) => {
    const val = typeof valStrOrNum === 'number' ? valStrOrNum : sanitizeNumberInput(valStrOrNum, 0);
    setGrindDepthMm(val);
    setResultLengthMm(Number((previousLengthMm - val).toFixed(3)));
  };

  const handleResultLengthChange = (valStrOrNum: string | number) => {
    const val = typeof valStrOrNum === 'number' ? valStrOrNum : sanitizeNumberInput(valStrOrNum, 0);
    setResultLengthMm(val);
    setGrindDepthMm(Number((previousLengthMm - val).toFixed(3)));
  };

  const sysSettings = storageService.getSettings();
  const sysLanguage = sysSettings?.language || 'TH';
  const isEnglish = sysLanguage === 'EN';

  const DEFECT_REASONS_LIST: { code: DefectReasonCode; labelTh: string; labelEn: string; icon: string; descTh: string; descEn: string }[] = [
    { code: 'NORMAL_WEAR', labelTh: 'สึกหรอปกติ (Normal Wear)', labelEn: 'Normal Wear', icon: '🟢', descTh: 'ครบชั่วโมงทำงาน / ครบโควตารอบการปั๊ม', descEn: 'Normal EOL wear cycle limit' },
    { code: 'BURR_EXCESSIVE', labelTh: 'ครีบสูงเกิน (Excessive Burr)', labelEn: 'Excessive Burr', icon: '⚠️', descTh: 'ชิ้นงานมีครีบคมเกินสเปค ต้องลับคมพั้นช์', descEn: 'Burr height exceeding product spec' },
    { code: 'CHIPPED', labelTh: 'คมบิ่น/กะเทาะ (Edge Chipped)', labelEn: 'Edge Chipped', icon: '🔴', descTh: 'ปลายคมบิ่น ต้องเจียรปาดหน้าเปิดคมใหม่', descEn: 'Micro-fractures on cutting edge' },
    { code: 'GALLING_SCRATCHED', labelTh: 'ผิวเป็นรอย/เศษติด (Galling)', labelEn: 'Galling Scratched', icon: '🟡', descTh: 'มีเศษอะลูมิเนียมเกาะ หรือผิวสเตชั่นเป็นรอย', descEn: 'Aluminum sticking or galling scratches' },
    { code: 'OUT_OF_TOLERANCE', labelTh: 'หลุดสเปค Min (Out of Spec)', labelEn: 'Out of Tolerance', icon: '🟠', descTh: 'ขนาดมิติชิ้นงานหลุดค่าพิกัดมาตรฐาน', descEn: 'Dimensional tolerance limit breached' },
    { code: 'BROKEN', labelTh: 'แตกหักชำรุด (Broken)', labelEn: 'Broken / Damaged', icon: '🛑', descTh: 'อะไหล่แตกหัก ชำรุด แนะนำคัดทิ้ง (Scrap)', descEn: 'Severe fracture or broken part' },
  ];

  const GRIND_STEP_PRESETS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];

  const nextCycle = regrindCountBefore + 1;
  const isUnderMinLength = resultLengthMm < minAllowedLengthMm;
  const isOverMaxCycle = nextCycle > maxRegrindAllowed;
  const minAllowedDateStr = '2025-01-01';
  const isBefore2025 = scheduledDate < minAllowedDateStr;
  const isHistoricalPastDate = scheduledDate < todayStr && scheduledDate >= minAllowedDateStr;
  const remainingCycles = isUnderMinLength ? 0 : Math.max(0, maxRegrindAllowed - nextCycle);
  const remainingWearMm = Number(Math.max(0, resultLengthMm - minAllowedLengthMm).toFixed(2));
  const totalWearRangeMm = Number(Math.max(0.01, nominalLengthMm - minAllowedLengthMm).toFixed(2));
  const remainingPercent = (isUnderMinLength || isOverMaxCycle) ? 0 : Math.min(100, Math.max(0, (remainingWearMm / totalWearRangeMm) * 100));

  const executeSubmit = (targetMode?: 'QUEUE_TICKET' | 'START_NOW' | 'SCRAP_NOW' | boolean) => {
    if (isBefore2025) {
      alert(`⚠️ ไม่อนุญาตให้ลงวันที่ย้อนหลังเกิน Jan 2025 (กรุณาเลือกตั้งแต่วันที่ ${minAllowedDateStr} เป็นต้นไป)`);
      return;
    }

    const mode = typeof targetMode === 'string' ? targetMode : (targetMode === true ? 'START_NOW' : executionMode);
    const isStartImmediate = mode === 'START_NOW';
    
    // Auto-Scrap Rule: If calculated dimension is below min spec or cycles exceed max allowed,
    // the system automatically designates this as SCRAP and bypasses QC inspection.
    const isAutoScrapTriggered = isUnderMinLength || isOverMaxCycle;
    const isScrap = mode === 'SCRAP_NOW' || isAutoScrapTriggered;

    const scrapReasonCalculated = isUnderMinLength
      ? `ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร): ความยาวหลังเจียร (${resultLengthMm.toFixed(2)} mm) ต่ำกว่าสเปค Min (${minAllowedLengthMm.toFixed(2)} mm)`
      : isOverMaxCycle
      ? `ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร): รอบการเจียร (${nextCycle} ครั้ง) เกินขีดจำกัดสูงสุด (${maxRegrindAllowed} ครั้ง)`
      : (remarks || 'ชำรุดคัดทิ้งตามคำสั่งช่าง');

    const effectiveRemarks = isScrap ? scrapReasonCalculated : remarks;

    const parsedDate = new Date(scheduledDate);
    const year = parsedDate.getFullYear() || 2026;
    const month = (parsedDate.getMonth() + 1) || 1;
    const day = parsedDate.getDate() || 1;

    // Case 1: Editing Existing Queue Ticket
    if (existingTicket) {
      const res = regrindService.updateQueueTicket(existingTicket.id, {
        lineId,
        partCode,
        partName,
        quantity,
        scheduledDate,
        targetCompletionDate: `${scheduledDate}T17:00:00.000Z`,
        assignedTechnician: technician,
        isEmergency,
        urgency: isEmergency ? 'EMERGENCY' : 'NORMAL',
        previousLengthMm,
        grindDepthMm,
        lengthAfterGrindMm: resultLengthMm,
        nominalLengthMm,
        minAllowedLengthMm,
        regrindCountBefore,
        regrindCountAfter: nextCycle,
        maxRegrindAllowed,
        defectReason: isScrap ? (isUnderMinLength ? 'OUT_OF_TOLERANCE' : 'NORMAL_WEAR') : defectReason,
        defectNotes: effectiveRemarks,
        remarks: effectiveRemarks,
        laborHours,
        sparePartsUsed,
        sparePartsCost,
        preemptActiveJob,
        shiftHours
      });

      if (isScrap) {
        const scr = regrindService.scrapItem(existingTicket.id, isUnderMinLength ? 'OUT_OF_TOLERANCE' : defectReason, scrapReasonCalculated, technician);
        regrindService.incrementDailyMatrixCount(year, month, 'DEFECT_SCRAP', partName, day, quantity);
        onSaved(`❌ ${scr.message} (ครบลิมิตเจียร - คัดทิ้งอัตโนมัติไม่ต้องผ่าน QC)`, res.ticket);
      } else if (isStartImmediate) {
        const startRes = regrindService.startGrinding(existingTicket.id, technician, { etaMinutes: 30 });
        regrindService.incrementDailyMatrixCount(year, month, 'REPAIR', partName, day, quantity);
        const latest = regrindService.getQueueTickets().find(t => t.id === existingTicket.id);
        onSaved(`⚡ ${startRes.message}`, latest || res.ticket);
      } else {
        regrindService.incrementDailyMatrixCount(year, month, 'REPAIR', partName, day, quantity);
        onSaved(res.message, res.ticket);
      }
      onClose();
      return;
    }

    // Case 2: Creating New Ticket
    const createdTicket = regrindService.createManualTicket({
      lineId,
      partCode,
      partName,
      quantity,
      assignedTechnician: technician,
      scheduledDate,
      targetCompletionDate: `${scheduledDate}T17:00:00.000Z`,
      urgency: isEmergency ? 'EMERGENCY' : 'NORMAL',
      isEmergency,
      defectReason: isScrap ? (isUnderMinLength ? 'OUT_OF_TOLERANCE' : 'NORMAL_WEAR') : defectReason,
      defectNotes: effectiveRemarks || (isEmergency ? `งานด่วนแทรกคิว #1` : `กำหนดเจียร ${scheduledDate}`),
      remarks: effectiveRemarks || `บันทึกงานเจียร ${scheduledDate}`,
      nominalLengthMm,
      minAllowedLengthMm,
      previousLengthMm,
      grindDepthMm,
      lengthAfterGrindMm: resultLengthMm,
      regrindCountBefore,
      regrindCountAfter: nextCycle,
      maxRegrindAllowed,
      laborHours,
      sparePartsUsed,
      sparePartsCost,
      ...(isEmergency ? { preemptActiveJob } : {})
    } as any);

    if (isEmergency) {
      regrindService.markTicketAsEmergency(createdTicket.id, {
        preemptActiveJob,
        shiftHours,
        reason: remarks || `งานด่วนแทรกคิว #1`
      });
    }

    if (isScrap) {
      regrindService.scrapItem(createdTicket.id, isUnderMinLength ? 'OUT_OF_TOLERANCE' : defectReason, scrapReasonCalculated, technician);
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        'DEFECT_SCRAP',
        partName,
        day,
        quantity
      );
      storageService.recordRegrind({
        lineId,
        lineLastUsed: lineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        previousLength: previousLengthMm,
        currentLength: resultLengthMm,
        actualGrindingRemovedMm: grindDepthMm,
        mmRemovedThisCycle: grindDepthMm,
        regrindCountBefore,
        regrindCountAfter: nextCycle,
        regrindCycleCount: nextCycle,
        remainingRegrindCount: 0,
        maxAllowedCycles: maxRegrindAllowed,
        supplierOrInternalProcess: 'INTERNAL_TOOL_ROOM',
        vendorName: 'Internal Fin Die Tool Room (In-House)',
        workOrder: createdTicket.jobCode,
        cost: 0,
        surfaceRoughnessRa: 0.2,
        hardnessHrc: 60.0,
        inspectionResult: 'FAILED',
        inspectionStatus: 'FAILED_SCRAPPED',
        performedBy: technician,
        regrindDate: scheduledDate,
        note: scrapReasonCalculated,
        status: 'SCRAP'
      });
      onSaved(`❌ บันทึกคัดทิ้ง ${createdTicket.jobCode} (${partName}) เรียบร้อย (ครบลิมิตเจียร - คัดทิ้งอัตโนมัติไม่ต้องผ่าน QC)`, createdTicket);
    } else if (isStartImmediate) {
      // Start Grinding Immediately upon creation
      const startRes = regrindService.startGrinding(createdTicket.id, technician, { etaMinutes: 30 });
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        matrixCategory === 'DEFECT_SCRAP' ? 'DEFECT_SCRAP' : 'REPAIR',
        partName,
        day,
        quantity
      );
      const calcLaborMinutes = Math.round((laborHours || 1) * 60);
      storageService.recordRegrind({
        lineId,
        lineLastUsed: lineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        quantity,
        previousLength: previousLengthMm,
        currentLength: resultLengthMm,
        actualGrindingRemovedMm: grindDepthMm,
        mmRemovedThisCycle: grindDepthMm,
        regrindCountBefore,
        regrindCountAfter: nextCycle,
        regrindCycleCount: nextCycle,
        remainingRegrindCount: Math.max(0, maxRegrindAllowed - nextCycle),
        maxAllowedCycles: maxRegrindAllowed,
        supplierOrInternalProcess: 'INTERNAL_TOOL_ROOM',
        vendorName: 'Internal Fin Die Tool Room (In-House)',
        workOrder: createdTicket.jobCode,
        cost: Math.round((calcLaborMinutes / 60) * 180) + (sparePartsCost || 0),
        laborHours,
        laborTimeMinutes: calcLaborMinutes,
        sparePartsUsed,
        sparePartsCost,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
        defectReason,
        note: remarks || `เริ่มดำเนินการเจียรทันที (In-Process) โดยช่าง ${technician}`,
        status: 'REGRINDING'
      });
      const latest = regrindService.getQueueTickets().find(t => t.id === createdTicket.id);
      onSaved(
        `⚡ บันทึกและเริ่มเจียร ${createdTicket.jobCode} (${partName}) ทันทีเรียบร้อยแล้ว (สถานะ: กำลังเจียร)`,
        latest || createdTicket
      );
    } else {
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        matrixCategory === 'DEFECT_SCRAP' ? 'DEFECT_SCRAP' : 'REPAIR',
        partName,
        day,
        quantity
      );
      const calcLaborMinutes = Math.round((laborHours || 1) * 60);
      storageService.recordRegrind({
        lineId,
        lineLastUsed: lineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        quantity,
        previousLength: previousLengthMm,
        currentLength: resultLengthMm,
        actualGrindingRemovedMm: grindDepthMm,
        mmRemovedThisCycle: grindDepthMm,
        regrindCountBefore,
        regrindCountAfter: nextCycle,
        regrindCycleCount: nextCycle,
        remainingRegrindCount: Math.max(0, maxRegrindAllowed - nextCycle),
        maxAllowedCycles: maxRegrindAllowed,
        supplierOrInternalProcess: 'INTERNAL_TOOL_ROOM',
        vendorName: 'Internal Fin Die Tool Room (In-House)',
        workOrder: createdTicket.jobCode,
        cost: Math.round((calcLaborMinutes / 60) * 180) + (sparePartsCost || 0),
        laborHours,
        laborTimeMinutes: calcLaborMinutes,
        sparePartsUsed,
        sparePartsCost,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
        defectReason,
        note: remarks || `ลงคิวงานเจียร กำหนดส่ง ${scheduledDate}`,
        status: 'WAITING REGRIND'
      });
      onSaved(
        isEmergency
          ? `🚨 บันทึกงานด่วน ${createdTicket.jobCode} (${partName}) แทรกคิว #1 เรียบร้อย`
          : `✅ บันทึกงานเจียร ${createdTicket.jobCode} (${partName}) เรียบร้อย`,
        createdTicket
      );
    }

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmit(executionMode === 'START_NOW');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div
        className={`bg-[#0b101b] border-2 ${
          isEmergency ? 'border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.3)]' : 'border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.15)]'
        } rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-200 shadow-2xl animate-scaleIn`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sleek Header (Fixed Top) */}
        <div
          className={`shrink-0 px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-4 ${
            isEmergency
              ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border-rose-500/30'
              : 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border-cyan-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isEmergency
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              }`}
            >
              {isEmergency ? <Flame className="w-5 h-5 animate-pulse" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {existingTicket ? `แก้ไขใบงานเจียร (${existingTicket.jobCode})` : 'บันทึกงานเจียระไน & จัดคิวชิ้นงาน'}
                </h3>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    isEmergency
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isEmergency ? '🚨 คิวด่วน #1' : '🟢 คิวปกติ'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold border border-white/10">
                  LINE {lineId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-thai">
                ระบบคำนวณสเปคมิติงานใหม่-ปัจจุบัน-หลังเจียร และตรวจสอบรอบการลับคมอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่าง (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 pb-6 space-y-3 custom-scrollbar text-xs">
          {/* Main Grid Wrapper: 2 Columns for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            
            {/* LEFT COLUMN: Inputs (7/12 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
              
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEmergency(false)}
                  className={`py-1 rounded-lg font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    !isEmergency
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>🟢 คิวปกติ (Normal Queue)</span>
                </button>
 
                <button
                  type="button"
                  onClick={() => setIsEmergency(true)}
                  className={`py-1 rounded-lg font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isEmergency
                      ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-rose-300 hover:bg-white/5'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>🚨 คิวด่วน #1 (Urgent Emergency)</span>
                </button>
              </div>

              {/* Same-day existing queues preview (if any) */}
              {dayExistingTickets.length > 0 && !existingTicket && (
                <div className="p-2 rounded-xl bg-slate-950/90 border border-white/15 space-y-1 text-xs shrink-0">
                  <span className="text-slate-300 font-bold block flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                    คิววันที่ {scheduledDate} ({dayExistingTickets.length} คิว):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {dayExistingTickets.map((t, idx) => (
                      <button
                        key={`${t.id}-${idx}`}
                        type="button"
                        onClick={() => onSelectExistingTicket?.(t)}
                        className="px-2 py-0.5 bg-slate-900 border border-white/15 text-slate-200 hover:border-cyan-400 text-xs font-mono font-bold cursor-pointer transition-colors rounded"
                      >
                        #{t.queueOrder ?? idx + 1} {t.partName} ({t.lineId})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date, Line, Die, and Quantity combined in a high-visibility 4-column grid */}
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-white/15 space-y-2 shrink-0">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-200 font-extrabold mb-1 text-[11px] sm:text-xs">
                      📅 วันที่ <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      min="2025-01-01"
                      value={scheduledDate || ''}
                      onChange={e => setScheduledDate(e.target.value)}
                      className={`w-full px-2.5 py-1.5 bg-slate-900 border ${
                        isBefore2025
                          ? 'border-rose-500 text-rose-300'
                          : isHistoricalPastDate
                          ? 'border-amber-500 text-amber-300'
                          : 'border-slate-700 text-white'
                      } rounded-lg font-mono font-bold text-xs sm:text-[13px] focus:border-cyan-400 focus:outline-none`}
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-slate-200 font-extrabold mb-1 text-[11px] sm:text-xs">
                      🏭 ไลน์ <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={lineId || 'E1'}
                      onChange={e => handleLineChange(e.target.value as ProductionLineId)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-cyan-300 font-black text-xs sm:text-[13px] focus:border-cyan-400 focus:outline-none cursor-pointer"
                    >
                      {LINES_LIST.map(l => <option key={l} value={l}>LINE {l}</option>)}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-slate-200 font-extrabold mb-1 text-[11px] sm:text-xs">
                      🔧 แม่พิมพ์
                    </label>
                    <input
                      type="text"
                      value={dieCode || ''}
                      readOnly
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 font-mono text-xs sm:text-[13px] font-bold"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-amber-300 font-black mb-1 text-[11px] sm:text-xs">
                      🔢 จำนวน
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity ?? 1}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-black text-xs sm:text-[13px] text-center focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Line-Filtered Part Combobox */}
                <div className="pt-0.5">
                  <LineFilteredPartCombobox
                    lineId={lineId}
                    selectedPartCode={partCode}
                    selectedPartName={partName}
                    standards={standards}
                    label="เลือกชิ้นส่วน / อะไหล่ทูลลิ่ง (Part Name & Line)"
                    accentColor={isEmergency ? 'rose' : 'cyan'}
                    onSelectPart={item => applySelectedPartSpecs(item, lineId)}
                  />
                </div>

                {/* Comprehensive Part Master & Cost Details Card */}
                <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-slate-950/95 border border-cyan-500/40 space-y-2 font-mono shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-cyan-300 font-bold">
                    <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                      <span>📊</span>
                      <span>รายละเอียดชิ้นส่วนและต้นทุน (Part Master & Cost Specs)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                      LINE {lineId} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ไลน์ (Line):</span>
                      <span className="text-white font-black text-xs sm:text-[13px]">LINE {lineId}</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ติดตั้ง (Install):</span>
                      <span className="text-amber-400 font-black text-xs sm:text-[13px]">{quantity} ชิ้น</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ซื้อใหม่ (Price):</span>
                      <span className="text-emerald-400 font-black text-xs sm:text-[13px]">฿{(selectedPartCostMaster.newPurchasePrice || 25000).toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">Scrap Spec:</span>
                      <span className="text-rose-400 font-black text-xs sm:text-[13px]">{minAllowedLengthMm.toFixed(2)} mm</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">Shot Life:</span>
                      <span className="text-slate-200 font-bold text-xs sm:text-[13px]">{((selectedPartCostMaster.expectedNewToolLife || 15000000) / 1000000).toFixed(1)}M</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ผู้ผลิต:</span>
                      <span className="text-slate-200 font-bold text-xs sm:text-[13px] truncate block">
                        {selectedPartCostMaster.supplier || 'KISUNG'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ใหม่ (Nom):</span>
                      <span className="text-cyan-400 font-bold text-xs sm:text-[13px]">{nominalLengthMm.toFixed(2)} mm</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">ปัจจุบัน (Cur):</span>
                      <span className="text-amber-400 font-bold text-xs sm:text-[13px]">{previousLengthMm.toFixed(2)} mm</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">หลังเจียร (Aft):</span>
                      <span className="text-emerald-400 font-black text-xs sm:text-[13px]">{resultLengthMm.toFixed(2)} mm</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>รอบเจียรที่เหลือ (Remaining Cycles):</span>
                    <span className="text-cyan-300 font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-black">
                      {remainingCycles} ครั้ง (จาก {maxRegrindAllowed} ครั้ง)
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Past Date Info Indicator */}
              {isHistoricalPastDate && (
                <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>📅 ลงบันทึกข้อมูลย้อนหลัง (Historical Record) วันที่ {scheduledDate}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 font-mono">
                    ย้อนหลัง Jan 2025 OK
                  </span>
                </div>
              )}

              {/* Alert if date is before Jan 2025 */}
              {isBefore2025 && (
                <div className="p-2 rounded-xl bg-rose-950/85 border border-rose-500/70 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>ไม่อนุญาตให้ลงวันที่ย้อนหลังเกิน Jan 2025</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduledDate('2025-01-01')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    ปรับเป็น 2025-01-01
                  </button>
                </div>
              )}

              {/* SECTION 3: ⚠️ DEFECT REASONS */}
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-white/15 shrink-0">
                <label className="block text-slate-100 font-extrabold text-xs sm:text-[13px] mb-2 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>
                    {isEnglish
                      ? 'Regrind & Defect Reason'
                      : sysLanguage === 'DUAL'
                      ? 'สาเหตุการส่งเจียร / Defect Reason'
                      : 'สาเหตุการส่งเจียร / สภาพปัญหา'}
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DEFECT_REASONS_LIST.map(item => {
                    const isSelected = defectReason === item.code;
                    const displayLabel = isEnglish
                      ? item.labelEn
                      : sysLanguage === 'DUAL'
                      ? item.labelTh
                      : item.labelTh;
                    const displayDesc = isEnglish ? item.descEn : item.descTh;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setDefectReason(item.code)}
                        className={`py-2 px-2 border rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/50 font-black'
                            : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-slate-850 hover:text-white font-bold'
                        }`}
                        title={displayDesc}
                      >
                        <span className="text-base shrink-0">{item.icon}</span>
                        <span className="text-[10.5px] sm:text-xs font-black leading-tight uppercase truncate">
                          {displayLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
 
              {/* SECTION 4: 📝 REMARKS (Aligned with Labor Time block on the right) */}
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-white/15 space-y-2 shrink-0">
                <label className="block text-slate-200 font-extrabold text-xs sm:text-[13px] leading-tight flex items-center gap-1.5">
                  <span>📝</span>
                  <span>หมายเหตุ / รายละเอียดงานเพิ่มเติม (Remarks)</span>
                </label>
                <input
                  type="text"
                  value={remarks || ''}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="ระบุรายละเอียด เช่น ลับคมด้วยหิน CBN #400..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold text-xs sm:text-[13px] focus:border-cyan-400 focus:outline-none shadow-inner"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DEFAULT_REMARKS_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRemarks(preset)}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold border cursor-pointer transition-all ${
                        remarks === preset
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-black'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Calculations & Remaining Data (5/12 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
              
              {/* SECTION 2: 📐 COMPLETE SPEC & REGRIND BREAKDOWN CALCULATOR */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border-2 border-cyan-500/35 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300 font-black text-sm">📐</span>
                    <h4 className="font-black text-white text-xs sm:text-sm leading-none">
                      การคำนวณสเปคมิติ & ระยะเจียร
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-slate-300 font-bold">Min Spec:</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                      {minAllowedLengthMm.toFixed(2)} mm
                    </span>
                  </div>
                </div>

                {/* 4 Interactive Spec Flow Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: สเปคงานใหม่ */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                      1. สเปคงานใหม่
                    </span>
                    <div className="mt-1 flex items-baseline justify-between px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800">
                      <span className="text-sm sm:text-base font-black text-cyan-400 font-mono">{nominalLengthMm.toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">mm</span>
                    </div>
                  </div>

                  {/* Card 2: ก่อนเจียร */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 flex flex-col justify-between">
                    <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                      2. ก่อนเจียร (mm)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={previousLengthMm === 0 ? '' : previousLengthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handlePrevLengthChange(e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-cyan-500/50 rounded-lg text-white font-mono text-sm sm:text-base font-black focus:border-cyan-400 focus:outline-none text-center shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Card 3: จะเจียรลง */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 flex flex-col justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      3. จะเจียรลง (mm)
                    </label>
                    <div className="mt-1 flex items-center gap-1">
                      <select
                        value={grindDepthMm}
                        onChange={e => handleGrindDepthChange(e.target.value)}
                        className="flex-1 px-1 py-0.5 bg-slate-900 border border-amber-500/50 rounded-md text-amber-300 font-mono text-xs font-black focus:border-amber-400 focus:outline-none text-center shadow-inner"
                      >
                        {GRIND_STEP_PRESETS.map(p => (
                          <option key={p} value={p}>{p.toFixed(2)}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={grindDepthMm === 0 ? '' : grindDepthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handleGrindDepthChange(e.target.value)}
                        className="w-12 px-1 py-0.5 bg-slate-900 border border-amber-500/30 rounded-md text-amber-300 font-mono text-[10px] focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* Card 4: หลังเจียร */}
                  <div
                    className={`p-2.5 rounded-xl bg-slate-950 border flex flex-col justify-between ${
                      isUnderMinLength
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-emerald-500/60 bg-emerald-950/10'
                    }`}
                  >
                    <label className="text-[11px] font-bold flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isUnderMinLength ? 'bg-rose-400' : 'bg-emerald-400'} inline-block`} />
                      <span className={isUnderMinLength ? 'text-rose-300' : 'text-emerald-300'}>
                        4. หลังเจียร (mm)
                      </span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={resultLengthMm === 0 ? '' : resultLengthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handleResultLengthChange(e.target.value)}
                        className={`w-full px-2.5 py-1 bg-slate-900 border rounded-lg text-sm sm:text-base font-black font-mono text-center shadow-inner focus:outline-none ${
                          isUnderMinLength
                            ? 'border-rose-500 text-rose-300'
                            : 'border-emerald-500 text-emerald-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Cycle Count & Remaining Grinds Summary Bar */}
                <div className="p-2.5 rounded-xl bg-slate-950/95 border border-white/15 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-bold">รอบเจียร:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={regrindCountBefore}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const cleaned = e.target.value.replace(/^0+([1-9])/, '$1');
                            setRegrindCountBefore(Math.max(0, parseInt(cleaned, 10) || 0));
                          }}
                          className="w-11 px-1.5 py-0.5 bg-slate-900 border-2 border-slate-700 rounded-lg text-white font-mono font-black text-center text-sm focus:border-cyan-400 focus:outline-none"
                        />
                        <span className="font-mono text-slate-200 text-xs">
                          &rarr; <strong className="text-cyan-300">รอบที่ {nextCycle}</strong>/{maxRegrindAllowed}
                        </span>
                      </div>
                    </div>

                    {/* Remaining Grinds Calculation Badge */}
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className={`px-2 py-0.5 rounded-md font-black ${
                        remainingCycles > 0 && !isUnderMinLength
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        เหลือเจียร: <strong>{remainingCycles} ครั้ง</strong>
                      </span>
                    </div>
                  </div>

                  {/* Usable Wear Life Gauge Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="font-bold">อายุคงเหลือ (Usable Life)</span>
                      <span className="text-cyan-300 font-black">{remainingPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                      <div
                        className={`h-full transition-all duration-300 ${
                          remainingPercent > 50
                            ? 'bg-emerald-400'
                            : remainingPercent > 20
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${remainingPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {(isUnderMinLength || isOverMaxCycle) && (
                  <div className="p-2 rounded-xl bg-rose-950/90 border border-rose-500/70 text-rose-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-tight">
                      {isUnderMinLength
                        ? `⚠️ สภาพชิ้นงาน: SCRAP (สูงหลังเจียร ${resultLengthMm.toFixed(2)} mm < สเปคขั้นต่ำ ${minAllowedLengthMm.toFixed(2)} mm)`
                        : `⚠️ รอบเจียรครั้งที่ ${nextCycle} เกินโควตาสูงสุด (${maxRegrindAllowed} ครั้ง)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Assigned Technician Card */}
              <div className="p-2.5 rounded-2xl bg-slate-950/85 border border-white/15 flex items-center gap-2">
                <label className="text-slate-200 font-extrabold text-xs shrink-0">
                  ช่างผู้รับผิดชอบ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={technician}
                  onChange={e => setTechnician(e.target.value)}
                  placeholder="ระบุชื่อช่าง..."
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs focus:border-cyan-400 focus:outline-none shadow-inner"
                  required
                />
              </div>

              {/* Labor Time & Cost Card */}
              <div className="p-3 rounded-2xl bg-slate-950/85 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-extrabold text-cyan-300 text-xs uppercase tracking-wide">
                      เวลาแรงงาน & คำนวณต้นทุน (Labor Time)
                    </span>
                  </div>

                  {/* Unit Selector (นาที vs ชั่วโมง) */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setLaborTimeUnit('MINUTES')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        laborTimeUnit === 'MINUTES'
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      นาที
                    </button>
                    <button
                      type="button"
                      onClick={() => setLaborTimeUnit('HOURS')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        laborTimeUnit === 'HOURS'
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ชั่วโมง
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-xs font-bold">
                    {laborTimeUnit === 'MINUTES' ? 'เวลาทำงาน (นาที)' : 'ชั่วโมงแรงงาน (ชั่วโมง)'}
                  </span>
                  <span className="text-cyan-400 font-mono text-xs font-black bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                    ฿{(laborHours * 180).toLocaleString('th-TH', { minimumFractionDigits: 0 })} <span className="text-[10px] text-slate-400 font-normal font-sans">(@180/ชม.)</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={laborTimeUnit === 'MINUTES' ? '5' : '0.25'}
                    min="0"
                    max={laborTimeUnit === 'MINUTES' ? '1440' : '24'}
                    value={
                      laborHours === 0
                        ? ''
                        : laborTimeUnit === 'MINUTES'
                        ? Math.round(laborHours * 60)
                        : laborHours
                    }
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setLaborHours(laborTimeUnit === 'MINUTES' ? val / 60 : val);
                    }}
                    className="w-24 px-2.5 py-1 bg-slate-900 border border-cyan-500/50 rounded-lg text-cyan-300 font-mono font-black text-sm text-center focus:border-cyan-400 focus:outline-none shadow-inner"
                  />
                  <span className="text-slate-300 font-mono text-xs font-black">
                    {laborTimeUnit === 'MINUTES' ? 'นาที' : 'ชม.'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono ml-auto">
                    (= {laborHours.toFixed(2)} ชม.)
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="pt-1 border-t border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    ปุ่มเลือกเวลารวดเร็ว (Quick Select):
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { label: '15 นาที', hours: 0.25 },
                      { label: '30 นาที', hours: 0.5 },
                      { label: '45 นาที', hours: 0.75 },
                      { label: '1 ชม.', hours: 1.0 },
                      { label: '1.5 ชม.', hours: 1.5 },
                      { label: '2 ชม.', hours: 2.0 },
                    ].map(p => {
                      const isMatch = Math.abs(laborHours - p.hours) < 0.01;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setLaborHours(p.hours)}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-all border ${
                            isMatch
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                              : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Emergency Settings (if isEmergency === true) */}
              {isEmergency && (
                <div className="p-2.5 rounded-xl bg-rose-950/35 border-2 border-rose-500/50 space-y-1 animate-fadeIn text-xs">
                  <label className="flex items-center gap-2 cursor-pointer leading-tight">
                    <input
                      type="checkbox"
                      checked={preemptActiveJob}
                      onChange={e => setPreemptActiveJob(e.target.checked)}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="text-rose-200 font-extrabold text-xs sm:text-sm">
                      ⚡ แทรกเป็นคิว #1 ทันที (Preempt Active Job)
                    </span>
                  </label>
                </div>
              )}

            </div>
          </div>
        </form>

        {/* Action Footer (Fixed at Bottom of Modal) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-white/15 bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
            <span>หลังเจียร:</span>
            <strong className={`text-base font-black ${isUnderMinLength ? 'text-rose-400' : 'text-emerald-300'}`}>
              {resultLengthMm.toFixed(2)} mm
            </strong>
            {isUnderMinLength && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-sans">
                ⚠️ ต่ำกว่าสเปค
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors border border-white/10"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('QUEUE_TICKET');
                executeSubmit(false);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-cyan-500/40 bg-slate-900/90 hover:bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 transition-all active:scale-95 shadow-sm"
              title="บันทึกเข้าคิวงาน"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>{existingTicket ? 'บันทึกแก้ไข' : '⏳ ลงคิวรอ'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('START_NOW');
                executeSubmit(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-300 text-slate-950 shadow-emerald-500/30 transition-all active:scale-95"
              title="บันทึกและเริ่มเจียรทันที"
            >
              <Play className="w-3 h-3 fill-slate-950 text-slate-950" />
              <span>⚡ เริ่มเจียรทันที</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('SCRAP_NOW');
                executeSubmit(false);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40 transition-all active:scale-95"
              title="บันทึกคัดทิ้ง (Scrap)"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>🗑️ คัดทิ้ง</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
