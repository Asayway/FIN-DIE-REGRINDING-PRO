import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  DollarSign, 
  Ruler, 
  RotateCcw, 
  Search, 
  Wrench, 
  Scale, 
  HelpCircle,
  Activity,
  Info
} from 'lucide-react';
import { 
  PartCostMasterItem, 
  DecisionVerdict, 
  QualityResultCode,
  RegrindingTransactionItem 
} from '../../types/costSaving';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';

interface DecisionSupportTabProps {
  masters: PartCostMasterItem[];
  transactions: RegrindingTransactionItem[];
}

export const DecisionSupportTab: React.FC<DecisionSupportTabProps> = ({
  masters,
  transactions
}) => {
  const [selectedPartNo, setSelectedPartNo] = useState<string>(masters[0]?.partNo || 'DWG-PB-001');

  const selectedPart = useMemo(() => {
    return masters.find(m => m.partNo === selectedPartNo) || masters[0];
  }, [selectedPartNo, masters]);

  // Find recent transactions for this part to prepopulate defaults
  const partTxList = useMemo(() => {
    return transactions.filter(t => t.partNo === selectedPartNo);
  }, [selectedPartNo, transactions]);

  const latestTx = partTxList[partTxList.length - 1];

  // Interactive Diagnostic Parameters
  const [simCycleNo, setSimCycleNo] = useState<number>(latestTx ? latestTx.regrindingNo + 1 : 2);
  const [simLengthMm, setSimLengthMm] = useState<number>(
    latestTx?.remainingLengthMm 
      ? Number((latestTx.remainingLengthMm - 0.12).toFixed(2)) 
      : (selectedPart ? selectedPart.nominalLengthMm - 0.24 : 44.76)
  );
  const [simQuality, setSimQuality] = useState<QualityResultCode>('PASS');
  const [simRepairCost, setSimRepairCost] = useState<number>(latestTx?.totalRepairCost || 1350);

  // Sync when part changes
  const handleSelectPart = (pNo: string) => {
    setSelectedPartNo(pNo);
    const p = masters.find(m => m.partNo === pNo);
    const txs = transactions.filter(t => t.partNo === pNo);
    const last = txs[txs.length - 1];

    if (p) {
      setSimCycleNo(last ? last.regrindingNo + 1 : 1);
      setSimLengthMm(last?.remainingLengthMm ? Number((last.remainingLengthMm - 0.12).toFixed(2)) : p.nominalLengthMm - 0.12);
      setSimRepairCost(last?.totalRepairCost || (p.partType === 'DIE' ? 2200 : 1300));
      setSimQuality('PASS');
    }
  };

  // Evaluate Decision Support via Rule Engine
  const decisionResult = useMemo(() => {
    if (!selectedPart) return null;

    return CostSavingCalculationService.evaluateDecisionSupport(
      selectedPart,
      {
        regrindingNo: simCycleNo,
        remainingLengthMm: simLengthMm,
        qualityResult: simQuality,
        totalRepairCost: simRepairCost,
        hasActualLife: true,
        actualLifeAfterRepair: 1500000
      },
      simCycleNo * 1500000
    );
  }, [selectedPart, simCycleNo, simLengthMm, simQuality, simRepairCost]);

  if (!selectedPart || !decisionResult) return null;

  const getVerdictTheme = (v: DecisionVerdict) => {
    switch (v) {
      case 'REGRIND':
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/50',
          text: 'text-[#00FF7F]',
          badge: 'bg-[#00FF7F] text-slate-950',
          icon: CheckCircle2,
          label: 'REGRIND (เจียรซ่อมกอบกู้)'
        };
      case 'MONITOR':
        return {
          bg: 'bg-amber-950/40 border-amber-500/50',
          text: 'text-amber-400',
          badge: 'bg-amber-500 text-slate-950',
          icon: AlertTriangle,
          label: 'MONITOR (เฝ้าระวังเข้มงวด)'
        };
      case 'REPLACE':
        return {
          bg: 'bg-rose-950/40 border-rose-500/50',
          text: 'text-rose-400',
          badge: 'bg-rose-500 text-white',
          icon: XCircle,
          label: 'REPLACE (ปลดระวาง/เปลี่ยนใหม่)'
        };
    }
  };

  const theme = getVerdictTheme(decisionResult.verdict);
  const VerdictIcon = theme.icon;

  const lengthHeadroom = Number((simLengthMm - selectedPart.minAllowedLengthMm).toFixed(2));
  const cycleHeadroom = Math.max(0, selectedPart.maxRegrindCount - simCycleNo);

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>ระบบสนับสนุนการตัดสินใจเชิงวิศวกรรม (Decision Support Engine: Regrind vs Replace)</span>
            </h3>
            <p className="text-xs text-slate-400">
              วิเคราะห์แบบสหวิทยาการ (Multi-Criteria): ต้นทุนต่อช็อต, มิติความยาว, รอบเจียรสะสม, คุณภาพ และความปลอดภัย
            </p>
          </div>
        </div>

        {/* Part Selection Dropdown */}
        <div className="flex items-center gap-2 max-w-sm w-full md:w-auto">
          <select
            value={selectedPartNo}
            onChange={e => handleSelectPart(e.target.value)}
            className="w-full md:w-80 px-3.5 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            {masters.map(m => (
              <option key={m.id} value={m.partNo}>
                {m.partNo} - {m.partName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Live Decision Verdict on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Interactive Diagnostic Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl space-y-4">
          <div className="pb-3 border-b border-white/10">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>พารามิเตอร์ตรวจสอบสภาพชิ้นงาน (Tool Condition Inputs)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              ปรับค่าสเปคจริงเพื่อทดสอบคำแนะนำของระบบ
            </p>
          </div>

          {/* Part Base Spec Info */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-xs space-y-1 font-mono">
            <div className="text-white font-bold">{selectedPart.partNo} ({selectedPart.partName})</div>
            <div className="text-slate-400 flex items-center justify-between text-[11px]">
              <span>ความยาวสเปคเดิม:</span>
              <span className="text-white">{selectedPart.nominalLengthMm.toFixed(2)} mm</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between text-[11px]">
              <span>ขีดจำกัดความยาวต่ำสุด (Min Spec):</span>
              <span className="text-rose-400 font-bold">{selectedPart.minAllowedLengthMm.toFixed(2)} mm</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between text-[11px]">
              <span>รอบการเจียรสูงสุดที่อนุญาต:</span>
              <span className="text-amber-300 font-bold">{selectedPart.maxRegrindCount} ครั้ง</span>
            </div>
          </div>

          {/* Interactive Form Controls */}
          <div className="space-y-3 text-xs">
            {/* Input 1: Current Length */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ความยาวที่วัดได้ปัจจุบัน (Current Length)</span>
                </label>
                <span className={`font-mono font-bold ${lengthHeadroom <= 0 ? 'text-rose-400' : lengthHeadroom < 0.2 ? 'text-amber-400' : 'text-[#00FF7F]'}`}>
                  เหลือเนื้อเจียร: {lengthHeadroom.toFixed(2)} mm
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={simLengthMm}
                onChange={e => setSimLengthMm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Input 2: Regrind Cycle Count */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>รอบการเจียรครั้งนี้ (Regrind Cycle No.)</span>
                </label>
                <span className="font-mono text-slate-400">
                  {simCycleNo} จาก {selectedPart.maxRegrindCount} ครั้ง
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={simCycleNo}
                onChange={e => setSimCycleNo(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Input 3: Quality Result */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ผลการตรวจสอบคุณภาพล่าสุด (Quality Inspection)
              </label>
              <select
                value={simQuality}
                onChange={e => setSimQuality(e.target.value as QualityResultCode)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
              >
                <option value="PASS">PASS (ผ่านเกณฑ์มาตรฐานปกติ)</option>
                <option value="CONDITIONAL">CONDITIONAL (ผ่านแบบมีเงื่อนไข/คมสึกเร็ว)</option>
                <option value="REWORK">REWORK (ตรวจพบคมเบี้ยว/ต้องเจียรซ้ำ)</option>
                <option value="SCRAP">SCRAP (แตกร้าว/ชำรุดเกินขีดจำกัด)</option>
              </select>
            </div>

            {/* Input 4: Total Repair Cost */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ต้นทุนรวมการเจียรครั้งนี้ (Total Repair Cost) [THB]
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-mono">฿</span>
                <input
                  type="number"
                  step="50"
                  value={simRepairCost}
                  onChange={e => setSimRepairCost(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Multi-Criteria Decision Verdict (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Verdict Card */}
          <div className={`p-6 rounded-3xl border ${theme.bg} shadow-2xl backdrop-blur-2xl transition-all duration-300 relative overflow-hidden`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-3 shadow-lg ${theme.badge}`}>
                  <VerdictIcon className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    คำแนะนำจากระบบวิเคราะห์ (Recommendation Verdict)
                  </div>
                  <h2 className={`text-2xl font-black tracking-tight ${theme.text}`}>
                    {theme.label}
                  </h2>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ดัชนีความเหมาะสม</span>
                <span className={`text-2xl font-black font-mono ${theme.text}`}>
                  {decisionResult.score}/100
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold text-white leading-relaxed mb-4 p-3 bg-black/40 rounded-2xl border border-white/10">
              {decisionResult.summaryTh}
            </p>

            {/* Engineering Warnings (if any) */}
            {decisionResult.engineeringAlerts.length > 0 && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl space-y-1">
                <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>ข้อจำกัดและข้อควรระวังวิศวกรรม (Engineering Hard Limits):</span>
                </span>
                <ul className="text-xs text-rose-200 list-disc list-inside space-y-0.5">
                  {decisionResult.engineeringAlerts.map((alt, i) => (
                    <li key={i}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* List of Reasons */}
            <div className="space-y-1.5 mb-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                เหตุผลประกอบการตัดสินใจ (Analytical Justifications):
              </span>
              <ul className="space-y-1 text-xs">
                {decisionResult.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-200">
                    <span className="text-cyan-400 font-bold shrink-0">›</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Multi-Criteria Scorecards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">ต้นทุนเจียร/ช็อต</span>
                <span className="text-white font-bold">
                  ฿{decisionResult.financialComparison.regrindCostPerShot.toFixed(6)}
                </span>
              </div>

              <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">ต้นทุนซื้อใหม่/ช็อต</span>
                <span className="text-slate-300 font-bold">
                  ฿{decisionResult.financialComparison.newToolCostPerShot.toFixed(6)}
                </span>
              </div>

              <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">รอบเจียรคงเหลือ</span>
                <span className={`font-bold ${cycleHeadroom <= 1 ? 'text-amber-400' : 'text-[#00FF7F]'}`}>
                  {cycleHeadroom} ครั้ง
                </span>
              </div>

              <div className="p-2.5 bg-black/50 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block mb-0.5">ประหยัดเทียบเคียง</span>
                <span className="text-[#00FF7F] font-bold">
                  ฿{decisionResult.financialComparison.fairComparisonSavingThb.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Golden Rule Note */}
          <div className="p-4 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-400 flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white">กฎเหล็กวิศวกรรมการผลิต (Rule 7 Notice): </strong>
              ระบบจะไม่ตัดสินใจจากราคาเจียรซ่อมเพียงอย่างเดียว หากชิ้นส่วนถึงขีดจำกัดความยาว (Min Spec Limit) หรือรอบการเจียรสูงสุด ระบบจะบังคับให้เปลี่ยนใหม่ (REPLACE) เสมอเพื่อป้องกันความเสียหายต่อชุดแม่พิมพ์และชิ้นงานหลุดสเปค
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
