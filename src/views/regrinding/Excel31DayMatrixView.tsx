import React, { useState, useMemo } from 'react';
import { ProductionLineId } from '../../types';
import { MonthlyCalendarMatrix, RegrindWorkTicket } from '../../types/regrind';
import { regrindService } from '../../services/regrindService';
import { useLanguage } from '../../i18n';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import { UnifiedRegrindJobModal } from '../../components/modals/UnifiedRegrindJobModal';
import { QueueTicketDetailModal } from '../../components/modals/QueueTicketDetailModal';
import { getFilteredPartsForLine } from '../../components/common/LineFilteredPartCombobox';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Calendar,
  Wrench,
  AlertOctagon,
  Factory,
  RotateCcw,
  Sparkles,
  Plus,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';

interface LineQuickFilter {
  id: string;
  label: string;
  subLabel: string;
}

const LINE_QUICK_FILTERS: LineQuickFilter[] = [
  { id: 'ALL', label: 'ALL LINES', subLabel: 'ทุกสายการผลิต (7 Lines: E1-E5)' },
  { id: 'E1', label: 'E1', subLabel: 'Ø7 Slit, PCM' },
  { id: 'E2', label: 'E2', subLabel: 'Ø5 Slit, GOLD' },
  { id: 'E3-1', label: 'E3-1', subLabel: 'Slit 3P, PCM' },
  { id: 'E3-2', label: 'E3-2', subLabel: 'WL+ 4P, GOLD' },
  { id: 'E3-3', label: 'E3-3', subLabel: 'Corr 4P, GOLD' },
  { id: 'E4', label: 'E4', subLabel: 'Ø5 Slit, BARE' },
  { id: 'E5', label: 'E5', subLabel: 'Ø5 Slit, BARE' },
];

const MONTH_DEFINITIONS = [
  { month: 1, nameTh: 'มกราคม', shortTh: 'ม.ค.', nameEn: 'January', shortEn: 'JAN' },
  { month: 2, nameTh: 'กุมภาพันธ์', shortTh: 'ก.พ.', nameEn: 'February', shortEn: 'FEB' },
  { month: 3, nameTh: 'มีนาคม', shortTh: 'มี.ค.', nameEn: 'March', shortEn: 'MAR' },
  { month: 4, nameTh: 'เมษายน', shortTh: 'เม.ย.', nameEn: 'April', shortEn: 'APR' },
  { month: 5, nameTh: 'พฤษภาคม', shortTh: 'พ.ค.', nameEn: 'May', shortEn: 'MAY' },
  { month: 6, nameTh: 'มิถุนายน', shortTh: 'มิ.ย.', nameEn: 'June', shortEn: 'JUN' },
  { month: 7, nameTh: 'กรกฎาคม', shortTh: 'ก.ค.', nameEn: 'July', shortEn: 'JUL' },
  { month: 8, nameTh: 'สิงหาคม', shortTh: 'ส.ค.', nameEn: 'August', shortEn: 'AUG' },
  { month: 9, nameTh: 'กันยายน', shortTh: 'ก.ย.', nameEn: 'September', shortEn: 'SEP' },
  { month: 10, nameTh: 'ตุลาคม', shortTh: 'ต.ค.', nameEn: 'October', shortEn: 'OCT' },
  { month: 11, nameTh: 'พฤศจิกายน', shortTh: 'พ.ย.', nameEn: 'November', shortEn: 'NOV' },
  { month: 12, nameTh: 'ธันวาคม', shortTh: 'ธ.ค.', nameEn: 'December', shortEn: 'DEC' },
];

// Starts from 2025 (Historical Records Support) and dynamically extends all the way to 2127 (100+ years future-proof)
const START_YEAR = 2025;
const END_YEAR = 2127;
const AVAILABLE_YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

interface Excel31DayMatrixViewProps {
  matrix: MonthlyCalendarMatrix;
  onUpdateCell: (category: 'REPAIR' | 'DEFECT_SCRAP', partName: string, day: number, count: number) => void;
  onMonthChange: (year: number, month: number) => void;
  mode?: 'REPAIR' | 'DEFECT_SCRAP';
  selectedGlobalPart?: string;
  onRefreshData?: () => void;
}

export const Excel31DayMatrixView: React.FC<Excel31DayMatrixViewProps> = ({
  matrix,
  onUpdateCell,
  onMonthChange,
  mode,
  selectedGlobalPart = 'ALL',
  onRefreshData
}) => {
  const { language } = useLanguage();
  const isTh = language === 'TH';

  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Inline cell edit state
  const [editingCell, setEditingCell] = useState<{
    category: 'REPAIR' | 'DEFECT_SCRAP';
    partName: string;
    day: number;
    value: number;
  } | null>(null);

  // Matrix Cell New Repair Job Creation Pop-up Modal State (Module 1 Requirement)
  const [cellJobModal, setCellJobModal] = useState<{
    partName: string;
    partCode?: string;
    category?: 'REPAIR' | 'DEFECT_SCRAP';
    day: number;
    month: number;
    year: number;
    currentCount: number;
  } | null>(null);

  const [selectedDetailTicket, setSelectedDetailTicket] = useState<RegrindWorkTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<RegrindWorkTicket | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);

  // Get current tickets to map status & tooltips onto matrix cells
  const tickets = useMemo(() => regrindService.getQueueTickets(), [matrix, cellJobModal, selectedDetailTicket]);

  // Exact days calculation based on standard calendar rules
  const daysInMonth = useMemo(() => {
    return new Date(matrix.year, matrix.month, 0).getDate();
  }, [matrix.year, matrix.month]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const currentMonthInfo = useMemo(() => {
    return MONTH_DEFINITIONS.find(m => m.month === matrix.month) || MONTH_DEFINITIONS[0];
  }, [matrix.month]);

  // Month navigation
  const handlePrevMonth = () => {
    if (matrix.month === 1) {
      onMonthChange(matrix.year - 1, 12);
    } else {
      onMonthChange(matrix.year, matrix.month - 1);
    }
  };

  const handleNextMonth = () => {
    if (matrix.month === 12) {
      onMonthChange(matrix.year + 1, 1);
    } else {
      onMonthChange(matrix.year, matrix.month + 1);
    }
  };

  const handleYearChange = (newYear: number) => {
    onMonthChange(newYear, matrix.month);
  };

  const handleMonthSelect = (newMonth: number) => {
    onMonthChange(matrix.year, newMonth);
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  // Filter rows strictly by selectedLine and searchTerm
  const allowedLinePartNames = useMemo(() => {
    if (selectedLine === 'ALL') return null;
    const parts = getFilteredPartsForLine(selectedLine as ProductionLineId);
    return new Set(parts.map(p => p.partName.toLowerCase()));
  }, [selectedLine]);

  const filteredRepairRows = useMemo(() => {
    return matrix.repairRows.filter(row => {
      if (selectedGlobalPart !== 'ALL' && row.partName.toLowerCase() !== selectedGlobalPart.toLowerCase()) {
        return false;
      }

      const matchSearch =
        row.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.partCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLine = !allowedLinePartNames || allowedLinePartNames.has(row.partName.toLowerCase());
      return matchSearch && matchLine;
    });
  }, [matrix.repairRows, searchTerm, allowedLinePartNames, selectedGlobalPart]);

  const filteredDefectRows = useMemo(() => {
    return matrix.defectRows.filter(row => {
      if (selectedGlobalPart !== 'ALL' && row.partName.toLowerCase() !== selectedGlobalPart.toLowerCase()) {
        return false;
      }

      const matchSearch =
        row.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.partCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLine = !allowedLinePartNames || allowedLinePartNames.has(row.partName.toLowerCase());
      return matchSearch && matchLine;
    });
  }, [matrix.defectRows, searchTerm, allowedLinePartNames, selectedGlobalPart]);

  // Export CSV (Adjusted to exact days in current month)
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `FIN DIE REGRINDING MATRIX REPORT - ${currentMonthInfo.nameEn.toUpperCase()} ${matrix.year} (${daysInMonth} DAYS)\n\n`;

    // 1. Repair section
    csvContent += `HE Grinding Repair ปี ${matrix.year} (งานเจียรสำเร็จ ${currentMonthInfo.nameTh})\n`;
    csvContent += `No,Part Code,Item Name,${daysArray.join(',')},Total\n`;
    filteredRepairRows.forEach((row, idx) => {
      const dailyVals = daysArray.map(d => row.dailyCounts[d] || 0);
      csvContent += `${idx + 1},"${row.partCode}","${row.partName}",${dailyVals.join(',')},${row.total}\n`;
    });
    const repairDailySums = daysArray.map(d =>
      filteredRepairRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0)
    );
    csvContent += `Total,,,${repairDailySums.join(',')},${filteredRepairRows.reduce((s, r) => s + r.total, 0)}\n\n`;

    // 2. Defect section
    csvContent += `ซ่อมไม่ได้ (ทิ้ง) / HE Grinding Defect ปี ${matrix.year} (${currentMonthInfo.nameTh})\n`;
    csvContent += `No,Part Code,Item Name,${daysArray.join(',')},Total\n`;
    filteredDefectRows.forEach((row, idx) => {
      const dailyVals = daysArray.map(d => row.dailyCounts[d] || 0);
      csvContent += `${idx + 1},"${row.partCode}","${row.partName}",${dailyVals.join(',')},${row.total}\n`;
    });
    const defectDailySums = daysArray.map(d =>
      filteredDefectRows.reduce((sum, r) => sum + (r.dailyCounts[d] || 0), 0)
    );
    csvContent += `Total Defect,,,${defectDailySums.join(',')},${filteredDefectRows.reduce((s, r) => s + r.total, 0)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinDie_Regrinding_Matrix_${matrix.year}_M${matrix.month}_${daysInMonth}Days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    onUpdateCell(editingCell.category, editingCell.partName, editingCell.day, editingCell.value);
    setEditingCell(null);
  };

  // Daily Column Totals
  const getDailyRepairTotal = (day: number) => {
    return filteredRepairRows.reduce((acc, row) => acc + (row.dailyCounts[day] || 0), 0);
  };

  const getDailyDefectTotal = (day: number) => {
    return filteredDefectRows.reduce((acc, row) => acc + (row.dailyCounts[day] || 0), 0);
  };

  const filteredRepairTotal = filteredRepairRows.reduce((sum, r) => sum + r.total, 0);
  const filteredDefectTotal = filteredDefectRows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-2.5 w-full font-sans">
      {/* Top Filter & Action Bar Header - Unified Single-Level Compact Bar */}
      <div className="bg-[#091122] border border-slate-700/80 rounded-xl p-2 sm:p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2">
        {/* Left: Line Filter Pills (Highest Usage Priority) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-[#070D19] border border-slate-800 rounded-lg p-0.5 flex items-center gap-0.5 overflow-x-auto h-7">
            <span className="text-[10px] font-mono font-bold text-slate-400 px-1 flex items-center gap-0.5">
              <Factory className="w-3 h-3 text-cyan-400" />
              <span>LINE:</span>
            </span>

            {LINE_QUICK_FILTERS.map(lf => {
              const isSelected = selectedLine === lf.id;
              return (
                <button
                  key={lf.id}
                  type="button"
                  onClick={() => setSelectedLine(lf.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 border cursor-pointer h-6 ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow font-black'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  <span>{lf.label}</span>
                </button>
              );
            })}
          </div>

          {/* Month & Year Stepper */}
          <div className="flex items-center bg-[#070D19] rounded-lg p-0.5 border border-slate-700 h-7 text-xs font-mono">
            {/* Year Dropdown */}
            <select
              value={matrix.year}
              onChange={e => handleYearChange(parseInt(e.target.value) || 2026)}
              className="bg-transparent text-cyan-300 font-bold text-[11px] px-1 focus:outline-none cursor-pointer border-r border-slate-700/60 mr-0.5"
              title="เลือกปี ค.ศ."
            >
              {AVAILABLE_YEARS.map(yr => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  {yr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <select
              value={matrix.month}
              onChange={e => handleMonthSelect(parseInt(e.target.value) || 1)}
              className="bg-transparent text-emerald-300 font-bold text-[11px] px-1 focus:outline-none cursor-pointer"
              title={isTh ? "เลือกเดือน" : "Select Month"}
            >
              {MONTH_DEFINITIONS.map(m => {
                const mDays = new Date(matrix.year, m.month, 0).getDate();
                return (
                  <option key={m.month} value={m.month} className="bg-slate-900 text-white">
                    {isTh ? `${m.nameTh} (${m.shortEn})` : `${m.nameEn} (${m.shortEn})`} ({mDays}d)
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isTh ? "เดือนถัดไป" : "Next Month"}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Month Quick Button */}
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 h-7 cursor-pointer"
            title={isTh ? "เดือนปัจจุบัน" : "Current Month"}
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>{isTh ? "ปัจจุบัน" : "Current"}</span>
          </button>
        </div>

        {/* Right: Search + Export CSV */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search Box */}
          <div className="flex items-center gap-1 bg-[#070D19] border border-slate-700 rounded-lg px-2 py-0.5 h-7">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder={isTh ? "ค้นหาพาร์ท / รหัส..." : "Search part / code..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white text-[11px] focus:outline-none w-36 sm:w-44"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-0.5 text-[10.5px] font-bold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 transition-all h-7 cursor-pointer"
            title={isTh ? `ส่งออก CSV ${daysInMonth} วัน` : `Export CSV ${daysInMonth} Days`}
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HE Grinding Repair Matrix (งานเจียรสำเร็จ) */}
      {/* ========================================================================= */}
      {(!mode || mode === 'REPAIR') && (
      <div className="bg-[#131E35] rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-emerald-950/90 border-b border-emerald-700/60 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-xs sm:text-sm tracking-wide text-emerald-200">
              {isTh
                ? `HE Grinding Repair ปี ${matrix.year} • ${currentMonthInfo.nameTh} (ตารางบันทึกงานเจียรสำเร็จ ${daysInMonth} วัน)`
                : `HE Grinding Repair Year ${matrix.year} • ${currentMonthInfo.nameEn} (Regrind Matrix ${daysInMonth} Days)`}
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-600">
            {isTh ? `รวม: ${filteredRepairTotal} ชิ้น` : `Total: ${filteredRepairTotal} pcs`}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-[#0B1220] text-slate-300 sticky top-0 z-20 border-b border-slate-700 shadow">
              <tr>
                <th className="p-2 w-8 text-center border-r border-slate-700 font-bold font-mono">
                  No.
                </th>
                <th className="p-2 min-w-[210px] border-r border-slate-700 font-bold">
                  Date / Item Name
                </th>
                <th className="p-1 w-12 text-center border-r border-slate-700 font-bold">
                  Pic
                </th>
                {daysArray.map(day => {
                  const dow = new Date(matrix.year, matrix.month - 1, day).getDay();
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  const dowLabel = isTh
                    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dow]
                    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dow];
                  return (
                    <th
                      key={`repair-head-day-${day}`}
                      className={`p-1 min-w-[30px] text-center border-r font-mono font-bold transition-colors ${
                        isSun
                          ? 'bg-rose-950/75 text-rose-300 border-rose-500/30 hover:bg-rose-900/80'
                          : isSat
                          ? 'bg-violet-950/75 text-violet-300 border-violet-500/30 hover:bg-violet-900/80'
                          : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                      title={isSun ? 'วันอาทิตย์ (วันหยุด)' : isSat ? 'วันเสาร์ (วันหยุด)' : undefined}
                    >
                      <div className="leading-none">{day}</div>
                      <div className={`text-[8.5px] mt-0.5 leading-none ${isSun ? 'text-rose-400' : isSat ? 'text-violet-400' : 'text-slate-500'}`}>
                        {dowLabel}
                      </div>
                    </th>
                  );
                })}
                <th className="p-2 w-16 text-center bg-emerald-950 text-emerald-300 font-bold font-mono border-l border-slate-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRepairRows.map((row, idx) => (
                <tr
                  key={`repair-row-${row.partName}`}
                  className="hover:bg-slate-800/60 transition-colors group"
                >
                  <td className="p-2 text-center font-mono text-cyan-400/70 border-r border-slate-800">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-800 font-medium text-slate-100 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{row.partName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({row.partCode})</span>
                      {row.total > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 text-center border-r border-slate-800">
                    <ToolingPicThumbnail
                      picCategory={row.picCategory}
                      partName={row.partName}
                      size="xs"
                    />
                  </td>
                  {daysArray.map(day => {
                    const count = row.dailyCounts[day] || 0;
                    
                    // Find ticket for this part and day
                    const matchingTicket = tickets.find(t => {
                      const matchName = t.partName.toLowerCase() === row.partName.toLowerCase();
                      const ticketDate = t.targetCompletionDate ? new Date(t.targetCompletionDate) : new Date(t.createdAt);
                      return matchName && ticketDate.getDate() === day && (ticketDate.getMonth() + 1) === matrix.month;
                    });

                    const now = new Date();
                    const targetDateObj = matchingTicket?.targetCompletionDate ? new Date(matchingTicket.targetCompletionDate) : null;
                    const isOverdue = matchingTicket && matchingTicket.status !== 'READY' && matchingTicket.status !== 'SCRAP' && ((targetDateObj && targetDateObj < now) || matchingTicket.isDelayed);

                    const dow = new Date(matrix.year, matrix.month - 1, day).getDay();
                    const isSun = dow === 0;
                    const isSat = dow === 6;

                    // Color status calculation (Module 1 Requirement)
                    let statusBgClass = isSun
                      ? 'bg-rose-950/25 text-rose-400/70 hover:bg-rose-900/50'
                      : isSat
                      ? 'bg-violet-950/25 text-violet-400/70 hover:bg-violet-900/50'
                      : 'text-slate-600 hover:bg-slate-800/80';
                    let statusBadgeLabel = '';

                    if (matchingTicket) {
                      switch (matchingTicket.status) {
                        case 'PENDING':
                          statusBgClass = 'bg-yellow-400 text-slate-950 font-black shadow-xs';
                          statusBadgeLabel = '🟡 PENDING';
                          break;
                        case 'IN_PROCESS':
                          statusBgClass = 'bg-blue-600 text-white font-black shadow-xs';
                          statusBadgeLabel = '🔵 IN-PROCESS';
                          break;
                        case 'READY':
                          statusBgClass = 'bg-emerald-600 text-white font-black shadow-xs';
                          statusBadgeLabel = '🟢 READY';
                          break;
                        case 'SCRAP':
                          statusBgClass = 'bg-rose-600 text-white font-black shadow-xs';
                          statusBadgeLabel = '🔴 SCRAP';
                          break;
                      }
                    } else if (count > 0) {
                      statusBgClass = 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-700/60';
                    }

                    const overdueBorderClass = isOverdue ? 'border-2 border-orange-500 animate-pulse ring-2 ring-orange-400' : 'border-r border-slate-800/60';

                    const cellKey = `${row.partName}-${day}`;

                    return (
                      <td
                        key={`repair-cell-${row.partName}-${day}`}
                        onMouseEnter={() => setHoveredCellKey(cellKey)}
                        onMouseLeave={() => setHoveredCellKey(null)}
                        onClick={() => {
                          setEditingTicket(null);
                          setCellJobModal({
                            partName: row.partName,
                            partCode: row.partCode,
                            category: 'REPAIR',
                            day,
                            month: matrix.month,
                            year: matrix.year,
                            currentCount: count
                          });
                        }}
                        className={`p-1 text-center font-mono cursor-pointer transition-all relative ${statusBgClass} ${overdueBorderClass}`}
                        title={`คลิกเปิดใบงาน / วางแผนเจียร: ${row.partName} วันที่ ${day} ${currentMonthInfo.nameTh}`}
                      >
                        {count > 0 ? (
                          <span className="font-extrabold text-[11px] block">
                            {count}
                          </span>
                        ) : matchingTicket ? (
                          <span className="text-[10px] font-bold">1</span>
                        ) : (
                          '-'
                        )}

                        {/* Hover Tooltip (Module 1 Requirement) */}
                        {hoveredCellKey === cellKey && (matchingTicket || count > 0) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-slate-950 text-white border border-slate-700 shadow-2xl z-50 text-left pointer-events-none text-[11px]">
                            <div className="font-bold text-cyan-300 border-b border-slate-800 pb-1 mb-1 flex justify-between items-center">
                              <span>{row.partName}</span>
                              <span className="text-[10px] font-mono text-slate-400">Day {day} {currentMonthInfo.shortEn}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-300">
                                <strong className="text-slate-400">จำนวน:</strong> {count || matchingTicket?.quantity || 1} ชิ้น
                              </p>
                              {matchingTicket && (
                                <>
                                  <p className="flex items-center gap-1 font-mono text-[10px] text-cyan-400">
                                    <strong>Ticket:</strong> {matchingTicket.jobCode}
                                  </p>
                                  <p className="flex items-center gap-1">
                                    <strong>สถานะ:</strong> <span className="font-bold">{statusBadgeLabel || matchingTicket.status}</span>
                                  </p>
                                  <p className="text-slate-400 text-[10px]">
                                    <strong>เป้าหมาย:</strong> {matchingTicket.targetCompletionDate ? new Date(matchingTicket.targetCompletionDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '17:00'}
                                  </p>
                                  {isOverdue && (
                                    <p className="text-orange-400 font-bold flex items-center gap-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3" />
                                      Overdue / Delayed [ย้ายวันอัตโนมัติ]
                                    </p>
                                  )}
                                </>
                              )}
                              {!matchingTicket && (
                                <p className="text-emerald-400 font-semibold">
                                  บันทึกงานสำเร็จในตาราง {count} ชิ้น
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-mono font-black text-emerald-400 bg-emerald-950/30 border-l border-slate-800">
                    {row.total > 0 ? row.total : 0}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Daily Total Summary Row */}
            <tfoot className="bg-[#0B1220] font-bold border-t-2 border-slate-700 sticky bottom-0 z-10 shadow">
              <tr>
                <td colSpan={3} className="p-2 text-right border-r border-slate-700 text-slate-300">
                  Total (ชิ้น / วัน):
                </td>
                {daysArray.map(day => {
                  const dailyTotal = getDailyRepairTotal(day);
                  return (
                    <td
                      key={`repair-sum-day-${day}`}
                      className={`p-1 text-center font-mono border-r border-slate-800 text-[10px] ${
                        dailyTotal > 0
                          ? 'bg-emerald-950/80 text-emerald-300 font-black'
                          : 'text-slate-600'
                      }`}
                    >
                      {dailyTotal > 0 ? dailyTotal : 0}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-mono font-black text-emerald-200 bg-emerald-900 border-l border-slate-700">
                  {filteredRepairTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ซ่อมไม่ได้ (ทิ้ง) / HE Grinding Defect Matrix */}
      {/* ========================================================================= */}
      {(!mode || mode === 'DEFECT_SCRAP') && (
      <div className="bg-[#131E35] rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-rose-950/90 border-b border-rose-700/60 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            <h3 className="font-bold text-xs sm:text-sm tracking-wide text-rose-200">
              {isTh
                ? `ซ่อมไม่ได้ (ทิ้ง) / HE Grinding Defect ปี ${matrix.year} • ${currentMonthInfo.nameTh} (${daysInMonth} วัน)`
                : `Scrap & Defect / HE Grinding Defect Year ${matrix.year} • ${currentMonthInfo.nameEn} (${daysInMonth} Days)`}
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold bg-rose-950 text-rose-300 px-2.5 py-0.5 rounded border border-rose-600">
            {isTh ? `รวม: ${filteredDefectTotal} ชิ้น` : `Total: ${filteredDefectTotal} pcs`}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-210px)] min-h-[380px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-[#0B1220] text-slate-300 sticky top-0 z-20 border-b border-slate-700 shadow">
              <tr>
                <th className="p-2 w-8 text-center border-r border-slate-700 font-bold font-mono">
                  No.
                </th>
                <th className="p-2 min-w-[210px] border-r border-slate-700 font-bold">
                  Date / Item Name
                </th>
                <th className="p-1 w-12 text-center border-r border-slate-700 font-bold">
                  Pic
                </th>
                {daysArray.map(day => {
                  const dow = new Date(matrix.year, matrix.month - 1, day).getDay();
                  const isSun = dow === 0;
                  const isSat = dow === 6;
                  const dowLabel = isTh
                    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dow]
                    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dow];
                  return (
                    <th
                      key={`defect-head-day-${day}`}
                      className={`p-1 min-w-[30px] text-center border-r font-mono font-bold transition-colors ${
                        isSun
                          ? 'bg-rose-950/75 text-rose-300 border-rose-500/30 hover:bg-rose-900/80'
                          : isSat
                          ? 'bg-violet-950/75 text-violet-300 border-violet-500/30 hover:bg-violet-900/80'
                          : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                      title={isSun ? 'วันอาทิตย์ (วันหยุด)' : isSat ? 'วันเสาร์ (วันหยุด)' : undefined}
                    >
                      <div className="leading-none">{day}</div>
                      <div className={`text-[8.5px] mt-0.5 leading-none ${isSun ? 'text-rose-400' : isSat ? 'text-violet-400' : 'text-slate-500'}`}>
                        {dowLabel}
                      </div>
                    </th>
                  );
                })}
                <th className="p-2 w-16 text-center bg-rose-950 text-rose-300 font-bold font-mono border-l border-slate-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDefectRows.map((row, idx) => (
                <tr
                  key={`defect-row-${row.partName}`}
                  className="hover:bg-slate-800/60 transition-colors group"
                >
                  <td className="p-2 text-center font-mono text-rose-400/70 border-r border-slate-800">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-800 font-medium text-slate-100 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{row.partName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({row.partCode})</span>
                      {row.total > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 text-center border-r border-slate-800">
                    <ToolingPicThumbnail
                      picCategory={row.picCategory}
                      partName={row.partName}
                      size="xs"
                    />
                  </td>
                  {daysArray.map(day => {
                    const count = row.dailyCounts[day];
                    const dow = new Date(matrix.year, matrix.month - 1, day).getDay();
                    const isSun = dow === 0;
                    const isSat = dow === 6;
                    return (
                      <td
                        key={`defect-cell-${row.partName}-${day}`}
                        onClick={() => {
                          setEditingTicket(null);
                          setCellJobModal({
                            partName: row.partName,
                            partCode: row.partCode,
                            category: 'DEFECT_SCRAP',
                            day,
                            month: matrix.month,
                            year: matrix.year,
                            currentCount: count || 0
                          });
                        }}
                        className={`p-1 text-center font-mono border-r border-slate-800/60 cursor-pointer transition-all hover:bg-rose-950/70 ${
                          count
                            ? 'bg-rose-950/50 text-rose-300 font-bold'
                            : isSun
                            ? 'bg-rose-950/25 text-rose-400/70'
                            : isSat
                            ? 'bg-violet-950/25 text-violet-400/70'
                            : 'text-slate-600'
                        }`}
                        title={`คลิกเพื่อแก้ไขจำนวนชิ้นที่ทิ้ง: ${row.partName} วันที่ ${day} ${currentMonthInfo.nameTh}`}
                      >
                        {count !== undefined && count > 0 ? (
                          <span className="inline-block px-1 rounded bg-rose-900/60 text-rose-300 text-[10px] border border-rose-700/50">
                            {count}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-mono font-black text-rose-400 bg-rose-950/30 border-l border-slate-800">
                    {row.total > 0 ? row.total : 0}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Defect Daily Total Summary Row */}
            <tfoot className="bg-[#0B1220] font-bold border-t-2 border-slate-700 sticky bottom-0 z-10 shadow">
              <tr>
                <td colSpan={3} className="p-2 text-right border-r border-slate-700 text-slate-300">
                  Total Defect (ทิ้ง):
                </td>
                {daysArray.map(day => {
                  const dailyTotal = getDailyDefectTotal(day);
                  return (
                    <td
                      key={`defect-sum-day-${day}`}
                      className={`p-1 text-center font-mono border-r border-slate-800 text-[10px] ${
                        dailyTotal > 0
                          ? 'bg-rose-950/80 text-rose-300 font-black'
                          : 'text-slate-600'
                      }`}
                    >
                      {dailyTotal > 0 ? dailyTotal : 0}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-mono font-black text-rose-200 bg-rose-900 border-l border-slate-700">
                  {filteredDefectTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* Unified Regrind Job Modal when clicking a cell in the 31-day Matrix */}
      <UnifiedRegrindJobModal
        isOpen={Boolean(cellJobModal || editingTicket)}
        onClose={() => {
          setCellJobModal(null);
          setEditingTicket(null);
        }}
        onSaved={() => {
          setCellJobModal(null);
          setEditingTicket(null);
          if (onRefreshData) onRefreshData();
        }}
        initialDateStr={
          cellJobModal
            ? `${cellJobModal.year}-${String(cellJobModal.month).padStart(2, '0')}-${String(cellJobModal.day).padStart(2, '0')}`
            : undefined
        }
        initialLineId={selectedLine !== 'ALL' ? (selectedLine as ProductionLineId) : 'E1'}
        initialPartCode={cellJobModal?.partCode}
        initialPartName={cellJobModal?.partName}
        matrixCategory={cellJobModal?.category || mode || 'REPAIR'}
        existingTicket={editingTicket}
        dayExistingTickets={
          cellJobModal
            ? tickets.filter(t => {
                const dStr = `${cellJobModal.year}-${String(cellJobModal.month).padStart(2, '0')}-${String(cellJobModal.day).padStart(2, '0')}`;
                const tDate = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
                return tDate === dStr;
              })
            : []
        }
        onSelectExistingTicket={t => {
          setCellJobModal(null);
          setEditingTicket(null);
          setSelectedDetailTicket(t);
        }}
      />

      {/* Queue Ticket Detail Modal when clicking any queue item in that day */}
      <QueueTicketDetailModal
        ticket={selectedDetailTicket}
        sameDayTickets={
          selectedDetailTicket
            ? tickets.filter(t => {
                const targetD = selectedDetailTicket.scheduledDate || selectedDetailTicket.targetCompletionDate?.slice(0, 10);
                const d = t.scheduledDate || t.targetCompletionDate?.slice(0, 10);
                return targetD && d === targetD;
              })
            : []
        }
        onSelectTicket={t => setSelectedDetailTicket(t)}
        onClose={() => setSelectedDetailTicket(null)}
        onEditTicket={(t, defaultEmg) => {
          setSelectedDetailTicket(null);
          setEditingTicket({
            ...t,
            isEmergency: defaultEmg ?? t.isEmergency,
            urgency: defaultEmg ? 'EMERGENCY' : t.urgency
          });
        }}
        onStartOrResume={t => {
          if (t.status === 'PAUSED') {
            regrindService.resumePausedTicket(t.id);
          } else {
            regrindService.startGrinding(t.id, t.assignedTechnician || 'Thanakorn Phonpayung');
          }
          if (onRefreshData) onRefreshData();
          setSelectedDetailTicket(regrindService.getQueueTickets().find(x => x.id === t.id) || null);
        }}
        onCompleteTicket={t => {
          const prev = t.previousLengthMm || t.nominalLengthMm || 70.0;
          const depth = t.grindDepthMm || 0.20;
          regrindService.completeGrinding(t.id, {
            remainingLengthMm: Number((prev - depth).toFixed(3)),
            grindDepthMm: depth,
            shimAddedMm: depth,
            technicianName: t.assignedTechnician || 'Thanakorn Phonpayung',
            remarks: t.remarks
          });
          setSelectedDetailTicket(null);
          if (onRefreshData) onRefreshData();
        }}
        onDeleteTicket={t => {
          regrindService.deleteQueueTicket(t.id);
          setSelectedDetailTicket(null);
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Inline Cell Edit Modal */}
      {editingCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setEditingCell(null)}
        >
          <div
            className="bg-[#0D1527] border border-slate-700 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white">
                แก้ไขจำนวนชิ้นรายวัน
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                วันที่ {editingCell.day} {currentMonthInfo.shortTh} {matrix.year}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              {editingCell.partName} ({editingCell.category === 'REPAIR' ? 'งานเจียรสำเร็จ' : 'ทิ้ง/หมดสเปค'})
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                จำนวน (ชิ้น):
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={editingCell.value}
                onChange={e =>
                  setEditingCell({ ...editingCell, value: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#070D19] border border-slate-700 font-mono text-center text-lg font-bold text-cyan-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow transition-colors flex items-center justify-center gap-1 font-bold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
