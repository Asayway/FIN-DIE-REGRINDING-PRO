import React, { useState } from 'react';
import { 
  Calculator,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { CostRateMasterItem } from '../../types/costSaving';
import { costSavingService } from '../../services/costSavingService';
import { StepByStepJobCostSimulator } from './StepByStepJobCostSimulator';
import { useLanguage } from '../../i18n';

interface CostRateMasterTabProps {
  rates?: CostRateMasterItem[];
  costRates?: CostRateMasterItem[];
  onRefresh: () => void;
}

export const CostRateMasterTab: React.FC<CostRateMasterTabProps> = ({
  rates,
  costRates,
  onRefresh
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const activeRates = rates || costRates || [];

  const handleApplyRateToMachine = (machineId: string, calculatedMachineRate: number, calculatedLaborRate: number) => {
    const existing = costSavingService.getCostRateMasterById(machineId);
    if (existing) {
      const updated: CostRateMasterItem = {
        ...existing,
        machineCostRatePerHour: Number(calculatedMachineRate.toFixed(2)),
        operatorLaborRatePerHour: Number(calculatedLaborRate.toFixed(2)),
        updatedAt: new Date().toISOString()
      };
      const res = costSavingService.saveCostRateMaster(
        updated,
        'Cost Engineer (True Cost Engine)',
        isEn
          ? `Updated from Step-by-Step True Cost Simulator (Machine: ฿${calculatedMachineRate.toFixed(2)}/hr, Labor: ฿${calculatedLaborRate.toFixed(2)}/hr)`
          : `ปรับปรุงอัตราจาก Step-by-Step True Cost Simulator (Machine: ฿${calculatedMachineRate.toFixed(2)}/hr, Labor: ฿${calculatedLaborRate.toFixed(2)}/hr)`
      );
      if (res.success) {
        setSaveToast(
          isEn
            ? `Updated cost rates for ${existing.machineName} (${machineId}).`
            : `อัปเดตอัตราต้นทุนเข้าสู่เครื่องจักร ${existing.machineName} (${machineId}) เรียบร้อยแล้ว!`
        );
        setTimeout(() => setSaveToast(null), 4000);
        onRefresh();
      }
    }
  };

  return (
    <div className="w-full space-y-5 animate-fadeIn font-sans text-white">
      
      {/* Toast Alert */}
      {saveToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl flex items-center justify-between text-emerald-200 text-xs shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="text-emerald-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Toolbar - Clean Industrial Solid Finish */}
      <div className="p-4 bg-[#0e1626] border border-white/10 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
              <span>
                {isEn
                  ? 'Grinding True Cost & Step-Ladder Engine'
                  : 'ระบบคำนวณและวิเคราะห์ต้นทุนแท้จริงงานเจียร (Grinding True Cost & Step-Ladder Engine)'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TRUE COST PRO
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isEn
                ? '5-step true grinding cost calculator with cumulative step-ladder cost breakdown chart.'
                : 'วิเคราะห์และคำนวณต้นทุนงานเจียรแท้จริงแบบทีละขั้นตอน (5 Steps) พร้อมกราฟขั้นบันไดสะสมต้นทุน (Step-Ladder Accumulation Chart)'}
            </p>
          </div>
        </div>

        {/* Feature Pill Tag */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-white/10 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">5-Stage Sequential Engineering Costing</span>
        </div>
      </div>

      {/* 5-Step True Cost Job Simulator & Step-Ladder Visualizer */}
      <StepByStepJobCostSimulator
        activeMachines={activeRates}
        onApplyRateToMachine={handleApplyRateToMachine}
      />

    </div>
  );
};
