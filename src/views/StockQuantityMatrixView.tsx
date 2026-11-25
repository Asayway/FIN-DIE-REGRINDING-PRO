import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileSpreadsheet, 
  X, 
  Edit3, 
  Sliders, 
  Wrench, 
  RotateCcw,
  Check,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  ShieldAlert,
  Flame,
  ArrowRight,
  Filter
} from 'lucide-react';
import { ProductionLineId, LineActiveConfiguration, PartMaster, PartRepairStockItem, PartWorkpiecePhoto } from '../types';
import { storageService } from '../services/storageService';
import { regrindService } from '../services/regrindService';
import { RegrindWorkTicket } from '../types/regrind';
import { useLanguage } from '../i18n';
import { StageManagementModal } from '../components/common/StageManagementModal';
import { exportPartRepairStockExcel } from '../utils/excelExport';
import { DEFAULT_STAGE_GROUPS, deriveLogicalStage, sortStagesInOrder } from '../utils/stageUtils';

interface LineColDefinition {
  id: ProductionLineId;
  label: string;
  headerName: string;
  subName: string;
}

const LINE_COLUMNS: LineColDefinition[] = [
  { id: 'E1', label: 'E1', headerName: 'E1', subName: 'Ø7 Slit' },
  { id: 'E2', label: 'E2', headerName: 'E2', subName: 'Ø5 Slit' },
  { id: 'E3-1', label: 'E3-1', headerName: 'E3-1', subName: 'Slit 3P' },
  { id: 'E3-2', label: 'E3-2', headerName: 'E3-2', subName: 'WL+ 4P' },
  { id: 'E3-3', label: 'E3-3', headerName: 'E3-3', subName: 'New Cor 4P' },
  { id: 'E4', label: 'E4', headerName: 'E4', subName: 'Ø5 Slit' },
  { id: 'E5', label: 'E5', headerName: 'E5', subName: 'Ø5 Slit' },
];

interface StockQuantityMatrixViewProps {
  onNavigateToMaster?: () => void;
}

export const StockQuantityMatrixView: React.FC<StockQuantityMatrixViewProps> = ({
  onNavigateToMaster
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const [lines, setLines] = useState<LineActiveConfiguration[]>([]);
  const [partMasters, setPartMasters] = useState<PartMaster[]>([]);
  const [queueTickets, setQueueTickets] = useState<RegrindWorkTicket[]>([]);
  const [storedRepairStocks, setStoredRepairStocks] = useState<Record<string, PartRepairStockItem>>({});
  const [workpiecePhotos, setWorkpiecePhotos] = useState<Record<string, PartWorkpiecePhoto[]>>({});
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [statusQuickFilter, setStatusQuickFilter] = useState<'ALL' | 'LOW' | 'IN_PROCESS' | 'AWAITING'>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, Partial<PartRepairStockItem>>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; partCode: string } | null>(null);

  // Stage Grouping Manager Modal State
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);

  const loadData = () => {
    setLines(storageService.getLineConfigs());
    setPartMasters(storageService.getPartMasters());
    setQueueTickets(regrindService.getQueueTickets());
    setStoredRepairStocks(storageService.getPartRepairStocks());
    setWorkpiecePhotos(storageService.getAllPartWorkpiecePhotos());
  };

  useEffect(() => {
    loadData();
    const unsubStorage = storageService.subscribe(loadData);
    const unsubRegrind = regrindService.subscribe(loadData);
    return () => {
      unsubStorage();
      unsubRegrind();
    };
  }, []);

  // Stage color badge style
  const getStageColor = (stage: string) => {
    const stg = (stage || '').toUpperCase();
    if (stg.includes('PIERCE') || stg.includes('BURRING')) return 'border-[#FFCC00] text-[#FFCC00]';
    if (stg.includes('IRONING')) return 'border-blue-400 text-blue-400';
    if (stg.includes('LOUVER') || stg.includes('SLIT')) return 'border-emerald-400 text-emerald-400';
    if (stg.includes('REFLAIRE') || stg.includes('REFLARE')) return 'border-purple-400 text-purple-400';
    if (stg.includes('NOTCH') || stg.includes('PUNCH')) return 'border-sky-400 text-sky-400';
    if (stg.includes('CUT OFF') || stg.includes('SIDE CUT')) return 'border-rose-400 text-rose-400';
    if (stg.includes('FORMING')) return 'border-teal-400 text-teal-400';
    if (stg.includes('PILOT') || stg.includes('FEED')) return 'border-orange-400 text-orange-400';
    return 'border-slate-500 text-slate-300';
  };

  // Unique list of stages for dropdown
  const stageOptions = useMemo(() => {
    const rawGroups = storageService.getStageGroups();
    const seen = new Set<string>();
    const uniqueList: string[] = [];

    rawGroups.forEach(g => {
      const normalized = g.trim().toUpperCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        uniqueList.push(g.trim());
      }
    });

    partMasters.forEach(pm => {
      const derived = pm.stageName || deriveLogicalStage(pm.partName, pm.stageName);
      if (derived && derived !== '-') {
        const normalized = derived.trim().toUpperCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueList.push(derived.trim());
        }
      }
    });

    return sortStagesInOrder(uniqueList);
  }, [partMasters]);

  // Aggregate queue tickets counts by part (in-process vs awaiting regrind)
  const ticketsByPart = useMemo(() => {
    const map: Record<string, { inProcess: number; pending: number }> = {};
    queueTickets.forEach(ticket => {
      const nameKey = (ticket.partName || '').trim().toUpperCase();
      const codeKey = (ticket.partCode || '').trim().toUpperCase();
      const qty = Number(ticket.quantity) || 1;

      const keysToUpdate = [nameKey, codeKey].filter(Boolean);
      keysToUpdate.forEach(key => {
        if (!map[key]) {
          map[key] = { inProcess: 0, pending: 0 };
        }
        if (ticket.status === 'IN_PROCESS') {
          map[key].inProcess += qty;
        } else if (ticket.status === 'PENDING') {
          map[key].pending += qty;
        }
      });
    });
    return map;
  }, [queueTickets]);

  // Build the repaired part stock items rows
  const repairStockRows = useMemo(() => {
    return partMasters.map((pm, index) => {
      const pCode = pm.partCode;
      const cleanCode = pCode.trim().toUpperCase();
      const cleanName = pm.partName.trim().toUpperCase();
      const stored = storedRepairStocks[pCode] || storedRepairStocks[cleanCode];

      // Auto-synced live counts from tickets
      const liveQueue = ticketsByPart[cleanCode] || ticketsByPart[cleanName] || { inProcess: 0, pending: 0 };

      // Calculate initial installed baseline to seed reasonable safety targets
      let installedTotal = 0;
      const lineInstalled: Record<string, number> = {};
      lines.forEach(lineConfig => {
        const qty = lineConfig.installedPartQuantities?.[pCode] || 0;
        lineInstalled[lineConfig.lineId] = qty;
        installedTotal += qty;
      });

      // Default safety target: ~10% to 20% of install quantity (or 10 min)
      const defaultSafetyTarget = installedTotal > 0 ? Math.max(10, Math.round(installedTotal * 0.15)) : 10;

      // Ready-to-use qty (default 0 when not manually saved)
      let readyToUseQty = stored?.readyToUseQty ?? 0;
      let inProcessQty = liveQueue.inProcess;
      let awaitingRepairQty = stored ? (stored.awaitingRepairQty ?? liveQueue.pending) : liveQueue.pending;
      let safetyStockTarget = stored ? (stored.safetyStockTarget ?? defaultSafetyTarget) : defaultSafetyTarget;
      let lineAllocations: Record<string, number> = stored?.lineAllocations || {};
      let notes = stored?.notes || '';

      // Override if in editing mode
      if (isEditing && editValues[pCode]) {
        const e = editValues[pCode];
        if (e.readyToUseQty !== undefined) readyToUseQty = e.readyToUseQty;
        if (e.awaitingRepairQty !== undefined) awaitingRepairQty = e.awaitingRepairQty;
        if (e.inProcessQty !== undefined) inProcessQty = e.inProcessQty;
        if (e.safetyStockTarget !== undefined) safetyStockTarget = e.safetyStockTarget;
        if (e.lineAllocations !== undefined) lineAllocations = e.lineAllocations;
        if (e.notes !== undefined) notes = e.notes;
      }

      const totalCirculationQty = readyToUseQty + inProcessQty + awaitingRepairQty;
      const isBelowSafety = readyToUseQty < safetyStockTarget;
      const isCriticalEmpty = readyToUseQty === 0;

      // Photo thumbnail lookup
      const photos = workpiecePhotos[cleanCode] || workpiecePhotos[cleanName] || [];
      const primaryPhoto = photos.find(p => p.isPrimary) || photos[0];

      return {
        no: index + 1,
        partCode: pCode,
        partName: pm.partName,
        drawingCode: (pm as any).drawingNumber || pCode,
        stageName: pm.stageName || deriveLogicalStage(pm.partName, pm.stageName),
        readyToUseQty,
        inProcessQty,
        awaitingRepairQty,
        totalCirculationQty,
        safetyStockTarget,
        lineAllocations,
        isBelowSafety,
        isCriticalEmpty,
        notes,
        liveQueue,
        primaryPhoto
      };
    });
  }, [partMasters, storedRepairStocks, ticketsByPart, lines, isEditing, editValues, workpiecePhotos]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return repairStockRows.filter(row => {
      const matchSearch = 
        row.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.drawingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.stageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.no.toString() === searchTerm.trim();

      if (!matchSearch) return false;

      if (selectedStageFilter !== 'ALL') {
        if (row.stageName.toUpperCase() !== selectedStageFilter.toUpperCase()) {
          return false;
        }
      }

      if (statusQuickFilter === 'LOW') {
        if (!row.isBelowSafety) return false;
      } else if (statusQuickFilter === 'IN_PROCESS') {
        if (row.inProcessQty <= 0) return false;
      } else if (statusQuickFilter === 'AWAITING') {
        if (row.awaitingRepairQty <= 0) return false;
      }

      return true;
    });
  }, [repairStockRows, searchTerm, selectedStageFilter, statusQuickFilter]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let totalReady = 0;
    let totalInProcess = 0;
    let totalAwaiting = 0;
    let totalPool = 0;
    let lowBufferCount = 0;
    let inProcessCount = 0;
    let awaitingCount = 0;

    repairStockRows.forEach(row => {
      totalReady += row.readyToUseQty;
      totalInProcess += row.inProcessQty;
      totalAwaiting += row.awaitingRepairQty;
      totalPool += row.totalCirculationQty;
      if (row.isBelowSafety) lowBufferCount++;
      if (row.inProcessQty > 0) inProcessCount++;
      if (row.awaitingRepairQty > 0) awaitingCount++;
    });

    return {
      totalReady,
      totalInProcess,
      totalAwaiting,
      totalPool,
      lowBufferCount,
      inProcessCount,
      awaitingCount
    };
  }, [repairStockRows]);

  // Quick adjust single row ready stock (+1 or -1)
  const handleQuickAdjustReady = (row: typeof repairStockRows[0], delta: number) => {
    const newQty = Math.max(0, row.readyToUseQty + delta);
    const updatedItem: PartRepairStockItem = {
      id: row.partCode,
      partCode: row.partCode,
      partName: row.partName,
      stageName: row.stageName,
      readyToUseQty: newQty,
      inProcessQty: row.inProcessQty,
      awaitingRepairQty: row.awaitingRepairQty,
      totalCirculationQty: newQty + row.inProcessQty + row.awaitingRepairQty,
      safetyStockTarget: row.safetyStockTarget,
      lineAllocations: row.lineAllocations,
      notes: row.notes,
      updatedAt: new Date().toISOString()
    };

    storageService.savePartRepairStock(updatedItem);
    setSaveSuccessMsg(isEn ? `Updated ready stock "${row.partName}": ${newQty} EA (${delta > 0 ? '+1' : '-1'})` : `ปรับสต็อกพร้อมเบิก "${row.partName}": ${newQty} ชิ้น (${delta > 0 ? '+1' : '-1'})`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Start Full Edit Mode
  const handleStartEdit = () => {
    const initial: Record<string, Partial<PartRepairStockItem>> = {};
    repairStockRows.forEach(r => {
      initial[r.partCode] = {
        readyToUseQty: r.readyToUseQty,
        inProcessQty: r.inProcessQty,
        awaitingRepairQty: r.awaitingRepairQty,
        safetyStockTarget: r.safetyStockTarget,
        lineAllocations: { ...r.lineAllocations },
        notes: r.notes
      };
    });
    setEditValues(initial);
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm(isEn ? 'You have unsaved changes. Discard changes?' : 'คุณมีการแก้ไขที่ยังไม่ได้บันทึก ต้องการยกเลิกใช่หรือไม่?')) {
        return;
      }
    }
    setIsEditing(false);
    setEditValues({});
    setHasUnsavedChanges(false);
  };

  // Save All Changes
  const handleSaveAll = () => {
    try {
      const allStocks = storageService.getPartRepairStocks();
      repairStockRows.forEach(r => {
        const edited = editValues[r.partCode] || {};
        const readyToUseQty = edited.readyToUseQty ?? r.readyToUseQty;
        const inProcessQty = edited.inProcessQty ?? r.inProcessQty;
        const awaitingRepairQty = edited.awaitingRepairQty ?? r.awaitingRepairQty;
        const safetyStockTarget = edited.safetyStockTarget ?? r.safetyStockTarget;
        const lineAllocations = edited.lineAllocations ?? r.lineAllocations;
        const notes = edited.notes ?? r.notes;

        allStocks[r.partCode] = {
          id: r.partCode,
          partCode: r.partCode,
          partName: r.partName,
          stageName: r.stageName,
          readyToUseQty,
          inProcessQty,
          awaitingRepairQty,
          totalCirculationQty: readyToUseQty + inProcessQty + awaitingRepairQty,
          safetyStockTarget,
          lineAllocations,
          notes,
          updatedAt: new Date().toISOString()
        };
      });

      storageService.saveAllPartRepairStocks(allStocks);
      storageService.addAuditLog(
        'STOCK',
        `Updated Stock Part Repair matrix for ${repairStockRows.length} parts`,
        `บันทึกข้อมูลสต็อกอะไหล่หมุนเวียนงานซ่อม ${repairStockRows.length} รายการเรียบร้อยแล้ว`
      );

      setIsEditing(false);
      setEditValues({});
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(isEn ? `Saved repair spare stock for ${repairStockRows.length} parts.` : `บันทึกสต็อกอะไหล่หมุนเวียนงานซ่อม ${repairStockRows.length} รายการสำเร็จแล้ว`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      loadData();
    } catch (err: any) {
      setSaveSuccessMsg(isEn ? `Save failed: ${err.message}` : `บันทึกไม่สำเร็จ: ${err.message}`);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    exportPartRepairStockExcel(repairStockRows, LINE_COLUMNS, language);
  };

  return (
    <div className="space-y-3 font-sans text-white animate-fadeIn pb-8">

      {/* ======================================================== */}
      {/* 1. TOP HEADER & KPI SUMMARY STRIP (Industrial LG Dark) */}
      {/* ======================================================== */}
      <div className="bg-[#111622] border border-[#232f48] p-3 shadow-lg rounded-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#00FF00]/10 border border-[#00FF00]/40 rounded text-[#00FF00]">
                <Wrench className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
                <span>REPAIR SPARE STOCK</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-normal">
                  {isEn ? 'Regrind Circulation Pool' : 'สต็อกอะไหล่หมุนเวียนเฉพาะงานซ่อมเจียร'}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isEn
                ? <>Track rotating repair spare parts across 3 live states: <span className="text-emerald-400 font-semibold">Ready to Issue</span>, <span className="text-purple-400 font-semibold">In-Process Grinding</span>, and <span className="text-amber-400 font-semibold">Awaiting Regrind</span> (isolated from brand-new warehouse inventory).</>
                : <>ติดตามและควบคุมจำนวนอะไหล่หมุนเวียนงานซ่อมแยก 3 สถานะ: <span className="text-emerald-400 font-semibold">พร้อมเบิกใช้งาน</span>, <span className="text-purple-400 font-semibold">กำลังเจียรบนแท่นเครื่อง</span>, และ <span className="text-amber-400 font-semibold">รอส่งซ่อม</span> (แยกอิสระจากสต็อกของใหม่ ไม่ปะปนกับคลังใหญ่)</>}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#162132] border border-[#2d3e58] text-[11px] font-mono text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{isEn ? 'Auto-Synced from Regrind Queue' : 'ซิงค์อัตโนมัติจากระบบคิวงาน'}</span>
            </span>
          </div>
        </div>

        {/* 5 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 font-mono">
          {/* Card 1: Ready to Use */}
          <div className="bg-[#0f1d17] border border-emerald-500/40 p-2.5 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">{isEn ? 'READY TO ISSUE' : 'พร้อมเบิกใช้งาน'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
              {kpis.totalReady.toLocaleString()} <span className="text-xs font-normal text-slate-400">EA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'QC passed & ready for press line' : 'ผ่าน QC พร้อมเบิกเข้าไลน์'}</div>
          </div>

          {/* Card 2: In-Process Grinding */}
          <div className="bg-[#1c152e] border border-purple-500/40 p-2.5 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider">{isEn ? 'IN-PROCESS GRINDING' : 'กำลังเจียรบนเครื่อง'}</span>
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-200 mt-1">
              {kpis.totalInProcess.toLocaleString()} <span className="text-xs font-normal text-slate-400">EA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? `Synced from ${kpis.inProcessCount} active queue jobs` : `ซิงค์จาก ${kpis.inProcessCount} รายการในคิว`}</div>
          </div>

          {/* Card 3: Awaiting Regrind */}
          <div className="bg-[#241c10] border border-amber-500/40 p-2.5 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">{isEn ? 'AWAITING REGRIND' : 'รอส่งซ่อม / รอคิว'}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-200 mt-1">
              {kpis.totalAwaiting.toLocaleString()} <span className="text-xs font-normal text-slate-400">EA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Buffer awaiting regrind in toolroom' : 'บัฟเฟอร์รอเจียรใน Toolroom'}</div>
          </div>

          {/* Card 4: Total Circulation Pool */}
          <div className="bg-[#121c2c] border border-cyan-500/40 p-2.5 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider">{isEn ? 'TOTAL POOL' : 'รวมสต็อกหมุนเวียน'}</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-200 mt-1">
              {kpis.totalPool.toLocaleString()} <span className="text-xs font-normal text-slate-400">EA</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Sum of all 3 repair circulation states' : 'ยอดรวม 3 สถานะงานซ่อม'}</div>
          </div>

          {/* Card 5: Low Buffer Alerts */}
          <div 
            onClick={() => setStatusQuickFilter(prev => prev === 'LOW' ? 'ALL' : 'LOW')}
            className={`border p-2.5 rounded-sm relative overflow-hidden cursor-pointer transition-all ${
              kpis.lowBufferCount > 0 
                ? 'bg-[#2a111a] border-rose-500/60 hover:bg-[#341622]' 
                : 'bg-[#141b24] border-slate-700 hover:bg-[#1a222e]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${kpis.lowBufferCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {isEn ? 'BELOW SAFETY STOCK' : 'ต่ำกว่าเกณฑ์สำรอง'}
              </span>
              {kpis.lowBufferCount > 0 && (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              )}
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${kpis.lowBufferCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
              {kpis.lowBufferCount} <span className="text-xs font-normal text-slate-400">{isEn ? 'parts' : 'พาร์ท'}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Click to filter critical low items' : 'คลิกเพื่อกรองเฉพาะรายการวิกฤต'}</div>
          </div>
        </div>
      </div>

      {/* Alert Banner for Success */}
      {saveSuccessMsg && (
        <div className="bg-[#111111] border border-[#00FF00] text-[#00FF00] px-3 py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00FF00] flex-shrink-0" />
            <span className="text-xs font-mono font-bold">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SEARCH, FILTER & ACTIONS BAR */}
      {/* ======================================================== */}
      <div className="bg-[#111111] border border-[#334155] p-2.5 space-y-2.5 shadow-md">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
          {/* Left Side: Stage filter & Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Stage Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#475569] px-2.5 py-1 text-xs min-w-[200px]">
              <Layers className="w-3.5 h-3.5 text-[#00FF00]" />
              <select
                value={selectedStageFilter}
                onChange={e => setSelectedStageFilter(e.target.value)}
                className="bg-transparent text-[#00FF00] font-mono text-xs font-bold focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL" className="bg-[#111111] text-white">
                  {language === 'TH' ? 'ทุกสเตจ (All Stages)' : 'All Stages'}
                </option>
                {stageOptions.map(stage => (
                  <option key={stage} value={stage} className="bg-[#111111] text-white">
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsStageManagerOpen(true)}
              className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] text-[#00FF00] border border-[#475569] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
              title={isEn ? 'Open Stage Grouping & Management' : 'เปิดหน้าต่างจัดกลุ่มและจัดการ Stage'}
            >
              <Sliders className="w-3.5 h-3.5 text-[#00FF00]" />
              <span>⚙️ {language === 'TH' ? 'จัดกลุ่ม Stage' : 'Group Stages'}</span>
            </button>

            {/* Quick Status Filters */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setStatusQuickFilter('ALL')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer whitespace-nowrap ${
                  statusQuickFilter === 'ALL'
                    ? 'bg-slate-700 text-white border-slate-500 font-bold'
                    : 'bg-[#181818] text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {isEn ? `All (${repairStockRows.length})` : `ทั้งหมด (${repairStockRows.length})`}
              </button>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('LOW')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  statusQuickFilter === 'LOW'
                    ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                    : 'bg-[#181818] text-slate-400 border-slate-700 hover:text-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{isEn ? `Low Stock (${kpis.lowBufferCount})` : `ต่ำกว่าเกณฑ์ (${kpis.lowBufferCount})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('IN_PROCESS')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  statusQuickFilter === 'IN_PROCESS'
                    ? 'bg-purple-950 text-purple-300 border-purple-600 font-bold'
                    : 'bg-[#181818] text-slate-400 border-slate-700 hover:text-purple-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>{isEn ? `Grinding (${kpis.inProcessCount})` : `กำลังเจียร (${kpis.inProcessCount})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusQuickFilter('AWAITING')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  statusQuickFilter === 'AWAITING'
                    ? 'bg-amber-950 text-amber-300 border-amber-600 font-bold'
                    : 'bg-[#181818] text-slate-400 border-slate-700 hover:text-amber-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{isEn ? `Awaiting (${kpis.awaitingCount})` : `รอส่งซ่อม (${kpis.awaitingCount})`}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isEn ? 'Search Part Name or Stage...' : 'ค้นหาชื่อชิ้นส่วน หรือ Stage...'}
                className="w-full pl-8 pr-7 py-1 bg-[#1a1a1a] border border-[#475569] text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00FF00]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-[#222222] hover:bg-[#333333] text-slate-300 text-xs font-bold border border-[#666666] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Cancel' : 'ยกเลิก'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-1.5 bg-[#00FF00] hover:bg-[#00dd00] text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isEn
                      ? `Save Changes (${hasUnsavedChanges ? 'Modified' : 'Ready'})`
                      : `บันทึกการแก้ไข (${hasUnsavedChanges ? 'มีการเปลี่ยนแปลง' : 'พร้อมบันทึก'})`}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-slate-300 border border-[#475569] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#00FF00]" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-[#00FF00] border border-[#00FF00] font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Edit Cells' : 'แก้ไขตัวเลขในตาราง (Edit Cells)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. INDUSTRIAL TABLE WITH LOCKED STICKY HEADERS */}
      {/* ======================================================== */}
      <div className="bg-[#111111] border border-[#334155] shadow-xl overflow-hidden">
        {/* Table Subheader Bar */}
        <div className="p-2.5 bg-[#171d29] border-b border-[#334155] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00FF00]" />
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              {isEn
                ? `REPAIR SPARE STOCK MATRIX (${filteredRows.length} / ${repairStockRows.length} items)`
                : `STOCK PART REPAIR MATRIX (${filteredRows.length} / ${repairStockRows.length} รายการ)`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00FF00]"></span>
              <span>{isEn ? 'Ready to Issue (Buffer)' : 'พร้อมเบิกใช้งาน (Ready Buffer)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>{isEn ? 'Grinding (In-Process)' : 'กำลังเจียร (In-Process)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{isEn ? 'Awaiting Regrind' : 'รอส่งซ่อม (Awaiting Regrind)'}</span>
            </span>
          </div>
        </div>

        {/* Scrollable Container with Sticky Table Headers */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin relative">
          <table 
            className="w-full text-left text-xs font-mono min-w-full" 
            style={{ borderCollapse: 'separate', borderSpacing: 0 }}
          >
            {/* Top Multi-Header Row (Locked at top) */}
            <thead>
              {/* Row 1 Header: Main Divisions (Sticky top-0) */}
              <tr className="text-white select-none">
                <th 
                  colSpan={4} 
                  className="sticky top-0 z-20 bg-[#283244] text-white font-black py-1.5 px-2 border-b border-r border-[#475569] text-left uppercase tracking-wider text-[11px] shadow-xs"
                >
                  1. PART IDENTIFICATION & SPEC
                </th>
                <th 
                  colSpan={4} 
                  className="sticky top-0 z-20 bg-[#1e2a38] text-cyan-300 font-black py-1.5 px-2 border-b border-r border-[#475569] text-center uppercase tracking-wider text-[11px] shadow-xs"
                >
                  {isEn ? '2. REPAIRED PART STATUS (3 CIRCULATION STATES)' : '2. REPAIRED PART STATUS (สต็อกงานซ่อมแยก 3 สถานะ)'}
                </th>
                <th 
                  colSpan={7} 
                  className="sticky top-0 z-20 bg-[#1e3428] text-[#00FF7F] font-black py-1.5 px-2 border-b border-r border-[#475569] text-center uppercase tracking-wider text-[11px] shadow-xs"
                >
                  3. READY STOCK BY LINE ALLOCATION (EA)
                </th>
                <th 
                  colSpan={2} 
                  className="sticky top-0 z-20 bg-[#352a1e] text-amber-300 font-black py-1.5 px-2 border-b border-r border-[#475569] text-center uppercase tracking-wider text-[11px] shadow-xs"
                >
                  4. SAFETY BUFFER & STATUS
                </th>
                <th 
                  colSpan={2} 
                  className="sticky top-0 z-20 bg-[#283244] text-[#FFCC00] font-black py-1.5 px-2 border-b border-[#475569] text-center uppercase tracking-wider text-[11px] shadow-xs min-w-[170px]"
                >
                  5. REMARKS & ACTIONS
                </th>
              </tr>

              {/* Sub Columns Header: Row 2 (Sticky top-27px) */}
              <tr className="text-white font-bold text-[10px] select-none">
                {/* Col 1: No */}
                <th className="sticky top-[27px] z-20 py-1 px-1 w-8 text-center border-b border-r border-[#475569] bg-[#334155]">
                  No
                </th>

                {/* Col 2: Stage */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 min-w-[130px] w-36 text-center border-b border-r border-[#475569] bg-[#334155]">
                  Stage
                </th>

                {/* Col 3: Photo / Spec */}
                <th className="sticky top-[27px] z-20 py-1 px-1 w-16 text-center border-b border-r border-[#475569] bg-[#334155]">
                  <div>{isEn ? 'Photo' : 'รูปชิ้นงาน'}</div>
                  <div className="text-[8px] text-slate-300 font-normal">Photo/Spec</div>
                </th>

                {/* Col 4: Part Name & DWG No. */}
                <th className="sticky top-[27px] z-20 py-1 px-2 min-w-[160px] text-left border-b border-r border-[#475569] bg-[#334155]">
                  Part Name & DWG No.
                </th>

                {/* Col 5: Ready EA */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#143224] text-emerald-300 min-w-[105px]">
                  <div className="font-black text-[11px]">{isEn ? 'Ready' : 'พร้อมเบิก'}</div>
                  <div className="text-[8px] text-emerald-200 font-normal">Ready to Use (EA)</div>
                </th>

                {/* Col 6: In-Process EA */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#2a1a38] text-purple-300 min-w-[95px]">
                  <div className="font-black text-[11px]">{isEn ? 'Grinding' : 'กำลังเจียร'}</div>
                  <div className="text-[8px] text-purple-200 font-normal">In-Process (EA)</div>
                </th>

                {/* Col 7: Awaiting EA */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#382a14] text-amber-300 min-w-[95px]">
                  <div className="font-black text-[11px]">{isEn ? 'Awaiting' : 'รอส่งซ่อม'}</div>
                  <div className="text-[8px] text-amber-200 font-normal">Awaiting (EA)</div>
                </th>

                {/* Col 8: Total Circulation EA */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#1e2a3a] text-cyan-300 min-w-[90px]">
                  <div className="font-black text-[11px]">{isEn ? 'Total Pool' : 'รวมหมุนเวียน'}</div>
                  <div className="text-[8px] text-cyan-200 font-normal">Total Pool (EA)</div>
                </th>

                {/* Cols 9 - 15: Ready per line E1 - E5 */}
                {LINE_COLUMNS.map(col => (
                  <th key={col.id} className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#475569] bg-[#203426] text-[#00FF7F] min-w-[48px]">
                    <div className="font-bold text-white text-[10px]">{col.id}</div>
                    <div className="text-[8px] text-slate-300 font-normal leading-tight">{col.subName}</div>
                  </th>
                ))}

                {/* Col 16: Safety Stock Target */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#3a2d1e] text-amber-300 min-w-[85px]">
                  <div>{isEn ? 'Safety Min' : 'เกณฑ์สำรอง'}</div>
                  <div className="text-[8px] text-slate-300 font-normal">Safety Target</div>
                </th>

                {/* Col 17: Status */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#475569] bg-[#3a2d1e] text-amber-300 min-w-[110px]">
                  <div>{isEn ? 'Status' : 'สถานะความพร้อม'}</div>
                  <div className="text-[8px] text-slate-300 font-normal">Buffer Status</div>
                </th>

                {/* Col 18: Notes */}
                <th className="sticky top-[27px] z-20 py-1 px-2 text-left border-b border-r border-[#475569] bg-[#334155] min-w-[140px]">
                  {isEn ? 'Repair Notes' : 'หมายเหตุงานซ่อม'}
                </th>

                {/* Col 19: Actions */}
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center border-b border-[#475569] bg-[#334155] min-w-[80px]">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-10 text-center text-slate-400 bg-[#161b24] border-b border-[#334155]">
                    {isEn ? 'No repair stock parts matching filter criteria' : 'ไม่พบรายการอะไหล่ซ่อมที่ตรงกับเงื่อนไขการค้นหา'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  let rowBgClass = "bg-[#141a24] hover:bg-[#1a2332]";
                  if (row.isCriticalEmpty) {
                    rowBgClass = "bg-[#291218] hover:bg-[#341620]";
                  } else if (row.isBelowSafety) {
                    rowBgClass = "bg-[#271d13] hover:bg-[#322518]";
                  }

                  const editedRow = isEditing ? (editValues[row.partCode] || {}) : {};

                  return (
                    <tr 
                      key={row.partCode} 
                      className={`${rowBgClass} border-b border-[#242f44] transition-colors`}
                    >
                      {/* Col 1: No */}
                      <td className="py-1 px-1 text-center text-slate-400 font-bold border-r border-[#242f44]">
                        {row.no}
                      </td>

                      {/* Col 2: Stage */}
                      <td className="py-1 px-1 text-center border-r border-[#242f44]">
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold border bg-[#0d1117] uppercase rounded-xs ${getStageColor(row.stageName)}`}>
                          {row.stageName}
                        </span>
                      </td>

                      {/* Col 3: รูปชิ้นงาน (Photo / Spec) */}
                      <td className="py-1 px-1 text-center border-r border-[#242f44]">
                        {row.primaryPhoto ? (
                          <div 
                            onClick={() => setPreviewPhoto({ url: row.primaryPhoto.dataUrl, title: row.partName, partCode: row.partCode })}
                            className="group relative inline-block cursor-pointer"
                            title={isEn ? 'Click to enlarge part photo' : 'คลิกเพื่อดูรูปชิ้นงานขยายใหญ่'}
                          >
                            <img 
                              src={row.primaryPhoto.dataUrl} 
                              alt={row.partName} 
                              className="w-8 h-8 object-cover rounded border border-emerald-500/70 shadow-xs group-hover:scale-110 transition-transform" 
                            />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black shadow-xs"></span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded border border-dashed border-slate-700 mx-auto flex items-center justify-center text-slate-600 bg-[#0d121b]">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      {/* Col 4: Part Name & Drawing No. */}
                      <td className="py-1 px-2 text-left border-r border-[#242f44]">
                        <div className="font-bold text-white text-xs hover:text-[#00FF00] transition-colors">
                          {row.partName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="text-cyan-400">{row.drawingCode}</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-500">{row.partCode}</span>
                        </div>
                      </td>

                      {/* Col 5: พร้อมเบิกใช้งาน (Ready to Use EA) */}
                      <td className="py-1 px-1.5 text-center border-r border-[#242f44] bg-[#0e1d17]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editedRow.readyToUseQty !== undefined ? editedRow.readyToUseQty : row.readyToUseQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditValues(prev => ({
                                ...prev,
                                [row.partCode]: {
                                  ...(prev[row.partCode] || {}),
                                  readyToUseQty: val
                                }
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-16 bg-[#16271f] border border-emerald-500 text-emerald-300 font-black text-center text-xs py-0.5 focus:outline-none rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustReady(row, -1)}
                              disabled={row.readyToUseQty <= 0}
                              className="w-5 h-5 rounded bg-[#16271f] hover:bg-[#1f3a2c] text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                              title={isEn ? 'Decrease ready stock by 1' : 'ลดสต็อกพร้อมเบิก 1 ชิ้น'}
                            >
                              -
                            </button>
                            <span className={`min-w-[34px] font-black text-xs ${
                              row.readyToUseQty === 0 
                                ? 'text-rose-400 font-black' 
                                : row.isBelowSafety 
                                  ? 'text-amber-400 font-black' 
                                  : 'text-emerald-300'
                            }`}>
                              {row.readyToUseQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustReady(row, 1)}
                              className="w-5 h-5 rounded bg-[#16271f] hover:bg-[#1f3a2c] text-emerald-400 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                              title={isEn ? 'Increase ready stock by 1' : 'เพิ่มสต็อกพร้อมเบิก 1 ชิ้น'}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Col 6: กำลังเจียร (In-Process EA) */}
                      <td className="py-1 px-1.5 text-center border-r border-[#242f44] bg-[#1a1426]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editedRow.inProcessQty !== undefined ? editedRow.inProcessQty : row.inProcessQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditValues(prev => ({
                                ...prev,
                                [row.partCode]: {
                                  ...(prev[row.partCode] || {}),
                                  inProcessQty: val
                                }
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-16 bg-[#241a36] border border-purple-500 text-purple-200 font-bold text-center text-xs py-0.5 focus:outline-none rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1 font-bold">
                            <span className={`text-xs ${row.inProcessQty > 0 ? 'text-purple-300 font-black' : 'text-slate-500'}`}>
                              {row.inProcessQty}
                            </span>
                            {row.liveQueue.inProcess > 0 && (
                                <span 
                                  className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" 
                                  title={isEn ? `Synced from active queue: ${row.liveQueue.inProcess} EA` : `ซิงค์ตรงจากคิวงานกำลังเจียร: ${row.liveQueue.inProcess} ชิ้น`}
                                />
                              )}
                            </div>
                          )}
                        </td>

                        {/* Col 7: Awaiting Regrind EA */}
                        <td className="py-1 px-1.5 text-center border-r border-[#242f44] bg-[#22190f]">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editedRow.awaitingRepairQty !== undefined ? editedRow.awaitingRepairQty : row.awaitingRepairQty}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setEditValues(prev => ({
                                  ...prev,
                                  [row.partCode]: {
                                    ...(prev[row.partCode] || {}),
                                    awaitingRepairQty: val
                                  }
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              className="w-16 bg-[#302213] border border-amber-500 text-amber-200 font-bold text-center text-xs py-0.5 focus:outline-none rounded"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-1 font-bold">
                              <span className={`text-xs ${row.awaitingRepairQty > 0 ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                                {row.awaitingRepairQty}
                              </span>
                              {row.liveQueue.pending > 0 && (
                                <span 
                                  className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800"
                                  title={isEn ? `In regrind queue: ${row.liveQueue.pending} EA` : `มีในคิวรอเจียร ${row.liveQueue.pending} ชิ้น`}
                                >
                                  {isEn ? `Queue ${row.liveQueue.pending}` : `คิว ${row.liveQueue.pending}`}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                      {/* Col 8: รวมหมุนเวียน (Total Circulation EA) */}
                      <td className="py-1 px-1.5 text-center border-r border-[#242f44] bg-[#121c29]">
                        <span className="font-black text-cyan-300 text-xs">
                          {row.totalCirculationQty}
                        </span>
                      </td>

                      {/* Cols 9 - 15: Ready per line E1 - E5 */}
                      {LINE_COLUMNS.map(col => {
                        const lineVal = row.lineAllocations[col.id] || 0;
                        return (
                          <td key={col.id} className="py-1 px-1 text-center border-r border-[#242f44]">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editedRow.lineAllocations?.[col.id] ?? lineVal}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setEditValues(prev => ({
                                    ...prev,
                                    [row.partCode]: {
                                      ...(prev[row.partCode] || {}),
                                      lineAllocations: {
                                        ...(prev[row.partCode]?.lineAllocations || row.lineAllocations),
                                        [col.id]: val
                                      }
                                    }
                                  }));
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-11 bg-[#101924] border border-slate-600 text-center text-[10px] text-white py-0.5 rounded focus:border-[#00FF00]"
                              />
                            ) : (
                              <span className={`text-xs ${lineVal > 0 ? 'text-slate-200 font-semibold' : 'text-slate-600'}`}>
                                {lineVal > 0 ? lineVal : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Col 16: Safety Stock Target */}
                      <td className="py-1 px-1.5 text-center border-r border-[#242f44] bg-[#1d1710]">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editedRow.safetyStockTarget !== undefined ? editedRow.safetyStockTarget : row.safetyStockTarget}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditValues(prev => ({
                                ...prev,
                                [row.partCode]: {
                                  ...(prev[row.partCode] || {}),
                                  safetyStockTarget: val
                                }
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-14 bg-[#2b2116] border border-amber-500 text-amber-300 font-bold text-center text-xs py-0.5 focus:outline-none rounded"
                          />
                        ) : (
                          <span className="text-amber-300 font-mono text-xs font-bold">
                            {row.safetyStockTarget} EA
                          </span>
                        )}
                      </td>

                      {/* Col 17: Status Badge */}
                      <td className="py-1 px-1.5 text-center border-r border-[#242f44]">
                        {row.isCriticalEmpty ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse whitespace-nowrap">
                            {isEn ? '🔴 Out of Ready Stock' : '🔴 หมดสต็อกพร้อมเบิก'}
                          </span>
                        ) : row.isBelowSafety ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 whitespace-nowrap">
                            {isEn ? '🟡 Below Safety Stock' : '🟡 ต่ำกว่าเกณฑ์สำรอง'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 whitespace-nowrap">
                            {isEn ? '🟢 Normal Ready' : '🟢 พร้อมเบิกปกติ'}
                          </span>
                        )}
                      </td>

                      {/* Col 18: Notes */}
                      <td className="py-1 px-2 text-left border-r border-[#242f44]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedRow.notes !== undefined ? editedRow.notes : row.notes}
                            placeholder={isEn ? 'Enter repair notes...' : 'ระบุหมายเหตุงานซ่อม...'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditValues(prev => ({
                                ...prev,
                                [row.partCode]: {
                                  ...(prev[row.partCode] || {}),
                                  notes: val
                                }
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full bg-[#101622] border border-slate-600 px-1.5 py-0.5 text-xs text-slate-200 rounded focus:border-[#00FF00]"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 truncate block max-w-[160px]" title={row.notes}>
                            {row.notes || '-'}
                          </span>
                        )}
                      </td>

                      {/* Col 19: Actions */}
                      <td className="py-1 px-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToMaster) {
                                onNavigateToMaster();
                              }
                            }}
                            className="p-1 rounded bg-[#162132] hover:bg-[#203048] text-cyan-300 hover:text-white border border-[#2d3e58] cursor-pointer transition-colors"
                            title={isEn ? 'Open details in Part Master' : 'เปิดดูรายละเอียดใน Part Master'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS */}
      {/* ======================================================== */}
      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)} 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-[#111622] border border-cyan-500/50 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <h3 className="font-bold text-sm text-white font-mono">{previewPhoto.title}</h3>
                <span className="text-xs text-cyan-400 font-mono">{previewPhoto.partCode}</span>
              </div>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black/60 rounded-md p-2 flex items-center justify-center max-h-[380px] overflow-hidden">
              <img 
                src={previewPhoto.url} 
                alt={previewPhoto.title} 
                className="max-h-[360px] w-auto object-contain rounded" 
              />
            </div>
            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded cursor-pointer"
              >
                {isEn ? 'Close' : 'ปิดหน้าต่าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Management Modal */}
      {isStageManagerOpen && (
        <StageManagementModal
          isOpen={isStageManagerOpen}
          onClose={() => setIsStageManagerOpen(false)}
        />
      )}
    </div>
  );
};
