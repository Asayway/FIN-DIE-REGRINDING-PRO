import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  FileText,
  UserCheck,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { RegrindWorkTicket } from '../../types/regrind';
import { regrindService } from '../../services/regrindService';

export interface JobCompletionConfirmModalProps {
  isOpen: boolean;
  ticket: RegrindWorkTicket | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const QC_PRESET_COMMENTS = [
  '🟢 คุณภาพดี ลับคมเรียบร้อยได้สเปคมาตรฐาน',
  '🟡 ผ่านเกณฑ์แบบมีเงื่อนไข (แนะนำเฝ้าระวังรอบถัดไป)',
  '🔵 ปรับตั้งพิเศษ: รองชิมชดเชยระยะเรียบร้อย',
  '⚡ ยืนยันจบงานผ่าน QC พร้อมส่งมอบเข้าสายการผลิต'
];

export const JobCompletionConfirmModal: React.FC<JobCompletionConfirmModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !ticket) return null;

  const [qcVerdict, setQcVerdict] = useState<'PASS' | 'PASS_WITH_MONITORING' | 'FAIL'>('PASS');
  const [technicianName, setTechnicianName] = useState<string>(ticket.assignedTechnician || 'Thanakorn Phonpayung');
  const [verifierName, setVerifierName] = useState<string>(ticket.verifiedBy || 'QC Inspector (User Confirmation)');
  const [commentNote, setCommentNote] = useState<string>('คุณภาพดี ลับคมเรียบร้อยได้สเปคมาตรฐาน');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const prevMm = ticket.previousLengthMm ?? ticket.nominalLengthMm ?? 70.0;
  const depthMm = ticket.grindDepthMm ?? 0.20;
  const afterMm = ticket.lengthAfterGrindMm ?? Number((prevMm - depthMm).toFixed(3));
  const minSpecMm = ticket.minAllowedLengthMm ?? 65.0;

  const handleConfirm = () => {
    setIsSubmitting(true);
    try {
      const res = regrindService.confirmJobCompletionWithQcPass(
        ticket.id,
        technicianName,
        verifierName,
        {
          qcVerdict,
          comments: commentNote,
          specialInstructions: commentNote
        }
      );

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error('JobCompletionConfirmModal error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div
        className="bg-[#0b101b] border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.25)] rounded-2xl max-w-lg w-full overflow-hidden my-auto animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-emerald-500/20 bg-emerald-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight flex items-center gap-2">
                <span>ขั้นตอนตรวจรับ QC & ยืนยันจบงาน</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  QC APPROVAL
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                ตรวจรับ {ticket.jobCode} • ปรับสถานะเป็น: <strong className="text-emerald-400">🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 text-xs">
          {/* Job Summary Banner */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-bold text-sm font-sans">{ticket.partName}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-xs">
                {ticket.partCode}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/5">
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block font-sans">ก่อนเจียร</span>
                <span className="text-xs text-slate-200 font-bold">{prevMm.toFixed(2)} mm</span>
              </div>
              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-cyan-500/30">
                <span className="text-[10px] text-cyan-300 block font-sans">ระยะเจียร</span>
                <span className="text-xs text-cyan-300 font-bold">-{depthMm.toFixed(3)} mm</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/40">
                <span className="text-[10px] text-emerald-300 block font-sans">หลังเจียร (หลัง QC)</span>
                <span className="text-xs text-emerald-300 font-black">{afterMm.toFixed(3)} mm</span>
              </div>
            </div>
          </div>

          {/* QC Verdict Selector */}
          <div className="space-y-1">
            <label className="block text-slate-200 font-extrabold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ผลการตรวจสอบคุณภาพ (QC Result)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">บังคับเลือก</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQcVerdict('PASS')}
                className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  qcVerdict === 'PASS'
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-100 shadow-md ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-300">
                  <span>🟢 PASS</span>
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">ผ่านเกณฑ์มาตรฐาน พร้อมใช้งาน</div>
              </button>

              <button
                type="button"
                onClick={() => setQcVerdict('PASS_WITH_MONITORING')}
                className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  qcVerdict === 'PASS_WITH_MONITORING'
                    ? 'bg-amber-950/60 border-amber-400 text-amber-100 shadow-md ring-1 ring-amber-400/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1.5 text-amber-300">
                  <span>🟡 MONITOR</span>
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">ผ่านแบบเฝ้าระวังพิเศษ</div>
              </button>

              <button
                type="button"
                onClick={() => setQcVerdict('FAIL')}
                className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  qcVerdict === 'FAIL'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-100 shadow-md ring-1 ring-rose-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1.5 text-rose-400">
                  <span>🔴 REWORK</span>
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">ส่งแก้ไข / เจียรปาดใหม่</div>
              </button>
            </div>
          </div>

          {/* Technician Comments / Special Advice Input */}
          <div className="space-y-1">
            <label className="block text-slate-200 font-extrabold text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>ข้อคิดเห็น / คำแนะนำจากผู้ซ่อมงาน (Comment / Special Advice)</span>
            </label>

            <textarea
              value={commentNote}
              onChange={e => setCommentNote(e.target.value)}
              placeholder="ระบุข้อคิดเห็น คำแนะนำในการติดตั้ง หรือหมายเหตุกรณีพิเศษ..."
              rows={2}
              className="w-full px-2.5 py-1.5 bg-slate-900 border-2 border-slate-700 rounded-xl text-white font-medium text-xs focus:border-emerald-400 focus:outline-none shadow-inner custom-scrollbar"
            />

            {/* Quick Preset Buttons */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium block">ข้อความแนะนำด่วน:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {QC_PRESET_COMMENTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCommentNote(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] border cursor-pointer transition-all ${
                      commentNote === preset
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

        {/* Technician & Inspector Name Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/10">
            <div>
              <label className="block text-slate-300 font-bold text-[11px] mb-1">
                ช่างผู้ซ่อมงาน (Technician)
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold text-[11px] mb-1">
                ผู้ตรวจรับงาน / QC Inspector
              </label>
              <input
                type="text"
                value={verifierName}
                onChange={e => setVerifierName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/90 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border border-white/10"
            disabled={isSubmitting}
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-300 text-slate-950 shadow-emerald-500/30 transition-all active:scale-95 ring-2 ring-emerald-400/60"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950 fill-emerald-400" />
            <span>{isSubmitting ? 'กำลังบันทึก...' : '✅ ยืนยันจบงานทันที (Confirm)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
