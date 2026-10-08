import React, { useState } from 'react';
import { RegrindWorkTicket, DefectReasonCode, DEFECT_REASON_LABELS } from '../../types/regrind';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import { AlertOctagon, ShoppingBag, X } from 'lucide-react';

interface RegrindScrapModalProps {
  ticket: RegrindWorkTicket;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reasonCode: DefectReasonCode;
    customReason: string;
    technicianName: string;
    reorderQuantity: number;
  }) => void;
  currentUserName?: string;
}

export const RegrindScrapModal: React.FC<RegrindScrapModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onConfirm,
  currentUserName = 'Kittisak Wongsuwan'
}) => {
  const [reasonCode, setReasonCode] = useState<DefectReasonCode>(ticket.defectReason || 'CHIPPED');
  const [customReason, setCustomReason] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>(ticket.assignedTechnician || currentUserName);
  const [reorderQuantity, setReorderQuantity] = useState<number>(10);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName.trim()) {
      alert('กรุณากรอกชื่อผู้บันทึก');
      return;
    }

    onConfirm({
      reasonCode,
      customReason: customReason.trim() || DEFECT_REASON_LABELS[reasonCode].th,
      technicianName: technicianName.trim(),
      reorderQuantity
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <ToolingPicThumbnail
              picCategory={ticket.picCategory}
              partName={ticket.partName}
              size="md"
            />
            <div>
              <h3 className="font-bold text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5" />
                <span>บันทึกทิ้ง / หมดสเปค (Scrap Tooling)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ticket.partName} ({ticket.jobCode}) | ไลน์ {ticket.lineId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Callout */}
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs space-y-1">
          <p className="font-semibold">
            ⚠️ การตัดทิ้งจะทำให้จำนวนสต๊อกอะไหล่หมุนเวียนลดลงถาวร
          </p>
          <p className="text-[11px] text-rose-700 dark:text-rose-400">
            ระบบจะสร้างใบขอสั่งซื้อ (Purchasing Requisition) อัตโนมัติ เพื่อส่งต่อให้ฝ่ายจัดซื้อจัดหาอะไหล่ทดแทน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Defect Reason Code Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              รหัสสาเหตุความชำรุด (Defect Reason Code) *
            </label>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as DefectReasonCode)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500"
            >
              {(Object.keys(DEFECT_REASON_LABELS) as DefectReasonCode[]).map(code => (
                <option key={code} value={code}>
                  {DEFECT_REASON_LABELS[code].th} ({DEFECT_REASON_LABELS[code].en})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              รายละเอียดลักษณะความเสียหาย (Defect Description)
            </label>
            <textarea
              rows={2}
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500"
              placeholder="เช่น คมเจียรบิ่นลึกเกิน 1.5mm ไม่สามารถเจียรลับต่อได้ หรือเกิดรอยร้าวที่คอพั้นช์"
            />
          </div>

          {/* Purchasing Requisition Auto Reorder */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                แจ้งฝ่ายจัดซื้อสั่งอะไหล่ใหม่ทดแทน (Auto-PR Reorder)
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                Purchasing Alert
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">
                จำนวนที่ต้องการเสนอสั่งซื้อ (Reorder Qty):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={reorderQuantity}
                  onChange={e => setReorderQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-center font-bold"
                />
                <span className="text-slate-500 dark:text-slate-400">ชิ้น</span>
              </div>
            </div>
          </div>

          {/* Technician Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ผู้บันทึกการตัดทิ้ง (Technician Name) *
            </label>
            <input
              type="text"
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>ยืนยันตัดทิ้ง & ส่งใบสั่งซื้อ (Confirm Scrap)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
