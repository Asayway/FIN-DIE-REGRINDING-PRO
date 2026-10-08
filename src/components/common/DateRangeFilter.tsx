import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, X, RotateCcw, Clock, Sparkles } from 'lucide-react';

export interface DateRangeState {
  startDate: string; // YYYY-MM-DD or ''
  endDate: string;   // YYYY-MM-DD or ''
  isFiltered: boolean;
}

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChangeRange: (startDate: string, endDate: string) => void;
  onReset?: () => void;
  maxDaysAllowed?: number; // Default 31
  isHmi?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Format Date object to YYYY-MM-DD string format
 */
export const formatDateToYYYYMMDD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to check if a date string/ISO timestamp falls within start & end date range
 */
export const isDateInSelectedRange = (
  dateStr: string | undefined | null,
  startDateStr: string,
  endDateStr: string
): boolean => {
  if (!dateStr) return false;
  if (!startDateStr && !endDateStr) return true;

  try {
    let targetDateStr = dateStr;
    if (dateStr.includes('T')) {
      targetDateStr = dateStr.slice(0, 10);
    } else if (dateStr.length > 10) {
      targetDateStr = dateStr.slice(0, 10);
    }

    if (startDateStr && targetDateStr < startDateStr) return false;
    if (endDateStr && targetDateStr > endDateStr) return false;
    return true;
  } catch (err) {
    return true;
  }
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChangeRange,
  onReset,
  maxDaysAllowed = 31,
  isHmi = false,
  className = '',
  compact = false
}) => {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  // Calculate selected duration in days
  const calculateDaysDiff = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    if (isNaN(diffTime) || diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const selectedDaysCount = calculateDaysDiff(startDate, endDate);

  // Validate & Cap range if user picks invalid dates
  const handleStartDateChange = (newStart: string) => {
    setWarningMsg(null);
    if (!newStart) {
      onChangeRange('', endDate);
      return;
    }

    if (endDate) {
      if (newStart > endDate) {
        // Automatically push end date to match start date
        onChangeRange(newStart, newStart);
        return;
      }
      const days = calculateDaysDiff(newStart, endDate);
      if (days > maxDaysAllowed) {
        // Auto cap end date to start date + maxDaysAllowed - 1
        const s = new Date(newStart);
        s.setDate(s.getDate() + (maxDaysAllowed - 1));
        const cappedEnd = formatDateToYYYYMMDD(s);
        onChangeRange(newStart, cappedEnd);
        setWarningMsg(`จำกัดช่วงเวลาสูงสุดไม่เกิน ${maxDaysAllowed} วัน (ปรับวันสิ้นสุดอัตโนมัติ)`);
        setTimeout(() => setWarningMsg(null), 4000);
        return;
      }
    }
    onChangeRange(newStart, endDate);
  };

  const handleEndDateChange = (newEnd: string) => {
    setWarningMsg(null);
    if (!newEnd) {
      onChangeRange(startDate, '');
      return;
    }

    if (startDate) {
      if (newEnd < startDate) {
        // Automatically push start date to match end date
        onChangeRange(newEnd, newEnd);
        return;
      }
      const days = calculateDaysDiff(startDate, newEnd);
      if (days > maxDaysAllowed) {
        // Auto cap start date to end date - (maxDaysAllowed - 1)
        const e = new Date(newEnd);
        e.setDate(e.getDate() - (maxDaysAllowed - 1));
        const cappedStart = formatDateToYYYYMMDD(e);
        onChangeRange(cappedStart, newEnd);
        setWarningMsg(`จำกัดช่วงเวลาสูงสุดไม่เกิน ${maxDaysAllowed} วัน (ปรับวันเริ่มต้นอัตโนมัติ)`);
        setTimeout(() => setWarningMsg(null), 4000);
        return;
      }
    }
    onChangeRange(startDate, newEnd);
  };

  // Preset Handlers
  const handlePresetDays = (days: number) => {
    setWarningMsg(null);
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (days - 1));
    onChangeRange(formatDateToYYYYMMDD(start), formatDateToYYYYMMDD(today));
  };

  const handlePresetThisMonth = () => {
    setWarningMsg(null);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Check if month length exceeds maxDaysAllowed
    const diffDays = Math.floor((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > maxDaysAllowed) {
      // cap to maxDaysAllowed
      const cappedLast = new Date(firstDay);
      cappedLast.setDate(firstDay.getDate() + (maxDaysAllowed - 1));
      onChangeRange(formatDateToYYYYMMDD(firstDay), formatDateToYYYYMMDD(cappedLast));
    } else {
      onChangeRange(formatDateToYYYYMMDD(firstDay), formatDateToYYYYMMDD(lastDay));
    }
  };

  const handleClear = () => {
    setWarningMsg(null);
    onChangeRange('', '');
    if (onReset) onReset();
  };

  const hasFilter = Boolean(startDate || endDate);

  return (
    <div className={`relative inline-flex flex-col gap-0.5 ${className}`}>
      {/* Date Range Control Toolbar */}
      <div className={`flex items-center gap-1 flex-wrap ${
        isHmi ? 'text-green-300' : 'text-slate-200'
      }`}>
        {/* Main Calendar Trigger & Quick Input Group */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border transition-all h-7 ${
          hasFilter
            ? isHmi
              ? 'bg-zinc-950 border-green-400 shadow-sm ring-1 ring-green-400/40'
              : 'bg-slate-950 border-cyan-400 shadow-sm ring-1 ring-cyan-400/40'
            : isHmi
            ? 'bg-zinc-900/90 border-zinc-700'
            : 'bg-slate-900/90 border-slate-700 hover:border-slate-600'
        }`}>
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
            <Calendar className={`w-3 h-3 flex-shrink-0 ${
              hasFilter 
                ? isHmi ? 'text-green-300 animate-pulse' : 'text-cyan-300 animate-pulse'
                : 'text-slate-400'
            }`} />
            <span className="hidden sm:inline font-thai text-[10px] text-slate-300">วันที่:</span>
          </div>

          {/* Start Date Input */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className={`bg-transparent border-none text-[10.5px] font-mono font-bold rounded px-1 py-0 outline-none transition-all h-6 [color-scheme:dark] w-24 sm:w-28 ${
              isHmi
                ? 'text-green-300'
                : 'text-white'
            }`}
            title="วันเริ่มต้น (Start Date)"
          />

          <span className="text-slate-500 text-[10px] font-mono font-bold">-</span>

          {/* End Date Input */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className={`bg-transparent border-none text-[10.5px] font-mono font-bold rounded px-1 py-0 outline-none transition-all h-6 [color-scheme:dark] w-24 sm:w-28 ${
              isHmi
                ? 'text-green-300'
                : 'text-white'
            }`}
            title="วันสิ้นสุด (End Date)"
          />

          {/* Days Indicator Badge */}
          {hasFilter && selectedDaysCount > 0 && (
            <span className={`px-1 py-0 rounded text-[9px] font-mono font-bold border ${
              selectedDaysCount > maxDaysAllowed
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : isHmi
                ? 'bg-green-950 text-green-400 border-green-800'
                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
            }`}>
              {selectedDaysCount}d
            </span>
          )}

          {/* Quick Clear Button */}
          {hasFilter && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
              title="ล้างช่วงวันที่ (Clear Filter)"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Preset Buttons - Compact */}
        {!compact && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handlePresetDays(7)}
              className={`px-1.5 py-0.5 h-7 rounded-md text-[9.5px] font-mono font-bold transition-all border cursor-pointer ${
                selectedDaysCount === 7 && startDate && endDate
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[#070D19] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
            >
              7D
            </button>

            <button
              type="button"
              onClick={() => handlePresetDays(30)}
              className={`px-1.5 py-0.5 h-7 rounded-md text-[9.5px] font-mono font-bold transition-all border cursor-pointer ${
                selectedDaysCount === 30 && startDate && endDate
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                  : 'bg-[#070D19] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
            >
              30D
            </button>

            <button
              type="button"
              onClick={handlePresetThisMonth}
              className="px-1.5 py-0.5 h-7 rounded-md text-[9.5px] font-mono font-bold transition-all border bg-[#070D19] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700 cursor-pointer"
            >
              เดือนนี้
            </button>
          </div>
        )}
      </div>

      {/* Constraint Warning Toast */}
      {warningMsg && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/90 border border-amber-600/80 text-amber-300 rounded-lg text-[11px] font-thai animate-fade-in shadow-md">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}
    </div>
  );
};
