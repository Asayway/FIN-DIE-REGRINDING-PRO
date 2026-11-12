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
  CalendarDays,
  AlertTriangle
} from 'lucide-react';
import { ProductionLineId } from '../../types';
import { RegrindWorkTicket } from '../../types/regrind';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { safeStorage } from '../../services/safeStorage';
import { useLanguage } from '../../i18n';
import { UnifiedRegrindJobModal } from '../../components/modals/UnifiedRegrindJobModal';
import { QueueTicketDetailModal } from '../../components/modals/QueueTicketDetailModal';
import { JobCompletionConfirmModal } from '../../components/modals/JobCompletionConfirmModal';
import { getUnifiedStatusMeta, resolveUnifiedStatusKey, CanonicalStatusKey } from '../../utils/statusHelper';
import { MoldSurfaceGrinderAnimation } from '../../components/animations/MoldSurfaceGrinderAnimation';

export const getTicketStatusMeta = (ticket: RegrindWorkTicket) => {
  return getUnifiedStatusMeta(ticket);
};

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
  const [confirmingCompletionTicket, setConfirmingCompletionTicket] = useState<RegrindWorkTicket | null>(null);

  // Resizable Left/Right Split Ratio State (15% to 75%, default 20%)
  const [leftSplitPercent, setLeftSplitPercent] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('smart_queue_split_percent');
      return saved ? Number(saved) : 20;
    } catch {
      return 20;
    }
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Collapsible Queue Sequence Sidebar State
  const [isQueueCollapsed, setIsQueueCollapsed] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('smart_queue_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleQueueCollapse = () => {
    setIsQueueCollapsed(prev => {
      const next = !prev;
      try {
        safeStorage.setItem('smart_queue_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Status Filter for Queue & Schedule: All or 6 Canonical States
  const [statusFilter, setStatusFilter] = useState<CanonicalStatusKey | 'ALL'>('ALL');

  const handleStartSplitterDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const pct = Math.round((relativeX / Math.max(rect.width, 1)) * 100);
      const clamped = Math.max(15, Math.min(75, pct));
      setLeftSplitPercent(clamped);
      try {
        safeStorage.setItem('smart_queue_split_percent', String(clamped));
      } catch (_) {}
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

  // Accurate counts across all Canonical Statuses
  const statusCounts = useMemo(() => {
    const list = selectedLineFilter === 'ALL' ? tickets : tickets.filter(t => t.lineId === selectedLineFilter);
    const counts = {
      all: list.length,
      emergency: 0,
      inProcess: 0,
      waiting: 0,
      postponed: 0,
      ready: 0,
      completed: 0,
      scrap: 0
    };

    list.forEach(t => {
      const k = resolveUnifiedStatusKey(t);
      if (k === 'EMERGENCY') counts.emergency++;
      else if (k === 'IN_PROCESS') counts.inProcess++;
      else if (k === 'WAITING') counts.waiting++;
      else if (k === 'POSTPONED') counts.postponed++;
      else if (k === 'READY') counts.ready++;
      else if (k === 'COMPLETED') counts.completed++;
      else if (k === 'SCRAP') counts.scrap++;
    });

    return counts;
  }, [tickets, selectedLineFilter]);

  // Active Sorted Queue (All: Emergency, In Process, Waiting, Postponed)
  const allActiveQueue = useMemo(() => {
    return tickets
      .filter(t => {
        const k = resolveUnifiedStatusKey(t);
        const isActive = k === 'EMERGENCY' || k === 'IN_PROCESS' || k === 'WAITING' || k === 'POSTPONED';
        if (!isActive) return false;
        if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
        return true;
      })
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));
  }, [tickets, selectedLineFilter]);

  // Active Displayed Queue (filtered by selectedCalendarDate and statusFilter)
  const displayedQueue = useMemo(() => {
    let list = tickets.filter(t => {
      if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
      if (selectedCalendarDate) {
        const tDate = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        if (tDate !== selectedCalendarDate) return false;
      }
      return true;
    });

    if (statusFilter !== 'ALL') {
      list = list.filter(t => resolveUnifiedStatusKey(t) === statusFilter);
    }

    return list.sort((a, b) => {
      const aKey = resolveUnifiedStatusKey(a);
      const bKey = resolveUnifiedStatusKey(b);
      const aEmg = aKey === 'EMERGENCY' ? 0 : 1;
      const bEmg = bKey === 'EMERGENCY' ? 0 : 1;
      if (aEmg !== bEmg) return aEmg - bEmg;

      const getStatusRank = (st: string, shifted?: number) => {
        if (st === 'IN_PROCESS') return 1;
        if (st === 'PAUSED') return 2;
        if (st === 'PENDING') return 3;
        if (st === 'POSTPONED' || (shifted || 0) > 0) return 4;
        if (st === 'READY') return 5;
        if (st === 'COMPLETED') return 6;
        if (st === 'CANCELLED' || st === 'SCRAP') return 7;
        return 8;
      };

      const rankA = getStatusRank(a.status, a.shiftedCount);
      const rankB = getStatusRank(b.status, b.shiftedCount);
      if (rankA !== rankB) return rankA - rankB;

      return (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999);
    });
  }, [tickets, selectedCalendarDate, selectedLineFilter, statusFilter]);

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

  // Complete Grinding directly via mandatory QC Confirmation Modal
  const handleCompleteTicketFromDetail = (ticket: RegrindWorkTicket) => {
    setSelectedDetailTicket(null);
    setConfirmingCompletionTicket(ticket);
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
      postponedOriginJobs: RegrindWorkTicket[];
      postponedSpanJobs: RegrindWorkTicket[];
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateStr: null, dayNumber: null, isToday: false, isSelected: false, jobs: [], postponedOriginJobs: [], postponedSpanJobs: [] });
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

      // Find jobs that have an ACTIVE postponement span crossing this date
      // (Once a postponed job is marked READY, COMPLETED, or SCRAP, its origin & span bars on past dates disappear automatically)
      const postponedOriginJobs = tickets.filter(t => {
        if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
        const isFinished = t.status === 'READY' || t.status === 'COMPLETED' || t.status === 'SCRAP' || t.status === 'CANCELLED';
        if (isFinished) return false;

        const origin = t.shiftedFromDate;
        const dest = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        return Boolean(origin && dest && origin < dest && origin === dateStr);
      });

      const postponedSpanJobs = tickets.filter(t => {
        if (selectedLineFilter !== 'ALL' && t.lineId !== selectedLineFilter) return false;
        const isFinished = t.status === 'READY' || t.status === 'COMPLETED' || t.status === 'SCRAP' || t.status === 'CANCELLED';
        if (isFinished) return false;

        const origin = t.shiftedFromDate;
        const dest = t.scheduledDate || (t.targetCompletionDate ? t.targetCompletionDate.slice(0, 10) : '');
        return Boolean(origin && dest && origin < dest && origin < dateStr && dateStr < dest);
      });

      cells.push({
        dateStr,
        dayNumber: d,
        isToday: dateStr === todayIsoStr,
        isSelected: dateStr === selectedCalendarDate,
        jobs: dayJobs,
        postponedOriginJobs,
        postponedSpanJobs
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

  const totalSystemTicketsCount = statusCounts.all;
  const emergencyCount = statusCounts.emergency;
  const shiftedCount = statusCounts.postponed;
  const pausedCount = tickets.filter(t => t.status === 'PAUSED').length;

  return (
    <div className="space-y-2 font-sans text-white select-none">
      {/* Toast Feedback Banner */}
      {bannerMessage && (
        <div className="fixed top-5 right-5 z-50 p-3 bg-slate-950/95 border border-cyan-400 text-cyan-200 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-mono max-w-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-[#0c1018]/95 border border-white/15 rounded-2xl p-2 sm:p-2.5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wide">
              ระบบจัดลำดับคิวเจียร & ปฏิทินตารางคิว (Smart Queue Schedule)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Toggle Queue Sidebar Button */}
          <button
            type="button"
            onClick={toggleQueueCollapse}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
              isQueueCollapsed
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-white/[0.04] text-slate-300 border-white/10 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={isQueueCollapsed ? "คลิกเพื่อแสดงแถบลำดับคิว (Show Queue)" : "คลิกเพื่อย่อซ่อนแถบลำดับคิวไปด้านข้าง (Hide Queue)"}
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{isQueueCollapsed ? 'แสดงลำดับคิว' : 'ย่อซ่อนลำดับคิว'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-mono">
              {displayedQueue.length}
            </span>
          </button>

          {/* Line Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-black/40 border border-white/10 rounded-xl font-mono text-[11px]">
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

          {/* Free Split Slider Control (Default 20%) - shown only when queue is expanded */}
          {!isQueueCollapsed && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 bg-black/40 border border-white/10 rounded-xl font-mono text-[11px]">
              <SlidersHorizontal className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-slate-400 text-[10px]">สัดส่วน:</span>
              <input
                type="range"
                min={15}
                max={75}
                step={1}
                value={leftSplitPercent}
                onChange={e => {
                  const val = Number(e.target.value);
                  setLeftSplitPercent(val);
                  try {
                    safeStorage.setItem('smart_queue_split_percent', String(val));
                  } catch (_) {}
                }}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                title="เลื่อนสไลด์เพื่อปรับขนาดระยะกรอบซ้าย-ขวาได้อิสระ (ค่าเริ่มต้น 20%)"
              />
              <span className="text-cyan-300 font-bold min-w-[55px] text-center text-[10px]">
                {leftSplitPercent}% : {100 - leftSplitPercent}%
              </span>
              {leftSplitPercent !== 20 && (
                <button
                  type="button"
                  onClick={() => {
                    setLeftSplitPercent(20);
                    try {
                      safeStorage.setItem('smart_queue_split_percent', '20');
                    } catch (_) {}
                  }}
                  className="text-[9px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer shrink-0"
                  title="คืนค่าสัดส่วนเป็น 20% (ค่าเริ่มต้น)"
                >
                  20% เริ่มต้น
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Strip (4 Main Operational Pillars - Compact Fit) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
        <div className="bg-[#0c1018]/90 border border-cyan-500/30 rounded-xl p-2 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block font-sans text-[10px]">คิวงานเจียรทั้งหมด (ทุกสถานะ)</span>
            <strong className="text-base text-white font-black">{statusCounts.all} คิว</strong>
          </div>
          <Wrench className="w-3.5 h-3.5 text-cyan-400" />
        </div>

        <div className="bg-[#0c1018]/90 border border-purple-500/40 rounded-xl p-2 flex items-center justify-between">
          <div>
            <span className="text-purple-300 block font-sans text-[10px]">งานกำลังเจียร (In-Process)</span>
            <strong className="text-base text-purple-300 font-black">{statusCounts.inProcess} งาน</strong>
          </div>
          <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
        </div>

        <div className="bg-[#0c1018]/90 border border-emerald-500/40 rounded-xl p-2 flex items-center justify-between">
          <div>
            <span className="text-emerald-300 block font-sans text-[10px]">งานเจียรเสร็จแล้ว & QC ผ่าน</span>
            <strong className="text-base text-emerald-300 font-black">{statusCounts.ready + statusCounts.completed} งาน</strong>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        <div className="bg-[#0c1018]/90 border border-rose-500/40 rounded-xl p-2 flex items-center justify-between">
          <div>
            <span className="text-rose-300 block font-sans text-[10px]">งานยกเลิก / คัดทิ้ง (Scrap)</span>
            <strong className="text-base text-rose-400 font-black">{statusCounts.scrap} งาน</strong>
          </div>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
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
        {isQueueCollapsed ? (
          <div
            onClick={toggleQueueCollapse}
            className="w-12 xl:shrink-0 bg-[#0c1018]/95 border border-white/15 hover:border-cyan-500/40 rounded-2xl p-2 shadow-2xl flex flex-col items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-all select-none group min-h-[420px] py-4"
            title="คลิกเพื่อขยายแถบลำดับคิว (Expand Queue Sequence)"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleQueueCollapse();
              }}
              className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500/30 transition-colors cursor-pointer"
              title="ขยายแถบลำดับคิว"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center gap-2 [writing-mode:vertical-rl] rotate-180 text-xs font-bold text-slate-300 group-hover:text-cyan-300 tracking-wider">
              <span>ลำดับคิวงานเจียร</span>
              <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 not-[writing-mode] rotate-180 font-bold">
                {displayedQueue.length}
              </span>
            </div>

            <div className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 group-hover:text-cyan-400 group-hover:bg-white/[0.08] transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        ) : (
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

                {/* Collapse to side button */}
                <button
                  type="button"
                  onClick={toggleQueueCollapse}
                  className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="ย่อซ่อนแถบลำดับคิวไปด้านข้าง (Collapse Queue to Side)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Status Filter Tabs Bar (6 Canonical Operational States) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs custom-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              ทั้งหมด ({statusCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'EMERGENCY' ? 'ALL' : 'EMERGENCY')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'EMERGENCY'
                  ? 'bg-rose-600 text-white border border-rose-400 shadow-sm ring-1 ring-rose-400/50'
                  : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border border-rose-500/20'
              }`}
            >
              <span>🚨 งานด่วน #1</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-rose-900/60 font-mono">
                {statusCounts.emergency}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'IN_PROCESS' ? 'ALL' : 'IN_PROCESS')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'IN_PROCESS'
                  ? 'bg-purple-600 text-white border border-purple-400 shadow-md font-black animate-pulse'
                  : 'bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border border-purple-500/20'
              }`}
            >
              <span>⚡ กำลังเจียร</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-purple-900/60 font-mono text-purple-200">
                {statusCounts.inProcess}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'WAITING' ? 'ALL' : 'WAITING')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'WAITING'
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-400 shadow-sm font-bold'
                  : 'bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-500/20'
              }`}
            >
              <span>⏳ รอคิวเจียร</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-cyan-900/60 font-mono">
                {statusCounts.waiting}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'POSTPONED' ? 'ALL' : 'POSTPONED')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'POSTPONED'
                  ? 'bg-amber-500 text-slate-950 border border-amber-300 shadow-sm font-black'
                  : 'bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 border border-amber-500/20'
              }`}
            >
              <span>🟡 งานเลื่อน</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-900/60 font-mono">
                {statusCounts.postponed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'READY' ? 'ALL' : 'READY')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'READY'
                  ? 'bg-sky-500 text-white border border-sky-300 shadow-sm font-black'
                  : 'bg-sky-950/30 text-sky-300 hover:bg-sky-900/40 border border-sky-400/20'
              }`}
            >
              <span>🔵 เจียรเสร็จแล้ว</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-sky-900/60 font-mono">
                {statusCounts.ready}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-sm font-black'
                  : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/20'
              }`}
            >
              <span>🟢 งานเสร็จสมบูรณ์</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-900/60 font-mono">
                {statusCounts.completed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'SCRAP' ? 'ALL' : 'SCRAP')}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'SCRAP'
                  ? 'bg-rose-950 text-rose-200 border border-rose-500 shadow-sm font-bold'
                  : 'bg-white/[0.04] text-slate-400 hover:text-rose-300 border border-white/5'
              }`}
            >
              <span>❌ คัดทิ้ง (ครบลิมิต)</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-white/10 font-mono">
                {statusCounts.scrap}
              </span>
            </button>
          </div>

          {/* Queue Cards List */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar flex-1">
            {displayedQueue.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-white/10 rounded-xl text-xs space-y-2">
                <p>
                  {selectedCalendarDate
                    ? `ไม่มีคิวงานที่ตรงกับสถานะในวันที่ ${selectedCalendarDate}`
                    : 'ไม่มีคิวงานที่ตรงกับสถานะหรือสายการผลิตที่เลือก'}
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
                const meta = getTicketStatusMeta(ticket);

                return (
                  <div
                    key={`${ticket.id}-${index}`}
                    draggable
                    onClick={() => setSelectedDetailTicket(ticket)}
                    onDragStart={e => handleDragStartTicket(e, ticket.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOverQueueOrder(orderNum);
                    }}
                    onDragLeave={() => setDragOverQueueOrder(null)}
                    onDrop={e => handleDropOnQueueRow(e, orderNum)}
                    className={`rounded-xl p-2.5 border transition-all cursor-pointer relative overflow-hidden ${
                      dragOverQueueOrder === orderNum
                        ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01]'
                        : meta.cardClass
                    }`}
                  >
                    {/* Left Accent Color Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.leftBar}`} />

                    {/* Top Row: Badge + Part info + Up/Down */}
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div
                          className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs flex items-center gap-1 shrink-0 ${meta.badgeClass}`}
                        >
                          <GripVertical className="w-3 h-3 opacity-70" />
                          <span>#{orderNum}</span>
                          <span>{meta.icon}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">
                              {ticket.partName}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-cyan-300 shrink-0">
                              · LINE {ticket.lineId}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${meta.pillClass}`}>
                              {meta.label}
                            </span>
                          </div>

                          <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <span className="text-cyan-300 font-bold">{ticket.jobCode}</span>
                            <span>·</span>
                            <span>{ticket.scheduledDate || ticket.targetCompletionDate?.slice(0, 10)}</span>
                            <span>·</span>
                            <span className="text-slate-300 font-medium">
                              {ticket.status === 'COMPLETED'
                                ? '✅ ปิดงานเสร็จ'
                                : ticket.status === 'READY'
                                ? '🔵 เจียรเสร็จพร้อมใช้'
                                : ticket.status === 'POSTPONED'
                                ? '🟡 เลื่อนกำหนดการ'
                                : ticket.status === 'CANCELLED' || ticket.status === 'SCRAP'
                                ? '❌ ยกเลิก/คัดทิ้ง'
                                : ticket.status === 'IN_PROCESS'
                                ? '⚡ กำลังเจียร (In-Process)'
                                : ticket.status === 'PAUSED'
                                ? '⏸️ พักชั่วคราว'
                                : '⏳ รอคิวเจียร'}
                            </span>
                          </div>

                          {/* Animated Surface Grinder for IN_PROCESS */}
                          {isInProcess && (
                            <div className="mt-1.5 px-2 py-1 rounded-lg bg-purple-950/70 border border-purple-400/60 flex items-center justify-between gap-1 shadow-sm">
                              <MoldSurfaceGrinderAnimation size="sm" showLabel partName={ticket.partName} />
                              <span className="text-[9px] font-mono text-purple-300 font-bold animate-pulse">
                                OKAMOTO GRINDER
                              </span>
                            </div>
                          )}
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

                    {/* Preemption or Postponed Notice */}
                    {wasShifted && (
                      <div className="mt-1.5 ml-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-[10.5px] text-amber-200 flex items-center justify-between gap-1">
                        <span>
                          {ticket.shiftedFromDate
                            ? `↪️ เลื่อนจากวันที่ ${ticket.shiftedFromDate} ➔ ${ticket.scheduledDate}`
                            : `↪️ เลื่อนจาก คิว #${ticket.originalQueueOrder ?? orderNum - 1} ➔ #${orderNum}`}
                        </span>
                        {ticket.preemptedByJobCode && <span className="font-mono text-[9.5px]">โดย {ticket.preemptedByJobCode}</span>}
                      </div>
                    )}

                    {/* Bottom Action Strip */}
                    <div
                      className="mt-2 ml-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 flex-wrap"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-[10.5px] text-slate-400 truncate font-mono">
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

                        {!isEmg && ticket.status !== 'COMPLETED' && ticket.status !== 'READY' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrPromoteTicket(ticket, true)}
                            className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Flame className="w-2.5 h-2.5 text-rose-400" />
                            <span>ดันคิวด่วน #1</span>
                          </button>
                        )}

                        {ticket.status !== 'IN_PROCESS' && ticket.status !== 'COMPLETED' && ticket.status !== 'READY' && (
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
      )}

        {/* =================================================================== */}
        {/* INTERACTIVE DRAG SPLITTER HANDLE (LEFT / RIGHT FREE RESIZE)          */}
        {/* =================================================================== */}
        {!isQueueCollapsed && (
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
        )}

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

          {/* Status Color Legend Strip (Canonical States) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] font-mono flex-wrap">
            <span className="text-slate-400 font-sans font-bold flex items-center gap-1">
              🏷️ สัญลักษณ์สถานะ:
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold flex items-center gap-1 shadow-sm">
              <span>🚨</span> <span>งานด่วน #1</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-black flex items-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.4)] border border-purple-400 animate-pulse">
              <span>⚡</span> <span>กำลังเจียร (In-Process)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
              <span>⏳</span> <span>รอคิวเจียร</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black flex items-center gap-1 shadow-sm">
              <span>🟡</span> <span>งานเลื่อน (Postponed)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500 text-white font-black flex items-center gap-1 shadow-sm">
              <span>🔵</span> <span>งานเจียรเสร็จแล้ว (รอตรวจ QC)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black flex items-center gap-1 shadow-sm">
              <span>🟢</span> <span>งานเสร็จสมบูรณ์ (QC ผ่าน)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold flex items-center gap-1">
              <span>❌</span> <span>ยกเลิก / คัดทิ้ง (ครบลิมิต)</span>
            </span>
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
                    {/* 1. Postponed Origin Indicators: jobs that started on this date and were postponed to a future date */}
                    {cell.postponedOriginJobs && cell.postponedOriginJobs.map((pJob, pIdx) => (
                      <div
                        key={`postpone-orig-${pJob.id}-${pIdx}`}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDetailTicket(pJob);
                        }}
                        className="px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-200 text-[9px] font-mono font-bold flex items-center justify-between gap-1 shadow-sm cursor-pointer hover:bg-amber-900/60 hover:border-amber-400 transition-all"
                        title={`เริ่มลงคิวตั้งแต่วันที่ ${pJob.shiftedFromDate} ➔ เลื่อนไปวันที่ ${pJob.scheduledDate} (คลิกเพื่อดูรายละเอียด)`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span>🟡</span>
                          <span className="text-amber-300">เริ่มคิว (เลื่อน ➔ {pJob.scheduledDate?.slice(8)} พ.ย.)</span>
                        </span>
                        <span className="font-bold shrink-0 text-[8.5px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-200">
                          #{pJob.queueOrder ?? 1}
                        </span>
                      </div>
                    ))}

                    {/* 2. Spanning Continuous Postponement Bar: connects original queued date to postponed target date */}
                    {cell.postponedSpanJobs && cell.postponedSpanJobs.map((pJob, pIdx) => (
                      <div
                        key={`postpone-span-${pJob.id}-${pIdx}`}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDetailTicket(pJob);
                        }}
                        className="py-1 px-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 border border-amber-400/60 text-amber-200 text-[9px] font-mono font-bold flex items-center justify-between gap-1 shadow-sm hover:border-amber-300 hover:bg-amber-400/30 transition-all cursor-pointer relative overflow-hidden group/span"
                        title={`บาร์ลากยาวงานเลื่อน: ใบงาน ${pJob.jobCode} (${pJob.partName}) เลื่อนจาก ${pJob.shiftedFromDate} ➔ ${pJob.scheduledDate}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover/span:translate-x-full transition-transform duration-1000" />
                        <span className="truncate flex items-center gap-1">
                          <span className="text-amber-400 animate-pulse font-black">━ ➔</span>
                          <span className="truncate text-slate-100 font-sans">{pJob.partName}</span>
                        </span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono shrink-0">
                          ➔ {pJob.scheduledDate?.slice(8)}
                        </span>
                      </div>
                    ))}

                    {/* 3. Direct Scheduled Jobs in this cell */}
                    {cell.jobs.map((job, jIdx) => {
                      const meta = getTicketStatusMeta(job);
                      const isInProcess = meta.key === 'IN_PROCESS' || job.status === 'IN_PROCESS';
                      const isPostponedArrival = Boolean(job.shiftedFromDate && cell.dateStr && job.shiftedFromDate < cell.dateStr);

                      return (
                        <div
                          key={`${job.id}-${jIdx}`}
                          draggable
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDetailTicket(job);
                          }}
                          onDragStart={e => handleDragStartTicket(e, job.id)}
                          onDrop={e => handleDropOnCalendarCell(e, cell.dateStr!, jIdx)}
                          className={`p-1.5 rounded-lg border text-[10px] leading-tight cursor-pointer transition-all hover:scale-[1.02] hover:ring-1 hover:ring-cyan-400 relative overflow-hidden ${
                            isInProcess
                              ? 'bg-purple-950/50 border-purple-400/90 shadow-[0_0_14px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/60'
                              : meta.cardClass
                          }`}
                          title={`คลิกดูรายละเอียด: ${job.jobCode} • ${job.partName} (${meta.label})`}
                        >
                          {/* Accent line on left */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isInProcess ? 'bg-purple-400 animate-pulse' : meta.leftBar}`} />

                          <div className="flex items-center justify-between gap-1 font-mono font-bold pl-1">
                            <span className="truncate flex items-center gap-1">
                              {isInProcess ? (
                                <MoldSurfaceGrinderAnimation size="xs" />
                              ) : (
                                <span>{meta.icon}</span>
                              )}
                              <span>{job.queueOrder ? `#${job.queueOrder}` : `#${jIdx + 1}`} {job.lineId}</span>
                            </span>
                            <span className={`text-[8.5px] px-1 py-0.2 rounded font-sans font-bold shrink-0 ${isInProcess ? 'bg-purple-600 text-white font-black' : meta.pillClass}`}>
                              {isInProcess ? 'กำลังเจียร' : meta.shortLabel}
                            </span>
                          </div>

                          <div className="truncate font-sans font-semibold mt-0.5 pl-1 text-slate-100 flex items-center justify-between gap-1">
                            <span className="truncate">{job.partName}</span>
                          </div>

                          {isPostponedArrival && (
                            <div className="mt-0.5 pl-1 text-[8.5px] font-mono text-amber-300 flex items-center gap-1">
                              <span>↳ เลื่อนมาจาก {job.shiftedFromDate?.slice(8)} พ.ย.</span>
                            </div>
                          )}
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

      {/* ===================================================================== */}
      {/* JOB COMPLETION & MANDATORY QC CONFIRMATION POPUP MODAL               */}
      {/* ===================================================================== */}
      <JobCompletionConfirmModal
        isOpen={!!confirmingCompletionTicket}
        ticket={confirmingCompletionTicket}
        onClose={() => setConfirmingCompletionTicket(null)}
        onSuccess={msg => {
          setSelectedDetailTicket(null);
          setConfirmingCompletionTicket(null);
          reloadAll();
          showToast(msg);
        }}
      />
    </div>
  );
};
