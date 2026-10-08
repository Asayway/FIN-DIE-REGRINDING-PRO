import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Calendar as CalendarIcon,
  Plus,
  ArrowUp,
  ArrowDown,
  Play,
  CheckCircle2,
  Clock,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Wrench,
  Zap,
  Layers,
  Eye,
  Edit2,
  X,
  SlidersHorizontal,
  CalendarDays
} from 'lucide-react';
import { ProductionLineId } from '../../types';
import { RegrindWorkTicket } from '../../types/regrind';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { useLanguage } from '../../i18n';
import { UnifiedRegrindJobModal } from '../../components/modals/UnifiedRegrindJobModal';
import { QueueTicketDetailModal } from '../../components/modals/QueueTicketDetailModal';

interface SmartQueueAndCalendarScheduleViewProps {
  onNavigate?: (route: string, lineId?: ProductionLineId) => void;
}

const LINES_LIST: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SmartQueueAndCalendarScheduleView: React.FC<SmartQueueAndCalendarScheduleViewProps> = ({
  onNavigate
}) => {
  const { language } = useLanguage();
  const isTh = language === 'TH';

  const [tickets, setTickets] = useState<RegrindWorkTicket[]>(() => regrindService.getQueueTickets());
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');

  // Selected date from calendar to sync and display queue for that specific date in the left panel
  const todayIsoStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Calendar Month & Year state
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth() + 1); // 1-12

  // Drag-and-Drop state for Queue List & Calendar Cells
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [dragOverQueueOrder, setDragOverQueueOrder] = useState<number | null>(null);

  // Unified Job Entry / Edit Modal State (same popup for Normal & Urgent #1)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState<boolean>(false);
  const [modalDateStr, setModalDateStr] = useState<string>(now.toISOString().slice(0, 10));
  const [modalLineId, setModalLineId] = useState<ProductionLineId>('E1');
  const [modalIsEmergency, setModalIsEmergency] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<RegrindWorkTicket | null>(null);

  // Clicked Queue Item Detail Modal State
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<RegrindWorkTicket | null>(null);

  // Resizable Left/Right Split Ratio State (20% to 75%, default 38%)
  const [leftSplitPercent, setLeftSplitPercent] = useState<number>(38);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const handleStartSplitterDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const pct = Math.round((relativeX / Math.max(rect.width, 1)) * 100);
      const clamped = Math.max(20, Math.min(75, pct));
      setLeftSplitPercent(clamped);
    };

    const onMouseUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const reloadAll = () => {
    const latest = regrindService.getQueueTickets();
    setTickets(latest);
    if (selectedDetailTicket) {
      const updated = latest.find(t => t.id === selectedDetailTicket.id) || null;
      setSelectedDetailTicket(updated);
    }
  };

  useEffect(() => {
    reloadAll();
    const unsub1 = regrindService.subscribe(reloadAll);
    const unsub2 = storageService.subscribe(reloadAll);
    return () => {
      unsub1();
      unsub2();
    };
  }, [selectedDetailTicket?.id]);

  const showToast = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 5000);
  };

  // Active Sorted Queue (All)
  const allActiveQueue = useMemo(() => {
    return tickets
      .filter(t => {
        const isActive = t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED';
        if (!isActive) return false;
        if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
        return true;
      })
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));
  }, [tickets, selectedLineFilter]);

  // Active Displayed Queue (either filtered by selectedCalendarDate or All)
  const displayedQueue = useMemo(() => {
    if (!selectedCalendarDate) {
      return allActiveQueue;
    }
    return tickets
      .filter(t => {
        if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
        const tDate = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        return tDate === selectedCalendarDate;
      })
      .sort((a, b) => {
        const aEmg = a.isEmergency || a.urgency === 'EMERGENCY' ? 0 : 1;
        const bEmg = b.isEmergency || b.urgency === 'EMERGENCY' ? 0 : 1;
        if (aEmg !== bEmg) return aEmg - bEmg;
        return (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999);
      });
  }, [tickets, selectedCalendarDate, allActiveQueue, selectedLineFilter]);

  // Open Unified Modal for New Normal or Urgent Job on a Date
  const handleOpenCreateForDate = (dateStr: string, defaultEmergency = false) => {
    // Validate past date
    if (dateStr < todayIsoStr) {
      showToast(`⚠️ ไม่อนุญาตให้ลงวันที่ย้อนหลัง (ระบบปรับเป็นวันที่ปัจจุบัน ${todayIsoStr} ให้แทน)`);
      dateStr = todayIsoStr;
    }
    setEditingTicket(null);
    setModalDateStr(dateStr);
    setModalLineId(selectedLineFilter !== 'ALL' ? (selectedLineFilter as ProductionLineId) : 'E1');
    setModalIsEmergency(defaultEmergency);
    setIsUnifiedModalOpen(true);
  };

  // Open Unified Modal to Edit or Promote an Existing Ticket to Urgent #1
  const handleOpenEditOrPromoteTicket = (ticket: RegrindWorkTicket, defaultEmergency?: boolean) => {
    setSelectedDetailTicket(null);
    setEditingTicket(ticket);
    setModalDateStr(ticket.scheduledDate || ticket.targetCompletionDate?.slice(0, 10) || todayIsoStr);
    setModalLineId(ticket.lineId);
    setModalIsEmergency(defaultEmergency ?? Boolean(ticket.isEmergency || ticket.urgency === 'EMERGENCY'));
    setIsUnifiedModalOpen(true);
  };

  // Move Queue Order Up / Down
  const handleMoveOrder = (ticketId: string, newOrder: number) => {
    const res = regrindService.reorderQueueTicket(ticketId, newOrder);
    reloadAll();
    showToast(res.message);
  };

  // Start or Resume Grinding
  const handleStartOrResume = (ticket: RegrindWorkTicket) => {
    if (ticket.status === 'PAUSED') {
      const res = regrindService.resumePausedTicket(ticket.id);
      reloadAll();
      showToast(res.message);
    } else {
      const res = regrindService.startGrinding(ticket.id, ticket.assignedTechnician || 'Thanakorn Phonpayung', {
        etaMinutes: 45
      });
      reloadAll();
      showToast(res.message);
    }
  };

  // Complete Grinding directly from Detail Modal
  const handleCompleteTicketFromDetail = (ticket: RegrindWorkTicket) => {
    const prev = ticket.previousLengthMm || ticket.nominalLengthMm || 70.0;
    const depth = ticket.grindDepthMm || 0.20;
    const remaining = ticket.lengthAfterGrindMm || Number((prev - depth).toFixed(3));
    const res = regrindService.completeGrinding(ticket.id, {
      remainingLengthMm: remaining,
      grindDepthMm: depth,
      shimAddedMm: depth,
      technicianName: ticket.assignedTechnician || 'Thanakorn Phonpayung',
      remarks: ticket.remarks
    });
    setSelectedDetailTicket(null);
    reloadAll();
    showToast(res.message);
  };

  // Delete Ticket from Detail Modal
  const handleDeleteTicketFromDetail = (ticket: RegrindWorkTicket) => {
    const res = regrindService.deleteQueueTicket(ticket.id);
    setSelectedDetailTicket(null);
    reloadAll();
    showToast(res.message);
  };

  // Build Calendar Grid for (calYear, calMonth)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calYear, calMonth - 1, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();

    const cells: Array<{
      dateStr: string | null;
      dayNumber: number | null;
      isToday: boolean;
      isSelected: boolean;
      jobs: RegrindWorkTicket[];
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateStr: null, dayNumber: null, isToday: false, isSelected: false, jobs: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayJobs = tickets
        .filter(t => {
          if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
          const tDate = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
          return tDate === dateStr;
        })
        .sort((a, b) => {
          const aEmg = a.isEmergency || a.urgency === 'EMERGENCY' ? 0 : 1;
          const bEmg = b.isEmergency || b.urgency === 'EMERGENCY' ? 0 : 1;
          if (aEmg !== bEmg) return aEmg - bEmg;
          return (a.queueOrder ?? a.sequenceInDate ?? 999) - (b.queueOrder ?? b.sequenceInDate ?? 999);
        });

      cells.push({
        dateStr,
        dayNumber: d,
        isToday: dateStr === todayIsoStr,
        isSelected: dateStr === selectedCalendarDate,
        jobs: dayJobs
      });
    }

    return cells;
  }, [calYear, calMonth, tickets, selectedLineFilter, todayIsoStr, selectedCalendarDate]);

  // All tickets on modal date
  const ticketsOnModalDate = useMemo(() => {
    return tickets
      .filter(t => {
        const d = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        return d === modalDateStr;
      })
      .sort((a, b) => (a.queueOrder ?? 999) - (b.queueOrder ?? 999));
  }, [tickets, modalDateStr]);

  const ticketsOnDetailDate = useMemo(() => {
    if (!selectedDetailTicket) return [];
    const targetDate =
      selectedDetailTicket.scheduledDate ||
      (selectedDetailTicket.targetCompletionDate ? selectedDetailTicket.targetCompletionDate.slice(0, 10) : '');
    if (!targetDate) return [selectedDetailTicket];
    return tickets
      .filter(t => {
        const d = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        return d === targetDate;
      })
      .sort((a, b) => (a.queueOrder ?? 999) - (b.queueOrder ?? 999));
  }, [tickets, selectedDetailTicket]);

  // Drag-and-Drop Handlers for Calendar & Queue
  const handleDragStartTicket = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnCalendarCell = (e: React.DragEvent, targetDateStr: string, targetIndexInDate?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = draggedTicketId || e.dataTransfer.getData('text/plain');
    setDragOverDateStr(null);
    setDraggedTicketId(null);

    if (!ticketId || !targetDateStr) return;

    if (targetDateStr < todayIsoStr) {
      showToast(`⚠️ ไม่อนุญาตให้ย้ายคิวงานไปลงวันที่ย้อนหลัง (${targetDateStr})`);
      return;
    }

    const res = regrindService.moveTicketToCalendarDate(ticketId, targetDateStr, targetIndexInDate);
    reloadAll();
    showToast(res.message);
  };

  const handleDropOnQueueRow = (e: React.DragEvent, targetOrder: number) => {
    e.preventDefault();
    const ticketId = draggedTicketId || e.dataTransfer.getData('text/plain');
    setDragOverQueueOrder(null);
    setDraggedTicketId(null);

    if (!ticketId) return;
    const res = regrindService.reorderQueueTicket(ticketId, targetOrder);
    reloadAll();
    showToast(res.message);
  };

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    const cur = new Date();
    setCalYear(cur.getFullYear());
    setCalMonth(cur.getMonth() + 1);
    setSelectedCalendarDate(todayIsoStr);
  };

  const emergencyCount = allActiveQueue.filter(t => t.isEmergency || t.urgency === 'EMERGENCY').length;
  const shiftedCount = allActiveQueue.filter(t => (t.shiftedCount || 0) > 0).length;
  const pausedCount = allActiveQueue.filter(t => t.status === 'PAUSED').length;

  return (
    <div className="space-y-3.5 font-sans text-white select-none">
      {/* Toast Feedback Banner */}
      {bannerMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-slate-950/95 border border-cyan-400 text-cyan-200 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-mono max-w-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-[#0c1018]/95 border border-white/15 rounded-2xl p-3.5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-wide">
              ระบบจัดลำดับคิวเจียร & ปฏิทินตารางคิว (Smart Queue Schedule)
            </h1>
            <p className="text-[11px] text-slate-400">
              คลิกช่องวันที่ในปฏิทินเพื่อดูคิวของวันนั้น • ลากเส้นคั่นเพื่อปรับขนาดกรอบซ้าย-ขวาได้อิสระ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Line Filter */}
          <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedLineFilter('ALL')}
              className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-colors ${
                selectedLineFilter === 'ALL' ? 'bg-cyan-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              ทุกไลน์
            </button>
            {LINES_LIST.map(lineId => (
              <button
                key={lineId}
                type="button"
                onClick={() => setSelectedLineFilter(lineId === selectedLineFilter ? 'ALL' : lineId)}
                className={`px-1.5 py-0.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  selectedLineFilter === lineId ? 'bg-cyan-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lineId}
              </button>
            ))}
          </div>

          {/* Free Split Slider Control */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-xl font-mono text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">สัดส่วนกรอบ:</span>
            <input
              type="range"
              min={20}
              max={75}
              step={1}
              value={leftSplitPercent}
              onChange={e => setLeftSplitPercent(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title="เลื่อนสไลด์เพื่อปรับขนาดระยะกรอบซ้าย-ขวาได้อิสระ"
            />
            <span className="text-cyan-300 font-bold min-w-[66px] text-center">
              {leftSplitPercent}% : {100 - leftSplitPercent}%
            </span>
          </div>

          {/* Emergency Insert Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateForDate(selectedCalendarDate || todayIsoStr, true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ แทรกคิวด่วน (#1)</span>
          </button>

          {/* Normal Queue Add Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateForDate(selectedCalendarDate || todayIsoStr, false)}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มคิวปกติ</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-sans text-[11px]">คิวงานเจียรทั้งหมด</span>
            <strong className="text-lg text-white font-black">{allActiveQueue.length} คิว</strong>
          </div>
          <Wrench className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="bg-[#0c1018]/90 border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-rose-300 block font-sans text-[11px]">คิวด่วนแทรก (Emergency #1)</span>
            <strong className="text-lg text-rose-400 font-black">{emergencyCount} งาน</strong>
          </div>
          <Flame className="w-4 h-4 text-rose-400" />
        </div>

        <div className="bg-[#0c1018]/90 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-amber-300 block font-sans text-[11px]">คิวเดิมที่ถูกเลื่อนลำดับลง</span>
            <strong className="text-lg text-amber-300 font-black">{shiftedCount} งาน</strong>
          </div>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>

        <div className="bg-[#0c1018]/90 border border-purple-500/30 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-purple-300 block font-sans text-[11px]">งานที่พักชั่วคราว (Paused)</span>
            <strong className="text-lg text-purple-300 font-black">{pausedCount} งาน</strong>
          </div>
          <RotateCcw className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* Main Workspace Column Layout (Freely Resizable Split View) */}
      <div
        ref={workspaceRef}
        className="flex flex-col xl:flex-row items-stretch gap-2 relative"
      >
        {/* =================================================================== */}
        {/* LEFT COLUMN: LIVE QUEUE SEQUENCE / SELECTED DATE QUEUE VIEW         */}
        {/* =================================================================== */}
        <div
          style={{ flexBasis: `${leftSplitPercent}%` }}
          className="w-full xl:shrink-0 bg-[#0c1018]/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl space-y-2.5 flex flex-col min-w-[260px] transition-[flex-basis] duration-75"
        >
          {/* Left Panel Header with Date Sync Information & Reset Button */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                <h2 className="text-xs sm:text-sm font-black text-white truncate">
                  {selectedCalendarDate ? (
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
                      <span>คิวงานวันที่ {selectedCalendarDate}</span>
                    </span>
                  ) : (
                    'ลำดับคิวงานเจียรปัจจุบัน (Queue Sequence)'
                  )}
                </h2>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                {selectedCalendarDate
                  ? `แสดง ${displayedQueue.length} คิวของวันที่เลือก • ลากสลับหรือกด "ดันขึ้นคิวด่วน #1"`
                  : `เรียงตามลำดับ #1 → #${displayedQueue.length} • คลิกที่คิวเพื่อดูสเปก`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedCalendarDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/30 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                  title="ดูคิวงานทั้งหมดทุกวัน"
                >
                  <X className="w-3 h-3" />
                  <span>ดูคิวทั้งหมด</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-white/5">
                  {displayedQueue.length} คิว
                </span>
              )}
            </div>
          </div>

          {/* Queue Cards List */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar flex-1">
            {displayedQueue.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-white/10 rounded-xl text-xs space-y-2">
                <p>
                  {selectedCalendarDate
                    ? `ไม่มีคิวงานเจียรในวันที่ ${selectedCalendarDate}`
                    : 'ไม่มีคิวงานในสายการผลิตที่เลือก'}
                </p>
                {selectedCalendarDate && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateForDate(selectedCalendarDate, false)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มคิวในวันที่ {selectedCalendarDate}</span>
                  </button>
                )}
              </div>
            ) : (
              displayedQueue.map((ticket, index) => {
                const orderNum = ticket.queueOrder ?? index + 1;
                const isEmg = Boolean(ticket.isEmergency || ticket.urgency === 'EMERGENCY');
                const wasShifted = (ticket.shiftedCount || 0) > 0 && !isEmg;
                const isPaused = ticket.status === 'PAUSED';
                const isInProcess = ticket.status === 'IN_PROCESS';

                return (
                  <div
                    key={ticket.id}
                    draggable
                    onClick={() => setSelectedDetailTicket(ticket)}
                    onDragStart={e => handleDragStartTicket(e, ticket.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOverQueueOrder(orderNum);
                    }}
                    onDragLeave={() => setDragOverQueueOrder(null)}
                    onDrop={e => handleDropOnQueueRow(e, orderNum)}
                    className={`rounded-xl p-2.5 border transition-all cursor-pointer ${
                      dragOverQueueOrder === orderNum
                        ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01]'
                        : isEmg
                        ? 'bg-rose-950/35 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.18)] hover:border-rose-400'
                        : isPaused
                        ? 'bg-purple-950/30 border-purple-500/40 hover:border-purple-400'
                        : isInProcess
                        ? 'bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400'
                        : 'bg-slate-950/70 border-white/10 hover:border-cyan-400/50'
                    }`}
                  >
                    {/* Top Row: Badge + Part info + Up/Down */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div
                          className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs flex items-center gap-1 shrink-0 ${
                            isEmg
                              ? 'bg-rose-600 text-white'
                              : isInProcess
                              ? 'bg-cyan-400 text-slate-950'
                              : isPaused
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          <GripVertical className="w-3 h-3 opacity-70" />
                          <span>#{orderNum}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">
                              {ticket.partName}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-cyan-300 shrink-0">
                              · LINE {ticket.lineId}
                            </span>
                            {isEmg && (
                              <span className="text-[10px] font-bold text-rose-400 font-mono shrink-0">
                                · 🚨 ด่วน #1
                              </span>
                            )}
                          </div>

                          <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                            <span>{ticket.jobCode}</span>
                            <span>·</span>
                            <span>{ticket.scheduledDate || ticket.targetCompletionDate?.slice(0, 10)}</span>
                            <span>·</span>
                            <span
                              className={
                                isInProcess
                                  ? 'text-cyan-300 font-bold'
                                  : isPaused
                                  ? 'text-purple-300 font-bold'
                                  : 'text-amber-300'
                              }
                            >
                              {isInProcess ? 'กำลังเจียร' : isPaused ? 'พักชั่วคราว' : 'รอคิว'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailTicket(ticket)}
                          className="p-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(ticket.id, orderNum - 1)}
                          className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.14] disabled:opacity-30 text-slate-300 cursor-pointer"
                          title="ขยับคิวขึ้น"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === displayedQueue.length - 1}
                          onClick={() => handleMoveOrder(ticket.id, orderNum + 1)}
                          className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.14] disabled:opacity-30 text-slate-300 cursor-pointer"
                          title="ขยับคิวลง"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Preemption Notice */}
                    {wasShifted && (
                      <div className="mt-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200 flex items-center justify-between gap-1">
                        <span>↪️ เลื่อนจาก คิว #{ticket.originalQueueOrder ?? orderNum - 1} &rarr; #{orderNum}</span>
                        {ticket.preemptedByJobCode && <span className="font-mono text-[9.5px]">โดย {ticket.preemptedByJobCode}</span>}
                      </div>
                    )}

                    {/* Bottom Action Strip */}
                    <div
                      className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 flex-wrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-[10.5px] text-slate-400 truncate">
                        ช่าง: {ticket.assignedTechnician || 'Thanakorn Phonpayung'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrPromoteTicket(ticket, isEmg)}
                          className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-slate-200 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-cyan-400" />
                          <span>แก้ไข</span>
                        </button>

                        {!isEmg && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrPromoteTicket(ticket, true)}
                            className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Flame className="w-2.5 h-2.5 text-rose-400" />
                            <span>ดันคิวด่วน #1</span>
                          </button>
                        )}

                        {ticket.status !== 'IN_PROCESS' && (
                          <button
                            type="button"
                            onClick={() => handleStartOrResume(ticket)}
                            className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>{isPaused ? 'ทำต่อ' : 'เริ่มเจียร'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* INTERACTIVE DRAG SPLITTER HANDLE (LEFT / RIGHT FREE RESIZE)          */}
        {/* =================================================================== */}
        <div
          onMouseDown={handleStartSplitterDrag}
          className={`hidden xl:flex flex-col items-center justify-center w-3 cursor-col-resize select-none rounded-xl transition-all group ${
            isDraggingSplitter
              ? 'bg-cyan-500/30 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
              : 'bg-white/[0.03] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50'
          }`}
          title="คลิกค้างแล้วลากซ้าย-ขวา เพื่อปรับขนาดกรอบคิวและปฏิทินได้อิสระ"
        >
          <div className="w-1 h-12 rounded-full bg-slate-600 group-hover:bg-cyan-400 transition-colors" />
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: CALENDAR SCHEDULE GRID                                 */}
        {/* =================================================================== */}
        <div className="w-full flex-1 bg-[#0c1018]/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl space-y-2.5 min-w-[320px]">
          {/* Calendar Header & Month Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>ปฏิทินตารางคิวงานเจียร (คลิกช่องวันที่เพื่อแสดงคิวในกรอบซ้าย)</span>
              </h2>
              <p className="text-[10.5px] text-slate-400">
                คลิกที่วันที่เพื่อเลือกดูคิว หรือกดปุ่ม <strong className="text-cyan-300">+ เพิ่ม</strong> เพื่อลงบันทึกงานใหม่
              </p>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 cursor-pointer"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 font-bold text-cyan-300 min-w-[125px] text-center text-xs">
                {isTh ? THAI_MONTHS[calMonth - 1] : ENGLISH_MONTHS[calMonth - 1]} {calYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 cursor-pointer"
                title={isTh ? "เดือนถัดไป" : "Next month"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold cursor-pointer text-xs"
              >
                {isTh ? "วันนี้" : "Today"}
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold">
            {(isTh ? WEEKDAYS_TH : WEEKDAYS_EN).map((dayLabel, i) => {
              const isSun = i === 0;
              const isSat = i === 6;
              return (
                <div
                  key={dayLabel}
                  className={`py-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                    isSun
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-sm'
                      : isSat
                      ? 'bg-violet-950/60 border-violet-500/40 text-violet-300 shadow-sm'
                      : 'bg-slate-950/70 border-white/10 text-slate-300'
                  }`}
                >
                  <span>{dayLabel}</span>
                  {(isSun || isSat) && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 font-sans font-bold">
                      หยุด
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const colIdx = idx % 7;
              const isSunday = colIdx === 0;
              const isSaturday = colIdx === 6;
              const isWeekend = isSunday || isSaturday;

              if (!cell.dateStr || cell.dayNumber === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className={`min-h-[105px] rounded-xl border ${
                      isSunday
                        ? 'bg-rose-950/15 border-rose-500/10'
                        : isSaturday
                        ? 'bg-violet-950/15 border-violet-500/10'
                        : 'bg-slate-950/20 border-white/[0.03]'
                    }`}
                  />
                );
              }

              const isDragTarget = dragOverDateStr === cell.dateStr;
              const isPast = cell.dateStr < todayIsoStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    setSelectedCalendarDate(cell.dateStr === selectedCalendarDate ? null : cell.dateStr);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverDateStr(cell.dateStr);
                  }}
                  onDragLeave={() => setDragOverDateStr(null)}
                  onDrop={e => handleDropOnCalendarCell(e, cell.dateStr!)}
                  className={`min-h-[105px] rounded-xl p-1.5 border transition-all flex flex-col justify-between cursor-pointer group ${
                    isDragTarget
                      ? 'border-cyan-400 bg-cyan-500/15 ring-2 ring-cyan-400/40'
                      : cell.isSelected
                      ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : cell.isToday
                      ? 'bg-cyan-950/25 border-cyan-500/60'
                      : isSunday
                      ? isPast
                        ? 'bg-rose-950/25 border-rose-500/20 opacity-85 hover:opacity-100 hover:border-rose-400/50 hover:bg-rose-950/40'
                        : 'bg-rose-950/35 border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-950/50'
                      : isSaturday
                      ? isPast
                        ? 'bg-violet-950/25 border-violet-500/20 opacity-85 hover:opacity-100 hover:border-violet-400/50 hover:bg-violet-950/40'
                        : 'bg-violet-950/35 border-violet-500/30 hover:border-violet-400/60 hover:bg-violet-950/50'
                      : isPast
                      ? 'bg-slate-950/40 border-white/5 opacity-75 hover:opacity-100 hover:border-white/20'
                      : 'bg-slate-950/60 border-white/10 hover:border-white/25 hover:bg-slate-900/70'
                  }`}
                >
                  {/* Top of Day Cell */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                          cell.isSelected
                            ? 'bg-cyan-400 text-slate-950 font-black'
                            : cell.isToday
                            ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40'
                            : isSunday
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isSaturday
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isWeekend && cell.jobs.length === 0 && (
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                            isSunday
                              ? 'bg-rose-500/15 text-rose-300/90'
                              : 'bg-violet-500/15 text-violet-300/90'
                          }`}
                        >
                          วันหยุด
                        </span>
                      )}
                      {cell.jobs.length > 0 && (
                        <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-white/10 text-cyan-300 font-bold">
                          {cell.jobs.length} คิว
                        </span>
                      )}
                    </div>

                    {!isPast && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenCreateForDate(cell.dateStr!, false);
                        }}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[9.5px] font-bold transition-opacity cursor-pointer"
                        title={`เพิ่มคิวงานวันที่ ${cell.dateStr}`}
                      >
                        + เพิ่ม
                      </button>
                    )}
                  </div>

                  {/* Clickable & Draggable Job Items inside this Date Cell */}
                  <div className="space-y-1 flex-1">
                    {cell.jobs.map((job, jIdx) => {
                      const isEmg = Boolean(job.isEmergency || job.urgency === 'EMERGENCY');
                      const isDone = job.status === 'READY';
                      const isScrap = job.status === 'SCRAP';

                      return (
                        <div
                          key={job.id}
                          draggable
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDetailTicket(job);
                          }}
                          onDragStart={e => handleDragStartTicket(e, job.id)}
                          onDrop={e => handleDropOnCalendarCell(e, cell.dateStr!, jIdx)}
                          className={`p-1 rounded border text-[10px] leading-tight cursor-pointer transition-all hover:scale-[1.02] hover:ring-1 hover:ring-cyan-400 ${
                            isEmg
                              ? 'bg-rose-950/85 border-rose-500/70 text-rose-100 shadow-sm'
                              : isDone
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                              : isScrap
                              ? 'bg-slate-900 border-rose-500/30 text-rose-300 line-through'
                              : 'bg-slate-900/95 border-cyan-500/35 text-slate-100 hover:border-cyan-400'
                          }`}
                          title={`คลิกดูรายละเอียด: ${job.jobCode} • ${job.partName} (LINE ${job.lineId})`}
                        >
                          <div className="flex items-center justify-between gap-1 font-mono font-bold">
                            <span className="truncate">
                              {job.queueOrder ? `#${job.queueOrder}` : `#${jIdx + 1}`} {job.lineId}
                            </span>
                            {!isEmg && !isDone && !isScrap && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenEditOrPromoteTicket(job, true);
                                }}
                                className="text-rose-400 hover:text-rose-200 cursor-pointer"
                                title="ดันขึ้นเป็นคิวด่วน #1"
                              >
                                🚨
                              </button>
                            )}
                            {isEmg && <span>🚨</span>}
                          </div>
                          <div className="truncate font-sans font-semibold mt-0.5">
                            {job.partName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* UNIFIED REGRIND JOB ENTRY / EDIT / EMERGENCY MODAL                    */}
      {/* ===================================================================== */}
      <UnifiedRegrindJobModal
        isOpen={isUnifiedModalOpen}
        onClose={() => {
          setIsUnifiedModalOpen(false);
          setEditingTicket(null);
        }}
        onSaved={msg => {
          reloadAll();
          showToast(msg);
        }}
        initialDateStr={modalDateStr}
        initialLineId={modalLineId}
        initialIsEmergency={modalIsEmergency}
        existingTicket={editingTicket}
        dayExistingTickets={ticketsOnModalDate}
        onSelectExistingTicket={t => {
          setIsUnifiedModalOpen(false);
          setEditingTicket(null);
          setSelectedDetailTicket(t);
        }}
      />

      {/* ===================================================================== */}
      {/* CLICKED QUEUE ITEM DETAIL MODAL                                       */}
      {/* ===================================================================== */}
      <QueueTicketDetailModal
        ticket={selectedDetailTicket}
        sameDayTickets={ticketsOnDetailDate}
        onSelectTicket={t => setSelectedDetailTicket(t)}
        onClose={() => setSelectedDetailTicket(null)}
        onStartOrResume={handleStartOrResume}
        onEditTicket={(t, defaultEmg) => handleOpenEditOrPromoteTicket(t, defaultEmg)}
        onCompleteTicket={handleCompleteTicketFromDetail}
        onDeleteTicket={handleDeleteTicketFromDetail}
      />
    </div>
  );
};
