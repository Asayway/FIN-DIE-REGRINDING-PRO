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
import { regrindService } from '../../services/regrindService';
import { getUnifiedStatusMeta, resolveUnifiedStatusKey } from '../../utils/statusHelper';
import { MoldSurfaceGrinderAnimation } from '../animations/MoldSurfaceGrinderAnimation';
import { useLanguage } from '../../i18n';

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
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';

  if (!ticket) return null;

  const statusMeta = getUnifiedStatusMeta(ticket, language);
  const isReady = statusMeta.key === 'READY';
  const isCompleted = statusMeta.key === 'COMPLETED';
  const isScrap = statusMeta.key === 'SCRAP';
  const isPostponed = statusMeta.key === 'POSTPONED';
  const isEmg = statusMeta.key === 'EMERGENCY';
  const isWaiting = statusMeta.key === 'WAITING';
  const isInProcess = ticket.status === 'IN_PROCESS';
  const isPaused = ticket.status === 'PAUSED';
  const wasShifted = (ticket.shiftedCount || 0) > 0;

  const tubeSize = detectTubeSize(ticket.partCode, ticket.partName);
  const standardAudit = regrindService.auditTicketAgainstStandard(ticket);
  const nominalMm = ticket.nominalLengthMm ?? standardAudit.matchedMaster?.nominalLengthMm ?? 70.0;
  const minLimitMm = ticket.minAllowedLengthMm ?? standardAudit.matchedMaster?.minAllowedLengthMm ?? 65.0;
  const prevMm = ticket.previousLengthMm ?? nominalMm;
  const depthMm = ticket.grindDepthMm ?? standardAudit.matchedMaster?.grindingAmountPerTimeMm ?? 0.20;
  const afterMm = ticket.lengthAfterGrindMm ?? Number((prevMm - depthMm).toFixed(3));
  const isUnderMinLimit = Number(afterMm.toFixed(3)) < Number(minLimitMm.toFixed(3)) - 1e-4;
  const cycleBefore = ticket.regrindCountBefore ?? 0;
  const cycleAfter = ticket.regrindCountAfter ?? cycleBefore + 1;
  const maxCycles = ticket.maxRegrindAllowed ?? standardAudit.matchedMaster?.maxRegrindCount ?? 4;
  const cycleRemaining = Math.max(0, maxCycles - cycleAfter);
  const dimRemaining = isUnderMinLimit ? 0 : Math.floor((afterMm - minLimitMm) / Math.max(0.01, depthMm || 0.1) + 1e-6);
  const remainingCycles = standardAudit.isNonRegrindable ? 0 : Math.max(0, Math.min(cycleRemaining, dimRemaining));
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
                  ? 'bg-purple-600 text-white font-black animate-pulse shadow-md'
                  : isPaused
                  ? 'bg-indigo-900 text-indigo-200'
                  : isReady
                  ? 'bg-sky-500 text-white font-bold'
                  : isCompleted
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-cyan-300'
              }`}
            >
              <span>{ticket.queueOrder ? (isEn ? `Queue #${ticket.queueOrder}` : `คิว #${ticket.queueOrder}`) : ticket.jobCode}</span>
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
                    {isEn ? 'URGENT #1' : 'คิวด่วน #1'}
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
                {isEn
                  ? `Jobs on ${dateDisplay} (${sameDayTickets.length} jobs):`
                  : `คิวงานวันที่ ${dateDisplay} (${sameDayTickets.length} คิว):`}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sameDayTickets.map((t, i) => {
                  const active = t.id === ticket.id;
                  const tEmg = Boolean(t.isEmergency || t.urgency === 'EMERGENCY');
                  return (
                    <button
                      key={`${t.id}-${i}`}
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

          {/* Quick Info Grid with 6 Standardized Status Identifiers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <div className={`p-2.5 rounded-xl border ${statusMeta.cardClass}`}>
              <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'Current Status' : 'สถานะปัจจุบัน'}</span>
              <strong className="text-xs font-black mt-0.5 block flex items-center gap-1.5">
                <span>{statusMeta.icon}</span>
                <span>{statusMeta.label}</span>
              </strong>
              {statusMeta.subLabel && (
                <span className="text-[9.5px] text-slate-400 block truncate font-sans mt-0.5">
                  {statusMeta.subLabel}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'Priority' : 'ความเร่งด่วน'}</span>
              <strong className={`text-xs font-bold mt-0.5 block ${isEmg ? 'text-rose-400' : 'text-emerald-300'}`}>
                {isEmg ? (isEn ? '🚨 Urgent #1 Preempt' : '🚨 ฉุกเฉินแทรกคิว #1') : (isEn ? '🟢 Normal Schedule' : '🟢 งานตามแผนปกติ')}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'Scheduled Date' : 'วันที่กำหนดส่ง'}</span>
              <strong className="text-xs text-white font-bold mt-0.5 block">{dateDisplay}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'Technician' : 'ช่างผู้รับผิดชอบ'}</span>
              <strong className="text-xs text-cyan-300 font-bold mt-0.5 block truncate font-sans">
                {ticket.assignedTechnician || 'Thanakorn Phonpayung'}
              </strong>
            </div>
          </div>

          {/* Active Grinding Animation Banner when in IN_PROCESS state */}
          {isInProcess && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-purple-950/70 border-2 border-purple-400/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <div className="flex items-center gap-3">
                <MoldSurfaceGrinderAnimation size="sm" theme="purple" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                    <span className="text-xs font-black text-purple-300 font-mono tracking-wide">
                      {isEn ? '⚡ Surface Grinding Active (IN_PROCESS)' : '⚡ กำลังเจียรราบ Spare Part Mold (IN_PROCESS)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300 block mt-0.5">
                    {isEn
                      ? 'OKAMOTO High-Precision Surface Grinder • Grinding to spec'
                      : 'OKAMOTO High-Precision Surface Grinder • กำลังปาดหน้าชิ้นงานตามสเปค'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  regrindService.markTicketAsReady(ticket.id);
                  if (onSelectTicket) onSelectTicket({ ...ticket, status: 'READY', isEmergency: false });
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs cursor-pointer shadow flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span>{isEn ? '🔵 Mark Ready for QC' : '🔵 เจียรเสร็จแล้ว (ส่งตรวจ QC)'}</span>
              </button>
            </div>
          )}

          {/* Quick Status Action Toolbar (Standardized States Workflow) */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>{isEn ? '⚡ Workflow Status Actions:' : '⚡ ปรับสถานะงาน (Workflow Status Actions):'}</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                {isEn
                  ? (isReady
                      ? '🔵 Ready → QC Inspection Required'
                      : isCompleted
                      ? '🟢 QC Passed & Completed'
                      : isScrap
                      ? '❌ Scrapped (No QC needed)'
                      : '⏳ Finish grinding then mark "Ready QC"')
                  : (isReady
                      ? '🔵 เจียรเสร็จแล้ว → พร้อมตรวจ QC'
                      : isCompleted
                      ? '🟢 งานเสร็จสมบูรณ์แล้ว'
                      : isScrap
                      ? '❌ งานคัดทิ้ง (ไม่ต้องตรวจ QC)'
                      : '⏳ เจียรให้เสร็จแล้วกด "เจียรเสร็จ" เพื่อส่งตรวจ QC')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold font-mono">
              {/* 1. Urgent #1 */}
              <button
                type="button"
                onClick={() => {
                  regrindService.markTicketAsEmergency(ticket.id, { preemptActiveJob: true });
                  if (onSelectTicket) onSelectTicket({ ...ticket, isEmergency: true, urgency: 'EMERGENCY' });
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isEmg
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/50'
                    : 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-500/30'
                }`}
                title={isEn ? 'Promote to Urgent Queue #1 immediately' : 'ตั้งเป็นงานด่วน แทรกคิว #1 ทันที'}
              >
                <span>🚨</span>
                <span className="text-[11px]">{isEn ? 'Urgent #1' : 'งานด่วน #1'}</span>
              </button>

              {/* 2. Postponed */}
              <button
                type="button"
                onClick={() => {
                  regrindService.markTicketAsPostponed(ticket.id, undefined, isEn ? 'Manually postponed by user' : 'ผู้ใช้ปรับเลื่อนสถานะ');
                  if (onSelectTicket) onSelectTicket({ ...ticket, status: 'POSTPONED', shiftedCount: (ticket.shiftedCount || 0) + 1 });
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isPostponed
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                    : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/30'
                }`}
                title={isEn ? 'Mark ticket as Postponed' : 'ปรับสถานะเป็น งานเลื่อน (บันทึกประวัติตกค้างไว้ที่วันเดิม)'}
              >
                <span>🟡</span>
                <span className="text-[11px]">{isEn ? 'Postpone' : 'งานเลื่อน'}</span>
              </button>

              {/* 3. Ready for QC */}
              <button
                type="button"
                onClick={() => {
                  regrindService.markTicketAsReady(ticket.id);
                  if (onSelectTicket) onSelectTicket({ ...ticket, status: 'READY', isEmergency: false });
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isReady
                    ? 'bg-sky-500 text-white border-sky-300 shadow-md font-black ring-2 ring-sky-400/50'
                    : 'bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border-sky-400/30'
                }`}
                title={isEn ? 'Confirm grinding complete and send to QC' : 'พนักงานกดยืนยันว่าเจียรเสร็จแล้ว เพื่อส่งต่อเข้าขั้นตอนตรวจรับ QC'}
              >
                <span>🔵</span>
                <span className="text-[11px]">{isEn ? 'Ready QC' : 'เจียรเสร็จแล้ว'}</span>
              </button>

              {/* 4. QC Approve / Complete */}
              <button
                type="button"
                disabled={!isReady && !isCompleted}
                onClick={() => {
                  if (ticket.status === 'COMPLETED') {
                    if (window.confirm(isEn ? 'This ticket is closed. Reopen for rework?' : 'ใบงานนี้ปิดแล้ว ต้องการเปิดงานซ่อมใหม่ (Reopen) หรือไม่?')) {
                      const res = regrindService.reopenTicket(ticket.id, isEn ? 'Reopened by user' : 'เปิดงานซ่อมใหม่โดยผู้ใช้งาน');
                      if (res.success && onSelectTicket) {
                        onSelectTicket({ ...ticket, status: 'IN_PROCESS' });
                      }
                      alert(res.message);
                    }
                    return;
                  }

                  if (!isReady) {
                    alert(
                      isEn
                        ? '⚠️ Please mark the ticket "Ready QC" before completing QC inspection.'
                        : '⚠️ ขั้นตอนตรวจรับ QC จะดำเนินการได้หลังจากพนักงานกดยืนยันสถานะ "งานเจียรเสร็จแล้ว" ก่อนเท่านั้น'
                    );
                    return;
                  }

                  if (onCompleteTicket) {
                    onClose();
                    onCompleteTicket(ticket);
                  }
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 transition-all font-bold whitespace-nowrap ${
                  isCompleted
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md font-black cursor-pointer'
                    : isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg animate-pulse ring-2 ring-emerald-400/50 cursor-pointer'
                    : 'bg-slate-900 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
                }`}
                title={
                  isCompleted
                    ? (isEn ? 'Completed (QC Passed) - Click to reopen' : 'งานเสร็จสมบูรณ์ (QC ผ่านแล้ว) คลิกเพื่อเปิดงานใหม่')
                    : isReady
                    ? (isEn ? 'Run QC Inspection & Complete Job' : 'ตรวจรับ QC และยืนยันจบงาน (QC Inspection)')
                    : (isEn ? 'Mark Ready QC first before QC approval' : 'ต้องกดยืนยันเจียรเสร็จแล้วก่อน จึงจะตรวจรับ QC ได้')
                }
              >
                <span>🟢</span>
                <span className="text-[11px] truncate">
                  {isEn
                    ? (isCompleted ? 'QC Passed' : isReady ? 'Inspect QC' : 'Await Grind')
                    : (isCompleted ? 'QC ผ่านสมบูรณ์' : isReady ? 'ตรวจรับ QC' : 'รอเจียรเสร็จ')}
                </span>
              </button>

              {/* 5. Scrap */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(isEn ? `Confirm scrap/cancel ticket ${ticket.jobCode} (${ticket.partName})?` : `ยืนยันการคัดทิ้ง / ยกเลิกใบงาน ${ticket.jobCode} (${ticket.partName})?`)) {
                    regrindService.scrapItem(
                      ticket.id,
                      ticket.defectReason || 'OUT_OF_TOLERANCE',
                      isEn ? 'Scrapped / Cancelled (Scrap limit reached or damaged)' : 'คัดทิ้ง / ยกเลิก (ครบลิมิตเจียรหรือชำรุด)',
                      ticket.assignedTechnician || 'Technician'
                    );
                    if (onSelectTicket) onSelectTicket({ ...ticket, status: 'SCRAP', isScrapped: true, isEmergency: false });
                  }
                }}
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                  isScrap
                    ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-md font-bold'
                    : 'bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border-white/10'
                }`}
                title={isEn ? 'Scrap at limit / damaged (bypasses QC)' : 'คัดทิ้ง (ครบลิมิตเจียร / ต่ำกว่าสเปค Min) ไม่ต้องผ่าน QC'}
              >
                <span>❌</span>
                <span className="text-[11px]">{isEn ? 'Scrap' : 'คัดทิ้ง'}</span>
              </button>
            </div>
          </div>

          {/* Shifted Notice if Preempted */}
          {wasShifted && (
            <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/60 text-amber-200 text-[11px] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isEn
                  ? `🟡 Re-prioritized from Queue #${ticket.originalQueueOrder ?? (ticket.queueOrder || 2) - 1} → Queue #${ticket.queueOrder} (preempted by urgent job)`
                  : `🟡 รายการนี้ถูกเลื่อนลำดับจาก คิว #${ticket.originalQueueOrder ?? (ticket.queueOrder || 2) - 1} → คิว #${ticket.queueOrder} (มีงานด่วนแทรก)`}
              </span>
            </div>
          )}

          {/* Specs Card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-cyan-300">
                {isEn ? '📐 Dimensions & Regrind Cycles' : '📐 ขนาด & รอบการเจียร'}
              </span>
              <span className="text-slate-400 font-mono">
                {isEn ? 'Min Spec:' : 'ต่ำสุด:'} <strong className="text-amber-300">{minLimitMm.toFixed(2)} mm</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'Before Grind' : 'ความยาวเดิม'}</span>
                <strong className="text-xs text-white font-bold">{prevMm.toFixed(2)} mm</strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-300 block font-sans">{isEn ? 'Grind Depth' : 'ระยะเจียร'}</span>
                <strong className="text-xs text-cyan-300 font-bold">-{depthMm.toFixed(3)} mm</strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300 block font-sans">{isEn ? 'After Grind' : 'หลังเจียร'}</span>
                <strong className={`text-xs font-bold ${isUnderMinLimit ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {afterMm.toFixed(3)} mm
                </strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">
                  {isEn ? `Cycles (${remainingCycles} left)` : `รอบเจียร (เหลือ ${remainingCycles})`}
                </span>
                <strong className="text-xs text-amber-300 font-bold">
                  #{cycleAfter} / {maxCycles}
                </strong>
              </div>
            </div>

            {standardAudit.matchedMaster && (
              <div className={`p-2 rounded-lg border text-[11px] font-sans ${
                standardAudit.hasSpecMismatch
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-950/35 border-emerald-500/35 text-emerald-300'
              }`}>
                <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    {standardAudit.hasSpecMismatch
                      ? (isEn ? '⚠️ Deviates from Standard Re-Grinding Spec' : '⚠️ พบค่าไม่ตรงเกณฑ์ Standard Re-Grinding')
                      : (isEn ? '✅ Complies with Standard Re-Grinding Spec' : '✅ สเปกตรงตาม Standard Re-Grinding')}
                  </span>
                  <span className="font-mono text-[10px] opacity-90">{standardAudit.standardSpecSummary}</span>
                </div>
                {standardAudit.mismatches.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-[10.5px] text-amber-200/90">
                    {standardAudit.mismatches.map((m, idx) => (
                      <div key={idx}>• {m}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks & Defect */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
            <span className="text-[10.5px] text-slate-400 font-bold block">
              {isEn ? 'Remarks / Notes' : 'หมายเหตุ / รายละเอียด'}
            </span>
            <p className="text-slate-200 text-xs">
              {ticket.remarks || ticket.defectNotes || (isEn ? 'Standard cycle regrinding' : 'ลับคมตามรอบมาตรฐาน')}
            </p>
          </div>

          {/* True Cost & Savings Financial Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-950 to-cyan-950/70 border border-emerald-500/40 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>💰</span>
                <span>{isEn ? 'True Cost & Net Savings Summary' : 'สรุปต้นทุนจริง & ยอดเงินประหยัด (True Cost & Net Saving)'}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#00FF7F] font-black border border-emerald-500/40">
                {(ticket.netSavingPct || 95.95)}% {isEn ? 'Saved' : 'ประหยัด'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'True Regrind Cost' : 'ต้นทุนเจียรจริง'}</span>
                <strong className="text-xs text-cyan-300 font-bold">
                  ฿{(ticket.totalTrueCost || (ticket.laborHours ? Math.round(ticket.laborHours * 180 + 320) : 506.50)).toLocaleString()}
                </strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">{isEn ? 'New Part Value' : 'ราคาชิ้นงานใหม่'}</span>
                <strong className="text-xs text-white font-bold">
                  ฿{(ticket.newPartPriceTotal || ((ticket.quantity || 1) * 12500)).toLocaleString()}
                </strong>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/30 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-emerald-400 block font-sans font-bold">{isEn ? 'Net Savings' : 'ยอดประหยัดสุทธิ'}</span>
                <strong className="text-xs text-[#00FF7F] font-black">
                  ฿{(ticket.netSavingTHB || Math.max(0, (ticket.newPartPriceTotal || ((ticket.quantity || 1) * 12500)) - (ticket.totalTrueCost || 506.50))).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {onEditTicket && (
                <button
                  type="button"
                  onClick={() => onEditTicket(ticket, isEmg)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEn ? 'Edit' : 'แก้ไข'}</span>
                </button>
              )}

              {!isEmg && !isReady && !isScrap && onEditTicket && (
                <button
                  type="button"
                  onClick={() => onEditTicket(ticket, true)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>{isEn ? 'Promote Urgent #1' : 'ดันคิวด่วน #1'}</span>
                </button>
              )}

              {onDeleteTicket && (
                <button
                  type="button"
                  onClick={() => onDeleteTicket(ticket)}
                  className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 cursor-pointer"
                  title={isEn ? 'Delete Queue Ticket' : 'ลบคิวงานนี้'}
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
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Play className="w-3 h-3" />
                  <span>{isPaused ? (isEn ? 'Resume' : 'เจียรต่อ') : (isEn ? 'Start Grind' : 'เริ่มเจียร')}</span>
                </button>
              )}

              {!isScrap && (
                <>
                  {/* Step 1 for Technician: If not yet ready, technician confirms grinding is done */}
                  {!isReady && !isCompleted && (
                    <button
                      type="button"
                      onClick={() => {
                        regrindService.markTicketAsReady(ticket.id);
                        if (onSelectTicket) onSelectTicket({ ...ticket, status: 'READY', isEmergency: false });
                      }}
                      className="px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md bg-sky-600 hover:bg-sky-500 text-white whitespace-nowrap"
                      title={isEn ? 'Confirm grinding is finished (send to QC)' : 'ช่างกดยืนยันว่าเจียรเสร็จแล้ว (เพื่อส่งต่อเข้าขั้นตอนตรวจรับ QC)'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEn ? '🔵 Confirm Ready QC' : '🔵 ยืนยันเจียรเสร็จแล้ว'}</span>
                    </button>
                  )}

                  {/* Step 2 for QC Inspector: Appears when grinding is confirmed READY */}
                  {(isReady || isCompleted) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (ticket.status === 'COMPLETED') {
                          if (window.confirm(isEn ? 'This job is closed. Reopen for rework?' : 'ใบงานนี้ปิดแล้ว ต้องการเปิดงานซ่อมใหม่ (Reopen) หรือไม่?')) {
                            const res = regrindService.reopenTicket(ticket.id, isEn ? 'Reopened by user' : 'เปิดงานซ่อมใหม่โดยผู้ใช้งาน');
                            if (res.success && onSelectTicket) {
                              onSelectTicket({ ...ticket, status: 'IN_PROCESS' });
                            }
                            alert(res.message);
                          }
                          return;
                        }

                        if (onCompleteTicket) {
                          onClose();
                          onCompleteTicket(ticket);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap ${
                        ticket.status === 'COMPLETED'
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 animate-pulse'
                      }`}
                      title={
                        ticket.status === 'COMPLETED'
                          ? (isEn ? 'Completed (QC Passed)' : 'งานเสร็จสมบูรณ์ (QC ผ่านแล้ว)')
                          : (isEn ? 'QC Inspection & Final Approval' : 'ตรวจรับ QC และยืนยันจบงาน (QC Inspection & Final Approval)')
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {ticket.status === 'COMPLETED'
                          ? (isEn ? '🟢 QC Passed (Done)' : '🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)')
                          : (isEn ? '🟢 Inspect QC / Close Job' : '🟢 ตรวจรับ QC / จบงาน')}
                      </span>
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer whitespace-nowrap"
              >
                {isEn ? 'Close' : 'ปิด'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
