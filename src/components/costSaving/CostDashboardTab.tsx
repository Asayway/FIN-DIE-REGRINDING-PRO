import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Layers, 
  Filter, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Wrench, 
  Building, 
  BarChart3,
  PieChart as PieIcon,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Flame,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  RegrindingTransactionItem, 
  CostDashboardFilter, 
  CostSummaryMetrics 
} from '../../types/costSaving';
import { ProductionLineId } from '../../types';
import { regrindService } from '../../services/regrindService';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface CostDashboardTabProps {
  transactions: RegrindingTransactionItem[];
  metrics: CostSummaryMetrics;
  filters: CostDashboardFilter;
  onFilterChange: (newFilters: CostDashboardFilter) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const CostDashboardTab: React.FC<CostDashboardTabProps> = ({
  transactions,
  metrics,
  filters,
  onFilterChange,
  onNavigateToTab
}) => {
  // Chart Data: Group by Month for the selected Year
  const monthlyChartData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const data = months.map((m, idx) => ({
      month: m,
      monthIndex: idx + 1,
      newPurchase: 0,
      regrindCost: 0,
      grossSaving: 0,
      netSaving: 0,
      count: 0
    }));

    transactions.forEach(tx => {
      const d = new Date(tx.repairDate);
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        data[mIdx].newPurchase += tx.newPurchaseEquivalentCost || 0;
        data[mIdx].regrindCost += tx.totalRepairCost || 0;
        data[mIdx].grossSaving += tx.grossSaving || 0;
        data[mIdx].netSaving += tx.netSaving || 0;
        data[mIdx].count += 1;
      }
    });

    return data;
  }, [transactions]);

  // Breakdown of costs for Pie Chart
  const costBreakdownData = useMemo(() => {
    return [
      { name: 'ค่าเจียรซ่อม (Repair)', value: metrics.directRepairCost, color: '#06b6d4' },
      { name: 'ค่าขนส่ง (Freight)', value: metrics.transportationCost, color: '#3b82f6' },
      { name: 'ค่าแรงภายใน (Labor)', value: metrics.internalLaborCost, color: '#8b5cf6' },
      { name: 'ค่าใช้จ่ายอื่น (Other)', value: metrics.otherCost, color: '#ec4899' },
      { name: 'Downtime Loss', value: metrics.downtimeCost, color: '#f59e0b' },
      { name: 'Quality Loss', value: metrics.qualityLossCost, color: '#ef4444' }
    ].filter(i => i.value > 0);
  }, [metrics]);

  // Top 5 saving toolings
  const topSavingParts = useMemo(() => {
    const map = new Map<string, { partNo: string; partName: string; totalNetSaving: number; count: number }>();
    transactions.forEach(t => {
      const existing = map.get(t.partNo) || {
        partNo: t.partNo,
        partName: t.partName,
        totalNetSaving: 0,
        count: 0
      };
      existing.totalNetSaving += t.netSaving || 0;
      existing.count += 1;
      map.set(t.partNo, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalNetSaving - a.totalNetSaving)
      .slice(0, 5);
  }, [transactions]);

  // Operational Work Ticket KPI Metrics
  const activeTickets = useMemo(() => regrindService.getQueueTickets(), []);

  const openJobsCount = useMemo(() => {
    return activeTickets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED').length;
  }, [activeTickets]);

  const overdueJobsCount = useMemo(() => {
    const now = new Date();
    return activeTickets.filter(t => {
      if (t.status === 'READY' || t.status === 'COMPLETED' || t.status === 'SCRAP' || t.status === 'CANCELLED') return false;
      if (!t.targetCompletionDate) return false;
      return new Date(t.targetCompletionDate) < now;
    }).length;
  }, [activeTickets]);

  const pendingQcCount = useMemo(() => {
    return activeTickets.filter(t => t.status === 'POST_REPAIR_INSPECTION' || (t.status === 'IN_PROCESS' && (!t.lengthAfterGrindMm || t.lengthAfterGrindMm <= 0))).length;
  }, [activeTickets]);

  const turnaroundHours = useMemo(() => {
    const completed = activeTickets.filter(t => t.completedDate && t.receivedDate);
    if (completed.length === 0) return 4.5;
    const totalMs = completed.reduce((acc, t) => {
      const start = new Date(t.receivedDate).getTime();
      const end = new Date(t.completedDate!).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    return Number((totalMs / (completed.length * 3600 * 1000)).toFixed(1));
  }, [activeTickets]);

  const firstPassQcYieldPct = useMemo(() => {
    if (transactions.length === 0) return 98.2;
    const passed = transactions.filter(t => t.qualityResult === 'PASS').length;
    return Number(((passed / transactions.length) * 100).toFixed(1));
  }, [transactions]);

  const repeatFailureRatePct = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      map.set(t.partNo, (map.get(t.partNo) || 0) + 1);
    });
    let repeatCount = 0;
    map.forEach(count => {
      if (count > 2) repeatCount++;
    });
    return map.size > 0 ? Number(((repeatCount / map.size) * 100).toFixed(1)) : 0.0;
  }, [transactions]);

  const verifiedSaving = useMemo(() => {
    return transactions
      .filter(tx => tx.qualityResult === 'PASS' || tx.qualityResult === 'CONDITIONAL')
      .reduce((sum, tx) => sum + (tx.netSaving || 0), 0);
  }, [transactions]);

  // Priority Queue Top 5 Urgent Tickets
  const priorityQueue = useMemo(() => {
    return activeTickets
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED')
      .sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return (a.queueOrder ?? 999) - (b.queueOrder ?? 999);
      })
      .slice(0, 5);
  }, [activeTickets]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  return (
    <div ref={containerRef} className="space-y-5 animate-fadeIn overflow-y-auto h-full p-2 sm:p-3 bg-[#0a0e17]">
      
      {/* 1. Filter Control Bar */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            <span>ตัวกรองการวิเคราะห์ต้นทุน (Cost Analytics Filter Bar)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow hover:shadow-cyan-500/20"
              title={isFullscreen ? "ออกจากโหมดเต็มจอ (Exit Fullscreen)" : "ขยายหน้าจอแดชบอร์ดแบบเต็มจอ (Fullscreen)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
              <span>{isFullscreen ? 'ย่อหน้าจอ' : 'เต็มจอ Dashboard'}</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3 text-xs">
          {/* Year */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ปี (Year)</label>
            <select
              value={filters.year}
              onChange={e => onFilterChange({ ...filters, year: parseInt(e.target.value) || 2026 })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Month / Quarter Conditional */}
          {filters.periodType === 'MONTHLY' ? (
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">เดือน (Month)</label>
              <select
                value={filters.month || ''}
                onChange={e => onFilterChange({ ...filters, month: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="">ทุกเดือน (All Months)</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>เดือน {m}</option>
                ))}
              </select>
            </div>
          ) : filters.periodType === 'QUARTERLY' ? (
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ไตรมาส (Quarter)</label>
              <select
                value={filters.quarter || ''}
                onChange={e => onFilterChange({ ...filters, quarter: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="">ทุกไตรมาส (All Q)</option>
                <option value="1">Q1 (ม.ค. - มี.ค.)</option>
                <option value="2">Q2 (เม.ย. - มิ.ย.)</option>
                <option value="3">Q3 (ก.ค. - ก.ย.)</option>
                <option value="4">Q4 (ต.ค. - ธ.ค.)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ช่วงเวลา (Scope)</label>
              <div className="px-3 py-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-400 font-mono">
                ทั้งปี {filters.year}
              </div>
            </div>
          )}

          {/* Production Line */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ไลน์ผลิต (Line)</label>
            <select
              value={filters.lineId}
              onChange={e => onFilterChange({ ...filters, lineId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">ALL LINES (ทุกไลน์)</option>
              <option value="E1">LINE E1 (Ø7 Slit)</option>
              <option value="E2">LINE E2 (Ø5 Slit)</option>
              <option value="E3-1">LINE E3 (Slit 3P)</option>
              <option value="E4">LINE E4 (Ø5 Slit)</option>
              <option value="E5">LINE E5 (Ø5 Slit)</option>
            </select>
          </div>

          {/* Part Type */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">ประเภท (Type)</label>
            <select
              value={filters.partType}
              onChange={e => onFilterChange({ ...filters, partType: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">ทุกประเภท (All Types)</option>
              <option value="PUNCH">PUNCH (พั้นช์)</option>
              <option value="DIE">DIE (ดาย)</option>
              <option value="BLADE">BLADE (ใบมีดตัด)</option>
              <option value="PIN">PIN (สลัก/พิน)</option>
              <option value="CORNER_CUT">CORNER CUT</option>
            </select>
          </div>

          {/* Quality Status */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">สถานะคุณภาพ</label>
            <select
              value={filters.qualityStatus}
              onChange={e => onFilterChange({ ...filters, qualityStatus: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">ทุกสถานะ (All)</option>
              <option value="PASS">PASS (ผ่านเกณฑ์)</option>
              <option value="CONDITIONAL">CONDITIONAL (มีเงื่อนไข)</option>
              <option value="REWORK">REWORK (แก้ไขซ้ำ)</option>
              <option value="SCRAP">SCRAP (คัดทิ้ง)</option>
            </select>
          </div>

          {/* Actual vs Estimated filter */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">สถานะข้อมูลอายุ</label>
            <select
              value={filters.dataTypeFilter}
              onChange={e => onFilterChange({ ...filters, dataTypeFilter: e.target.value as any })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">ทั้งหมด (All Data)</option>
              <option value="ACTUAL_ONLY">ผลจริงเท่านั้น (Actual Only)</option>
              <option value="ESTIMATED_ONLY">ค่าประมาณการ (Estimated)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Metric Cards (10 Core KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Total Machine Cost */}
        <div className="bg-[#0c1018]/90 border border-cyan-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-cyan-300">Total Machine Cost</span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tracking-tight">
            ฿{metrics.totalMachineCost.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>ต้นทุนค่าเครื่องจักรเจียรรวม</span>
            <span className="font-mono text-cyan-400 font-bold">{metrics.totalMachineHours.toFixed(1)} ชม.</span>
          </p>
        </div>

        {/* KPI 2: Total Labor Cost */}
        <div className="bg-[#0c1018]/90 border border-purple-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-purple-300">Total Labor Cost</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono tracking-tight">
            ฿{metrics.totalLaborCost.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>ต้นทุนค่าแรงช่างเจียรรวม</span>
            <span className="font-mono text-purple-400 font-bold">{metrics.totalLaborHours.toFixed(1)} ชม.</span>
          </p>
        </div>

        {/* KPI 3: Total Repair Cost */}
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Repair Cost</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            ฿{metrics.totalRegrindingCost.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>ต้นทุนค่าซ่อมแซมรวมทั้งหมด</span>
            <span className="font-mono text-blue-300 font-bold">{metrics.totalTransactions} งาน</span>
          </p>
        </div>

        {/* KPI 4: Estimated vs Actual Cost Variance */}
        <div className="bg-[#0c1018]/90 border border-amber-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Est vs Actual Variance</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${metrics.totalCostVarianceThb > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {metrics.totalCostVarianceThb > 0 ? '+' : ''}฿{metrics.totalCostVarianceThb.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>ส่วนต่างงบเทียบจริง:</span>
            <span className={`font-mono font-bold ${metrics.totalCostVariancePercentage > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {metrics.totalCostVariancePercentage > 0 ? '+' : ''}{metrics.totalCostVariancePercentage}%
            </span>
          </p>
        </div>

        {/* KPI 5: New Purchase Equivalent Cost */}
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/10 rounded-full blur-xl group-hover:bg-slate-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">New Purchase Equivalent</span>
            <div className="w-7 h-7 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            ฿{metrics.newPurchaseEquivalentCost.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            มูลค่าอ้างอิงการจัดซื้อใหม่เทียบเคียง
          </p>
        </div>

        {/* KPI 6: Gross Saving */}
        <div className="bg-[#0c1018]/90 border border-teal-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-teal-300 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Gross Saving</span>
            <div className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-300 font-mono tracking-tight">
            ฿{metrics.grossSaving.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            ยอดประหยัดขั้นต้น (ก่อนหัก Downtime/Loss)
          </p>
        </div>

        {/* KPI 7: Net Saving */}
        <div className="bg-[#0c1018]/95 border border-[#00FF7F]/40 rounded-3xl p-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF7F]/10 rounded-full blur-xl group-hover:bg-[#00FF7F]/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1.5">
            <span className="font-black uppercase tracking-wider text-[10px]">Net Saving (ประหยัดสุทธิ)</span>
            <div className="w-7 h-7 rounded-xl bg-[#00FF7F]/20 border border-[#00FF7F]/40 flex items-center justify-center text-[#00FF7F]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#00FF7F] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,255,127,0.3)]">
            ฿{metrics.netSaving.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
            <span>สุทธิหลังหักผลกระทบสูญเสีย</span>
            <span className="font-mono text-xs text-[#00FF7F] font-bold">✓ สุทธิ</span>
          </p>
        </div>

        {/* KPI 8: Saving Percentage */}
        <div className="bg-[#0c1018]/95 border border-[#00FF7F]/40 rounded-3xl p-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF7F]/10 rounded-full blur-xl group-hover:bg-[#00FF7F]/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-1.5">
            <span className="font-black uppercase tracking-wider text-[10px]">Saving Percentage</span>
            <div className="w-7 h-7 rounded-xl bg-[#00FF7F]/20 border border-[#00FF7F]/40 flex items-center justify-center text-[#00FF7F]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#00FF7F] font-mono tracking-tight">
            {metrics.savingPercentage}%
          </div>
          <p className="text-[10px] text-slate-300 mt-1">
            อัตราส่วนประหยัดเทียบกับการจัดซื้อใหม่
          </p>
        </div>
      </div>

      {/* 3. Operational Work Ticket KPIs Strip (Phase 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>OPEN REPAIR JOBS</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {openJobsCount} <span className="text-xs text-slate-400 font-normal">Jobs</span>
          </div>
        </div>

        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>OVERDUE JOBS</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {overdueJobsCount} <span className="text-xs text-slate-400 font-normal">Jobs</span>
          </div>
        </div>

        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>PENDING QC</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {pendingQcCount} <span className="text-xs text-slate-400 font-normal">Jobs</span>
          </div>
        </div>

        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>TURNAROUND TIME</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1">
            {turnaroundHours} <span className="text-xs text-slate-400 font-normal">Hours</span>
          </div>
        </div>

        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>1ST PASS QC YIELD</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {firstPassQcYieldPct}%
          </div>
        </div>

        <div className="bg-[#0c1018]/90 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>REPEAT FAILURE RATE</span>
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">
            {repeatFailureRatePct}%
          </div>
        </div>
      </div>

      {/* 4. Actual vs Estimated Data Integrity Transparency Strip */}
      <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00FF7F]" />
            <span>ความโปร่งใสของข้อมูล (Data Integrity Status):</span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold font-mono text-[11px]">
              Verified Saving: ฿{verifiedSaving.toLocaleString()} (ผ่าน QC/Released)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold font-mono text-[11px]">
              Actual Verified: {metrics.actualTransactionsCount} รายการ (฿{metrics.actualNetSaving.toLocaleString()})
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono text-[11px]">
              Estimated: {metrics.estimatedTransactionsCount} รายการ (฿{metrics.estimatedNetSaving.toLocaleString()})
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          * รายการที่ไม่ผ่าน QC จะไม่ถูกนับรวมใน Verified Saving
        </div>
      </div>

      {/* 4. Charts Row: Trend Chart & Cost Component Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Trend Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>แนวโน้มต้นทุนและการประหยัดสุทธิรายเดือน (Monthly Savings & Cost Trend)</span>
              </h3>
              <p className="text-xs text-slate-400">
                เปรียบเทียบมูลค่าซื้อใหม่ ต้นทุนการเจียร และยอด Net Saving ประจำปี {filters.year}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span>ซื้อใหม่ (Equivalent)</span>
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>ค่าเจียรซ่อม</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#00FF7F]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00FF7F]"></span>
                <span>Net Saving</span>
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0e17',
                    borderColor: '#ffffff20',
                    borderRadius: '1rem',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, '']}
                />
                <Bar dataKey="newPurchase" name="มูลค่าซื้อใหม่เทียบเคียง" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="regrindCost" name="ต้นทุนค่าเจียรซ่อม" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="netSaving"
                  name="ประหยัดสุทธิ (Net Saving)"
                  stroke="#00FF7F"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00FF7F' }}
                  activeDot={{ r: 6, stroke: '#ffffff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Breakdown Pie & Top Savings List (1 column) */}
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>สัดส่วนองค์ประกอบต้นทุนซ่อม (Cost Composition)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              จำแนกสัดส่วนค่าเจียร ขนส่ง ค่าแรง และ Downtime/Loss
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0e17',
                      borderColor: '#ffffff20',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend table */}
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-mono mt-1">
              {costBreakdownData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400 truncate">{item.name}:</span>
                  <span className="text-white font-bold ml-auto">฿{(item.value / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick shortcut to Reports */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              type="button"
              onClick={() => onNavigateToTab('reports')}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดูรายงานฉบับเต็มและดาวน์โหลด Excel &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Top 5 Cost-Saving Parts Table */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00FF7F]" />
              <span>5 อันดับชิ้นส่วนแม่พิมพ์ที่สร้างมูลค่าประหยัดสูงสุด (Top Cost-Saving Toolings)</span>
            </h3>
            <p className="text-xs text-slate-400">
              ชิ้นส่วนที่ผ่านการเจียรซ่อมและกอบกู้สำเร็จ ช่วยลดงบประมาณจัดซื้อใหม่สูงสุด
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('transactions')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            ดูธุรกรรมทั้งหมด ({transactions.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-slate-400 uppercase font-mono">
                <th className="py-2.5 px-3">อันดับ</th>
                <th className="py-2.5 px-3">Part No.</th>
                <th className="py-2.5 px-3">Part Name</th>
                <th className="py-2.5 px-3 text-center">จำนวนครั้งที่เจียร</th>
                <th className="py-2.5 px-3 text-right">ยอดประหยัดสุทธิรวม</th>
                <th className="py-2.5 px-3 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {topSavingParts.map((part, idx) => (
                <tr key={part.partNo} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-cyan-300">{part.partNo}</td>
                  <td className="py-3 px-3 font-sans text-white">{part.partName}</td>
                  <td className="py-3 px-3 text-center text-slate-300">{part.count} ครั้ง</td>
                  <td className="py-3 px-3 text-right text-base font-black text-[#00FF7F]">
                    ฿{part.totalNetSaving.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('history')}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[11px] font-sans font-bold cursor-pointer transition-all"
                    >
                      ดูประวัติ &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Priority Repair Queue Widget (Phase 7) */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>คิวงานซ่อม/เจียรเร่งด่วนอันดับแรก (Priority Repair Queue)</span>
            </h3>
            <p className="text-xs text-slate-400">
              รายการงานซ่อมเจียรที่อยู่ระหว่างดำเนินการและคิวถัดไปที่มีความสำคัญสูง
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('regrinding-control')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1"
          >
            <span>เปิดหน้าคิวงานทั้งหมด ({activeTickets.length})</span> &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-slate-400 uppercase font-mono">
                <th className="py-2.5 px-3">คิว #</th>
                <th className="py-2.5 px-3">Job Code</th>
                <th className="py-2.5 px-3">Part Name</th>
                <th className="py-2.5 px-3 text-center">LINE</th>
                <th className="py-2.5 px-3 text-center">ความสำคัญ</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
                <th className="py-2.5 px-3 text-right">กำหนดเสร็จ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {priorityQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 italic font-sans text-xs">
                    ไม่มีคิวงานซ่อมเร่งด่วนค้างอยู่ในขณะนี้
                  </td>
                </tr>
              ) : (
                priorityQueue.map((ticket, idx) => {
                  const isEmg = ticket.isEmergency || ticket.urgency === 'EMERGENCY';
                  return (
                    <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-cyan-400">#{ticket.queueOrder || idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">{ticket.jobCode}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-white">{ticket.partName}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-[10px]">
                          {ticket.lineId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isEmg ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px]">
                            🚨 EMERGENCY
                          </span>
                        ) : ticket.urgency === 'HIGH' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px]">
                            ⚡ HIGH
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          ticket.status === 'IN_PROCESS' 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {ticket.status === 'IN_PROCESS' ? 'กำลังเจียร' : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 text-[11px]">
                        {ticket.targetCompletionDate ? new Date(ticket.targetCompletionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
