import React, { useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  FlaskConical, 
  Calculator, 
  FileCheck, 
  ShieldCheck,
  Info
} from 'lucide-react';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';

interface FormulaAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaAuditModal: React.FC<FormulaAuditModalProps> = ({
  isOpen,
  onClose
}) => {
  const testResults = useMemo(() => {
    return CostSavingCalculationService.runVerificationTestCases();
  }, [isOpen]);

  const allPassed = testResults.every(t => t.passed);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0c1018] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-6 text-white font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              allPassed ? 'bg-[#00FF7F]/10 border border-[#00FF7F]/30 text-[#00FF7F]' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}>
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                <span>ระบบตรวจสอบสูตรคำนวณและกรณีทดสอบ (Formula Verification & Test Cases)</span>
                {allPassed ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/40">
                    100% PASSED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    FAILED
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                ตรวจสอบความถูกต้องของสูตร Gross/Net Saving, Cost per Shot, และ Fair Normalized Comparison ก่อนใช้งานจริง
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Formula Reference Guide */}
          <div className="p-4 bg-slate-950/80 border border-white/10 rounded-2xl space-y-2 text-xs">
            <h4 className="font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider text-[11px]">
              <Calculator className="w-4 h-4" />
              <span>หลักเกณฑ์สูตรมาตรฐานวิศวกรรม (Engineering Calculation Standards)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">1. รวมต้นทุนซ่อม (Total Repair Cost)</span>
                <code className="text-cyan-300">Repair + Transport + Labor + Other</code>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">2. ประหยัดขั้นต้น (Gross Saving)</span>
                <code className="text-cyan-300">New Purchase Equivalent - Total Repair Cost</code>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">3. ประหยัดสุทธิ (Net Saving)</span>
                <code className="text-[#00FF7F]">Gross Saving - Downtime Cost - Quality Loss</code>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">4. เปอร์เซ็นต์ประหยัด (Saving %)</span>
                <code className="text-[#00FF7F]">(Net Saving / New Equivalent Cost) × 100</code>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">5. ต้นทุนต่อช็อต (Cost per Shot)</span>
                <code className="text-amber-300">Cost / Actual Life (หรือ Expected หากไม่มีผลจริง)</code>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                <span className="text-slate-400 block text-[10px]">6. การเทียบเคียงเป็นธรรม (Fair Comparison)</span>
                <code className="text-purple-300">Normalized Target Shots Basis (เป้าหมายเดียวกัน)</code>
              </div>
            </div>
          </div>

          {/* Test Case Execution Cards */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>ผลการรันกรณีทดสอบทางคณิตศาสตร์ ({testResults.length} Cases)</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Verification Engine Active</span>
              </span>
            </h4>

            {testResults.map((tc, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  tc.passed 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {tc.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00FF7F] shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <h5 className="text-sm font-bold text-white">{tc.name}</h5>
                      <p className="text-xs text-slate-400 mt-0.5">{tc.description}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                    tc.passed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                  }`}>
                    {tc.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                {/* Mathematical Metrics Table */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Total Repair Cost</span>
                    <span className="text-white font-bold">฿{tc.actual.totalRepairCost.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Gross Saving</span>
                    <span className="text-cyan-300 font-bold">฿{tc.actual.grossSaving.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Net Saving</span>
                    <span className="text-[#00FF7F] font-bold">฿{tc.actual.netSaving.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Saving %</span>
                    <span className="text-[#00FF7F] font-bold">{tc.actual.savingPercentage}%</span>
                  </div>
                </div>

                {/* Fair comparison assumption note */}
                <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{tc.actual.fairAssumptions}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00FF7F]" />
            <span>สูตรคำนวณทั้งหมดได้รับการรับรองความเที่ยงตรงทางคณิตศาสตร์ตามข้อกำหนด</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer transition-all"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
