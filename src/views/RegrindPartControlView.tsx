import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Sliders, 
  FileText, 
  Download, 
  Search, 
  Check, 
  X, 
  Eye, 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles,
  ShieldAlert,
  Layers,
  Wrench,
  Calendar,
  Filter,
  DollarSign,
  BarChart3,
  Flame,
  Clock,
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ProductionLineId, 
  RegrindingRecord, 
  RegrindMasterStandard, 
  RegrindPartStatus,
  LINE_INFO_MAP 
} from '../types';
import { storageService } from '../services/storageService';
import { regrindService } from '../services/regrindService';
import { safeStorage } from '../services/safeStorage';
import { useLanguage, useTranslation } from '../i18n';
import { DateRangeFilter, isDateInSelectedRange } from '../components/common/DateRangeFilter';
import { exportRegrindingHistoryExcel } from '../utils/excelExport';
import { Excel31DayMatrixView } from './regrinding/Excel31DayMatrixView';
import { SmartQueueAndCalendarScheduleView } from './regrinding/SmartQueueAndCalendarScheduleView';
import { MonthlyCalendarMatrix, RegrindWorkTicket } from '../types/regrind';
import { InteractiveDailyTrendChart } from '../components/charts/InteractiveDailyTrendChart';
import { LineFilteredPartCombobox } from '../components/common/LineFilteredPartCombobox';
import { UnifiedRegrindJobModal } from '../components/modals/UnifiedRegrindJobModal';

const DEFAULT_TECHNICIANS: string[] = [
  'Thanakorn Phonpayung'
];

const DEFAULT_REMARKS_PRESETS: string[] = [
  'ลับคมด้วยหิน CBN เบอร์ #400 ตรวจเช็คผิวเรียบปกติ',
  'เจียรปาดหน้าพร้อมขัดเงา Surface Ra <= 0.1um',
  'เปลี่ยนชิมรองความสูง +0.10 mm ชดเชยระยะเจียร',
  'ลับคมตามรอบ PM ประจำเดือน ตรวจสอบ QC ผ่าน'
];

const loadSavedTechnicians = (): string[] => {
  try {
    const raw = safeStorage.getItem('regrind_technicians_memory');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any unwanted mock names if previously stored
        const filtered = parsed.filter((n: string) => n && n !== 'Somnit Kottong' && n !== 'Anan Boonrod' && n !== 'Nattawut Srisuk' && n !== 'Tooling Workshop Team');
        return Array.from(new Set([...DEFAULT_TECHNICIANS, ...filtered]));
      }
    }
  } catch (_) {}
  return DEFAULT_TECHNICIANS;
};

const saveTechnicianMemory = (name: string) => {
  if (!name || !name.trim()) return;
  try {
    const current = loadSavedTechnicians();
    const updated = Array.from(new Set([name.trim(), ...current])).slice(0, 15);
    safeStorage.setItem('regrind_technicians_memory', JSON.stringify(updated));
  } catch (_) {}
};

const loadSavedRemarks = (): string[] => {
  try {
    const raw = safeStorage.getItem('regrind_remarks_memory');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_REMARKS_PRESETS, ...parsed]));
      }
    }
  } catch (_) {}
  return DEFAULT_REMARKS_PRESETS;
};

const saveRemarksMemory = (text: string) => {
  if (!text || !text.trim() || text.length < 3) return;
  try {
    const current = loadSavedRemarks();
    const updated = Array.from(new Set([text.trim(), ...current])).slice(0, 15);
    safeStorage.setItem('regrind_remarks_memory', JSON.stringify(updated));
  } catch (_) {}
};

export type RegrindMainTab = 
  | 'smart-queue-calendar'
  | 'regrind-calendar' 
  | 'scrap-calendar' 
  | 'unified-logs'
  // Backward compatibility:
  | 'entry-standards'
  | 'data-entry' 
  | 'standards' 
  | 'queue-matrix'
  | 'calendar-charts'
  | 'ready-stock'
  | 'scrapped-parts'
  | 'regrind-logs';

interface RegrindPartControlViewProps {
  initialTab?: RegrindMainTab;
  initialLineId?: ProductionLineId;
  onNavigate?: (route: string, lineId?: ProductionLineId) => void;
}

export const RegrindPartControlView: React.FC<RegrindPartControlViewProps> = ({
  initialTab = 'regrind-calendar',
  initialLineId = 'E1',
  onNavigate
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  const resolveTab = (t: string): 'regrind-calendar' | 'scrap-calendar' => {
    if (t === 'scrapped-parts' || t === 'scrap-calendar') return 'scrap-calendar';
    return 'regrind-calendar';
  };

  const [activeTab, setActiveTab] = useState<'regrind-calendar' | 'scrap-calendar'>(resolveTab(initialTab));
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  // Sub-toggle inside Tab 1: Form only (Queue is in SmartQueueAndCalendarScheduleView, Standards is in UnifiedToolingMasterView)
  const [entrySubTab, setEntrySubTab] = useState<'form' | 'in-progress-queue' | 'standards'>('form');

  // Core Data
  const [standards, setStandards] = useState<RegrindMasterStandard[]>([]);
  const [historyRecords, setHistoryRecords] = useState<RegrindingRecord[]>([]);
  const [queueTickets, setQueueTickets] = useState<RegrindWorkTicket[]>(() => regrindService.getQueueTickets());
  const [currentUser, setCurrentUser] = useState(storageService.getCurrentUser());

  // Reschedule & Snooze Modal State for Overdue / In-Progress Tickets
  const [rescheduleModalTicket, setRescheduleModalTicket] = useState<RegrindWorkTicket | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('รอเบิกหินเจียร CBN เบอร์พิเศษ');
  const [rescheduleCustomReason, setRescheduleCustomReason] = useState<string>('');
  const [queueSearch, setQueueSearch] = useState<string>('');
  const [queueLineFilter, setQueueLineFilter] = useState<string>('ALL');

  // Form Fields for Data Entry
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>(initialLineId);
  const [selectedPartCode, setSelectedPartCode] = useState<string>('FD-P7-BURR');
  const [partInstanceOrLot, setPartInstanceOrLot] = useState<string>('');
  const [dieCode, setDieCode] = useState<string>('FD-E1-07');
  const [previousLength, setPreviousLength] = useState<number>(70.00);
  const [actualGrindingRemovedMm, setActualGrindingRemovedMm] = useState<number>(0.25);
  const [currentLength, setCurrentLength] = useState<number>(69.75);
  const [regrindCountBefore, setRegrindCountBefore] = useState<number>(0);
  const [supplierOrInternalProcess, setSupplierOrInternalProcess] = useState<'INTERNAL_TOOL_ROOM' | 'EXTERNAL_VENDOR'>('INTERNAL_TOOL_ROOM');
  const [vendorName, setVendorName] = useState<string>('Internal Fin Die Tool Room (In-House)');
  const [workOrder, setWorkOrder] = useState<string>('');
  const [cost, setCost] = useState<number>(2500);
  const [measuredRa, setMeasuredRa] = useState<number>(0.12);
  const [hardnessHrc, setHardnessHrc] = useState<number>(63.0);
  const [inspectionResult, setInspectionResult] = useState<'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL'>('PASSED');
  const [technicianList, setTechnicianList] = useState<string[]>(loadSavedTechnicians);
  const [remarksList, setRemarksList] = useState<string[]>(loadSavedRemarks);
  const [performedBy, setPerformedBy] = useState<string>('Thanakorn Phonpayung');
  const [regrindDate, setRegrindDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [note, setNote] = useState<string>('ลับคมด้วยหิน CBN เบอร์ #400 ตรวจเช็คผิวเรียบปกติ');

  // Filters for Unified Master Logs
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableToolFilter, setTableToolFilter] = useState<string>('ALL');
  const [tableOperatorFilter, setTableOperatorFilter] = useState<string>('ALL');
  const [tableLineFilter, setTableLineFilter] = useState<string>('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [tablePageSize, setTablePageSize] = useState<number>(20);

  // Filters for Standards Table
  const [standardSearch, setStandardSearch] = useState<string>('');
  const [standardFilterCategory, setStandardFilterCategory] = useState<string>('ALL');

  // Modals state for Standards & Inspection
  const [editingStandard, setEditingStandard] = useState<RegrindMasterStandard | null>(null);
  const [isAddStandardModalOpen, setIsAddStandardModalOpen] = useState<boolean>(false);
  const [newStandardForm, setNewStandardForm] = useState<Partial<RegrindMasterStandard>>({
    partCode: '',
    partName: '',
    nominalLengthMm: 70.0,
    grindingAmountPerTimeMm: 0.20,
    totalGrindingAllowanceMm: 4.0,
    maxRegrindCount: 5,
    minAllowedLengthMm: 65.0,
    regrindAllowed: true,
    disposeAfterOneUse: false,
    tubeSizeCompat: 'Ø7',
    category: 'PUNCH'
  });

  const [inspectModalRecord, setInspectModalRecord] = useState<RegrindingRecord | null>(null);

  // Calendar Matrix State
  const [matrix, setMatrix] = useState<MonthlyCalendarMatrix>(() => {
    const now = new Date();
    return regrindService.getMonthlyMatrix(now.getFullYear(), now.getMonth() + 1);
  });
  const [hoveredRepairDay, setHoveredRepairDay] = useState<number | null>(null);
  const [hoveredScrapDay, setHoveredScrapDay] = useState<number | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const linesList: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  const reloadData = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    setStandards(storageService.getRegrindMasterStandards());
    setHistoryRecords(storageService.getRegrindRecords());
    setQueueTickets(regrindService.getQueueTickets());
    setCurrentUser(storageService.getCurrentUser());
    setMatrix(regrindService.getMonthlyMatrix(matrix.year || curYear, matrix.month || curMonth));
  };

  useEffect(() => {
    // Force reset to current month on tab switch
    const now = new Date();
    setMatrix(regrindService.getMonthlyMatrix(now.getFullYear(), now.getMonth() + 1));
    reloadData();
    const unsub = storageService.subscribe(reloadData);
    const unsubRegrind = regrindService.subscribe(reloadData);
    return () => {
      unsub();
      unsubRegrind();
    };
  }, [initialTab]);

  // Set default nominals when part code changes
  useEffect(() => {
    const std = standards.find(s => s.partCode === selectedPartCode);
    if (std) {
      const nom = std.nominalLengthMm || 70.0;
      const grindAmt = std.grindingAmountPerTimeMm || 0.20;
      setPreviousLength(nom);
      setActualGrindingRemovedMm(grindAmt);
      setCurrentLength(Number((nom - grindAmt).toFixed(3)));
      setPartInstanceOrLot(`LOT-${selectedPartCode.replace(/[^A-Za-z0-9]/g, '')}-01`);
      if (!workOrder) {
        setWorkOrder(`WO-RGD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      }
    }
  }, [selectedPartCode, standards]);

  const handlePreviousLengthChange = (val: number) => {
    setPreviousLength(val);
    setCurrentLength(Number((val - actualGrindingRemovedMm).toFixed(3)));
  };

  const handleActualRemovedChange = (val: number) => {
    setActualGrindingRemovedMm(val);
    setCurrentLength(Number((previousLength - val).toFixed(3)));
  };

  const handleCurrentLengthChange = (val: number) => {
    setCurrentLength(val);
    setActualGrindingRemovedMm(Number((previousLength - val).toFixed(3)));
  };

  const selectedStandard: RegrindMasterStandard | undefined = standards.find(s => s.partCode === selectedPartCode);

  // Live Calculations & Tolerance Rules
  const calculatedNextCycle = regrindCountBefore + 1;
  const maxCycles = selectedStandard?.maxRegrindCount || 4;
  const remainingCycles = Math.max(0, maxCycles - calculatedNextCycle);
  const minAllowedLength = selectedStandard?.minAllowedLengthMm || (selectedStandard ? selectedStandard.nominalLengthMm - selectedStandard.totalGrindingAllowanceMm : 64.0);
  const isLengthOutOfSpec = currentLength < minAllowedLength;
  const isMaxCyclesReached = calculatedNextCycle >= maxCycles;
  const isRegrindBlocked = selectedStandard && (!selectedStandard.regrindAllowed || selectedStandard.disposeAfterOneUse);

  let previewStatus: RegrindPartStatus = 'WAITING REGRIND';
  if (isLengthOutOfSpec) {
    previewStatus = 'SCRAP';
  } else if (isMaxCyclesReached) {
    previewStatus = 'MAXIMUM REGRIND';
  } else if (inspectionResult === 'PASSED') {
    previewStatus = 'READY TO USE';
  } else if (inspectionResult === 'FAILED') {
    previewStatus = 'SCRAP';
  } else {
    previewStatus = 'HOLD';
  }

  // Submit Regrind Job
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStandard) {
      setNotification({ type: 'error', message: 'กรุณาเลือกรหัสชิ้นส่วนมาตรฐานที่ถูกต้อง' });
      return;
    }

    if (!performedBy || !performedBy.trim()) {
      setNotification({ type: 'error', message: 'กรุณาระบุชื่อช่างผู้ปฏิบัติงาน (Technician / Performed By)' });
      return;
    }

    if (!regrindDate || !regrindDate.trim()) {
      setNotification({ type: 'error', message: 'กรุณาระบุวันที่เจียระไน' });
      return;
    }

    if (isRegrindBlocked) {
      setNotification({
        type: 'error',
        message: `ข้อกำหนด Rule 1 & 2: ไม่อนุญาตให้เจียรสำหรับชิ้นส่วน ${selectedStandard.partName} (Single Use / Not Allowed)`
      });
      return;
    }

    const result = storageService.recordRegrind({
      lineId: selectedLineId,
      lineLastUsed: selectedLineId,
      dieCode,
      finDie: dieCode,
      partCode: selectedStandard.partCode,
      partName: selectedStandard.partName,
      partInstanceOrLot: partInstanceOrLot || `SN-${selectedStandard.partCode}-01`,
      previousLength,
      currentLength,
      actualGrindingRemovedMm,
      mmRemovedThisCycle: actualGrindingRemovedMm,
      regrindCountBefore,
      regrindCountAfter: calculatedNextCycle,
      regrindCycleCount: calculatedNextCycle,
      remainingRegrindCount: remainingCycles,
      maxAllowedCycles: maxCycles,
      supplierOrInternalProcess,
      vendorName,
      workOrder: workOrder || `WO-${Date.now().toString().slice(-6)}`,
      cost,
      surfaceRoughnessRa: measuredRa,
      hardnessHrc,
      inspectionResult,
      inspectionStatus: inspectionResult === 'PASSED' ? 'PASSED' : inspectionResult === 'FAILED' ? 'FAILED_SCRAPPED' : 'PENDING',
      performedBy,
      regrindDate,
      note,
      status: previewStatus
    });

    if (result.success) {
      // Save memory for technician and remarks
      saveTechnicianMemory(performedBy);
      setTechnicianList(loadSavedTechnicians());
      if (note && note.trim()) {
        saveRemarksMemory(note);
        setRemarksList(loadSavedRemarks());
      }

      setNotification({
        type: 'success',
        message: `บันทึกงานเจียระไนเรียบร้อยแล้ว: ${result.record?.jobCode} (สถานะ: ${previewStatus})`
      });

      setRegrindCountBefore(calculatedNextCycle);
      setPreviousLength(currentLength);
      setActualGrindingRemovedMm(selectedStandard.grindingAmountPerTimeMm || 0.20);
      setCurrentLength(Number((currentLength - (selectedStandard.grindingAmountPerTimeMm || 0.20)).toFixed(3)));
      setWorkOrder(`WO-RGD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      reloadData();
    } else {
      setNotification({ type: 'error', message: result.error || 'เกิดข้อผิดพลาดในการบันทึกงานเจียร' });
    }
  };

  // Save edited standard
  const handleSaveEditedStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStandard) return;

    storageService.saveRegrindMasterStandard(editingStandard);
    setEditingStandard(null);
    setNotification({
      type: 'success',
      message: `อัปเดตสเปคมาตรฐาน ${editingStandard.partCode} (${editingStandard.partName}) เรียบร้อยแล้ว`
    });
    reloadData();
  };

  // Create new standard
  const handleCreateNewStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStandardForm.partCode || !newStandardForm.partName) {
      setNotification({ type: 'error', message: 'กรุณากรอกรหัสอะไหล่และชื่อชิ้นส่วนให้ครบถ้วน' });
      return;
    }

    const nom = Number(newStandardForm.nominalLengthMm) || 70.0;
    const allow = Number(newStandardForm.totalGrindingAllowanceMm) || 4.0;
    const minLength = Number(newStandardForm.minAllowedLengthMm) || (nom - allow);

    const standardToSave: RegrindMasterStandard = {
      partCode: newStandardForm.partCode.trim().toUpperCase(),
      partName: newStandardForm.partName.trim(),
      nominalLengthMm: nom,
      grindingAmountPerTimeMm: Number(newStandardForm.grindingAmountPerTimeMm) || 0.20,
      totalGrindingAllowanceMm: allow,
      maxRegrindCount: Number(newStandardForm.maxRegrindCount) || 5,
      minAllowedLengthMm: minLength,
      regrindAllowed: newStandardForm.regrindAllowed ?? true,
      disposeAfterOneUse: newStandardForm.disposeAfterOneUse ?? false,
      tubeSizeCompat: newStandardForm.tubeSizeCompat || 'Ø7',
      category: newStandardForm.category || 'PUNCH'
    };

    storageService.saveRegrindMasterStandard(standardToSave);
    setIsAddStandardModalOpen(false);
    setNotification({
      type: 'success',
      message: `สร้างสเปคมาตรฐานใหม่ ${standardToSave.partCode} (${standardToSave.partName}) สำเร็จ`
    });
    reloadData();
  };

  // Delete standard
  const handleDeleteStandard = (std: RegrindMasterStandard) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบมาตรฐานสำหรับ ${std.partName} (${std.partCode})?`);
    if (confirmDelete) {
      storageService.deleteRegrindMasterStandard(std.partCode);
      setNotification({
        type: 'success',
        message: `ลบสเปคมาตรฐาน ${std.partCode} สำเร็จ`
      });
      reloadData();
    }
  };

  // Update cell in 31-day matrix
  const handleUpdateCell = (category: 'REPAIR' | 'DEFECT_SCRAP', partName: string, day: number, count: number) => {
    regrindService.updateMatrixCell(matrix.year || 2026, matrix.month || 1, category, partName, day, count);
    reloadData();
  };

  const handleMonthChange = (year: number, month: number) => {
    const newMatrix = regrindService.getMonthlyMatrix(year, month);
    setMatrix(newMatrix);
  };

  // Filtered standards
  const filteredStandards = useMemo(() => {
    return standards.filter(std => {
      const matchSearch = standardSearch === '' || 
        std.partCode.toLowerCase().includes(standardSearch.toLowerCase()) ||
        std.partName.toLowerCase().includes(standardSearch.toLowerCase());
      
      const matchCat = standardFilterCategory === 'ALL' || 
        (std.tubeSizeCompat && std.tubeSizeCompat === standardFilterCategory) ||
        (std.category && std.category === standardFilterCategory);

      return matchSearch && matchCat;
    });
  }, [standards, standardSearch, standardFilterCategory]);

  // Distinct Tool IDs & Operator Names for Unified Logs Dropdown Filters
  const availableToolOptions = useMemo(() => {
    const map = new Map<string, string>();
    standards.forEach(s => {
      if (s.partCode) map.set(s.partCode, `${s.partCode} - ${s.partName}`);
    });
    historyRecords.forEach(r => {
      if (r.partCode && !map.has(r.partCode)) {
        map.set(r.partCode, `${r.partCode} - ${r.partName || r.partCode}`);
      }
    });
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [standards, historyRecords]);

  const availableOperatorOptions = useMemo(() => {
    const ops = new Set<string>(['Thanakorn Phonpayung', ...technicianList]);
    historyRecords.forEach(r => {
      if (r.performedBy && r.performedBy.trim()) {
        ops.add(r.performedBy.trim());
      }
    });
    return Array.from(ops);
  }, [historyRecords, technicianList]);

  // Filtered Unified Master History Records (by Search, Tool ID, Operator Name, Line, Status, Date Range)
  const filteredHistory = useMemo(() => {
    return historyRecords.filter(rec => {
      const q = tableSearch.toLowerCase().trim();
      const matchSearch = q === '' ||
        rec.jobCode?.toLowerCase().includes(q) ||
        rec.partCode?.toLowerCase().includes(q) ||
        rec.partName?.toLowerCase().includes(q) ||
        rec.partInstanceOrLot?.toLowerCase().includes(q) ||
        rec.serialNumber?.toLowerCase().includes(q) ||
        rec.workOrder?.toLowerCase().includes(q) ||
        rec.performedBy?.toLowerCase().includes(q) ||
        rec.dieCode?.toLowerCase().includes(q);

      const matchTool =
        tableToolFilter === 'ALL' ||
        rec.partCode === tableToolFilter ||
        rec.partInstanceOrLot === tableToolFilter;

      const matchOperator =
        tableOperatorFilter === 'ALL' ||
        (rec.performedBy && rec.performedBy.toLowerCase() === tableOperatorFilter.toLowerCase());

      const matchLine = tableLineFilter === 'ALL' || rec.lineId === tableLineFilter || rec.lineLastUsed === tableLineFilter;
      const matchStatus = tableStatusFilter === 'ALL' || rec.status === tableStatusFilter;
      const matchDate = isDateInSelectedRange(rec.regrindDate || rec.timestamp, historyStartDate, historyEndDate);

      return matchSearch && matchTool && matchOperator && matchLine && matchStatus && matchDate;
    });
  }, [historyRecords, tableSearch, tableToolFilter, tableOperatorFilter, tableLineFilter, tableStatusFilter, historyStartDate, historyEndDate]);

  // 1. REPAIR CALENDAR DAILY GRAPH DATA (เฉพาะงานเจียร)
  const regrindDailyChartData = useMemo(() => {
    const days: { day: number; count: number }[] = [];
    for (let d = 1; d <= 31; d++) {
      const repairSum = matrix.repairRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0);
      days.push({ day: d, count: repairSum });
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);
    const totalMonth = days.reduce((sum, d) => sum + d.count, 0);
    const peakDay = days.reduce((max, d) => d.count > max.count ? d : max, days[0]);
    const avgDaily = (totalMonth / 31).toFixed(1);

    return { days, maxCount, totalMonth, peakDay, avgDaily };
  }, [matrix.repairRows]);

  // 2. SCRAP CALENDAR DAILY GRAPH DATA (เฉพาะงานทิ้ง/ชำรุด)
  const scrapDailyChartData = useMemo(() => {
    const days: { day: number; count: number }[] = [];
    for (let d = 1; d <= 31; d++) {
      const defectSum = matrix.defectRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0);
      days.push({ day: d, count: defectSum });
    }

    const maxCount = Math.max(...days.map(d => d.count), 1);
    const totalMonth = days.reduce((sum, d) => sum + d.count, 0);
    const peakDay = days.reduce((max, d) => d.count > max.count ? d : max, days[0]);
    const avgDaily = (totalMonth / 31).toFixed(1);
    const totalLossEst = totalMonth * 3500;

    return { days, maxCount, totalMonth, peakDay, avgDaily, totalLossEst };
  }, [matrix.defectRows]);

  // Unified Status Stats Counter
  const unifiedStats = useMemo(() => {
    const total = historyRecords.length;
    const ready = historyRecords.filter(r => r.status === 'READY TO USE').length;
    const waiting = historyRecords.filter(r => r.status === 'WAITING REGRIND' || r.status === 'HOLD').length;
    const maxRegrind = historyRecords.filter(r => r.status === 'MAXIMUM REGRIND').length;
    const scrap = historyRecords.filter(r => r.status === 'SCRAP').length;
    return { total, ready, waiting, maxRegrind, scrap };
  }, [historyRecords]);

  // CSV Export for Unified Log
  const handleExportCSV = () => {
    const headers = [
      'Job Code',
      'Status / สถานะ',
      'Work Order',
      'Line ID',
      'Die Code',
      'Part Code',
      'Part Name',
      'Serial or Lot',
      'Previous Length (mm)',
      'Actual Removed (mm)',
      'Current Length (mm)',
      'Cycle Count',
      'Max Cycles',
      'Remaining Cycles',
      'QC Result',
      'Performed By',
      'Vendor / Location',
      'Cost (THB)',
      'Regrind Date',
      'Note'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredHistory.map(rec => [
      escapeCsv(rec.jobCode),
      escapeCsv(rec.status),
      escapeCsv(rec.workOrder || ''),
      escapeCsv(rec.lineId || rec.lineLastUsed),
      escapeCsv(rec.dieCode || rec.finDie || ''),
      escapeCsv(rec.partCode),
      escapeCsv(rec.partName),
      escapeCsv(rec.partInstanceOrLot || rec.serialNumber || ''),
      rec.previousLength !== undefined ? rec.previousLength.toFixed(2) : '',
      (rec.actualGrindingRemovedMm !== undefined ? rec.actualGrindingRemovedMm : (rec.mmRemovedThisCycle || 0)).toFixed(3),
      rec.currentLength !== undefined ? rec.currentLength.toFixed(2) : '',
      rec.regrindCountAfter || rec.regrindCycleCount || 1,
      rec.maxAllowedCycles || 4,
      rec.remainingRegrindCount ?? 0,
      escapeCsv(rec.inspectionResult || rec.inspectionStatus || 'PASSED'),
      escapeCsv(rec.performedBy || ''),
      escapeCsv(rec.vendorName || ''),
      rec.cost || 0,
      escapeCsv(rec.regrindDate || rec.timestamp || ''),
      escapeCsv(rec.note || '')
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Unified_Regrind_Master_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-3 font-sans text-slate-100 text-xs">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 font-mono text-xs animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200' :
          notification.type === 'warning' ? 'bg-amber-950/95 border-amber-500/50 text-amber-200' :
          'bg-rose-950/95 border-rose-500/50 text-rose-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
           notification.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
           <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2-Tab Glassmorphism Switching Navigation with Integrated Chart Controls in Same Tab */}
      <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-2 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('regrind-calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'regrind-calendar'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>🟢 {language === 'TH' ? 'แผนงานเจียร 31 วัน (Repair Plan)' : '31-Day Repair Plan'}</span>
          </button>

          <button
            onClick={() => setActiveTab('scrap-calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'scrap-calendar'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>🔴 {language === 'TH' ? 'แผนงานคัดทิ้ง 31 วัน (Scrap Plan)' : '31-Day Scrap Plan'}</span>
          </button>
        </div>

        {/* Quick graph toggle inside the same tab header (No extra tab needed) */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setIsChartCollapsed(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isChartCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/[0.1] hover:text-white'
            }`}
            title={isChartCollapsed ? 'ขยายดูกราฟสถิติรายวัน' : 'พับซ่อนกราฟเพื่อขยายตารางเต็มจอ'}
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isChartCollapsed ? (language === 'TH' ? '📊 แสดงกราฟ' : 'Show Chart') : (language === 'TH' ? 'พับซ่อนกราฟ' : 'Hide Chart')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: ตารางปฏิทิน 31 วัน & กราฟสถิติรายวัน (REPAIR & SCRAP 31-DAY MATRIX)  */}
      {/* ========================================================================= */}
      {activeTab === 'regrind-calendar' && (
        <div className="space-y-6 animate-scaleIn">
          {/* Section 1: Repair Matrix */}
          <div className="space-y-2.5">
            <InteractiveDailyTrendChart
              title={language === 'TH' ? 'กราฟปริมาณงานเจียรรายวัน' : 'Daily Regrinding Volume Trend'}
              totalLabel={language === 'TH' ? 'เจียรสะสม' : 'Total Reground'}
              data={regrindDailyChartData.days}
              colorTheme="emerald"
              monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
              unit={language === 'TH' ? 'งาน' : 'jobs'}
              defaultChartType="COMBO"
              height={230}
              isCollapsed={isChartCollapsed}
              onToggleCollapse={() => setIsChartCollapsed(prev => !prev)}
              showControls={true}
              collapsible={true}
            />

            <div className="bg-[#0c1018]/90 border border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xl backdrop-blur-xl">
              <Excel31DayMatrixView
                matrix={matrix}
                onUpdateCell={handleUpdateCell}
                onMonthChange={handleMonthChange}
                mode="REPAIR"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scrap-calendar' && (
        <div className="space-y-6 animate-scaleIn">
          {/* Section 2: Scrap Matrix */}
          <div className="space-y-2.5">
            <InteractiveDailyTrendChart
              title={language === 'TH' ? 'กราฟปริมาณคัดทิ้งรายวัน' : 'Daily Scrap Volume Trend'}
              totalLabel={language === 'TH' ? 'คัดทิ้งสะสม' : 'Total Scrapped'}
              extraKpiValue={`${language === 'TH' ? 'มูลค่าเสียหาย' : 'Est. Loss'}: ฿${scrapDailyChartData.totalLossEst.toLocaleString()}`}
              data={scrapDailyChartData.days}
              colorTheme="rose"
              monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
              unit={language === 'TH' ? 'ชิ้น' : 'pcs'}
              defaultChartType="COMBO"
              height={230}
              isCollapsed={isChartCollapsed}
              onToggleCollapse={() => setIsChartCollapsed(prev => !prev)}
              showControls={true}
              collapsible={true}
            />

            <div className="bg-[#0c1018]/90 border border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xl backdrop-blur-xl">
              <Excel31DayMatrixView
                matrix={matrix}
                onUpdateCell={handleUpdateCell}
                onMonthChange={handleMonthChange}
                mode="DEFECT_SCRAP"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESCHEDULE & SNOOZE OVERDUE/IN-PROGRESS TICKET                  */}
      {/* ========================================================================= */}
      {rescheduleModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1018] border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scaleIn font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white font-mono">
                    เลื่อนกำหนดส่งงานเจียร (Reschedule SLA)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {rescheduleModalTicket.jobCode} • {rescheduleModalTicket.partName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModalTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newRescheduleDate) {
                  setNotification({ type: 'error', message: 'กรุณาระบุวันกำหนดส่งงานใหม่' });
                  return;
                }
                const finalReason = rescheduleReason === 'อื่นๆ' ? rescheduleCustomReason : rescheduleReason;
                const result = regrindService.rescheduleTicket(rescheduleModalTicket.id, {
                  newTargetDate: newRescheduleDate,
                  reason: finalReason || 'เลื่อนกำหนดตามคำขอช่าง',
                  technicianName: performedBy || 'Thanakorn Phonpayung'
                });

                if (result.success) {
                  setNotification({ type: 'success', message: result.message });
                  setRescheduleModalTicket(null);
                  reloadData();
                } else {
                  setNotification({ type: 'error', message: result.message });
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>กำหนดส่งเดิม:</span>
                  <span className="font-mono text-slate-200">
                    {rescheduleModalTicket.targetCompletionDate ? new Date(rescheduleModalTicket.targetCompletionDate).toLocaleDateString('th-TH') : 'วันนี้'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>ช่างผู้รับผิดชอบ:</span>
                  <span className="font-bold text-cyan-300">
                    {rescheduleModalTicket.assignedTechnician || performedBy || 'Thanakorn Phonpayung'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  กำหนดส่งงานใหม่ (New Target Date) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={e => setNewRescheduleDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono [color-scheme:dark]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  สาเหตุที่ต้องเลื่อนกำหนดส่ง (Reason for Delay) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold cursor-pointer"
                >
                  <option value="รอเบิกหินเจียร CBN เบอร์พิเศษ">รอเบิกหินเจียร CBN เบอร์พิเศษ</option>
                  <option value="ฝ่ายผลิตขอแทรกคิวงานแม่พิมพ์ด่วน">ฝ่ายผลิตขอแทรกคิวงานแม่พิมพ์ด่วน</option>
                  <option value="รอคิวเครื่อง Profile Grinder ว่าง">รอคิวเครื่อง Profile Grinder ว่าง</option>
                  <option value="ชิ้นงานบิ่นลึก ต้องใช้เวลาเจียรหลายรอบ">ชิ้นงานบิ่นลึก ต้องใช้เวลาเจียรหลายรอบ</option>
                  <option value="รอชิ้นงานระบายความร้อนเพื่อวัด Dimension">รอชิ้นงานระบายความร้อนเพื่อวัด Dimension</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุรายละเอียดเอง)</option>
                </select>
              </div>

              {rescheduleReason === 'อื่นๆ' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ระบุเหตุผลเพิ่มเติม</label>
                  <input
                    type="text"
                    value={rescheduleCustomReason}
                    onChange={e => setRescheduleCustomReason(e.target.value)}
                    placeholder="พิมพ์เหตุผล..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRescheduleModalTicket(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                >
                  บันทึกการเลื่อนกำหนดส่ง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Regrind Job Modal */}
      <UnifiedRegrindJobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSaved={() => {
          setIsJobModalOpen(false);
          reloadData();
          setNotification({
            type: 'success',
            message: 'บันทึกรายการเจียรและจัดคิวเรียบร้อยแล้ว'
          });
        }}
        initialLineId={selectedLineId}
      />
    </div>
  );
};
