import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  History, 
  Info,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { CostRateMasterItem } from '../../types/costSaving';
import { costSavingService } from '../../services/costSavingService';

interface CostRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRate?: CostRateMasterItem | null;
  onSaved: () => void;
}

export const CostRateModal: React.FC<CostRateModalProps> = ({
  isOpen,
  onClose,
  initialRate,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<CostRateMasterItem>>({
    machineId: '',
    machineName: '',
    machineCostRatePerHour: 350.00,
    operatorLaborRatePerHour: 180.00,
    consumablesCostRatePerHour: 50.00,
    qcCostRatePerHour: 120.00,
    includesLaborInMachineRate: false,
    rateCalculationMethod: 'STANDARD_FACTORY_APPROVED',
    currency: 'THB',
    effectiveDate: new Date().toISOString().slice(0, 10),
    updatedBy: 'Authorized Engineer',
    isActive: true,
    notes: ''
  });

  const [revisionReason, setRevisionReason] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRate) {
      setFormData({ ...initialRate });
    } else {
      setFormData({
        machineId: `GRIND-${String(Date.now()).slice(-3)}`,
        machineName: '',
        machineCostRatePerHour: 350.00,
        operatorLaborRatePerHour: 180.00,
        consumablesCostRatePerHour: 50.00,
        qcCostRatePerHour: 120.00,
        includesLaborInMachineRate: false,
        rateCalculationMethod: 'STANDARD_FACTORY_APPROVED',
        currency: 'THB',
        effectiveDate: new Date().toISOString().slice(0, 10),
        updatedBy: 'Authorized Engineer',
        isActive: true,
        notes: ''
      });
    }
    setRevisionReason('');
    setShowHistory(false);
    setError(null);
  }, [initialRate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.machineId?.trim()) {
      setError('กรุณาระบุ Machine ID');
      return;
    }
    if (!formData.machineName?.trim()) {
      setError('กรุณาระบุชื่อเครื่องจักร / อุปกรณ์ (Machine Name)');
      return;
    }

    const payload: CostRateMasterItem = {
      id: formData.id || `CR-${formData.machineId}-${Date.now()}`,
      machineId: formData.machineId.trim().toUpperCase(),
      machineName: formData.machineName.trim(),
      machineCostRatePerHour: Number(formData.machineCostRatePerHour || 0),
      operatorLaborRatePerHour: Number(formData.operatorLaborRatePerHour || 0),
      consumablesCostRatePerHour: Number(formData.consumablesCostRatePerHour || 0),
      qcCostRatePerHour: Number(formData.qcCostRatePerHour || 0),
      includesLaborInMachineRate: !!formData.includesLaborInMachineRate,
      rateCalculationMethod: formData.rateCalculationMethod || 'STANDARD_FACTORY_APPROVED',
      currency: 'THB',
      effectiveDate: formData.effectiveDate || new Date().toISOString().slice(0, 10),
      updatedBy: formData.updatedBy || 'Authorized Engineer',
      isActive: formData.isActive !== false,
      notes: formData.notes || '',
      rateRevisionHistory: formData.rateRevisionHistory || [],
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = costSavingService.saveCostRateMaster(payload, payload.updatedBy, revisionReason);
    if (!res.success) {
      setError(res.message);
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0c1018] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 text-white font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                {initialRate ? 'แก้ไขอัตราต้นทุนเครื่องจักร & ค่าแรง (Edit Cost Rate Master)' : 'ตั้งค่าอัตราต้นทุนเครื่องจักรใหม่ (New Machine Cost Rate)'}
              </h3>
              <p className="text-xs text-slate-400">
                กำหนด Machine Cost Rate และ Labor Rate สำหรับใช้คำนวณงานเจียรซ่อมพร้อมประวัติการเปลี่ยนอัตรา
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-500/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Machine Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Machine ID / Code *</label>
              <input
                type="text"
                required
                value={formData.machineId || ''}
                onChange={e => setFormData({ ...formData, machineId: e.target.value })}
                placeholder="GRIND-01"
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ชื่อเครื่องจักร / อุปกรณ์ (Machine Name) *</label>
              <input
                type="text"
                required
                value={formData.machineName || ''}
                onChange={e => setFormData({ ...formData, machineName: e.target.value })}
                placeholder="OKAMOTO High-Precision Surface Grinder #1"
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Cost Rates per Hour */}
          <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl space-y-4">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>อัตราค่าใช้จ่ายต่อชั่วโมง (Cost Rates per Hour - THB/Hour)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Machine Cost Rate (บาท/ชม.) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={formData.machineCostRatePerHour ?? 350}
                  onChange={e => setFormData({ ...formData, machineCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Labor Rate ช่าง (บาท/ชม.) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={formData.operatorLaborRatePerHour ?? 180}
                  onChange={e => setFormData({ ...formData, operatorLaborRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Consumables Rate (บาท/ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.consumablesCostRatePerHour ?? 50}
                  onChange={e => setFormData({ ...formData, consumablesCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">QC Rate (บาท/ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.qcCostRatePerHour ?? 120}
                  onChange={e => setFormData({ ...formData, qcCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* CRITICAL DOUBLE-COUNTING SAFEGUARD TOGGLE */}
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="includesLaborInMachineRate"
                checked={formData.includesLaborInMachineRate || false}
                onChange={e => setFormData({ ...formData, includesLaborInMachineRate: e.target.checked })}
                className="mt-0.5 rounded accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="includesLaborInMachineRate" className="text-xs text-amber-200 cursor-pointer select-none">
                <strong className="block text-amber-300 font-bold">
                  อัตราค่าเครื่องจักร (Machine Cost Rate) รวมค่าแรงช่างประจำเครื่องจักรแล้ว (Includes Operator Labor)
                </strong>
                <span className="text-[11px] text-slate-300">
                  หากติ๊กถูก ระบบจะกำหนดค่าแรงส่วนช่างให้เป็น 0 โดยอัตโนมัติในการคำนวณงานซ่อม เพื่อป้องกันการคำนวณต้นทุนค่าแรงซ้ำ (Prevent Double-Counting)
                </span>
              </label>
            </div>
          </div>

          {/* Method & Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">วิธีคิดต้นทุน (Rate Calculation Method)</label>
              <select
                value={formData.rateCalculationMethod || 'STANDARD_FACTORY_APPROVED'}
                onChange={e => setFormData({ ...formData, rateCalculationMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="STANDARD_FACTORY_APPROVED">STANDARD_FACTORY_APPROVED (มาตรฐานโรงงานอนุมัติ)</option>
                <option value="FULL_COSTING">FULL_COSTING (ต้นทุนเต็มรวมโควต้าค่าใช้จ่าย)</option>
                <option value="DIRECT_COSTING">DIRECT_COSTING (คิดเฉพาะผันแปรทางตรง)</option>
                <option value="ACTIVITY_BASED">ACTIVITY_BASED (ตามฐานกิจกรรม ABC)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">วันที่มีผลบังคับใช้ (Effective Date)</label>
              <input
                type="date"
                required
                value={formData.effectiveDate || ''}
                onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ผู้อนุมัติ/ผู้ปรับปรุง (Updated By)</label>
              <input
                type="text"
                value={formData.updatedBy || ''}
                onChange={e => setFormData({ ...formData, updatedBy: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Reason for Revision */}
          {initialRate && (
            <div>
              <label className="block text-slate-400 mb-1 text-xs font-semibold">เหตุผลการปรับปรุงอัตรา (Reason for Revision / Change Log)</label>
              <input
                type="text"
                value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)}
                placeholder="เช่น ปรับเพิ่มอัตราค่าไฟฟ้า / ทบทวนงบประมาณประจำปี 2026"
                className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-200 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-400 mb-1 text-xs font-semibold">หมายเหตุรายละเอียดการจัดสรรต้นทุน (Notes & Breakdown)</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ระบุรายละเอียดองค์ประกอบต้นทุน เช่น ค่าเสื่อมราคา ค่าบำรุงรักษา preventative maintenance ค่าพลังงาน"
              className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Revision History Viewer Toggle */}
          {initialRate && initialRate.rateRevisionHistory && initialRate.rateRevisionHistory.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>{showHistory ? 'ซ่อนประวัติการเปลี่ยนแปลงอัตรา' : `ประวัติการปรับปรุงอัตรา (${initialRate.rateRevisionHistory.length} รายการ)`}</span>
              </button>

              {showHistory && (
                <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 max-h-40 overflow-y-auto space-y-2 text-[11px] font-mono">
                  {initialRate.rateRevisionHistory.map(rev => (
                    <div key={rev.id} className="p-2 bg-slate-900/90 rounded-lg border border-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-cyan-300 font-bold">มีผล: {rev.effectiveDate}</span>
                        <span className="text-slate-500">{new Date(rev.revisionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-200">
                        Machine Rate: <span className="line-through text-slate-500">฿{rev.oldMachineRate}</span> ➔ <strong className="text-emerald-400">฿{rev.newMachineRate}</strong> | 
                        Labor Rate: <span className="line-through text-slate-500">฿{rev.oldLaborRate}</span> ➔ <strong className="text-emerald-400">฿{rev.newLaborRate}</strong>
                      </div>
                      <div className="text-slate-400 italic">โดย: {rev.changedBy} - "{rev.reason}"</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition-all"
            >
              ยกเลิก (Cancel)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกอัตราต้นทุน (Save Rate Master)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
