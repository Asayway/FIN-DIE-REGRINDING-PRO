import React from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  itemDetails?: string;
  warningText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDanger?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'ยืนยันการลบข้อมูล (Delete Confirmation)',
  itemName,
  itemDetails,
  warningText = 'การดำเนินการนี้จะลบข้อมูลออกจากระบบทันที โปรดตรวจสอบความถูกต้องก่อนยืนยัน',
  confirmButtonText = 'ยืนยันการลบ (Confirm Delete)',
  cancelButtonText = 'ยกเลิก (Cancel)',
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#0F172A] border border-rose-900/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-rose-950/40 border-b border-rose-900/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-thai">{title}</h3>
              <p className="text-[11px] text-rose-300 font-thai">Mandatory Action Verification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-300 font-thai leading-relaxed">
            คุณต้องการลบรายการต่อไปนี้ออกจากระบบใช่หรือไม่?
          </div>

          {/* Highlighted Item Target Box */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="font-bold text-white font-mono text-sm truncate" title={itemName}>
                {itemName}
              </div>
            </div>
            {itemDetails && (
              <div className="text-xs text-slate-400 font-thai pl-6 border-l-2 border-slate-700 ml-2">
                {itemDetails}
              </div>
            )}
          </div>

          {/* Warning notice */}
          {warningText && (
            <div className="flex items-start gap-2 bg-rose-950/20 border border-rose-900/30 rounded-lg p-2.5 text-xs text-rose-300 font-thai">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{warningText}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold font-thai transition-colors"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-extrabold font-thai transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
