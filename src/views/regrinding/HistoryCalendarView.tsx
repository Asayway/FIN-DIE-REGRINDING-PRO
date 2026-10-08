import React, { useState, useMemo } from 'react';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Wrench,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Layers,
  Sparkles,
  Info,
  X,
  FileSpreadsheet,
  ArrowUpRight,
  User,
  ShieldCheck,
  Ruler
} from 'lucide-react';
import {
  RegrindWorkTicket,
  ToolingPartMasterItem,
  MonthlyCalendarMatrix,
  DEFECT_REASON_LABELS
} from '../../types/regrind';

interface HistoryCalendarViewProps {
  onSelectTicket?: (ticket: RegrindWorkTicket) => void;
}

export const HistoryCalendarView: React.FC<HistoryCalendarViewProps> = ({
  onSelectTicket
}) => {
  // Navigation: Year & Month
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(1); // 1-12
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(15); // Default open day 15 for rich preview
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');

  // Master and Data sources
  const tickets: RegrindWorkTicket[] = useMemo(() => regrindService.getQueueTickets(), []);
  const monthlyMatrix: MonthlyCalendarMatrix = useMemo(
    () => regrindService.getMonthlyMatrix(currentYear, currentMonth),
    [currentYear, currentMonth]
  );
  const toolingMasters: ToolingPartMasterItem[] = useMemo(
    () => regrindService.getToolingMasters(),
    []
  );

  // Month metadata
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate(); // 28, 29, 30, or 31
  }, [currentYear, currentMonth]);

  const monthNames = [
    '',
    'มกราคม (January)',
    'กุมภาพันธ์ (February)',
    'มีนาคม (March)',
    'เมษายน (April)',
    'พฤษภาคม (May)',
    'มิถุนายน (June)',
    'กรกฎาคม (July)',
    'สิงหาคม (August)',
    'กันยายน (September)',
    'ตุลาคม (October)',
    'พฤศจิกายน (November)',
    'ธันวาคม (December)'
  ];

  // Group tickets and matrix entries by Day of Month
  const dailyTaskMap = useMemo(() => {
    const map: Record<number, {
      tickets: RegrindWorkTicket[];
      repairedCount: number;
      scrappedCount: number;
      toolNames: string[];
    }> = {};

    for (let d = 1; d <= 31; d++) {
      map[d] = {
        tickets: [],
        repairedCount: 0,
        scrappedCount: 0,
        toolNames: []
      };
    }

    // 1. Map Queue Tickets that match this Year & Month
    tickets.forEach(t => {
      const dateStr = t.completedDate || t.receivedDate || t.createdAt;
      const dObj = new Date(dateStr);
      if (dObj.getFullYear() === currentYear && dObj.getMonth() + 1 === currentMonth) {
        const day = dObj.getDate();
        if (map[day]) {
          map[day].tickets.push(t);
          if (t.status === 'SCRAP' || t.isScrapped) {
            map[day].scrappedCount += 1;
          } else {
            map[day].repairedCount += 1;
          }
          if (!map[day].toolNames.includes(t.partName)) {
            map[day].toolNames.push(t.partName);
          }
        }
      }
    });

    // 2. Also incorporate counts from Excel 31-Day Matrix if higher (e.g. historical logged numbers)
    monthlyMatrix.repairRows.forEach(row => {
      Object.entries(row.dailyCounts).forEach(([dayStr, count]) => {
        const day = parseInt(dayStr);
        if (map[day] && count > 0) {
          if (map[day].tickets.length === 0) {
            map[day].repairedCount += count;
            if (!map[day].toolNames.includes(row.partName)) {
              map[day].toolNames.push(row.partName);
            }
          }
        }
      });
    });

    monthlyMatrix.defectRows.forEach(row => {
      Object.entries(row.dailyCounts).forEach(([dayStr, count]) => {
        const day = parseInt(dayStr);
        if (map[day] && count > 0) {
          if (map[day].tickets.length === 0) {
            map[day].scrappedCount += count;
            if (!map[day].toolNames.includes(row.partName)) {
              map[day].toolNames.push(row.partName);
            }
          }
        }
      });
    });

    return map;
  }, [tickets, monthlyMatrix, currentYear, currentMonth]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDayNumber(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDayNumber(null);
  };

  // Selected Day's Log Items
  const selectedDayLog = useMemo(() => {
    if (!selectedDayNumber) return null;
    const info = dailyTaskMap[selectedDayNumber];
    if (!info) return null;

    // Filter by search query or line
    let list = info.tickets;
    if (selectedLineFilter !== 'ALL') {
      list = list.filter(t => t.lineId === selectedLineFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.partName.toLowerCase().includes(q) ||
          t.jobCode.toLowerCase().includes(q) ||
          t.qrCode.toLowerCase().includes(q)
      );
    }

    return {
      day: selectedDayNumber,
      dateString: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDayNumber).padStart(2, '0')}`,
      totalRepaired: info.repairedCount,
      totalScrapped: info.scrappedCount,
      tickets: list,
      syntheticTools: info.toolNames
    };
  }, [selectedDayNumber, dailyTaskMap, currentYear, currentMonth, searchQuery, selectedLineFilter]);

  // Monthly totals for summary export
  const monthlyTotals = useMemo(() => {
    let totalRepaired = 0;
    let totalScrapped = 0;
    Object.values(dailyTaskMap).forEach((v: { repairedCount: number; scrappedCount: number }) => {
      totalRepaired += v.repairedCount;
      totalScrapped += v.scrappedCount;
    });
    return {
      totalRepaired: Math.max(totalRepaired, monthlyMatrix.grandTotalRepair),
      totalScrapped: Math.max(totalScrapped, monthlyMatrix.grandTotalDefect),
      grandTotal: Math.max(totalRepaired, monthlyMatrix.grandTotalRepair) + Math.max(totalScrapped, monthlyMatrix.grandTotalDefect)
    };
  }, [dailyTaskMap, monthlyMatrix]);

  // Export Monthly Summary Report to CSV
  const handleExportMonthlySummary = () => {
    const headers = [
      'Day of Month',
      'Date (YYYY-MM-DD)',
      'Completed Regrinds (Pcs)',
      'Scrapped / Defect (Pcs)',
      'Total Maintenance Volume',
      'Maintained Tooling Types'
    ];

    const rows: string[][] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = dailyTaskMap[d] || { repairedCount: 0, scrappedCount: 0, toolNames: [] };
      const dateFormatted = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      rows.push([
        String(d),
        dateFormatted,
        String(dayData.repairedCount),
        String(dayData.scrappedCount),
        String(dayData.repairedCount + dayData.scrappedCount),
        `"${dayData.toolNames.join('; ')}"`
      ]);
    }

    // Add summary row
    rows.push([]);
    rows.push([
      'GRAND TOTAL',
      `${monthNames[currentMonth]} ${currentYear}`,
      String(monthlyTotals.totalRepaired),
      String(monthlyTotals.totalScrapped),
      String(monthlyTotals.grandTotal),
      ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `regrinding_monthly_summary_${currentYear}_M${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Month Navigation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  ปฏิทินประวัติงานเจียร 31 วัน (31-Day Tooling History Calendar)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  {daysInMonth} วัน/เดือน
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                คลิกเลือกวันที่ต้องการเพื่อดูรายการบันทึกประวัติงานเจียรทูลลิ่ง & ส่งออกรายงานสรุปประจำเดือน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month & Year Stepper */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-black text-slate-900 dark:text-white font-mono whitespace-nowrap">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to Today Button */}
            <button
              type="button"
              onClick={() => {
                setCurrentYear(new Date().getFullYear());
                setCurrentMonth(new Date().getMonth() + 1);
                setSelectedDayNumber(new Date().getDate());
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              วันนี้
            </button>

            {/* Export Monthly Summary Button */}
            <button
              type="button"
              onClick={handleExportMonthlySummary}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกรายงานสรุป (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            งานเจียรสำเร็จพร้อมใช้
          </span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {monthlyTotals.totalRepaired} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            ตัดทิ้ง / ต่ำกว่าเกณฑ์ (Scrap)
          </span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {monthlyTotals.totalScrapped} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            ปริมาณงานบำรุงรักษารวม
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {monthlyTotals.grandTotal} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            วันที่เลือกเปิดดู
          </span>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
            {selectedDayNumber ? `วันที่ ${selectedDayNumber}` : 'ยังไม่เลือก'}
          </div>
        </div>
      </div>

      {/* 31-DAY INTERACTIVE CALENDAR GRID */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              ผังแสดงกิจกรรมการเจียร 31 วัน ({monthNames[currentMonth]} {currentYear})
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              เจียรสำเร็จ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              ตัดทิ้ง (Scrap)
            </span>
          </div>
        </div>

        {/* Calendar Day Grid (7 columns layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayData = dailyTaskMap[day] || { tickets: [], repairedCount: 0, scrappedCount: 0, toolNames: [] };
            const isSelected = selectedDayNumber === day;
            const hasActivity = dayData.repairedCount > 0 || dayData.scrappedCount > 0;
            const dow = new Date(currentYear, currentMonth - 1, day).getDay();
            const isSun = dow === 0;
            const isSat = dow === 6;
            const dowName = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][dow];
            const isToday =
              new Date().getFullYear() === currentYear &&
              new Date().getMonth() + 1 === currentMonth &&
              new Date().getDate() === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayNumber(day)}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[90px] ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-500 shadow-md ring-2 ring-cyan-500/40 text-slate-900 dark:text-white'
                    : isSun
                    ? 'bg-rose-50/70 dark:bg-rose-950/35 border-rose-200 dark:border-rose-500/35 hover:border-rose-400 text-slate-800 dark:text-slate-200'
                    : isSat
                    ? 'bg-violet-50/70 dark:bg-violet-950/35 border-violet-200 dark:border-violet-500/35 hover:border-violet-400 text-slate-800 dark:text-slate-200'
                    : hasActivity
                    ? 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200'
                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? 'bg-cyan-600 text-white'
                        : isSelected
                        ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                        : isSun
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isSat
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {day}
                    </span>
                    <span className={`text-[9.5px] font-bold ${
                      isSun ? 'text-rose-400' : isSat ? 'text-violet-400' : 'text-slate-500'
                    }`}>
                      {dowName}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1">
                    {dayData.repairedCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        +{dayData.repairedCount}
                      </span>
                    )}
                    {dayData.scrappedCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        {dayData.scrappedCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Miniature Tool Labels */}
                <div className="mt-1 space-y-0.5 w-full">
                  {dayData.toolNames.slice(0, 2).map((name, idx) => (
                    <div
                      key={idx}
                      className="text-[9.5px] truncate font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800"
                    >
                      {name}
                    </div>
                  ))}
                  {dayData.toolNames.length > 2 && (
                    <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold block">
                      +{dayData.toolNames.length - 2} รายการอื่นๆ
                    </span>
                  )}
                  {!hasActivity && (
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-600 block mt-2">
                      ไม่มีงาน
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DRILL-DOWN DAY LOG DETAILS PANEL */}
      {selectedDayLog && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-600 text-white font-mono font-black text-sm">
                Day {selectedDayLog.day}
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>บันทึกประวัติการบำรุงรักษาทูลลิ่งประจำวันที่ {selectedDayLog.day} {monthNames[currentMonth]} {currentYear}</span>
                  <span className="text-xs text-slate-400 font-mono font-normal">({selectedDayLog.dateString})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  พบงานเจียรสำเร็จ {selectedDayLog.totalRepaired} ชิ้น • ตัดทิ้ง (Scrap) {selectedDayLog.totalScrapped} ชิ้น
                </p>
              </div>
            </div>

            {/* Filter & Search inside selected day */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อทูลลิ่ง..."
                  className="pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayNumber(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="ปิดหน้ารายละเอียด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ticket Logs List */}
          {selectedDayLog.tickets.length > 0 ? (
            <div className="space-y-2.5">
              {selectedDayLog.tickets.map(ticket => {
                const isScrapped = ticket.status === 'SCRAP' || ticket.isScrapped;
                const minLimit = ticket.minAllowedLengthMm || 65.0;

                return (
                  <div
                    key={ticket.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isScrapped
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-cyan-500'
                    }`}
                  >
                    {/* Left: Tooling Thumbnail & Names */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <ToolingPicThumbnail
                        picCategory={ticket.picCategory}
                        partName={ticket.partName}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {ticket.partName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {ticket.jobCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>ไลน์ <strong>{ticket.lineId}</strong></span>
                          <span>•</span>
                          <span>ตำแหน่ง: {ticket.positionId || 'Main Slot'}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{ticket.qrCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Dimensional specs & calculations */}
                    <div className="grid grid-cols-3 gap-3 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">ความยาวก่อนเจียร</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">
                          {ticket.previousLengthMm?.toFixed(2)} mm
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">ระยะเจียรออก</span>
                        <strong className="font-mono text-cyan-600 dark:text-cyan-400">
                          -{ticket.grindDepthMm?.toFixed(2)} mm
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">ความยาวคงเหลือ (L-curr)</span>
                        <strong className={`font-mono font-bold ${
                          isScrapped ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {ticket.lengthAfterGrindMm?.toFixed(2)} mm
                        </strong>
                      </div>
                    </div>

                    {/* Right: Status badge & Technicians */}
                    <div className="flex items-center justify-between md:justify-end gap-3 min-w-[200px]">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>ช่าง: {ticket.assignedTechnician || ticket.receivedBy}</span>
                        </div>
                        {ticket.verifiedBy && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>QC: {ticket.verifiedBy}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        isScrapped
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {isScrapped ? 'ตัดทิ้ง (Scrap)' : 'พร้อมใช้ (Ready)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedDayLog.syntheticTools.length > 0 ? (
            /* Synthetic / Historical matrix logged tools */
            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                รายการทูลลิ่งที่ได้รับการเจียรตามบันทึกประจำวัน:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedDayLog.syntheticTools.map((toolName, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{toolName}</div>
                      <div className="text-[10px] text-slate-400">เจียรลับคมมาตรฐาน 0.25 mm</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              ไม่มีประวัติงานเจียรสำหรับวันที่เลือก
            </div>
          )}
        </div>
      )}
    </div>
  );
};
