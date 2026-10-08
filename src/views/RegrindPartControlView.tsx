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
  | 'entry-standards' 
  | 'regrind-calendar' 
  | 'scrap-calendar' 
  | 'unified-logs'
  // Backward compatibility:
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

  const resolveTab = (t: string): 'regrind-calendar' | 'scrap-calendar' | 'entry-standards' | 'unified-logs' => {
    if (t === 'scrapped-parts' || t === 'scrap-calendar') return 'scrap-calendar';
    if (t === 'ready-stock' || t === 'regrind-logs' || t === 'unified-logs') return 'unified-logs';
    if (t === 'entry-standards') return 'entry-standards';
    return 'regrind-calendar';
  };

  const [activeTab, setActiveTab] = useState<'regrind-calendar' | 'scrap-calendar' | 'entry-standards' | 'unified-logs'>(resolveTab(initialTab));
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

      {/* 3-Tab Glassmorphism Switching Navigation */}
      <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-2 shadow-xl backdrop-blur-2xl flex items-center gap-2 flex-wrap">
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

        <button
          onClick={() => setActiveTab('entry-standards')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'entry-standards'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>📋 {language === 'TH' ? 'บันทึกผลการเจียร & QC (Form)' : 'Regrind Form & Standards'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: ฟอร์มลงบันทึกผลเจียร & QC (DEDICATED EXECUTION FORM PAGE)          */}
      {/* ========================================================================= */}
      {activeTab === 'entry-standards' && (
        <div className="flex-1 flex flex-col space-y-3">
          {/* Clean Page Header (No duplicate navigation buttons) */}
          <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <RotateCcw className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide font-sans">
                  ฟอร์มลงบันทึกผลการเจียระไน & ตรวจรับ QC (Regrind Execution & QC Form)
                </h1>
                <p className="text-[11px] text-slate-400">
                  บันทึกค่าความยาวก่อน–หลังเจียร ระยะที่ปาดออก และผลการตรวจรับ QC (ซิงค์เข้าประวัติ Log และตาราง 31 วันอัตโนมัติ)
                </p>
              </div>
            </div>
          </div>

          {/* Form Entry & Side Assessment */}
          {entrySubTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Form (Col 8) */}
              <div className="lg:col-span-8 bg-[#0c1018]/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 font-mono">
                    <Wrench className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      บันทึกผลการเจียระไนลับคม (Regrind Execution Form)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-thai">
                    * กรอกค่าความยาวเดิม และ ระยะปาดผิว ระบบจะคิดคำนวณสเปกและนับรอบให้อัตโนมัติ
                  </span>
                </div>

                <form onSubmit={handleSubmitEntry} className="space-y-4">
                  {/* Block 1: ไลน์ผลิต & รหัสชิ้นส่วน (กรองเฉพาะของไลน์ที่เลือก + ค้นหา/Dropdown) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        สายการผลิต (Line ID) <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={selectedLineId}
                        onChange={e => {
                          const l = e.target.value as ProductionLineId;
                          setSelectedLineId(l);
                          setDieCode(`FD-${l}-01`);
                        }}
                        className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:border-cyan-500 focus:outline-none cursor-pointer"
                      >
                        {linesList.map(l => (
                          <option key={l} value={l}>
                            LINE {l} ({LINE_INFO_MAP[l]?.shortTag || LINE_INFO_MAP[l]?.tubeSize || l})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <LineFilteredPartCombobox
                        lineId={selectedLineId}
                        selectedPartCode={selectedPartCode}
                        standards={standards}
                        onSelectPart={item => {
                          setSelectedPartCode(item.partCode);
                          setPreviousLength(item.nominalLengthMm);
                          setActualGrindingRemovedMm(item.grindingAmountPerTimeMm);
                          setCurrentLength(Number((item.nominalLengthMm - item.grindingAmountPerTimeMm).toFixed(3)));
                          setPartInstanceOrLot(`LOT-${selectedLineId}-${item.partCode.replace(/[^A-Za-z0-9]/g, '').slice(-5)}`);
                        }}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Serial / Lot Number
                      </label>
                      <input
                        type="text"
                        value={partInstanceOrLot}
                        onChange={e => setPartInstanceOrLot(e.target.value)}
                        placeholder="เช่น LOT-BURR-01"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Block 2: การวัดขนาด & ปริมาณเจียร */}
                  <div className="p-4 bg-slate-950/70 border border-cyan-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                        <Layers className="w-4 h-4" />
                        <span>DIMENSIONAL MEASUREMENT & FORMULA (มม.)</span>
                      </span>
                      <span className="text-[11px] text-amber-400 font-mono">
                        สเปคต่ำสุด (Min Allowed): {minAllowedLength.toFixed(2)} mm
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          ความยาวเดิมก่อนเจียร (Previous Length)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={previousLength}
                            onChange={e => handlePreviousLengthChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white font-bold"
                            required
                          />
                          <span className="absolute right-3 top-2 text-xs text-slate-500">mm</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-cyan-300 mb-1">
                          ระยะที่เจียรออก (Removed Depth)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.005"
                            value={actualGrindingRemovedMm}
                            onChange={e => handleActualRemovedChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 font-black"
                            required
                          />
                          <span className="absolute right-3 top-2 text-xs text-cyan-500">mm</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          ความยาวคงเหลือหลังเจียร (Result Length)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={currentLength}
                            onChange={e => handleCurrentLengthChange(parseFloat(e.target.value) || 0)}
                            className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs font-mono font-black ${
                              isLengthOutOfSpec ? 'border-rose-500 text-rose-400' : 'border-emerald-500/50 text-emerald-300'
                            }`}
                            required
                          />
                          <span className="absolute right-3 top-2 text-xs text-slate-500">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block 3: ช่างผู้ปฏิบัติงาน & วันที่ & ตรวจ QC */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-300">
                          ช่างผู้เจียร (Performed By) <span className="text-rose-400">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        list="technicians-memory-list"
                        value={performedBy}
                        onChange={e => setPerformedBy(e.target.value)}
                        placeholder="พิมพ์ระบุชื่อช่าง..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-cyan-400 focus:outline-none"
                        required
                      />
                      <datalist id="technicians-memory-list">
                        {technicianList.map((tech, idx) => (
                          <option key={idx} value={tech} />
                        ))}
                      </datalist>

                      {/* Quick Select: Thanakorn Phonpayung / Custom Others */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPerformedBy('Thanakorn Phonpayung')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            performedBy === 'Thanakorn Phonpayung'
                              ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-sm font-black'
                              : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border-white/10'
                          }`}
                          title="ตั้งค่าเป็น Thanakorn Phonpayung"
                        >
                          👤 Thanakorn Phonpayung
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (performedBy === 'Thanakorn Phonpayung') {
                              setPerformedBy('');
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            performedBy !== 'Thanakorn Phonpayung' && performedBy.trim() !== ''
                              ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-sm font-black'
                              : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border-white/10'
                          }`}
                          title="คลิกเพื่อพิมพ์ระบุชื่อช่างคนอื่น"
                        >
                          ✏️ อื่นๆ (ระบุเอง)
                        </button>

                        {/* Any user-saved custom technicians from previous submissions */}
                        {technicianList
                          .filter(tech => tech !== 'Thanakorn Phonpayung')
                          .slice(0, 3)
                          .map(tech => (
                            <button
                              key={tech}
                              type="button"
                              onClick={() => setPerformedBy(tech)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer truncate max-w-[130px] ${
                                performedBy === tech
                                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-sm font-black'
                                  : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border-white/10'
                              }`}
                              title={`คลิกเลือกช่าง: ${tech}`}
                            >
                              {tech}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        วันที่ดำเนินการ (Date) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        min="2025-01-01"
                        value={regrindDate}
                        onChange={e => setRegrindDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono [color-scheme:dark]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ผลการตรวจรับ QC
                      </label>
                      <select
                        value={inspectionResult}
                        onChange={e => setInspectionResult(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-100 cursor-pointer"
                      >
                        <option value="PASSED">PASSED (ผ่านเกณฑ์)</option>
                        <option value="CONDITIONAL">CONDITIONAL (มีเงื่อนไข)</option>
                        <option value="FAILED">FAILED (ไม่ผ่าน - คัดทิ้ง)</option>
                        <option value="PENDING">PENDING (รอตรวจ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ค่าใช้จ่ายเจียร (THB)
                      </label>
                      <input
                        type="number"
                        value={cost}
                        onChange={e => setCost(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
                      />
                    </div>
                  </div>

                  {/* หมายเหตุ พร้อมระบบจดจำข้อความที่พิมพ์บ่อย & Quick Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        หมายเหตุเพิ่มเติม / หินเจียรที่ใช้ (Remarks)
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>จดจำข้อความที่พิมพ์บ่อย</span>
                      </span>
                    </div>
                    <input
                      type="text"
                      list="remarks-memory-list"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="เช่น ลับคมด้วยหิน CBN เบอร์ #400, ตรวจเช็คผิว Ra = 0.12 um เรียบร้อย"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                    <datalist id="remarks-memory-list">
                      {remarksList.map((rem, idx) => (
                        <option key={idx} value={rem} />
                      ))}
                    </datalist>

                    {/* Quick Preset Remark Chips */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[9.5px] text-slate-400 font-mono">ข้อความแนะนำ:</span>
                      {remarksList.slice(0, 4).map((rem, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNote(rem)}
                          className={`px-2 py-0.5 rounded text-[9.5px] border transition-all cursor-pointer truncate max-w-[260px] text-left ${
                            note === rem
                              ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-sm font-bold'
                              : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border-white/10'
                          }`}
                          title={`คลิกเลือกหมายเหตุ: ${rem}`}
                        >
                          {rem}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Submit Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedStandard) {
                          handlePreviousLengthChange(selectedStandard.nominalLengthMm);
                        }
                      }}
                      className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                    >
                      รีเซ็ตเป็นความยาวพาร์ทใหม่ (Nominal)
                    </button>

                    <button
                      type="submit"
                      disabled={isRegrindBlocked}
                      className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all ${
                        isRegrindBlocked
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>บันทึกงานเจียระไน (Submit Record)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Assessment Panel (Col 4) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Result Assessment Card */}
                <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>ผลการประเมินสภาพอะไหล่</span>
                    </h3>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-mono font-bold ${
                      previewStatus === 'READY TO USE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      previewStatus === 'MAXIMUM REGRIND' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      previewStatus === 'SCRAP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {previewStatus}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">ชิ้นส่วน:</span>
                      <span className="font-mono font-bold text-cyan-300">{selectedStandard?.partName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">ความยาวมาตรฐาน (Nominal):</span>
                      <span className="font-mono text-slate-200">{selectedStandard?.nominalLengthMm.toFixed(2)} mm</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">ลิมิตต่ำสุด (Min Allowed):</span>
                      <span className="font-mono font-bold text-amber-400">{minAllowedLength.toFixed(2)} mm</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">ความยาวหลังเจียร:</span>
                      <span className={`font-mono font-bold text-sm ${isLengthOutOfSpec ? 'text-rose-400' : 'text-emerald-300'}`}>
                        {currentLength.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">รอบการเจียร:</span>
                      <span className={`font-mono font-bold ${isMaxCyclesReached ? 'text-amber-400' : 'text-cyan-300'}`}>
                        รอบที่ {calculatedNextCycle} / {maxCycles} รอบ
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">จำนวนครั้งที่ยังเจียรได้:</span>
                      <span className="font-mono font-bold text-white">{remainingCycles} ครั้ง</span>
                    </div>
                  </div>
                </div>

                {/* Quality Checklist */}
                <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-2.5 text-xs text-slate-300">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>เกณฑ์ควบคุมคุณภาพงานเจียร</span>
                  </h3>
                  <ul className="space-y-1.5 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">1.</span>
                      <span>ห้ามเจียรอะไหล่ Single-Use (ใช้ครั้งเดียวทิ้ง)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">2.</span>
                      <span>ความยาวหลังเจียรต้องไม่ต่ำกว่า Min Allowed Length</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">3.</span>
                      <span>จำนวนรอบต้องไม่เกิน Max Allowed Regrind Count</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">4.</span>
                      <span>รายการทั้งหมดจะถูกซิงค์เข้า Master Unified Log ทันที</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 1B: In-Progress Queue & Overdue Management Panel */}
          {entrySubTab === 'in-progress-queue' && (
            <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4 font-sans">
              {/* Top Banner & Filter Toolbar */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base font-mono">
                      คิวงานที่กำลังเจียระไน & เฝ้าระวังงานล่าช้า (In-Progress & Overdue SLA Monitor)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ตรวจสอบสถานะงานในห้องทูลลิ่ง ตรวจจับความล่าช้าอัตโนมัติ และเลื่อนกำหนดส่งงานพร้อมบันทึกเหตุผล
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Line filter */}
                  <select
                    value={queueLineFilter}
                    onChange={e => setQueueLineFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold h-8 cursor-pointer"
                  >
                    <option value="ALL">ทุกลายน์ (All Lines)</option>
                    {linesList.map(l => (
                      <option key={l} value={l}>LINE {l}</option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหา Job, Part Code, ช่าง..."
                      value={queueSearch}
                      onChange={e => setQueueSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-48 sm:w-56 h-8"
                    />
                  </div>
                </div>
              </div>

              {/* KPI Status Cards */}
              {(() => {
                const active = queueTickets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS');
                const nowTime = new Date();
                const overdue = active.filter(t => t.targetCompletionDate && new Date(t.targetCompletionDate) < nowTime);
                const onTrack = active.length - overdue.length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#070D19] border border-white/10 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-mono">คิวงานกำลังทำทั้งหมด</span>
                        <strong className="text-lg font-black text-white">{active.length} รายการ</strong>
                      </div>
                      <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                        <Wrench className="w-4 h-4" />
                      </div>
                    </div>

                    <div className={`p-3 bg-[#070D19] rounded-xl flex items-center justify-between border ${
                      overdue.length > 0 ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-white/10'
                    }`}>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-mono flex items-center gap-1">
                          <span>งานล่าช้าเกินกำหนด (Overdue)</span>
                          {overdue.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                          )}
                        </span>
                        <strong className={`text-lg font-black ${overdue.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {overdue.length} รายการ
                        </strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${
                        overdue.length > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3 bg-[#070D19] border border-white/10 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-mono">ดำเนินการตามกำหนด (On Track)</span>
                        <strong className="text-lg font-black text-emerald-400">{onTrack} รายการ</strong>
                      </div>
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tickets Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                      <th className="p-3">รหัสงาน (Job Code)</th>
                      <th className="p-3">ลายน์ & ชิ้นส่วน</th>
                      <th className="p-3">ช่างผู้รับผิดชอบ</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3">วันที่เริ่ม / กำหนดส่ง (SLA)</th>
                      <th className="p-3 text-center">การแจ้งเตือน SLA</th>
                      <th className="p-3 text-center">จัดการงาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
                    {(() => {
                      const nowTime = new Date();
                      const filtered = queueTickets
                        .filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS')
                        .filter(t => queueLineFilter === 'ALL' || t.lineId === queueLineFilter)
                        .filter(t => {
                          if (!queueSearch.trim()) return true;
                          const q = queueSearch.toLowerCase();
                          return (
                            t.jobCode.toLowerCase().includes(q) ||
                            t.partName.toLowerCase().includes(q) ||
                            t.partCode.toLowerCase().includes(q) ||
                            (t.assignedTechnician && t.assignedTechnician.toLowerCase().includes(q))
                          );
                        });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                              🎉 ไม่มีคิวงานคั่งค้างในขณะนี้ ทุกงานเสร็จสมบูรณ์เรียบร้อยแล้ว
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(t => {
                        const targetDate = t.targetCompletionDate ? new Date(t.targetCompletionDate) : null;
                        const isOverdue = targetDate ? targetDate < nowTime : false;
                        const timeDiffHours = targetDate ? Math.round((targetDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60)) : null;

                        return (
                          <tr key={t.id} className={`hover:bg-white/[0.04] transition-colors ${isOverdue ? 'bg-rose-950/15' : ''}`}>
                            <td className="p-3 font-bold text-cyan-300">
                              <div>{t.jobCode}</div>
                              <div className="text-[10px] text-slate-400">{t.source || 'SCHEDULED_PM'}</div>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  LINE {t.lineId}
                                </span>
                                <span>{t.partName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{t.partCode}</div>
                            </td>

                            <td className="p-3">
                              <span className="font-bold text-slate-200">
                                {t.assignedTechnician || 'Thanakorn Phonpayung'}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'IN_PROCESS'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                {t.status === 'IN_PROCESS' ? 'กำลังเจียร' : 'รอเริ่มเจียร'}
                              </span>
                            </td>

                            <td className="p-3 text-[11px]">
                              <div className="text-slate-300">
                                เริ่ม: {t.receivedDate ? new Date(t.receivedDate).toLocaleDateString('th-TH') : '-'}
                              </div>
                              <div className="font-bold text-slate-100 flex items-center gap-1">
                                <span>กำหนดส่ง:</span>
                                <span className={isOverdue ? 'text-rose-400 font-black' : 'text-emerald-300'}>
                                  {targetDate ? targetDate.toLocaleDateString('th-TH') : 'วันนี้'}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>ล่าช้าเกินกำหนด</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>ตรงตามเวลา (On Track)</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-sans">
                                {/* Reschedule Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRescheduleModalTicket(t);
                                    setNewRescheduleDate(new Date(Date.now() + 86400000).toISOString().substring(0, 10));
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                                  title="เลื่อนกำหนดส่งงานพร้อมระบุเหตุผล"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>เลื่อนกำหนด</span>
                                </button>

                                {/* Complete & QC Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLineId(t.lineId);
                                    setSelectedPartCode(t.partCode);
                                    setWorkOrder(t.jobCode);
                                    setPerformedBy(t.assignedTechnician || 'Thanakorn Phonpayung');
                                    setEntrySubTab('form');
                                  }}
                                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 shadow cursor-pointer active:scale-95 transition-all"
                                  title="กรอกค่าความยาวและบันทึกตรวจรับงาน"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>จบงาน & QC</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 1C: Master Standards Specs Table */}
          {entrySubTab === 'standards' && (
            <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    <span>สเปคมาตรฐานวิศวกรรมการเจียระไน (Master Engineering Standards)</span>
                  </h3>
                  <p className="text-xs text-slate-400">เกณฑ์ความยาว, ระยะเจียรต่อครั้ง, และจำนวนรอบสูงสุดที่อนุญาต</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหารหัส หรือ ชื่ออะไหล่..."
                      value={standardSearch}
                      onChange={e => setStandardSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 w-52"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                      <th className="p-3">รหัสอะไหล่</th>
                      <th className="p-3">ชื่อชิ้นส่วนแม่พิมพ์</th>
                      <th className="p-3 text-center">ทูปไซส์</th>
                      <th className="p-3 text-right">ความยาวมาตรฐาน (Nominal)</th>
                      <th className="p-3 text-right">เจียร/ครั้ง</th>
                      <th className="p-3 text-right">ระยะเจียรรวมสูงสุด</th>
                      <th className="p-3 text-center">รอบสูงสุด</th>
                      <th className="p-3 text-right">ความยาวต่ำสุด (Min Spec)</th>
                      <th className="p-3 text-center">อนุญาตเจียร</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {filteredStandards.map(std => {
                      const minLen = std.minAllowedLengthMm || (std.nominalLengthMm - std.totalGrindingAllowanceMm);
                      return (
                        <tr key={std.partCode} className="hover:bg-white/[0.04] transition-colors">
                          <td className="p-3 font-mono font-bold text-cyan-300">{std.partCode}</td>
                          <td className="p-3 font-bold text-slate-100">{std.partName}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{std.tubeSizeCompat || 'Ø7'}</td>
                          <td className="p-3 text-right font-mono text-slate-200">{std.nominalLengthMm.toFixed(2)} mm</td>
                          <td className="p-3 text-right font-mono text-cyan-300 font-bold">{std.grindingAmountPerTimeMm.toFixed(3)} mm</td>
                          <td className="p-3 text-right font-mono text-amber-300">{std.totalGrindingAllowanceMm.toFixed(2)} mm</td>
                          <td className="p-3 text-center font-mono font-bold text-white">{std.maxRegrindCount} ครั้ง</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">{minLen.toFixed(2)} mm</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              std.regrindAllowed && !std.disposeAfterOneUse
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {std.disposeAfterOneUse ? 'SINGLE-USE' : std.regrindAllowed ? 'ALLOWED' : 'BLOCKED'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingStandard({ ...std })}
                                className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-cyan-400" />
                                <span>แก้ไข</span>
                              </button>
                              <button
                                onClick={() => handleDeleteStandard(std)}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: ตารางปฏิทิน 31 วัน & กราฟสถิติรายวัน (REPAIR & SCRAP 31-DAY MATRIX)  */}
      {/* ========================================================================= */}
      {activeTab === 'regrind-calendar' && (
        <div className="space-y-6 animate-scaleIn">
          {/* Section 1: Repair Matrix */}
          <div className="space-y-2.5">
            <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h1 className="text-sm sm:text-base font-black text-white tracking-wide font-sans">
                    แผนงานเจียรแม่พิมพ์ 31 วัน (Repair Plan)
                  </h1>
                </div>
              </div>

              <span className="text-xs px-3 py-1 rounded-xl font-mono font-bold border bg-emerald-950/80 text-emerald-300 border-emerald-600/60">
                🟢 REPAIR PLAN
              </span>
            </div>

            <InteractiveDailyTrendChart
              title="กราฟปริมาณงานเจียรรายวัน"
              totalLabel="เจียรสะสม"
              data={regrindDailyChartData.days}
              colorTheme="emerald"
              monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
              unit="งาน"
              defaultChartType="COMBO"
              height={240}
              isCollapsed={false}
              showControls={false}
              collapsible={false}
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
            <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl border bg-rose-500/20 text-rose-400 border-rose-500/30">
                  <Trash2 className="w-4 h-4" />
                </span>
                <div>
                  <h1 className="text-sm sm:text-base font-black text-white tracking-wide font-sans">
                    แผนงานคัดทิ้งอะไหล่ 31 วัน (Scrap Plan)
                  </h1>
                </div>
              </div>

              <span className="text-xs px-3 py-1 rounded-xl font-mono font-bold border bg-rose-950/80 text-rose-300 border-rose-600/60">
                🔴 SCRAP PLAN
              </span>
            </div>

            <InteractiveDailyTrendChart
              title="กราฟปริมาณคัดทิ้งรายวัน"
              totalLabel="คัดทิ้งสะสม"
              extraKpiValue={`มูลค่าเสียหาย: ฿${scrapDailyChartData.totalLossEst.toLocaleString()}`}
              data={scrapDailyChartData.days}
              colorTheme="rose"
              monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
              unit="ชิ้น"
              defaultChartType="COMBO"
              height={240}
              isCollapsed={false}
              showControls={false}
              collapsible={false}
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
      {/* MODAL 1: EDIT MASTER STANDARD                                             */}
      {/* ========================================================================= */}
      {editingStandard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>แก้ไขสเปคมาตรฐาน: {editingStandard.partCode}</span>
              </h3>
              <button
                onClick={() => setEditingStandard(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedStandard} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">ชื่ออะไหล่ (Part Name)</label>
                <input
                  type="text"
                  value={editingStandard.partName}
                  onChange={e => setEditingStandard({ ...editingStandard, partName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ความยาวปกติ Nominal (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingStandard.nominalLengthMm}
                    onChange={e => setEditingStandard({ ...editingStandard, nominalLengthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ระยะเจียร/ครั้ง (mm/time)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingStandard.grindingAmountPerTimeMm}
                    onChange={e => setEditingStandard({ ...editingStandard, grindingAmountPerTimeMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ระยะเจียรรวมสูงสุด Allowance (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingStandard.totalGrindingAllowanceMm}
                    onChange={e => setEditingStandard({ ...editingStandard, totalGrindingAllowanceMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">จำนวนรอบเจียรสูงสุด (Max Cycles)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingStandard.maxRegrindCount}
                    onChange={e => setEditingStandard({ ...editingStandard, maxRegrindCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStandard.regrindAllowed}
                    onChange={e => setEditingStandard({ ...editingStandard, regrindAllowed: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span className="font-bold text-slate-200">อนุญาตให้เจียร (Allowed)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStandard.disposeAfterOneUse}
                    onChange={e => setEditingStandard({ ...editingStandard, disposeAfterOneUse: e.target.checked })}
                    className="rounded border-slate-700 text-rose-600 focus:ring-0"
                  />
                  <span className="font-bold text-rose-300">ใช้ครั้งเดียวทิ้ง (Single Use)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStandard(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW MASTER STANDARD                                          */}
      {/* ========================================================================= */}
      {isAddStandardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>เพิ่มสเปคมาตรฐานอะไหล่เจียรใหม่ (New Standard)</span>
              </h3>
              <button
                onClick={() => setIsAddStandardModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStandard} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">รหัสอะไหล่ (Part Code) *</label>
                  <input
                    type="text"
                    value={newStandardForm.partCode}
                    onChange={e => setNewStandardForm({ ...newStandardForm, partCode: e.target.value })}
                    placeholder="เช่น FD-P7-EXPANDER"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ทูปไซส์ (Tube Size)</label>
                  <select
                    value={newStandardForm.tubeSizeCompat}
                    onChange={e => setNewStandardForm({ ...newStandardForm, tubeSizeCompat: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  >
                    <option value="Ø7">Ø7</option>
                    <option value="Ø5">Ø5</option>
                    <option value="BOTH">BOTH (ใช้ร่วมกัน)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ชื่อชิ้นส่วนอะไหล่ (Part Name) *</label>
                <input
                  type="text"
                  value={newStandardForm.partName}
                  onChange={e => setNewStandardForm({ ...newStandardForm, partName: e.target.value })}
                  placeholder="เช่น Expander Punch B"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ความยาวปกติ (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStandardForm.nominalLengthMm}
                    onChange={e => setNewStandardForm({ ...newStandardForm, nominalLengthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">เจียร/ครั้ง (mm)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newStandardForm.grindingAmountPerTimeMm}
                    onChange={e => setNewStandardForm({ ...newStandardForm, grindingAmountPerTimeMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">เจียรรวมสูงสุด (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStandardForm.totalGrindingAllowanceMm}
                    onChange={e => setNewStandardForm({ ...newStandardForm, totalGrindingAllowanceMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">จำนวนรอบเจียรสูงสุด (Max Cycles)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newStandardForm.maxRegrindCount}
                    onChange={e => setNewStandardForm({ ...newStandardForm, maxRegrindCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ลิมิตต่ำสุด (Min Length mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStandardForm.minAllowedLengthMm}
                    onChange={e => setNewStandardForm({ ...newStandardForm, minAllowedLengthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStandardModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-md"
                >
                  สร้างมาตรฐาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FULL INSPECTION RECORD DETAILS                                    */}
      {/* ========================================================================= */}
      {inspectModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>บันทึกงานเจียระไน: {inspectModalRecord.jobCode}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  LINE {inspectModalRecord.lineId || inspectModalRecord.lineLastUsed} • แม่พิมพ์ {inspectModalRecord.dieCode || inspectModalRecord.finDie}
                </span>
              </div>
              <button
                onClick={() => setInspectModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">สถานะปัจจุบัน:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] mt-0.5 ${
                  inspectModalRecord.status === 'READY TO USE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  inspectModalRecord.status === 'SCRAP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {inspectModalRecord.status}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Serial / Lot:</span>
                <span className="font-mono text-cyan-300">{inspectModalRecord.partInstanceOrLot || inspectModalRecord.serialNumber || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ชื่อชิ้นส่วน & รหัส:</span>
                <span className="font-bold text-slate-200">{inspectModalRecord.partName} ({inspectModalRecord.partCode})</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ช่างผู้ปฏิบัติงาน:</span>
                <span className="font-bold text-slate-200">{inspectModalRecord.performedBy || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ความยาวก่อนเจียร &rarr; หลังเจียร:</span>
                <span className="font-mono font-bold text-slate-100">
                  {inspectModalRecord.previousLength?.toFixed(2)} mm &rarr; {inspectModalRecord.currentLength?.toFixed(2)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ระยะที่เจียรออก (Removed):</span>
                <span className="font-mono font-bold text-cyan-300">
                  -{(inspectModalRecord.actualGrindingRemovedMm !== undefined ? inspectModalRecord.actualGrindingRemovedMm : (inspectModalRecord.mmRemovedThisCycle || 0)).toFixed(3)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">รอบการเจียร:</span>
                <span className="font-mono text-slate-200">
                  รอบที่ {inspectModalRecord.regrindCountAfter || inspectModalRecord.regrindCycleCount} / {inspectModalRecord.maxAllowedCycles || 4}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ผลการตรวจรับ QC:</span>
                <span className="font-bold text-emerald-400">{inspectModalRecord.inspectionResult || inspectModalRecord.inspectionStatus || 'PASSED'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 block mb-1">หมายเหตุ / ข้อมูลเพิ่มเติม:</span>
              <p className="italic">{inspectModalRecord.note || 'ไม่มีหมายเหตุเพิ่มเติม'}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectModalRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
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
