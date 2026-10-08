import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DateRangeFilter, isDateInSelectedRange } from '../components/common/DateRangeFilter';
import {
  Grid as GridIcon,
  Wrench,
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Layers,
  CircleDot,
  Clock,
  UserCheck,
  FileSpreadsheet,
  X,
  Plus,
  Info,
  Sparkles,
  Calendar,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings,
  ShieldCheck,
  Hammer,
  Zap,
  LayoutGrid,
  FileText,
  Lock,
  KeyRound,
  Gauge,
  History,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  ZoomIn,
  Maximize2
} from 'lucide-react';
import {
  ProductionLineId,
  ReplacementRecord,
  RegrindingRecord,
  User
} from '../types';
import { storageService } from '../services/storageService';
import { regrindService } from '../services/regrindService';
import { safeStorage } from '../services/safeStorage';
import { formatShots } from '../services/calculationService';
import { LineFilterSelector } from '../components/common/LineFilterSelector';
import { useLanguage } from '../i18n';
import { LINE_DIE_MATRIX_CONFIG, LineStageGridConfig, StageBlockConfig } from '../data/lineDieMatrixConfig';
import { isPartMatchingInteractiveStage } from '../utils/stageUtils';
import {
  MasterLogClearModal,
  MasterLogSetModal,
  MasterLogDeleteModal,
  loadStoredMasterLogs,
  saveStoredMasterLogs
} from '../components/die/MasterLogModals';

// Pin status definition: Strictly 3 industrial states (Active/Normal, Warning, Broken)
export type PinStatus = 'normal' | 'warning' | 'broken';

export interface DiePinItem {
  id: string; // e.g. E1-s-burr-P-03
  seqNo: number; // Sequential 1 to N number across the entire stage (e.g. 1-180)
  pinCode: string; // e.g. No. 12 (Col 12, 1st)
  stageId: string; // s-burr, s-pierce, s-iron, etc.
  stageName: string; // BURRING PUNCH STAGE
  stageCategory: 'PUNCH_MATRIX' | 'DIE_SEGMENT' | 'BLADE' | 'CUTOFF' | 'SIDECUT';
  partCode: string; // e.g. P-BURR-E2
  partName: string; // e.g. BURRING PUNCH (Ø5)
  material: string; // e.g. SKH-51 / Carbide V30
  tubeSize: string; // e.g. Ø5
  drawingNo: string; // DWG-FD-05-E2-BURR
  row: number; // 1, 2, 3
  col: number; // 1 to 68
  rowLabel: string; // 1st, 2nd, 3rd, DIE A, DIE B, UPPER, DOWN
  status: PinStatus;
  currentShots: number;
  maxShots: number;
  lastReplacementShot: number;
  lastReplacementDate?: string;
  regrindCount: number;
  maxRegrind: number;
  totalGrindDepthMm: number;
  shimThicknessMm: number;
  lastAction?: string;
  lastTechnician?: string;
  historyLogs: PinHistoryEntry[];
}

export const getCleanStageName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\s+STAGE\b/gi, '').trim();
};

export interface PinHistoryEntry {
  id: string;
  dateTime: string;
  lineId: ProductionLineId;
  stageId: string;
  stageName: string;
  pinCode: string;
  partName: string;
  actionType: 'REPLACE_NEW' | 'REGRIND' | 'BROKEN' | 'SETUP_CHANGE';
  actionLabelTh: string;
  machineShot: number;
  pinShot: number;
  technician: string;
  regrindDepthMm?: number;
  shimThicknessMm?: number;
  remarks: string;
  photoUrl?: string;
}

export type StageConfig = LineStageGridConfig;

export const getLineStageConfigs = (lineId: ProductionLineId): LineStageGridConfig[] => {
  return LINE_DIE_MATRIX_CONFIG[lineId]?.stages || LINE_DIE_MATRIX_CONFIG.E1.stages;
};

// Fallback legacy export for backward compatibility
export const STAGE_CONFIGS: LineStageGridConfig[] = LINE_DIE_MATRIX_CONFIG.E1.stages;

const COMMON_REASONS = [
  'หมดอายุตามรอบ (PM Limit Reached)',
  'ปลายพันช์บิ่น/แตกหัก (Punch Chipped / Broken)',
  'คมใบมีดทื่อ (Blade Dull / Worn)',
  'ระยะเคลียแรนซ์หลวม (Clearance Out)',
  'เจียรลับคมตามรอบ (Periodic Regrind)',
  'ผิวเคลือบสึก/เกิดรอย (Coating Worn)',
  'ตรวจสอบพบค่า Burr สูงเกินเกณฑ์ (High Burr Height)',
  'เปลี่ยนก่อนการผลิตตามตาราง (Preventive Schedule Change)'
];

const COMPACT_PIN_OVERRIDES_KEY = 'FIN_DIE_PIN_OVERRIDES_V5_';

// Purge any legacy bloated full-die pin arrays from localStorage
const cleanUpAllLegacyPinBlobs = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('FIN_DIE_INTERACTIVE_PINS_') || key.startsWith('FIN_DIE_PINS_') || key.startsWith('FIN_DIE_PIN_OVERRIDES_V3_') || key.startsWith('FIN_DIE_PIN_OVERRIDES_V4_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn('Legacy pin storage cleanup notice:', err);
  }
};

/**
 * Generate deterministic base pins for a line in memory:
 * 1. BURRING PUNCH (1 Block: 1st, 2nd, 3rd)
 * 2. PIERCE PUNCH (1 Block: 1st, 2nd, 3rd)
 * 3. IRONING PUNCH (1 Block: 1st, 2nd, 3rd)
 * 4. REFLARE PUNCH (1 Block: 1st, 2nd, 3rd)
 * 5. SLIT / LOUVER PUNCH (1 Block: 1st, 2nd, 3rd)
 * 6. SLIT DIE A & B (1 Block: DIE A Sheet 1-12, DIE B Sheet 1-12)
 * 7. ROW SLIT BLADE (1 Block: Blades 1-68 with logged shots matching physical check list)
 * 8. CUT OFF (1 Block: No. 1-4 Upper / Down)
 * 9. SIDE CUT (1 Block: No. 1-2 Upper / Down)
 */
const generateBasePins = (lineId: ProductionLineId, machineShot: number): DiePinItem[] => {
  const generatedPins: DiePinItem[] = [];
  const lineSpec = LINE_DIE_MATRIX_CONFIG[lineId] || LINE_DIE_MATRIX_CONFIG.E1;
  const tubeSize = lineSpec.tubeSize;
  const stages = lineSpec.stages;

  stages.forEach(stage => {
    for (let r = 1; r <= stage.rows; r++) {
      for (let c = 1; c <= stage.cols; c++) {
        // Sequential 1 to N number across the entire stage block (e.g. 1-180, 1-204, 1-8, 1-4)
        const seqNo = (r - 1) * stage.cols + c;

        let rowLabel = '1st';
        let pinCode = `No. ${seqNo} (Col ${c}, 1st)`;

        if (stage.gridType === 'GRID_PINS') {
          rowLabel = r === 1 ? '1st' : r === 2 ? '2nd' : '3rd';
          pinCode = `No. ${seqNo} (Col ${c}, ${rowLabel})`;
        } else if (stage.gridType === 'DIE_SEGMENTS') {
          rowLabel = r === 1 ? 'DIE A' : 'DIE B';
          pinCode = `No. ${seqNo} (Sheet ${c}, ${rowLabel})`;
        } else if (stage.gridType === 'ROW_BLADES') {
          rowLabel = 'BLADE';
          pinCode = `No. ${seqNo} (Blade ${c})`;
        } else if (stage.gridType === 'CUT_OFF') {
          rowLabel = r === 1 ? 'UPPER' : 'DOWN';
          pinCode = `No. ${seqNo} (Cut Off ${rowLabel} #${c})`;
        } else if (stage.gridType === 'SIDE_CUT') {
          rowLabel = r === 1 ? 'UPPER' : 'DOWN';
          pinCode = `No. ${seqNo} (Side Cut ${rowLabel} #${c})`;
        }

        const pinId = `${lineId}-${stage.stageId}-R${r}-C${c}`;

        generatedPins.push({
          id: pinId,
          seqNo,
          pinCode,
          stageId: stage.stageId,
          stageName: stage.stageName,
          stageCategory: stage.stageCategory,
          partCode: stage.partCode,
          partName: stage.partName,
          material: stage.material,
          tubeSize,
          drawingNo: stage.drawingNo,
          row: r,
          col: c,
          rowLabel,
          status: 'normal',
          currentShots: 0,
          maxShots: stage.maxShots,
          lastReplacementShot: machineShot || 0,
          lastReplacementDate: '-',
          regrindCount: 0,
          maxRegrind: stage.maxRegrind,
          totalGrindDepthMm: 0,
          shimThicknessMm: 0,
          lastAction: 'Initial Baseline Set',
          lastTechnician: '-',
          historyLogs: []
        });
      }
    }
  });

  return generatedPins;
};

// Load compact overrides for modified pins only
const loadPinOverrides = (lineId: ProductionLineId): Record<string, Partial<DiePinItem>> => {
  try {
    const savedCompact = safeStorage.getItem(`${COMPACT_PIN_OVERRIDES_KEY}${lineId}`);
    if (savedCompact) {
      return JSON.parse(savedCompact);
    }
  } catch (err) {
    console.warn('Error loading pin overrides:', err);
  }
  return {};
};

// Safely persist compact overrides
const savePinOverrides = (lineId: ProductionLineId, overrides: Record<string, Partial<DiePinItem>>) => {
  try {
    safeStorage.setItem(`${COMPACT_PIN_OVERRIDES_KEY}${lineId}`, JSON.stringify(overrides));
  } catch (err) {
    console.warn('Could not save pin overrides:', err);
  }
};

interface InteractiveDieLayoutViewProps {
  initialLineId?: ProductionLineId;
  showLineSelector?: boolean;
}

export const InteractiveDieLayoutView: React.FC<InteractiveDieLayoutViewProps> = ({
  initialLineId = 'E1',
  showLineSelector = true
}) => {
  const { language } = useLanguage();
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>(initialLineId);

  useEffect(() => {
    if (initialLineId) {
      setSelectedLineId(initialLineId);
    }
  }, [initialLineId]);

  const [pins, setPins] = useState<DiePinItem[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View Mode: 'DIE_LAYOUT' (Single unified Stage Summary & 2D Pin Control) | 'MASTER_HISTORY'
  const [viewMode, setViewMode] = useState<'DIE_LAYOUT' | 'MASTER_HISTORY'>('DIE_LAYOUT');
  
  // Toolroom Secure PIN Modal States
  // Removed per user request
  
  // Per-Stage Accordion Expand/Collapse Map (user can expand/collapse any stage freely)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const lineInitializedRef = useRef<string>('');

  // Operator Action Modal State (Enforcing Mandatory Latest Machine Shot Reading)
  const [selectedPin, setSelectedPin] = useState<DiePinItem | null>(null);
  const [actionType, setActionType] = useState<'REPLACE_NEW' | 'REGRIND' | 'BROKEN'>('REPLACE_NEW');
  const [machineShotInput, setMachineShotInput] = useState<number>(0);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [actionDateTime, setActionDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [remarks, setRemarks] = useState<string>('');
  const [regrindDepthMm, setRegrindDepthMm] = useState<number>(0.25);
  const [shimThicknessMm, setShimThicknessMm] = useState<number>(0.20);
  const [damagePhotoUrl, setDamagePhotoUrl] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo Lightbox Modal State
  const [activePhotoModal, setActivePhotoModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    timestamp?: string;
    technician?: string;
    remarks?: string;
  } | null>(null);

  // Image compression helper: converts uploaded/captured photo to optimized Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPEG, PNG, WEBP)' });
      return;
    }
    setIsCompressingPhoto(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setDamagePhotoUrl(compressedDataUrl);
          setIsCompressingPhoto(false);
          setFeedback({ type: 'success', message: 'แนบรูปภาพหลักฐานความเสียหายสำเร็จ' });
          setTimeout(() => setFeedback(null), 2500);
        } else {
          setDamagePhotoUrl(e.target?.result as string);
          setIsCompressingPhoto(false);
        }
      };
      img.onerror = () => {
        setIsCompressingPhoto(false);
        setFeedback({ type: 'error', message: 'ไม่สามารถโหลดรูปภาพได้' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Swap Entire Stage Modal States
  const [selectedStageForSwap, setSelectedStageForSwap] = useState<LineStageGridConfig | null>(null);
  const [swapActionType, setSwapActionType] = useState<'REPLACE_NEW' | 'REGRIND'>('REPLACE_NEW');
  const [swapMachineShotInput, setSwapMachineShotInput] = useState<number>(0);
  const [swapTechnicianName, setSwapTechnicianName] = useState<string>('');
  const [swapDateTime, setSwapDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [swapRemarks, setSwapRemarks] = useState<string>('');
  const [swapRegrindDepthMm, setSwapRegrindDepthMm] = useState<number>(0.25);
  const [swapShimThicknessMm, setSwapShimThicknessMm] = useState<number>(0.20);
  const [swapDeductStock, setSwapDeductStock] = useState<boolean>(true);

  // History table filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyLineFilter, setHistoryLineFilter] = useState<string>('ALL');
  const [historyStageFilter, setHistoryStageFilter] = useState<string>('ALL');
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('ALL');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [isClearLogModalOpen, setIsClearLogModalOpen] = useState<boolean>(false);
  const [isSetLogModalOpen, setIsSetLogModalOpen] = useState<boolean>(false);
  const [deletingLog, setDeletingLog] = useState<PinHistoryEntry | null>(null);
  const [logsUpdateCounter, setLogsUpdateCounter] = useState<number>(0);

  // Toast notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

  const currentUser: User = storageService.getCurrentUser();

  // Active Line Stage Configurations
  const activeStageConfigs = useMemo(() => {
    return getLineStageConfigs(selectedLineId);
  }, [selectedLineId]);

  // Load pins for current line: generated in memory + merged with compact user overrides
  const loadLinePins = (isLineChange = false) => {
    cleanUpAllLegacyPinBlobs();

    const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
    const machineShot = lineMonitoring?.machineShotTotal || 0;

    const basePins = generateBasePins(selectedLineId, machineShot);
    const overrides = loadPinOverrides(selectedLineId);

    // Merge base deterministic pins with user-overridden modifications and live Part Master data
    const merged = basePins.map(pin => {
      const override = overrides[pin.id];
      
      // Dynamic mapping to live Part Master tracking item
      const liveItem = lineMonitoring?.items?.find(item => 
        isPartMatchingInteractiveStage(item, pin.partCode, pin.stageName)
      );

      const maxShots = liveItem?.lifeLimit || pin.maxShots;
      const partCode = liveItem?.partCode || pin.partCode;
      const partName = liveItem?.partName || pin.partName;
      const drawingNo = liveItem?.partCode || pin.drawingNo;

      if (!override) {
        // If no user override, compute dynamic shots directly since last change (defaults to 0 on base pin)
        const currentShots = Math.max(0, machineShot - pin.lastReplacementShot);
        return {
          ...pin,
          partCode,
          partName,
          drawingNo,
          maxShots,
          currentShots
        };
      }

      let mappedStatus: PinStatus = override.status as PinStatus;
      if ((override.status as any) === 'locked' || (override.status as any) === 'bypass') {
        mappedStatus = 'broken';
      }

      // Compute dynamic shots based on overridden last replacement shot
      const lastRepShot = override.lastReplacementShot !== undefined ? override.lastReplacementShot : pin.lastReplacementShot;
      const currentShots = Math.max(0, machineShot - lastRepShot);

      return {
        ...pin,
        ...override,
        partCode,
        partName,
        drawingNo,
        maxShots,
        currentShots,
        lastReplacementShot: lastRepShot,
        seqNo: pin.seqNo, // Always guarantee sequential pin number
        status: mappedStatus || pin.status
      };
    });

    setPins(merged);

    // ONLY initialize accordion expand/collapse when line changes, NEVER on background 3-second live pulses
    if (isLineChange || lineInitializedRef.current !== selectedLineId) {
      lineInitializedRef.current = selectedLineId;
      const initialExpanded: Record<string, boolean> = {};
      const lineStages = getLineStageConfigs(selectedLineId);
      // Default: Expand all stages on line load so the technician can see all stages cleanly
      lineStages.forEach(stage => {
        initialExpanded[stage.stageId] = true;
      });
      setExpandedStages(initialExpanded);
    }
  };

  useEffect(() => {
    loadLinePins(true);
    const unsub = storageService.subscribe(() => {
      // Periodic background updates only refresh metrics without resetting user's accordion toggles
      loadLinePins(false);
    });
    return () => unsub();
  }, [selectedLineId]);

  // When a pin is clicked, populate fields and set latest machine shot
  useEffect(() => {
    if (selectedPin) {
      const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
      const liveMachineShot = lineMonitoring?.machineShotTotal || 0;
      setMachineShotInput(liveMachineShot);
      setTechnicianName('');
      setActionType(selectedPin.status === 'broken' ? 'REPLACE_NEW' : 'REPLACE_NEW');
      setRemarks(COMMON_REASONS[0]);
      setActionDateTime(new Date().toISOString().slice(0, 16));
      setRegrindDepthMm(0.25);
      setShimThicknessMm(0.20);
      setDamagePhotoUrl(null);
      setIsCompressingPhoto(false);
    }
  }, [selectedPin]);

  // When a stage is selected for swap, populate fields and set latest machine shot
  useEffect(() => {
    if (selectedStageForSwap) {
      const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
      const liveMachineShot = lineMonitoring?.machineShotTotal || 0;
      setSwapMachineShotInput(liveMachineShot);
      setSwapTechnicianName('');
      setSwapActionType('REPLACE_NEW');
      setSwapRemarks(COMMON_REASONS[7]); // Default to Preventive Schedule Change
      setSwapDateTime(new Date().toISOString().slice(0, 16));
      setSwapRegrindDepthMm(0.25);
      setSwapShimThicknessMm(0.20);
      setSwapDeductStock(true);
    }
  }, [selectedStageForSwap, selectedLineId]);

  // Save pins helper
  const persistPins = (updated: DiePinItem[]) => {
    setPins(updated);

    const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
    const machineShot = lineMonitoring?.machineShotTotal || 0;
    const basePins = generateBasePins(selectedLineId, machineShot);
    const baseMap = new Map(basePins.map(p => [p.id, p]));

    const overrides: Record<string, Partial<DiePinItem>> = {};
    updated.forEach(pin => {
      const base = baseMap.get(pin.id);
      if (!base) return;

      const hasExtraLogs = (pin.historyLogs && pin.historyLogs.length > 1);
      const hasStatusChange = pin.status !== base.status;
      const hasShotChange = pin.currentShots !== base.currentShots;
      const hasRegrindChange = pin.regrindCount !== base.regrindCount;

      if (hasExtraLogs || hasStatusChange || hasShotChange || hasRegrindChange) {
        overrides[pin.id] = {
          status: pin.status,
          currentShots: pin.currentShots,
          lastReplacementShot: pin.lastReplacementShot,
          lastReplacementDate: pin.lastReplacementDate,
          regrindCount: pin.regrindCount,
          maxRegrind: pin.maxRegrind,
          totalGrindDepthMm: pin.totalGrindDepthMm,
          shimThicknessMm: pin.shimThicknessMm,
          lastAction: pin.lastAction,
          lastTechnician: pin.lastTechnician,
          historyLogs: (pin.historyLogs || []).slice(0, 10)
        };
      }
    });

    savePinOverrides(selectedLineId, overrides);
  };

  // KPIs - Strictly 3 statuses (Active, Warning, Broken)
  const stats = useMemo(() => {
    const total = pins.length;
    const normal = pins.filter(p => p.status === 'normal').length;
    const warning = pins.filter(p => p.status === 'warning').length;
    const broken = pins.filter(p => p.status === 'broken').length;
    return { total, normal, warning, broken };
  }, [pins]);

  // Stage Summary metrics calculated per stage
  const stageSummaries = useMemo(() => {
    return activeStageConfigs.map(stage => {
      const stagePins = pins.filter(p => p.stageId === stage.stageId);
      const total = stagePins.length;
      const normal = stagePins.filter(p => p.status === 'normal').length;
      const warning = stagePins.filter(p => p.status === 'warning').length;
      const broken = stagePins.filter(p => p.status === 'broken').length;
      const activePercent = total > 0 ? Math.round((normal / total) * 100) : 100;
      
      const totalShots = stagePins.reduce((sum, p) => sum + p.currentShots, 0);
      const avgShots = total > 0 ? Math.round(totalShots / total) : 0;
      const avgShotPercent = Math.min(100, Math.round((avgShots / stage.maxShots) * 100));

      const hasIssues = warning > 0 || broken > 0;

      return {
        stage,
        total,
        normal,
        warning,
        broken,
        activePercent,
        avgShots,
        avgShotPercent,
        hasIssues
      };
    });
  }, [pins, activeStageConfigs]);

  // Filtered Pins for 2D Grid
  const filteredPins = useMemo(() => {
    return pins.filter(pin => {
      const matchStage = selectedStageFilter === 'ALL' || pin.stageId === selectedStageFilter;
      const matchStatus = selectedStatusFilter === 'ALL' || pin.status === selectedStatusFilter;
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        q === '' ||
        (pin.pinCode && pin.pinCode.toLowerCase().includes(q)) ||
        (pin.partName && pin.partName.toLowerCase().includes(q)) ||
        (pin.stageName && pin.stageName.toLowerCase().includes(q)) ||
        (pin.partCode && pin.partCode.toLowerCase().includes(q));

      return matchStage && matchStatus && matchSearch;
    });
  }, [pins, selectedStageFilter, selectedStatusFilter, searchQuery]);

  // Aggregate Master History Logs across all pins and stored master history
  const masterHistoryLogs = useMemo(() => {
    const logsMap = new Map<string, PinHistoryEntry>();

    // 1. Logs from stored master history logs
    const storedLogs = loadStoredMasterLogs();
    storedLogs.forEach(log => {
      if (log && log.id) {
        logsMap.set(log.id, log);
      }
    });

    // 2. Logs from current line pins in memory
    pins.forEach(pin => {
      if (pin.historyLogs && Array.isArray(pin.historyLogs)) {
        pin.historyLogs.forEach(l => {
          if (l && l.id) logsMap.set(l.id, l);
        });
      }
    });

    // 3. If viewing ALL lines or another line, scan compact overrides
    const linesToScan: ProductionLineId[] = historyLineFilter === 'ALL'
      ? ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5']
      : [historyLineFilter as ProductionLineId];

    linesToScan.forEach(lineId => {
      if (lineId !== selectedLineId) {
        const overrides = loadPinOverrides(lineId);
        Object.values(overrides).forEach(override => {
          if (override?.historyLogs && Array.isArray(override.historyLogs)) {
            override.historyLogs.forEach(l => {
              if (l && l.id) logsMap.set(l.id, l);
            });
          }
        });
      }
    });

    const allLogs = Array.from(logsMap.values());

    return allLogs
      .filter(log => {
        if (!log) return false;
        const matchLine = historyLineFilter === 'ALL' || log.lineId === historyLineFilter;
        const matchStage = historyStageFilter === 'ALL' || log.stageId === historyStageFilter;
        const matchAction = historyActionFilter === 'ALL' || log.actionType === historyActionFilter;
        const q = (historySearch || '').toLowerCase();
        const matchSearch =
          q === '' ||
          (log.pinCode && log.pinCode.toLowerCase().includes(q)) ||
          (log.partName && log.partName.toLowerCase().includes(q)) ||
          (log.technician && log.technician.toLowerCase().includes(q)) ||
          (log.remarks && log.remarks.toLowerCase().includes(q));

        const logDate = log.dateTime ? String(log.dateTime).slice(0, 10) : '';
        let matchDate = true;
        if (historyStartDate && logDate < historyStartDate) matchDate = false;
        if (historyEndDate && logDate > historyEndDate) matchDate = false;

        return matchLine && matchStage && matchAction && matchSearch && matchDate;
      })
      .sort((a, b) => {
        const dateA = a.dateTime ? String(a.dateTime) : '';
        const dateB = b.dateTime ? String(b.dateTime) : '';
        return dateB.localeCompare(dateA);
      });
  }, [pins, selectedLineId, historyLineFilter, historyStageFilter, historyActionFilter, historySearch, historyStartDate, historyEndDate, logsUpdateCounter]);

  // Handle pin click
  const handlePinClick = (pin: DiePinItem) => {
    setSelectedPin(pin);
  };

  // Toggle stage accordion cleanly with event isolation
  const toggleStageExpand = (stageId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedStages(prev => {
      const current = prev[stageId] !== undefined ? prev[stageId] : true;
      return {
        ...prev,
        [stageId]: !current
      };
    });
  };

  // Expand all or collapse all stages reliably across all lines and stages
  const handleToggleAllStages = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    activeStageConfigs.forEach(s => {
      next[s.stageId] = expand;
    });
    setExpandedStages(next);
  };

  // Execute Swap Entire Stage / Batch Maintenance (Replace New, Regrind) for all parts in the selected stage
  const handleSaveSwapStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageForSwap) return;

    if (!swapTechnicianName.trim()) {
      setFeedback({
        type: 'error',
        message: 'กรุณากรอกชื่อช่างซ่อม / ผู้บันทึก (Technician Name is required)'
      });
      return;
    }

    if (!swapMachineShotInput || swapMachineShotInput <= 0) {
      setFeedback({
        type: 'error',
        message: 'กรุณาระบุเลขมิเตอร์ช็อตเครื่องล่าสุด ณ ขณะเปลี่ยน (Latest Machine Shot is required)'
      });
      return;
    }

    const currentRecordedMachineShot = swapMachineShotInput;
    let actionLabelTh = '';
    const updatedPins = [...pins];

    // Find all pins belonging to this stage
    const stagePins = updatedPins.filter(p => p.stageId === selectedStageForSwap.stageId);

    if (stagePins.length === 0) {
      setFeedback({
        type: 'error',
        message: 'ไม่พบตำแหน่งอะไหล่ใน Stage นี้'
      });
      return;
    }

    // Prepare variables for updating
    stagePins.forEach(pin => {
      const calculatedUsedShots = Math.max(0, currentRecordedMachineShot - pin.lastReplacementShot);
      let nextStatus: PinStatus = 'normal';
      let nextShots = 0;
      let nextLastReplacementShot = currentRecordedMachineShot;
      let nextRegrindCount = pin.regrindCount;
      let nextGrindDepth = pin.totalGrindDepthMm;
      let nextShim = pin.shimThicknessMm;

      if (swapActionType === 'REPLACE_NEW') {
        nextStatus = 'normal';
        nextShots = 0;
        nextLastReplacementShot = currentRecordedMachineShot;
        nextRegrindCount = 0;
        nextGrindDepth = 0;
        nextShim = 0;
        actionLabelTh = 'เปลี่ยนอะไหล่ยก Stage (Full Stage Replacement)';
      } else if (swapActionType === 'REGRIND') {
        nextRegrindCount = Math.min(pin.regrindCount + 1, pin.maxRegrind);
        nextGrindDepth = Number((nextGrindDepth + swapRegrindDepthMm).toFixed(2));
        nextShim = Number((nextShim + swapShimThicknessMm).toFixed(2));
        nextShots = 0;
        nextLastReplacementShot = currentRecordedMachineShot;
        nextStatus = nextRegrindCount >= pin.maxRegrind ? 'warning' : 'normal';
        actionLabelTh = `ส่งเจียรยก Stage ลับคมครั้งที่ ${nextRegrindCount} (-${swapRegrindDepthMm}mm / +Shim ${swapShimThicknessMm}mm)`;
      }

      const historyEntry: PinHistoryEntry = {
        id: `LOG-SWAP-${pin.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        dateTime: swapDateTime.replace('T', ' '),
        lineId: selectedLineId,
        stageId: pin.stageId,
        stageName: pin.stageName,
        pinCode: pin.pinCode,
        partName: pin.partName,
        actionType: swapActionType,
        actionLabelTh,
        machineShot: currentRecordedMachineShot,
        pinShot: calculatedUsedShots,
        technician: swapTechnicianName,
        regrindDepthMm: swapActionType === 'REGRIND' ? swapRegrindDepthMm : undefined,
        shimThicknessMm: swapActionType === 'REGRIND' ? swapShimThicknessMm : undefined,
        remarks: swapRemarks || '-'
      };

      pin.status = nextStatus;
      pin.currentShots = nextShots;
      pin.lastReplacementShot = nextLastReplacementShot;
      pin.lastReplacementDate = swapDateTime.replace('T', ' ');
      pin.regrindCount = nextRegrindCount;
      pin.totalGrindDepthMm = nextGrindDepth;
      pin.shimThicknessMm = nextShim;
      pin.lastAction = actionLabelTh;
      pin.lastTechnician = swapTechnicianName;
      pin.historyLogs = [historyEntry, ...(pin.historyLogs || [])].slice(0, 10);
    });

    // Write a master consolidated Replacement Record in storageService for the entire stage!
    if (swapActionType === 'REPLACE_NEW') {
      try {
        const recordRes = storageService.recordReplacement({
          lineId: selectedLineId,
          partCode: selectedStageForSwap.partCode,
          stageName: selectedStageForSwap.stageName,
          position: 'ALL',
          replacementType: 'FULL SET REPLACEMENT',
          fullSetOrPartial: 'FULL_SET',
          installedQuantity: selectedStageForSwap.totalPins,
          changedQuantity: selectedStageForSwap.totalPins,
          machineShotAtReplacement: currentRecordedMachineShot,
          removedPartUsedShot: 0,
          removedPartRegrindCount: 0,
          changedBy: swapTechnicianName,
          replacementReason: swapRemarks || 'เปลี่ยนอะไหล่ใหม่ยกชุด (Full Stage Replacement)',
          note: `Swap Stage: ${swapRemarks}`
        });

        if (!recordRes.success) {
          console.warn('Full set replacement failed rules verification, registering directly:', recordRes.error);
        }

        // Deduct from spare stock if enabled
        if (swapDeductStock) {
          const stocks = storageService.getSpareStocks();
          const stock = stocks.find(s => s.partCode === selectedStageForSwap.partCode);
          if (stock) {
            const currentOnHand = stock.onHandQuantity !== undefined ? stock.onHandQuantity : (stock.currentStockQty || 0);
            const newOnHand = Math.max(0, currentOnHand - selectedStageForSwap.totalPins);
            storageService.saveSpareStock({
              ...stock,
              onHandQuantity: newOnHand,
              currentStockQty: newOnHand,
              availableQuantity: Math.max(0, newOnHand - (stock.reservedQuantity || 0) - (stock.quarantineQuantity || 0))
            });
          }
        }
      } catch (err) {
        console.error('Error logging swap stage replacement record:', err);
      }
    } else if (swapActionType === 'REGRIND') {
      try {
        regrindService.receiveFromDieLayout({
          lineId: selectedLineId,
          stageName: selectedStageForSwap.stageName,
          positionId: 'ALL (ENTIRE STAGE)',
          partName: selectedStageForSwap.partName,
          partCode: selectedStageForSwap.partCode,
          removedPartRegrindCount: 0,
          defectReason: 'NORMAL_WEAR',
          notes: swapRemarks || `Full Stage Regrind at Machine Shot ${currentRecordedMachineShot}`,
          technicianName: swapTechnicianName
        });
      } catch (err) {
        console.warn('Auto-logging batch regrind record:', err);
      }
    }

    persistPins(updatedPins);

    setFeedback({
      type: 'success',
      message: `บันทึกรายการ "${swapActionType === 'REPLACE_NEW' ? 'เปลี่ยนอะไหล่ยก Stage' : 'ส่งเจียรยก Stage'}" สำหรับ ${selectedStageForSwap.stageName} (${stagePins.length} ตำแหน่ง) สำเร็จ!`
    });
    setTimeout(() => setFeedback(null), 3500);

    setSelectedStageForSwap(null);
  };

  // Execute Operator Action (Replace New, Regrind, Broken) with Enforced Latest Machine Shot Reading
  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPin) return;

    if (!technicianName.trim()) {
      setFeedback({
        type: 'error',
        message: 'กรุณากรอกชื่อช่างซ่อม / ผู้บันทึก (Technician Name is required)'
      });
      return;
    }

    if (!machineShotInput || machineShotInput <= 0) {
      setFeedback({
        type: 'error',
        message: 'กรุณาระบุเลขมิเตอร์ช็อตเครื่องล่าสุด ณ ขณะเปลี่ยน (Latest Machine Shot is required)'
      });
      return;
    }

    const currentRecordedMachineShot = machineShotInput;
    const calculatedUsedShots = Math.max(0, currentRecordedMachineShot - selectedPin.lastReplacementShot);

    let nextStatus: PinStatus = 'normal';
    let nextShots = 0;
    let nextLastReplacementShot = currentRecordedMachineShot;
    let nextRegrindCount = selectedPin.regrindCount;
    let nextGrindDepth = selectedPin.totalGrindDepthMm;
    let nextShim = selectedPin.shimThicknessMm;
    let actionLabelTh = '';

    if (actionType === 'REPLACE_NEW') {
      nextStatus = 'normal';
      nextShots = 0;
      nextLastReplacementShot = currentRecordedMachineShot;
      nextRegrindCount = 0;
      nextGrindDepth = 0;
      nextShim = 0;
      actionLabelTh = 'เปลี่ยนอะไหล่ใหม่ (Replace New)';

      // Record to storageService replacement history
      storageService.recordReplacement({
        lineId: selectedLineId,
        partCode: selectedPin.partCode,
        stageName: selectedPin.stageName,
        position: selectedPin.pinCode,
        replacementType: 'PARTIAL REPLACEMENT',
        fullSetOrPartial: 'PARTIAL',
        installedQuantity: 1,
        changedQuantity: 1,
        machineShotAtReplacement: currentRecordedMachineShot,
        removedPartUsedShot: calculatedUsedShots,
        removedPartRegrindCount: selectedPin.regrindCount,
        changedBy: technicianName || currentUser.name,
        replacementReason: remarks || 'Partial replacement via 2D Die Layout',
        evidenceAttachment: damagePhotoUrl || undefined,
        note: remarks
      });
    } else if (actionType === 'REGRIND') {
      nextRegrindCount = Math.min(selectedPin.regrindCount + 1, selectedPin.maxRegrind);
      nextGrindDepth = Number((nextGrindDepth + regrindDepthMm).toFixed(2));
      nextShim = Number((nextShim + shimThicknessMm).toFixed(2));
      nextShots = 0;
      nextLastReplacementShot = currentRecordedMachineShot;
      nextStatus = nextRegrindCount >= selectedPin.maxRegrind ? 'warning' : 'normal';
      actionLabelTh = `ส่งเจียรลับคมครั้งที่ ${nextRegrindCount} (-${regrindDepthMm}mm / +Shim ${shimThicknessMm}mm)`;

      // Auto-queue ticket to Tooling Regrinding Management System
      try {
        regrindService.receiveFromDieLayout({
          lineId: selectedLineId,
          stageName: selectedPin.stageName,
          positionId: selectedPin.pinCode,
          partName: selectedPin.partName,
          partCode: selectedPin.partCode,
          removedPartRegrindCount: selectedPin.regrindCount,
          defectReason: calculatedUsedShots >= selectedPin.maxShots ? 'NORMAL_WEAR' : 'CHIPPED',
          notes: remarks || `Sent from 2D Die Layout at Machine Shot ${currentRecordedMachineShot}`,
          technicianName: technicianName || currentUser.name
        });
      } catch (err) {
        console.warn('Auto-logging regrind record:', err);
      }
    } else if (actionType === 'BROKEN') {
      nextStatus = 'broken';
      nextShots = calculatedUsedShots;
      actionLabelTh = 'แจ้งชำรุด / แตกหัก (Broken Alert)';
    }

    const historyEntry: PinHistoryEntry = {
      id: `LOG-${Date.now()}`,
      dateTime: actionDateTime.replace('T', ' '),
      lineId: selectedLineId,
      stageId: selectedPin.stageId,
      stageName: selectedPin.stageName,
      pinCode: selectedPin.pinCode,
      partName: selectedPin.partName,
      actionType,
      actionLabelTh,
      machineShot: currentRecordedMachineShot,
      pinShot: calculatedUsedShots,
      technician: technicianName || currentUser.name,
      regrindDepthMm: actionType === 'REGRIND' ? regrindDepthMm : undefined,
      shimThicknessMm: actionType === 'REGRIND' ? shimThicknessMm : undefined,
      remarks: remarks || '-',
      photoUrl: damagePhotoUrl || undefined
    };

    const updatedPin: DiePinItem = {
      ...selectedPin,
      status: nextStatus,
      currentShots: nextShots,
      lastReplacementShot: nextLastReplacementShot,
      lastReplacementDate: actionDateTime.replace('T', ' '),
      regrindCount: nextRegrindCount,
      totalGrindDepthMm: nextGrindDepth,
      shimThicknessMm: nextShim,
      lastAction: actionLabelTh,
      lastTechnician: technicianName || currentUser.name,
      historyLogs: [historyEntry, ...(selectedPin.historyLogs || [])].slice(0, 10)
    };

    const nextPins = pins.map(p => (p.id === selectedPin.id ? updatedPin : p));
    persistPins(nextPins);

    setFeedback({
      type: 'success',
      message: `บันทึกรายการ "${actionLabelTh}" สำหรับตำแหน่ง ${selectedPin.pinCode} (Shot เครื่อง: ${formatShots(currentRecordedMachineShot)}) เรียบร้อยแล้ว`
    });
    setTimeout(() => setFeedback(null), 3500);

    setSelectedPin(null);
  };

  // Export Master History to Excel (.xlsx)
  const handleExportCSV = () => {
    const data = masterHistoryLogs.map(log => ({
      'Date & Time': log.dateTime,
      'Line': `Line ${log.lineId}`,
      'Stage': log.stageName,
      'Position Code': log.pinCode,
      'Tooling Part': log.partName,
      'Action Taken': log.actionLabelTh || log.actionType,
      'Machine Shot at Event': log.machineShot,
      'Pin Accumulated Shot': log.pinShot,
      'Technician': log.technician,
      'Grind Depth (mm)': log.regrindDepthMm ?? '',
      'Shim Thickness (mm)': log.shimThicknessMm ?? '',
      'Remarks': log.remarks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Log');
    
    const colWidths = [
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 30 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `FinDie_Layout_Maintenance_Log_${selectedLineId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 1. Clear Master History (Supports current line or all lines, and system replacements)
  const handleClearMasterHistory = (scope: 'CURRENT_LINE' | 'ALL_LINES', clearSystemReplacements: boolean) => {
    // 1. Clear stored master logs
    const stored = loadStoredMasterLogs();
    if (scope === 'ALL_LINES') {
      saveStoredMasterLogs([]);
    } else {
      const filtered = stored.filter(l => l.lineId !== selectedLineId);
      saveStoredMasterLogs(filtered);
    }

    // 2. Clear current line pins in memory
    const updatedPins = pins.map(pin => ({
      ...pin,
      historyLogs: []
    }));
    persistPins(updatedPins);

    // 3. Clear compact overrides
    const linesToClear: ProductionLineId[] = scope === 'ALL_LINES'
      ? ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5']
      : [selectedLineId];

    linesToClear.forEach(lineId => {
      try {
        const savedCompact = localStorage.getItem(`${COMPACT_PIN_OVERRIDES_KEY}${lineId}`);
        if (savedCompact) {
          const overrides = JSON.parse(savedCompact);
          let modified = false;
          Object.keys(overrides).forEach(pinId => {
            if (overrides[pinId].historyLogs && overrides[pinId].historyLogs.length > 0) {
              overrides[pinId].historyLogs = [];
              modified = true;
            }
          });
          if (modified) {
            safeStorage.setItem(`${COMPACT_PIN_OVERRIDES_KEY}${lineId}`, JSON.stringify(overrides));
          }
        }
      } catch (err) {
        console.warn('Error clearing history for line ' + lineId, err);
      }
    });

    // 4. Optionally clear system replacement records
    if (clearSystemReplacements) {
      try {
        if (scope === 'ALL_LINES') {
          safeStorage.setItem('fin_press_replacements', JSON.stringify([]));
        } else {
          const currentReplacements = storageService.getReplacements();
          const filteredReplacements = currentReplacements.filter(r => r.lineId !== selectedLineId);
          safeStorage.setItem('fin_press_replacements', JSON.stringify(filteredReplacements));
        }
      } catch (err) {
        console.warn('Error clearing system replacements:', err);
      }
    }

    setLogsUpdateCounter(c => c + 1);
    loadLinePins(false);

    setFeedback({
      type: 'success',
      message: language === 'TH' 
        ? `ล้างประวัติ Master Log (${scope === 'ALL_LINES' ? 'ทุกไลน์ทั้งหมด' : `Line ${selectedLineId}`}) เรียบร้อยแล้ว` 
        : `Master history cleared successfully (${scope === 'ALL_LINES' ? 'All Lines' : `Line ${selectedLineId}`})`
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 2. Set / Seed Master History
  const handleApplySeedLogs = (seededLogs: PinHistoryEntry[], scope: ProductionLineId | 'ALL') => {
    // 1. Merge into stored master logs
    const currentStored = loadStoredMasterLogs();
    const storedMap = new Map<string, PinHistoryEntry>();
    currentStored.forEach(l => storedMap.set(l.id, l));
    seededLogs.forEach(l => storedMap.set(l.id, l));
    saveStoredMasterLogs(Array.from(storedMap.values()));

    // 2. Attach relevant logs to current line pins if line matches
    const updatedPins = pins.map(pin => {
      const matchingLogs = seededLogs.filter(l => l.lineId === selectedLineId && (l.pinCode === pin.pinCode || l.stageId === pin.stageId));
      if (matchingLogs.length > 0) {
        return {
          ...pin,
          historyLogs: [...matchingLogs, ...(pin.historyLogs || [])].slice(0, 10)
        };
      }
      return pin;
    });
    persistPins(updatedPins);

    // 3. Attach to other lines' compact overrides
    const targetLines: ProductionLineId[] = scope === 'ALL'
      ? ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5']
      : [scope];

    targetLines.forEach(lineId => {
      if (lineId !== selectedLineId) {
        const overrides = loadPinOverrides(lineId);
        const lineLogs = seededLogs.filter(l => l.lineId === lineId);
        if (lineLogs.length > 0) {
          const firstKey = Object.keys(overrides)[0] || `${lineId}-stage-log`;
          if (!overrides[firstKey]) overrides[firstKey] = {};
          overrides[firstKey].historyLogs = [
            ...lineLogs,
            ...(overrides[firstKey].historyLogs || [])
          ].slice(0, 10);
          savePinOverrides(lineId, overrides);
        }
      }
    });

    setLogsUpdateCounter(c => c + 1);
    loadLinePins(false);

    setFeedback({
      type: 'success',
      message: language === 'TH' 
        ? `Set ประวัติของ Master Log สำเร็จแล้ว (${seededLogs.length} รายการ)` 
        : `Master history seeded successfully (${seededLogs.length} entries)`
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 3. Add Manual Log Entry
  const handleAddManualLog = (newLog: PinHistoryEntry) => {
    // 1. Save to stored master logs
    const currentStored = loadStoredMasterLogs();
    saveStoredMasterLogs([newLog, ...currentStored]);

    // 2. If it belongs to current line, attach to matching pin if found
    if (newLog.lineId === selectedLineId) {
      const updatedPins = pins.map(pin => {
        if (pin.stageId === newLog.stageId && (pin.pinCode === newLog.pinCode || newLog.pinCode === 'ALL')) {
          return {
            ...pin,
            historyLogs: [newLog, ...(pin.historyLogs || [])].slice(0, 10)
          };
        }
        return pin;
      });
      persistPins(updatedPins);
    } else {
      // Save in overrides of that line
      const overrides = loadPinOverrides(newLog.lineId);
      const key = `${newLog.lineId}-${newLog.stageId}-${newLog.pinCode}`;
      if (!overrides[key]) overrides[key] = {};
      overrides[key].historyLogs = [newLog, ...(overrides[key].historyLogs || [])].slice(0, 10);
      savePinOverrides(newLog.lineId, overrides);
    }

    setLogsUpdateCounter(c => c + 1);
    loadLinePins(false);

    setFeedback({
      type: 'success',
      message: language === 'TH'
        ? `บันทึกรายการ "${newLog.partName}" (${newLog.pinCode}) ลงใน Master Log เรียบร้อยแล้ว`
        : `Log entry for ${newLog.pinCode} recorded in Master Log`
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 4. Delete individual history log entry
  const handleDeleteLog = (logId: string) => {
    // Remove from stored master logs
    const currentStored = loadStoredMasterLogs();
    saveStoredMasterLogs(currentStored.filter(l => l.id !== logId));

    // Remove from current line pins
    const updatedPins = pins.map(pin => {
      if (pin.historyLogs && pin.historyLogs.some(log => log.id === logId)) {
        return {
          ...pin,
          historyLogs: pin.historyLogs.filter(log => log.id !== logId)
        };
      }
      return pin;
    });
    persistPins(updatedPins);

    // Remove from other lines' overrides
    const linesList: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
    linesList.forEach(lineId => {
      const overrides = loadPinOverrides(lineId);
      let modified = false;
      Object.keys(overrides).forEach(key => {
        if (overrides[key]?.historyLogs?.some(l => l.id === logId)) {
          overrides[key].historyLogs = overrides[key].historyLogs!.filter(l => l.id !== logId);
          modified = true;
        }
      });
      if (modified) {
        savePinOverrides(lineId, overrides);
      }
    });

    setLogsUpdateCounter(c => c + 1);
    loadLinePins(false);

    setFeedback({
      type: 'success',
      message: language === 'TH' ? 'ลบรายการประวัติสำเร็จแล้ว' : 'History log entry deleted successfully'
    });
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn font-sans text-slate-100 pb-8 w-full">
      {/* ======================================================== */}
      {/* 1. TOP BAR: LINE SELECTOR + UNIFIED 1-BLOCK BADGE + KPIS */}
      {/* ======================================================== */}
      <div className="sticky top-[-1rem] lg:top-[-1.5rem] z-30 backdrop-blur-2xl rounded-2xl lg:rounded-3xl p-3.5 sm:p-4 shadow-2xl space-y-3.5 border border-white/10 liquid-glass-card">
        {/* Row 1: Line Selector & Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Layers className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white font-mono tracking-tight uppercase">
                  DIE STAGES 2D MATRIX
                </h1>
              </div>
              <div className="text-xs text-slate-400 font-thai">
                ผังแม่พิมพ์เต็มชุดตามใบตรวจสอบแม่พิมพ์จริง (บันทึก Shot ล่าสุดของเครื่องทุกครั้งก่อนเปลี่ยน)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('DIE_LAYOUT')}
                className={`liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all active:scale-95 ${
                  viewMode === 'DIE_LAYOUT'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 border-none shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                    : 'text-slate-300 hover:text-white bg-transparent border-transparent'
                }`}
              >
                <GridIcon className="w-3.5 h-3.5" />
                <span>2D DIE LAYOUT</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('MASTER_HISTORY')}
                className={`liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all active:scale-95 ${
                  viewMode === 'MASTER_HISTORY'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 border-none shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                    : 'text-slate-300 hover:text-white bg-transparent border-transparent'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>MASTER LOG ({masterHistoryLogs.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Production Line Selector + 3 Status Counter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {showLineSelector && (
            <div className="flex-1 min-w-[280px]">
              <LineFilterSelector
                selectedLine={selectedLineId}
                onSelectLine={line => setSelectedLineId(line)}
              />
            </div>
          )}

          {/* 3 Industrial Status Counters */}
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
              <span>NORMAL / ACTIVE: <b>{stats.normal}</b> ({stats.total > 0 ? Math.round((stats.normal / stats.total) * 100) : 100}%)</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span>
              <span>WARNING: <b>{stats.warning}</b></span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]"></span>
              <span>BROKEN: <b>{stats.broken}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono font-bold animate-fadeIn shadow-2xl ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/60 text-rose-300'
              : feedback.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
              : 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {feedback.type === 'error' && <AlertOctagon className="w-4 h-4 text-rose-400" />}
            {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {feedback.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MODE: DIE LAYOUT (UNIFIED 1-BLOCK PER STAGE ACCORDION) */}
      {/* ======================================================== */}
      {viewMode === 'DIE_LAYOUT' && (
        <div className="space-y-4">
          {/* Controls: Search, Stage Filter, Status Filter & Expand/Collapse All */}
          <div className="liquid-glass-card rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 border border-white/10 shadow-lg">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาตำแหน่ง, พันช์, ใบมีด..."
                  className="liquid-input w-full rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Stage Filter */}
              <select
                value={selectedStageFilter}
                onChange={e => setSelectedStageFilter(e.target.value)}
                className="liquid-input bg-[#090d16] border border-white/20 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer shadow-md"
              >
                <option value="ALL" className="bg-[#090d16] text-white font-bold py-1.5">
                  ทุก STAGE (All {activeStageConfigs.length} Stages)
                </option>
                {activeStageConfigs.map(s => (
                  <option key={s.stageId} value={s.stageId} className="bg-[#090d16] text-slate-100 py-1">
                    {s.shortName}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="liquid-input bg-[#090d16] border border-white/20 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer shadow-md"
              >
                <option value="ALL" className="bg-[#090d16] text-white font-bold py-1.5">สถานะทั้งหมด</option>
                <option value="normal" className="bg-[#090d16] text-emerald-300 py-1">● ปกติ (Active)</option>
                <option value="warning" className="bg-[#090d16] text-amber-300 py-1">▲ เฝ้าระวัง (Warning)</option>
                <option value="broken" className="bg-[#090d16] text-rose-300 py-1">✖ ชำรุด (Broken)</option>
              </select>
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleAllStages(true)}
                className="liquid-pill px-3 py-1.5 text-xs font-mono font-bold text-cyan-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>กางทุก Stage</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllStages(false)}
                className="liquid-pill px-3 py-1.5 text-xs font-mono font-bold text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>ย่อทั้งหมด</span>
              </button>
            </div>
          </div>

          {/* List of Unified Stages */}
          {activeStageConfigs
            .filter(stage => selectedStageFilter === 'ALL' || stage.stageId === selectedStageFilter)
            .map(stage => {
              const summary = stageSummaries.find(s => s.stage.stageId === stage.stageId);
              const isExpanded = expandedStages[stage.stageId] !== undefined ? expandedStages[stage.stageId] : true;
              const allStagePins = pins.filter(p => p.stageId === stage.stageId);

              return (
                <div
                  key={stage.stageId}
                  className={`liquid-glass-card rounded-2xl overflow-hidden transition-all duration-300 ${
                    summary?.broken && summary.broken > 0
                      ? 'border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/30'
                      : summary?.warning && summary.warning > 0
                      ? 'border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-500/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Stage Accordion Header (Left: Stage Name ONLY; Right: Collapse/Expand Pill) */}
                  <div
                    onClick={() => toggleStageExpand(stage.stageId)}
                    className="p-4 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer flex items-center justify-between gap-3 select-none transition-colors border-b border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide drop-shadow-sm">
                        {getCleanStageName(stage.stageName)}
                      </h2>
                    </div>

                    {/* Dedicated Expand / Collapse Button with Isolated Click Event */}
                    <button
                      type="button"
                      onClick={(e) => toggleStageExpand(stage.stageId, e)}
                      className="liquid-pill px-3.5 py-1.5 text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <span>{isExpanded ? 'ย่อผัง' : 'กางผัง'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                  </div>

                  {/* ======================================================== */}
                  {/* 2D DIE PIN GRID CONTAINER */}
                  {/* ======================================================== */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                            <GridIcon className="w-4 h-4 text-cyan-400" />
                            <span>ผังบล็อก {getCleanStageName(stage.stageName)} ({stage.totalPins} ตำแหน่ง)</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStageForSwap(stage)}
                            className="liquid-pill px-3 py-1.5 text-xs font-mono font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 flex items-center gap-1.5 shadow transition-all active:scale-95"
                          >
                            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                            <span>เปลี่ยน/เจียรยกบล็อก (Swap Entire Stage)</span>
                          </button>
                        </div>
                      </div>

                      {/* 2D Block Grid Scroll Area */}
                      <div className="overflow-x-auto custom-scrollbar p-3.5 sm:p-4 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md">
                        <div className="inline-block min-w-max space-y-2">
                          {/* Column / Block Index Markers (Continuous 1 to Max N) */}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold select-none">
                            <div className="w-16 text-right pr-2 text-[10px] font-mono font-black text-cyan-400 select-none whitespace-nowrap tracking-wider">
                              BLOCK
                            </div>
                            <div className="flex items-center gap-1 px-1">
                              {Array.from({ length: stage.cols }).map((_, cIdx) => {
                                const blockNum = cIdx + 1;
                                return (
                                  <div
                                    key={blockNum}
                                    className="w-8 text-center text-[10px] text-slate-300 bg-white/[0.06] py-0.5 rounded-md border border-white/10 font-bold tabular-nums"
                                    title={`Block ${blockNum}`}
                                  >
                                    {blockNum}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Rows of Pins in Stage */}
                          {Array.from({ length: stage.rows }).map((_, rIdx) => {
                            const rowNum = rIdx + 1;
                            let rowLabel = rowNum === 1 ? '1st' : rowNum === 2 ? '2nd' : '3rd';
                            if (stage.gridType === 'DIE_SEGMENTS') {
                              rowLabel = rowNum === 1 ? 'DIE A' : 'DIE B';
                            } else if (stage.gridType === 'ROW_BLADES') {
                              rowLabel = 'BLADE';
                            } else if (stage.gridType === 'CUT_OFF' || stage.gridType === 'SIDE_CUT') {
                              rowLabel = rowNum === 1 ? 'UPPER' : 'DOWN';
                            }

                            return (
                              <div key={rowNum} className="flex items-center gap-1.5">
                                {/* Row Identifier Label */}
                                <div className="w-16 text-right pr-2 text-[11px] font-mono font-bold text-slate-400 select-none whitespace-nowrap">
                                  {rowLabel}
                                </div>

                                {/* Row Items */}
                                <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors">
                                  {Array.from({ length: stage.cols }).map((_, cIdx) => {
                                    const colNum = cIdx + 1;
                                    const pin = allStagePins.find(p => p.row === rowNum && p.col === colNum);
                                    const continuousSeqNo = (rowNum - 1) * stage.cols + colNum;

                                    if (!pin) {
                                      return (
                                        <div
                                          key={colNum}
                                          className="w-8 h-8 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-[10px] font-mono text-slate-600"
                                        >
                                          {continuousSeqNo}
                                        </div>
                                      );
                                    }

                                    // Color Coding with Liquid Obsidian Glow
                                    let bgStyle = 'bg-emerald-500 text-black font-black border-emerald-400/80 hover:ring-2 hover:ring-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]';
                                    let icon = null;

                                    if (pin.status === 'warning') {
                                      bgStyle = 'bg-amber-400 text-amber-950 font-black border-amber-300 animate-pulse hover:ring-2 hover:ring-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.6)]';
                                    } else if (pin.status === 'broken') {
                                      bgStyle = 'bg-rose-500 text-white font-black border-rose-300 animate-pulse hover:ring-2 hover:ring-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.75)]';
                                      icon = <AlertOctagon className="w-3 h-3 text-white inline-block mr-0.5" />;
                                    }

                                    const shotPct = Math.round((pin.currentShots / pin.maxShots) * 100);
                                    const displaySeqNo = pin.seqNo || continuousSeqNo;

                                    return (
                                      <button
                                        key={pin.id}
                                        type="button"
                                        onClick={() => handlePinClick(pin)}
                                        title={`Block No. ${displaySeqNo} (Col ${pin.col}, ${pin.rowLabel}) | ${getCleanStageName(pin.stageName)}\nสถานะ: ${pin.status.toUpperCase()}\nช็อตใช้งาน: ${formatShots(pin.currentShots)} / ${formatShots(pin.maxShots)} (${shotPct}%)\nช็อตเครื่องรอบก่อน: ${formatShots(pin.lastReplacementShot)}\nคลิกเพื่อเปลี่ยนอะไหล่ / บันทึกช็อตเครื่องล่าสุด`}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-mono border flex items-center justify-center transition-all cursor-pointer relative group group-hover:z-50 active:scale-95 ${bgStyle}`}
                                      >
                                        <span className="tabular-nums flex items-center justify-center">
                                          {icon}
                                          {displaySeqNo}
                                        </span>

                                        {/* Compact & Smart-Positioned Tooltip on Hover */}
                                        <div 
                                          className={`absolute ${
                                            rowNum === 1 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                                          } ${
                                            colNum <= 3
                                              ? 'left-0'
                                              : colNum >= stage.cols - 2
                                              ? 'right-0'
                                              : 'left-1/2 -translate-x-1/2'
                                          } hidden group-hover:flex flex-col items-center z-50 pointer-events-none`}
                                        >
                                          <div className="bg-[#0b0c10]/95 backdrop-blur-md rounded-lg p-2 text-[10px] font-mono shadow-2xl whitespace-nowrap space-y-1 border border-emerald-500/50 text-left min-w-[140px]">
                                            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-0.5">
                                              <span className="font-bold text-cyan-300">No. {displaySeqNo}</span>
                                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-normal">
                                                Blk {colNum}
                                              </span>
                                            </div>
                                            <div className="text-emerald-400 font-bold flex items-center justify-between gap-2">
                                              <span className="text-slate-400 font-normal">Shots:</span>
                                              <span>{formatShots(pin.currentShots)} ({shotPct}%)</span>
                                            </div>
                                            <div className="text-slate-300 flex items-center justify-between gap-2">
                                              <span className="text-slate-400 font-normal">Last Shot:</span>
                                              <span>{formatShots(pin.lastReplacementShot)}</span>
                                            </div>
                                            <div className="text-amber-300 flex items-center justify-between gap-2">
                                              <span className="text-slate-400 font-normal">Regrind:</span>
                                              <span>{pin.regrindCount}/{pin.maxRegrind} cycles</span>
                                            </div>
                                            {pin.status === 'broken' && (
                                              <div className="text-rose-400 font-bold text-[9px] pt-0.5 border-t border-rose-500/30 text-center">
                                                🚨 ชำรุด (BROKEN)
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CLEAN OPERATOR ACTION MODAL (ENFORCING RECORD LATEST SHOT) */}
      {/* ======================================================== */}
      {selectedPin && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="liquid-glass-card border border-white/15 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-sm border shadow-lg ${
                  selectedPin.status === 'broken'
                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                    : selectedPin.status === 'warning'
                    ? 'bg-amber-950 text-amber-300 border-amber-500'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                }`}>
                  {selectedPin.rowLabel}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <span>{selectedPin.partName} ({selectedPin.pinCode})</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono">
                      Line {selectedLineId}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 font-thai">
                    {getCleanStageName(selectedPin.stageName)} • Col {selectedPin.col}, Row {selectedPin.rowLabel} (No. {selectedPin.seqNo})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="liquid-pill p-2 rounded-full text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MANDATORY: Record Latest Machine Shot Input Card */}
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 space-y-3 font-mono shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>บันทึกเลขมิเตอร์ช็อตเครื่องล่าสุด ณ ขณะเปลี่ยน (MANDATORY MACHINE SHOT) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
                    const live = lineMonitoring?.machineShotTotal || 0;
                    setMachineShotInput(live);
                  }}
                  className="liquid-pill px-3 py-1 rounded-full bg-blue-900/60 hover:bg-blue-800/80 text-[11px] text-cyan-200 border border-blue-400/50 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  ดึงจากมิเตอร์สด ({formatShots(storageService.getLineMonitoring(selectedLineId)?.machineShotTotal || 0)})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={machineShotInput || ''}
                    onChange={e => setMachineShotInput(parseInt(e.target.value) || 0)}
                    placeholder="กรอกเลขช็อตเครื่องล่าสุด..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-base text-cyan-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                  <div className="text-[10px] text-slate-400 mt-1 font-thai">
                    * ต้องจำเป็นต้องบันทึก Shot ล่าสุดของเครื่องทุกครั้งก่อนเปลี่ยนหรือเจียรอะไหล่นั้นๆ
                  </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400">ช็อตเปลี่ยนรอบก่อน:</div>
                  <div className="font-bold text-slate-200 font-mono">{formatShots(selectedPin.lastReplacementShot)}</div>
                  <div className="text-[10px] text-emerald-400 font-bold border-t border-white/10 pt-1 font-mono">
                    ช็อตใช้งานจริง: {formatShots(Math.max(0, machineShotInput - selectedPin.lastReplacementShot))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Metrics Snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">CURRENT SHOT LIFE</div>
                <div className="text-base font-bold text-cyan-300">
                  {formatShots(selectedPin.currentShots)} <span className="text-xs text-slate-400 font-normal">/ {formatShots(selectedPin.maxShots)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${
                      selectedPin.currentShots >= selectedPin.maxShots * 0.9 ? 'bg-rose-500' : selectedPin.currentShots >= selectedPin.maxShots * 0.7 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, (selectedPin.currentShots / selectedPin.maxShots) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">LAST REPLACEMENT SHOT</div>
                <div className="text-base font-bold text-slate-200">
                  {formatShots(selectedPin.lastReplacementShot)}
                </div>
                <div className="text-[10px] text-slate-400 font-thai">
                  วิ่งมาแล้ว {formatShots(selectedPin.currentShots)} ช็อต
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">REGRIND COUNT</div>
                <div className="text-base font-bold text-amber-300">
                  {selectedPin.regrindCount} <span className="text-xs text-slate-400 font-normal">/ {selectedPin.maxRegrind} cycles</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  เจียรสะสม: {selectedPin.totalGrindDepthMm}mm / Shim: +{selectedPin.shimThicknessMm}mm
                </div>
              </div>
            </div>

            {/* Operator Action Entry Form (Replace, Regrind, Broken) */}
            <form onSubmit={handleSaveAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase font-mono">
                  เลือกการดำเนินการสำหรับตำแหน่งนี้ *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* 1. เปลี่ยนอะไหล่ใหม่ (Replace New) */}
                  <button
                    type="button"
                    onClick={() => setActionType('REPLACE_NEW')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      actionType === 'REPLACE_NEW'
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Wrench className="w-5 h-5 text-emerald-400" />
                      {actionType === 'REPLACE_NEW' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-bold font-mono text-emerald-300">เปลี่ยนอะไหล่ใหม่ (Replace)</div>
                      <div className="text-[10px] text-slate-400 font-thai">บันทึกช็อตเครื่อง & รีเซ็ตช็อต 0</div>
                    </div>
                  </button>

                  {/* 2. ส่งเจียรลับคม (Send to Regrind) */}
                  <button
                    type="button"
                    onClick={() => setActionType('REGRIND')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      actionType === 'REGRIND'
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <RotateCcw className="w-5 h-5 text-amber-400" />
                      {actionType === 'REGRIND' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-bold font-mono text-amber-300">ส่งเจียรลับคม (Regrind)</div>
                      <div className="text-[10px] text-slate-400 font-thai">+1 รอบเจียร & ออกใบงาน</div>
                    </div>
                  </button>

                  {/* 3. แจ้งชำรุด (Report Broken) */}
                  <button
                    type="button"
                    onClick={() => setActionType('BROKEN')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      actionType === 'BROKEN'
                        ? 'bg-rose-950/90 border-rose-400 text-rose-300 ring-2 ring-rose-500/50 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <AlertOctagon className="w-5 h-5 text-rose-400" />
                      {actionType === 'BROKEN' && <Check className="w-4 h-4 text-rose-400" />}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-bold font-mono text-rose-300">แจ้งชำรุด (Report Broken)</div>
                      <div className="text-[10px] text-slate-400 font-thai">แจ้งเตือนเปลี่ยนด่วน (แดง)</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Regrind Parameters (if Regrind selected) */}
              {actionType === 'REGRIND' && (
                <div className="grid grid-cols-2 gap-3 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 font-mono text-xs">
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">ความหนาเจียรออก (มม.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="1.50"
                      value={regrindDepthMm}
                      onChange={e => setRegrindDepthMm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">ความหนาชิมรองชดเชย (มม.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.00"
                      max="1.50"
                      value={shimThicknessMm}
                      onChange={e => setShimThicknessMm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Form Fields: Technician, Date-Time, Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">ช่างซ่อม / ผู้บันทึก *</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={technicianName}
                      onChange={e => setTechnicianName(e.target.value)}
                      placeholder="ระบุชื่อช่าง..."
                      className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">วัน-เวลา *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-white absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="datetime-local"
                      value={actionDateTime}
                      onChange={e => setActionDateTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-600 rounded pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-xs font-mono">
                  สาเหตุ / หมายเหตุ *
                </label>
                <div className="space-y-1.5">
                  <select
                    onChange={e => {
                      if (e.target.value) setRemarks(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 font-thai focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- เลือกสาเหตุมาตรฐาน --</option>
                    {COMMON_REASONS.map((r, idx) => (
                      <option key={idx} value={r}>{r}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="ระบุรายละเอียดเพิ่มเติม เช่น รอยแตกที่ปลาย Punch, การติดขัด..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-thai focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* SECTION: Evidence & Damage Photo Upload (Responsive for Mobile & Desktop) */}
              <div className="pt-2 pb-1 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>แนบรูปถ่ายความเสียหาย (DAMAGE PHOTO & EVIDENCE)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-thai">เพื่อใช้วิเคราะห์ในการประชุมคุณภาพ</span>
                </div>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImageFile(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImageFile(file);
                    e.target.value = '';
                  }}
                />

                {/* Photo Dropzone or Preview */}
                {!damagePhotoUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverPhoto(true);
                    }}
                    onDragLeave={() => setIsDragOverPhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverPhoto(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                      isDragOverPhoto
                        ? 'border-cyan-400 bg-cyan-950/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    {isCompressingPhoto ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-cyan-400 text-xs font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังประมวลผลและบีบอัดรูปภาพ...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer min-h-[44px]"
                        >
                          <Camera className="w-4 h-4" />
                          <span>ถ่ายรูปทันที (กล้องมือถือ)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold active:scale-95 transition-all cursor-pointer min-h-[44px]"
                        >
                          <UploadCloud className="w-4 h-4 text-cyan-400" />
                          <span>เลือกจากคลังภาพ / PC</span>
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-2 font-thai">
                      รองรับไฟล์ภาพ JPEG, PNG, WEBP (ระบบบีบอัดอัตโนมัติเพื่อประหยัดพื้นที่)
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => setActivePhotoModal({
                          url: damagePhotoUrl,
                          title: `ภาพความเสียหายตำแหน่ง ${selectedPin.pinCode} (${selectedPin.partName})`,
                          subtitle: `Line ${selectedLineId} • ${selectedPin.stageName}`,
                          timestamp: actionDateTime.replace('T', ' '),
                          technician: technicianName || currentUser.name,
                          remarks: remarks || 'แนบหลักฐานความเสียหาย'
                        })}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 cursor-pointer group flex-shrink-0 bg-black shadow"
                      >
                        <img 
                          src={damagePhotoUrl} 
                          alt="Damage Evidence" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="text-xs font-mono">
                        <div className="text-rose-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>แนบรูปภาพแล้ว (พร้อมบันทึก)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-thai mt-0.5">
                          คลิกรูปภาพเพื่อดูขนาดเต็มก่อนบันทึก
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePhotoModal({
                          url: damagePhotoUrl,
                          title: `ภาพความเสียหายตำแหน่ง ${selectedPin.pinCode} (${selectedPin.partName})`,
                          subtitle: `Line ${selectedLineId} • ${selectedPin.stageName}`,
                          timestamp: actionDateTime.replace('T', ' '),
                          technician: technicianName || currentUser.name,
                          remarks: remarks || 'แนบหลักฐานความเสียหาย'
                        })}
                        className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1"
                        title="ดูรูปขนาดเต็ม"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ดูภาพ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDamagePhotoUrl(null)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="ลบรูปภาพนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ลบรูป</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mini Recent History Log */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    RECENT HISTORY (ประวัติการซ่อมเฉพาะตำแหน่ง {selectedPin.pinCode})
                  </span>
                  <span className="text-[10px] text-slate-500">{(selectedPin.historyLogs || []).length} logs</span>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {(selectedPin.historyLogs && selectedPin.historyLogs.length > 0) ? (
                    selectedPin.historyLogs.slice(0, 5).map((log, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.actionType === 'REPLACE_NEW'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : log.actionType === 'REGRIND'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}>
                            {log.actionType}
                          </span>
                          <span className="text-slate-300 font-thai">{log.remarks}</span>

                          {/* Photo Evidence Badge if available */}
                          {log.photoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoModal({
                                  url: log.photoUrl!,
                                  title: `หลักฐานความเสียหาย: ${log.partName} (${log.pinCode})`,
                                  subtitle: `Line ${log.lineId} • ${log.stageName}`,
                                  timestamp: log.dateTime,
                                  technician: log.technician,
                                  remarks: log.remarks
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-900 transition-colors"
                            >
                              <Camera className="w-3 h-3 text-rose-400" />
                              <span>ดูรูป</span>
                            </button>
                          )}
                        </div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-2">
                          <span>Shot เครื่อง: {formatShots(log.machineShot)}</span>
                          <span>•</span>
                          <span>{log.dateTime}</span>
                          <span>•</span>
                          <span className="text-slate-400">{log.technician}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2.5 text-xs text-slate-500 font-thai">
                      ยังไม่มีประวัติการซ่อมบำรุงสำหรับตำแหน่งนี้
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons (Sticky on mobile for seamless tap accessibility) */}
              <div className="sticky bottom-0 sm:static bg-slate-900/95 sm:bg-transparent -mx-4 -mb-4 p-4 sm:p-0 sm:mx-0 sm:mb-0 flex items-center justify-end gap-3 pt-3 border-t border-white/10 z-10 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  className="flex-1 sm:flex-initial liquid-pill px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-mono font-bold border border-white/10 active:scale-95 cursor-pointer min-h-[44px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial liquid-pill px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 active:scale-95 cursor-pointer border-none min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนอะไหล่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3.5 SWAP ENTIRE STAGE MODAL (BATCH UPDATE / MAINTENANCE) */}
      {/* ======================================================== */}
      {selectedStageForSwap && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="liquid-glass-card border border-white/15 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-sm border shadow-lg bg-cyan-950/80 text-cyan-300 border-cyan-400/50">
                  ALL
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <span>เปลี่ยน/เจียรบำรุงยกชุด — {getCleanStageName(selectedStageForSwap.stageName)}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono">
                      Line {selectedLineId}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 font-thai">
                    1 Set = {selectedStageForSwap.totalPins} ชิ้น • พาร์ทหลัก: {selectedStageForSwap.partName} ({selectedStageForSwap.partCode})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStageForSwap(null)}
                className="liquid-pill p-2 rounded-full text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MANDATORY: Record Latest Machine Shot Input Card */}
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 space-y-3 font-mono shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>บันทึกเลขมิเตอร์ช็อตเครื่องล่าสุด ณ ขณะซ่อมยกชุด (MANDATORY MACHINE SHOT) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const lineMonitoring = storageService.getLineMonitoring(selectedLineId);
                    const live = lineMonitoring?.machineShotTotal || 0;
                    setSwapMachineShotInput(live);
                  }}
                  className="liquid-pill px-3 py-1 rounded-full bg-blue-900/60 hover:bg-blue-800/80 text-[11px] text-cyan-200 border border-blue-400/50 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  ดึงจากมิเตอร์สด ({formatShots(storageService.getLineMonitoring(selectedLineId)?.machineShotTotal || 0)})
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <input
                    type="number"
                    min="1"
                    value={swapMachineShotInput || ''}
                    onChange={e => setSwapMachineShotInput(parseInt(e.target.value) || 0)}
                    placeholder="กรอกเลขช็อตเครื่องล่าสุด..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-base text-cyan-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    required
                  />
                  <div className="text-[10px] text-slate-400 mt-1 font-thai">
                    * จำเป็นต้องบันทึก Shot ล่าสุดของเครื่องเพื่อให้ช็อตสะสมใน Stage นี้เริ่มนับใหม่จากจุดนี้อย่างถูกต้องทั้งชุดพร้อมกัน
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Info Card & Stock Option */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">STAGE CAPACITY / SIZE</div>
                <div className="text-sm font-bold text-slate-200 mt-1 font-thai">
                  จำนวนพาร์ท: <span className="text-cyan-300 font-bold">{selectedStageForSwap.totalPins} ชิ้น</span> ({selectedStageForSwap.cols} คอลัมน์ × {selectedStageForSwap.rows} แถว)
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-thai">
                  ระบบจะอัปเดตสถานะและตั้งค่าช็อตสะสมสำหรับทุกตำแหน่งใน Stage นี้เป็น 0 ช็อต
                </div>
              </div>

              {swapActionType === 'REPLACE_NEW' && (
                <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pl-0 sm:pl-3 pt-2 sm:pt-0">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">INVENTORY SYSTEM INTEGRATION</div>
                  <label className="flex items-start gap-2 cursor-pointer select-none mt-2">
                    <input
                      type="checkbox"
                      checked={swapDeductStock}
                      onChange={e => setSwapDeductStock(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 font-thai">ตัดสต็อกพาร์ทอะไหล่อัตโนมัติ (Deduct Spare Stock)</span>
                      <p className="text-[10px] text-slate-400 font-thai mt-0.5">
                        ระบบจะหักลบสต็อกอะไหล่ในคลังสำหรับรหัส <span className="text-amber-400 font-bold">{selectedStageForSwap.partCode}</span> ออกจำนวน <span className="text-cyan-400 font-bold">{selectedStageForSwap.totalPins} ชิ้น</span> ทันทีที่ดำเนินการสำเร็จ
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Operator Action Entry Form (Replace, Regrind) */}
            <form onSubmit={handleSaveSwapStage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase font-mono">
                  เลือกการดำเนินการสำหรับทั้ง Stage *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. เปลี่ยนอะไหล่ใหม่ (Replace New) */}
                  <button
                    type="button"
                    onClick={() => setSwapActionType('REPLACE_NEW')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      swapActionType === 'REPLACE_NEW'
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Wrench className="w-5 h-5 text-emerald-400" />
                      {swapActionType === 'REPLACE_NEW' && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-bold font-mono text-emerald-300">เปลี่ยนพาร์ทใหม่ยกบล็อก (Replace New)</div>
                      <div className="text-[10px] text-slate-400 font-thai">บันทึกประวัติเปลี่ยนใหม่ & เริ่มนับชีวิตจาก 0 ช็อต</div>
                    </div>
                  </button>

                  {/* 2. ส่งเจียรลับคม (Send to Regrind) */}
                  <button
                    type="button"
                    onClick={() => setSwapActionType('REGRIND')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      swapActionType === 'REGRIND'
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <RotateCcw className="w-5 h-5 text-amber-400" />
                      {swapActionType === 'REGRIND' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-xs font-bold font-mono text-amber-300">ส่งเจียรลับคมยกชุด (Batch Regrind)</div>
                      <div className="text-[10px] text-slate-400 font-thai">บวกรอบเจียรสะสม +1 & เริ่มนับช็อตรอบเจียรใหม่จาก 0</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Regrind Parameters (if Regrind selected) */}
              {swapActionType === 'REGRIND' && (
                <div className="grid grid-cols-2 gap-3 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 font-mono text-xs">
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">ความหนาเจียรออก (มม.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="1.50"
                      value={swapRegrindDepthMm}
                      onChange={e => setSwapRegrindDepthMm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">ความหนาชิมรองชดเชย (มม.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.00"
                      max="1.50"
                      value={swapShimThicknessMm}
                      onChange={e => setSwapShimThicknessMm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Form Fields: Technician, Date-Time, Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">ช่างซ่อม / ผู้บันทึกยกบล็อก *</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={swapTechnicianName}
                      onChange={e => setSwapTechnicianName(e.target.value)}
                      placeholder="ระบุชื่อช่าง..."
                      className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">วัน-เวลาดำเนินการ *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-white absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="datetime-local"
                      value={swapDateTime}
                      onChange={e => setSwapDateTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-600 rounded pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-xs font-mono">
                  สาเหตุ / หมายเหตุในการทำบำรุงรักษายกบล็อก *
                </label>
                <div className="space-y-1.5">
                  <select
                    onChange={e => {
                      if (e.target.value) setSwapRemarks(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 font-thai focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- เลือกสาเหตุมาตรฐาน --</option>
                    {COMMON_REASONS.map((r, idx) => (
                      <option key={idx} value={r}>{r}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    value={swapRemarks}
                    onChange={e => setSwapRemarks(e.target.value)}
                    placeholder="ระบุรายละเอียดหรือความจำเป็นในการเปลี่ยนยกสเตจ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-thai focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedStageForSwap(null)}
                  className="liquid-pill px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-mono font-bold border border-white/10 active:scale-95 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="liquid-pill px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 active:scale-95 cursor-pointer border-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันการทำบำรุงรักษายก Stage ({selectedStageForSwap.totalPins} ชิ้น)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MASTER HISTORY VIEW */}
      {/* ======================================================== */}
      {viewMode === 'MASTER_HISTORY' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters & Export */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="ค้นหาประวัติ: รหัส, ช่าง, สาเหตุ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Line Filter */}
              <select
                value={historyLineFilter}
                onChange={e => setHistoryLineFilter(e.target.value)}
                className="bg-[#090d16] border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm font-bold"
              >
                <option value="ALL" className="bg-[#090d16] text-white font-bold py-1">ทุกสายการผลิต (All Lines)</option>
                <option value="E1" className="bg-[#090d16] text-cyan-300 py-1">LINE E1 (Ø7 Slit)</option>
                <option value="E2" className="bg-[#090d16] text-cyan-300 py-1">LINE E2 (Ø5 Slit)</option>
                <option value="E3-1" className="bg-[#090d16] text-cyan-300 py-1">LINE E3-1 (3P)</option>
                <option value="E3-2" className="bg-[#090d16] text-cyan-300 py-1">LINE E3-2 (4P)</option>
                <option value="E3-3" className="bg-[#090d16] text-cyan-300 py-1">LINE E3-3 (4P)</option>
                <option value="E4" className="bg-[#090d16] text-cyan-300 py-1">LINE E4 (Ø5 Slit)</option>
                <option value="E5" className="bg-[#090d16] text-cyan-300 py-1">LINE E5 (Ø5 Slit)</option>
              </select>

              <select
                value={historyStageFilter}
                onChange={e => setHistoryStageFilter(e.target.value)}
                className="bg-[#090d16] border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
              >
                <option value="ALL" className="bg-[#090d16] text-white font-bold py-1">ทุก STAGE (All Stages)</option>
                {activeStageConfigs.map(s => (
                  <option key={s.stageId} value={s.stageId} className="bg-[#090d16] text-slate-100 py-1">{s.shortName}</option>
                ))}
              </select>

              <select
                value={historyActionFilter}
                onChange={e => setHistoryActionFilter(e.target.value)}
                className="bg-[#090d16] border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
              >
                <option value="ALL" className="bg-[#090d16] text-white font-bold py-1">ทุกประเภทการทำงาน (All Actions)</option>
                <option value="REPLACE_NEW" className="bg-[#090d16] text-emerald-300 py-1">● เปลี่ยนอะไหล่ใหม่ (Replace)</option>
                <option value="REGRIND" className="bg-[#090d16] text-cyan-300 py-1">⚡ ส่งเจียรลับคม (Regrind)</option>
                <option value="BROKEN" className="bg-[#090d16] text-rose-300 py-1">✖ แจ้งชำรุด (Broken)</option>
                <option value="SETUP_CHANGE" className="bg-[#090d16] text-amber-300 py-1">⚙ Toolroom Setup Overhaul</option>
              </select>

              <DateRangeFilter
                startDate={historyStartDate}
                endDate={historyEndDate}
                onChangeRange={(start, end) => {
                  setHistoryStartDate(start);
                  setHistoryEndDate(end);
                }}
                className="flex-1 min-w-[300px]"
                maxDaysAllowed={365}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Set Master Log button */}
              <button
                type="button"
                onClick={() => setIsSetLogModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/50 hover:to-blue-500/50 text-cyan-300 hover:text-white text-xs font-mono font-bold border border-cyan-500/50 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                title="Set ประวัติมาตรฐานโรงงาน หรือบันทึกประวัติย้อนหลังด้วยตนเอง"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>SET ประวัติ</span>
              </button>

              {/* Clear Master History button */}
              <button
                type="button"
                onClick={() => setIsClearLogModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 text-xs font-mono font-bold border border-rose-800/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
                title="ล้างประวัติ Master Log เฉพาะไลน์หรือทุกไลน์"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>ล้างประวัติ</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>EXPORT EXCEL (.XLSX)</span>
              </button>
            </div>
          </div>

          {/* Master History Table */}
          <div className="bg-[#0D1527] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="p-3">วัน-เวลา</th>
                    <th className="p-3">Line & Stage</th>
                    <th className="p-3">ตำแหน่ง (Pos)</th>
                    <th className="p-3">ชิ้นส่วนแม่พิมพ์</th>
                    <th className="p-3">ประเภทงาน</th>
                    <th className="p-3 text-right">Shot เครื่อง</th>
                    <th className="p-3 text-right">Shot ใช้งาน</th>
                    <th className="p-3">ช่างผู้บันทึก</th>
                    <th className="p-3">หลักฐานรูปถ่าย</th>
                    <th className="p-3">หมายเหตุ</th>
                    <th className="p-3 text-center text-rose-400">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {masterHistoryLogs.length > 0 ? (
                    masterHistoryLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-300">{log.dateTime}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-cyan-300">Line {log.lineId}</span>
                          <span className="text-slate-400 block text-[10px]">{log.stageName}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-slate-200">{log.pinCode}</td>
                        <td className="p-3 text-slate-300">{log.partName}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.actionType === 'REPLACE_NEW'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : log.actionType === 'REGRIND'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : log.actionType === 'BROKEN'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700'
                              : 'bg-purple-950 text-purple-300 border border-purple-700'
                          }`}>
                            {log.actionLabelTh || log.actionType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-cyan-300">{formatShots(log.machineShot)}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatShots(log.pinShot)}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">{log.technician}</td>
                        <td className="p-3 whitespace-nowrap">
                          {log.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setActivePhotoModal({
                                url: log.photoUrl!,
                                title: `หลักฐานความเสียหาย: ${log.partName} (${log.pinCode})`,
                                subtitle: `Line ${log.lineId} • ${log.stageName} • Shot: ${formatShots(log.pinShot)}`,
                                timestamp: log.dateTime,
                                technician: log.technician,
                                remarks: log.remarks
                              })}
                              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
                            >
                              <Camera className="w-3.5 h-3.5 text-rose-400" />
                              <span>ดูรูปถ่าย</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 font-thai max-w-xs truncate" title={log.remarks}>
                          {log.remarks}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDeletingLog(log)}
                            className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-400 hover:text-rose-100 cursor-pointer transition-all inline-flex items-center justify-center active:scale-90"
                            title={language === 'TH' ? 'ลบรายการนี้' : 'Delete log entry'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500 font-thai">
                        ไม่พบประวัติการซ่อมบำรุงตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DAMAGE EVIDENCE PHOTO LIGHTBOX MODAL */}
      {/* ======================================================== */}
      {activePhotoModal && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setActivePhotoModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                  <Camera className="w-4 h-4 text-rose-400" />
                  <span>{activePhotoModal.title}</span>
                </h3>
                {activePhotoModal.subtitle && (
                  <p className="text-xs text-cyan-400 font-mono mt-0.5">
                    {activePhotoModal.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Container */}
            <div className="p-4 sm:p-6 bg-black flex items-center justify-center overflow-auto flex-1 max-h-[60vh]">
              <img
                src={activePhotoModal.url}
                alt={activePhotoModal.title}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>

            {/* Lightbox Footer with Metadata */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-slate-400 flex items-center gap-2">
                  <span className="text-slate-500">บันทึกโดย:</span>
                  <span className="text-slate-200 font-bold">{activePhotoModal.technician || 'N/A'}</span>
                  <span>•</span>
                  <span className="text-slate-500">เวลา:</span>
                  <span className="text-slate-300">{activePhotoModal.timestamp || '-'}</span>
                </div>
                {activePhotoModal.remarks && (
                  <div className="text-slate-300 font-thai text-[11px]">
                    <span className="text-slate-500 font-mono">สาเหตุ/อาการ: </span>
                    {activePhotoModal.remarks}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePhotoModal.url}
                  download={`Damage_Evidence_${Date.now()}.jpg`}
                  className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>บันทึกรูปภาพ</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  className="px-5 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors text-xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. Master Log Clear Modal */}
      <MasterLogClearModal
        isOpen={isClearLogModalOpen}
        onClose={() => setIsClearLogModalOpen(false)}
        selectedLineId={selectedLineId}
        onConfirmClear={handleClearMasterHistory}
      />

      {/* 2. Master Log Set / Seed / Manual Add Modal */}
      <MasterLogSetModal
        isOpen={isSetLogModalOpen}
        onClose={() => setIsSetLogModalOpen(false)}
        selectedLineId={selectedLineId}
        onApplySeed={handleApplySeedLogs}
        onAddManualLog={handleAddManualLog}
      />

      {/* 3. Master Log Single Delete Modal */}
      <MasterLogDeleteModal
        log={deletingLog}
        onClose={() => setDeletingLog(null)}
        onConfirmDelete={handleDeleteLog}
      />

    </div>
  );
};
