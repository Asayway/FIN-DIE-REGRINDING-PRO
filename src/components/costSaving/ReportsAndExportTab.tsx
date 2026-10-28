import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Layers, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Building
} from 'lucide-react';
import { 
  RegrindingTransactionItem, 
  CostSummaryMetrics, 
  CostDashboardFilter 
} from '../../types/costSaving';
import { costSavingService } from '../../services/costSavingService';
import { CostSavingCalculationService } from '../../services/costSavingCalculationService';

interface ReportsAndExportTabProps {
  allTransactions: RegrindingTransactionItem[];
}

export const ReportsAndExportTab: React.FC<ReportsAndExportTabProps> = ({
  allTransactions
}) => {
  const [reportType, setReportType] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Default October
  const [selectedLine, setSelectedLine] = useState<string>('ALL');

  // Filtered transactions for report
  const filteredReportTx = useMemo(() => {
    return allTransactions.filter(tx => {
      const d = new Date(tx.repairDate);
      if (d.getFullYear() !== selectedYear) return false;
      if (reportType === 'MONTHLY' && (d.getMonth() + 1) !== selectedMonth) return false;
      if (selectedLine !== 'ALL' && tx.machineLine !== selectedLine) return false;
      return true;
    });
  }, [allTransactions, reportType, selectedYear, selectedMonth, selectedLine]);

  // Aggregate metrics for this report slice
  const reportMetrics = useMemo(() => {
    return CostSavingCalculationService.aggregateMetrics(filteredReportTx);
  }, [filteredReportTx]);

  const periodLabel = reportType === 'MONTHLY' 
    ? `เดือน ${selectedMonth}/${selectedYear} (Line: ${selectedLine})`
    : `ทั้งปี ${selectedYear} (Line: ${selectedLine})`;

  // Group by Part No for the per-part summary table
  const partSummaryList = useMemo(() => {
    const map = new Map<string, {
      partNo: string;
      partName: string;
      line: string;
      regrindCount: number;
      totalRepairCost: number;
      newEquivalentCost: number;
      grossSaving: number;
      netSaving: number;
      actualCount: number;
      estimatedCount: number;
    }>();

    filteredReportTx.forEach(t => {
      const existing = map.get(t.partNo) || {
        partNo: t.partNo,
        partName: t.partName,
        line: t.machineLine,
        regrindCount: 0,
        totalRepairCost: 0,
        newEquivalentCost: 0,
        grossSaving: 0,
        netSaving: 0,
        actualCount: 0,
        estimatedCount: 0
      };

      existing.regrindCount += 1;
      existing.totalRepairCost += t.totalRepairCost;
      existing.newEquivalentCost += t.newPurchaseEquivalentCost;
      existing.grossSaving += t.grossSaving;
      existing.netSaving += t.netSaving;
      if (t.hasActualLife) {
        existing.actualCount += 1;
      } else {
        existing.estimatedCount += 1;
      }

      map.set(t.partNo, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.netSaving - a.netSaving);
  }, [filteredReportTx]);

  const handleExportExcel = () => {
    costSavingService.exportToExcel(filteredReportTx, reportMetrics, periodLabel);
  };

  const handleExportCsv = () => {
    costSavingService.exportToCsv(filteredReportTx);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Top Filter and Export Bar */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Scope Selector */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setReportType('MONTHLY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                reportType === 'MONTHLY' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              รายงานรายเดือน (Monthly Report)
            </button>
            <button
              type="button"
              onClick={() => setReportType('YEARLY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                reportType === 'YEARLY' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              รายงานรายปี (Yearly Report)
            </button>
          </div>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value) || 2026)}
            className="px-3.5 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="2026">ปี 2026</option>
            <option value="2025">ปี 2025</option>
            <option value="2024">ปี 2024</option>
          </select>

          {/* Month Selector if Monthly */}
          {reportType === 'MONTHLY' && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value) || 1)}
              className="px-3.5 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>เดือน {m}</option>
              ))}
            </select>
          )}

          {/* Line Selector */}
          <select
            value={selectedLine}
            onChange={e => setSelectedLine(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกไลน์การผลิต (ALL)</option>
            <option value="E1">LINE E1</option>
            <option value="E2">LINE E2</option>
            <option value="E3-1">LINE E3</option>
            <option value="E4">LINE E4</option>
            <option value="E5">LINE E5</option>
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-2xl text-xs cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            title="ส่งออกรายงานฉบับสมบูรณ์เป็นไฟล์ Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs cursor-pointer border border-white/10 flex items-center gap-2 transition-all active:scale-95"
            title="ส่งออกข้อมูลดิบเป็นไฟล์ CSV"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>ดาวน์โหลด CSV</span>
          </button>
        </div>
      </div>

      {/* Executive Report Summary KPI Strip */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#00FF7F]" />
              <span>สรุปผลการประหยัดงบประมาณ: {periodLabel}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              แยกแสดงยอดประหยัดขั้นต้น (Gross) ออกจากยอดประหยัดสุทธิ (Net) และแยก Actual จาก Estimated
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold">
            {filteredReportTx.length} ธุรกรรมการเจียร
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs font-mono">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">มูลค่าซื้อใหม่เทียบเคียง</span>
            <span className="text-sm font-bold text-white">
              ฿{reportMetrics.newPurchaseEquivalentCost.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">ต้นทุนค่าเจียรซ่อมรวม</span>
            <span className="text-sm font-bold text-cyan-300">
              ฿{reportMetrics.totalRegrindingCost.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5">Gross Saving (ขั้นต้น)</span>
            <span className="text-sm font-bold text-teal-300">
              ฿{reportMetrics.grossSaving.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-[#00FF7F]/10 rounded-2xl border border-[#00FF7F]/30">
            <span className="text-[10px] text-emerald-300 block mb-0.5 font-bold">Net Saving (สุทธิ)</span>
            <span className="text-base font-black text-[#00FF7F]">
              ฿{reportMetrics.netSaving.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/30">
            <span className="text-[10px] text-emerald-300 block mb-0.5 font-bold">Actual Net Saving</span>
            <span className="text-sm font-black text-emerald-400">
              ฿{reportMetrics.actualNetSaving.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block">({reportMetrics.actualTransactionsCount} รายการ)</span>
          </div>

          <div className="p-3 bg-amber-950/40 rounded-2xl border border-amber-500/30">
            <span className="text-[10px] text-amber-300 block mb-0.5 font-bold">Estimated Net Saving</span>
            <span className="text-sm font-black text-amber-400">
              ฿{reportMetrics.estimatedNetSaving.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block">({reportMetrics.estimatedTransactionsCount} รายการ)</span>
          </div>
        </div>
      </div>

      {/* Part Summary Details Table */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white uppercase tracking-wider">
              รายงานรายละเอียดจำแนกตาม Part (Detailed Breakdown per Part)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
              {partSummaryList.length} รายการแม่พิมพ์
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            แสดงยอดรวมต้นทุนและผลประหยัดสุทธิจริงของแต่ละชิ้นส่วน
          </span>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-white/10 text-[11px] text-slate-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-3.5">Part No.</th>
                <th className="py-3 px-3.5">ชื่อชิ้นส่วนแม่พิมพ์</th>
                <th className="py-3 px-3 text-center">ไลน์</th>
                <th className="py-3 px-3 text-center">จำนวนครั้งที่เจียร</th>
                <th className="py-3 px-3 text-right">ต้นทุนซ่อมรวม</th>
                <th className="py-3 px-3 text-right">จัดซื้อใหม่เทียบเคียง</th>
                <th className="py-3 px-3 text-right">Gross Saving</th>
                <th className="py-3 px-3 text-right">Net Saving (สุทธิ)</th>
                <th className="py-3 px-3 text-center">สถานะผลจริง/ประมาณการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {partSummaryList.length > 0 ? (
                partSummaryList.map(item => (
                  <tr key={item.partNo} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-300 font-mono whitespace-nowrap">
                      {item.partNo}
                    </td>
                    <td className="py-3 px-3.5 font-sans text-white font-medium">
                      {item.partName}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-400">
                      L-{item.line}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-300 font-bold">
                      {item.regrindCount} ครั้ง
                    </td>
                    <td className="py-3 px-3 text-right text-white whitespace-nowrap">
                      ฿{item.totalRepairCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                      ฿{item.newEquivalentCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-teal-300 whitespace-nowrap font-bold">
                      ฿{item.grossSaving.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-base font-black text-[#00FF7F] whitespace-nowrap">
                      ฿{item.netSaving.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                        {item.actualCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Actual: {item.actualCount}
                          </span>
                        )}
                        {item.estimatedCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Est: {item.estimatedCount}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    ไม่มีรายการธุรกรรมในรอบรายงานที่เลือก
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
