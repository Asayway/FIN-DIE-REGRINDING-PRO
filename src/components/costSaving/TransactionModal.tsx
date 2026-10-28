import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Wrench, 
  DollarSign, 
  TrendingUp, 
  Info,
  Calendar
} from 'lucide-react';
import { 
  RegrindingTransactionItem, 
  PartCostMasterItem, 
  QualityResultCode 
} from '../../types/costSaving';
import { ProductionLineId } from '../../types';
import { costSavingService } from '../../services/costSavingService';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTransaction?: RegrindingTransactionItem | null;
  onSaved: (tx: RegrindingTransactionItem) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialTransaction,
  onSaved
}) => {
  const masters = useMemo(() => costSavingService.getPartCostMasters(), [isOpen]);

  const [formData, setFormData] = useState<Partial<RegrindingTransactionItem>>({
    repairId: '',
    partNo: '',
    partName: '',
    machineLine: 'E1',
    repairDate: new Date().toISOString().slice(0, 10),
    regrindingNo: 1,
    repairCost: 1200,
    transportationCost: 100,
    internalLaborCost: 200,
    otherCost: 50,
    downtimeCost: 0,
    qualityLossCost: 0,
    shotCountBeforeRepair: 0,
    shotCountAfterRepair: 0,
    expectedLifeAfterRepair: 1500000,
    actualLifeAfterRepair: undefined,
    hasActualLife: false,
    supplier: 'SAN-EI PRECISION TOOLING (THAILAND)',
    qualityResult: 'PASS',
    remainingLengthMm: 44.5,
    grindDepthMm: 0.12,
    remarks: ''
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial transaction when editing
  useEffect(() => {
    if (initialTransaction) {
      setFormData({ ...initialTransaction });
    } else {
      const defaultPart = masters[0];
      setFormData({
        repairId: `REP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        partNo: defaultPart ? defaultPart.partNo : '',
        partName: defaultPart ? defaultPart.partName : '',
        machineLine: 'E1',
        repairDate: new Date().toISOString().slice(0, 10),
        regrindingNo: 1,
        repairCost: 1200,
        transportationCost: 100,
        internalLaborCost: 200,
        otherCost: 50,
        downtimeCost: 0,
        qualityLossCost: 0,
        shotCountBeforeRepair: 0,
        shotCountAfterRepair: 0,
        expectedLifeAfterRepair: 1500000,
        actualLifeAfterRepair: undefined,
        hasActualLife: false,
        supplier: 'SAN-EI PRECISION TOOLING (THAILAND)',
        qualityResult: 'PASS',
        remainingLengthMm: defaultPart ? defaultPart.nominalLengthMm - 0.12 : 44.88,
        grindDepthMm: 0.12,
        remarks: ''
      });
    }
    setValidationError(null);
  }, [initialTransaction, isOpen, masters]);

  // Selected Part Master
  const selectedPart = useMemo(() => {
    return masters.find(m => m.partNo.toUpperCase() === formData.partNo?.toUpperCase());
  }, [formData.partNo, masters]);

  // Real-time calculation preview
  const previewCalc = useMemo(() => {
    const newPrice = selectedPart ? selectedPart.newPurchasePrice : 15000;
    const expectedNewLife = selectedPart ? selectedPart.expectedNewToolLife : 15000000;
    const maxCycles = selectedPart ? selectedPart.maxRegrindCount : 12;

    return CostSavingCalculationService.computeTransactionMetrics({
      repairCost: Number(formData.repairCost || 0),
      transportationCost: Number(formData.transportationCost || 0),
      internalLaborCost: Number(formData.internalLaborCost || 0),
      otherCost: Number(formData.otherCost || 0),
      downtimeCost: Number(formData.downtimeCost || 0),
      qualityLossCost: Number(formData.qualityLossCost || 0),
      newPurchasePrice: newPrice,
      expectedNewToolLife: expectedNewLife,
      actualNewToolLife: selectedPart?.actualNewToolLife,
      expectedLifeAfterRepair: Number(formData.expectedLifeAfterRepair || 1500000),
      actualLifeAfterRepair: formData.hasActualLife ? Number(formData.actualLifeAfterRepair || 0) : undefined,
      regrindingNo: Number(formData.regrindingNo || 1),
      maxRegrindCount: maxCycles
    });
  }, [formData, selectedPart]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.repairId?.trim()) {
      setValidationError('กรุณาระบุ Repair ID');
      return;
    }
    if (!formData.partNo) {
      setValidationError('กรุณาเลือก Part No.');
      return;
    }
    if (!formData.repairDate) {
      setValidationError('กรุณาระบุวันที่ซ่อม (Repair Date)');
      return;
    }

    const payload: Partial<RegrindingTransactionItem> = {
      ...formData,
      repairId: formData.repairId.trim(),
      partName: selectedPart ? selectedPart.partName : (formData.partName || formData.partNo),
      actualLifeAfterRepair: formData.hasActualLife ? Number(formData.actualLifeAfterRepair || 0) : undefined
    };

    const res = costSavingService.saveTransaction(payload);
    if (!res.success) {
      setValidationError(res.message);
      return;
    }

    if (res.data) {
      onSaved(res.data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0c1018] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 text-white font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00FF7F]/10 border border-[#00FF7F]/30 flex items-center justify-center text-[#00FF7F]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                <span>{initialTransaction ? 'แก้ไขบันทึกงานเจียร (Edit Regrind Transaction)' : 'บันทึกงานเจียรและคำนวณต้นทุน (New Regrind Transaction)'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                ระบบคำนวณ Gross Saving, Net Saving และ Fair Normalized Cost ตามมาตรฐานวิศวกรรม
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

        {/* Error Alert */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-500/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Section 1: Identification & General Info */}
          <div>
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>1. ข้อมูลงานซ่อมและชิ้นส่วน (Identification & Tooling Part)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Repair ID (รหัสใบซ่อม) *</label>
                <input
                  type="text"
                  required
                  value={formData.repairId || ''}
                  onChange={e => setFormData({ ...formData, repairId: e.target.value })}
                  placeholder="REP-2026-0001"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Part No. (ชิ้นส่วนแม่พิมพ์) *</label>
                <select
                  value={formData.partNo || ''}
                  onChange={e => {
                    const pNo = e.target.value;
                    const p = masters.find(m => m.partNo === pNo);
                    setFormData({
                      ...formData,
                      partNo: pNo,
                      partName: p ? p.partName : formData.partName,
                      remainingLengthMm: p ? p.nominalLengthMm - ((formData.regrindingNo || 1) * 0.12) : formData.remainingLengthMm
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">-- เลือก Part No. --</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.partNo}>
                      {m.partNo} - {m.partName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Production Line (ไลน์ผลิต)</label>
                <select
                  value={formData.machineLine || 'E1'}
                  onChange={e => setFormData({ ...formData, machineLine: e.target.value as ProductionLineId })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                >
                  {['E1', 'E2', 'E3-1', 'E4', 'E5'].map(l => (
                    <option key={l} value={l}>LINE {l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Repair Date (วันที่ซ่อม) *</label>
                <input
                  type="date"
                  required
                  value={formData.repairDate || ''}
                  onChange={e => setFormData({ ...formData, repairDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Machine Cost Rate Master & Hours Inputs */}
          <div className="p-4 bg-slate-900/90 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. ต้นทุนเครื่องจักรเจียร & ค่าแรง (Machine & Labor Cost Engine)</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                คำนวณอัตโนมัติจากชั่วโมงจริง & Rate Master
              </span>
            </div>

            {/* Rate Master Selector Preset */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1 font-semibold">เลือกอัตราต้นทุนเครื่องจักร (Cost Rate Master Preset)</label>
                <select
                  value={formData.rateMasterId || ''}
                  onChange={e => {
                    const rId = e.target.value;
                    const rates = costSavingService.getCostRateMasters();
                    const selectedR = rates.find(r => r.id === rId);
                    if (selectedR) {
                      setFormData({
                        ...formData,
                        rateMasterId: selectedR.id,
                        rateMasterMachineName: selectedR.machineName,
                        machineCostRateRef: selectedR.machineCostRatePerHour,
                        laborRateRef: selectedR.includesLaborInMachineRate ? 0 : selectedR.operatorLaborRatePerHour,
                        includesLaborInMachineRate: selectedR.includesLaborInMachineRate,
                        actualConsumablesCost: formData.actualConsumablesCost ?? selectedR.consumablesCostRatePerHour ?? 50
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">-- กำหนดอัตราราคาเอง (Custom Rate) --</option>
                  {costSavingService.getCostRateMasters().map(r => (
                    <option key={r.id} value={r.id}>
                      {r.machineId}: {r.machineName} [Machine: ฿{r.machineCostRatePerHour}/hr, Labor: ฿{r.operatorLaborRatePerHour}/hr {r.includesLaborInMachineRate ? '(รวมค่าแรงแล้ว)' : ''}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">รอบการเจียร (Regrind Cycle No.)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.regrindingNo || 1}
                  onChange={e => setFormData({ ...formData, regrindingNo: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Hours and Rates Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ชั่วโมงเจียรจริง (Machine Hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.actualMachineHours ?? 1.8}
                  onChange={e => setFormData({ ...formData, actualMachineHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ชั่วโมงเซ็ตอัพจริง (Setup Hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.actualSetupHours ?? 0.5}
                  onChange={e => setFormData({ ...formData, actualSetupHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ชั่วโมงแรงช่างจริง (Labor Hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.actualLaborHours ?? 1.5}
                  onChange={e => setFormData({ ...formData, actualLaborHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">อัตราเครื่องจักร (THB/hr)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.machineCostRateRef ?? 350}
                  onChange={e => setFormData({ ...formData, machineCostRateRef: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Direct Costs Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-white/5 pt-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ค่าวัสดุสิ้นเปลือง (Consumables)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.actualConsumablesCost ?? 50}
                  onChange={e => setFormData({ ...formData, actualConsumablesCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ค่าขนส่ง (Freight)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.actualTransportationCost ?? 100}
                  onChange={e => setFormData({ ...formData, actualTransportationCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ค่า QC/ตรวจสอบ (QC Cost)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.actualQcCost ?? 0}
                  onChange={e => setFormData({ ...formData, actualQcCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">งบประมาณประมาณการ (Est Total)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.estimatedTotalRepairCost ?? 1000}
                  onChange={e => setFormData({ ...formData, estimatedTotalRepairCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Repair Cost Badge & Breakdown */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-cyan-300 font-bold">
                  Machine Cost: ฿{previewCalc.machineCost.toLocaleString()}
                </span>
                <span className="text-slate-500">+</span>
                <span className={`font-bold ${formData.includesLaborInMachineRate ? 'text-amber-400 line-through' : 'text-purple-300'}`}>
                  Labor Cost: ฿{previewCalc.laborCost.toLocaleString()} {formData.includesLaborInMachineRate ? '(รวมในเครื่องจักรแล้ว)' : ''}
                </span>
                <span className="text-slate-500">+</span>
                <span className="text-slate-300">
                  Consumables/Freight: ฿{((formData.actualConsumablesCost || 0) + (formData.actualTransportationCost || 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total Repair Cost:</span>
                <span className="text-base font-black text-[#00FF7F]">
                  ฿{previewCalc.totalRepairCost.toLocaleString()} THB
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Tool Life & Status (Actual vs Estimated) */}
          <div>
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>3. อายุการใช้งานและการประเมิน (Tool Life & Estimation Status)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">อายุคาดการณ์ (Expected Life) [Shots]</label>
                <input
                  type="number"
                  min="10000"
                  step="50000"
                  value={formData.expectedLifeAfterRepair || 1500000}
                  onChange={e => setFormData({ ...formData, expectedLifeAfterRepair: parseInt(e.target.value) || 1500000 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">อายุใช้งานจริง (Actual Life)</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasActualLife || false}
                      onChange={e => setFormData({ ...formData, hasActualLife: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>มีผลจริงแล้ว</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  disabled={!formData.hasActualLife}
                  value={formData.actualLifeAfterRepair ?? ''}
                  onChange={e => setFormData({ ...formData, actualLifeAfterRepair: parseInt(e.target.value) || 0 })}
                  placeholder={formData.hasActualLife ? 'ระบุจำนวน Shots จริง' : 'ยังไม่ระบุ (ใช้ค่าประมาณ)'}
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl font-mono focus:outline-none ${
                    formData.hasActualLife 
                      ? 'border-emerald-500/60 text-emerald-300' 
                      : 'border-white/10 text-slate-500 bg-slate-950/50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ผลการตรวจคุณภาพ (Quality Result)</label>
                <select
                  value={formData.qualityResult || 'PASS'}
                  onChange={e => setFormData({ ...formData, qualityResult: e.target.value as QualityResultCode })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                >
                  <option value="PASS">PASS (ผ่านเกณฑ์มาตรฐาน)</option>
                  <option value="CONDITIONAL">CONDITIONAL (ผ่านแบบมีเงื่อนไข)</option>
                  <option value="REWORK">REWORK (ต้องแก้ไขซ้ำ)</option>
                  <option value="SCRAP">SCRAP (ปลดระวาง/คัดทิ้ง)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ผู้ให้บริการ/ผู้เจียร (Supplier)</label>
                <input
                  type="text"
                  value={formData.supplier || ''}
                  onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="SAN-EI / MISUMI / Internal"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Impact costs: Downtime & Quality loss */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  ค่าสูญเสีย Downtime เพิ่มเติม (Downtime Loss Cost)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 font-mono">฿</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.downtimeCost ?? 0}
                    onChange={e => setFormData({ ...formData, downtimeCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  ค่าสูญเสียคุณภาพชิ้นงาน (Quality Scrap Loss Cost)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 font-mono">฿</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.qualityLossCost ?? 0}
                    onChange={e => setFormData({ ...formData, qualityLossCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Live Calculated Executive Preview */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-[#0a1220] to-slate-950 border border-[#00FF7F]/30 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="text-xs font-black text-[#00FF7F] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>ผลการคำนวณการประหยัดสุทธิ (Real-Time Saving Calculation Preview)</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                previewCalc.costPerShotIsEstimated 
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50' 
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
              }`}>
                {previewCalc.costPerShotIsEstimated ? 'ESTIMATED (ประมาณการ)' : 'ACTUAL VERIFIED (ผลจริง)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-black/40 rounded-2xl border border-white/5">
                <span className="block text-[10px] text-slate-400 mb-0.5">มูลค่าซื้อใหม่เทียบเคียง</span>
                <span className="text-sm font-black text-white font-mono">
                  ฿{previewCalc.newPurchaseEquivalentCost.toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-2xl border border-white/5">
                <span className="block text-[10px] text-slate-400 mb-0.5">ยอดประหยัดขั้นต้น (Gross)</span>
                <span className="text-sm font-black text-cyan-300 font-mono">
                  ฿{previewCalc.grossSaving.toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 bg-[#00FF7F]/10 rounded-2xl border border-[#00FF7F]/30">
                <span className="block text-[10px] text-emerald-300 mb-0.5">ยอดประหยัดสุทธิ (Net Saving)</span>
                <span className="text-base font-black text-[#00FF7F] font-mono">
                  ฿{previewCalc.netSaving.toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 bg-[#00FF7F]/10 rounded-2xl border border-[#00FF7F]/30">
                <span className="block text-[10px] text-emerald-300 mb-0.5">อัตราส่วนประหยัด (%)</span>
                <span className="text-base font-black text-[#00FF7F] font-mono">
                  {previewCalc.savingPercentage}%
                </span>
              </div>
            </div>

            {/* Cost Per Shot & Fair Comparison Strip */}
            <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-300">
              <div className="flex items-center gap-3">
                <span>ต้นทุนซื้อใหม่: <strong className="text-white font-mono">฿{previewCalc.newToolCostPerShot.toFixed(6)}</strong>/shot</span>
                <span>•</span>
                <span>ต้นทุนเจียรซ่อม: <strong className="text-[#00FF7F] font-mono">฿{previewCalc.regrindingCostPerShot.toFixed(6)}</strong>/shot</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {previewCalc.fairAssumptions}
              </div>
            </div>
          </div>

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
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#00FF7F] to-emerald-400 hover:from-[#00dd70] hover:to-emerald-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-[#00FF7F]/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกธุรกรรม (Save Transaction)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
