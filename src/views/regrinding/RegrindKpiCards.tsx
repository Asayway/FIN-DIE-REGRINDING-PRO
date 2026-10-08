import React from 'react';
import { AlertOctagon, Clock, Wrench, CheckCircle2, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface RegrindKpiCardsProps {
  metrics: {
    pendingCount: number;
    inProcessCount: number;
    readyCount: number;
    scrapsThisMonth: number;
    scrapsAllTime: number;
    totalJobsHandled: number;
    readyStockAvailable: number;
  };
  onFilterStatus?: (status: string) => void;
  activeStatusFilter?: string;
}

export const RegrindKpiCards: React.FC<RegrindKpiCardsProps> = ({
  metrics,
  onFilterStatus,
  activeStatusFilter = 'ALL'
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
      {/* 🔴 1. Scrap / Out of Spec (ทิ้ง / หมดสเปค) */}
      <button
        type="button"
        onClick={() => onFilterStatus && onFilterStatus(activeStatusFilter === 'SCRAP' ? 'ALL' : 'SCRAP')}
        className={`text-left p-3.5 lg:p-4 rounded-xl border transition-all relative overflow-hidden group shadow-sm ${
          activeStatusFilter === 'SCRAP'
            ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-400/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            ทิ้ง / หมดสเปค (Scrap)
          </span>
          <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 group-hover:scale-110 transition-transform">
            <AlertOctagon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl lg:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {metrics.scrapsThisMonth}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">ชิ้น</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            เดือนนี้
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>ความยาวต่ำกว่าเกณฑ์ / เสียรูป</span>
          <span className="font-mono font-semibold">สะสม: {metrics.scrapsAllTime}</span>
        </p>
      </button>

      {/* 🟠 2. Pending (รอเจียรลับคม) */}
      <button
        type="button"
        onClick={() => onFilterStatus && onFilterStatus(activeStatusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
        className={`text-left p-3.5 lg:p-4 rounded-xl border transition-all relative overflow-hidden group shadow-sm ${
          activeStatusFilter === 'PENDING'
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-400/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            รอเจียร (Pending Queue)
          </span>
          <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl lg:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {metrics.pendingCount}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">ชิ้น</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            รอคิวงาน
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>รับจากไลน์ & 2D Layout</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">Auto-Queue</span>
        </p>
      </button>

      {/* 🟡 3. In-Process (กำลังดำเนินการเจียร) */}
      <button
        type="button"
        onClick={() => onFilterStatus && onFilterStatus(activeStatusFilter === 'IN_PROCESS' ? 'ALL' : 'IN_PROCESS')}
        className={`text-left p-3.5 lg:p-4 rounded-xl border transition-all relative overflow-hidden group shadow-sm ${
          activeStatusFilter === 'IN_PROCESS'
            ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-400/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            กำลังเจียร (In-Process)
          </span>
          <span className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 group-hover:scale-110 transition-transform">
            <Wrench className="w-4 h-4 animate-spin-slow" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl lg:text-3xl font-black font-mono text-sky-600 dark:text-sky-400 tracking-tight">
            {metrics.inProcessCount}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">ชิ้น</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            บนแท่นเจียร
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Surface Grinder #1, #2</span>
          <span className="text-sky-600 dark:text-sky-400 font-mono">Ra ≤ 0.12µm</span>
        </p>
      </button>

      {/* 🟢 4. Ready to Use (สต๊อกพร้อมใช้) */}
      <button
        type="button"
        onClick={() => onFilterStatus && onFilterStatus(activeStatusFilter === 'READY' ? 'ALL' : 'READY')}
        className={`text-left p-3.5 lg:p-4 rounded-xl border transition-all relative overflow-hidden group shadow-sm ${
          activeStatusFilter === 'READY'
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-400/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            สต๊อกพร้อมใช้ (Ready)
          </span>
          <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl lg:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {metrics.readyCount}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">ชิ้น</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            เสร็จสิ้น
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>พร้อมเบิกใช้งานในไลน์</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3" /> In Stock
          </span>
        </p>
      </button>
    </div>
  );
};
