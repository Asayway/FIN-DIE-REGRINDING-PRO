import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Info,
  Sliders,
  Calendar,
  Wrench
} from 'lucide-react';
import { PartCostMasterItem, RegrindingTransactionItem } from '../../types/costSaving';
import { costSavingService } from '../../services/costSavingService';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';

interface RegrindingHistoryTabProps {
  masters: PartCostMasterItem[];
  allTransactions: RegrindingTransactionItem[];
}

export const RegrindingHistoryTab: React.FC<RegrindingHistoryTabProps> = ({
  masters,
  allTransactions
}) => {
  const [selectedPartNo, setSelectedPartNo] = useState<string>(masters[0]?.partNo || 'DWG-PB-001');
  const [searchTerm, setSearchTerm] = useState('');

  // Target shots for Fair Comparison calculator
  const [targetShots, setTargetShots] = useState<number>(15000000);

  // Filtered parts for selection
  const filteredParts = useMemo(() => {
    if (!searchTerm.trim()) return masters;
    const q = searchTerm.toLowerCase();
    return masters.filter(m => m.partNo.toLowerCase().includes(q) || m.partName.toLowerCase().includes(q));
  }, [masters, searchTerm]);

  // Selected Part's history data
  const partHistoryData = useMemo(() => {
    return costSavingService.getPartHistory(selectedPartNo);
  }, [selectedPartNo, allTransactions]);

  const selectedPart = partHistoryData.part || masters.find(m => m.partNo === selectedPartNo);

  // Compute Fair Comparison on Target Shots
  const fairCalc = useMemo(() => {
    if (!selectedPart) {
      return {
        fairTargetShots: targetShots,
        fairNewToolCost: 15000,
        fairRegrindEquivalentCost: 12000,
        fairNormalizedSaving: 3000,
        fairAssumptions: ''
      };
    }

    // Average regrind cost for this part or default ฿1,200
    const avgRegrindCost = partHistoryData.history.length > 0
      ? partHistoryData.totalRepairCostThb / partHistoryData.history.length
      : 1200;

    const avgRegrindShots = partHistoryData.history.length > 0 && partHistoryData.totalShotsAchieved > 0
      ? partHistoryData.totalShotsAchieved / partHistoryData.history.length
      : 1500000;

    return CostSavingCalculationService.calculateFairComparison(
      selectedPart.newPurchasePrice,
      selectedPart.expectedNewToolLife,
      avgRegrindCost,
      avgRegrindShots,
      targetShots
    );
  }, [selectedPart, partHistoryData, targetShots]);

  // Current Remaining Life Percent
  const latestTx = partHistoryData.history[partHistoryData.history.length - 1];
  const maxCycles = selectedPart?.maxRegrindCount || 12;
  const currentCyclesUsed = latestTx?.regrindingNo || 0;
  const remainingCycles = Math.max(0, maxCycles - currentCyclesUsed);
  const remainingLifePercent = maxCycles > 0 ? Math.round((remainingCycles / maxCycles) * 100) : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Top Part Selector Bar */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              ประวัติการซ่อมรายชิ้นและการเปรียบเทียบเทียบเคียง (Regrinding History & Fair Comparison)
            </h3>
            <p className="text-xs text-slate-400">
              วิเคราะห์จำนวน Shot หลังซ่อมแต่ละครั้ง ต้นทุนสะสม และสัดส่วนอายุใช้งานที่เหลือ
            </p>
          </div>
        </div>

        {/* Part Selection Dropdown & Search */}
        <div className="flex items-center gap-2 max-w-md w-full md:w-auto">
          <select
            value={selectedPartNo}
            onChange={e => setSelectedPartNo(e.target.value)}
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

      {/* Part Profile & Remaining Life Header Banner */}
      {selectedPart && (
        <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                  {selectedPart.partNo}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-bold">
                  {selectedPart.partType}
                </span>
                <span className="text-xs text-slate-400">
                  ไลน์: {selectedPart.machineLine}
                </span>
              </div>
              <h2 className="text-lg font-black text-white">{selectedPart.partName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ราคาจัดซื้อใหม่: <strong className="text-white font-mono">฿{selectedPart.newPurchasePrice.toLocaleString()} {selectedPart.currency}</strong> • 
                อายุเป้าหมายชิ้นใหม่: <strong className="text-white font-mono">{selectedPart.expectedNewToolLife.toLocaleString()} Shots</strong> • 
                ขีดจำกัดเจียร: <strong className="text-white font-mono">{selectedPart.maxRegrindCount} ครั้ง</strong>
              </p>
            </div>

            {/* Remaining Tool Life Gauge Card */}
            <div className="w-full lg:w-72 p-3.5 bg-black/50 border border-white/10 rounded-2xl">
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                <span className="text-slate-400">อายุใช้งานที่เหลือเทียบชิ้นใหม่:</span>
                <span className={`font-black text-sm ${
                  remainingLifePercent > 50 ? 'text-[#00FF7F]' : remainingLifePercent > 20 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {remainingLifePercent}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingLifePercent > 50 
                      ? 'bg-gradient-to-r from-emerald-500 to-[#00FF7F]' 
                      : remainingLifePercent > 20 
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-400' 
                      : 'bg-gradient-to-r from-orange-500 to-rose-500'
                  }`}
                  style={{ width: `${remainingLifePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>เจียรแล้ว: {currentCyclesUsed}/{maxCycles} ครั้ง</span>
                <span>เหลืออีก: {remainingCycles} ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Cumulative Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="block text-[10.5px] text-slate-400 mb-0.5">จำนวนครั้งที่ซ่อมสะสม</span>
              <span className="text-base font-black text-white font-mono">
                {partHistoryData.history.length} ครั้ง
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="block text-[10.5px] text-slate-400 mb-0.5">ยอดสโตรกที่กอบกู้ได้สะสม</span>
              <span className="text-base font-black text-cyan-300 font-mono">
                {partHistoryData.totalShotsAchieved.toLocaleString()} Shots
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
              <span className="block text-[10.5px] text-slate-400 mb-0.5">ต้นทุนค่าเจียรซ่อมสะสม</span>
              <span className="text-base font-black text-white font-mono">
                ฿{partHistoryData.totalRepairCostThb.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-[#00FF7F]/10 rounded-2xl border border-[#00FF7F]/30">
              <span className="block text-[10.5px] text-emerald-300 mb-0.5">ประหยัดสุทธิรวมของชิ้นนี้</span>
              <span className="text-base font-black text-[#00FF7F] font-mono">
                ฿{partHistoryData.totalSavingsThb.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fair Comparison Calculator Section (Rule 5) */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0c1424] to-slate-950 border border-cyan-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>การเปรียบเทียบต้นทุนต่อช็อตอย่างเป็นธรรม (Fair Comparison Engine - Normalized Target Shots)</span>
            </h3>
            <p className="text-xs text-slate-400">
              กรณีการซ่อม 1 ครั้งมีอายุสั้นกว่าชิ้นใหม่ ระบบจะคำนวณต้นทุนรวมตามจำนวน Shot เป้าหมายเดียวกันเพื่อความเที่ยงธรรม
            </p>
          </div>

          {/* Target Shot Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono font-semibold">เป้าหมาย Shot:</span>
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/10">
              {[10000000, 15000000, 30000000].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetShots(s)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    targetShots === s ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {(s / 1000000).toFixed(0)}M Shots
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fair Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-black/40 rounded-2xl border border-white/10 text-center">
            <span className="text-xs text-slate-400 block mb-1">
              ต้นทุนจัดซื้อใหม่ (ที่ {targetShots.toLocaleString()} Shots)
            </span>
            <span className="text-xl font-black text-white font-mono">
              ฿{fairCalc.fairNewToolCost.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              อัตรา: ฿{(selectedPart ? selectedPart.newPurchasePrice / selectedPart.expectedNewToolLife : 0.001).toFixed(6)} / shot
            </p>
          </div>

          <div className="p-4 bg-black/40 rounded-2xl border border-white/10 text-center">
            <span className="text-xs text-slate-400 block mb-1">
              ต้นทุนเจียรเทียบเคียง (ที่ {targetShots.toLocaleString()} Shots)
            </span>
            <span className="text-xl font-black text-cyan-300 font-mono">
              ฿{fairCalc.fairRegrindEquivalentCost.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              คำนวณตามจำนวนรอบเจียรที่ต้องใช้จริง
            </p>
          </div>

          <div className="p-4 bg-[#00FF7F]/10 rounded-2xl border border-[#00FF7F]/40 text-center">
            <span className="text-xs text-emerald-300 block mb-1 font-bold">
              มูลค่าประหยัดเทียบเคียงเป้าหมาย (Fair Normalized Saving)
            </span>
            <span className="text-xl font-black text-[#00FF7F] font-mono">
              ฿{fairCalc.fairNormalizedSaving.toLocaleString()}
            </span>
            <p className="text-[11px] text-emerald-400 font-bold mt-1">
              {fairCalc.fairNewToolCost > 0 ? ((fairCalc.fairNormalizedSaving / fairCalc.fairNewToolCost) * 100).toFixed(1) : 0}% ประหยัดจริง
            </p>
          </div>
        </div>

        {/* Clear Assumption Description Statement (Requirement 5) */}
        <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="font-mono">
            <strong className="text-cyan-300">สมมติฐานการคำนวณ: </strong>
            <span>{fairCalc.fairAssumptions}</span>
          </div>
        </div>
      </div>

      {/* Regrinding History Chronological Table (Rule 6) */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white uppercase tracking-wider">
              ประวัติการซ่อมตามลำดับเวลาของ {selectedPartNo}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
              {partHistoryData.history.length} รายการ
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            แสดงจำนวน Shot หลังซ่อมแต่ละครั้ง, ต้นทุนสะสม และ % อายุใช้งานที่เหลือ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950/95 border-b border-white/10 text-[11px] text-slate-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-3.5">ลำดับ</th>
                <th className="py-3 px-3">Repair ID</th>
                <th className="py-3 px-3 text-center">วันที่ซ่อม</th>
                <th className="py-3 px-2.5 text-center">รอบที่ (Cycle)</th>
                <th className="py-3 px-3 text-right">ต้นทุนซ่อมครั้งนี้</th>
                <th className="py-3 px-3 text-right">ต้นทุนสะสม</th>
                <th className="py-3 px-3 text-center">Shot ที่ใช้งานได้</th>
                <th className="py-3 px-3 text-center">สัดส่วนอายุที่เหลือ</th>
                <th className="py-3 px-3 text-right">ประหยัดสุทธิครั้งนี้</th>
                <th className="py-3 px-3 text-center">ผลคุณภาพ</th>
                <th className="py-3 px-3">ผู้เจียร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {partHistoryData.history.length > 0 ? (
                partHistoryData.history.map((tx, idx) => (
                  <tr key={`${tx.id}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-cyan-300">{tx.repairId}</td>
                    <td className="py-3 px-3 text-center text-slate-300 text-[11px]">{tx.repairDate}</td>
                    <td className="py-3 px-2.5 text-center text-amber-300 font-bold">
                      รอบ {tx.regrindingNo}
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      ฿{tx.totalRepairCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-300 font-bold">
                      ฿{tx.cumulativeRepairCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-white block">
                        {(tx.hasActualLife ? tx.actualLifeAfterRepair || 0 : tx.expectedLifeAfterRepair).toLocaleString()}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        tx.hasActualLife ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {tx.hasActualLife ? 'Actual' : 'Estimated'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-bold ${
                          tx.remainingLifePercent > 50 ? 'text-[#00FF7F]' : tx.remainingLifePercent > 20 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {tx.remainingLifePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#00FF7F]">
                      ฿{tx.netSaving.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-200 border border-white/10">
                        {tx.qualityResult}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-400 truncate max-w-[140px]">
                      {tx.supplier}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-sans">
                    ยังไม่มีประวัติการซ่อมสำหรับชิ้นส่วน {selectedPartNo}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
