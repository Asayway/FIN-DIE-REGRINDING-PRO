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
  PackageCheck,
  Upload,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  Calculator,
  HelpCircle,
  BookOpen,
  Lock
} from 'lucide-react';
import { ProductionLineId, LINE_INFO_MAP, RegrindMasterStandard } from '../../types';
import { RegrindWorkTicket, DefectReasonCode } from '../../types/regrind';
import { LineFilteredPartCombobox, FilteredLinePartItem, getFilteredPartsForLine } from '../common/LineFilteredPartCombobox';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { costSavingService } from '../../services/costSavingService';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';
import { useLanguage } from '../../i18n';

const LINES_LIST: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

const DEFAULT_REMARKS_PRESETS_TH: string[] = [
  'ลับคมด้วยหิน CBN #400',
  'ปาดหน้าขัดเงา Ra <= 0.1um',
  'รองชิมชดเชยระยะเจียร',
  'งานด่วนแทรกคิว #1'
];

const DEFAULT_REMARKS_PRESETS_EN: string[] = [
  'Sharpen with CBN #400 wheel',
  'Surface polish Ra <= 0.1um',
  'Add shim to compensate length',
  'Urgent Queue #1 Priority'
];

export interface UnifiedRegrindJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string, createdOrUpdatedTicket?: RegrindWorkTicket) => void;
  /** Optional initial date (YYYY-MM-DD) */
  initialDateStr?: string;
  /** Optional initial production line */
  initialLineId?: ProductionLineId | '';
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
  /** Optional navigation handler to open the full User Guide page */
  onOpenFullGuide?: () => void;
}

export const UnifiedRegrindJobModal: React.FC<UnifiedRegrindJobModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialDateStr,
  initialLineId = '',
  initialPartCode,
  initialPartName,
  initialIsEmergency = false,
  matrixCategory = 'REPAIR',
  existingTicket = null,
  dayExistingTickets = [],
  onSelectExistingTicket,
  onOpenFullGuide
}) => {
  const { language } = useLanguage();
  const isEnglish = language === 'EN' || language === 'DUAL';
  const todayStr = new Date().toISOString().slice(0, 10);
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Unified Mode: Normal vs Urgent/Emergency #1
  const [isEmergency, setIsEmergency] = useState<boolean>(initialIsEmergency);
  const [executionMode, setExecutionMode] = useState<'QUEUE_TICKET' | 'START_NOW' | 'SCRAP_NOW'>('QUEUE_TICKET');

  // Core Fields (key required inputs start blank/unconfirmed on generic new job)
  const [scheduledDate, setScheduledDate] = useState<string>(initialDateStr || todayStr);
  const [lineId, setLineId] = useState<ProductionLineId | ''>(initialLineId || '');
  const [dieCode, setDieCode] = useState<string>('');
  const [partCode, setPartCode] = useState<string>(initialPartCode || '');
  const [partName, setPartName] = useState<string>(initialPartName || '');
  const [serialOrLot, setSerialOrLot] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const quantity = useMemo(() => {
    const parsed = parseInt(quantityInput, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
  }, [quantityInput]);

  // Dimensional & Cycle Fields
  const [nominalLengthMm, setNominalLengthMm] = useState<number>(0);
  const [minAllowedLengthMm, setMinAllowedLengthMm] = useState<number>(0);
  const [previousLengthMm, setPreviousLengthMm] = useState<number>(0);
  const [grindDepthMm, setGrindDepthMm] = useState<number>(0);
  const [grindDepthInput, setGrindDepthInput] = useState<string>('');
  const [resultLengthMm, setResultLengthMm] = useState<number>(0);
  const [regrindCountBefore, setRegrindCountBefore] = useState<number>(0);
  const [maxRegrindAllowed, setMaxRegrindAllowed] = useState<number>(4);

  // Emergency Preemption Settings (when isEmergency === true)
  const [preemptActiveJob, setPreemptActiveJob] = useState<boolean>(true);
  const [shiftHours, setShiftHours] = useState<number>(2);

  // Operator, Reason & Remarks
  const [technician, setTechnician] = useState<string>('Thanakorn Phonpayung');
  const [defectReason, setDefectReason] = useState<DefectReasonCode | null>(null);
  const [customDefectReason, setCustomDefectReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Labor & Cost Control
  const [laborHours, setLaborHours] = useState<number>(0);
  const [laborInput, setLaborInput] = useState<string>('');
  const [laborTimeUnit, setLaborTimeUnit] = useState<'HOURS' | 'MINUTES'>('HOURS');
  const [sparePartsUsed, setSparePartsUsed] = useState<string>('');
  const [sparePartsCost, setSparePartsCost] = useState<number>(0);
  const [showCostBreakdown, setShowCostBreakdown] = useState<boolean>(false);

  // Real Workpiece Evidence Photos State
  const [workpiecePhotos, setWorkpiecePhotos] = useState<string[]>([]);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

  // Load existing photos when modal opens
  useEffect(() => {
    if (isOpen && partCode) {
      const existing = storageService.getPartWorkpiecePhotos(partCode);
      if (existing && existing.length > 0) {
        setWorkpiecePhotos(existing.map(p => p.dataUrl));
      } else {
        setWorkpiecePhotos([]);
      }
    } else if (isOpen) {
      setWorkpiecePhotos([]);
    }
  }, [isOpen, partCode]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setWorkpiecePhotos(prev => [base64, ...prev]);
          storageService.savePartWorkpiecePhoto(partCode || 'GENERAL-TOOLING', {
            dataUrl: base64,
            fileName: file.name,
            caption: isEnglish ? `Regrind evidence photo (${scheduledDate})` : `แนบรูปงานซ่อมเจียร วันที่ ${scheduledDate}`,
            uploadedBy: technician,
            isPrimary: workpiecePhotos.length === 0
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setWorkpiecePhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const standards: RegrindMasterStandard[] = useMemo(() => {
    return storageService.getRegrindMasterStandards();
  }, [isOpen]);

  const selectedPartCostMaster = useMemo(() => {
    const costMasters = costSavingService.getPartCostMasters();
    return costMasters.find(cm => cm.partNo === partCode || (partName && cm.partName.toLowerCase() === partName.toLowerCase())) || {
      newPurchasePrice: 12500,
      purchasePriceUsd: 360,
      expectedNewToolLife: 15000000,
      supplier: 'Standard Tooling Vendor',
      nominalLengthMm,
      minAllowedLengthMm,
      maxRegrindCount: maxRegrindAllowed
    };
  }, [isOpen, partCode, partName, nominalLengthMm, minAllowedLengthMm, maxRegrindAllowed]);

  // Live 5-Step True Cost & Savings Engine
  const liveCostResult = useMemo(() => {
    const unitPrice = selectedPartCostMaster.newPurchasePrice || 12500;
    const calcHours = laborHours > 0 ? laborHours : 1.0;
    const calcQty = Math.max(1, quantity || 1);
    return CostSavingCalculationService.calculateTrueJobCostStepByStep({
      machineAssetValueThb: 2400000,
      usefulLifeHours: 20000,
      maintenanceReservePerHour: 35,
      ratedPowerKw: 15.0,
      loadFactorPercent: 75,
      electricityPricePerKwh: 4.50,
      machineRunningHours: calcHours,

      baseLaborRatePerHour: 85,
      skillGrade: 'GRADE_A', // Senior (+50 THB/hr)
      overtimeCondition: isEmergency ? 'OT_1_5X' : 'NORMAL',
      setupLaborHours: calcHours < 0.35 ? Number((calcHours * 0.3).toFixed(2)) : 0.35,
      directLaborHours: Number(
        Math.max(0, calcHours - (calcHours < 0.35 ? Number((calcHours * 0.3).toFixed(2)) : 0.35)).toFixed(2)
      ),
      includesLaborInMachineRate: false,

      wheelWearCostPerJob: 25,
      dressingToolWearCost: 10,
      consumableSundriesCost: 12.39,
      coolantCostPerJob: 10,

      qcInspectionHours: 0.25,
      qcHourlyRate: 120,
      shopfloorOverheadFixedThb: 50,

      quantityPieces: calcQty,
      newPurchasePricePerPiece: unitPrice
    });
  }, [laborHours, quantity, selectedPartCostMaster, isEmergency]);

  const getDieCodeForLine = (lId: string): string => {
    if (!lId) return '';
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
    setValidationErrors([]);

    if (existingTicket) {
      const emg = Boolean(existingTicket.isEmergency || existingTicket.urgency === 'EMERGENCY' || initialIsEmergency);
      setIsEmergency(emg);
      setExecutionMode(existingTicket.status === 'SCRAP' ? 'SCRAP_NOW' : 'QUEUE_TICKET');
      setScheduledDate(existingTicket.scheduledDate || existingTicket.targetCompletionDate?.slice(0, 10) || initialDateStr || todayStr);
      const fallbackLine: ProductionLineId = (initialLineId && LINES_LIST.includes(initialLineId as any) ? initialLineId : 'E1') as ProductionLineId;
      const existingLine: ProductionLineId = LINES_LIST.includes(existingTicket.lineId as any)
        ? (existingTicket.lineId as ProductionLineId)
        : fallbackLine;
      setLineId(existingLine);
      setDieCode(existingTicket.dieCode || getDieCodeForLine(existingLine));
      setPartCode(existingTicket.partCode);
      setPartName(existingTicket.partName);
      setSerialOrLot(existingTicket.qrCode || `LOT-${existingTicket.lineId}-01`);
      setQuantityInput(String(existingTicket.quantity || 1));

      const nom = existingTicket.nominalLengthMm ?? 70.0;
      const minLim = existingTicket.minAllowedLengthMm ?? 65.0;
      const prev = existingTicket.previousLengthMm ?? nom;
      const depth = existingTicket.grindDepthMm ?? 0.20;
      const afterLen = existingTicket.lengthAfterGrindMm ?? Number((prev - depth).toFixed(3));
      setNominalLengthMm(nom);
      setMinAllowedLengthMm(minLim);
      setPreviousLengthMm(prev);
      setGrindDepthMm(depth);
      setGrindDepthInput(depth > 0 ? String(depth) : '');
      setResultLengthMm(Number(afterLen.toFixed(3)));
      setRegrindCountBefore(existingTicket.regrindCountBefore ?? 0);
      setMaxRegrindAllowed(existingTicket.maxRegrindAllowed ?? 4);
      setTechnician(existingTicket.assignedTechnician || 'Thanakorn Phonpayung');
      setDefectReason(existingTicket.defectReason || 'NORMAL_WEAR');
      setCustomDefectReason((existingTicket as any).defectReasonCustom || '');
      setRemarks(
        existingTicket.remarks ||
          existingTicket.defectNotes ||
          ''
      );
      const hrs = existingTicket.laborHours !== undefined ? existingTicket.laborHours : 1.0;
      setLaborHours(hrs);
      setLaborInput(hrs > 0 ? String(hrs) : '');
      setLaborTimeUnit('HOURS');
      setSparePartsUsed(existingTicket.sparePartsUsed || '');
      setSparePartsCost(existingTicket.sparePartsCost || 0);
      setPreemptActiveJob(true);
      setShiftHours(2);
    } else {
      const hasExplicitPart = Boolean(initialPartCode || initialPartName);
      const targetLine: ProductionLineId | '' =
        initialLineId && LINES_LIST.includes(initialLineId as any)
          ? (initialLineId as ProductionLineId)
          : hasExplicitPart
          ? 'E1'
          : '';

      setIsEmergency(initialIsEmergency);
      setExecutionMode(matrixCategory === 'DEFECT_SCRAP' ? 'SCRAP_NOW' : 'QUEUE_TICKET');
      setScheduledDate(initialDateStr || todayStr);
      setLineId(targetLine);
      setDieCode(targetLine ? getDieCodeForLine(targetLine) : '');
      setQuantityInput('');
      setTechnician('Thanakorn Phonpayung');
      setDefectReason(matrixCategory === 'DEFECT_SCRAP' ? 'CHIPPED' : null);
      setCustomDefectReason('');
      setLaborHours(0);
      setLaborInput('');
      setLaborTimeUnit('HOURS');
      setSparePartsUsed('');
      setSparePartsCost(0);
      setPreemptActiveJob(true);
      setShiftHours(2);
      setRegrindCountBefore(0);

      if (targetLine && hasExplicitPart) {
        const lineParts = getFilteredPartsForLine(targetLine, standards);
        const matchedPart =
          (initialPartCode ? lineParts.find(p => p.partCode === initialPartCode) : undefined) ||
          (initialPartName ? lineParts.find(p => p.partName.toLowerCase() === initialPartName.toLowerCase()) : undefined);

        if (matchedPart) {
          applySelectedPartSpecs(matchedPart, targetLine, false);
        } else {
          setPartCode('');
          setPartName('');
          setSerialOrLot('');
          setNominalLengthMm(0);
          setMinAllowedLengthMm(0);
          setPreviousLengthMm(0);
          setGrindDepthMm(0);
          setGrindDepthInput('');
          setResultLengthMm(0);
          setMaxRegrindAllowed(4);
        }
      } else {
        setPartCode('');
        setPartName('');
        setSerialOrLot('');
        setNominalLengthMm(0);
        setMinAllowedLengthMm(0);
        setPreviousLengthMm(0);
        setGrindDepthMm(0);
        setGrindDepthInput('');
        setResultLengthMm(0);
        setMaxRegrindAllowed(4);
      }

      setRemarks(
        initialIsEmergency
          ? (isEnglish ? 'Urgent Queue #1 Priority' : 'งานด่วนแทรกคิว #1')
          : matrixCategory === 'DEFECT_SCRAP'
          ? (isEnglish ? 'Damaged / Scrap' : 'ชำรุดคัดทิ้ง (Scrap)')
          : ''
      );
    }
  }, [isOpen, existingTicket, initialDateStr, initialLineId, initialPartCode, initialPartName, initialIsEmergency, matrixCategory]);

  const applySelectedPartSpecs = (
    item: FilteredLinePartItem,
    currentLine: ProductionLineId | '' = lineId,
    preserveBlankDepth: boolean = !existingTicket
  ) => {
    setPartCode(item.partCode);
    setPartName(item.partName);
    setNominalLengthMm(item.nominalLengthMm);
    setMinAllowedLengthMm(item.minAllowedLengthMm);
    setPreviousLengthMm(item.nominalLengthMm);
    const nextDepth = preserveBlankDepth ? 0 : item.grindingAmountPerTimeMm;
    setGrindDepthMm(nextDepth);
    setGrindDepthInput(preserveBlankDepth ? '' : nextDepth > 0 ? String(nextDepth) : '');
    setResultLengthMm(Number((item.nominalLengthMm - nextDepth).toFixed(3)));
    setMaxRegrindAllowed(item.maxRegrindCount);
    setSerialOrLot(`LOT-${currentLine || item.lineId}-${item.partCode.replace(/[^A-Za-z0-9]/g, '').slice(-5)}`);
    setValidationErrors([]);
  };

  const handleLineChange = (newLine: ProductionLineId | '') => {
    setLineId(newLine);
    setDieCode(newLine ? getDieCodeForLine(newLine) : '');
    setValidationErrors([]);
    if (!newLine) {
      setPartCode('');
      setPartName('');
      setNominalLengthMm(0);
      setMinAllowedLengthMm(0);
      setPreviousLengthMm(0);
      setGrindDepthMm(0);
      setGrindDepthInput('');
      setResultLengthMm(0);
    }
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
    setValidationErrors([]);
  };

  const handleGrindDepthChange = (valStrOrNum: string | number) => {
    const rawStr = typeof valStrOrNum === 'number' ? String(valStrOrNum) : valStrOrNum;
    setGrindDepthInput(rawStr);
    const val = typeof valStrOrNum === 'number' ? valStrOrNum : sanitizeNumberInput(valStrOrNum, 0);
    setGrindDepthMm(val);
    setResultLengthMm(Number((previousLengthMm - val).toFixed(3)));
    setValidationErrors([]);
  };

  const remarksPresets = isEnglish ? DEFAULT_REMARKS_PRESETS_EN : DEFAULT_REMARKS_PRESETS_TH;

  const DEFECT_REASONS_LIST: { code: DefectReasonCode; labelTh: string; labelEn: string; icon: string; descTh: string; descEn: string }[] = [
    { code: 'NORMAL_WEAR', labelTh: 'สึกหรอปกติ (Normal Wear)', labelEn: 'Normal Wear', icon: '🟢', descTh: 'ครบชั่วโมงทำงาน / ครบโควตารอบการปั๊ม', descEn: 'Normal EOL wear cycle limit' },
    { code: 'BURR_EXCESSIVE', labelTh: 'ครีบสูงเกิน (Excessive Burr)', labelEn: 'Excessive Burr', icon: '⚠️', descTh: 'ชิ้นงานมีครีบคมเกินสเปค ต้องลับคมพั้นช์', descEn: 'Burr height exceeding product spec' },
    { code: 'CHIPPED', labelTh: 'คมบิ่น/กะเทาะ (Edge Chipped)', labelEn: 'Edge Chipped', icon: '🔴', descTh: 'ปลายคมบิ่น ต้องเจียรปาดหน้าเปิดคมใหม่', descEn: 'Micro-fractures on cutting edge' },
    { code: 'GALLING_SCRATCHED', labelTh: 'ผิวเป็นรอย/เศษติด (Galling)', labelEn: 'Galling Scratched', icon: '🟡', descTh: 'มีเศษอะลูมิเนียมเกาะ หรือผิวสเตชั่นเป็นรอย', descEn: 'Aluminum sticking or galling scratches' },
    { code: 'OUT_OF_TOLERANCE', labelTh: 'หลุดสเปค Min (Out of Spec)', labelEn: 'Out of Tolerance', icon: '🟠', descTh: 'ขนาดมิติชิ้นงานหลุดค่าพิกัดมาตรฐาน', descEn: 'Dimensional tolerance limit breached' },
    { code: 'BROKEN', labelTh: 'แตกหักชำรุด (Broken)', labelEn: 'Broken / Damaged', icon: '🛑', descTh: 'อะไหล่แตกหัก ชำรุด แนะนำคัดทิ้ง (Scrap)', descEn: 'Severe fracture or broken part' },
  ];

  const currentPartSpec = useMemo(() => {
    if (!lineId || (!partCode && !partName)) return undefined;
    const lineParts = getFilteredPartsForLine(lineId, standards);
    const fromLine =
      lineParts.find(p => p.partCode === partCode) ||
      lineParts.find(p => p.partName.trim().toLowerCase() === partName.trim().toLowerCase());
    if (fromLine) return fromLine;

    const fallbackMaster =
      regrindService.findMasterByPartName(partCode) ||
      regrindService.findMasterByPartName(partName);
    if (!fallbackMaster) return undefined;

    return {
      partCode: fallbackMaster.partCode,
      partName: fallbackMaster.partName,
      lineId,
      tubeSizeCompat: (fallbackMaster.tubeSize as any) || 'ALL',
      category: fallbackMaster.category,
      partTypeLabel: fallbackMaster.category,
      nominalLengthMm: fallbackMaster.nominalLengthMm,
      grindingAmountPerTimeMm: fallbackMaster.grindingAmountPerTimeMm,
      grindMinMm: fallbackMaster.grindMinMm ?? fallbackMaster.grindingAmountPerTimeMm,
      grindMaxMm: fallbackMaster.grindMaxMm ?? fallbackMaster.grindingAmountPerTimeMm,
      totalGrindingAllowanceMm: fallbackMaster.totalGrindingAllowanceMm,
      minAllowedLengthMm: fallbackMaster.minAllowedLengthMm,
      maxRegrindCount: fallbackMaster.maxRegrindCount,
      regrindCyclesLabel: fallbackMaster.regrindCyclesLabel,
      regrindAllowed: fallbackMaster.regrindAllowed,
      disposeAfterOneUse: fallbackMaster.disposeAfterOneUse,
      isStandardRegrindTool: true
    } as FilteredLinePartItem;
  }, [lineId, partCode, partName, standards]);

  const stdGrindMin = currentPartSpec?.grindMinMm ?? currentPartSpec?.grindingAmountPerTimeMm ?? 0;
  const stdGrindMax = currentPartSpec?.grindMaxMm ?? stdGrindMin;
  const isNonRegrindablePart = Boolean(currentPartSpec && (!currentPartSpec.regrindAllowed || currentPartSpec.disposeAfterOneUse));
  const isGrindDepthOutOfRange =
    !isNonRegrindablePart &&
    stdGrindMin > 0 &&
    grindDepthMm > 0 &&
    (grindDepthMm < stdGrindMin - 1e-4 || grindDepthMm > stdGrindMax + 1e-4);

  const hasStandardSpecDeviation = Boolean(
    currentPartSpec &&
      !isNonRegrindablePart &&
      ((currentPartSpec.nominalLengthMm > 0 && Math.abs(nominalLengthMm - currentPartSpec.nominalLengthMm) > 0.02) ||
        (currentPartSpec.minAllowedLengthMm > 0 && Math.abs(minAllowedLengthMm - currentPartSpec.minAllowedLengthMm) > 0.02) ||
        (currentPartSpec.maxRegrindCount > 0 && maxRegrindAllowed !== currentPartSpec.maxRegrindCount))
  );

  const handleSyncToStandardSpec = () => {
    if (!currentPartSpec) return;
    setNominalLengthMm(currentPartSpec.nominalLengthMm);
    setMinAllowedLengthMm(currentPartSpec.minAllowedLengthMm);
    setMaxRegrindAllowed(currentPartSpec.maxRegrindCount);
    const nextDepth = isNonRegrindablePart ? 0 : (currentPartSpec.grindMinMm ?? currentPartSpec.grindingAmountPerTimeMm);
    setGrindDepthMm(nextDepth);
    setGrindDepthInput(nextDepth > 0 ? String(nextDepth) : '');
    setResultLengthMm(Number((previousLengthMm - nextDepth).toFixed(3)));
  };

  // Required-Field Completion States (soft gray when unfilled -> soft light green when filled)
  const minAllowedDateStr = '2025-01-01';
  const isBefore2025 = Boolean(scheduledDate) && scheduledDate < minAllowedDateStr;
  const isHistoricalPastDate = Boolean(scheduledDate) && scheduledDate < todayStr && scheduledDate >= minAllowedDateStr;

  const isDateFilled = Boolean(scheduledDate) && !isBefore2025;
  const isLineFilled = Boolean(lineId);
  const isQtyFilled = quantity >= 1;
  const isPartSelected = Boolean(partCode && partName);
  const isDefectReasonFilled = defectReason !== null;
  const isBeforeGrindFilled = isPartSelected && previousLengthMm > 0;
  const isGrindDepthFilled = isPartSelected && (grindDepthMm > 0 || (isNonRegrindablePart && grindDepthInput !== ''));
  const isLaborFilled = laborHours > 0;
  const isTechFilled = technician.trim().length > 0;

  const requiredChecks = [
    isDateFilled,
    isLineFilled,
    isQtyFilled,
    isPartSelected,
    isDefectReasonFilled,
    isBeforeGrindFilled,
    isGrindDepthFilled || isNonRegrindablePart,
    isLaborFilled,
    isTechFilled
  ];
  const filledRequiredCount = requiredChecks.filter(Boolean).length;
  const totalRequiredCount = requiredChecks.length;

  const UNFILLED_FIELD_CLS =
    'bg-slate-500/25 border-slate-400/50 text-white placeholder-slate-300/75 hover:border-slate-300/75 focus:border-cyan-400';
  const FILLED_FIELD_CLS =
    'bg-emerald-400/18 border-emerald-400/60 text-white hover:border-emerald-300/80 focus:border-emerald-300 shadow-[inset_0_0_12px_rgba(52,211,153,0.08)]';

  const nextCycle = regrindCountBefore + 1;
  const isUnderMinLength = isPartSelected && Number(resultLengthMm.toFixed(3)) < Number(minAllowedLengthMm.toFixed(3)) - 1e-4;
  const isOverMaxCycle = isPartSelected && nextCycle > maxRegrindAllowed;
  const cycleRemaining = Math.max(0, maxRegrindAllowed - nextCycle);
  const effectiveStepForRemaining = Math.max(0.01, grindDepthMm > 0 ? grindDepthMm : (stdGrindMin || 0.1));
  const dimRemaining = !isPartSelected || isUnderMinLength
    ? 0
    : Math.floor((resultLengthMm - minAllowedLengthMm) / effectiveStepForRemaining + 1e-6);
  const remainingCycles = (!isPartSelected || isUnderMinLength || isNonRegrindablePart)
    ? 0
    : Math.max(0, Math.min(cycleRemaining, dimRemaining));
  const remainingWearMm = Number(Math.max(0, resultLengthMm - minAllowedLengthMm).toFixed(2));
  const totalWearRangeMm = Number(Math.max(0.01, nominalLengthMm - minAllowedLengthMm).toFixed(2));
  const remainingPercent = (!isPartSelected || isUnderMinLength || isOverMaxCycle || isNonRegrindablePart)
    ? 0
    : Math.min(100, Math.max(0, (remainingWearMm / totalWearRangeMm) * 100));

  const executeSubmit = (targetMode?: 'QUEUE_TICKET' | 'START_NOW' | 'SCRAP_NOW' | boolean) => {
    const mode = typeof targetMode === 'string' ? targetMode : (targetMode === true ? 'START_NOW' : executionMode);
    const isStartImmediate = mode === 'START_NOW';
    const isScrapIntent = mode === 'SCRAP_NOW';

    // Validate all required fields cleanly without window.alert
    const missing: string[] = [];
    if (!scheduledDate) {
      missing.push(isEnglish ? 'Date' : 'วันที่');
    } else if (isBefore2025) {
      missing.push(isEnglish ? 'Date must be >= 2025-01-01' : 'วันที่ต้องตั้งแต่ 2025-01-01 เป็นต้นไป');
    }
    if (!isLineFilled) missing.push(isEnglish ? 'Production Line' : 'ไลน์ (Line)');
    if (!isQtyFilled) missing.push(isEnglish ? 'Quantity (Pcs)' : 'จำนวนชิ้นงานที่ซ่อม');
    if (!isPartSelected) missing.push(isEnglish ? 'Tooling Part Name' : 'ชื่อรายการชิ้นงาน');
    if (!isDefectReasonFilled) missing.push(isEnglish ? 'Defect Reason' : 'สาเหตุการส่งเจียร');
    if (!isBeforeGrindFilled && !isScrapIntent) missing.push(isEnglish ? '2. Before Grind (mm)' : '2. ก่อนเจียร (mm)');
    if (!isScrapIntent && !isNonRegrindablePart && grindDepthMm <= 0) {
      missing.push(isEnglish ? '3. Grind Depth (mm)' : '3. ระยะที่จะเจียรลง (mm)');
    }
    if (!isScrapIntent && laborHours <= 0) {
      missing.push(isEnglish ? 'Labor / Repair Time' : 'เวลาในการซ่อม');
    }
    if (!isTechFilled) missing.push(isEnglish ? 'Assigned Technician' : 'ช่างผู้รับผิดชอบ');

    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors([]);

    const resolvedLineId = lineId as ProductionLineId;
    const resolvedQty = Math.max(1, quantity);
    const resolvedDefectReason: DefectReasonCode = defectReason || 'NORMAL_WEAR';
    const resolvedLaborHours = laborHours > 0 ? laborHours : 0.5;

    // Auto-Scrap Rule: If calculated dimension is below min spec or cycles exceed max allowed,
    // the system automatically designates this as SCRAP and bypasses QC inspection.
    const isAutoScrapTriggered = isUnderMinLength || isOverMaxCycle;
    const isScrap = isScrapIntent || isAutoScrapTriggered;

    let cleanRemarks = remarks;
    if (isStartImmediate && typeof cleanRemarks === 'string' && (cleanRemarks.includes('ยกเลิก / คัดทิ้ง') || cleanRemarks.includes('Cancelled / Scrapped'))) {
      cleanRemarks = cleanRemarks.replace(/(?:ยกเลิก\s*\/\s*คัดทิ้ง|Cancelled\s*\/\s*Scrapped).*?(?:\||$)/g, '').trim();
    }

    const scrapReasonCalculated = isUnderMinLength
      ? (isEnglish
          ? `Cancelled / Scrapped (Scrap Limit): After-grind length (${resultLengthMm.toFixed(2)} mm) below Min Spec (${minAllowedLengthMm.toFixed(2)} mm)`
          : `ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร): ความยาวหลังเจียร (${resultLengthMm.toFixed(2)} mm) ต่ำกว่าสเปค Min (${minAllowedLengthMm.toFixed(2)} mm)`)
      : isOverMaxCycle
      ? (isEnglish
          ? `Cancelled / Scrapped (Scrap Limit): Regrind cycle (${nextCycle}) exceeds max limit (${maxRegrindAllowed} cycles)`
          : `ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร): รอบการเจียร (${nextCycle} ครั้ง) เกินขีดจำกัดสูงสุด (${maxRegrindAllowed} ครั้ง)`)
      : (cleanRemarks || remarks || (isEnglish ? 'Scrapped per technician inspection' : 'ชำรุดคัดทิ้งตามคำสั่งช่าง'));

    const effectiveRemarks = isScrap ? scrapReasonCalculated : (cleanRemarks || remarks);

    const parsedDate = new Date(scheduledDate);
    const year = parsedDate.getFullYear() || 2026;
    const month = (parsedDate.getMonth() + 1) || 1;
    const day = parsedDate.getDate() || 1;

    // Case 1: Editing Existing Queue Ticket
    if (existingTicket) {
      const res = regrindService.updateQueueTicket(existingTicket.id, {
        lineId: resolvedLineId,
        partCode,
        partName,
        quantity: resolvedQty,
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
        defectReason: isScrap ? (isUnderMinLength ? 'OUT_OF_TOLERANCE' : resolvedDefectReason) : resolvedDefectReason,
        defectNotes: effectiveRemarks,
        remarks: effectiveRemarks,
        laborHours: resolvedLaborHours,
        sparePartsUsed,
        sparePartsCost,
        preemptActiveJob,
        shiftHours
      });

      if (isScrap) {
        const scr = regrindService.scrapItem(existingTicket.id, isUnderMinLength ? 'OUT_OF_TOLERANCE' : resolvedDefectReason, scrapReasonCalculated, technician);
        regrindService.incrementDailyMatrixCount(year, month, 'DEFECT_SCRAP', partName, day, resolvedQty);
        onSaved(
          isEnglish
            ? `❌ ${scr.message} (Scrap limit reached — auto-scrapped, QC bypassed)`
            : `❌ ${scr.message} (ครบลิมิตเจียร - คัดทิ้งอัตโนมัติไม่ต้องผ่าน QC)`,
          res.ticket
        );
      } else if (isStartImmediate) {
        const startRes = regrindService.startGrinding(existingTicket.id, technician, { etaMinutes: 30 });
        regrindService.incrementDailyMatrixCount(year, month, 'REPAIR', partName, day, resolvedQty);
        const latest = regrindService.getQueueTickets().find(t => t.id === existingTicket.id);
        onSaved(`⚡ ${startRes.message}`, latest || res.ticket);
      } else {
        regrindService.incrementDailyMatrixCount(year, month, 'REPAIR', partName, day, resolvedQty);
        onSaved(res.message, res.ticket);
      }
      onClose();
      return;
    }

    // Case 2: Creating New Ticket
    const createdTicket = regrindService.createManualTicket({
      lineId: resolvedLineId,
      partCode,
      partName,
      quantity: resolvedQty,
      assignedTechnician: technician,
      scheduledDate,
      targetCompletionDate: `${scheduledDate}T17:00:00.000Z`,
      urgency: isEmergency ? 'EMERGENCY' : 'NORMAL',
      isEmergency,
      defectReason: isScrap ? (isUnderMinLength ? 'OUT_OF_TOLERANCE' : resolvedDefectReason) : resolvedDefectReason,
      defectNotes: effectiveRemarks || (isEmergency ? (isEnglish ? 'Urgent Queue #1' : 'งานด่วนแทรกคิว #1') : (isEnglish ? `Scheduled ${scheduledDate}` : `กำหนดเจียร ${scheduledDate}`)),
      remarks: effectiveRemarks || (isEnglish ? `Regrind ticket ${scheduledDate}` : `บันทึกงานเจียร ${scheduledDate}`),
      nominalLengthMm,
      minAllowedLengthMm,
      previousLengthMm,
      grindDepthMm,
      lengthAfterGrindMm: resultLengthMm,
      regrindCountBefore,
      regrindCountAfter: nextCycle,
      maxRegrindAllowed,
      laborHours: resolvedLaborHours,
      sparePartsUsed,
      sparePartsCost,
      ...(isEmergency ? { preemptActiveJob } : {})
    } as any);

    if (isEmergency) {
      regrindService.markTicketAsEmergency(createdTicket.id, {
        preemptActiveJob,
        shiftHours,
        reason: remarks || (isEnglish ? 'Urgent Queue #1' : 'งานด่วนแทรกคิว #1')
      });
    }

    if (isScrap) {
      regrindService.scrapItem(createdTicket.id, isUnderMinLength ? 'OUT_OF_TOLERANCE' : resolvedDefectReason, scrapReasonCalculated, technician);
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        'DEFECT_SCRAP',
        partName,
        day,
        resolvedQty
      );
      storageService.recordRegrind({
        lineId: resolvedLineId,
        lineLastUsed: resolvedLineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        quantity: resolvedQty,
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
        defectReason: resolvedDefectReason,
        note: scrapReasonCalculated,
        status: 'SCRAP'
      });
      onSaved(
        isEnglish
          ? `❌ Scrapped ${createdTicket.jobCode} (${partName}) — at limit, QC bypassed`
          : `❌ บันทึกคัดทิ้ง ${createdTicket.jobCode} (${partName}) เรียบร้อย (ครบลิมิตเจียร - คัดทิ้งอัตโนมัติไม่ต้องผ่าน QC)`,
        createdTicket
      );
    } else if (isStartImmediate) {
      // Start Grinding Immediately upon creation
      regrindService.startGrinding(createdTicket.id, technician, { etaMinutes: 30 });
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        matrixCategory === 'DEFECT_SCRAP' ? 'DEFECT_SCRAP' : 'REPAIR',
        partName,
        day,
        resolvedQty
      );
      const calcLaborMinutes = Math.round(resolvedLaborHours * 60);
      storageService.recordRegrind({
        lineId: resolvedLineId,
        lineLastUsed: resolvedLineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        quantity: resolvedQty,
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
        laborHours: resolvedLaborHours,
        laborTimeMinutes: calcLaborMinutes,
        sparePartsUsed,
        sparePartsCost,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
        defectReason: resolvedDefectReason,
        note: remarks || (isEnglish ? `Started grinding immediately by ${technician}` : `เริ่มดำเนินการเจียรทันที (In-Process) โดยช่าง ${technician}`),
        status: 'REGRINDING'
      });
      const latest = regrindService.getQueueTickets().find(t => t.id === createdTicket.id);
      onSaved(
        isEnglish
          ? `⚡ Created & started grinding ${createdTicket.jobCode} (${partName}) — Status: Grinding`
          : `⚡ บันทึกและเริ่มเจียร ${createdTicket.jobCode} (${partName}) ทันทีเรียบร้อยแล้ว (สถานะ: กำลังเจียร)`,
        latest || createdTicket
      );
    } else {
      regrindService.incrementDailyMatrixCount(
        year,
        month,
        matrixCategory === 'DEFECT_SCRAP' ? 'DEFECT_SCRAP' : 'REPAIR',
        partName,
        day,
        resolvedQty
      );
      const calcLaborMinutes = Math.round(resolvedLaborHours * 60);
      storageService.recordRegrind({
        lineId: resolvedLineId,
        lineLastUsed: resolvedLineId,
        dieCode,
        finDie: dieCode,
        partCode,
        partName,
        partInstanceOrLot: serialOrLot,
        quantity: resolvedQty,
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
        laborHours: resolvedLaborHours,
        laborTimeMinutes: calcLaborMinutes,
        sparePartsUsed,
        sparePartsCost,
        surfaceRoughnessRa: 0.12,
        hardnessHrc: 63.0,
        inspectionResult: 'PENDING',
        inspectionStatus: 'PENDING',
        performedBy: technician,
        regrindDate: scheduledDate,
        defectReason: resolvedDefectReason,
        note: remarks || (isEnglish ? `Queued for grinding (${scheduledDate})` : `ลงคิวงานเจียร กำหนดส่ง ${scheduledDate}`),
        status: 'WAITING REGRIND'
      });
      onSaved(
        isEmergency
          ? (isEnglish
              ? `🚨 Urgent ticket ${createdTicket.jobCode} (${partName}) inserted at Queue #1`
              : `🚨 บันทึกงานด่วน ${createdTicket.jobCode} (${partName}) แทรกคิว #1 เรียบร้อย`)
          : (isEnglish
              ? `✅ Queued regrind ticket ${createdTicket.jobCode} (${partName})`
              : `✅ บันทึกงานเจียร ${createdTicket.jobCode} (${partName}) เรียบร้อย`),
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
        } rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[98vh] flex flex-col overflow-hidden text-slate-200 shadow-2xl animate-scaleIn`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sleek Header (Fixed Top - Compact) */}
        <div
          className={`shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 border-b flex items-center justify-between gap-3 ${
            isEmergency
              ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border-rose-500/30'
              : 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border-cyan-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-xl border ${
                isEmergency
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              }`}
            >
              {isEmergency ? <Flame className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" /> : <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-white">
                  {existingTicket
                    ? (isEnglish ? `Edit Regrind Ticket (${existingTicket.jobCode})` : `แก้ไขใบงานเจียร (${existingTicket.jobCode})`)
                    : (isEnglish ? 'Create Regrind Job & Queue Entry' : 'บันทึกงานเจียระไน & จัดคิวชิ้นงาน')}
                </h3>
                <span
                  className={`text-[10px] sm:text-[11px] px-2 py-0.2 rounded-full font-bold ${
                    isEmergency
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isEmergency
                    ? (isEnglish ? '🚨 Urgent #1' : '🚨 คิวด่วน #1')
                    : (isEnglish ? '🟢 Normal Queue' : '🟢 คิวปกติ')}
                </span>
                <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-bold border border-white/10">
                  {lineId ? `LINE ${lineId}` : isEnglish ? 'LINE —' : 'รอเลือกไลน์'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowQuickGuide(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border whitespace-nowrap shrink-0 ${
                showQuickGuide
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-cyan-500/35'
              }`}
              title={isEnglish ? 'Entry Guide & Mistake Prevention' : 'คำแนะนำการลงข้อมูลให้ถูกต้อง'}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{isEnglish ? 'Guide' : 'คู่มือลงข้อมูล'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title={isEnglish ? 'Close' : 'ปิดหน้าต่าง (Close)'}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Live Quick Guide Banner (Non-destructive to entered form inputs) */}
        {showQuickGuide && (
          <div className="shrink-0 px-3.5 sm:px-5 py-2.5 bg-slate-950 border-b border-cyan-500/30 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  {isEnglish
                    ? `Live Entry Checkpoints${partName ? ` for ${partName}` : ''}${lineId ? ` (LINE ${lineId})` : ''}`
                    : `เช็กลิสต์ลงข้อมูลไม่ให้ผิดพลาด${partName ? `สำหรับ ${partName}` : ''}${lineId ? ` (LINE ${lineId})` : ''}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenFullGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickGuide(false);
                      onClose();
                      onOpenFullGuide();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isEnglish ? 'Open Full User Guide →' : 'เปิดหน้าคู่มือฉบับเต็ม →'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowQuickGuide(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isEnglish ? 'Hide' : 'ซ่อน'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-[#0b101b] border border-white/10 space-y-0.5">
                <div className="font-bold text-amber-300">
                  {isEnglish ? '1. Grind Depth ≠ Final Height' : '1. อย่าใส่ความสูงหลังเจียรในช่อง "จะเจียรลง"'}
                </div>
                <p className="text-slate-300 font-mono tabular-nums">
                  {isNonRegrindablePart
                    ? (isEnglish
                        ? 'This part is Non-Regrindable (Dispose after 1 use) → use 🗑️ Scrap.'
                        : 'พาร์ทนี้ห้ามเจียรซ้ำ (Dispose after 1 use) → กด "🗑️ คัดทิ้ง" เท่านั้น')
                    : (isEnglish
                        ? `Enter removal only (Std ${stdGrindMin.toFixed(2)}–${stdGrindMax.toFixed(2)} mm). Min Spec: ${minAllowedLengthMm.toFixed(2)} mm.`
                        : `กรอกเฉพาะระยะปาดออก (Std ${stdGrindMin.toFixed(2)}–${stdGrindMax.toFixed(2)} mm) · ห้ามต่ำกว่า ${minAllowedLengthMm.toFixed(2)} mm`)}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-[#0b101b] border border-white/10 space-y-0.5">
                <div className="font-bold text-cyan-300">
                  {isEnglish ? '2. Select Line First & Check Unit' : '2. เลือกลายน์ก่อน & เช็กหน่วย นาที/ชม.'}
                </div>
                <p className="text-slate-300">
                  {isEnglish
                    ? 'Confirm Line (E1–E5) and Qty before picking the part; switch Min/Hr before typing labor time.'
                    : 'ตรวจสอบไลน์ (E1–E5) และจำนวนชิ้นจริงก่อนเลือกพาร์ท และกดสลับ นาที/ชม. ให้ตรงก่อนพิมพ์เวลา'}
                </p>
              </div>

              <div className="p-2 rounded-lg bg-[#0b101b] border border-white/10 space-y-0.5">
                <div className="font-bold text-emerald-300">
                  {isEnglish ? '3. Queue vs Start vs Scrap' : '3. เลือกปุ่มบันทึกให้ตรงหน้างาน'}
                </div>
                <p className="text-slate-300">
                  {isEnglish
                    ? 'Add to Queue = schedule later · Start Now = on grinder now · Scrap = below Scrap Limit.'
                    : 'ลงคิวรอ = วางแผนคิว · เริ่มเจียรทันที = กำลังเจียรบนเครื่อง · คัดทิ้ง = ต่ำกว่า Min Spec'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Form Body (Compact Fit) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-2.5 sm:p-3 pb-3 space-y-2 custom-scrollbar text-xs">
          {/* Required Field Color Legend & Completion Counter */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/10 flex items-center justify-between gap-3 flex-wrap text-[11px]">
            <div className="flex items-center gap-4 flex-wrap text-slate-300">
              <span className="font-bold text-white">
                {isEnglish ? 'Required Fields Guide:' : 'สถานะสีช่องที่จำเป็นต้องกรอก:'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-500/30 border border-slate-400/60 inline-block" />
                <span>{isEnglish ? 'Soft Gray = Unfilled' : 'สีเทาจาง = ยังไม่ได้กรอก'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-400/25 border border-emerald-400/70 inline-block" />
                <span className="text-emerald-200">{isEnglish ? 'Soft Green = Filled' : 'สีเขียวสว่าง = กรอกครบแล้ว'}</span>
              </span>
            </div>
            <span
              className={`font-mono tabular-nums font-black ${
                filledRequiredCount === totalRequiredCount ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {filledRequiredCount} / {totalRequiredCount} {isEnglish ? 'complete' : 'ช่องครบแล้ว'}
            </span>
          </div>

          {/* Inline Validation Alert Banner (replaces browser alert) */}
          {validationErrors.length > 0 && (
            <div className="px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-100 text-xs flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {isEnglish
                      ? 'Please fill in all required soft-gray fields before saving:'
                      : 'กรุณากรอกช่องบังคับที่ยังเป็นสีเทาจางให้ครบก่อนบันทึก:'}
                  </div>
                  <div className="text-[11px] text-rose-200 mt-0.5">
                    {validationErrors.join(' · ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValidationErrors([])}
                className="p-0.5 text-rose-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Grid Wrapper: 2 Columns for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
            
            {/* LEFT COLUMN: Inputs (7/12 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-start space-y-2">
              
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
                  <span>{isEnglish ? '🟢 Normal Queue' : '🟢 คิวปกติ (Normal Queue)'}</span>
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
                  <span>{isEnglish ? '🚨 Urgent #1 (Emergency)' : '🚨 คิวด่วน #1 (Urgent Emergency)'}</span>
                </button>
              </div>

              {/* Same-day existing queues preview (if any) */}
              {dayExistingTickets.length > 0 && !existingTicket && (
                <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 space-y-1 text-xs shrink-0">
                  <span className="text-slate-300 font-bold block flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                    {isEnglish
                      ? `Scheduled on ${scheduledDate} (${dayExistingTickets.length} jobs):`
                      : `คิววันที่ ${scheduledDate} (${dayExistingTickets.length} คิว):`}
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
                    <label className="block text-slate-100 font-extrabold mb-1 text-[11px] sm:text-xs">
                      {isEnglish ? '📅 Date' : '📅 วันที่'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      min="2025-01-01"
                      value={scheduledDate || ''}
                      onChange={e => {
                        setScheduledDate(e.target.value);
                        setValidationErrors([]);
                      }}
                      className={`w-full px-2 py-1.5 border-2 rounded-lg font-mono font-bold text-xs sm:text-[13px] focus:outline-none transition-colors ${
                        isBefore2025
                          ? 'bg-rose-500/15 border-rose-500 text-rose-200'
                          : isDateFilled
                          ? FILLED_FIELD_CLS
                          : UNFILLED_FIELD_CLS
                      }`}
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-slate-100 font-extrabold mb-1 text-[11px] sm:text-xs">
                      {isEnglish ? '🏭 Line' : '🏭 ไลน์'} <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={lineId}
                      onChange={e => handleLineChange(e.target.value as ProductionLineId | '')}
                      className={`w-full px-2 py-1.5 border-2 rounded-lg font-black text-xs sm:text-[13px] focus:outline-none cursor-pointer transition-colors ${
                        isLineFilled ? FILLED_FIELD_CLS : UNFILLED_FIELD_CLS
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-slate-300">
                        {isEnglish ? '-- Select Line --' : '-- เลือกไลน์ --'}
                      </option>
                      {LINES_LIST.map(l => (
                        <option key={l} value={l} className="bg-slate-900 text-white">
                          LINE {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-slate-400 font-bold mb-1 text-[11px] sm:text-xs">
                      {isEnglish ? '🔧 Die Code' : '🔧 แม่พิมพ์'}
                    </label>
                    <input
                      type="text"
                      value={dieCode || '—'}
                      readOnly
                      className="w-full px-2.5 py-1.5 bg-slate-900/75 border border-white/10 rounded-lg text-slate-400 font-mono text-xs sm:text-[13px] font-bold"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-slate-100 font-extrabold mb-1 text-[11px] sm:text-xs">
                      {isEnglish ? '🔢 Qty (Pcs)' : '🔢 จำนวน'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantityInput}
                      placeholder={isEnglish ? 'Enter qty' : 'ระบุจำนวน'}
                      onChange={e => {
                        setQuantityInput(e.target.value);
                        setValidationErrors([]);
                      }}
                      className={`w-full px-2 py-1.5 border-2 rounded-lg font-mono font-black text-xs sm:text-[13px] text-center focus:outline-none transition-colors ${
                        isQtyFilled ? FILLED_FIELD_CLS : UNFILLED_FIELD_CLS
                      }`}
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
                    label={isEnglish ? 'Select Die Tooling Part (Part Name & Line)' : 'เลือกชื่อรายการชิ้นงาน / อะไหล่ทูลลิ่ง'}
                    accentColor={isEmergency ? 'rose' : 'cyan'}
                    allowEmptySelection={!existingTicket}
                    fieldState={isPartSelected ? 'filled' : 'unfilled'}
                    onSelectPart={item => applySelectedPartSpecs(item, lineId)}
                  />
                </div>

                {/* Comprehensive Part Master & Cost Details Card (Calm Read-Only Reference) */}
                <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-slate-950/85 border border-white/10 space-y-2 font-mono">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-slate-300 font-bold">
                    <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                      <span>📊</span>
                      <span>{isEnglish ? 'Part Master & Cost Specs (Read-Only)' : 'รายละเอียดชิ้นส่วนและต้นทุน (ดูอ้างอิง)'}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10 font-bold">
                      {lineId ? `LINE ${lineId}` : isEnglish ? 'Waiting Line' : 'รอเลือกไลน์'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'Line:' : 'ไลน์ (Line):'}
                      </span>
                      <span className="text-white font-black text-xs sm:text-[13px]">
                        {lineId ? `LINE ${lineId}` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'Qty:' : 'จำนวน (Qty):'}
                      </span>
                      <span className="text-amber-300 font-black text-xs sm:text-[13px] tabular-nums">
                        {isQtyFilled ? `${quantity} ${isEnglish ? 'pcs' : 'ชิ้น'}` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'New Price:' : 'ซื้อใหม่ (Price):'}
                      </span>
                      <span className="text-emerald-400 font-black text-xs sm:text-[13px] tabular-nums">
                        {isPartSelected ? `฿${(selectedPartCostMaster.newPurchasePrice || 12500).toLocaleString()}` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">Scrap Limit:</span>
                      <span className="text-rose-400 font-black text-xs sm:text-[13px] tabular-nums">
                        {isPartSelected ? `${minAllowedLengthMm.toFixed(2)} mm` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">Shot Life:</span>
                      <span className="text-slate-200 font-bold text-xs sm:text-[13px] tabular-nums">
                        {isPartSelected ? `${((selectedPartCostMaster.expectedNewToolLife || 15000000) / 1000000).toFixed(1)}M` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'Vendor:' : 'ผู้ผลิต:'}
                      </span>
                      <span className="text-slate-200 font-bold text-xs sm:text-[13px] truncate block">
                        {isPartSelected ? (selectedPartCostMaster.supplier || 'KISUNG') : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'New Spec:' : 'ใหม่ (Nom):'}
                      </span>
                      <span className="text-cyan-400 font-bold text-xs sm:text-[13px] tabular-nums">
                        {isPartSelected ? `${nominalLengthMm.toFixed(2)} mm` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'Current:' : 'ก่อนเจียร:'}
                      </span>
                      <span className="text-amber-400 font-bold text-xs sm:text-[13px] tabular-nums">
                        {isBeforeGrindFilled ? `${previousLengthMm.toFixed(2)} mm` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-900/70 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px] sm:text-[11px] font-medium leading-tight">
                        {isEnglish ? 'After Grind:' : 'หลังเจียร:'}
                      </span>
                      <span className="text-emerald-400 font-black text-xs sm:text-[13px] tabular-nums">
                        {isPartSelected ? `${resultLengthMm.toFixed(2)} mm` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{isEnglish ? 'Remaining Cycles:' : 'รอบเจียรที่เหลือ (Remaining Cycles):'}</span>
                    <span className="text-cyan-300 font-mono text-xs px-2.5 py-0.5 rounded bg-slate-900 border border-white/10 font-black tabular-nums">
                      {!isPartSelected
                        ? '—'
                        : isEnglish
                        ? `${remainingCycles} of ${maxRegrindAllowed} cycles`
                        : `${remainingCycles} ครั้ง (จาก ${maxRegrindAllowed} ครั้ง)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Past Date Info Indicator */}
              {isHistoricalPastDate && (
                <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isEnglish
                        ? `📅 Backdated Historical Entry (${scheduledDate})`
                        : `📅 ลงบันทึกข้อมูลย้อนหลัง (Historical Record) วันที่ ${scheduledDate}`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 font-mono">
                    {isEnglish ? 'Since Jan 2025 OK' : 'ย้อนหลัง Jan 2025 OK'}
                  </span>
                </div>
              )}

              {/* Alert if date is before Jan 2025 */}
              {isBefore2025 && (
                <div className="p-2 rounded-xl bg-rose-950/85 border border-rose-500/70 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isEnglish
                        ? 'Dates prior to Jan 2025 are not allowed'
                        : 'ไม่อนุญาตให้ลงวันที่ย้อนหลังเกิน Jan 2025'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduledDate('2025-01-01')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    {isEnglish ? 'Set to 2025-01-01' : 'ปรับเป็น 2025-01-01'}
                  </button>
                </div>
              )}

              {/* SECTION 3: ⚠️ DEFECT REASONS (Required) */}
              <div
                className={`p-2 sm:p-2.5 rounded-xl border-2 shrink-0 transition-colors ${
                  isDefectReasonFilled
                    ? 'bg-emerald-400/14 border-emerald-400/55'
                    : 'bg-slate-500/22 border-slate-400/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-slate-100 font-extrabold text-xs flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      {isEnglish
                        ? 'Regrind & Defect Reason'
                        : 'สาเหตุการส่งเจียร / สภาพปัญหา'}
                    </span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-[10.5px] font-bold ${
                      isDefectReasonFilled ? 'text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    {isDefectReasonFilled
                      ? isEnglish
                        ? 'Selected'
                        : 'เลือกแล้ว'
                      : isEnglish
                      ? 'Pick 1 reason'
                      : 'กรุณาเลือก 1 สาเหตุ'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {DEFECT_REASONS_LIST.map(item => {
                    const isSelected = defectReason === item.code;
                    const displayLabel = isEnglish ? item.labelEn : item.labelTh;
                    const displayDesc = isEnglish ? item.descEn : item.descTh;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setDefectReason(item.code);
                          setValidationErrors([]);
                        }}
                        className={`py-1.5 px-2 border rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-400/25 border-emerald-300 text-emerald-100 shadow-sm ring-1 ring-emerald-400/50 font-black'
                            : isDefectReasonFilled
                            ? 'bg-slate-900/70 border-white/10 text-slate-300 hover:border-slate-400 hover:text-white font-bold'
                            : 'bg-slate-600/30 border-slate-400/40 text-slate-100 hover:bg-slate-500/35 hover:border-slate-300/70 font-bold'
                        }`}
                        title={displayDesc}
                      >
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="text-[10px] sm:text-[11px] font-black leading-tight uppercase truncate">
                          {displayLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Free-form Custom Defect Reason / Additional Info Field (Optional - Dark Neutral) */}
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={customDefectReason}
                    onChange={e => setCustomDefectReason(e.target.value)}
                    placeholder={isEnglish ? '✍️ Optional: Enter custom defect condition notes...' : '✍️ (ไม่บังคับ) กรอกรายละเอียดสภาพปัญหาอื่นๆ เพิ่มเติม...'}
                    className="w-full px-2.5 py-1 bg-slate-900/80 border border-white/10 hover:border-slate-500 focus:border-cyan-400 rounded-lg text-white font-semibold text-xs placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* SECTION 4: 📝 REMARKS (Optional - Calm Dark Neutral) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 border border-white/10 space-y-1.5 shrink-0">
                <label className="block text-slate-300 font-bold text-xs leading-tight flex items-center gap-1.5">
                  <span>📝</span>
                  <span>{isEnglish ? 'Remarks / Work Instructions (Optional)' : 'หมายเหตุ / คำแนะนำเพิ่มเติม (ไม่บังคับ)'}</span>
                </label>
                <input
                  type="text"
                  value={remarks || ''}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder={isEnglish ? 'Enter work notes or select a quick preset below...' : 'พิมพ์บันทึกหมายเหตุ / รายละเอียดงานเพิ่มเติม (กรอกอิสระหรือกดเลือกข้อความด่วนด้านล่าง)...'}
                  className="w-full px-2.5 py-1 bg-slate-900/80 border border-white/10 hover:border-slate-500 focus:border-cyan-400 rounded-lg text-white font-semibold text-xs placeholder-slate-500 focus:outline-none transition-all"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {remarksPresets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRemarks(preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border cursor-pointer transition-all ${
                        remarks === preset
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                          : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Calculations & Remaining Data (5/12 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-start space-y-2">
              
              {/* SECTION 2: 📐 COMPLETE SPEC & REGRIND BREAKDOWN CALCULATOR */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-950/90 border border-white/15 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300 font-black text-sm">📐</span>
                    <h4 className="font-black text-white text-xs sm:text-sm leading-none">
                      {isEnglish ? 'Dimension & Grind Removal Spec' : 'การคำนวณสเปคมิติ & ระยะเจียร'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-slate-300 font-bold">{isEnglish ? 'Scrap Limit:' : 'Min Spec:'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 font-black border border-amber-500/35 tabular-nums">
                      {isPartSelected ? `${minAllowedLengthMm.toFixed(2)} mm` : '—'}
                    </span>
                  </div>
                </div>

                {/* 4 Interactive Spec Flow Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: New Spec (Read-Only) */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                      {isEnglish ? '1. New Spec L₀' : '1. สเปคงานใหม่'}
                    </span>
                    <div className="mt-1 flex items-baseline justify-between px-2.5 py-1 rounded-lg bg-slate-900/75 border border-white/10">
                      <span className="text-sm sm:text-base font-black text-slate-300 font-mono tabular-nums">
                        {isPartSelected ? nominalLengthMm.toFixed(2) : '—'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">mm</span>
                    </div>
                  </div>

                  {/* Card 2: Before Grind (Required) */}
                  <div
                    className={`p-2.5 rounded-xl border-2 flex flex-col justify-between transition-colors ${
                      isBeforeGrindFilled ? FILLED_FIELD_CLS : UNFILLED_FIELD_CLS
                    }`}
                  >
                    <label className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isBeforeGrindFilled ? 'bg-emerald-400' : 'bg-slate-400'} inline-block`} />
                      {isEnglish ? '2. Before Grind (mm)' : '2. ก่อนเจียร (mm)'}
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={previousLengthMm === 0 ? '' : previousLengthMm}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => handlePrevLengthChange(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded-lg font-mono text-sm sm:text-base font-black focus:outline-none text-center transition-colors ${
                          isBeforeGrindFilled
                            ? 'bg-emerald-500/15 border-emerald-400/50 text-white focus:border-emerald-300'
                            : 'bg-slate-600/30 border-slate-400/45 text-white placeholder-slate-300/75 focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card 3: Grind Depth (Required) */}
                  <div
                    className={`p-2.5 rounded-xl border-2 flex flex-col justify-between transition-colors ${
                      isGrindDepthOutOfRange
                        ? 'bg-amber-400/18 border-amber-400/80 text-white'
                        : isGrindDepthFilled
                        ? FILLED_FIELD_CLS
                        : UNFILLED_FIELD_CLS
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isGrindDepthOutOfRange
                              ? 'bg-amber-400'
                              : isGrindDepthFilled
                              ? 'bg-emerald-400'
                              : 'bg-slate-400'
                          } inline-block`}
                        />
                        {isEnglish ? '3. Grind Depth (mm)' : '3. จะเจียรลง (mm)'}
                        {!isNonRegrindablePart && <span className="text-rose-400">*</span>}
                      </label>
                      {!isNonRegrindablePart && stdGrindMin > 0 && (
                        <span className="text-[9.5px] font-mono text-cyan-300/90 font-bold">
                          Std: {Math.abs(stdGrindMin - stdGrindMax) > 1e-4 ? `${stdGrindMin.toFixed(2)}-${stdGrindMax.toFixed(2)}` : stdGrindMin.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={grindDepthInput}
                        placeholder={stdGrindMin > 0 ? stdGrindMin.toFixed(2) : '0.10'}
                        onFocus={e => e.target.select()}
                        onChange={e => handleGrindDepthChange(e.target.value)}
                        className={`w-full px-2.5 py-1 border rounded-lg font-mono text-sm sm:text-base font-black text-center focus:outline-none transition-colors ${
                          isGrindDepthOutOfRange
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : isGrindDepthFilled
                            ? 'bg-emerald-500/15 border-emerald-400/50 text-white focus:border-emerald-300'
                            : 'bg-slate-600/30 border-slate-400/45 text-white placeholder-slate-300/75 focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card 4: After Grind (Auto-calculated, Read-Only) */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-default select-none ${
                      isUnderMinLength
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'bg-slate-950 border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${isUnderMinLength ? 'bg-rose-400' : 'bg-cyan-400'} inline-block`} />
                        <span className={isUnderMinLength ? 'text-rose-300' : 'text-slate-300'}>
                          {isEnglish ? '4. After Grind (mm)' : '4. หลังเจียร (mm)'}
                        </span>
                      </span>
                      <span
                        className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-slate-400 whitespace-nowrap shrink-0"
                        title={isEnglish ? 'Auto-calculated from Before Grind - Grind Depth' : 'คำนวณอัตโนมัติจาก ก่อนเจียร - ระยะเจียรลง'}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        {isEnglish ? 'Auto' : 'คำนวณอัตโนมัติ'}
                      </span>
                    </div>
                    <div
                      aria-readonly="true"
                      className={`mt-1 flex items-baseline justify-between px-2.5 py-1 rounded-lg border ${
                        isUnderMinLength
                          ? 'bg-rose-950/40 border-rose-500/70'
                          : 'bg-slate-900/75 border-white/10'
                      }`}
                    >
                      <span
                        className={`text-sm sm:text-base font-black font-mono tabular-nums ${
                          isUnderMinLength ? 'text-rose-300' : 'text-cyan-300'
                        }`}
                      >
                        {isPartSelected ? resultLengthMm.toFixed(2) : '—'}
                      </span>
                      <span className={`text-[10px] font-bold font-mono ${isUnderMinLength ? 'text-rose-400/80' : 'text-slate-500'}`}>
                        mm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cycle Count & Remaining Grinds Summary Bar */}
                <div className="p-2.5 rounded-xl bg-slate-950/95 border border-white/15 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-bold">{isEnglish ? 'Cycle:' : 'รอบเจียร:'}</span>
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
                          &rarr; <strong className="text-cyan-300">{isEnglish ? `Cycle #${nextCycle}` : `รอบที่ ${nextCycle}`}</strong>/{maxRegrindAllowed}
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
                        {isEnglish ? 'Remaining:' : 'เหลือเจียร:'} <strong>{remainingCycles} {isEnglish ? 'cycles' : 'ครั้ง'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Usable Wear Life Gauge Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="font-bold">{isEnglish ? 'Remaining Usable Life' : 'อายุคงเหลือ (Usable Life)'}</span>
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

                {hasStandardSpecDeviation && currentPartSpec && (
                  <div className="p-2 rounded-xl bg-amber-950/75 border border-amber-500/60 text-amber-200 text-[11px] flex items-center justify-between gap-2">
                    <span className="leading-tight">
                      {isEnglish
                        ? `⚠️ Ticket specs (${nominalLengthMm.toFixed(2)} → ${minAllowedLengthMm.toFixed(2)} mm, Max ${maxRegrindAllowed}) differ from Standard (${currentPartSpec.nominalLengthMm.toFixed(2)} → ${currentPartSpec.minAllowedLengthMm.toFixed(2)} mm, Max ${currentPartSpec.maxRegrindCount})`
                        : `⚠️ สเปกในใบงาน (${nominalLengthMm.toFixed(2)} → ${minAllowedLengthMm.toFixed(2)} mm, Max ${maxRegrindAllowed}) ต่างจาก Standard (${currentPartSpec.nominalLengthMm.toFixed(2)} → ${currentPartSpec.minAllowedLengthMm.toFixed(2)} mm, Max ${currentPartSpec.maxRegrindCount})`}
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncToStandardSpec}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                    >
                      {isEnglish ? 'Sync to Standard' : 'อัปเดตตาม Standard'}
                    </button>
                  </div>
                )}

                {isGrindDepthOutOfRange && (
                  <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="leading-tight">
                      {isEnglish
                        ? `Grind depth ${grindDepthMm.toFixed(2)} mm is outside Standard range (${Math.abs(stdGrindMin - stdGrindMax) > 1e-4 ? `${stdGrindMin.toFixed(2)}–${stdGrindMax.toFixed(2)}` : stdGrindMin.toFixed(2)} mm/cycle)`
                        : `ระยะเจียรลง ${grindDepthMm.toFixed(2)} mm อยู่นอกเกณฑ์ Standard (${Math.abs(stdGrindMin - stdGrindMax) > 1e-4 ? `${stdGrindMin.toFixed(2)}–${stdGrindMax.toFixed(2)}` : stdGrindMin.toFixed(2)} mm/ครั้ง)`}
                    </span>
                  </div>
                )}

                {isNonRegrindablePart && (
                  <div className="p-2 rounded-xl bg-rose-950/85 border border-rose-500/70 text-rose-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-tight">
                      {isEnglish
                        ? `🚫 Standard marks this part Non-Regrindable (${currentPartSpec?.disposeAfterOneUse ? 'Dispose after 1 use' : 'No Regrind'}) — Recommend "🗑️ Scrap"`
                        : `🚫 Standard ระบุไม่ให้เจียรซ้ำ (${currentPartSpec?.disposeAfterOneUse ? 'Dispose after 1 use' : 'ไม่เจียรซ้ำ'}) — แนะนำกด "🗑️ คัดทิ้ง"`}
                    </span>
                  </div>
                )}

                {(isUnderMinLength || isOverMaxCycle) && !isNonRegrindablePart && (
                  <div className="p-2 rounded-xl bg-rose-950/90 border border-rose-500/70 text-rose-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-tight">
                      {isUnderMinLength
                        ? (isEnglish
                            ? `⚠️ SCRAP LIMIT: After-grind height ${resultLengthMm.toFixed(2)} mm < Min Spec ${minAllowedLengthMm.toFixed(2)} mm`
                            : `⚠️ สภาพชิ้นงาน: SCRAP (สูงหลังเจียร ${resultLengthMm.toFixed(2)} mm < สเปคขั้นต่ำ ${minAllowedLengthMm.toFixed(2)} mm)`)
                        : (isEnglish
                            ? `⚠️ Regrind cycle #${nextCycle} exceeds max limit (${maxRegrindAllowed} cycles)`
                            : `⚠️ รอบเจียรครั้งที่ ${nextCycle} เกินโควตาสูงสุด (${maxRegrindAllowed} ครั้ง)`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Integrated True Cost & Labor Time Calculator Block */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/95 border border-white/15 space-y-2 shrink-0">
                
                {/* Live Savings Summary Banner (Read-only summary) */}
                <div className="bg-slate-900/75 border border-white/10 rounded-xl p-2.5 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-black flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span>{isEnglish ? 'True Cost & Savings Engine' : 'คำนวณต้นทุนแท้จริง & ยอดประหยัด (True Cost & Savings)'}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded border font-black text-[11px] tabular-nums ${
                      isPartSelected && liveCostResult.step5NetCostSaving < 0
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isPartSelected
                        ? `${liveCostResult.step5SavingPercentage}% ${
                            liveCostResult.step5NetCostSaving < 0
                              ? (isEnglish ? 'Loss' : 'ขาดทุน')
                              : (isEnglish ? 'Saved' : 'ประหยัด')
                          }`
                        : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {isPartSelected && liveCostResult.step5NetCostSaving < 0
                          ? (isEnglish ? 'NET LOSS:' : 'ขาดทุนเทียบซื้อใหม่:')
                          : (isEnglish ? 'NET SAVING:' : 'ยอดประหยัดสุทธิ (NET SAVING):')}
                      </span>
                      <span className={`text-base font-black tabular-nums ${
                        isPartSelected && liveCostResult.step5NetCostSaving < 0 ? 'text-rose-400' : 'text-[#00FF7F]'
                      }`}>
                        {isPartSelected
                          ? (liveCostResult.step5NetCostSaving < 0
                              ? `-฿${Math.abs(liveCostResult.step5NetCostSaving).toLocaleString()}`
                              : `฿${liveCostResult.step5NetCostSaving.toLocaleString()}`)
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {isEnglish
                          ? `Total Grind Cost (${Math.max(1, quantity)} pcs):`
                          : `ต้นทุนเจียรรวม (${Math.max(1, quantity)} ชิ้น):`}
                      </span>
                      <span className="text-sm font-black text-cyan-300 tabular-nums">
                        {isPartSelected ? `฿${liveCostResult.step5GrandTotalJobCost.toLocaleString()}` : '—'}
                        {isPartSelected && (
                          <span className="text-[10px] font-normal text-slate-400 block">
                            ({isEnglish ? 'vs New' : 'เทียบซื้อใหม่'} ฿{liveCostResult.step5TotalNewToolEquivalentCost.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Labor Time & Tech Input Controls (Required) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-slate-100 font-extrabold text-[11px]">
                        {isEnglish
                          ? (laborTimeUnit === 'MINUTES' ? 'Grinding Time (min)' : 'Labor Hours (hr)')
                          : (laborTimeUnit === 'MINUTES' ? 'เวลาในการซ่อม (นาที)' : 'เวลาในการซ่อม (ชม.)')}
                        <span className="text-rose-400 ml-0.5">*</span>
                      </span>
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setLaborTimeUnit('MINUTES');
                            if (laborHours > 0) {
                              setLaborInput(String(Math.round(laborHours * 60)));
                            }
                          }}
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                            laborTimeUnit === 'MINUTES' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'
                          }`}
                        >
                          {isEnglish ? 'Min' : 'นาที'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLaborTimeUnit('HOURS');
                            if (laborHours > 0) {
                              setLaborInput(String(Number(laborHours.toFixed(2))));
                            }
                          }}
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold cursor-pointer ${
                            laborTimeUnit === 'HOURS' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'
                          }`}
                        >
                          {isEnglish ? 'Hr' : 'ชม.'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step={laborTimeUnit === 'MINUTES' ? '5' : '0.25'}
                        min="0"
                        value={laborInput}
                        placeholder={laborTimeUnit === 'MINUTES' ? '30' : '1.0'}
                        onChange={e => {
                          const raw = e.target.value;
                          setLaborInput(raw);
                          const val = parseFloat(raw);
                          const hrs = Number.isFinite(val) && val > 0 ? (laborTimeUnit === 'MINUTES' ? val / 60 : val) : 0;
                          setLaborHours(hrs);
                          setValidationErrors([]);
                        }}
                        className={`w-20 px-2 py-1 border-2 rounded-lg font-mono font-black text-xs text-center focus:outline-none transition-colors ${
                          isLaborFilled ? FILLED_FIELD_CLS : UNFILLED_FIELD_CLS
                        }`}
                      />
                      <span className="text-slate-300 font-mono text-[11px] font-bold">
                        {isEnglish ? (laborTimeUnit === 'MINUTES' ? 'min' : 'hr') : (laborTimeUnit === 'MINUTES' ? 'นาที' : 'ชม.')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-auto tabular-nums">
                        (= {laborHours.toFixed(2)} {isEnglish ? 'hr' : 'ชม.'})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-100 font-extrabold text-[11px] block mb-0.5">
                      {isEnglish ? 'Assigned Technician' : 'ช่างผู้รับผิดชอบ'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={technician}
                      onChange={e => {
                        setTechnician(e.target.value);
                        setValidationErrors([]);
                      }}
                      placeholder={isEnglish ? 'Enter technician name...' : 'ระบุชื่อช่าง...'}
                      className={`w-full px-2.5 py-1 border-2 rounded-lg font-bold text-xs focus:outline-none transition-colors ${
                        isTechFilled ? FILLED_FIELD_CLS : UNFILLED_FIELD_CLS
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Preset Time Buttons */}
                <div className="pt-1 border-t border-white/10 flex items-center gap-1 flex-wrap text-xs">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">{isEnglish ? 'Quick Select:' : 'เลือกด่วน:'}</span>
                  {(isEnglish
                    ? [
                        { label: '15m', hours: 0.25 },
                        { label: '30m', hours: 0.5 },
                        { label: '45m', hours: 0.75 },
                        { label: '1h', hours: 1.0 },
                        { label: '1.5h', hours: 1.5 },
                        { label: '2h', hours: 2.0 },
                      ]
                    : [
                        { label: '15 น.', hours: 0.25 },
                        { label: '30 น.', hours: 0.5 },
                        { label: '45 น.', hours: 0.75 },
                        { label: '1 ชม.', hours: 1.0 },
                        { label: '1.5 ชม.', hours: 1.5 },
                        { label: '2 ชม.', hours: 2.0 },
                      ]
                  ).map(p => {
                    const isMatch = isLaborFilled && Math.abs(laborHours - p.hours) < 0.01;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setLaborHours(p.hours);
                          setLaborInput(
                            laborTimeUnit === 'MINUTES'
                              ? String(Math.round(p.hours * 60))
                              : String(p.hours)
                          );
                          setValidationErrors([]);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all border ${
                          isMatch
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Collapsible 5-Step Detailed Cost Breakdown Table */}
                <div className="pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                    className="w-full py-1 px-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {showCostBreakdown
                          ? (isEnglish ? 'Hide 5-Step Cost Breakdown' : 'ซ่อนการแจกแจง 5 ขั้นตอน')
                          : (isEnglish ? 'Show 5-Step Cost Breakdown (Steps 1–5)' : 'ดูการแจกแจง 5 ขั้นตอนการคำนวณ (Step 1-5 Breakdown)')}
                      </span>
                    </span>
                    {showCostBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showCostBreakdown && (
                    <div className="mt-2 bg-slate-950 p-2 rounded-xl border border-cyan-500/30 font-mono text-[10.5px] space-y-1.5 animate-fadeIn">
                      <div className="grid grid-cols-12 gap-1 text-slate-400 font-bold border-b border-white/10 pb-1">
                        <span className="col-span-8">{isEnglish ? 'Cost Calculation Step' : 'ขั้นตอนคำนวณต้นทุน'}</span>
                        <span className="col-span-4 text-right">{isEnglish ? 'Amount (THB)' : 'จำนวนเงิน (THB)'}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 text-slate-300">
                        <span className="col-span-8 truncate">
                          {isEnglish ? `Step 1: Machine & Power (${laborHours} hr)` : `Step 1: เครื่องจักร & ไฟฟ้า (${laborHours} ชม.)`}
                        </span>
                        <span className="col-span-4 text-right text-cyan-300 font-bold">฿{liveCostResult.step1TotalMachineAndPower.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 text-slate-300">
                        <span className="col-span-8 truncate">
                          {isEnglish ? 'Step 2: Operator Labor, OT & Skill' : 'Step 2: ค่าแรงช่าง, OT & ค่าสกิล'}
                        </span>
                        <span className="col-span-4 text-right text-purple-300 font-bold">฿{liveCostResult.step2TotalLaborCost.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 text-slate-300">
                        <span className="col-span-8 truncate">
                          {isEnglish ? 'Step 3: CBN Wheel & Consumables' : 'Step 3: หินเจียร & วัสดุสิ้นเปลือง'}
                        </span>
                        <span className="col-span-4 text-right text-amber-300 font-bold">฿{liveCostResult.step3TotalConsumables.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 text-slate-300">
                        <span className="col-span-8 truncate">
                          {isEnglish ? 'Step 4: QC & Workshop Utilities' : 'Step 4: ตรวจ QC & ส่วนกลางโรงซ่อม'}
                        </span>
                        <span className="col-span-4 text-right text-blue-300 font-bold">฿{liveCostResult.step4TotalQcAndOverhead.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1 text-white font-bold pt-1 border-t border-white/10">
                        <span className="col-span-8">{isEnglish ? 'Total True Regrind Cost' : 'รวมต้นทุนเจียรจริงสุทธิ'}</span>
                        <span className="col-span-4 text-right text-emerald-400 font-black">฿{liveCostResult.step5GrandTotalJobCost.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Emergency Settings (if isEmergency === true) */}
              {isEmergency && (
                <div className="p-2 rounded-xl bg-rose-950/35 border-2 border-rose-500/50 space-y-1 animate-fadeIn text-xs shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer leading-tight">
                    <input
                      type="checkbox"
                      checked={preemptActiveJob}
                      onChange={e => setPreemptActiveJob(e.target.checked)}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="text-rose-200 font-extrabold text-xs">
                      {isEnglish ? '⚡ Preempt Active Job as Queue #1' : '⚡ แทรกเป็นคิว #1 ทันที (Preempt Active Job)'}
                    </span>
                  </label>
                </div>
              )}

              {/* SECTION 5: 📸 REAL WORKPIECE EVIDENCE PHOTOS (Optional - Calm Dark Neutral) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 border border-white/10 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between border-b border-white/10 pb-1 flex-wrap gap-1">
                  <label className="text-slate-300 font-bold text-xs leading-tight flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isEnglish ? '📸 Workpiece Evidence Photos (Optional)' : '📸 แนบรูปภาพประกอบงานเจียรจริง (ไม่บังคับ)'}</span>
                  </label>
                  <label className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/35 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95">
                    <Upload className="w-3 h-3" />
                    <span>{isEnglish ? 'Attach Photo' : 'แนบรูปงานจริง'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Photos Preview Grid */}
                {workpiecePhotos.length === 0 ? (
                  <div className="border border-dashed border-slate-800 hover:border-slate-600 rounded-xl py-2 px-3 text-center bg-slate-900/40 flex items-center justify-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <p className="text-[10.5px] text-slate-400">
                      {isEnglish
                        ? 'No photos attached yet (click "Attach Photo" to upload inspection evidence)'
                        : 'ยังไม่มีรูปแนบ (กด "แนบรูปงานจริง" เพื่อเพิ่มภาพถ่ายสภาพชิ้นงาน)'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {workpiecePhotos.map((photoUrl, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/15 h-16 bg-slate-900">
                        <img src={photoUrl} alt={`Workpiece ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-0.5 left-0.5 px-1 bg-emerald-500 text-slate-950 font-black text-[8px] rounded shadow">
                            {isEnglish ? 'Primary' : 'รูปหลัก'}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setZoomedPhotoUrl(photoUrl)}
                            className="p-1 bg-cyan-500 text-slate-950 rounded hover:scale-110 cursor-pointer"
                            title={isEnglish ? 'Zoom Photo' : 'ขยายดูรูปใหญ่'}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="p-1 bg-rose-500 text-white rounded hover:scale-110 cursor-pointer"
                            title={isEnglish ? 'Remove Photo' : 'ลบรูป'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </form>

        {/* Action Footer (Fixed at Bottom of Modal - Compact) */}
        <div className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 border-t border-white/15 bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
            <span>{isEnglish ? 'After Grind:' : 'หลังเจียร:'}</span>
            <strong className={`text-base font-black tabular-nums ${isUnderMinLength ? 'text-rose-400' : 'text-emerald-300'}`}>
              {isPartSelected ? `${resultLengthMm.toFixed(2)} mm` : '—'}
            </strong>
            {isUnderMinLength && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-sans">
                {isEnglish ? '⚠️ Below Min Spec' : '⚠️ ต่ำกว่าสเปค'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors border border-white/10 whitespace-nowrap"
            >
              {isEnglish ? 'Cancel' : 'ยกเลิก'}
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('QUEUE_TICKET');
                executeSubmit('QUEUE_TICKET');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-cyan-500/40 bg-slate-900/90 hover:bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 transition-all active:scale-95 shadow-sm whitespace-nowrap"
              title={isEnglish ? 'Save to Regrind Queue' : 'บันทึกเข้าคิวงาน'}
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>{existingTicket ? (isEnglish ? 'Save Changes' : 'บันทึกแก้ไข') : (isEnglish ? '⏳ Add to Queue' : '⏳ ลงคิวรอ')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('START_NOW');
                executeSubmit('START_NOW');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-300 text-slate-950 shadow-emerald-500/30 transition-all active:scale-95 whitespace-nowrap"
              title={isEnglish ? 'Save & Start Grinding Immediately' : 'บันทึกและเริ่มเจียรทันที'}
            >
              <Play className="w-3 h-3 fill-slate-950 text-slate-950" />
              <span>{isEnglish ? '⚡ Start Now' : '⚡ เริ่มเจียรทันที'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExecutionMode('SCRAP_NOW');
                executeSubmit('SCRAP_NOW');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/40 transition-all active:scale-95 whitespace-nowrap"
              title={isEnglish ? 'Record as Scrapped (Scrap Limit)' : 'บันทึกคัดทิ้ง (Scrap)'}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isEnglish ? '🗑️ Scrap' : '🗑️ คัดทิ้ง'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zoomed Photo Modal Overlay */}
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedPhotoUrl(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-950 border border-white/20 rounded-2xl p-2 flex flex-col items-center shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all cursor-pointer z-10"
              title={isEnglish ? 'Close Preview' : 'ปิดภาพขยาย'}
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomedPhotoUrl} alt={isEnglish ? 'Workpiece preview' : 'รูปงานจริงขยาย'} className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <span className="mt-2 text-xs font-mono text-cyan-300 font-bold">
              {isEnglish ? '📸 Real Workpiece Evidence Photo' : '📸 รูปถ่ายสภาพงานจริงก่อน-หลังเจียร (Real Workpiece Evidence)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
