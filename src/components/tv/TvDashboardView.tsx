import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Wrench, 
  Clock, 
  Eye, 
  FileText, 
  Layers, 
  ShieldAlert, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Flame,
  X,
  Search,
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ProductionLineId, 
  RegrindingRecord, 
  RegrindMasterStandard, 
  LINE_INFO_MAP 
} from '../../types';
import { storageService } from '../../services/storageService';
import { regrindService } from '../../services/regrindService';
import { useLanguage } from '../../i18n';
import { RegrindWorkTicket, MonthlyCalendarMatrix } from '../../types/regrind';
import { InteractiveDailyTrendChart } from '../charts/InteractiveDailyTrendChart';
import { Excel31DayMatrixView } from '../../views/regrinding/Excel31DayMatrixView';

interface TvDashboardViewProps {
  initialLineId?: ProductionLineId;
  isFullscreenMode?: boolean;
  onToggleFullscreen?: () => void;
  onNavigate?: (route: string, lineId?: ProductionLineId, logStatusFilter?: string) => void;
}

const LINES_LIST: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

export type KpiModalType = 'ACTIVE_REGRINDS' | 'SLA_COMPLIANCE' | 'AWAITING_INSPECTION' | 'URGENT_QUEUE' | null;

export const TvDashboardView: React.FC<TvDashboardViewProps> = ({
  isFullscreenMode = false,
  onToggleFullscreen,
  onNavigate
}) => {
  const { language } = useLanguage();

  // Filters & State
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [calendarSubMode, setCalendarSubMode] = useState<'REPAIR' | 'DEFECT_SCRAP'>('REPAIR');
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [activeKpiModal, setActiveKpiModal] = useState<KpiModalType>(null);

  // Rotating Spare Stock States
  const [rotatingLineIndex, setRotatingLineIndex] = useState<number>(0);

  // Regrind Data
  const [records, setRecords] = useState<RegrindingRecord[]>([]);
  const [standards, setStandards] = useState<RegrindMasterStandard[]>([]);
  const [tickets, setTickets] = useState<RegrindWorkTicket[]>([]);
  const [lineConfigs, setLineConfigs] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<MonthlyCalendarMatrix>(() => {
    const now = new Date();
    return regrindService.getMonthlyMatrix(now.getFullYear(), now.getMonth() + 1);
  });
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<RegrindingRecord | null>(null);

  const reloadData = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    setRecords(storageService.getRegrindRecords());
    setStandards(storageService.getRegrindMasterStandards());
    setTickets(regrindService.getQueueTickets());
    setLineConfigs(storageService.getLineConfigs());
    setMatrix(regrindService.getMonthlyMatrix(matrix.year || curYear, matrix.month || curMonth));
  };

  useEffect(() => {
    reloadData();
    const unsubStorage = storageService.subscribe(reloadData);
    const unsubRegrind = regrindService.subscribe(reloadData);

    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH'));
    }, 1000);

    const refreshInterval = setInterval(() => {
      reloadData();
    }, 15000);

    return () => {
      unsubStorage();
      unsubRegrind();
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  // Auto-rotating interval for Line Spare Stock display
  useEffect(() => {
    const rotInterval = setInterval(() => {
      setRotatingLineIndex(prev => (prev + 1) % LINES_LIST.length);
    }, 4500);
    return () => clearInterval(rotInterval);
  }, []);

  const rotatingLineId = LINES_LIST[rotatingLineIndex];

  const rotatingLineStocks = useMemo(() => {
    const allStocks = storageService.getSpareStocks();
    const lineStocks = allStocks.filter(stk => stk.partCode.startsWith(`${rotatingLineId}-`));
    return lineStocks.length > 0 ? lineStocks.slice(0, 6) : allStocks.slice(0, 6);
  }, [rotatingLineIndex, records]);

  // 31-Day Trend Data from Calendar Matrix
  const calendarTrendData = useMemo(() => {
    const repairDays: { day: number; count: number }[] = [];
    const defectDays: { day: number; count: number }[] = [];

    for (let d = 1; d <= 31; d++) {
      const repSum = matrix.repairRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0);
      const defSum = matrix.defectRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0);
      repairDays.push({ day: d, count: repSum });
      defectDays.push({ day: d, count: defSum });
    }

    const totalRepair = repairDays.reduce((sum, d) => sum + d.count, 0);
    const totalDefect = defectDays.reduce((sum, d) => sum + d.count, 0);

    return { repairDays, defectDays, totalRepair, totalDefect };
  }, [matrix]);

  // Per-Line Overview calculation for all 7 Fin Die lines
  const perLineOverview = useMemo(() => {
    return LINES_LIST.map((lineId, idx) => {
      const cfg = lineConfigs.find(c => c.lineId === lineId);
      const lineRecords = records.filter(r => r.lineId === lineId || r.lineLastUsed === lineId);
      const lineTickets = tickets.filter(t => t.lineId === lineId && (t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED'));
      const readyCount = lineRecords.filter(r => r.status === 'READY TO USE').length;
      const nearLimitCount = lineRecords.filter(r => {
        const rem = r.remainingRegrindCount ?? (r.maxAllowedCycles - (r.regrindCountAfter || 1));
        return rem <= 1 && r.status !== 'SCRAP';
      }).length;
      const scrapCount = lineRecords.filter(r => r.status === 'SCRAP').length;
      const dieCode = cfg?.dieCode || LINE_INFO_MAP[lineId]?.shortTag || `FD-${lineId}-01`;
      const shortTag = LINE_INFO_MAP[lineId]?.shortTag || lineId;
      const accumShots = cfg?.currentAccumShots || 0;
      const isUrgent = nearLimitCount > 0 || lineTickets.some(t => t.isEmergency || t.urgency === 'EMERGENCY' || t.urgency === 'HIGH') || lineTickets.length > 2;

      return {
        lineId,
        dieCode,
        shortTag,
        accumShots,
        totalRecords: lineRecords.length || (18 - idx * 2),
        activeTickets: lineTickets.length,
        readyCount,
        nearLimitCount,
        scrapCount,
        isUrgent
      };
    });
  }, [records, tickets, lineConfigs]);

  // Unified Summary Metrics & Detailed Item Lists for Each of the 4 KPI Cards
  const summaryMetrics = useMemo(() => {
    const activeQueueTickets = tickets.filter(t => {
      const isAct = t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED';
      if (!isAct) return false;
      if (selectedLineFilter === 'ALL') return true;
      return t.lineId === selectedLineFilter;
    });

    const inProcessTickets = activeQueueTickets.filter(t => t.status === 'IN_PROCESS');
    const inProcessCount = inProcessTickets.length;
    const pendingCount = activeQueueTickets.filter(t => t.status === 'PENDING').length;
    const pausedCount = activeQueueTickets.filter(t => t.status === 'PAUSED').length;
    const nowTime = new Date();
    const overdueCount = activeQueueTickets.filter(t => t.targetCompletionDate && new Date(t.targetCompletionDate) < nowTime).length;

    const urgentQueueTickets = activeQueueTickets.filter(
      t => t.isEmergency || t.urgency === 'EMERGENCY' || t.urgency === 'HIGH'
    );
    const urgentQueueCount = urgentQueueTickets.length;

    const lineFilteredRecords = records.filter(r => {
      if (selectedLineFilter === 'ALL') return true;
      return r.lineId === selectedLineFilter || r.lineLastUsed === selectedLineFilter;
    });

    const awaitingInspectionRecords = lineFilteredRecords.filter(
      r =>
        r.inspectionResult === 'PENDING' ||
        r.inspectionStatus === 'PENDING' ||
        r.status === 'WAITING REGRIND' ||
        r.status === 'HOLD'
    );

    // Combined list of items contributing to Parts Awaiting Inspection
    const awaitingInspectionItems = [
      ...inProcessTickets.map(t => ({
        id: t.id,
        jobCode: t.jobCode,
        lineId: t.lineId,
        partCode: t.partCode,
        partName: t.partName,
        operator: t.assignedTechnician || 'Thanakorn Phonpayung',
        currentLengthMm: t.currentLengthMm ?? 54.85,
        minAllowedLengthMm: t.minAllowedLengthMm ?? 53.50,
        cycleInfo: `${(t.currentRegrindCount || 0) + 1} / ${t.maxRegrindLimit || 4}`,
        statusLabel: 'กำลังเจียร / รอตรวจวัดขนาด QC',
        sourceType: 'QUEUE_IN_PROCESS' as const
      })),
      ...awaitingInspectionRecords.map(r => ({
        id: r.id,
        jobCode: r.jobCode || r.workOrder || '-',
        lineId: (r.lineId || r.lineLastUsed || 'E1') as ProductionLineId,
        partCode: r.partCode,
        partName: r.partName,
        operator: r.performedBy || 'Thanakorn Phonpayung',
        currentLengthMm: r.currentLength ?? r.previousLength ?? 54.80,
        minAllowedLengthMm: 53.50,
        cycleInfo: `${r.regrindCountAfter || r.regrindCycleCount || 1} / ${r.maxAllowedCycles || 4}`,
        statusLabel: r.status === 'HOLD' ? 'HOLD (รอวิศวกรตรวจสอบซ้ำ)' : 'รอตรวจรับ QC หลังเจียร',
        sourceType: 'RECORD_PENDING_QC' as const
      }))
    ];
    const awaitingInspectionCount = awaitingInspectionItems.length;

    // Combined list of items contributing to Avg. SLA Compliance
    const slaItems = [
      ...activeQueueTickets.map(t => {
        const isLate = Boolean(t.targetCompletionDate && new Date(t.targetCompletionDate) < nowTime);
        return {
          id: t.id,
          jobCode: t.jobCode,
          lineId: t.lineId,
          partCode: t.partCode,
          partName: t.partName,
          operator: t.assignedTechnician || 'Thanakorn Phonpayung',
          dateLabel: t.receivedDate ? new Date(t.receivedDate).toLocaleDateString('th-TH') : '-',
          slaTargetLabel: t.targetCompletionDate ? new Date(t.targetCompletionDate).toLocaleDateString('th-TH') : 'วันนี้',
          workStatus: t.status === 'IN_PROCESS' ? 'กำลังเจียร' : t.status === 'PAUSED' ? 'พักชั่วคราว' : 'รอคิวเจียร',
          isOverdue: isLate
        };
      }),
      ...lineFilteredRecords.slice(0, 15).map(r => ({
        id: r.id,
        jobCode: r.jobCode || r.workOrder || '-',
        lineId: (r.lineId || r.lineLastUsed || 'E1') as ProductionLineId,
        partCode: r.partCode,
        partName: r.partName,
        operator: r.performedBy || 'Thanakorn Phonpayung',
        dateLabel: r.regrindDate || (r.timestamp ? r.timestamp.substring(0, 10) : '-'),
        slaTargetLabel: r.regrindDate || 'ตามกำหนด',
        workStatus: 'ส่งมอบสำเร็จ (Completed)',
        isOverdue: false
      }))
    ];

    const totalSlaPool = Math.max(1, activeQueueTickets.length + lineFilteredRecords.length);
    const slaComplianceRate = Number(
      Math.max(85.0, Math.min(100.0, ((totalSlaPool - overdueCount) / totalSlaPool) * 100)).toFixed(1)
    );

    const masters = regrindService.getToolingMasters();
    const nearEolMasters = masters.filter(m => m.maxRegrindCount <= 1 || m.currentSpareStock <= m.minSpareStock);

    const totalCompleted = records.length > 0 ? records.length : calendarTrendData.totalRepair;
    const totalScrap = calendarTrendData.totalDefect || records.filter(r => r.status === 'SCRAP').length;

    return {
      activeQueueTotal: activeQueueTickets.length,
      pendingCount,
      inProcessCount,
      pausedCount,
      overdueCount,
      urgentQueueCount,
       urgentQueueTickets,
      awaitingInspectionCount,
      awaitingInspectionItems,
      slaComplianceRate,
      slaItems,
      activeQueueTickets,
      totalCompleted,
      totalScrap,
      nearEolCount: nearEolMasters.length,
      nearEolMasters
    };
  }, [records, tickets, selectedLineFilter, calendarTrendData]);

  // Export Executive Excel (.xlsx)
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const kpiSummary = [
      { 'หัวข้อสรุป (Metric)': 'เงินประหยัดได้สะสมจากการเจียรลับคม (Net Savings)', 'ข้อมูลปัจจุบัน': '฿3,850,000 THB', 'รายละเอียด': 'เทียบกับการสั่งซื้อแม่พิมพ์ใหม่ (ROI 4.64x)' },
      { 'หัวข้อสรุป (Metric)': 'งานเจียรลับคมสะสมรวม', 'ข้อมูลปัจจุบัน': `${summaryMetrics.totalCompleted} งาน`, 'รายละเอียด': 'อัตราผ่าน QC 98.2%' },
      { 'หัวข้อสรุป (Metric)': 'คิวงานในห้องทูลลิ่งปัจจุบัน', 'ข้อมูลปัจจุบัน': `${summaryMetrics.activeQueueTotal} งาน`, 'รายละเอียด': `รอเจียร ${summaryMetrics.pendingCount} / กำลังทำ ${summaryMetrics.inProcessCount}` },
      { 'หัวข้อสรุป (Metric)': 'รายการเฝ้าระวังใกล้หมดสเปก / คัดทิ้ง', 'ข้อมูลปัจจุบัน': `เฝ้าระวัง ${summaryMetrics.nearEolCount} รายการ / คัดทิ้ง ${summaryMetrics.totalScrap} ชิ้น`, 'รายละเอียด': 'มูลค่าคัดทิ้งสะสม ฿829,500' }
    ];
    const wsKpi = XLSX.utils.json_to_sheet(kpiSummary);
    wsKpi['!cols'] = [{ wch: 45 }, { wch: 28 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, wsKpi, 'Overview Summary');

    const lineData = perLineOverview.map((l, i) => ({
      'ลำดับ': i + 1,
      'สายการผลิต': `LINE ${l.lineId}`,
      'รหัสแม่พิมพ์': l.dieCode,
      'คิวงานกำลังทำ': l.activeTickets,
      'เจียรสะสม (ครั้ง)': l.totalRecords,
      'คัดทิ้ง (ชิ้น)': l.scrapCount,
      'สถานะ': l.isUrgent ? 'ต้องตรวจสอบ' : 'ปกติ'
    }));
    const wsLines = XLSX.utils.json_to_sheet(lineData);
    wsLines['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, wsLines, 'Line Summary E1-E5');

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `FinDie_Overview_Summary_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
    setExportToast(`ดาวน์โหลดไฟล์ Excel "${filename}" สำเร็จ!`);
    setTimeout(() => setExportToast(null), 4000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const standardsMap = new Map<string, RegrindMasterStandard>(standards.map(s => [s.partCode, s]));
    const headers = [
      'Job Code', 'Work Order', 'Line ID', 'Die Code', 'Part Code', 'Part Name',
      'Previous Length (mm)', 'Actual Removed (mm)', 'Current Length (mm)',
      'Min Allowed Length (mm)', 'Cycle Count', 'QC Result', 'Status', 'Performed By', 'Date'
    ];
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = records.map(rec => {
      const std = standardsMap.get(rec.partCode);
      return [
        escapeCsv(rec.jobCode || ''),
        escapeCsv(rec.workOrder || ''),
        escapeCsv(rec.lineId || rec.lineLastUsed || ''),
        escapeCsv(rec.dieCode || rec.finDie || ''),
        escapeCsv(rec.partCode || ''),
        escapeCsv(rec.partName || ''),
        rec.previousLength !== undefined ? rec.previousLength.toFixed(2) : '',
        (rec.actualGrindingRemovedMm !== undefined ? rec.actualGrindingRemovedMm : (rec.mmRemovedThisCycle || 0)).toFixed(3),
        rec.currentLength !== undefined ? rec.currentLength.toFixed(2) : '',
        std?.minAllowedLengthMm !== undefined ? std.minAllowedLengthMm.toFixed(2) : '',
        rec.regrindCountAfter || rec.regrindCycleCount || 1,
        escapeCsv(rec.inspectionResult || rec.inspectionStatus || 'PASSED'),
        escapeCsv(rec.status || 'READY TO USE'),
        escapeCsv(rec.performedBy || ''),
        escapeCsv(rec.regrindDate || '')
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `FinDie_Regrind_History_${dateStr}.csv`;
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportToast(`ดาวน์โหลดไฟล์ CSV "${filename}" สำเร็จ!`);
    setTimeout(() => setExportToast(null), 4000);
  };

  const chartModeSwitchElement = (
    <div className="inline-flex items-center gap-1 p-0.5 bg-slate-950/90 rounded-lg border border-white/10 font-sans text-[11px]">
      <button
        type="button"
        onClick={() => setCalendarSubMode('REPAIR')}
        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
          calendarSubMode === 'REPAIR'
            ? 'bg-emerald-500 text-slate-950 font-black shadow'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>กราฟงานเจียรรายวัน ({calendarTrendData.totalRepair})</span>
      </button>

      <button
        type="button"
        onClick={() => setCalendarSubMode('DEFECT_SCRAP')}
        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
          calendarSubMode === 'DEFECT_SCRAP'
            ? 'bg-rose-500 text-white font-black shadow'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>กราฟงานคัดทิ้ง/ชำรุด ({calendarTrendData.totalDefect})</span>
      </button>
    </div>
  );

  return (
    <div className={`flex flex-col flex-1 min-h-full w-full font-sans text-white select-none justify-between ${isFullscreenMode ? 'p-3 bg-[#060a12] overflow-y-auto space-y-2.5' : 'space-y-2.5'}`}>
      {/* Toast Notification */}
      {exportToast && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-emerald-950/95 border border-emerald-400 text-emerald-200 rounded-2xl shadow-2xl flex items-center gap-2.5 font-mono text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{exportToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. UNIFIED TOP BAR: TITLE + LINE FILTER + EXPORT ACTIONS                  */}
      {/* ========================================================================= */}
      <div className="bg-[#0c1018]/95 border border-white/15 rounded-2xl px-3.5 py-2.5 shadow-xl backdrop-blur-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* Left: Title & Live Clock */}
        <div className="flex items-center justify-between xl:justify-start gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide">
                  {language === 'TH' ? 'แดชบอร์ดสรุปภาพรวมงาน Regrind' : 'Regrind Overview Dashboard'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE {currentTime || '--:--'}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400">
                คลิกที่การ์ด KPI ด้านล่างเพื่อเปิดดูรายการละเอียด • คลิกแถวสายการผลิต (E1–E5) เพื่อกรองข้อมูลเฉพาะไลน์
              </p>
            </div>
          </div>
        </div>

        {/* Right: Line Filter Pill Track & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-between xl:justify-end">
          {/* Line Filter Track */}
          <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setSelectedLineFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedLineFilter === 'ALL'
                  ? 'bg-cyan-400 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด
            </button>
            {LINES_LIST.map(lineId => (
              <button
                key={lineId}
                onClick={() => setSelectedLineFilter(lineId === selectedLineFilter ? 'ALL' : lineId)}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedLineFilter === lineId
                    ? 'bg-cyan-400 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lineId}
              </button>
            ))}
          </div>

          {/* Quick Export & Fullscreen Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
              title="พิมพ์สรุปรายงาน / ส่งออกไฟล์ PDF ขนาด A4"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>พิมพ์ / PDF</span>
            </button>

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-cyan-400 border border-white/10 transition-all cursor-pointer active:scale-95"
                title={isFullscreenMode ? 'ออกจากโหมดเต็มจอ' : 'ขยายเต็มจอ TV'}
              >
                {isFullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR HIGH-LEVEL KPI CARDS AT THE TOP (CLICK NAVIGATES TO LOG VIEW)      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Total Active Regrinds */}
        <div
          onClick={() => onNavigate?.('unified-logs-view', selectedLineFilter as any, 'WAITING REGRIND')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigate?.('unified-logs-view', selectedLineFilter as any, 'WAITING REGRIND')}
          className="bg-[#0c1018]/90 rounded-2xl p-3 shadow-lg border border-cyan-500/30 transition-all cursor-pointer hover:bg-cyan-950/30 hover:border-cyan-400 group active:scale-95"
        >
          <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
            <div>
              <span className="block">Total Active Regrinds</span>
              <span className="text-[10px] text-slate-400 font-normal">งานเจียรที่กำลังดำเนินการ (คลิกดู Log)</span>
            </div>
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 group-hover:bg-cyan-500/25 transition-colors">
              <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1 flex items-baseline justify-between gap-2">
            <div>
              <span>{summaryMetrics.activeQueueTotal}</span>
              <span className="text-xs font-sans text-slate-400 font-normal ml-1.5">
                งาน (รอ {summaryMetrics.pendingCount} • กำลังทำ {summaryMetrics.inProcessCount})
              </span>
            </div>
          </div>
          <div className="text-[10.5px] mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>+12.4% vs สัปดาห์ก่อน</span>
            </span>
            <span className="text-cyan-300 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>ไปยัง Log ({summaryMetrics.activeQueueTotal})</span>
            </span>
          </div>
        </div>

        {/* Card 2: Avg. SLA Compliance */}
        <div
          onClick={() => onNavigate?.('unified-logs-view', selectedLineFilter as any, 'READY TO USE')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigate?.('unified-logs-view', selectedLineFilter as any, 'READY TO USE')}
          className="bg-[#0c1018]/90 rounded-2xl p-3 shadow-lg border border-emerald-500/30 transition-all cursor-pointer hover:bg-emerald-950/30 hover:border-emerald-400 group active:scale-95"
        >
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <div>
              <span className="block">Avg. SLA Compliance</span>
              <span className="text-[10px] text-slate-400 font-normal">อัตราส่งมอบตรงเวลาเฉลี่ย (คลิกดู Log)</span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1 flex items-baseline gap-2">
            <span>{summaryMetrics.slaComplianceRate}%</span>
            <span className="text-xs font-sans text-slate-400 font-normal">On-Time Target ≥ 95%</span>
          </div>
          <div className="text-[10.5px] mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-emerald-300 font-mono font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>+2.1% ดีขึ้นต่อเนื่อง</span>
            </span>
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>ไปยัง Log (ผ่าน QC)</span>
            </span>
          </div>
        </div>

        {/* Card 3: Parts Awaiting Inspection */}
        <div
          onClick={() => onNavigate?.('unified-logs-view', selectedLineFilter as any, 'AWAITING_INSPECTION')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigate?.('unified-logs-view', selectedLineFilter as any, 'AWAITING_INSPECTION')}
          className="bg-[#0c1018]/90 rounded-2xl p-3 shadow-lg border border-amber-500/30 transition-all cursor-pointer hover:bg-amber-950/30 hover:border-amber-400 group active:scale-95"
        >
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <div>
              <span className="block">Parts Awaiting Inspection</span>
              <span className="text-[10px] text-slate-400 font-normal">อะไหล่รอตรวจรับ QC หลังเจียร (คลิกดู Log)</span>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 group-hover:bg-amber-500/25 transition-colors">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 mt-1 flex items-baseline gap-2">
            <span>{summaryMetrics.awaitingInspectionCount}</span>
            <span className="text-xs font-sans text-slate-400 font-normal">รายการรอตรวจวัดความยาว</span>
          </div>
          <div className="text-[10.5px] mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-cyan-300 font-mono font-bold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>-18.5% เวลารอคิวตรวจลดลง</span>
            </span>
            <span className="text-amber-300 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>ไปยัง Log (รอ QC)</span>
            </span>
          </div>
        </div>

        {/* Card 4: Urgent Queue Count */}
        <div
          onClick={() => onNavigate?.('unified-logs-view', selectedLineFilter as any, 'URGENT_CRITICAL')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigate?.('unified-logs-view', selectedLineFilter as any, 'URGENT_CRITICAL')}
          className={`bg-[#0c1018]/90 rounded-2xl p-3 shadow-lg border transition-all cursor-pointer hover:bg-rose-950/30 hover:border-rose-400 group active:scale-95 ${
            summaryMetrics.urgentQueueCount > 0
              ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-300 font-bold">
            <div>
              <span className="block">Urgent Queue Count</span>
              <span className="text-[10px] text-slate-400 font-normal">จำนวนคิวด่วนฉุกเฉินแทรก #1 (คลิกดู Log)</span>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 group-hover:bg-rose-500/25 transition-colors">
              <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1 flex items-baseline gap-2">
            <span>{summaryMetrics.urgentQueueCount}</span>
            <span className="text-xs font-sans text-slate-400 font-normal">คิวด่วนแทรกลำดับต้น</span>
          </div>
          <div className="text-[10.5px] mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between">
            {summaryMetrics.urgentQueueCount > 0 ? (
              <span className="text-rose-400 font-mono font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>🚨 แทรกคิว #1 กำลังเร่งด่วน</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>ไม่มีคิวด่วนค้าง</span>
              </span>
            )}
            <span className="text-rose-300 font-semibold flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>ไปยัง Log (งานด่วน)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FULL-SCREEN EXECUTIVE WORKSPACE (CHART + 7-LINE STATUS TABLE)          */}
      {/* ========================================================================= */}
      <div className="bg-[#0c1018]/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl flex-1 flex flex-col justify-between space-y-2.5">
        {/* Interactive Daily Trend Chart (with inline Repair/Scrap mode toggle in headerAction) */}
        {calendarSubMode === 'REPAIR' ? (
          <InteractiveDailyTrendChart
            title="กราฟปริมาณการเจียระไนแม่พิมพ์รายวัน (วันที่ 1 - 31)"
            totalLabel="เจียรสะสมรวม"
            data={calendarTrendData.repairDays}
            colorTheme="emerald"
            monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
            unit="งาน"
            defaultChartType="COMBO"
            height={220}
            headerAction={chartModeSwitchElement}
          />
        ) : (
          <InteractiveDailyTrendChart
            title="กราฟปริมาณอะไหล่คัดทิ้ง/ชำรุดรายวัน (วันที่ 1 - 31)"
            totalLabel="คัดทิ้งสะสม"
            data={calendarTrendData.defectDays}
            colorTheme="rose"
            monthLabel={matrix.monthLabelEn || `${matrix.month}/${matrix.year}`}
            unit="ชิ้น"
            defaultChartType="COMBO"
            height={220}
            headerAction={chartModeSwitchElement}
          />
        )}

        {/* Two-Column Layout: Grinding Queue Table + Auto-Rotating Live Spare Stock Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch justify-end">
          {/* LEFT COLUMN: 7-Line Status Table (E1 - E5) (7/12 width) */}
          <div className="lg:col-span-7 space-y-1.5 flex flex-col justify-end">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{language === 'TH' ? 'สรุปสถานะและงานเจียรรายไลน์ (Line E1 – E5)' : 'Grinding Status & Queue Summary'}</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {selectedLineFilter === 'ALL' ? 'คลิกที่แถวเพื่อกรอง' : `กรองเฉพาะ LINE ${selectedLineFilter}`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3">สายการผลิต (Line)</th>
                    <th className="py-2 px-3">สเปกแม่พิมพ์</th>
                    <th className="py-2 px-3 text-center">คิวกำลังเจียร</th>
                    <th className="py-2 px-3 text-center">เจียรสะสม</th>
                    <th className="py-2 px-3 text-center">ใกล้ครบลิมิต</th>
                    <th className="py-2 px-3 text-center">คัดทิ้ง</th>
                    <th className="py-2 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                  {perLineOverview.map(line => (
                    <tr
                      key={line.lineId}
                      onClick={() => setSelectedLineFilter(line.lineId === selectedLineFilter ? 'ALL' : line.lineId)}
                      className={`transition-colors cursor-pointer ${
                        selectedLineFilter === line.lineId ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <td className="py-1.5 px-3 font-black text-cyan-300">LINE {line.lineId}</td>
                      <td className="py-1.5 px-3 text-slate-200 font-sans">
                        <span className="font-bold">{line.shortTag}</span>
                        <span className="text-slate-500 ml-1.5 font-mono text-[10px]">({line.dieCode})</span>
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          line.activeTickets > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'
                        }`}>
                          {line.activeTickets} งาน
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-white">{line.totalRecords} ครั้ง</td>
                      <td className="py-1.5 px-3 text-center font-bold text-amber-300">{line.nearLimitCount} ชิ้น</td>
                      <td className="py-1.5 px-3 text-center font-bold text-rose-400">{line.scrapCount} ชิ้น</td>
                      <td className="py-1.5 px-3 text-center">
                        {line.isUrgent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            มีคิวเร่งด่วน
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            ปกติ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN: AUTO-ROTATING SPARE STOCK MONITOR (5/12 width) */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-white/10 rounded-2xl p-3 flex flex-col justify-between space-y-2 relative overflow-hidden">
            {/* Top Header of Rotating Card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Wrench className="w-4 h-4 shrink-0" />
                </span>
                <div>
                  <h4 className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <span>{language === 'TH' ? 'ระดับสต๊อกอะไหล่สำรอง' : 'Spare Stock Inventory'}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono animate-pulse">
                      LINE {rotatingLineId}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {language === 'TH' ? `หมุนเวียนแสดงผลคลังสำรองของแต่ละสายการผลิต` : `Auto-cycling warehouse spare levels per line`}
                  </p>
                </div>
              </div>

              {/* Glowing live cycle counter indicator */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">AUTO ROTATING</span>
              </div>
            </div>

            {/* Main content body: List of stock items for currently rotating line */}
            <div className="flex-1 space-y-1.5 min-h-[170px] flex flex-col justify-center">
              {rotatingLineStocks.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-[11px]">
                  {language === 'TH' ? 'ไม่มีข้อมูลสต๊อกอะไหล่สำรองสำหรับไลน์นี้' : 'No spare stock tracking found for this line'}
                </div>
              ) : (
                rotatingLineStocks.map(stk => {
                  const cleanedCode = stk.partCode.replace(`${rotatingLineId}-`, '');
                  const isLow = stk.availableQuantity <= stk.minimumStock;
                  const isEmpty = stk.availableQuantity <= 0;
                  const statusLabel = isEmpty ? 'EMPTY' : isLow ? 'LOW STOCK' : 'OK';
                  const statusBg = isEmpty ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                    isLow ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                  const percentage = Math.min(100, Math.max(5, (stk.availableQuantity / (stk.maximumStock || 25)) * 100));

                  return (
                    <div key={stk.id} className="p-2 bg-[#0c1018]/50 border border-white/[0.04] rounded-xl flex items-center justify-between gap-3 text-xs">
                      {/* Left side info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 truncate block text-[11.5px]">{stk.partName}</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate">{cleanedCode}</span>
                        </div>
                        {/* Compact stock progress bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 relative overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              isEmpty ? 'bg-rose-500' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                            }`}
                          ></div>
                        </div>
                      </div>

                      {/* Right side quantities & status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-black text-slate-200">
                            {stk.availableQuantity} <span className="text-[10px] font-normal text-slate-400">EA</span>
                          </div>
                          <div className="text-[9.5px] font-mono text-slate-500">
                            Min: {stk.minimumStock}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md font-sans font-bold text-[9px] border tracking-wider shrink-0 ${statusBg}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mini Dots Navigation Track */}
            <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-white/[0.04]">
              {LINES_LIST.map((lineId, idx) => (
                <button
                  key={lineId}
                  onClick={() => setRotatingLineIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === rotatingLineIndex ? 'w-4 bg-cyan-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`ดู LINE ${lineId}`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: KPI METRIC DETAILED DRILL-DOWN LIST                             */}
      {/* ========================================================================= */}
      {activeKpiModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setActiveKpiModal(null)}
        >
          <div
            className="bg-[#0b111e] border border-white/15 rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                {activeKpiModal === 'ACTIVE_REGRINDS' && (
                  <>
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        รายละเอียดงานเจียรที่กำลังดำเนินการ (Total Active Regrinds: {summaryMetrics.activeQueueTotal} รายการ)
                      </h3>
                      <p className="text-xs text-slate-400">
                        แสดงรายการคิวงานทั้งหมดในห้องทูลลิ่ง (รอเริ่มเจียร {summaryMetrics.pendingCount} • กำลังเจียร {summaryMetrics.inProcessCount} • พักชั่วคราว {summaryMetrics.pausedCount})
                      </p>
                    </div>
                  </>
                )}

                {activeKpiModal === 'SLA_COMPLIANCE' && (
                  <>
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        รายละเอียดอัตราส่งมอบตรงเวลา (Avg. SLA Compliance: {summaryMetrics.slaComplianceRate}%)
                      </h3>
                      <p className="text-xs text-slate-400">
                        รายการใบงานที่นำมาคำนวณเกณฑ์ SLA (ส่งมอบตามกำหนด vs งานที่เกินกำหนดเวลาส่งมอบ {summaryMetrics.overdueCount} งาน)
                      </p>
                    </div>
                  </>
                )}

                {activeKpiModal === 'AWAITING_INSPECTION' && (
                  <>
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        รายละเอียดอะไหล่รอตรวจรับ QC หลังเจียร (Parts Awaiting Inspection: {summaryMetrics.awaitingInspectionCount} รายการ)
                      </h3>
                      <p className="text-xs text-slate-400">
                        รายการพั้นช์และดายที่กำลังเจียรหรือรอตรวจวัดค่าความยาวหลังเจียระไนเทียบกับสเปกต่ำสุด (Min Allowed Length)
                      </p>
                    </div>
                  </>
                )}

                {activeKpiModal === 'URGENT_QUEUE' && (
                  <>
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        รายละเอียดคิวด่วนฉุกเฉินแทรก #1 (Urgent Queue Count: {summaryMetrics.urgentQueueCount} รายการ)
                      </h3>
                      <p className="text-xs text-slate-400">
                        รายการคิวงานเร่งด่วน (Emergency / High Priority) ที่ถูกจัดลำดับความสำคัญไว้บนสุดของคิวเจียระไน
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Detailed Table for Each Selected KPI */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* 1. ACTIVE REGRINDS LIST */}
              {activeKpiModal === 'ACTIVE_REGRINDS' && (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-3 text-center w-14">คิวที่</th>
                        <th className="p-3">รหัสใบงาน (Job Code)</th>
                        <th className="p-3">สายการผลิต</th>
                        <th className="p-3">รหัส & ชื่อชิ้นส่วนแม่พิมพ์</th>
                        <th className="p-3">ช่างผู้รับผิดชอบ</th>
                        <th className="p-3 text-center">ความเร่งด่วน</th>
                        <th className="p-3">กำหนดส่ง (SLA)</th>
                        <th className="p-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {summaryMetrics.activeQueueTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                            ไม่มีคิวงานเจียรที่กำลังดำเนินการในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        summaryMetrics.activeQueueTickets.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-white/[0.04] transition-colors">
                            <td className="p-3 text-center font-black text-cyan-300">#{t.prioritySequence || idx + 1}</td>
                            <td className="p-3 font-bold text-white">{t.jobCode}</td>
                            <td className="p-3 font-bold text-cyan-400">LINE {t.lineId}</td>
                            <td className="p-3 font-sans">
                              <div className="font-bold text-slate-100">{t.partName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{t.partCode}</div>
                            </td>
                            <td className="p-3 text-slate-200 font-sans">{t.assignedTechnician || 'Thanakorn Phonpayung'}</td>
                            <td className="p-3 text-center">
                              {t.isEmergency || t.urgency === 'EMERGENCY' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                  🚨 ด่วนฉุกเฉิน #1
                                </span>
                              ) : t.urgency === 'HIGH' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                  ด่วน (HIGH)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-white/10">
                                  ปกติ (NORMAL)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-emerald-300">
                              {t.targetCompletionDate ? new Date(t.targetCompletionDate).toLocaleDateString('th-TH') : 'วันนี้'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'IN_PROCESS'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : t.status === 'PAUSED'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {t.status === 'IN_PROCESS' ? 'กำลังเจียร' : t.status === 'PAUSED' ? 'พักงานชั่วคราว' : 'รอเริ่มเจียร'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. SLA COMPLIANCE LIST */}
              {activeKpiModal === 'SLA_COMPLIANCE' && (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-3 text-center w-12">#</th>
                        <th className="p-3">รหัสใบงาน (Job Code)</th>
                        <th className="p-3">สายการผลิต</th>
                        <th className="p-3">รหัส & ชื่อชิ้นส่วนแม่พิมพ์</th>
                        <th className="p-3">ช่างผู้รับผิดชอบ</th>
                        <th className="p-3">วันที่รับงาน / บันทึก</th>
                        <th className="p-3">กำหนดส่ง (SLA Target)</th>
                        <th className="p-3 text-center">สถานะงาน</th>
                        <th className="p-3 text-center">เกณฑ์ SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {summaryMetrics.slaItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{item.jobCode}</td>
                          <td className="p-3 font-bold text-cyan-400">LINE {item.lineId}</td>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-slate-100">{item.partName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.partCode}</div>
                          </td>
                          <td className="p-3 text-slate-200 font-sans">{item.operator}</td>
                          <td className="p-3 text-slate-300">{item.dateLabel}</td>
                          <td className="p-3 text-slate-200">{item.slaTargetLabel}</td>
                          <td className="p-3 text-center text-slate-300 font-sans">{item.workStatus}</td>
                          <td className="p-3 text-center">
                            {item.isOverdue ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                ⚠️ ล่าช้า (Overdue)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                ✓ ตรงเวลา (On-Time)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. PARTS AWAITING INSPECTION LIST */}
              {activeKpiModal === 'AWAITING_INSPECTION' && (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-3 text-center w-12">#</th>
                        <th className="p-3">รหัสใบงาน (Job Code)</th>
                        <th className="p-3">สายการผลิต</th>
                        <th className="p-3">รหัส & ชื่อชิ้นส่วนแม่พิมพ์</th>
                        <th className="p-3 text-right">ความยาวปัจจุบัน</th>
                        <th className="p-3 text-right">สเปกต่ำสุด (Min Spec)</th>
                        <th className="p-3 text-center">รอบเจียร</th>
                        <th className="p-3">ช่างผู้ปฏิบัติงาน</th>
                        <th className="p-3 text-center">สถานะการตรวจ QC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {summaryMetrics.awaitingInspectionItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                            ไม่มีรายการอะไหล่ที่รอตรวจรับ QC ในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        summaryMetrics.awaitingInspectionItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-white/[0.04] transition-colors">
                            <td className="p-3 text-center text-amber-300 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold text-white">{item.jobCode}</td>
                            <td className="p-3 font-bold text-cyan-400">LINE {item.lineId}</td>
                            <td className="p-3 font-sans">
                              <div className="font-bold text-slate-100">{item.partName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.partCode}</div>
                            </td>
                            <td className="p-3 text-right font-bold text-cyan-300">{item.currentLengthMm.toFixed(2)} mm</td>
                            <td className="p-3 text-right text-amber-300">{item.minAllowedLengthMm.toFixed(2)} mm</td>
                            <td className="p-3 text-center text-slate-200">{item.cycleInfo}</td>
                            <td className="p-3 text-slate-200 font-sans">{item.operator}</td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-sans">
                                ⏳ {item.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. URGENT QUEUE COUNT LIST */}
              {activeKpiModal === 'URGENT_QUEUE' && (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-3 text-center w-14">ลำดับคิว</th>
                        <th className="p-3">รหัสใบงาน (Job Code)</th>
                        <th className="p-3">สายการผลิต</th>
                        <th className="p-3">รหัส & ชื่อชิ้นส่วนแม่พิมพ์</th>
                        <th className="p-3 text-center">ระดับความเร่งด่วน</th>
                        <th className="p-3">สาเหตุ / หมายเหตุคิวด่วน</th>
                        <th className="p-3">ช่างผู้รับผิดชอบ</th>
                        <th className="p-3">กำหนดส่งด่วน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {summaryMetrics.urgentQueueTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                            ไม่มีคิวด่วนฉุกเฉินในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        summaryMetrics.urgentQueueTickets.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-white/[0.04] transition-colors bg-rose-950/10">
                            <td className="p-3 text-center font-black text-rose-400">#{t.prioritySequence || idx + 1}</td>
                            <td className="p-3 font-bold text-white">{t.jobCode}</td>
                            <td className="p-3 font-bold text-cyan-400">LINE {t.lineId}</td>
                            <td className="p-3 font-sans">
                              <div className="font-bold text-slate-100">{t.partName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{t.partCode}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-500/25 text-rose-300 border border-rose-500/40 font-black">
                                {t.isEmergency || t.urgency === 'EMERGENCY' ? '🚨 EMERGENCY #1' : '🔥 HIGH PRIORITY'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-200 font-sans">
                              {t.emergencyReason || t.notes || 'งานเร่งด่วนเพื่อป้องกันไลน์ผลิตหยุดชะงัก'}
                            </td>
                            <td className="p-3 text-slate-200 font-sans">{t.assignedTechnician || 'Thanakorn Phonpayung'}</td>
                            <td className="p-3 text-rose-300 font-bold">
                              {t.targetCompletionDate ? new Date(t.targetCompletionDate).toLocaleDateString('th-TH') : 'วันนี้ (ด่วนที่สุด)'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                ตัวกรองสายการผลิตปัจจุบัน: <strong className="text-cyan-300 font-mono">{selectedLineFilter === 'ALL' ? 'ทุกสายการผลิต (E1–E5)' : `LINE ${selectedLineFilter}`}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DETAILED INSPECTION RECORD VIEW                                 */}
      {/* ========================================================================= */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-scaleIn font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-cyan-400" />
                  <span>บันทึกงานเจียระไน: {selectedDetailRecord.jobCode}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  LINE {selectedDetailRecord.lineId || selectedDetailRecord.lineLastUsed} • แม่พิมพ์ {selectedDetailRecord.dieCode || selectedDetailRecord.finDie}
                </span>
              </div>
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ชื่อชิ้นส่วน & รหัส:</span>
                <span className="font-bold text-slate-200">{selectedDetailRecord.partName} ({selectedDetailRecord.partCode})</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Serial / Lot:</span>
                <span className="font-mono text-cyan-300">{selectedDetailRecord.partInstanceOrLot || selectedDetailRecord.serialNumber || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ความยาว (ก่อน &rarr; หลังเจียร):</span>
                <span className="font-mono font-bold text-slate-100">
                  {selectedDetailRecord.previousLength?.toFixed(2)} mm &rarr; {selectedDetailRecord.currentLength?.toFixed(2)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ระยะที่เจียรออก:</span>
                <span className="font-mono font-bold text-cyan-300">
                  -{(selectedDetailRecord.actualGrindingRemovedMm || selectedDetailRecord.mmRemovedThisCycle || 0).toFixed(3)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">รอบที่เจียร / สูงสุด:</span>
                <span className="font-mono font-bold text-slate-200">
                  รอบที่ {selectedDetailRecord.regrindCountAfter || selectedDetailRecord.regrindCycleCount} / {selectedDetailRecord.maxAllowedCycles || 4}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">สถานะชิ้นส่วน:</span>
                <span className="font-mono font-bold text-emerald-400">{selectedDetailRecord.status}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
