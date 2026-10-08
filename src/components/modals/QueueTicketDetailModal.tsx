import React from 'react';
import {
  Flame,
  Calendar as CalendarIcon,
  X,
  Play,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  FileText,
  Zap
} from 'lucide-react';
import { RegrindWorkTicket } from '../../types/regrind';
import { detectTubeSize } from '../common/LineFilteredPartCombobox';

export interface QueueTicketDetailModalProps {
  ticket: RegrindWorkTicket | null;
  /** Optional list of all tickets on the same scheduled date so user can switch between queues of that day */
  sameDayTickets?: RegrindWorkTicket[];
  onSelectTicket?: (ticket: RegrindWorkTicket) => void;
  onClose: () => void;
  onStartOrResume?: (ticket: RegrindWorkTicket) => void;
  onEditTicket?: (ticket: RegrindWorkTicket, defaultEmergency?: boolean) => void;
  onCompleteTicket?: (ticket: RegrindWorkTicket) => void;
  onDeleteTicket?: (ticket: RegrindWorkTicket) => void;
}

export const QueueTicketDetailModal: React.FC<QueueTicketDetailModalProps> = ({
  ticket,
  sameDayTickets = [],
  onSelectTicket,
  onClose,
  onStartOrResume,
  onEditTicket,
  onCompleteTicket,
  onDeleteTicket
}) => {
  if (!ticket) return null;

  const isEmg = Boolean(ticket.isEmergency || ticket.urgency === 'EMERGENCY');
  const isInProcess = ticket.status === 'IN_PROCESS';
  const isPaused = ticket.status === 'PAUSED';
  const isReady = ticket.status === 'READY';
  const isScrap = ticket.status === 'SCRAP';
  const wasShifted = (ticket.shiftedCount || 0) > 0 && !isEmg;

  const tubeSize = detectTubeSize(ticket.partCode, ticket.partName);
  const nominalMm = ticket.nominalLengthMm ?? 70.0;
  const minLimitMm = ticket.minAllowedLengthMm ?? 65.0;
  const prevMm = ticket.previousLengthMm ?? nominalMm;
  const depthMm = ticket.grindDepthMm ?? 0.20;
  const afterMm = ticket.lengthAfterGrindMm ?? Number((prevMm - depthMm).toFixed(3));
  const cycleBefore = ticket.regrindCountBefore ?? 0;
  const cycleAfter = ticket.regrindCountAfter ?? cycleBefore + 1;
  const maxCycles = ticket.maxRegrindAllowed ?? 4;
  const remainingCycles = Math.max(0, maxCycles - cycleAfter);
  const dateDisplay = ticket.scheduledDate || (ticket.targetCompletionDate ? ticket.targetCompletionDate.slice(0, 10) : '-');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        // Do NOT close on outside click - only close on X or action buttons
        e.stopPropagation();
      }}
    >
      <div
        className={`bg-[#0b101b] border-2 ${
          isEmg ? 'border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.2)]' : 'border-cyan-500/40 shadow-2xl'
        } rounded-2xl max-w-xl w-full overflow-hidden my-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
            isEmg
              ? 'bg-rose-950/40 border-rose-500/20'
              : 'bg-cyan-950/30 border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1 ${
                isEmg
                  ? 'bg-rose-600 text-white'
                  : isInProcess
                  ? 'bg-cyan-400 text-slate-950'
                  : isPaused
                  ? 'bg-purple-500 text-white'
                  : isReady
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-cyan-300'
              }`}
            >
              <span>{ticket.queueOrder ? `คิว #${ticket.queueOrder}` : ticket.jobCode}</span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  {ticket.partName}
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold">
                  LINE {ticket.lineId}
                </span>
                {isEmg && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold">
                    คิวด่วน #1
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {ticket.jobCode} • {ticket.partCode}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
          {/* Same-day Queue Switcher Bar */}
          {sameDayTickets.length > 1 && onSelectTicket && (
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
              <span className="text-[10.5px] text-slate-400 font-bold block">
                คิวงานวันที่ {dateDisplay} ({sameDayTickets.length} คิว):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sameDayTickets.map((t, i) => {
                  const active = t.id === ticket.id;
                  const tEmg = Boolean(t.isEmergency || t.urgency === 'EMERGENCY');
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTicket(t)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                        active
                          ? tEmg
                            ? 'bg-rose-600 text-white font-bold'
                            : 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      #{t.queueOrder ?? i + 1} {t.lineId}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">สถานะ</span>
              <strong className="text-xs font-bold text-cyan-300 mt-0.5 block">
                {isInProcess ? '⚙️ กำลังเจียร' : isPaused ? '⏸️ พักชั่วคราว' : isReady ? '✅ เสร็จพร้อมใช้' : isScrap ? '🗑️ คัดทิ้ง' : '⏳ รอคิวเจียร'}
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">ประเภท</span>
              <strong className={`text-xs font-bold mt-0.5 block ${isEmg ? 'text-rose-400' : 'text-emerald-300'}`}>
                {isEmg ? '🚨 คิวด่วน' : '🟢 ตามรอบ'}
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">วันที่</span>
              <strong className="text-xs text-white font-bold mt-0.5 block">{dateDisplay}</strong>
            </div>

            <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">ช่างผู้รับผิดชอบ</span>
              <strong className="text-xs text-cyan-300 font-bold mt-0.5 block truncate font-sans">
                {ticket.assignedTechnician || 'Thanakorn Phonpayung'}
              </strong>
            </div>
          </div>

          {/* Shifted Notice if Preempted */}
          {wasShifted && (
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                เลื่อนลำดับจาก คิว #{ticket.originalQueueOrder ?? (ticket.queueOrder || 2) - 1} &rarr; คิว #{ticket.queueOrder} (มีงานด่วนแทรก)
              </span>
            </div>
          )}

          {/* Specs Card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-cyan-300">
                📐 ขนาด & รอบการเจียร
              </span>
              <span className="text-slate-400 font-mono">
                ต่ำสุด: <strong className="text-amber-300">{minLimitMm.toFixed(2)} mm</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">ความยาวเดิม</span>
                <strong className="text-xs text-white font-bold">{prevMm.toFixed(2)} mm</strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-300 block font-sans">ระยะเจียร</span>
                <strong className="text-xs text-cyan-300 font-bold">-{depthMm.toFixed(3)} mm</strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300 block font-sans">หลังเจียร</span>
                <strong className={`text-xs font-bold ${afterMm < minLimitMm ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {afterMm.toFixed(3)} mm
                </strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">รอบเจียร</span>
                <strong className="text-xs text-amber-300 font-bold">
                  #{cycleAfter} / {maxCycles}
                </strong>
              </div>
            </div>
          </div>

          {/* Remarks & Defect */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
            <span className="text-[10.5px] text-slate-400 font-bold block">
              หมายเหตุ / รายละเอียด
            </span>
            <p className="text-slate-200 text-xs">
              {ticket.remarks || ticket.defectNotes || 'ลับคมตามรอบมาตรฐาน'}
            </p>
          </div>

          {/* Action Bar */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {onEditTicket && (
                <button
                  type="button"
                  onClick={() => onEditTicket(ticket, isEmg)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>แก้ไข</span>
                </button>
              )}

              {!isEmg && !isReady && !isScrap && onEditTicket && (
                <button
                  type="button"
                  onClick={() => onEditTicket(ticket, true)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>ดันคิวด่วน #1</span>
                </button>
              )}

              {onDeleteTicket && (
                <button
                  type="button"
                  onClick={() => onDeleteTicket(ticket)}
                  className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 cursor-pointer"
                  title="ลบคิวงานนี้"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isReady && !isScrap && onStartOrResume && ticket.status !== 'IN_PROCESS' && (
                <button
                  type="button"
                  onClick={() => onStartOrResume(ticket)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Play className="w-3 h-3" />
                  <span>{isPaused ? 'เจียรต่อ' : 'เริ่มเจียร'}</span>
                </button>
              )}

              {!isReady && !isScrap && onCompleteTicket && (
                <button
                  type="button"
                  onClick={() => onCompleteTicket(ticket)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>จบงาน & QC</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
