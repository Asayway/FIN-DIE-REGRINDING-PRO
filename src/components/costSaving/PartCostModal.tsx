import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  History, 
  Tag, 
  Layers, 
  DollarSign, 
  Calendar,
  Building,
  CheckCircle2
} from 'lucide-react';
import { 
  PartCostMasterItem, 
  PartCategoryType, 
  CurrencyCode 
} from '../../types/costSaving';
import { ProductionLineId } from '../../types';
import { costSavingService } from '../../services/costSavingService';

interface PartCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPart?: PartCostMasterItem | null;
  onSaved: (part: PartCostMasterItem) => void;
}

export const PartCostModal: React.FC<PartCostModalProps> = ({
  isOpen,
  onClose,
  initialPart,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<PartCostMasterItem>>({
    partNo: '',
    partName: '',
    partType: 'PUNCH',
    machineLine: 'ALL',
    newPurchasePrice: 12500,
    expectedNewToolLife: 15000000,
    actualNewToolLife: 15000000,
    supplier: 'MISUMI (THAILAND) CO., LTD.',
    currency: 'THB',
    effectiveDate: new Date().toISOString().slice(0, 10),
    nominalLengthMm: 45.0,
    minAllowedLengthMm: 43.5,
    maxRegrindCount: 12,
    disposeAfterOneUse: false,
    notes: ''
  });

  const [revisionReason, setRevisionReason] = useState<string>('');
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPart) {
      setFormData({ ...initialPart });
      setRevisionReason('');
    } else {
      setFormData({
        partNo: '',
        partName: '',
        partType: 'PUNCH',
        machineLine: 'ALL',
        newPurchasePrice: 12500,
        expectedNewToolLife: 15000000,
        actualNewToolLife: 15000000,
        supplier: 'MISUMI (THAILAND) CO., LTD.',
        currency: 'THB',
        effectiveDate: new Date().toISOString().slice(0, 10),
        nominalLengthMm: 45.0,
        minAllowedLengthMm: 43.5,
        maxRegrindCount: 12,
        disposeAfterOneUse: false,
        notes: ''
      });
      setRevisionReason('Initial Creation');
    }
    setErrorMsg(null);
    setShowRevisionHistory(false);
  }, [initialPart, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.partNo?.trim()) {
      setErrorMsg('กรุณากรอก Part No. (เช่น DWG-PB-001)');
      return;
    }
    if (!formData.partName?.trim()) {
      setErrorMsg('กรุณากรอก Part Name');
      return;
    }
    if (!formData.newPurchasePrice || formData.newPurchasePrice <= 0) {
      setErrorMsg('กรุณากรอกราคาซื้อใหม่ (New Purchase Price) ที่มากกว่า 0');
      return;
    }

    const payload: PartCostMasterItem = {
      id: initialPart?.id || `PCM-${formData.partNo?.trim()}`,
      partNo: formData.partNo?.trim().toUpperCase() || '',
      partName: formData.partName?.trim() || '',
      partType: formData.partType || 'PUNCH',
      machineLine: formData.machineLine || 'ALL',
      newPurchasePrice: Number(formData.newPurchasePrice),
      expectedNewToolLife: Number(formData.expectedNewToolLife || 15000000),
      actualNewToolLife: formData.actualNewToolLife ? Number(formData.actualNewToolLife) : undefined,
      supplier: formData.supplier || 'MISUMI (THAILAND)',
      currency: formData.currency || 'THB',
      effectiveDate: formData.effectiveDate || new Date().toISOString().slice(0, 10),
      drawingNo: formData.partNo?.trim(),
      nominalLengthMm: Number(formData.nominalLengthMm || 45.0),
      minAllowedLengthMm: Number(formData.minAllowedLengthMm || 43.5),
      maxRegrindCount: Number(formData.maxRegrindCount || 12),
      disposeAfterOneUse: !!formData.disposeAfterOneUse,
      priceRevisionHistory: initialPart?.priceRevisionHistory || [],
      notes: formData.notes || '',
      createdAt: initialPart?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = costSavingService.savePartCostMaster(payload, 'Die Engineering Admin', revisionReason);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    if (res.data) {
      onSaved(res.data);
    }
    onClose();
  };

  const isPriceChanged = initialPart && (initialPart.newPurchasePrice !== formData.newPurchasePrice || initialPart.currency !== formData.currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0c1018] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 text-white font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                {initialPart ? `แก้ไขทะเบียนต้นทุน Part: ${initialPart.partNo}` : 'เพิ่มทะเบียนต้นทุนแม่พิมพ์ใหม่ (New Part Cost Master)'}
              </h3>
              <p className="text-xs text-slate-400">
                กำหนดราคาจัดซื้อใหม่ อายุเป้าหมาย และข้อกำหนดวิศวกรรมเพื่อใช้เป็นฐานคำนวณ Saving
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {initialPart && initialPart.priceRevisionHistory && initialPart.priceRevisionHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRevisionHistory(!showRevisionHistory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showRevisionHistory 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>ประวัติราคา ({initialPart.priceRevisionHistory.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-500/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Price Revision History Panel */}
        {showRevisionHistory && initialPart && (
          <div className="mx-6 mt-4 p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl animate-fadeIn">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>ประวัติการปรับปรุงราคาจัดซื้อ (Price Revision Audit Trail)</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {initialPart.priceRevisionHistory.map((rev, idx) => (
                <div key={rev.id || idx} className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        ฿{rev.newPrice.toLocaleString()} {rev.currency}
                      </span>
                      {rev.oldPrice !== rev.newPrice && (
                        <span className="text-[10px] text-slate-500 line-through">
                          (เดิม ฿{rev.oldPrice.toLocaleString()})
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        มีผล: {rev.effectiveDate || rev.revisionDate.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {rev.reason} • โดย: {rev.changedBy}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {rev.revisionDate.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Part No. (รหัสแบบ/พาร์ท) *</label>
              <input
                type="text"
                required
                value={formData.partNo || ''}
                onChange={e => setFormData({ ...formData, partNo: e.target.value })}
                placeholder="DWG-PB-001"
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono uppercase focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Part Name (ชื่อชิ้นส่วนแม่พิมพ์) *</label>
              <input
                type="text"
                required
                value={formData.partName || ''}
                onChange={e => setFormData({ ...formData, partName: e.target.value })}
                placeholder="PIERCE PUNCH (Ø5)"
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Part Type (ประเภท)</label>
              <select
                value={formData.partType || 'PUNCH'}
                onChange={e => setFormData({ ...formData, partType: e.target.value as PartCategoryType })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
              >
                <option value="PUNCH">PUNCH (พั้นช์)</option>
                <option value="DIE">DIE (ดาย)</option>
                <option value="BLADE">BLADE (ใบมีดตัด)</option>
                <option value="PIN">PIN (สลัก/พิน)</option>
                <option value="CORNER_CUT">CORNER CUT</option>
                <option value="CENTER_PUNCH">CENTER PUNCH</option>
                <option value="OTHER">OTHER (อื่นๆ)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Machine Line (ไลน์ที่ใช้)</label>
              <select
                value={formData.machineLine || 'ALL'}
                onChange={e => setFormData({ ...formData, machineLine: e.target.value as ProductionLineId | 'ALL' })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="ALL">ALL LINES (ทุกไลน์)</option>
                <option value="E1">LINE E1</option>
                <option value="E2">LINE E2</option>
                <option value="E3-1">LINE E3</option>
                <option value="E4">LINE E4</option>
                <option value="E5">LINE E5</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">สกุลเงิน (Currency)</label>
              <select
                value={formData.currency || 'THB'}
                onChange={e => setFormData({ ...formData, currency: e.target.value as CurrencyCode })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              >
                <option value="THB">THB (บาท)</option>
                <option value="USD">USD ($)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">วันที่เริ่มมีผล (Effective Date)</label>
              <input
                type="date"
                value={formData.effectiveDate || ''}
                onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing & Tool Life */}
          <div className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>ราคาจัดซื้อใหม่และอายุการใช้งาน (Procurement Price & Tool Life)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ราคาซื้อใหม่ (New Purchase Price) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 font-mono">฿</span>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    required
                    value={formData.newPurchasePrice ?? 0}
                    onChange={e => setFormData({ ...formData, newPurchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono text-sm font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">อายุเป้าหมาย (Expected Life) [Shots]</label>
                <input
                  type="number"
                  min="100000"
                  step="500000"
                  value={formData.expectedNewToolLife || 15000000}
                  onChange={e => setFormData({ ...formData, expectedNewToolLife: parseInt(e.target.value) || 15000000 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">อายุจริงทางสถิติ (Actual Life) [Shots]</label>
                <input
                  type="number"
                  min="100000"
                  step="500000"
                  value={formData.actualNewToolLife || ''}
                  onChange={e => setFormData({ ...formData, actualNewToolLife: parseInt(e.target.value) || undefined })}
                  placeholder="เช่น 15,200,000"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* If price changed, ask for reason */}
            {isPriceChanged && (
              <div className="pt-2 border-t border-amber-500/30">
                <label className="block text-amber-300 mb-1 text-xs font-semibold">
                  * ตรวจพบการปรับเปลี่ยนราคาจัดซื้อ: กรุณาระบุเหตุผลการปรับปรุงราคา (Price Revision Reason)
                </label>
                <input
                  type="text"
                  required
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  placeholder="เช่น ต่อรองราคาประจำปี 2026 หรือ ปรับปรุงสัญญาคู่ค้าใหม่"
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Engineering Dimensions & Policies */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ความยาวสเปค (Nominal) [mm]</label>
              <input
                type="number"
                step="0.01"
                value={formData.nominalLengthMm || 45.0}
                onChange={e => setFormData({ ...formData, nominalLengthMm: parseFloat(e.target.value) || 45.0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ขีดจำกัดความยาว (Min Spec) [mm]</label>
              <input
                type="number"
                step="0.01"
                value={formData.minAllowedLengthMm || 43.5}
                onChange={e => setFormData({ ...formData, minAllowedLengthMm: parseFloat(e.target.value) || 43.5 })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">จำนวนครั้งเจียรสูงสุด (Max Cycles)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.maxRegrindCount ?? 12}
                onChange={e => setFormData({ ...formData, maxRegrindCount: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ผู้ผลิต/คู่ค้า (Supplier)</label>
              <input
                type="text"
                value={formData.supplier || ''}
                onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="MISUMI / SAN-EI"
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="disposeAfterOneUse"
              checked={formData.disposeAfterOneUse || false}
              onChange={e => setFormData({ ...formData, disposeAfterOneUse: e.target.checked })}
              className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="disposeAfterOneUse" className="text-xs text-rose-300 font-semibold cursor-pointer">
              ใช้งานครั้งเดียวทิ้ง (Dispose After One Use - ห้ามเจียรซ่อม)
            </label>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูล (Save Part Cost)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
