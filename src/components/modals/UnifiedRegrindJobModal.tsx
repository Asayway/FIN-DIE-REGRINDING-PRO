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
  Play
} from 'lucide-react';
import { ProductionLineId, LINE_INFO_MAP, RegrindMasterStandard } from '../../types';
import { RegrindWorkTicket, DefectReasonCode } from '../../types/regrind';
import { LineFilteredPartCombobox, FilteredLinePartItem, getFilteredPartsForLine } from '../common/LineFilteredPartCombobox';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';

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

  const standards: RegrindMasterStandard[] = useMemo(() => {
    return storageService.getRegrindMasterStandards();
  }, [isOpen]);

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

  const DEFECT_REASONS_LIST: { code: DefectReasonCode; label: string; icon: string; desc: string }[] = [
    { code: 'NORMAL_WEAR', label: 'สึกหรอตามรอบปกติ (Normal Wear)', icon: '🟢', desc: 'ครบชั่วโมงทำงาน / ครบโควตารอบการปั๊ม' },
    { code: 'BURR_EXCESSIVE', label: 'ครีบฟินสูงเกินเกณฑ์ (Excessive Burr)', icon: '⚠️', desc: 'ชิ้นงานมีครีบคมเกินสเปค ต้องลับคมพั้นช์' },
    { code: 'CHIPPED', label: 'คมพั้นช์บิ่น/กะเทาะ (Edge Chipped)', icon: '🔴', desc: 'ปลายคมบิ่น ต้องเจียรปาดหน้าเปิดคมใหม่' },
    { code: 'GALLING_SCRATCHED', label: 'ผิวเป็นรอย/เศษติด (Galling)', icon: '🟡', desc: 'มีเศษอะลูมิเนียมเกาะ หรือผิวสเตชั่นเป็นรอย' },
    { code: 'OUT_OF_TOLERANCE', label: 'ขนาดหลุดเกณฑ์ (Out of Spec)', icon: '🟠', desc: 'ขนาดมิติชิ้นงานหลุดค่าพิกัดมาตรฐาน' },
    { code: 'BROKEN', label: 'แตกหัก/เสียหายหนัก (Broken)', icon: '🛑', desc: 'อะไหล่แตกหัก ชำรุด แนะนำคัดทิ้ง (Scrap)' },
  ];

  const GRIND_STEP_PRESETS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];

  const nextCycle = regrindCountBefore + 1;
  const isUnderMinLength = resultLengthMm < minAllowedLengthMm;
  const isOverMaxCycle = nextCycle > maxRegrindAllowed;
  const minAllowedDateStr = '2025-01-01';
  const isBefore2025 = scheduledDate < minAllowedDateStr;
  const isHistoricalPastDate = scheduledDate < todayStr && scheduledDate >= minAllowedDateStr;
  const remainingCycles = Math.max(0, maxRegrindAllowed - nextCycle);
  const remainingWearMm = Number(Math.max(0, resultLengthMm - minAllowedLengthMm).toFixed(2));
  const totalWearRangeMm = Number(Math.max(0.01, nominalLengthMm - minAllowedLengthMm).toFixed(2));
  const remainingPercent = Math.min(100, Math.max(0, (remainingWearMm / totalWearRangeMm) * 100));

  const executeSubmit = (shouldStartNow: boolean = false) => {
    if (isBefore2025) {
      alert(`⚠️ ไม่อนุญาตให้ลงวันที่ย้อนหลังเกิน Jan 2025 (กรุณาเลือกตั้งแต่วันที่ ${minAllowedDateStr} เป็นต้นไป)`);
      return;
    }

    const isStartImmediate = shouldStartNow || executionMode === 'START_NOW';

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
        defectReason,
        defectNotes: remarks,
        remarks,
        preemptActiveJob,
        shiftHours
      });

      if (executionMode === 'SCRAP_NOW') {
        const scr = regrindService.scrapItem(existingTicket.id, defectReason, remarks, technician);
        regrindService.incrementDailyMatrixCount(year, month, 'DEFECT_SCRAP', partName, day, quantity);
        onSaved(scr.message, res.ticket);
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
      defectReason,
      defectNotes: remarks || (isEmergency ? `งานด่วนแทรกคิว #1` : `กำหนดเจียร ${scheduledDate}`),
      remarks: remarks || `บันทึกงานเจียร ${scheduledDate}`,
      nominalLengthMm,
      minAllowedLengthMm,
      previousLengthMm,
      grindDepthMm,
      lengthAfterGrindMm: resultLengthMm,
      regrindCountBefore,
      regrindCountAfter: nextCycle,
      maxRegrindAllowed,
      ...(isEmergency ? { preemptActiveJob } : {})
    } as any);

    if (isEmergency) {
      regrindService.markTicketAsEmergency(createdTicket.id, {
        preemptActiveJob,
        shiftHours,
        reason: remarks || `งานด่วนแทรกคิว #1`
      });
    }

    if (executionMode === 'SCRAP_NOW') {
      regrindService.scrapItem(createdTicket.id, defectReason, remarks, technician);
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
        note: remarks || `คัดทิ้งชำรุด (Scrap) จำนวน ${quantity} ชิ้น`,
        status: 'SCRAP'
      });
      onSaved(`🗑️ บันทึกคัดทิ้ง ${createdTicket.jobCode} (${partName}) เรียบร้อย`, createdTicket);
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
        remainingRegrindCount: Math.max(0, maxRegrindAllowed - nextCycle),
        maxAllowedCycles: maxRegrindAllowed,
        supplierOrInternalProcess: 'INTERNAL_TOOL_ROOM',
        vendorName: 'Internal Fin Die Tool Room (In-House)',
        workOrder: createdTicket.jobCode,
        cost: 2500,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
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
        remainingRegrindCount: Math.max(0, maxRegrindAllowed - nextCycle),
        maxAllowedCycles: maxRegrindAllowed,
        supplierOrInternalProcess: 'INTERNAL_TOOL_ROOM',
        vendorName: 'Internal Fin Die Tool Room (In-House)',
        workOrder: createdTicket.jobCode,
        cost: 2500,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        // Do NOT close on outside click - only close on X or Cancel button
        e.stopPropagation();
      }}
    >
      <div
        className={`bg-[#0b101b] border-2 ${
          isEmergency ? 'border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.3)]' : 'border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.15)]'
        } rounded-3xl max-w-4xl w-full overflow-hidden my-auto transition-all text-slate-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sleek Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isEmergency
              ? 'bg-gradient-to-r from-rose-950/60 to-slate-900 border-rose-500/30'
              : 'bg-gradient-to-r from-cyan-950/50 to-slate-900 border-cyan-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isEmergency
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              }`}
            >
              {isEmergency ? <Flame className="w-5 h-5 animate-pulse" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  {existingTicket ? `แก้ไขใบงานเจียร (${existingTicket.jobCode})` : 'บันทึกงานเจียระไน & จัดคิวชิ้นงาน'}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isEmergency
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isEmergency ? '🚨 คิวด่วน #1' : '🟢 คิวปกติ'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold border border-white/10">
                  LINE {lineId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ระบบคำนวณสเปคมิติงานใหม่-ปัจจุบัน-หลังเจียร และตรวจสอบรอบการลับคมอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-2.5 text-xs max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Main Grid Wrapper: 2 Columns for Desktop, 1 Column for Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            
            {/* LEFT COLUMN: Inputs (7/12 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/15">
                <button
                  type="button"
                  onClick={() => setIsEmergency(false)}
                  className={`py-2 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    !isEmergency
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>🟢 คิวปกติ (Normal Queue)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEmergency(true)}
                  className={`py-2 px-3 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isEmergency
                      ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-rose-300 hover:bg-white/5'
                  }`}
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>🚨 คิวด่วน #1 (Emergency Preempt)</span>
                </button>
              </div>

              {/* Same-day existing queues preview (if any) */}
              {dayExistingTickets.length > 0 && !existingTicket && (
                <div className="p-2 rounded-xl bg-slate-950/90 border border-white/15 space-y-1 text-xs">
                  <span className="text-slate-300 font-bold block flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                    คิววันที่ {scheduledDate} ({dayExistingTickets.length} คิว):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {dayExistingTickets.map((t, idx) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectExistingTicket?.(t)}
                        className="px-2 py-0.5 bg-slate-900 border border-white/15 text-slate-200 hover:border-cyan-400 text-xs font-mono font-bold cursor-pointer transition-colors rounded-md"
                      >
                        #{t.queueOrder ?? idx + 1} {t.partName} ({t.lineId})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date, Line, Die, and Quantity combined in a high-visibility 2x2 grid */}
              <div className="p-3 rounded-xl bg-slate-950/85 border border-white/15 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-200 font-extrabold mb-1 text-xs">
                      📅 วันที่เจียร <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      min="2025-01-01"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className={`w-full px-3 py-2 bg-slate-900 border-2 ${
                        isBefore2025
                          ? 'border-rose-500 text-rose-300'
                          : isHistoricalPastDate
                          ? 'border-amber-500 text-amber-300'
                          : 'border-slate-700 text-white'
                      } rounded-xl font-mono font-black focus:border-cyan-400 focus:outline-none [color-scheme:dark] text-sm shadow-inner`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-200 font-extrabold mb-1 text-xs">
                      🏭 ไลน์ผลิต (Line) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={lineId}
                      onChange={e => handleLineChange(e.target.value as ProductionLineId)}
                      className="w-full px-3 py-2 bg-slate-900 border-2 border-cyan-500/50 rounded-xl text-cyan-300 font-black focus:border-cyan-400 focus:outline-none cursor-pointer text-sm shadow-inner"
                    >
                      {LINES_LIST.map(l => (
                        <option key={l} value={l}>
                          LINE {l} ({LINE_INFO_MAP[l]?.shortTag || l})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-200 font-extrabold mb-1 text-xs">
                      🔧 รหัสแม่พิมพ์ (Die Code)
                    </label>
                    <input
                      type="text"
                      value={dieCode}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900/70 border-2 border-slate-700/80 rounded-xl text-slate-200 font-mono text-sm cursor-not-allowed select-none font-black"
                    />
                  </div>

                  {/* Large Easy-to-Use Quantity Field */}
                  <div>
                    <label className="block text-amber-300 font-black mb-1 text-xs uppercase tracking-wider">
                      🔢 จำนวนซ่อม (ชิ้น) <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center justify-between bg-slate-900 border-2 border-amber-500/50 rounded-xl px-2 py-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                        className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-base border border-slate-600 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={quantity}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const cleaned = e.target.value.replace(/^0+([1-9])/, '$1');
                          setQuantity(Math.max(1, parseInt(cleaned, 10) || 1));
                        }}
                        className="w-16 py-0.5 bg-transparent border-0 text-amber-300 font-mono font-black text-center text-base focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(prev => Math.min(100, prev + 1))}
                        className="w-8 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-base border border-slate-600 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
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
              </div>

              {/* Historical Past Date Info Indicator (Allows saving smoothly) */}
              {isHistoricalPastDate && (
                <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
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
                <div className="p-2 rounded-xl bg-rose-950/85 border border-rose-500/70 text-rose-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
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

              {/* SECTION 3: ⚠️ FULL-WIDTH DEFECT REASON */}
              <div className="p-3 rounded-xl bg-slate-950/85 border border-white/15 space-y-2">
                <label className="block text-slate-100 font-extrabold text-xs">
                  ⚠️ สาเหตุการส่งเจียร / สภาพปัญหา (Regrind & Defect Reason) <span className="text-rose-400">*</span>
                </label>

                {/* Quick Reason Badges in larger, easy-to-read grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DEFECT_REASONS_LIST.map(item => {
                    const isSelected = defectReason === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setDefectReason(item.code)}
                        className={`px-2.5 py-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/30'
                            : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-extrabold text-xs leading-snug">
                          <span className="shrink-0 text-sm">{item.icon}</span>
                          <span className="truncate">{item.label.split('(')[0]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Calculations & Remaining Data (5/12 cols) */}
            <div className="lg:col-span-5 space-y-2.5">
              
              {/* SECTION 2: 📐 COMPLETE SPEC & REGRIND BREAKDOWN CALCULATOR */}
              <div className="p-3 rounded-xl bg-gradient-to-b from-slate-900/95 to-slate-950 border-2 border-cyan-500/35 shadow-lg space-y-2">
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

                {/* 4 Interactive Spec Flow Cards - Enlarged & High Contrast */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: สเปคงานใหม่ */}
                  <div className="p-2 rounded-xl bg-slate-950 border-2 border-slate-800 flex flex-col justify-between">
                    <span className="font-extrabold text-slate-300 text-xs block leading-tight">
                      🆕 1. สเปคงานใหม่
                    </span>
                    <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-base font-black text-cyan-400 font-mono flex items-baseline justify-between">
                      <span>{nominalLengthMm.toFixed(2)}</span>
                      <span className="text-[11px] font-bold text-slate-400">mm</span>
                    </div>
                  </div>

                  {/* Card 2: สเปคปัจจุบันก่อนเจียร */}
                  <div className="p-2 rounded-xl bg-slate-950 border-2 border-cyan-500/40 flex flex-col justify-between">
                    <label className="text-xs font-extrabold text-cyan-300 block leading-tight">
                      📏 2. ก่อนเจียร (mm)
                    </label>
                    <div className="mt-1.5 relative">
                      <input
                        type="number"
                        step="0.01"
                        value={previousLengthMm === 0 ? '' : previousLengthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handlePrevLengthChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border-2 border-cyan-500/50 rounded-lg text-white font-mono text-base font-black focus:border-cyan-400 focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Card 3: จะเจียรลงเท่าไหร่ */}
                  <div className="p-2 rounded-xl bg-slate-950 border-2 border-amber-500/40 flex flex-col justify-between">
                    <label className="text-xs font-extrabold text-amber-300 block leading-tight">
                      ⚙️ 3. จะเจียรลง (mm)
                    </label>
                    <div className="mt-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={grindDepthMm === 0 ? '' : grindDepthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handleGrindDepthChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border-2 border-amber-500/50 rounded-lg text-amber-300 font-mono text-base font-black focus:border-amber-400 focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Card 4: หลังเจียรจะเหลือเท่าไหร่ */}
                  <div
                    className={`p-2 rounded-xl bg-slate-950 border-2 flex flex-col justify-between ${
                      isUnderMinLength
                        ? 'border-rose-500/80 bg-rose-950/15'
                        : 'border-emerald-500/60 bg-emerald-950/10'
                    }`}
                  >
                    <label className="text-xs font-extrabold flex items-center justify-between leading-tight">
                      <span className={isUnderMinLength ? 'text-rose-300' : 'text-emerald-300'}>
                        🎯 4. หลังเจียร (mm)
                      </span>
                    </label>
                    <div className="mt-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={resultLengthMm === 0 ? '' : resultLengthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handleResultLengthChange(e.target.value)}
                        className={`w-full px-2.5 py-1.5 bg-slate-900 border-2 rounded-lg text-base font-black font-mono shadow-inner focus:outline-none ${
                          isUnderMinLength
                            ? 'border-rose-500 text-rose-300'
                            : 'border-emerald-500 text-emerald-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Cycle Count & Remaining Grinds Summary Bar */}
                <div className="p-2 rounded-xl bg-slate-950/95 border border-white/15 flex flex-col gap-1.5 text-xs">
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
                  <div className="p-1.5 rounded-lg bg-rose-950/90 border border-rose-500/70 text-rose-200 text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isUnderMinLength
                        ? `สูงหลังเจียร (${resultLengthMm.toFixed(2)} mm) ต่ำกว่าสเปคขั้นต่ำ`
                        : `รอบเจียรครั้งที่ ${nextCycle} เกินโควตาสูงสุด`}
                    </span>
                  </div>
                )}
              </div>

              {/* Status & Assigned Technician inside a clear 2-column card */}
              <div className="p-2.5 rounded-xl bg-slate-950/85 border border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-200 font-extrabold mb-1 text-xs">
                    สถานะการดำเนินการ (Mode)
                  </label>
                  <select
                    value={executionMode}
                    onChange={e => setExecutionMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border-2 border-slate-700 rounded-xl text-white font-black cursor-pointer text-sm focus:border-cyan-400 focus:outline-none shadow-inner"
                  >
                    <option value="QUEUE_TICKET">
                      {isEmergency ? '🚨 คิวด่วน #1 (รอเริ่มเจียร)' : '⏳ ลงคิวรอเจียร (Queued)'}
                    </option>
                    <option value="START_NOW">
                      ⚡ เริ่มเจียรทันที (Start Regrind Now)
                    </option>
                    <option value="SCRAP_NOW">🗑️ คัดทิ้ง (Scrap Tooling)</option>
                  </select>
                  {executionMode === 'START_NOW' && (
                    <div className="mt-1.5 text-[11px] text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded-lg">
                      <Play className="w-3 h-3 fill-emerald-400 text-emerald-400 shrink-0" />
                      <span>บันทึกและปรับสถานะเป็น "กำลังเจียร (In-Process)" ทันที</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-200 font-extrabold mb-1 text-xs">
                    ช่างผู้รับผิดชอบ <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={technician}
                    onChange={e => setTechnician(e.target.value)}
                    placeholder="ระบุชื่อช่าง..."
                    className="w-full px-3 py-2 bg-slate-900 border-2 border-slate-700 rounded-xl text-white font-bold text-sm focus:border-cyan-400 focus:outline-none shadow-inner"
                    required
                  />
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

              {/* SECTION 5: Clear Remarks / Notes */}
              <div className="p-2.5 rounded-xl bg-slate-950/85 border border-white/15 space-y-1.5">
                <label className="block text-slate-200 font-extrabold text-xs leading-none">
                  📝 หมายเหตุ / รายละเอียดงานเพิ่มเติม (Remarks)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="ระบุรายละเอียดงาน..."
                  className="w-full px-3 py-2 bg-slate-900 border-2 border-slate-700 rounded-xl text-white font-semibold text-sm focus:border-cyan-400 focus:outline-none shadow-inner"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {DEFAULT_REMARKS_PRESETS.slice(0, 3).map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRemarks(preset)}
                      className={`px-2 py-0.5 rounded-lg text-xs border cursor-pointer transition-all ${
                        remarks === preset
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-white/5 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15 mt-1 flex-wrap sm:flex-nowrap">
            <div className="text-xs font-mono text-slate-300 truncate">
              หลังเจียร:{' '}
              <strong className={`text-sm font-black ${isUnderMinLength ? 'text-rose-400' : 'text-emerald-300'}`}>
                {resultLengthMm.toFixed(2)} mm
              </strong>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors border border-white/10"
              >
                ยกเลิก
              </button>

              {executionMode === 'SCRAP_NOW' ? (
                <button
                  type="button"
                  onClick={() => executeSubmit(false)}
                  className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40 active:scale-95 transition-all"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>ยืนยันคัดทิ้ง (Scrap)</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => executeSubmit(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer border border-cyan-500/40 bg-slate-900/90 hover:bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 transition-all active:scale-95 shadow-sm"
                    title="บันทึกเข้าคิวงานโดยยังไม่เริ่มเจียร (สถานะ: ในคิวรอเจียร)"
                  >
                    {isEmergency ? <Flame className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-cyan-400" />}
                    <span>
                      {existingTicket
                        ? 'บันทึกแก้ไข'
                        : isEmergency
                        ? 'บันทึกคิวด่วน #1'
                        : 'บันทึกเข้าคิว'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSubmit(true)}
                    className="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-300 text-slate-950 shadow-emerald-500/30 transition-all active:scale-95 ring-2 ring-emerald-400/60 hover:ring-emerald-300"
                    title="บันทึกข้อมูลและปรับสถานะเป็น กำลังเจียร (In-Process) ทันที"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>⚡ เริ่มเจียรทันที</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
