import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  History, 
  Info,
  CheckCircle2,
  DollarSign,
  Zap,
  ShieldCheck,
  Calculator,
  ChevronDown,
  ChevronUp,
  Percent,
  Layers,
  Wrench,
  Sparkles
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
    machineCostRatePerHour: 300.00,
    operatorLaborRatePerHour: 180.00,
    consumablesCostRatePerHour: 35.00,
    consumablesFixedCostPerJob: 30.00,
    qcCostRatePerHour: 120.00,
    includesLaborInMachineRate: false,
    ratedPowerKw: 15.0,
    loadFactorPercent: 75.0,
    electricityPricePerKwh: 4.50,
    auxiliaryPowerKw: 0.0,
    depreciationCostPerHour: 0,
    maintenanceCostPerHour: 0,
    coolantCostPerHour: 0,
    machineToolingCostPerHour: 0,
    factoryOverheadCostPerHour: 0,
    otherMachineCostPerHour: 0,
    rateCalculationMethod: 'STANDARD_FACTORY_APPROVED',
    currency: 'THB',
    effectiveDate: new Date().toISOString().slice(0, 10),
    updatedBy: 'Authorized Engineer',
    isActive: true,
    notes: ''
  });

  const [revisionReason, setRevisionReason] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showOptionalBreakdown, setShowOptionalBreakdown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculation Preview Sandbox State (Pre-populated with Burring Punch Benchmark)
  const [previewMachineHours, setPreviewMachineHours] = useState<number>(2.00);
  const [previewSetupLaborHours, setPreviewSetupLaborHours] = useState<number>(0.50);
  const [previewDirectLaborHours, setPreviewDirectLaborHours] = useState<number>(1.00);
  const [previewQcHours, setPreviewQcHours] = useState<number>(0.25);
  const [previewRepairQuantity, setPreviewRepairQuantity] = useState<number>(10);
  const [previewNewPurchasePrice, setPreviewNewPurchasePrice] = useState<number>(850.00);

  useEffect(() => {
    if (initialRate) {
      setFormData({
        ...initialRate,
        ratedPowerKw: initialRate.ratedPowerKw !== undefined ? initialRate.ratedPowerKw : 15.0,
        loadFactorPercent: initialRate.loadFactorPercent !== undefined ? initialRate.loadFactorPercent : 75.0,
        electricityPricePerKwh: initialRate.electricityPricePerKwh !== undefined ? initialRate.electricityPricePerKwh : 4.50,
        auxiliaryPowerKw: initialRate.auxiliaryPowerKw !== undefined ? initialRate.auxiliaryPowerKw : 0.0,
        consumablesFixedCostPerJob: initialRate.consumablesFixedCostPerJob !== undefined ? initialRate.consumablesFixedCostPerJob : 30.00,
        consumablesCostRatePerHour: initialRate.consumablesCostRatePerHour !== undefined ? initialRate.consumablesCostRatePerHour : 35.00,
        machineCostRatePerHour: initialRate.machineCostRatePerHour !== undefined ? initialRate.machineCostRatePerHour : 300.00,
        operatorLaborRatePerHour: initialRate.operatorLaborRatePerHour !== undefined ? initialRate.operatorLaborRatePerHour : 180.00,
        qcCostRatePerHour: initialRate.qcCostRatePerHour !== undefined ? initialRate.qcCostRatePerHour : 120.00
      });
    } else {
      setFormData({
        machineId: `GRIND-${String(Date.now()).slice(-3)}`,
        machineName: '',
        machineCostRatePerHour: 300.00,
        operatorLaborRatePerHour: 180.00,
        consumablesCostRatePerHour: 35.00,
        consumablesFixedCostPerJob: 30.00,
        qcCostRatePerHour: 120.00,
        includesLaborInMachineRate: false,
        ratedPowerKw: 15.0,
        loadFactorPercent: 75.0,
        electricityPricePerKwh: 4.50,
        auxiliaryPowerKw: 0.0,
        depreciationCostPerHour: 0,
        maintenanceCostPerHour: 0,
        coolantCostPerHour: 0,
        machineToolingCostPerHour: 0,
        factoryOverheadCostPerHour: 0,
        otherMachineCostPerHour: 0,
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

  // Real-time Electricity Cost per Hour calculation
  // Formula: ((Rated Power * Load Factor / 100) + Auxiliary Power) * Electricity Price
  const calculatedElectricityCostPerHour = useMemo(() => {
    const power = Number(formData.ratedPowerKw || 0);
    const loadFactor = Number(formData.loadFactorPercent || 0);
    const aux = Number(formData.auxiliaryPowerKw || 0);
    const price = Number(formData.electricityPricePerKwh || 0);

    const effectiveKw = (power * (loadFactor / 100)) + aux;
    const cost = effectiveKw * price;
    return Number(cost.toFixed(2));
  }, [formData.ratedPowerKw, formData.loadFactorPercent, formData.auxiliaryPowerKw, formData.electricityPricePerKwh]);

  // Optional Breakdown Sum
  const calculatedBreakdownSum = useMemo(() => {
    const dep = Number(formData.depreciationCostPerHour || 0);
    const maint = Number(formData.maintenanceCostPerHour || 0);
    const cool = Number(formData.coolantCostPerHour || 0);
    const tool = Number(formData.machineToolingCostPerHour || 0);
    const ovh = Number(formData.factoryOverheadCostPerHour || 0);
    const oth = Number(formData.otherMachineCostPerHour || 0);
    return Number((dep + calculatedElectricityCostPerHour + maint + cool + tool + ovh + oth).toFixed(2));
  }, [
    formData.depreciationCostPerHour,
    calculatedElectricityCostPerHour,
    formData.maintenanceCostPerHour,
    formData.coolantCostPerHour,
    formData.machineToolingCostPerHour,
    formData.factoryOverheadCostPerHour,
    formData.otherMachineCostPerHour
  ]);

  // Sandbox Calculation Preview Engine (Matching Burring Punch Benchmark)
  const previewResults = useMemo(() => {
    const mHours = Math.max(0, previewMachineHours);
    const sHours = Math.max(0, previewSetupLaborHours);
    const dHours = Math.max(0, previewDirectLaborHours);
    const qHours = Math.max(0, previewQcHours);
    const qty = Math.max(0, previewRepairQuantity);
    const newPricePerPc = Math.max(0, previewNewPurchasePrice);

    const mRate = Number(formData.machineCostRatePerHour || 0);
    const lRate = Number(formData.operatorLaborRatePerHour || 0);
    const cVarRate = Number(formData.consumablesCostRatePerHour || 0);
    const cFixedCost = Number(formData.consumablesFixedCostPerJob || 0);
    const qRate = Number(formData.qcCostRatePerHour || 0);
    const isLaborIncluded = !!formData.includesLaborInMachineRate;

    // Machine Cost = Machine Hours * Machine Rate
    const machineCost = Number((mHours * mRate).toFixed(2));

    // Setup Labor Cost (Manual setup outside machine running)
    const setupLaborCost = Number((sHours * lRate).toFixed(2));

    // Direct Labor Cost during Machine Running:
    // If Machine Rate includes operator labor, direct running labor = 0!
    const directLaborCost = isLaborIncluded 
      ? 0 
      : Number((dHours * lRate).toFixed(2));

    const totalLaborCost = Number((setupLaborCost + directLaborCost).toFixed(2));

    // Consumables Cost = (Machine Hours * Variable Rate) + Fixed Cost
    const consumablesCost = Number(((mHours * cVarRate) + cFixedCost).toFixed(2));

    // QC Cost = QC Hours * QC Rate
    const qcCost = Number((qHours * qRate).toFixed(2));

    // Total Repair Cost = Machine + Labor + Consumables + QC
    const totalRepairCost = Number((machineCost + totalLaborCost + consumablesCost + qcCost).toFixed(2));

    // Repair Cost per Piece (zero division guard)
    const costPerPiece = qty > 0 ? Number((totalRepairCost / qty).toFixed(2)) : 0;

    // Equivalent New Purchase Cost
    const equivalentNewCost = Number((qty * newPricePerPc).toFixed(2));

    // Estimated Saving
    const estimatedSaving = Math.max(0, Number((equivalentNewCost - totalRepairCost).toFixed(2)));
    const savingPercent = equivalentNewCost > 0 
      ? Number(((estimatedSaving / equivalentNewCost) * 100).toFixed(2)) 
      : 0;

    return {
      machineCost,
      setupLaborCost,
      directLaborCost,
      totalLaborCost,
      consumablesCost,
      qcCost,
      totalRepairCost,
      costPerPiece,
      equivalentNewCost,
      estimatedSaving,
      savingPercent,
      isQtyZero: qty === 0
    };
  }, [
    previewMachineHours,
    previewSetupLaborHours,
    previewDirectLaborHours,
    previewQcHours,
    previewRepairQuantity,
    previewNewPurchasePrice,
    formData.machineCostRatePerHour,
    formData.operatorLaborRatePerHour,
    formData.consumablesCostRatePerHour,
    formData.consumablesFixedCostPerJob,
    formData.qcCostRatePerHour,
    formData.includesLaborInMachineRate
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict Validation
    if (!formData.machineId?.trim()) {
      setError('กรุณาระบุ Machine ID / Code');
      return;
    }
    if (!formData.machineName?.trim()) {
      setError('กรุณาระบุชื่อเครื่องจักร / อุปกรณ์ (Machine Name)');
      return;
    }
    if (!formData.effectiveDate) {
      setError('กรุณาระบุวันที่มีผลบังคับใช้ (Effective Date)');
      return;
    }
    if (initialRate && !revisionReason.trim()) {
      setError('กรุณาระบุเหตุผลการปรับปรุงอัตรา (Reason for Revision)');
      return;
    }

    // Number validations
    const mRate = Number(formData.machineCostRatePerHour);
    const lRate = Number(formData.operatorLaborRatePerHour);
    const cVarRate = Number(formData.consumablesCostRatePerHour);
    const cFixedCost = Number(formData.consumablesFixedCostPerJob);
    const qRate = Number(formData.qcCostRatePerHour);
    const power = Number(formData.ratedPowerKw);
    const loadF = Number(formData.loadFactorPercent);
    const ePrice = Number(formData.electricityPricePerKwh);

    if (mRate < 0 || lRate < 0 || cVarRate < 0 || cFixedCost < 0 || qRate < 0) {
      setError('อัตราค่าใช้จ่าย (Rate) ทุกช่องต้องเป็นค่าบวกหรือเท่ากับ 0');
      return;
    }
    if (power < 0 || ePrice < 0) {
      setError('กำลังไฟ (Rated Power) และค่าไฟฟ้า (Electricity Price) ต้องไม่ติดลบ');
      return;
    }
    if (loadF < 0 || loadF > 100) {
      setError('Load Factor ต้องอยู่ระหว่าง 0% ถึง 100%');
      return;
    }

    const payload: CostRateMasterItem = {
      id: formData.id || `CR-${formData.machineId}-${Date.now()}`,
      machineId: formData.machineId.trim().toUpperCase(),
      machineName: formData.machineName.trim(),
      machineCostRatePerHour: Number(mRate.toFixed(2)),
      operatorLaborRatePerHour: Number(lRate.toFixed(2)),
      consumablesCostRatePerHour: Number(cVarRate.toFixed(2)),
      consumablesFixedCostPerJob: Number(cFixedCost.toFixed(2)),
      qcCostRatePerHour: Number(qRate.toFixed(2)),
      includesLaborInMachineRate: !!formData.includesLaborInMachineRate,
      ratedPowerKw: Number(power.toFixed(2)),
      loadFactorPercent: Number(loadF.toFixed(2)),
      electricityPricePerKwh: Number(ePrice.toFixed(2)),
      auxiliaryPowerKw: Number((formData.auxiliaryPowerKw || 0).toFixed(2)),
      depreciationCostPerHour: formData.depreciationCostPerHour ? Number(formData.depreciationCostPerHour) : undefined,
      maintenanceCostPerHour: formData.maintenanceCostPerHour ? Number(formData.maintenanceCostPerHour) : undefined,
      coolantCostPerHour: formData.coolantCostPerHour ? Number(formData.coolantCostPerHour) : undefined,
      machineToolingCostPerHour: formData.machineToolingCostPerHour ? Number(formData.machineToolingCostPerHour) : undefined,
      factoryOverheadCostPerHour: formData.factoryOverheadCostPerHour ? Number(formData.factoryOverheadCostPerHour) : undefined,
      otherMachineCostPerHour: formData.otherMachineCostPerHour ? Number(formData.otherMachineCostPerHour) : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0c1018] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 text-white font-sans max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                {initialRate ? 'แก้ไขอัตราต้นทุนเครื่องจักร & ค่าแรง (Edit Cost Rate Master)' : 'ตั้งค่าอัตราต้นทุนเครื่องจักรใหม่ (New Machine Cost Rate)'}
              </h3>
              <p className="text-xs text-slate-400">
                กำหนด Machine Cost Rate, Labor Rate, ค่าไฟฟ้า และ Consumables พร้อมระบบตรวจสอบคำนวณป้องกันค่าแรงซ้ำ
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
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-500/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* ======================================================== */}
          {/* SECTION A: ข้อมูลเครื่องจักร & ค่าพลังงานไฟฟ้า           */}
          {/* ======================================================== */}
          <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>SECTION A: ข้อมูลเครื่องจักร & ค่าพลังงานไฟฟ้า (Machine & Power Specs)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Physics & Electricity Baseline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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

              <div className="sm:col-span-2">
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

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Rated Power (กำลังไฟ, kW)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.ratedPowerKw ?? 15}
                  onChange={e => setFormData({ ...formData, ratedPowerKw: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Load Factor (% ภาระโหลดใช้งาน)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.loadFactorPercent ?? 75}
                  onChange={e => setFormData({ ...formData, loadFactorPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Electricity Price (ค่าไฟ, บาท/kWh)</label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={formData.electricityPricePerKwh ?? 4.50}
                  onChange={e => setFormData({ ...formData, electricityPricePerKwh: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-amber-300 font-bold font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Auxiliary Power (ไฟช่วย/ปั๊ม, kW)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.auxiliaryPowerKw ?? 0}
                  onChange={e => setFormData({ ...formData, auxiliaryPowerKw: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">วิธีคิดต้นทุน (Calculation Method)</label>
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
                <label className="block text-slate-400 mb-1 font-semibold">ผู้อนุมัติ/ผู้ปรับปรุง (Updated By)</label>
                <input
                  type="text"
                  value={formData.updatedBy || ''}
                  onChange={e => setFormData({ ...formData, updatedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Electricity Output Badge */}
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300">
                  ค่าไฟฟ้าคำนวณได้: (({formData.ratedPowerKw || 0} kW × {formData.loadFactorPercent || 0}% / 100) + {formData.auxiliaryPowerKw || 0} kW) × ฿{formData.electricityPricePerKwh || 0}/kWh
                </span>
              </div>
              <div className="text-amber-300 font-bold text-sm">
                = ฿{calculatedElectricityCostPerHour.toFixed(2)} / ชม.
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION B: อัตราต้นทุนต่อชั่วโมง & วัสดุสิ้นเปลือง        */}
          {/* ======================================================== */}
          <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <span>SECTION B: อัตราต้นทุนต่อชั่วโมง & วัสดุสิ้นเปลือง (Hourly Rates & Consumables)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold">
                * ต้องได้รับการยืนยันจาก Cost Control / บัญชีก่อนใช้เป็นอัตราทางการ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Machine Cost Rate (บาท/ชม.) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={formData.machineCostRatePerHour ?? 300}
                  onChange={e => setFormData({ ...formData, machineCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-cyan-300 font-bold font-mono focus:border-cyan-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formData.includesLaborInMachineRate ? '(รวมค่าแรงช่างประจำเครื่อง)' : '(ไม่รวมค่าแรงช่าง)'}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold flex items-center justify-between">
                  <span>Labor Rate ช่าง (บาท/ชม.) *</span>
                  {formData.includesLaborInMachineRate && (
                    <span className="text-[10px] text-amber-400 font-normal">Read-only (Machine Running)</span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="5"
                  value={formData.operatorLaborRatePerHour ?? 180}
                  onChange={e => setFormData({ ...formData, operatorLaborRatePerHour: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl font-mono focus:outline-none ${
                    formData.includesLaborInMachineRate 
                      ? 'border-amber-500/50 text-amber-300 bg-amber-950/20' 
                      : 'border-white/15 text-emerald-400 focus:border-cyan-400'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {formData.includesLaborInMachineRate 
                    ? 'ยังใช้อัตรานี้คิด Setup Labor นอกเวลาเดินเครื่อง' 
                    : 'คิดตามชั่วโมงช่างปฏิบัติงานจริง'}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">QC Inspection Rate (บาท/ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.qcCostRatePerHour ?? 120}
                  onChange={e => setFormData({ ...formData, qcCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">อัตราค่าตรวจรับรองมาตรฐาน QC</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Consumables Variable Rate (บาท/ชม.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.consumablesCostRatePerHour ?? 35}
                  onChange={e => setFormData({ ...formData, consumablesCostRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">เช่น น้ำยาขัดเงา, หินเจียรสึกหรอ</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Consumables Fixed Cost (บาท/รายการซ่อม)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.consumablesFixedCostPerJob ?? 30}
                  onChange={e => setFormData({ ...formData, consumablesFixedCostPerJob: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">เช่น ผ้าเช็ด, สเปรย์กันสนิม, เทปป้องกัน</span>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setShowOptionalBreakdown(!showOptionalBreakdown)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-xs font-bold flex items-center justify-between cursor-pointer transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>แจกแจงต้นทุนย่อย (Optional Breakdown)</span>
                  </span>
                  {showOptionalBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Granular Machine Cost Breakdown Drawer */}
            {showOptionalBreakdown && (
              <div className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 text-[11px] text-slate-400">
                  <span>แจกแจงองค์ประกอบต้นทุนเครื่องจักรต่อชั่วโมง (Calculated Components)</span>
                  <span className="text-cyan-300 font-mono font-bold">ผลรวมประมาณการ: ฿{calculatedBreakdownSum} / ชม.</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ค่าเสื่อมราคา</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.depreciationCostPerHour || 0}
                      onChange={e => setFormData({ ...formData, depreciationCostPerHour: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-300 mb-1">ค่าไฟฟ้า (Auto)</label>
                    <input
                      type="number"
                      disabled
                      value={calculatedElectricityCostPerHour}
                      className="w-full px-2 py-1 bg-slate-900 border border-amber-500/30 rounded-lg text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ค่าบำรุงรักษา</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maintenanceCostPerHour || 0}
                      onChange={e => setFormData({ ...formData, maintenanceCostPerHour: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Coolant/หล่อเย็น</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.coolantCostPerHour || 0}
                      onChange={e => setFormData({ ...formData, coolantCostPerHour: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Tooling/หินเจียร</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.machineToolingCostPerHour || 0}
                      onChange={e => setFormData({ ...formData, machineToolingCostPerHour: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">โสหุ้ย/Overhead</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.factoryOverheadCostPerHour || 0}
                      onChange={e => setFormData({ ...formData, factoryOverheadCostPerHour: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION C: ป้องกันค่าแรงซ้ำ (Double-Counting Prevention)   */}
          {/* ======================================================== */}
          <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SECTION C: นโยบายป้องกันค่าแรงซ้ำ (Double-Counting Prevention Engine)</span>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all ${
              formData.includesLaborInMachineRate 
                ? 'bg-amber-950/40 border-amber-500/50' 
                : 'bg-emerald-950/30 border-emerald-500/40'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="includesLaborInMachineRate"
                  checked={formData.includesLaborInMachineRate || false}
                  onChange={e => setFormData({ ...formData, includesLaborInMachineRate: e.target.checked })}
                  className="mt-1 rounded accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="includesLaborInMachineRate" className="text-xs font-bold cursor-pointer select-none block">
                    <span className={formData.includesLaborInMachineRate ? 'text-amber-300' : 'text-emerald-300'}>
                      อัตราค่าเครื่องจักร (Machine Cost Rate) รวมค่าแรงช่างประจำเครื่องจักรแล้ว (Includes Operator Labor)
                    </span>
                  </label>
                  
                  {formData.includesLaborInMachineRate ? (
                    <div className="mt-1.5 p-2 bg-amber-900/40 rounded-lg border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                      <strong className="block text-amber-300">
                        ⚠️ อัตราค่าเครื่องจักรรวมค่าแรง Operator แล้ว ระบบจะไม่นำค่าแรงมาคำนวณซ้ำกับเวลาเดินเครื่อง
                      </strong>
                      <p className="text-slate-300">
                        • ในช่วงเวลาเดินเครื่องจักร (Machine Running Hours): ต้นทุนค่าแรง Operator จะถูกคำนวณเป็น ฿0.00 โดยอัตโนมัติ เพื่อป้องกันการนับซ้ำ<br />
                        • หากมีงานตั้งค่าชิ้นงาน (Setup Labor) หรือเตรียมการก่อน/หลังเดินเครื่อง ระบบจะยังคงคำนวณจากอัตราค่าแรงช่างตามปกติ
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-300">
                      ✓ อัตราค่าเครื่องจักรแยกเฉพาะค่าอุปกรณ์และพลังงาน — ระบบจะคำนวณค่าแรงช่าง (Labor Cost) ตามชั่วโมงการปฏิบัติงานจริงของพนักงาน
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION D: REVISION & NOTES                               */}
          {/* ======================================================== */}
          <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>SECTION D: การอนุมัติและประวัติการแก้ไข (Revision Log & Notes)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Effective Date & Audit Trail</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">วันที่มีผลบังคับใช้ (Effective Date) *</label>
                <input
                  type="date"
                  required
                  value={formData.effectiveDate || ''}
                  onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  เหตุผลการปรับปรุงอัตรา (Reason for Revision / Change Log) {initialRate ? '*' : ''}
                </label>
                <input
                  type="text"
                  required={!!initialRate}
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  placeholder="เช่น ปรับเพิ่มอัตราค่าไฟฟ้า 4.50 บาท / ทบทวนงบประมาณประจำปี 2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-amber-200 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-xs font-semibold">
                หมายเหตุรายละเอียดการจัดสรรต้นทุน (Notes & Breakdown)
              </label>
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
              <div className="border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>{showHistory ? 'ซ่อนประวัติการเปลี่ยนแปลงอัตรา' : `ประวัติการปรับปรุงอัตรา (${initialRate.rateRevisionHistory.length} รายการ)`}</span>
                </button>

                {showHistory && (
                  <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 max-h-44 overflow-y-auto space-y-2 text-[11px] font-mono custom-scrollbar">
                    {initialRate.rateRevisionHistory.map(rev => (
                      <div key={rev.id} className="p-2.5 bg-slate-900/90 rounded-lg border border-white/5 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-cyan-300 font-bold">มีผล: {rev.effectiveDate}</span>
                          <span className="text-slate-500">{new Date(rev.revisionDate).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-200">
                          Machine Rate: <span className="line-through text-slate-500">฿{rev.oldMachineRate}</span> ➔ <strong className="text-emerald-400">฿{rev.newMachineRate}</strong> | 
                          Labor Rate: <span className="line-through text-slate-500">฿{rev.oldLaborRate}</span> ➔ <strong className="text-emerald-400">฿{rev.newLaborRate}</strong>
                        </div>
                        <div className="text-slate-400 flex items-center justify-between">
                          <span>โดย: {rev.changedBy} - "{rev.reason}"</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded ${rev.includesLaborInMachineRate ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                            {rev.includesLaborInMachineRate ? 'รวมค่าแรงแล้ว' : 'แยกค่าแรง'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* CALCULATION PREVIEW SANDBOX (Burring Punch Benchmark)    */}
          {/* ======================================================== */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-[#0d1628] to-slate-950 border border-cyan-500/40 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  ตัวอย่างการคำนวณต้นทุนการซ่อมจริง (Real-Time Calculation Preview Sandbox)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BENCHMARK: BURRING PUNCH (10 PCS)
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              ทดสอบจำลองคำนวณต้นทุนงานซ่อมตามอัตราที่กำหนดข้างต้น เพื่อตรวจสอบความถูกต้องและความคุ้มค่าก่อนบันทึกระบบ
            </p>

            {/* Sandbox Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Machine Hours (ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={previewMachineHours}
                  onChange={e => setPreviewMachineHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-cyan-300 text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Setup Labor (ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={previewSetupLaborHours}
                  onChange={e => setPreviewSetupLaborHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Direct Labor (ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={previewDirectLaborHours}
                  onChange={e => setPreviewDirectLaborHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">QC Hours (ชม.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={previewQcHours}
                  onChange={e => setPreviewQcHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">จำนวนชิ้นงาน (ชิ้น)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={previewRepairQuantity}
                  onChange={e => setPreviewRepairQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-emerald-400 text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ราคาซื้อใหม่ (บาท/ชิ้น)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={previewNewPurchasePrice}
                  onChange={e => setPreviewNewPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-amber-300 text-center font-bold"
                />
              </div>
            </div>

            {/* Benchmark Test Result Display with 5-Step Badges */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-white/10 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-b border-white/5 pb-3">
                <div className="p-2 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 mb-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/30 flex items-center justify-center text-[8px]">1</span>
                    <span>STEP 1: เครื่องจักร</span>
                  </div>
                  <span className="text-cyan-300 font-bold block text-sm">฿{previewResults.machineCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block">({previewMachineHours}h × ฿{formData.machineCostRatePerHour || 0})</span>
                </div>

                <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 mb-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 flex items-center justify-center text-[8px]">2</span>
                    <span>STEP 2: ค่าแรงช่าง</span>
                  </div>
                  <span className="text-emerald-400 font-bold block text-sm">฿{previewResults.totalLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block truncate" title={formData.includesLaborInMachineRate ? 'รวมในเครื่องแล้ว' : 'คิดตามชั่วโมงจริง'}>
                    {formData.includesLaborInMachineRate 
                      ? `Setup ฿${previewResults.setupLaborCost} (เดินเครื่อง ฿0)` 
                      : `Setup ฿${previewResults.setupLaborCost} + เดิน ฿${previewResults.directLaborCost}`}
                  </span>
                </div>

                <div className="p-2 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-400 mb-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500/30 flex items-center justify-center text-[8px]">3</span>
                    <span>STEP 3: สิ้นเปลือง</span>
                  </div>
                  <span className="text-amber-300 font-bold block text-sm">฿{previewResults.consumablesCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block">
                    ({previewMachineHours}h×฿{formData.consumablesCostRatePerHour || 0} + ฿{formData.consumablesFixedCostPerJob || 0})
                  </span>
                </div>

                <div className="p-2 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-purple-400 mb-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-purple-500/30 flex items-center justify-center text-[8px]">4</span>
                    <span>STEP 4: ตรวจสอบ QC</span>
                  </div>
                  <span className="text-purple-300 font-bold block text-sm">฿{previewResults.qcCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 block">({previewQcHours}h × ฿{formData.qcCostRatePerHour || 0})</span>
                </div>

                <div className="p-2 bg-rose-950/20 border border-rose-500/20 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-rose-400 mb-0.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500/30 flex items-center justify-center text-[8px]">5</span>
                    <span>ต้นทุนต่อชิ้น (Unit)</span>
                  </div>
                  {previewResults.isQtyZero ? (
                    <span className="text-rose-400 font-bold text-xs">N/A (ระบุจำนวน)</span>
                  ) : (
                    <span className="text-white font-bold block text-sm">฿{previewResults.costPerPiece.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  )}
                  <span className="text-[10px] text-slate-400 block">({previewRepairQuantity} ชิ้น)</span>
                </div>
              </div>

              {/* Summary KPIs Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400">ต้นทุนการซ่อมแท้จริง (True Repair Cost): </span>
                  <strong className="text-base text-cyan-300">
                    ฿{previewResults.totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400">มูลค่าจัดซื้อใหม่เทียบเท่า: </span>
                  <span className="text-slate-200 font-bold">
                    ฿{previewResults.equivalentNewCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-400">ผลประหยัดสุทธิ (Net Saving): </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm">
                    ฿{previewResults.estimatedSaving.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({previewResults.savingPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
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
