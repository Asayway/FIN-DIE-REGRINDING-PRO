import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Clock,
  Zap,
  Sparkles,
  Layers,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  ArrowRight,
  HardHat
} from 'lucide-react';
import {
  TrueJobCostSimulationInput,
  TechnicianSkillGrade,
  OvertimeMultiplierType,
  CostRateMasterItem
} from '../../types/costSaving';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';
import { regrindService } from '../../services/regrindService';
import { CostStepLadderChart } from './CostStepLadderChart';

interface StepByStepJobCostSimulatorProps {
  activeMachines?: CostRateMasterItem[];
  onApplyRateToMachine?: (machineId: string, calculatedMachineRate: number, calculatedLaborRate: number) => void;
}

const DEFAULT_SIMULATION_INPUT: TrueJobCostSimulationInput = {
  // Step 1: Machine Capital, Useful Life & Electricity (Asset 2.4M / 20k hrs = 120 + Elec 50.625 + PM 35 = 205.625 THB/hr)
  machineAssetValueThb: 2400000,
  usefulLifeHours: 20000,
  maintenanceReservePerHour: 35,
  ratedPowerKw: 15.0,
  loadFactorPercent: 75,
  electricityPricePerKwh: 4.50,
  machineRunningHours: 1.5,

  // Step 2: Employee Labor, Overtime & Skill Tier (Base 85 + Senior 50 = 135 THB/hr @ OT 1.5x = 202.50 THB/hr)
  baseLaborRatePerHour: 85,
  skillGrade: 'GRADE_A', // Senior (+50 THB/hr)
  overtimeCondition: 'OT_1_5X', // Default OT 1.5x (Weekday)
  setupLaborHours: 0.5,
  directLaborHours: 1.0,
  includesLaborInMachineRate: false,

  // Step 3: Consumables & Abrasive Tooling Wear (38.26 THB/hr * 1.5h = 57.39 THB)
  wheelWearCostPerJob: 25,
  dressingToolWearCost: 10,
  consumableSundriesCost: 12.39,
  coolantCostPerJob: 10,

  // Step 4: Quality Control & Overhead
  qcInspectionHours: 0.25,
  qcHourlyRate: 120,
  shopfloorOverheadFixedThb: 50,

  // Step 5: Output & Tooling Benchmark (Batch 10 pcs @ 850 THB/pc = 8,500 THB New)
  quantityPieces: 10,
  newPurchasePricePerPiece: 850
};

export const StepByStepJobCostSimulator: React.FC<StepByStepJobCostSimulatorProps> = ({
  activeMachines = [],
  onApplyRateToMachine
}) => {
  const [inputData, setInputData] = useState<TrueJobCostSimulationInput>(DEFAULT_SIMULATION_INPUT);
  const [selectedPreset, setSelectedPreset] = useState<string>('burring');
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  // Active queue tickets for quick import
  const queueTickets = useMemo(() => {
    return regrindService.getQueueTickets().filter(t => t.status === 'IN_PROCESS' || t.status === 'PENDING');
  }, []);

  // Compute live step-by-step mathematical results
  const results = useMemo(() => {
    return CostSavingCalculationService.calculateTrueJobCostStepByStep(inputData);
  }, [inputData]);

  // Handle Preset selection
  const handleSelectPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    switch (presetKey) {
      case 'forming_heavy':
        setInputData({
          ...DEFAULT_SIMULATION_INPUT,
          machineAssetValueThb: 3800000,
          usefulLifeHours: 24000,
          maintenanceReservePerHour: 55,
          ratedPowerKw: 22.0,
          loadFactorPercent: 80,
          machineRunningHours: 3.5,
          baseLaborRatePerHour: 180,
          skillGrade: 'GRADE_S',
          overtimeCondition: 'OT_1_5X',
          setupLaborHours: 1.0,
          directLaborHours: 2.5,
          wheelWearCostPerJob: 95,
          dressingToolWearCost: 35,
          consumableSundriesCost: 45,
          coolantCostPerJob: 40,
          qcInspectionHours: 0.5,
          quantityPieces: 2,
          newPurchasePricePerPiece: 14500
        });
        break;
      case 'corner_quick':
        setInputData({
          ...DEFAULT_SIMULATION_INPUT,
          machineAssetValueThb: 1500000,
          usefulLifeHours: 18000,
          maintenanceReservePerHour: 25,
          ratedPowerKw: 11.0,
          loadFactorPercent: 65,
          machineRunningHours: 0.8,
          baseLaborRatePerHour: 140,
          skillGrade: 'GRADE_B',
          overtimeCondition: 'NORMAL',
          setupLaborHours: 0.25,
          directLaborHours: 0.6,
          wheelWearCostPerJob: 25,
          dressingToolWearCost: 10,
          consumableSundriesCost: 15,
          coolantCostPerJob: 15,
          qcInspectionHours: 0.15,
          quantityPieces: 4,
          newPurchasePricePerPiece: 1850
        });
        break;
      case 'burring':
      default:
        setInputData(DEFAULT_SIMULATION_INPUT);
        break;
    }
  };

  // Import from an active queue ticket
  const handleImportFromQueueTicket = (ticketId: string) => {
    const ticket = queueTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    setInputData(prev => ({
      ...prev,
      machineRunningHours: ticket.laborHours || 1.5,
      setupLaborHours: 0.35,
      directLaborHours: Math.max(0.2, (ticket.laborHours || 1.5) - 0.35),
      quantityPieces: ticket.quantity || 1,
      newPurchasePricePerPiece: ticket.newPurchasePrice || prev.newPurchasePricePerPiece
    }));
  };

  const handleCopySummary = () => {
    const text = `=== สรุปการคำนวณต้นทุนงานเจียรจริง (True Grinding Cost Summary) ===
ชิ้นงาน: จำนวน ${inputData.quantityPieces} ชิ้น (ราคาซื้อใหม่เทียบเคียง: ฿${(inputData.quantityPieces * inputData.newPurchasePricePerPiece).toLocaleString()})
1. ต้นทุนเครื่องจักร & ไฟฟ้า: ฿${results.step1TotalMachineAndPower.toLocaleString()} (เรทเครื่อง: ฿${results.totalMachineRatePerHour}/ชม. x ${inputData.machineRunningHours} ชม.)
   - ค่าเสื่อมเครื่อง: ฿${results.step1MachineDepreciationCost.toLocaleString()}
   - ค่าไฟฟ้า (${inputData.ratedPowerKw}kW @${inputData.loadFactorPercent}% load): ฿${results.step1ElectricityCost.toLocaleString()}
   - ค่าสำรองบำรุงรักษา: ฿${results.step1MaintenanceCost.toLocaleString()}
2. ต้นทุนค่าแรงพนักงาน: ฿${results.step2TotalLaborCost.toLocaleString()} (เรทจริง: ฿${results.effectiveOtRatePerHour}/ชม., OT: ${results.otMultiplier}x, สกิล: +฿${results.skillAllowancePerHour}/ชม.)
   - ค่าแรง Setup: ฿${results.step2SetupLaborCost.toLocaleString()}
   - ค่าแรงเจียรตรง: ฿${results.step2DirectLaborCost.toLocaleString()}${results.laborDoubleCountingPrevented ? ' [รวมในค่าเครื่องแล้ว]' : ''}
3. ค่าหินเจียร & วัสดุสิ้นเปลือง: ฿${results.step3TotalConsumables.toLocaleString()}
   - สึกหรอหิน CBN/Diamond: ฿${results.step3WheelWearCost.toLocaleString()}
   - สึกหรอหัวกรีดเพชร: ฿${results.step3DressingToolCost.toLocaleString()}
   - ผ้าเช็ด/แปรง/ผงขัด: ฿${results.step3SundriesCost.toLocaleString()}
   - น้ำยาหล่อเย็น: ฿${results.step3CoolantCost.toLocaleString()}
4. ค่าตรวจสอบ QC & โสหุ้ย: ฿${results.step4TotalQcAndOverhead.toLocaleString()}
---------------------------------------------------------------
* ต้นทุนรวมงานเจียรจริงทั้งสิ้น (Grand Total): ฿${results.step5GrandTotalJobCost.toLocaleString()}
* ต้นทุนเฉลี่ยต่อชิ้น (Cost per Piece): ฿${results.step5CostPerPiece.toLocaleString()} / ชิ้น
* ยอดประหยัดสุทธิเทียบซื้อใหม่ (Net Saving): ฿${results.step5NetCostSaving.toLocaleString()} (${results.step5SavingPercentage}% ประหยัด)`;

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <div className="bg-[#0b101b] border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 relative">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                เครื่องมือคำนวณต้นทุนจริงงานเจียร 1 งาน (Step-by-Step True Cost Engine)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TRUE COST SIMULATOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              คำนวณแยก 5 ขั้นตอน: ค่าเสื่อมเครื่องจักร + ค่าไฟจริง + ค่าแรงช่างและ OT + ค่าหินเจียร/ของใช้ + ค่า QC & โสหุ้ย
            </p>
          </div>
        </div>

        {/* Quick Import from Active Job Tickets */}
        <div className="flex items-center gap-2 flex-wrap">
          {queueTickets.length > 0 && (
            <select
              onChange={e => e.target.value && handleImportFromQueueTicket(e.target.value)}
              defaultValue=""
              className="px-2.5 py-1.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none"
            >
              <option value="" disabled>📥 ดึงเวลาจริงจากใบงานคิว...</option>
              {queueTickets.map(t => (
                <option key={t.id} value={t.id}>
                  {t.jobCode} - {t.partName} ({t.lineId}) [{t.laborHours || 1.5} ชม.]
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 5-Step Grid Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ========================================================================= */}
        {/* STEP 1: MACHINE DEPRECIATION & ELECTRICITY POWER                         */}
        {/* ========================================================================= */}
        <div className="bg-[#0e1626] border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="text-xs font-black text-cyan-300 font-mono flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>ต้นทุนเครื่องจักร & ไฟฟ้า</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                ฿{results.totalMachineRatePerHour}/ชม.
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  ชั่วโมงเดินเครื่อง (Machine Hours)
                </label>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inputData.machineRunningHours}
                    onChange={e => setInputData({ ...inputData, machineRunningHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-mono font-black text-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">ชม.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">ราคาเครื่อง (Asset)</label>
                  <input
                    type="number"
                    step="50000"
                    value={inputData.machineAssetValueThb}
                    onChange={e => setInputData({ ...inputData, machineAssetValueThb: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">อายุใช้งาน (ชม.)</label>
                  <input
                    type="number"
                    step="1000"
                    value={inputData.usefulLifeHours}
                    onChange={e => setInputData({ ...inputData, usefulLifeHours: parseFloat(e.target.value) || 20000 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9.5px] text-slate-400 block font-mono">กำลังไฟ (kW)</label>
                  <input
                    type="number"
                    step="1"
                    value={inputData.ratedPowerKw}
                    onChange={e => setInputData({ ...inputData, ratedPowerKw: parseFloat(e.target.value) || 0 })}
                    className="w-full px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-slate-400 block font-mono">Load Factor %</label>
                  <input
                    type="number"
                    step="5"
                    max="100"
                    value={inputData.loadFactorPercent}
                    onChange={e => setInputData({ ...inputData, loadFactorPercent: parseFloat(e.target.value) || 75 })}
                    className="w-full px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-slate-400 block font-mono">ค่าไฟ (฿/kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputData.electricityPricePerKwh}
                    onChange={e => setInputData({ ...inputData, electricityPricePerKwh: parseFloat(e.target.value) || 4.5 })}
                    className="w-full px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sub-itemized details */}
              <div className="bg-slate-950/70 p-2 rounded-xl border border-white/5 space-y-1 text-[10.5px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>ค่าเสื่อมราคา:</span>
                  <span className="text-white">฿{results.step1MachineDepreciationCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่าไฟฟ้าจริง ({inputData.ratedPowerKw}kW):</span>
                  <span className="text-white">฿{results.step1ElectricityCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>สำรองบำรุงรักษา:</span>
                  <span className="text-white">฿{results.step1MaintenanceCost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300">รวม Step 1:</span>
            <span className="text-cyan-300 font-black text-sm">฿{results.step1TotalMachineAndPower.toLocaleString()}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 2: EMPLOYEE LABOR, OVERTIME & SKILL ALLOWANCE                       */}
        {/* ========================================================================= */}
        <div className="bg-[#0e1626] border border-purple-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <span className="text-xs font-black text-purple-300 font-mono flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>ค่าแรงช่าง, OT & ค่าสกิล</span>
              </span>
              <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                ฿{results.effectiveOtRatePerHour}/ชม.
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">Setup Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inputData.setupLaborHours}
                    onChange={e => setInputData({ ...inputData, setupLaborHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">Direct Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inputData.directLaborHours}
                    onChange={e => setInputData({ ...inputData, directLaborHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Base wage */}
              <div>
                <label className="text-[10px] text-slate-400 block font-mono">อัตราค่าแรงพื้นฐาน (Base Wage ฿/ชม.)</label>
                <input
                  type="number"
                  step="10"
                  value={inputData.baseLaborRatePerHour}
                  onChange={e => setInputData({ ...inputData, baseLaborRatePerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:border-purple-400 focus:outline-none"
                />
              </div>

              {/* Skill Tier Buttons */}
              <div>
                <label className="text-[10px] text-slate-400 block font-mono mb-1">ระดับทักษะช่าง (Skill Grade)</label>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, skillGrade: 'GRADE_C' })}
                    className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                      inputData.skillGrade === 'GRADE_C'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Junior (+฿0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, skillGrade: 'GRADE_B' })}
                    className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                      inputData.skillGrade === 'GRADE_B'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Standard (+฿20)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, skillGrade: 'GRADE_A' })}
                    className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                      inputData.skillGrade === 'GRADE_A'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Senior (+฿50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, skillGrade: 'GRADE_S' })}
                    className={`py-1 px-1.5 rounded-lg border text-center transition-all ${
                      inputData.skillGrade === 'GRADE_S'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Master (+฿90)
                  </button>
                </div>
              </div>

              {/* Overtime Selector */}
              <div>
                <label className="text-[10px] text-slate-400 block font-mono mb-1">ล่วงเวลา (OT Multiplier)</label>
                <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, overtimeCondition: 'NORMAL' })}
                    className={`py-1 rounded-lg border transition-all ${
                      inputData.overtimeCondition === 'NORMAL'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    1.0x ปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, overtimeCondition: 'OT_1_5X' })}
                    className={`py-1 rounded-lg border transition-all ${
                      inputData.overtimeCondition === 'OT_1_5X'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    1.5x วันธรรมดา
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, overtimeCondition: 'OT_2_0X' })}
                    className={`py-1 rounded-lg border transition-all ${
                      inputData.overtimeCondition === 'OT_2_0X'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    2.0x วันหยุด
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputData({ ...inputData, overtimeCondition: 'OT_3_0X' })}
                    className={`py-1 rounded-lg border transition-all ${
                      inputData.overtimeCondition === 'OT_3_0X'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    3.0x พิเศษ
                  </button>
                </div>
              </div>

              {/* Double Counting Guard Toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={inputData.includesLaborInMachineRate}
                  onChange={e => setInputData({ ...inputData, includesLaborInMachineRate: e.target.checked })}
                  className="w-3.5 h-3.5 accent-purple-500 rounded"
                />
                <span className="text-[10.5px] text-slate-300">
                  ค่าเครื่องรวมค่าแรงช่างแล้ว (ไม่คิดซ้ำ)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300">รวม Step 2:</span>
            <span className="text-purple-300 font-black text-sm">฿{results.step2TotalLaborCost.toLocaleString()}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 3: CONSUMABLES & ABRASIVE TOOLING WEAR                             */}
        {/* ========================================================================= */}
        <div className="bg-[#0e1626] border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <span className="text-xs font-black text-amber-300 font-mono flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>หินเจียร & วัสดุสิ้นเปลือง</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                CONSUMABLES
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block font-mono">
                  1. การสึกหรอหินเจียร CBN / Diamond (฿/งาน)
                </label>
                <input
                  type="number"
                  step="5"
                  value={inputData.wheelWearCostPerJob}
                  onChange={e => setInputData({ ...inputData, wheelWearCostPerJob: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-mono">
                  2. สึกหรอหัวกรีดเพชร (Dressing Tool ฿)
                </label>
                <input
                  type="number"
                  step="5"
                  value={inputData.dressingToolWearCost}
                  onChange={e => setInputData({ ...inputData, dressingToolWearCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-mono">
                  3. ผ้าเช็ด, แปรงขัด, วาสลีน & ผงขัดเงา (฿)
                </label>
                <input
                  type="number"
                  step="5"
                  value={inputData.consumableSundriesCost}
                  onChange={e => setInputData({ ...inputData, consumableSundriesCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-mono">
                  4. น้ำยาหล่อเย็นสังเคราะห์ (Coolant ฿)
                </label>
                <input
                  type="number"
                  step="5"
                  value={inputData.coolantCostPerJob}
                  onChange={e => setInputData({ ...inputData, coolantCostPerJob: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="bg-slate-950/70 p-2 rounded-xl border border-white/5 text-[10.5px] font-mono text-slate-400">
                รวมคำนวณจากอายุสึกหรอของหินเจียร CBN และวัสดุสิ้นเปลืองงานละเอียด
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300">รวม Step 3:</span>
            <span className="text-amber-300 font-black text-sm">฿{results.step3TotalConsumables.toLocaleString()}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 4: QUALITY INSPECTION & SHOPFLOOR OVERHEAD                         */}
        {/* ========================================================================= */}
        <div className="bg-[#0e1626] border border-blue-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <span className="text-xs font-black text-blue-300 font-mono flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px] font-bold">4</span>
                <span>ค่าตรวจสอบ QC & โสหุ้ย</span>
              </span>
              <span className="text-[10px] font-mono text-blue-300 font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                QC & OVERHEAD
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">QC Hours (ชม.)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={inputData.qcInspectionHours}
                    onChange={e => setInputData({ ...inputData, qcInspectionHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-mono">QC Rate (฿/ชม.)</label>
                  <input
                    type="number"
                    step="10"
                    value={inputData.qcHourlyRate}
                    onChange={e => setInputData({ ...inputData, qcHourlyRate: parseFloat(e.target.value) || 120 })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block font-mono">
                  ค่าโสหุ้ยจัดสรรของโรงซ่อม (Overhead ฿/งาน)
                </label>
                <input
                  type="number"
                  step="10"
                  value={inputData.shopfloorOverheadFixedThb}
                  onChange={e => setInputData({ ...inputData, shopfloorOverheadFixedThb: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 space-y-1 text-[10.5px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>ค่าตรวจขนาดด้วย Profile Projector:</span>
                  <span className="text-white font-bold">฿{results.step4QcCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ค่าโสหุ้ยไฟส่องสว่าง/แอร์โรงซ่อม:</span>
                  <span className="text-white font-bold">฿{results.step4OverheadCost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-500/20 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300">รวม Step 4:</span>
            <span className="text-blue-300 font-black text-sm">฿{results.step4TotalQcAndOverhead.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* COST ACCUMULATION STEP-LADDER CHART (5 CALCULATION STAGES)                */}
      {/* ========================================================================= */}
      <CostStepLadderChart
        results={results}
        quantityPieces={inputData.quantityPieces}
      />

      {/* ========================================================================= */}
      {/* STEP 5: GRAND TOTAL ROLL-UP & COST SAVING ECONOMIC COMPARISON            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#091522] to-[#0c1c1f] border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-[#00FF7F] border border-emerald-500/40 flex items-center justify-center text-xs font-black">
              5
            </span>
            <h4 className="text-sm sm:text-base font-black text-white font-mono">
              สรุปต้นทุนจริงงานเจียร (Step 5: True Grinding Cost Roll-Up & Unit Economics)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow"
            >
              {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedNotice ? 'คัดลอกสรุปแล้ว!' : 'คัดลอกสรุปสูตรคำนวณ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setInputData(DEFAULT_SIMULATION_INPUT)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-mono transition-all cursor-pointer"
              title="รีเซ็ตเป็นค่าเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Workpiece Quantity & Benchmark Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-xl border border-white/10 text-xs">
          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block">จำนวนชิ้นงานในรอบเจียรนี้ (Batch Qty):</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                min="1"
                value={inputData.quantityPieces}
                onChange={e => setInputData({ ...inputData, quantityPieces: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-mono font-black text-sm focus:border-emerald-400 focus:outline-none text-center"
              />
              <span className="text-slate-400 font-mono">ชิ้น</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block">ราคาจัดซื้ออะไหล่ใหม่เทียบเคียง (ต่อชิ้น):</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                step="100"
                value={inputData.newPurchasePricePerPiece}
                onChange={e => setInputData({ ...inputData, newPurchasePricePerPiece: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:border-emerald-400 focus:outline-none"
              />
              <span className="text-slate-400 font-mono">฿/ชิ้น</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] text-slate-400 font-mono block">มูลค่าซื้อใหม่รวมทั้งแบทช์ ({inputData.quantityPieces} ชิ้น):</label>
            <div className="text-sm sm:text-base font-black text-white font-mono mt-1.5">
              ฿{results.step5TotalNewToolEquivalentCost.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="text-[10.5px] text-emerald-400 font-mono block font-bold">อัตราส่วนประหยัด (Saving %):</label>
            <div className="text-sm sm:text-base font-black text-[#00FF7F] font-mono mt-1.5 flex items-center gap-1">
              <span>{results.step5SavingPercentage}%</span>
              <span className="text-[10px] text-slate-400 font-normal">ประหยัด</span>
            </div>
          </div>
        </div>

        {/* 4 Grand Outcome KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Card 1: Grand Total Job Cost */}
          <div className="bg-slate-950/90 border border-white/15 rounded-xl p-3 shadow-lg">
            <span className="text-[10.5px] text-slate-400 font-mono block uppercase">ต้นทุนจริงงานเจียรรวมทั้งสิ้น</span>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1 tracking-tight">
              ฿{results.step5GrandTotalJobCost.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
              Step 1+2+3+4 รวมทั้งหมด
            </span>
          </div>

          {/* Card 2: Cost Per Piece */}
          <div className="bg-slate-950/90 border border-white/15 rounded-xl p-3 shadow-lg">
            <span className="text-[10.5px] text-slate-400 font-mono block uppercase">ต้นทุนเจียรเฉลี่ยต่อชิ้น</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1 tracking-tight">
              ฿{results.step5CostPerPiece.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
              (÷ {inputData.quantityPieces} ชิ้นในแบทช์)
            </span>
          </div>

          {/* Card 3: Avoided Purchase Cost */}
          <div className="bg-slate-950/90 border border-white/15 rounded-xl p-3 shadow-lg">
            <span className="text-[10.5px] text-slate-400 font-mono block uppercase">มูลค่าซื้อใหม่ที่หลีกเลี่ยง</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1 tracking-tight">
              ฿{results.step5TotalNewToolEquivalentCost.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
              ราคาอะไหล่ใหม่เทียบเคียง
            </span>
          </div>

          {/* Card 4: Net Cost Saving */}
          <div className="bg-slate-950/90 border-2 border-emerald-500/60 rounded-xl p-3 shadow-lg shadow-emerald-500/10">
            <span className="text-[10.5px] text-emerald-300 font-mono block uppercase font-bold">ยอดประหยัดสุทธิ (Net Saving)</span>
            <div className="text-xl sm:text-2xl font-black text-[#00FF7F] font-mono mt-1 tracking-tight drop-shadow-[0_0_10px_rgba(0,255,127,0.3)]">
              ฿{results.step5NetCostSaving.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono font-bold">
              ✓ ประหยัดได้จริง {results.step5SavingPercentage}%
            </span>
          </div>

        </div>

        {/* Step Waterfall Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase">
                <th className="py-2 px-2.5">ขั้นตอนการคำนวณ (Calculation Step)</th>
                <th className="py-2 px-2.5">พารามิเตอร์หลัก</th>
                <th className="py-2 px-2.5 text-right">จำนวนเงิน (THB)</th>
                <th className="py-2 px-2.5 text-right">สัดส่วน %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              <tr>
                <td className="py-2 px-2.5 text-cyan-300 font-bold">Step 1: เครื่องจักรและไฟฟ้า</td>
                <td className="py-2 px-2.5 text-slate-400">
                  {inputData.machineRunningHours} ชม. × (ค่าเสื่อม ฿{results.depreciationPerHour} + ค่าไฟ ฿{results.electricityPerHour} + บำรุงรักษา ฿{inputData.maintenanceReservePerHour})
                </td>
                <td className="py-2 px-2.5 text-right font-bold text-white">฿{results.step1TotalMachineAndPower.toLocaleString()}</td>
                <td className="py-2 px-2.5 text-right text-slate-400">
                  {results.step5GrandTotalJobCost > 0 ? ((results.step1TotalMachineAndPower / results.step5GrandTotalJobCost) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2.5 text-purple-300 font-bold">Step 2: ค่าแรงช่าง, OT & ค่าสกิล</td>
                <td className="py-2 px-2.5 text-slate-400">
                  (Setup {inputData.setupLaborHours} ชม. + เจียร {results.laborDoubleCountingPrevented ? '0' : inputData.directLaborHours} ชม.) × ฿{results.effectiveOtRatePerHour}/ชม. [{inputData.skillGrade}, OT {results.otMultiplier}x]
                </td>
                <td className="py-2 px-2.5 text-right font-bold text-white">฿{results.step2TotalLaborCost.toLocaleString()}</td>
                <td className="py-2 px-2.5 text-right text-slate-400">
                  {results.step5GrandTotalJobCost > 0 ? ((results.step2TotalLaborCost / results.step5GrandTotalJobCost) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2.5 text-amber-300 font-bold">Step 3: หินเจียรและวัสดุสิ้นเปลือง</td>
                <td className="py-2 px-2.5 text-slate-400">
                  หิน CBN ฿{inputData.wheelWearCostPerJob} + หัวกรีดเพชร ฿{inputData.dressingToolWearCost} + ผ้า/แปรง/ผงขัด ฿{inputData.consumableSundriesCost} + น้ำยาหล่อเย็น ฿{inputData.coolantCostPerJob}
                </td>
                <td className="py-2 px-2.5 text-right font-bold text-white">฿{results.step3TotalConsumables.toLocaleString()}</td>
                <td className="py-2 px-2.5 text-right text-slate-400">
                  {results.step5GrandTotalJobCost > 0 ? ((results.step3TotalConsumables / results.step5GrandTotalJobCost) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2.5 text-blue-300 font-bold">Step 4: ตรวจสอบ QC & โสหุ้ยโรงซ่อม</td>
                <td className="py-2 px-2.5 text-slate-400">
                  ตรวจขนาด QC {inputData.qcInspectionHours} ชม. (@฿{inputData.qcHourlyRate}/ชม.) + ค่าโสหุ้ยจัดสรร ฿{inputData.shopfloorOverheadFixedThb}
                </td>
                <td className="py-2 px-2.5 text-right font-bold text-white">฿{results.step4TotalQcAndOverhead.toLocaleString()}</td>
                <td className="py-2 px-2.5 text-right text-slate-400">
                  {results.step5GrandTotalJobCost > 0 ? ((results.step4TotalQcAndOverhead / results.step5GrandTotalJobCost) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr className="bg-emerald-950/20 font-black">
                <td className="py-2.5 px-2.5 text-[#00FF7F]">ต้นทุนรวมสุทธิ (Grand Total True Cost)</td>
                <td className="py-2.5 px-2.5 text-emerald-300">
                  ต้นทุนรวมเฉลี่ย ฿{results.step5CostPerPiece.toLocaleString()} / ชิ้น (แบทช์ {inputData.quantityPieces} ชิ้น)
                </td>
                <td className="py-2.5 px-2.5 text-right text-emerald-300 text-sm">฿{results.step5GrandTotalJobCost.toLocaleString()}</td>
                <td className="py-2.5 px-2.5 text-right text-[#00FF7F]">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Optional Apply to Active Machine Master Rate */}
        {activeMachines.length > 0 && onApplyRateToMachine && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">นำผลลัพธ์อัตราต้นทุนนี้ไปบันทึกที่เครื่องจักร:</span>
              <select
                value={selectedMachineId}
                onChange={e => setSelectedMachineId(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-cyan-500/40 rounded-xl text-white text-xs"
              >
                <option value="">-- เลือกเครื่องจักรในระบบ --</option>
                {activeMachines.map(m => (
                  <option key={m.id} value={m.machineId}>
                    {m.machineId} - {m.machineName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!selectedMachineId}
              onClick={() => {
                if (selectedMachineId) {
                  onApplyRateToMachine(
                    selectedMachineId,
                    results.totalMachineRatePerHour,
                    results.effectiveOtRatePerHour
                  );
                }
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedMachineId
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 border-cyan-300 shadow-md hover:scale-105'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              ✓ บันทึกเป็นอัตรามาตรฐานของ {selectedMachineId || 'เครื่องจักร'}
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
