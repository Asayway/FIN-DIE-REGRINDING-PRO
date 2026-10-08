import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DateRangeFilter, isDateInSelectedRange } from '../components/common/DateRangeFilter';
import { 
  PlusCircle, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  Zap, 
  Layers,
  ArrowRight,
  AlertTriangle,
  FileText,
  Save,
  Trash2,
  Edit3,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Gauge,
  Activity,
  Download,
  AlertOctagon,
  Calendar,
  UserCheck,
  Split,
  ChevronRight,
  RefreshCw,
  Info,
  Terminal,
  Hash,
  Delete,
  Play,
  Square,
  Flame
} from 'lucide-react';
import { 
  ProductionLineId, 
  ShotEntryRecord, 
  LineLiveMonitoringData, 
  ShotInputMethod, 
  ShotSplitPeriod, 
  LineActiveConfiguration,
  LINE_INFO_MAP
} from '../types';
import { storageService } from '../services/storageService';
import { formatShots } from '../services/calculationService';
import { LineFilterSelector } from '../components/common/LineFilterSelector';
import { exportResetLogsExcel } from '../utils/excelExport';

interface ShotEntryViewProps {
  initialLineId?: ProductionLineId;
}

// Break Time Windows Definition for Mode 2 Break Deduction
const BREAK_WINDOWS = [
  // Day breaks
  { name: 'Morning Break', startMin: 600, endMin: 610, duration: 10 },      // 10:00 - 10:10
  { name: 'Lunch Break', startMin: 720, endMin: 780, duration: 60 },        // 12:00 - 13:00
  { name: 'Afternoon Break', startMin: 900, endMin: 910, duration: 10 },    // 15:00 - 15:10
  { name: 'Pre-OT Day Break', startMin: 1020, endMin: 1050, duration: 30 }, // 17:00 - 17:30
  // Night breaks
  { name: 'Night 1st Break', startMin: 1290, endMin: 1300, duration: 10 },  // 21:30 - 21:40
  { name: 'Midnight Meal Break', startMin: 1410, endMin: 1470, duration: 60 }, // 23:30 - 00:30
  { name: 'Late Night Break', startMin: 150, endMin: 160, duration: 10 },    // 02:30 - 02:40
  { name: 'Pre-OT Night Break', startMin: 270, endMin: 330, duration: 60 }  // 04:30 - 05:30
];

function calculateBreakOverlapMinutes(startDate: Date | null, endDate: Date | null): number {
  if (!startDate || !endDate || endDate <= startDate) return 0;
  let breakMinutes = 0;
  const cur = new Date(startDate.getTime());
  const end = endDate.getTime();

  while (cur.getTime() < end) {
    const h = cur.getHours();
    const m = cur.getMinutes();
    const minOfDay = h * 60 + m;

    const inBreak = BREAK_WINDOWS.some(w => {
      if (w.startMin <= w.endMin) {
        return minOfDay >= w.startMin && minOfDay < w.endMin;
      } else {
        return minOfDay >= 1410 || minOfDay < 30;
      }
    });

    if (inBreak) {
      breakMinutes += 1;
    }
    cur.setMinutes(cur.getMinutes() + 1);
  }

  return breakMinutes;
}

function getShiftInfo(date: Date = new Date()): { shiftName: string; shiftKey: 'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)'; description: string } {
  const h = date.getHours();
  const m = date.getMinutes();
  const minOfDay = h * 60 + m;

  // Special Overlap Periods
  if (minOfDay >= 450 && minOfDay < 480) { // 07:30 - 08:00
    return { shiftName: 'คาบเกี่ยวส่งมอบงาน (07:30 - 08:00)', shiftKey: 'Shift 2 (Night)', description: 'ช่วงคาบเกี่ยวกะดึก -> กะเช้า' };
  }
  if (minOfDay >= 480 && minOfDay <= 510) { // 08:00 - 08:30
    return { shiftName: 'คาบเกี่ยวเริ่มกะ (07:30 - 08:30)', shiftKey: 'Shift 1 (Day)', description: 'ช่วงเวลาพิเศษ คาบเกี่ยวกะเช้า' };
  }

  // Day Shift (08:00 - 17:00)
  if (minOfDay >= 480 && minOfDay < 1020) {
    return { shiftName: 'กะเช้า (08:00 - 17:00)', shiftKey: 'Shift 1 (Day)', description: 'กะเช้าปกติ (Day Shift)' };
  }

  // Day Shift OT (17:30 - 19:30 & 21:30)
  if (minOfDay >= 1050 && minOfDay < 1170) {
    return { shiftName: 'กะเช้า OT 1 (17:30 - 19:30)', shiftKey: 'Shift 3 (Overtime)', description: 'กะเช้า ต่อเวลาพิเศษ OT 1' };
  }
  if (minOfDay >= 1170 && minOfDay < 1290) {
    return { shiftName: 'กะเช้า OT 2 (19:30 - 21:30)', shiftKey: 'Shift 3 (Overtime)', description: 'กะเช้า ต่อเวลาพิเศษ OT 2' };
  }

  // Night Shift OT (06:30 - 07:30)
  if (minOfDay >= 390 && minOfDay < 450) {
    return { shiftName: 'กะดึก OT (06:30 - 07:30)', shiftKey: 'Shift 3 (Overtime)', description: 'กะดึก ต่อเวลาพิเศษ OT' };
  }

  // Night Shift (19:30 - 05:30)
  if (minOfDay >= 1170 || minOfDay < 330) {
    return { shiftName: 'กะดึก (19:30 - 05:30)', shiftKey: 'Shift 2 (Night)', description: 'กะดึกปกติ (Night Shift)' };
  }

  return { shiftName: 'กะพิเศษ (Special Shift)', shiftKey: 'Shift 3 (Overtime)', description: 'ช่วงปรับตั้งแม่พิมพ์ / พักเบรค' };
}

export const ShotEntryView: React.FC<ShotEntryViewProps> = ({ initialLineId = 'E1' }) => {
  const isHmi = false;
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>(initialLineId);
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'reset-logs' | 'drafts'>('entry');

  // Input Fields - Pure Manual Meter Reading Mode
  const [entryMode] = useState<'MODE_1'>('MODE_1');
  const [inputMethod, setInputMethod] = useState<ShotInputMethod>('METER_READING');
  const [productionDate, setProductionDate] = useState<string>(new Date().toISOString().substring(0, 10));
  
  // Real-time Shift Auto-Detection
  const initialShift = useMemo(() => getShiftInfo(new Date()), []);
  const [shift, setShift] = useState<'Shift 1 (Day)' | 'Shift 2 (Night)' | 'Shift 3 (Overtime)'>(initialShift.shiftKey);
  const [detectedShiftInfo, setDetectedShiftInfo] = useState(initialShift);
  const [entryReason, setEntryReason] = useState<string>('Daily Shift Production (การผลิตประจำกะ)');
  const [notes, setNotes] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [allowMultiEntry, setAllowMultiEntry] = useState<boolean>(false);
  const [showTouchKeypad, setShowTouchKeypad] = useState<boolean>(false);

  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Meter Reading States (Mode 1)
  const [previousReadingInput, setPreviousReadingInput] = useState<string>('0');
  const [newReadingInput, setNewReadingInput] = useState<string>('0');
  const [shotIncrementInput, setShotIncrementInput] = useState<string>('50000');

  // Mode 2: SPM Machine Simulation States
  const [spmInput, setSpmInput] = useState<number>(100);
  const [isMachineRunning, setIsMachineRunning] = useState<boolean>(false);
  const [machineStartTime, setMachineStartTime] = useState<Date | null>(null);
  const [machineStopTime, setMachineStopTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [mode2ActualShotsInput, setMode2ActualShotsInput] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mode 2: OEE Loss Time Modal State
  const [lossModalOpen, setLossModalOpen] = useState<boolean>(false);
  const [lossData, setLossData] = useState<{
    expected: number;
    actual: number;
    missing: number;
    lossMinutes: string;
    lossType: string;
    reason: string;
  } | null>(null);
  const [lossTypeInput, setLossTypeInput] = useState<string>('COIL_CHANGE');
  const [lossReasonInput, setLossReasonInput] = useState<string>('');

  // Split Configuration Interval (Advanced)
  const [enableSplitInterval, setEnableSplitInterval] = useState<boolean>(false);
  const [splitPeriod1Shots, setSplitPeriod1Shots] = useState<string>('25000');
  const [splitPeriod2Shots, setSplitPeriod2Shots] = useState<string>('25000');
  const [splitPeriod1Time, setSplitPeriod1Time] = useState<string>('08:00 - 14:00');
  const [splitPeriod2Time, setSplitPeriod2Time] = useState<string>('14:00 - 20:00');

  // Data States
  const [currentLine, setCurrentLine] = useState<LineLiveMonitoringData | null>(null);
  const [allConfigs, setAllConfigs] = useState<LineActiveConfiguration[]>([]);
  const [shotLogs, setShotLogs] = useState<ShotEntryRecord[]>([]);
  const [drafts, setDrafts] = useState<ShotEntryRecord[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState(storageService.getSettings());
  const currentUser = storageService.getCurrentUser();

  // Notification / Alert
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [counterResetModalOpen, setCounterResetModalOpen] = useState<boolean>(false);
  const [resetTargetScope, setResetTargetScope] = useState<ProductionLineId>('E1');
  const [resetNewMeterInput, setResetNewMeterInput] = useState<string>('0');
  const [resetPartWearOption, setResetPartWearOption] = useState<boolean>(true);
  const [resetShiftCountersOption, setResetShiftCountersOption] = useState<boolean>(true);
  const [resetApprovalIdInput, setResetApprovalIdInput] = useState<string>('RST-APPR-2026-001');
  const [resetApprovedByInput, setResetApprovedByInput] = useState<string>('');
  const [resetterNameInput, setResetterNameInput] = useState<string>('');
  const [resetReasonInput, setResetReasonInput] = useState<string>('เปลี่ยนมิเตอร์ใหม่ (New Counter Installation)');
  const [resetModalTab, setResetModalTab] = useState<'FORM' | 'LOGS'>('FORM');
  const [resetLogSearch, setResetLogSearch] = useState<string>('');
  const [resetLogLineFilter, setResetLogLineFilter] = useState<string>('ALL');
  const [resetLogStartDate, setResetLogStartDate] = useState<string>('');
  const [resetLogEndDate, setResetLogEndDate] = useState<string>('');

  const handleOpenResetModal = (lineId?: ProductionLineId) => {
    const target = lineId || selectedLineId || 'E1';
    setResetTargetScope(target);
    setResetterNameInput(''); // Force operator signature every single time
    setResetApprovedByInput('');
    setResetApprovalIdInput(`RST-APPR-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setResetNewMeterInput('0');
    setResetReasonInput('เปลี่ยนมิเตอร์ใหม่ (New Counter Installation)');
    setResetModalTab('FORM');
    setCounterResetModalOpen(true);
  };

  // History Filters
  const [historyLineFilter, setHistoryLineFilter] = useState<string>('ALL');
  const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');

  const linesList: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Shift Detection Clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const info = getShiftInfo(new Date());
      setDetectedShiftInfo(info);
    }, 10000);
    return () => clearInterval(clockInterval);
  }, []);

  // SPM Timer Effect for Mode 2
  useEffect(() => {
    if (isMachineRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMachineRunning]);

  const reloadData = () => {
    const monitoring = storageService.getLineMonitoring(selectedLineId);
    setCurrentLine(monitoring);
    setShotLogs(storageService.getShotLogs());
    setDrafts(storageService.getShotDrafts());
    setAllConfigs(storageService.getLineConfigs());
    setSystemSettings(storageService.getSettings());

    if (monitoring) {
      const prevTotal = monitoring.machineShotTotal || 0;
      setPreviousReadingInput(String(prevTotal));
      const inc = parseInt(shotIncrementInput.replace(/,/g, ''), 10) || 50000;
      setNewReadingInput(String(prevTotal + inc));
      
      if (monitoring.activeConfig?.defaultSpm && !isMachineRunning) {
        setSpmInput(monitoring.activeConfig.defaultSpm);
      }
    }
  };

  useEffect(() => {
    setOperatorName(''); // Force operator signature every time line changes
    reloadData();
    const unsub = storageService.subscribe(reloadData);
    return () => unsub();
  }, [selectedLineId]);

  // Mode 2 Calculations: Break Time Deduction
  const mode2ElapsedMinutes = elapsedSeconds / 60;
  const mode2BreakMinutes = useMemo(() => {
    if (!machineStartTime) return 0;
    const end = machineStopTime || new Date();
    return calculateBreakOverlapMinutes(machineStartTime, end);
  }, [machineStartTime, machineStopTime, elapsedSeconds]);

  const mode2NetWorkingMinutes = Math.max(0, mode2ElapsedMinutes - mode2BreakMinutes);
  const mode2ExpectedShots = Math.round(mode2NetWorkingMinutes * spmInput);

  const handleStartMachine = () => {
    if (isMachineRunning) return;
    setIsMachineRunning(true);
    setMachineStartTime(new Date());
    setMachineStopTime(null);
    setElapsedSeconds(0);
    showNotification('success', `Machine Running at ${spmInput} SPM on Line ${selectedLineId}`);
  };

  const handleStopMachine = () => {
    if (!isMachineRunning) return;
    setIsMachineRunning(false);
    setMachineStopTime(new Date());
    showNotification('info', `Machine Stopped. Expected Shots: ${mode2ExpectedShots.toLocaleString()} shots`);
  };

  // Sync calculations between Method A (Meter Reading) and Method B (Direct Increment)
  const handleNewReadingChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setNewReadingInput(cleaned);
    const prev = parseInt(previousReadingInput.replace(/,/g, ''), 10) || 0;
    const next = parseInt(cleaned || '0', 10) || 0;
    const diff = next - prev;
    setShotIncrementInput(String(Math.max(0, diff)));
  };

  const handleIncrementChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setShotIncrementInput(cleaned);
    const prev = parseInt(previousReadingInput.replace(/,/g, ''), 10) || 0;
    const inc = parseInt(cleaned || '0', 10) || 0;
    setNewReadingInput(String(prev + inc));
  };

  const handleQuickAddIncrement = (addQty: number) => {
    const prev = parseInt(previousReadingInput.replace(/,/g, ''), 10) || 0;
    const currentNew = parseInt(newReadingInput.replace(/,/g, ''), 10) || prev;
    const target = currentNew < prev ? prev + addQty : currentNew + addQty;
    handleNewReadingChange(String(target));
  };

  // Touchpad input for shopfloor glove use
  const handleKeypadPress = (key: string) => {
    if (entryMode === 'MODE_1') {
      if (key === 'CLEAR') {
        setNewReadingInput('0');
        handleNewReadingChange('0');
      } else if (key === 'BACKSPACE') {
        const nextVal = newReadingInput.length > 1 ? newReadingInput.slice(0, -1) : '0';
        handleNewReadingChange(nextVal);
      } else {
        const nextVal = newReadingInput === '0' ? key : newReadingInput + key;
        handleNewReadingChange(nextVal);
      }
    } else if (entryMode === 'MODE_2') {
      if (key === 'CLEAR') {
        setMode2ActualShotsInput('');
      } else if (key === 'BACKSPACE') {
        setMode2ActualShotsInput(prev => prev.length > 1 ? prev.slice(0, -1) : '');
      } else {
        setMode2ActualShotsInput(prev => prev + key);
      }
    }
  };

  // Derived Values & Validations
  const prevShotsVal = useMemo(() => parseInt(previousReadingInput.replace(/,/g, ''), 10) || 0, [previousReadingInput]);
  const newShotsVal = useMemo(() => parseInt(newReadingInput.replace(/,/g, ''), 10) || 0, [newReadingInput]);
  
  const incrementVal = useMemo(() => {
    if (entryMode === 'MODE_2') {
      return parseInt(mode2ActualShotsInput.replace(/,/g, ''), 10) || 0;
    }
    if (enableSplitInterval) {
      const s1 = parseInt(splitPeriod1Shots.replace(/,/g, ''), 10) || 0;
      const s2 = parseInt(splitPeriod2Shots.replace(/,/g, ''), 10) || 0;
      return s1 + s2;
    }
    return newShotsVal - prevShotsVal;
  }, [entryMode, mode2ActualShotsInput, newShotsVal, prevShotsVal, enableSplitInterval, splitPeriod1Shots, splitPeriod2Shots]);

  const resultingTotal = useMemo(() => prevShotsVal + incrementVal, [prevShotsVal, incrementVal]);

  const isIncrementPositive = incrementVal > 0;
  const isLowerReadingDetected = entryMode === 'MODE_1' && newShotsVal < prevShotsVal;
  const maxShiftLimit = systemSettings.maxShotsPerShift || 150000;
  const isAbnormalIncrease = incrementVal > maxShiftLimit;

  // Duplicate Check
  const isDuplicateEntry = useMemo(() => {
    return storageService.checkDuplicateShotEntry(selectedLineId, productionDate, shift);
  }, [selectedLineId, productionDate, shift, shotLogs]);

  // Active Tooling Configuration on Target Line
  const activeConfig = currentLine?.activeConfig || null;

  // Split periods payload if enabled
  const getSplitPeriodsPayload = (): ShotSplitPeriod[] | undefined => {
    if (!enableSplitInterval) return undefined;
    const s1 = parseInt(splitPeriod1Shots.replace(/,/g, ''), 10) || 0;
    const s2 = parseInt(splitPeriod2Shots.replace(/,/g, ''), 10) || 0;
    return [
      {
        configId: activeConfig?.id || `CFG-${selectedLineId}-1`,
        dieCode: activeConfig?.dieCode || 'PRIMARY-DIE',
        configurationSlot: activeConfig?.configurationSlot || 'Slot 1',
        shotsAdded: s1,
        timeInterval: splitPeriod1Time,
        reason: 'Period 1 Production'
      },
      {
        configId: `CFG-${selectedLineId}-2`,
        dieCode: `${activeConfig?.dieCode || 'DIE'}-ALT`,
        configurationSlot: 'Slot 2 (Model Changeover)',
        shotsAdded: s2,
        timeInterval: splitPeriod2Time,
        reason: 'Period 2 Post-Changeover Production'
      }
    ];
  };

  // Submission handler with Mode 2 Loss Time Catcher Check
  const handleOpenSubmissionPreview = () => {
    const isLineStopped = !!(currentLine?.machineStatus && currentLine.machineStatus !== 'RUNNING');
    if (isLineStopped) {
      const statusLabel = currentLine.machineStatus === 'STOPPED' 
        ? 'ปิดไลน์ผลิต (STOPPED)' 
        : currentLine.machineStatus === 'MAINTENANCE' 
        ? 'ซ่อมบำรุง (MAINTENANCE)' 
        : 'พักสายการผลิต (IDLE)';
      showNotification('error', `ไม่สามารถบันทึกยอดช็อตได้ เนื่องจากสายการผลิต ${selectedLineId} อยู่ในสถานะ "${statusLabel}"`);
      return;
    }

    if (!operatorName.trim()) {
      showNotification('error', 'กรุณาระบุชื่อพนักงานผู้บันทึก (Operator Name is required) - บังคับลงชื่อพนักงานทุกครั้งก่อนทำรายการ');
      return;
    }
    if (!shift) {
      showNotification('error', 'กรุณาเลือกกะการผลิต (Shift is strictly required) - บังคับเลือกกะ');
      return;
    }
    const newReadingVal = parseInt(newReadingInput.replace(/,/g, ''), 10);
    if (isNaN(newReadingVal) || newReadingInput.trim() === '') {
      showNotification('error', 'กรุณาระบุเลขมิเตอร์ใหม่ (New Reading is strictly mandatory) - บังคับกรอกเลขมิเตอร์');
      return;
    }
    if (entryMode === 'MODE_1' && isLowerReadingDetected) {
      showNotification('error', 'New Machine Reading is lower than Previous Reading. If a counter reset occurred, please use Counter Reset.');
      return;
    }
    if (!isIncrementPositive) {
      showNotification('error', 'Shot Increment must be greater than 0 (ยอดช็อตที่เพิ่มต้องมากกว่า 0)');
      return;
    }

    // MODE 2: OEE Loss Time Catcher Verification
    if (entryMode === 'MODE_2') {
      const actualVal = parseInt(mode2ActualShotsInput.replace(/,/g, ''), 10) || 0;
      if (actualVal < mode2ExpectedShots) {
        const missing = mode2ExpectedShots - actualVal;
        const lossMins = (missing / (spmInput || 100)).toFixed(1);
        setLossData({
          expected: mode2ExpectedShots,
          actual: actualVal,
          missing,
          lossMinutes: lossMins,
          lossType: 'COIL_CHANGE',
          reason: ''
        });
        setLossModalOpen(true);
        return;
      }
    }

    if (isDuplicateEntry && !allowMultiEntry) {
      showNotification('error', `Duplicate entry found for Line ${selectedLineId} on ${productionDate} (${shift}). Check "Allow Multi-Entry" if intentional.`);
      return;
    }

    const preview = storageService.previewShotSubmission({
      lineId: selectedLineId,
      shotsAdded: incrementVal,
      splitPeriods: getSplitPeriodsPayload()
    });

    setPreviewData(preview);
    setPreviewModalOpen(true);
  };

  const handleConfirmFinalSubmit = (customNotes?: string) => {
    if (!operatorName.trim()) {
      showNotification('error', 'กรุณาระบุชื่อพนักงานผู้บันทึก (Operator Name is strictly mandatory) ก่อนบันทึกข้อมูล');
      return;
    }
    const finalNotes = [notes, customNotes].filter(Boolean).join(' | ');

    const result = storageService.submitShotEntry({
      lineId: selectedLineId,
      productionDate,
      shift,
      inputMethod,
      previousTotal: prevShotsVal,
      newTotal: resultingTotal,
      shotsAdded: incrementVal,
      entryReason,
      notes: finalNotes,
      operatorName: operatorName.trim(),
      draftId: activeDraftId || undefined,
      allowMultiEntry,
      splitPeriods: getSplitPeriodsPayload()
    });

    if (result.success && result.record) {
      setPreviewModalOpen(false);
      setLossModalOpen(false);
      setActiveDraftId(null);
      if (entryMode === 'MODE_2') setMode2ActualShotsInput('');
      showNotification('success', `SUBMITTED: +${incrementVal.toLocaleString()} shots on Line ${selectedLineId}. New Meter Total: ${resultingTotal.toLocaleString()} shots.`);
      setNotes('');
      setOperatorName(''); // Clear operator signature after submit
      reloadData();
    } else {
      showNotification('error', result.error || 'Submission failed.');
    }
  };

  const handleConfirmLossAndSubmit = () => {
    if (!operatorName.trim()) {
      showNotification('error', 'กรุณาระบุชื่อพนักงานผู้บันทึก (Operator Name is required)');
      return;
    }
    if (!lossReasonInput.trim()) {
      showNotification('error', 'กรุณาระบุรายละเอียด Action / Remarks สำหรับยอดที่สูญเสีย');
      return;
    }
    const lossNote = `[OEE LOSS: ${lossTypeInput} - ${lossData?.lossMinutes} min lost] ${lossReasonInput}`;
    handleConfirmFinalSubmit(lossNote);
  };

  const handleSaveDraft = () => {
    if (!operatorName.trim()) {
      showNotification('error', 'กรุณาระบุชื่อพนักงานผู้บันทึก (Operator Name is required) ก่อนบันทึกแบบร่าง (Draft)');
      return;
    }
    const draftRecord = storageService.saveShotDraft({
      id: activeDraftId || undefined,
      lineId: selectedLineId,
      configurationId: activeConfig?.id,
      configurationSlot: activeConfig?.configurationSlot,
      dieCode: activeConfig?.dieCode,
      productionDate,
      shift,
      inputMethod,
      previousTotal: prevShotsVal,
      newTotal: resultingTotal,
      shotsAdded: incrementVal,
      entryReason,
      notes,
      operatorName: operatorName.trim(),
      allowMultiEntry,
      splitPeriods: getSplitPeriodsPayload()
    });
    setActiveDraftId(draftRecord.id);
    showNotification('info', `Saved draft: ${draftRecord.id}`);
  };

  const handleExecuteCounterReset = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeter = parseInt(resetNewMeterInput.replace(/,/g, ''), 10);
    if (isNaN(newMeter) || newMeter < 0) {
      showNotification('error', 'กรุณาระบุเลขมิเตอร์ที่เป็นจำนวนเต็มบวกหรือ 0 (Please enter a valid non-negative counter reading)');
      return;
    }

    if (!resetterNameInput.trim()) {
      showNotification('error', 'กรุณาระบุชื่อผู้ทำรายการรีเซ็ต (Please enter Resetted By name)');
      return;
    }

    if (!resetReasonInput.trim()) {
      showNotification('error', 'กรุณาระบุเหตุผลการรีเซ็ต (Please enter Reset Reason)');
      return;
    }

    const currentLineData = storageService.getLineMonitoring(resetTargetScope);
    const oldMeterVal = currentLineData?.machineShotTotal || 0;

    const result = storageService.executeCounterReset({
      targetLine: resetTargetScope,
      lineId: resetTargetScope,
      previousTotal: oldMeterVal,
      newResetTotal: newMeter,
      resetPartWear: resetPartWearOption,
      resetShiftCounters: resetShiftCountersOption,
      approvalId: resetApprovalIdInput,
      approvedBy: resetApprovedByInput || resetterNameInput,
      resettedBy: resetterNameInput,
      resetReason: resetReasonInput,
      shift,
      productionDate,
      notes: `Line ${resetTargetScope} counter reset from ${oldMeterVal.toLocaleString()} -> ${newMeter.toLocaleString()} shots by ${resetterNameInput}. Reason: ${resetReasonInput}`
    });

    if (result.success) {
      const nowFormatted = new Date().toLocaleTimeString('th-TH');
      showNotification('success', `✅ รีเซ็ตช็อตสำเร็จ: สาย ${resetTargetScope} -> มิเตอร์ใหม่ ${newMeter.toLocaleString()} ช็อต [บันทึกเวลา ${nowFormatted}]`);
      if (resetTargetScope === selectedLineId) {
        setPreviousReadingInput(String(newMeter));
        setNewReadingInput(String(newMeter + 50000));
      }
      reloadData();
      setResetModalTab('LOGS');
    } else {
      showNotification('error', result.error || 'Counter reset failed');
    }
  };

  // Filtered Counter Reset History Logs
  const resetLogs = useMemo(() => {
    return shotLogs
      .filter(log => {
        const isReset = log.isCounterReset || log.entryType === 'COUNTER_RESET' || (log.entryReason && log.entryReason.includes('Counter Reset'));
        if (!isReset) return false;
        if (resetLogLineFilter !== 'ALL' && log.lineId !== resetLogLineFilter) return false;
        if (!isDateInSelectedRange(log.productionDate || log.timestamp, resetLogStartDate, resetLogEndDate)) return false;
        if (resetLogSearch.trim()) {
          const q = resetLogSearch.toLowerCase();
          const matchLine = log.lineId.toLowerCase().includes(q);
          const matchOp = (log.operatorName || '').toLowerCase().includes(q);
          const matchReason = (log.resetReason || log.entryReason || '').toLowerCase().includes(q);
          const matchAppr = (log.resetApprovedBy || log.resetApprovalId || '').toLowerCase().includes(q);
          if (!matchLine && !matchOp && !matchReason && !matchAppr) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [shotLogs, resetLogLineFilter, resetLogSearch, resetLogStartDate, resetLogEndDate]);

  // Filtered History
  const filteredShotLogs = useMemo(() => {
    return shotLogs.filter(log => {
      if (historyLineFilter !== 'ALL' && log.lineId !== historyLineFilter) return false;
      if (historyShiftFilter !== 'ALL' && log.shift !== historyShiftFilter) return false;
      if (!isDateInSelectedRange(log.productionDate || log.timestamp, historyStartDate, historyEndDate)) return false;
      if (historySearch) {
        const query = historySearch.toLowerCase();
        const matchId = log.id.toLowerCase().includes(query);
        const matchOp = (log.operatorName || '').toLowerCase().includes(query);
        const matchNotes = (log.notes || '').toLowerCase().includes(query);
        if (!matchId && !matchOp && !matchNotes) return false;
      }
      return true;
    });
  }, [shotLogs, historyLineFilter, historyShiftFilter, historySearch, historyStartDate, historyEndDate]);

  return (
    <div className="space-y-2.5 select-none font-sans">
      
      {/* Top Header: Integrated Line Bar + Terminal Header + Action Tabs (Sticky Locked at Top) */}
      <div className={`sticky top-0 z-30 backdrop-blur-md rounded-lg p-2 sm:p-2.5 shadow-xl space-y-2 border ${
        isHmi 
          ? 'bg-black/95 border-2 border-green-500 text-green-400' 
          : 'bg-[#0E172A]/95 border-slate-800/90 text-slate-100'
      }`}>
        
        {/* Row 1: Terminal Title & Line Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md border ${
              isHmi 
                ? 'bg-green-950 border-green-500 text-green-400' 
                : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                isHmi ? 'text-green-400 font-mono font-extrabold' : 'text-white font-["Plus_Jakarta_Sans"]'
              }`}>
                SHOT CONTROL (LINE {selectedLineId})
              </h2>
              <p className={`text-[10px] flex items-center gap-1.5 ${isHmi ? 'text-green-500/80 font-mono' : 'text-slate-400'}`}>
                <span>DIE: <strong className="text-cyan-300">{currentLine?.activeConfig?.dieCode || `FD-${selectedLineId}-07`}</strong></span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{detectedShiftInfo.shiftName}</span>
              </p>
            </div>
          </div>

          {/* Line Selector Pills */}
          <div className="w-full sm:w-auto flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 pt-0.5 custom-scrollbar flex-nowrap sm:flex-wrap">
            <LineFilterSelector
              selectedLine={selectedLineId}
              onSelectLine={(line) => setSelectedLineId(line)}
              isHmi={isHmi}
              label="LINE:"
            />
          </div>
        </div>

        {/* Row 2: Action Tabs & Help Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          <div className={`flex items-center gap-1 p-0.5 rounded-md border ${
            isHmi ? 'bg-zinc-950 border-green-900' : 'bg-slate-950 border-slate-800'
          }`}>
            <button
              onClick={() => setActiveTab('entry')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'entry'
                  ? isHmi
                    ? 'bg-green-500 text-black shadow-sm font-extrabold ring-1 ring-green-300'
                    : 'bg-cyan-500 text-slate-950 shadow-sm font-bold ring-1 ring-cyan-300'
                  : isHmi
                    ? 'text-green-400 hover:bg-green-950/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RECORD</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'history'
                  ? isHmi
                    ? 'bg-green-500 text-black shadow-sm font-extrabold ring-1 ring-green-300'
                    : 'bg-cyan-500 text-slate-950 shadow-sm font-bold ring-1 ring-cyan-300'
                  : isHmi
                    ? 'text-green-400 hover:bg-green-950/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>LOGS ({Math.min(10, shotLogs.length)})</span>
            </button>

            <button
              onClick={() => handleOpenResetModal(selectedLineId)}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                isHmi
                  ? 'bg-zinc-900 hover:bg-amber-950 text-amber-400 border-amber-600/70'
                  : 'bg-slate-900 hover:bg-amber-950/60 text-amber-300 border-amber-600/60'
              }`}
              title="รีเซ็ตมิเตอร์หน้าเครื่อง"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>RESET METER</span>
            </button>

            <button
              onClick={() => setActiveTab('reset-logs')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'reset-logs'
                  ? isHmi
                    ? 'bg-amber-500 text-black shadow-sm font-extrabold ring-1 ring-amber-300'
                    : 'bg-amber-500 text-slate-950 shadow-sm font-bold ring-1 ring-amber-300'
                  : isHmi
                    ? 'bg-zinc-900 hover:bg-amber-950/80 text-amber-400 border border-amber-600/70'
                    : 'bg-slate-900 hover:bg-amber-950/60 text-amber-300 border border-amber-600/60'
              }`}
              title="ดูประวัติการรีเซ็ตมิเตอร์"
            >
              <History className="w-3.5 h-3.5" />
              <span>RESET LOGS ({resetLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showGuide
                ? isHmi ? 'bg-green-950 text-green-300 border-green-700' : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : isHmi ? 'bg-black text-green-400 border-green-900 hover:bg-zinc-900' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showGuide ? 'ซ่อนคู่มือ' : 'คู่มือ'}</span>
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between shadow-lg ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
            : notification.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500 text-rose-200' 
            : notification.type === 'warning' 
            ? 'bg-amber-950/90 border-amber-500 text-amber-200' 
            : isHmi
            ? 'bg-zinc-950 border-green-500 text-green-300'
            : 'bg-slate-900 border-cyan-500 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {notification.type === 'error' && <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            {notification.type === 'info' && <Info className={`w-4 h-4 flex-shrink-0 ${isHmi ? 'text-green-400' : 'text-cyan-400'}`} />}
            <span className="font-bold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-1 active:scale-90 active:bg-slate-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LINE OPERATIONAL STATUS WARNING (If line is STOPPED, IDLE, or MAINTENANCE) */}
      {currentLine?.machineStatus && currentLine.machineStatus !== 'RUNNING' && (
        <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
          currentLine.machineStatus === 'STOPPED'
            ? 'bg-rose-950/90 border-rose-500/80 text-rose-200'
            : currentLine.machineStatus === 'IDLE'
            ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
            : 'bg-cyan-950/90 border-cyan-500/80 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-300" />
            <div>
              <span className="font-extrabold uppercase font-sans text-sm block">
                ⚠️ สถานะสายการผลิต {selectedLineId}: {
                  currentLine.machineStatus === 'STOPPED' ? '🔴 STOPPED (ปิดไลน์ผลิต)' :
                  currentLine.machineStatus === 'IDLE' ? '🟡 IDLE (พักสายการผลิต / ไม่มีแผน)' :
                  '🔧 MAINTENANCE (ซ่อมบำรุง / ปรับเปลี่ยนแม่พิมพ์)'
                }
              </span>
              <p className="text-[11px] opacity-90 font-thai mt-0.5">
                สามารถเปลี่ยนสถานะสายการผลิตกลับเป็น RUNNING ได้ตลอดเวลาในหน้า "ศูนย์ตั้งค่าสายการผลิต (Line Settings)"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MAIN ENTRY FORM (STREAMLINED MINIMALIST MANUAL OPERATOR INTERFACE) */}
      {activeTab === 'entry' && (() => {
        const isLineStopped = !!(currentLine?.machineStatus && currentLine.machineStatus !== 'RUNNING');
        return (
        <div className="max-w-2xl mx-auto w-full space-y-2.5">
          
          <div className={`rounded-xl p-3 sm:p-4 space-y-3 shadow-lg border ${
            isHmi 
              ? 'bg-black border-2 border-green-500/90' 
              : 'bg-[#0E172A] border-slate-800/90'
          }`}>
            
            {/* Line Stopped / Maintenance Warning Notice */}
            {isLineStopped && (
              <div className="p-3 rounded-lg border-2 border-rose-500/90 bg-rose-950/80 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-md">
                <AlertOctagon className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5 animate-pulse" />
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-rose-300 font-sans flex items-center gap-1.5">
                    <span>🔒 ปิดรับการกรอกช็อต: สายการผลิต {selectedLineId} อยู่ในสถานะ {
                      currentLine?.machineStatus === 'STOPPED' ? '🔴 ปิดไลน์ผลิต (STOPPED)' :
                      currentLine?.machineStatus === 'MAINTENANCE' ? '🔧 ซ่อมบำรุง (MAINTENANCE)' :
                      '🟡 พักสายการผลิต (IDLE)'
                    }</span>
                  </div>
                  <p className="text-[10px] font-thai leading-relaxed text-rose-200">
                    ไม่อนุญาตให้บันทึกยอดช็อตหรือแก้ไขมิเตอร์สำหรับสายการผลิตที่ปิดหรืออยู่ระหว่างซ่อมบำรุง สามารถเปลี่ยนสถานะกลับเป็น <strong>RUNNING</strong> ได้ที่หน้า "LINE CONFIG"
                  </p>
                </div>
              </div>
            )}

            {/* Operator Instructions / Help Guide (Collapsible) */}
            {showGuide && (
              <div className={`p-2.5 rounded-lg border text-xs space-y-2 animate-fadeIn ${
                isHmi ? 'bg-zinc-950 border-green-800 text-green-300' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <div className="flex items-start gap-2">
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHmi ? 'text-green-400' : 'text-cyan-400'}`} />
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isHmi ? 'text-green-400' : 'text-white'}`}>
                        คู่มือบันทึกยอดช็อต (MANUAL METER ENTRY GUIDE)
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700">
                        MANUAL MODE
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-[10px] font-thai">
                      กรอกตัวเลขมิเตอร์จริงที่อ่านได้จากหน้าตู้ควบคุม (Panel Meter) ระบบจะคำนวณผลต่างยอดช็อต <code className="text-emerald-400 font-mono font-bold">(New - Previous)</code> และสะสมเข้าอะไหล่อัตโนมัติ
                    </p>

                    <div className="text-[10px] space-y-0.5 font-thai leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800">
                      <div className="font-bold text-emerald-400 flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ข้อกำหนดสำคัญ:
                      </div>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-slate-300 text-[10px]">
                        <li><strong className="text-white">ลงชื่อพนักงานผู้บันทึกทุกครั้ง</strong> เพื่อการตรวจสอบ Audit Trail</li>
                        <li>ยอดช็อตเพิ่มขึ้นจะสะสมเข้าอะไหล่แม่พิมพ์ที่ติดตั้งในสายผลิตนั้นทันที</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Core Operator Controls: Line, Shift & Operator Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* 1. Production Line Dropdown */}
              <div className="space-y-1">
                <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                  isHmi ? 'text-green-400' : 'text-slate-300'
                }`}>
                  <span className="flex items-center gap-1">
                    <Gauge className={`w-3 h-3 ${isHmi ? 'text-green-400' : 'text-cyan-400'}`} />
                    1. LINE (สายผลิต)
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedLineId}
                  onChange={e => setSelectedLineId(e.target.value as ProductionLineId)}
                  className={`w-full rounded-md px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-1 border transition-colors ${
                    isHmi
                      ? 'bg-zinc-950 border border-green-500/80 text-green-300 focus:border-green-400'
                      : 'bg-slate-950 border-slate-700/90 text-white focus:border-cyan-400'
                  }`}
                >
                  {linesList.map(line => {
                    const lineCfg = allConfigs.find(c => c.lineId === line && (c.isActive || c.status === 'ACTIVE')) || allConfigs.find(c => c.lineId === line);
                    const lineDie = lineCfg?.dieCode || 'N/A';
                    const displayLine = line.startsWith('E3-') ? 'E3' : line;
                    const tag = LINE_INFO_MAP[line]?.shortTag || line;
                    return (
                      <option key={line} value={line} className={isHmi ? 'bg-black text-green-400' : 'bg-slate-900 text-slate-100'}>
                        LINE {displayLine} ({tag}) | DIE: {lineDie}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Shift Dropdown */}
              <div className="space-y-1">
                <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                  isHmi ? 'text-green-400' : 'text-slate-300'
                }`}>
                  <span className="flex items-center gap-1">
                    <Clock className={`w-3 h-3 ${isHmi ? 'text-green-400' : 'text-cyan-400'}`} />
                    2. SHIFT (กะ)
                  </span>
                  <span className="text-emerald-400 text-[9px] font-mono">[{detectedShiftInfo.shiftKey.slice(0, 7)}]</span>
                </label>
                <select
                  value={shift}
                  disabled={isLineStopped}
                  onChange={e => setShift(e.target.value as any)}
                  className={`w-full rounded-md px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-1 border transition-colors ${
                    isLineStopped
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                      : isHmi
                      ? 'bg-zinc-950 border border-green-500/80 text-green-300 focus:border-green-400'
                      : 'bg-slate-950 border-slate-700/90 text-white focus:border-cyan-400'
                  }`}
                >
                  <option value="Shift 1 (Day)" className={isHmi ? 'bg-black text-green-400' : 'bg-slate-900 text-slate-100'}>กะ 1 (DAY)</option>
                  <option value="Shift 2 (Night)" className={isHmi ? 'bg-black text-green-400' : 'bg-slate-900 text-slate-100'}>กะ 2 (NIGHT)</option>
                  <option value="Shift 3 (Overtime)" className={isHmi ? 'bg-black text-green-400' : 'bg-slate-900 text-slate-100'}>กะ 3 (OT)</option>
                </select>
              </div>

              {/* 3. Operator Name Input */}
              <div className="space-y-1">
                <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                  isHmi ? 'text-green-400' : 'text-slate-300'
                }`}>
                  <span className="flex items-center gap-1">
                    <UserCheck className={`w-3 h-3 ${isHmi ? 'text-green-400' : 'text-cyan-400'}`} />
                    3. OPERATOR (ผู้บันทึก)
                  </span>
                  <span className="text-rose-400 font-mono text-[9px] font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isLineStopped}
                    value={operatorName}
                    onChange={e => setOperatorName(e.target.value)}
                    placeholder={isLineStopped ? "สายการผลิตปิด..." : "ชื่อพนักงาน..."}
                    className={`w-full rounded-md px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-1 transition-all ${
                      isLineStopped
                        ? 'bg-slate-900/50 border border-slate-800 text-slate-500 cursor-not-allowed'
                        : !operatorName.trim()
                        ? 'border border-rose-500/80 bg-rose-950/20 text-rose-200 placeholder-rose-400/60 focus:border-rose-400'
                        : isHmi
                        ? 'bg-zinc-950 border border-green-500/80 text-green-300 focus:border-green-400'
                        : 'bg-slate-950 border border-slate-700/90 text-white focus:border-cyan-400'
                    }`}
                    required
                  />
                  {!isLineStopped && !operatorName.trim() && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-400 pointer-events-none">
                      จำเป็น
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Readouts & Input Section */}
            <div className={`rounded-lg p-2.5 sm:p-3 space-y-2.5 border ${
              isHmi ? 'bg-zinc-950 border border-green-500/80' : 'bg-slate-950 border border-slate-800/90'
            }`}>
              
              {/* Previous Reading & Calculated Result */}
              <div className={`grid grid-cols-2 gap-2 pb-2 border-b ${
                isHmi ? 'border-green-900/80' : 'border-slate-800'
              }`}>
                <div className={`p-2 rounded-md border ${
                  isHmi ? 'bg-black border-green-900' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${
                    isHmi ? 'text-green-500' : 'text-slate-400'
                  }`}>
                    PREVIOUS READING (เดิม)
                  </div>
                  <div className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 ${
                    isHmi ? 'text-green-300' : 'text-slate-100'
                  }`}>
                    {formatShots(prevShotsVal)} <span className="text-[9px] font-normal text-slate-500">shots</span>
                  </div>
                </div>

                <div className={`p-2 rounded-md border ${
                  isHmi ? 'bg-black border-green-900' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${
                    isHmi ? 'text-green-500' : 'text-slate-400'
                  }`}>
                    INCREMENT (ยอดเพิ่ม)
                  </div>
                  <div className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 flex items-center justify-between ${
                    isHmi ? 'text-green-400' : 'text-emerald-400'
                  }`}>
                    <span>+{formatShots(incrementVal)}</span>
                    <span className="text-[9px] font-normal text-slate-500">shots</span>
                  </div>
                </div>
              </div>

              {/* MANUAL METER READING INPUT */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isHmi ? 'text-green-400 font-mono' : 'text-cyan-300'
                  }`}>
                    <Hash className="w-3.5 h-3.5" />
                    NEW READING (กรอกเลขมิเตอร์หน้าเครื่อง)
                  </label>
                  <button
                    type="button"
                    disabled={isLineStopped}
                    onClick={() => setShowTouchKeypad(!showTouchKeypad)}
                    className={`text-[9px] px-2 py-0.5 rounded border font-bold transition-colors ${
                      isLineStopped
                        ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                        : isHmi 
                        ? 'bg-green-950 text-green-300 border-green-600 hover:bg-green-900'
                        : 'bg-slate-900 text-cyan-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {showTouchKeypad ? '✕ HIDE KEYPAD' : '⌨ TOUCH KEYPAD'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLineStopped}
                    value={newReadingInput}
                    onChange={e => handleNewReadingChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className={`w-full text-2xl sm:text-3xl font-black font-mono py-2.5 px-3 text-center rounded-lg tracking-wider focus:outline-none border-2 transition-all ${
                      isLineStopped
                        ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed shadow-none'
                        : isHmi
                        ? 'bg-black border-green-500 focus:border-green-300 text-green-400 selection:bg-green-500 selection:text-black'
                        : 'bg-slate-900 border-cyan-500/80 focus:border-cyan-300 text-cyan-400 selection:bg-cyan-500 selection:text-slate-950 shadow-inner'
                    }`}
                    placeholder="0"
                    required
                  />
                  <div className={`text-center text-[10px] mt-0.5 font-mono ${isHmi ? 'text-green-500/80' : 'text-slate-400'}`}>
                    Delta: <strong className={isHmi ? 'text-green-300' : 'text-emerald-400'}>+{formatShots(incrementVal)} shots</strong> ({newShotsVal.toLocaleString()} - {prevShotsVal.toLocaleString()})
                  </div>
                </div>

                {/* Quick Add Step Buttons */}
                <div className="space-y-1 pt-0.5">
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${isHmi ? 'text-green-500' : 'text-slate-400'}`}>
                    QUICK ADD (บวกยอดด่วน):
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[5000, 10000, 25000, 50000, 100000].map(addQty => (
                      <button
                        key={addQty}
                        type="button"
                        disabled={isLineStopped}
                        onClick={() => handleQuickAddIncrement(addQty)}
                        className={`py-1.5 px-0.5 rounded text-[10px] font-bold font-mono transition-all border active:scale-95 touch-manipulation flex items-center justify-center ${
                          isLineStopped
                            ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600 bg-slate-950'
                            : isHmi
                            ? 'bg-black hover:bg-green-950 text-green-300 border-green-600 active:bg-green-400 active:text-black'
                            : 'bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border-slate-700/90 active:bg-cyan-400 active:text-slate-950'
                        }`}
                      >
                        +{addQty >= 1000 ? `${addQty / 1000}k` : addQty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Touch Keypad */}
              {showTouchKeypad && !isLineStopped && (
                <div className={`p-2 rounded-md grid grid-cols-3 gap-1.5 text-base font-bold font-mono animate-fadeIn border ${
                  isHmi ? 'bg-black border-green-500' : 'bg-slate-900 border-slate-700'
                }`}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACKSPACE'].map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`py-2 rounded-md border font-mono font-black transition-all active:scale-90 touch-manipulation select-none flex items-center justify-center ${
                        key === 'CLEAR'
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 hover:bg-rose-900 text-xs active:bg-rose-500 active:text-black'
                          : key === 'BACKSPACE'
                          ? isHmi
                            ? 'bg-zinc-900 border-green-700 text-green-300 hover:bg-zinc-800 text-xs active:bg-green-500 active:text-black'
                            : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 text-xs active:bg-cyan-400 active:text-slate-950'
                          : isHmi
                            ? 'bg-zinc-950 border border-green-500/80 text-green-400 hover:bg-green-950 text-base active:bg-green-400 active:text-black'
                            : 'bg-slate-950 border border-slate-700 text-slate-100 hover:bg-cyan-950/40 text-base active:bg-cyan-400 active:text-slate-950'
                      }`}
                    >
                      {key === 'BACKSPACE' ? <Delete className="w-4 h-4 stroke-[2.5]" /> : key}
                    </button>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {isLowerReadingDetected && (
                <div className="p-2 bg-amber-950/90 border border-amber-500 rounded-md text-xs text-amber-200 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-[11px]">METER READING LOWER THAN PREVIOUS</div>
                    <div className="text-[10px]">
                      New Reading ({newShotsVal.toLocaleString()}) cannot be less than Previous ({prevShotsVal.toLocaleString()}).
                    </div>
                  </div>
                </div>
              )}

              {isAbnormalIncrease && (
                <div className="p-2 bg-rose-950/90 border border-rose-500 rounded-md text-xs text-rose-200 flex items-start gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[10px]">
                    <div className="font-bold">HIGH INCREMENT WARNING (+{incrementVal.toLocaleString()} shots)</div>
                    <div>Increment exceeds standard limit of {maxShiftLimit.toLocaleString()} shots.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Submit Button */}
            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={handleOpenSubmissionPreview}
                disabled={isLineStopped || !isIncrementPositive || isLowerReadingDetected}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-md active:scale-95 touch-manipulation select-none ${
                  isLineStopped
                    ? 'bg-rose-950/40 text-rose-400/80 border border-rose-800/80 cursor-not-allowed'
                    : !isIncrementPositive || isLowerReadingDetected
                    ? isHmi 
                      ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : isHmi
                      ? 'bg-green-500 hover:bg-green-400 text-black font-black shadow-green-500/30 ring-1 ring-green-300 font-mono'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-cyan-500/25 ring-1 ring-cyan-400'
                }`}
              >
                {isLineStopped ? (
                  <>
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>🔒 ปิดรับการกรอกช็อต (สายการผลิต {currentLine?.machineStatus})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    <span>ยืนยันบันทึก (+{formatShots(incrementVal)} SHOTS)</span>
                  </>
                )}
              </button>

              {/* Secondary Options */}
              <div className={`flex items-center justify-between gap-2 flex-wrap text-[10px] ${
                isHmi ? 'text-green-500/80' : 'text-slate-400'
              }`}>
                <div className="flex items-center gap-1">
                  <Calendar className={`w-3 h-3 ${isHmi ? 'text-green-300' : 'text-white'}`} />
                  <span className="text-white">Date:</span>
                  <input
                    type="date"
                    disabled={isLineStopped}
                    value={productionDate}
                    onChange={e => setProductionDate(e.target.value)}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-mono border [color-scheme:dark] ${
                      isLineStopped
                        ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600 bg-slate-950'
                        : isHmi 
                        ? 'bg-black border-green-700 text-green-300' 
                        : 'bg-slate-950 border-slate-600 text-white'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isLineStopped}
                    onClick={handleSaveDraft}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all active:scale-95 ${
                      isLineStopped
                        ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600 bg-slate-950'
                        : isHmi
                        ? 'bg-zinc-950 hover:bg-zinc-900 text-green-400 border-green-800'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    SAVE DRAFT
                  </button>
                  <button
                    type="button"
                    onClick={reloadData}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all active:scale-95 ${
                      isHmi
                        ? 'bg-zinc-950 hover:bg-zinc-900 text-green-400 border-green-800'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    RESET
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
        );
      })()}

      {/* TAB 3: RESET METER & SHOT LOGS (FULL SCREEN AUDIT TRAIL TABLE) */}
      {activeTab === 'reset-logs' && (
        <div className={`rounded-xl p-3 sm:p-4 space-y-3 shadow-xl border ${
          isHmi ? 'bg-black border-2 border-amber-500' : 'bg-[#0E172A] border-amber-500/80 shadow-amber-950/20'
        }`}>
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2.5 ${
            isHmi ? 'border-amber-900' : 'border-slate-800'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <h3 className={`font-bold text-sm sm:text-base uppercase tracking-wider ${
                  isHmi ? 'text-amber-400 font-extrabold font-mono' : 'text-white'
                }`}>
                  RESET METER & SHOT LOGS
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  isHmi 
                    ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                    : 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                }`}>
                  {resetLogs.length} LOGS
                </span>
              </div>
              <p className={`text-[11px] ${isHmi ? 'text-amber-600' : 'text-slate-400'}`}>
                ประวัติการรีเซ็ตมิเตอร์หน้าเครื่องและยอดช็อตทั้งหมดในระบบ พร้อมบันทึกผู้ทำรายการและรหัสอนุมัติ
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <DateRangeFilter
                startDate={resetLogStartDate}
                endDate={resetLogEndDate}
                onChangeRange={(start, end) => {
                  setResetLogStartDate(start);
                  setResetLogEndDate(end);
                }}
              />

              <select
                value={resetLogLineFilter}
                onChange={e => setResetLogLineFilter(e.target.value)}
                className={`rounded px-2 py-1 text-xs font-bold border transition-colors ${
                  isHmi 
                    ? 'bg-black border-amber-800 text-amber-300 focus:border-amber-400' 
                    : 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-400'
                }`}
              >
                <option value="ALL">ALL LINES (ทุกสาย)</option>
                {linesList.map(line => (
                  <option key={line} value={line}>LINE {line}</option>
                ))}
              </select>

              <div className="relative">
                <Search className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 ${
                  isHmi ? 'text-amber-600' : 'text-slate-500'
                }`} />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={resetLogSearch}
                  onChange={e => setResetLogSearch(e.target.value)}
                  className={`rounded pl-7 pr-2.5 py-1 text-xs border w-36 sm:w-44 transition-colors ${
                    isHmi 
                      ? 'bg-black border-amber-800 text-amber-300 placeholder-amber-700/60 focus:border-amber-400' 
                      : 'bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-amber-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => exportResetLogsExcel(resetLogs, resetLogLineFilter)}
                className="px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95"
                title="ส่งออกรายงาน Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXCEL</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenResetModal(selectedLineId)}
                className="px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95"
                title="เปิดแบบฟอร์มรีเซ็ตมิเตอร์"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>+ RESET</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-amber-300/90 font-mono bg-amber-950/30 p-2 rounded-md border border-amber-900/60">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                บันทึกประวัติการ RESET METER และ MASTER COUNTER ทั้งหมดในระบบ เพื่อตรวจสอบ Audit Trail ย้อนหลัง
              </span>
            </div>
          </div>

          <div className={`overflow-x-auto custom-scrollbar border rounded-lg ${
            isHmi ? 'border-amber-900/80' : 'border-slate-800'
          }`}>
            <table className="w-full text-left text-xs font-mono">
              <thead className={`uppercase border-b text-[11px] font-black tracking-wide ${
                isHmi ? 'bg-zinc-950 text-amber-400 border-amber-800' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2 px-2 text-center w-10 font-mono">NO.</th>
                  <th className="py-2 px-2.5">RECORD ID</th>
                  <th className="py-2 px-2.5">LINE</th>
                  <th className="py-2 px-2.5">DATE / SHIFT</th>
                  <th className="py-2 px-2.5">RESET REASON</th>
                  <th className="py-2 px-2.5 text-right">PREVIOUS</th>
                  <th className="py-2 px-2.5 text-right">NEW BASE</th>
                  <th className="py-2 px-2.5">RESETTED BY</th>
                  <th className="py-2 px-2.5">APPROVED BY</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${
                isHmi ? 'divide-amber-950/60 text-amber-300' : 'divide-slate-800/60 text-slate-200'
              }`}>
                {resetLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500 font-thai">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <RotateCcw className="w-6 h-6 text-slate-600 opacity-50" />
                        <span className="text-xs">ไม่พบประวัติการรีเซ็ตมิเตอร์ตามเงื่อนไขที่ค้นหา</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  resetLogs.map((log, idx) => (
                    <tr key={log.id} className={`transition-colors ${
                      isHmi ? 'hover:bg-amber-950/30' : 'hover:bg-slate-900/60'
                    }`}>
                      <td className={`py-1.5 px-2 text-center font-mono font-bold ${isHmi ? 'text-amber-500' : 'text-amber-400/80'}`}>{idx + 1}</td>
                      <td className="py-1.5 px-2.5">
                        <div className={`font-bold ${isHmi ? 'text-amber-400' : 'text-amber-300'}`}>{log.id}</div>
                        {log.resetApprovalId && (
                          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Appr: {log.resetApprovalId}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-amber-300 border border-amber-600/40">
                          LINE {log.lineId}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-[11px]">
                        <div>{log.productionDate}</div>
                        <div className="text-slate-400 font-normal text-[10px]">
                          {log.shift || 'Shift 1'} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="font-medium text-slate-200">
                          {log.resetReason || log.entryReason || 'Panel Counter Reset'}
                        </div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{log.notes}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-rose-400/90 font-mono">
                        {formatShots(log.previousTotal)}
                      </td>
                      <td className={`py-1.5 px-2.5 text-right font-bold text-xs ${
                        isHmi ? 'text-green-400' : 'text-emerald-400'
                      }`}>
                        {formatShots(log.newTotal)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300 truncate max-w-[120px]">
                        {log.operatorName || 'System'}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-300 truncate max-w-[120px]">
                        {log.resetApprovedBy ? (
                          <span className="text-emerald-300 font-bold">{log.resetApprovedBy}</span>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'history' && (
        <div className={`rounded-xl p-3 sm:p-4 space-y-3 shadow-xl border ${
          isHmi ? 'bg-black border-2 border-green-500' : 'bg-[#0E172A] border-slate-800/90'
        }`}>
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2.5 ${
            isHmi ? 'border-green-900' : 'border-slate-800'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-sm sm:text-base uppercase tracking-wider ${
                  isHmi ? 'text-green-400 font-extrabold font-mono' : 'text-white'
                }`}>
                  HISTORICAL SHOT LOGS
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  isHmi 
                    ? 'bg-green-950 text-green-300 border border-green-800' 
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  10 RECENT LOGS
                </span>
              </div>
              <p className={`text-[11px] ${isHmi ? 'text-green-600' : 'text-slate-400'}`}>
                ประวัติการบันทึกช็อตรายกะ 10 รายการล่าสุดสำหรับอ้างอิงหน้างาน
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <DateRangeFilter
                startDate={historyStartDate}
                endDate={historyEndDate}
                onChangeRange={(start, end) => {
                  setHistoryStartDate(start);
                  setHistoryEndDate(end);
                }}
                maxDaysAllowed={31}
                isHmi={isHmi}
              />

              <select
                value={historyLineFilter}
                onChange={e => setHistoryLineFilter(e.target.value)}
                className={`rounded px-2 py-1 text-xs font-mono border ${
                  isHmi 
                    ? 'bg-zinc-950 border-green-700 text-green-300' 
                    : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              >
                <option value="ALL">ALL LINES</option>
                {linesList.map(line => {
                  const displayLine = line.startsWith('E3-') ? 'E3' : line;
                  const tag = LINE_INFO_MAP[line]?.shortTag || line;
                  return (
                    <option key={line} value={line}>Line {displayLine} ({tag})</option>
                  );
                })}
              </select>

              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="ค้นหาประวัติ..."
                className={`rounded px-2 py-1 text-xs font-mono border ${
                  isHmi
                    ? 'bg-zinc-950 border-green-700 text-green-300 placeholder:text-green-800'
                    : 'bg-slate-950 border-slate-700 text-slate-200 placeholder:text-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Single Source of Truth Notice Banner */}
          <div className={`p-2 border rounded-md flex items-center justify-between gap-2 text-[11px] font-thai ${
            isHmi 
              ? 'bg-zinc-950 border-green-900 text-green-300' 
              : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className={`flex h-1.5 w-1.5 rounded-full ${isHmi ? 'bg-green-400' : 'bg-cyan-400'} animate-pulse`}></span>
              <span>
                แสดงประวัติล่าสุด <strong>10 รายการ</strong> เพื่อความสะดวกรวดเร็วหน้างาน • ประวัติย้อนหลังทั้งหมดและการส่งออกรายงานดูได้ที่เมนู <strong>Reports & Analytics</strong>
              </span>
            </div>
          </div>

          <div className={`overflow-x-auto custom-scrollbar border rounded-lg ${
            isHmi ? 'border-green-900' : 'border-slate-800'
          }`}>
            <table className="w-full text-left text-xs font-mono">
              <thead className={`uppercase border-b text-[11px] font-black tracking-wide ${
                isHmi ? 'bg-zinc-950 text-green-400 border-green-800' : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2 px-2 text-center w-10 font-mono">NO.</th>
                  <th className="py-2 px-2.5">RECORD ID</th>
                  <th className="py-2 px-2.5">LINE</th>
                  <th className="py-2 px-2.5">DATE / SHIFT</th>
                  <th className="py-2 px-2.5">METHOD</th>
                  <th className="py-2 px-2.5 text-right">PREVIOUS</th>
                  <th className="py-2 px-2.5 text-right">INCREMENT</th>
                  <th className="py-2 px-2.5 text-right">NEW TOTAL</th>
                  <th className="py-2 px-2.5">OPERATOR</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${
                isHmi ? 'divide-green-950 text-green-300' : 'divide-slate-800/60 text-slate-200'
              }`}>
                {filteredShotLogs.slice(0, 10).map((log, idx) => (
                  <tr key={log.id} className={`transition-colors ${
                    isHmi ? 'hover:bg-green-950/40' : 'hover:bg-slate-900/60'
                  }`}>
                    <td className={`py-1.5 px-2 text-center font-mono font-bold ${isHmi ? 'text-green-500' : 'text-cyan-400/80'}`}>{idx + 1}</td>
                    <td className={`py-1.5 px-2.5 font-bold ${isHmi ? 'text-green-400' : 'text-cyan-400'}`}>{log.id}</td>
                    <td className="py-1.5 px-2.5">LINE {log.lineId}</td>
                    <td className="py-1.5 px-2.5 text-[11px]">{log.productionDate} ({log.shift})</td>
                    <td className="py-1.5 px-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.inputMethod === 'AUTOMATIC_PLC'
                          ? 'bg-blue-950 text-blue-300 border border-blue-700'
                          : isHmi
                          ? 'bg-green-950 text-green-300 border border-green-700'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                      }`}>
                        {log.inputMethod || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-slate-400 font-mono">{formatShots(log.previousTotal)}</td>
                    <td className={`py-1.5 px-2.5 text-right font-bold ${isHmi ? 'text-green-400' : 'text-emerald-400'}`}>+{formatShots(log.shotsAdded)}</td>
                    <td className={`py-1.5 px-2.5 text-right font-bold text-xs ${isHmi ? 'text-green-300' : 'text-slate-100'}`}>{formatShots(log.newTotal)}</td>
                    <td className="py-1.5 px-2.5 text-slate-300 truncate max-w-[130px]">{log.operatorName || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION & REVIEW MODAL */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scaleUp font-mono border ${
            isHmi 
              ? 'bg-black border-2 border-green-500 text-green-300' 
              : 'bg-[#0E172A] border-slate-700 text-slate-200'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isHmi ? 'border-green-900' : 'border-slate-800'
            }`}>
              <h3 className={`font-bold text-lg flex items-center gap-2 ${
                isHmi ? 'text-green-400' : 'text-white'
              }`}>
                <CheckCircle2 className={`w-5 h-5 ${isHmi ? 'text-green-400' : 'text-emerald-400'}`} />
                CONFIRM SHOT RECORDING
              </h3>
              <button onClick={() => setPreviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-lg border space-y-2.5 text-xs ${
              isHmi ? 'bg-zinc-950 border-green-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className={`flex justify-between py-1 border-b ${isHmi ? 'border-green-950' : 'border-slate-800/80'}`}>
                <span className="text-slate-400">TARGET LINE:</span>
                <span className={`font-bold ${isHmi ? 'text-green-400' : 'text-cyan-300'}`}>LINE {selectedLineId}</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isHmi ? 'border-green-950' : 'border-slate-800/80'}`}>
                <span className="text-slate-400">SHIFT & DATE:</span>
                <span className="font-bold text-slate-200">{shift} | {productionDate}</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isHmi ? 'border-green-950' : 'border-slate-800/80'}`}>
                <span className="text-slate-400">PREVIOUS METER:</span>
                <span className="font-mono text-slate-300">{formatShots(prevShotsVal)} shots</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isHmi ? 'border-green-950' : 'border-slate-800/80'}`}>
                <span className="text-slate-400">ADDED INCREMENT:</span>
                <span className={`font-bold font-mono text-base ${isHmi ? 'text-green-400' : 'text-emerald-400'}`}>+{formatShots(incrementVal)} shots</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">NEW METER TOTAL:</span>
                <span className={`font-extrabold font-mono text-base ${isHmi ? 'text-green-400' : 'text-cyan-300'}`}>{formatShots(resultingTotal)} shots</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wider shadow-lg ${
                  isHmi
                    ? 'bg-green-500 hover:bg-green-400 text-black font-black shadow-green-500/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-cyan-500/25'
                }`}
              >
                CONFIRM & COMMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COUNTER & SHOT RESET MODAL */}
      {counterResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div className={`border rounded-lg max-w-xl w-full p-3 sm:p-4 space-y-2.5 shadow-2xl ${
            isHmi 
              ? 'bg-black border-amber-500 text-amber-300 font-mono' 
              : 'bg-[#0E172A] border-amber-500/80 text-amber-100 font-sans'
          }`}>
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-amber-900/60 pb-2 gap-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 rounded-md border border-amber-500/30">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                    <span>SHOT & METER RESET (ระบบรีเซ็ตช็อตและมิเตอร์)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    รีเซ็ตยอดช็อตรายสายการผลิต (จำกัดทำทีละ 1 สายการผลิตเพื่อความถูกต้อง)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCounterResetModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RESET FORM */}
            <form onSubmit={handleExecuteCounterReset} className="space-y-2.5 text-xs">
              {/* 1. Single Line Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. เลือกสายการผลิต (TARGET PRODUCTION LINE) *</span>
                  </label>
                  <span className="text-[9px] text-amber-300/80 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded font-bold">
                    เลือกรีเซ็ต: สาย {resetTargetScope}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {linesList.map(lId => {
                    const isSelected = resetTargetScope === lId;
                    const lineData = storageService.getLineMonitoring(lId);
                    const currentShots = lineData?.machineShotTotal || 0;
                    return (
                      <button
                        key={lId}
                        type="button"
                        onClick={() => {
                          setResetTargetScope(lId);
                          setResetterNameInput(''); // Force operator signature on target line switch
                        }}
                        className={`p-1 sm:p-1.5 rounded-md border text-center transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-sm ring-1 ring-amber-400/80 scale-[1.02]'
                            : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-xs font-bold">{lId}</span>
                        <span className={`text-[9px] mt-0.2 font-mono ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-500'}`}>
                          {currentShots > 1000000 ? `${(currentShots/1000000).toFixed(1)}M` : `${(currentShots/1000).toFixed(0)}k`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. New Meter Input & Current Meter Display */}
              <div className="p-2.5 bg-slate-950/80 border border-amber-500/40 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 text-[11px]">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. เลขมิเตอร์ตั้งต้นใหม่ (NEW BASE METER READING) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetNewMeterInput('0')}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold flex items-center gap-1 transition-all"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                    <span>ตั้งค่าเป็น 0 ช็อต</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      value={resetNewMeterInput}
                      onChange={e => setResetNewMeterInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full bg-black border border-amber-500/80 rounded-md py-1.5 px-2.5 text-amber-300 font-mono text-lg font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner"
                      required
                    />
                  </div>
                  <div className="p-1.5 px-2.5 bg-slate-900/90 border border-slate-800 rounded-md text-right min-w-[130px]">
                    <div className="text-[9px] text-slate-400">ยอดสะสมเดิม (สาย {resetTargetScope})</div>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      {(storageService.getLineMonitoring(resetTargetScope)?.machineShotTotal || 0).toLocaleString()} <span className="text-[9px] font-normal text-slate-400">ช็อต</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Resetter Name & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-amber-400 font-bold mb-0.5 flex items-center gap-1 text-[11px]">
                    <UserCheck className="w-3 h-3 text-amber-400" />
                    <span>ผู้รีเซ็ต (OPERATOR) *</span>
                  </label>
                  <input
                    type="text"
                    value={resetterNameInput}
                    onChange={e => setResetterNameInput(e.target.value)}
                    placeholder="กรุณากรอกชื่อผู้ทำรายการ..."
                    className="w-full bg-slate-950 border border-amber-500/60 rounded-md py-1.5 px-2 text-xs text-slate-100 font-medium focus:border-amber-400 focus:outline-none placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-0.5 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>เหตุผล (REASON) *</span>
                  </label>
                  <input
                    type="text"
                    value={resetReasonInput}
                    onChange={e => setResetReasonInput(e.target.value)}
                    placeholder="ระบุเหตุผลการรีเซ็ต..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-md py-1.5 px-2 text-xs text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                <span className="text-slate-500 font-bold">ด่วน:</span>
                {[
                  'เปลี่ยนมิเตอร์ใหม่ (New Counter)',
                  'ปรับเซ็ตประจำกะ (Shift Adjustment)',
                  'สอบเทียบประจำปี (Calibration)',
                  'ซ่อมบำรุงเปลี่ยนชิ้นส่วน (Maintenance)'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResetReasonInput(preset)}
                    className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:text-amber-300 rounded text-[9px] transition-all"
                  >
                    + {preset.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCounterResetModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-900 text-slate-400 rounded-md text-xs font-bold border border-slate-700 hover:text-white hover:bg-slate-800 transition-all"
                >
                  ยกเลิก (CANCEL)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md text-xs font-extrabold uppercase shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                  <span>ยืนยันการรีเซ็ต (CONFIRM)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OEE LOSS TIME CATCHER MODAL */}
      {lossModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#0E172A] border-2 border-rose-500 rounded-lg max-w-md w-full p-4 space-y-3 shadow-2xl font-mono text-slate-200">
            <div className="flex items-center justify-between border-b border-rose-900/60 pb-2">
              <h3 className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>OEE LOSS TIME DETECTED</span>
              </h3>
              <button onClick={() => setLossModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-md text-xs space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">EXPECTED:</span>
                <strong className="text-slate-200">{mode2ExpectedShots.toLocaleString()} shots</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">PRODUCED:</span>
                <strong className="text-cyan-300">{incrementVal.toLocaleString()} shots</strong>
              </div>
              <div className="flex justify-between text-rose-400 font-bold border-t border-rose-900/60 pt-1 text-[11px]">
                <span>SHORTFALL LOSS:</span>
                <span>-{Math.max(0, mode2ExpectedShots - incrementVal).toLocaleString()} shots (~{((Math.max(0, mode2ExpectedShots - incrementVal)) / (spmInput || 100)).toFixed(1)} mins)</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                  1. PRIMARY LOSS CATEGORY *
                </label>
                <select
                  value={lossTypeInput}
                  onChange={e => setLossTypeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 px-2 text-xs text-white font-bold"
                >
                  <option value="COIL_CHANGE">Coil / Material Change (เปลี่ยนคอยล์/รอวัตถุดิบ)</option>
                  <option value="DIE_JAM">Die Jam / Breakdown (แม่พิมพ์ติดขัด/พัง)</option>
                  <option value="BLADE_PUNCH_CHANGE">Blade / Punch Change (เปลี่ยนใบมีด/พันช์)</option>
                  <option value="QUALITY_CHECK">Quality Inspection (ตรวจสอบคุณภาพชิ้นงาน)</option>
                  <option value="SPEED_LOSS">Minor Stoppages / Speed Loss (หยุดย่อย/ลดความเร็ว)</option>
                  <option value="OTHER">Other Unplanned Downtime (อื่นๆ)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                  2. LOSS REMARKS & ACTION TAKEN
                </label>
                <textarea
                  rows={2}
                  value={lossReasonInput}
                  onChange={e => setLossReasonInput(e.target.value)}
                  placeholder="ระบุสาเหตุเพิ่มเติมและการแก้ไข..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLossModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-900 text-slate-400 rounded-md text-xs font-bold border border-slate-700"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLossModalOpen(false);
                    const calcMins = ((Math.max(0, mode2ExpectedShots - incrementVal)) / (spmInput || 100)).toFixed(1);
                    setNotes(prev => prev ? `${prev} | Loss [${lossTypeInput}: ${calcMins}m] ${lossReasonInput}` : `Loss [${lossTypeInput}: ${calcMins}m] ${lossReasonInput}`);
                    showNotification('warning', `Loss time noted: ${calcMins} mins (${lossTypeInput}). Proceeding with preview.`);
                    handleOpenSubmissionPreview();
                  }}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold uppercase shadow-md shadow-rose-600/30"
                >
                  LOG LOSS & PROCEED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
