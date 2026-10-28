import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  Filter, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { 
  RegrindingTransactionItem, 
  QualityResultCode,
  CostDashboardFilter 
} from '../../types/costSaving';
import { ProductionLineId } from '../../types';
import { TransactionModal } from './TransactionModal';
import { costSavingService } from '../../services/costSavingService';

interface RegrindingTransactionTabProps {
  transactions: RegrindingTransactionItem[];
  onRefresh: () => void;
}

export const RegrindingTransactionTab: React.FC<RegrindingTransactionTabProps> = ({
  transactions,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [lifeStatusFilter, setLifeStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RegrindingTransactionItem | null>(null);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (lineFilter !== 'ALL' && t.machineLine !== lineFilter) return false;
      if (qualityFilter !== 'ALL' && t.qualityResult !== qualityFilter) return false;
      if (lifeStatusFilter === 'ACTUAL_ONLY' && !t.hasActualLife) return false;
      if (lifeStatusFilter === 'ESTIMATED_ONLY' && t.hasActualLife) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mId = t.repairId.toLowerCase().includes(q);
        const mPart = t.partNo.toLowerCase().includes(q);
        const mName = t.partName.toLowerCase().includes(q);
        const mSup = t.supplier.toLowerCase().includes(q);
        if (!mId && !mPart && !mName && !mSup) return false;
      }
      return true;
    });
  }, [transactions, searchTerm, lineFilter, qualityFilter, lifeStatusFilter]);

  const handleDelete = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการธุรกรรมการเจียรนี้? ข้อมูลการคำนวณจะถูกลบออกจากระบบ')) {
      const res = costSavingService.deleteTransaction(id);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.message);
      }
    }
  };

  const getQualityBadge = (code: QualityResultCode) => {
    switch (code) {
      case 'PASS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#00FF7F] border border-emerald-500/40">PASS</span>;
      case 'CONDITIONAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">CONDITIONAL</span>;
      case 'REWORK':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">REWORK</span>;
      case 'SCRAP':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">SCRAP</span>;
      default:
        return <span>{code}</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Top Filter and Add Bar */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Repair ID, Part No., Part Name หรือ Supplier..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Line Filter */}
          <select
            value={lineFilter}
            onChange={e => setLineFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกไลน์ (All Lines)</option>
            <option value="E1">LINE E1</option>
            <option value="E2">LINE E2</option>
            <option value="E3-1">LINE E3</option>
            <option value="E4">LINE E4</option>
            <option value="E5">LINE E5</option>
          </select>

          {/* Quality Filter */}
          <select
            value={qualityFilter}
            onChange={e => setQualityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกสถานะคุณภาพ (Quality All)</option>
            <option value="PASS">PASS (ผ่าน)</option>
            <option value="CONDITIONAL">CONDITIONAL (มีเงื่อนไข)</option>
            <option value="REWORK">REWORK (แก้ไขซ้ำ)</option>
            <option value="SCRAP">SCRAP (คัดทิ้ง)</option>
          </select>

          {/* Life Status Filter */}
          <select
            value={lifeStatusFilter}
            onChange={e => setLifeStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกสถานะข้อมูลอายุ</option>
            <option value="ACTUAL_ONLY">ผลจริงเท่านั้น (Actual Life)</option>
            <option value="ESTIMATED_ONLY">ค่าประมาณการ (Estimated)</option>
          </select>
        </div>

        {/* Add Transaction Button */}
        <button
          type="button"
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#00FF7F] to-emerald-400 hover:from-[#00dd70] hover:to-emerald-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-[#00FF7F]/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกงานเจียรใหม่ (New Transaction)</span>
        </button>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#00FF7F]" />
            <span className="font-black text-white uppercase tracking-wider">
              บันทึกธุรกรรมงานเจียรแม่พิมพ์และผลประหยัด (Regrinding Transactions Ledger)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
              {filtered.length} รายการ
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            แสดงต้นทุนรวม, Gross/Net Saving และสถานะอายุใช้งาน Actual vs Estimated
          </span>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-white/10 text-[11px] text-slate-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-3">Repair ID</th>
                <th className="py-3 px-3">Part No. / ชื่อชิ้นส่วน</th>
                <th className="py-3 px-2.5 text-center">ไลน์</th>
                <th className="py-3 px-2.5 text-center">วันที่ซ่อม</th>
                <th className="py-3 px-2 text-center">รอบที่</th>
                <th className="py-3 px-2.5 text-right">ต้นทุนซ่อมรวม</th>
                <th className="py-3 px-2.5 text-right">ซื้อใหม่เทียบเคียง</th>
                <th className="py-3 px-2.5 text-right">ประหยัดสุทธิ (Net)</th>
                <th className="py-3 px-2 text-center">Saving %</th>
                <th className="py-3 px-2.5 text-center">อายุการใช้งาน</th>
                <th className="py-3 px-2 text-center">คุณภาพ</th>
                <th className="py-3 px-2.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filtered.length > 0 ? (
                filtered.map((t, idx) => (
                  <tr key={`${t.id}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3 font-bold text-cyan-300 font-mono whitespace-nowrap">
                      {t.repairId}
                    </td>
                    <td className="py-3 px-3 font-sans text-white">
                      <div className="font-bold font-mono text-cyan-400 text-xs">{t.partNo}</div>
                      <div className="text-[11px] text-slate-300 truncate max-w-[180px]">{t.partName}</div>
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-400">
                      L-{t.machineLine}
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-300 text-[11px]">
                      {t.repairDate}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap text-amber-300 font-bold">
                      #{t.regrindingNo}
                    </td>
                    <td className="py-3 px-2.5 text-right text-white font-bold whitespace-nowrap">
                      ฿{t.totalRepairCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right text-slate-400 whitespace-nowrap">
                      ฿{t.newPurchaseEquivalentCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right font-black text-[#00FF7F] whitespace-nowrap text-sm">
                      ฿{t.netSaving.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap font-bold text-[#00FF7F]">
                      {t.savingPercentage}%
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap">
                      {t.hasActualLife ? (
                        <div title="ยืนยันจากประวัติใช้งานจริง (Verified Actual Life)">
                          <span className="font-bold text-emerald-400 block text-xs">
                            {(t.actualLifeAfterRepair || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ACTUAL
                          </span>
                        </div>
                      ) : (
                        <div title="ยังไม่มีผลจริง ใช้ค่าคาดการณ์ (Estimated Life)">
                          <span className="text-amber-300 block text-xs font-semibold">
                            {t.expectedLifeAfterRepair.toLocaleString()}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ESTIMATED
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      {getQualityBadge(t.qualityResult)}
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTransaction(t);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="แก้ไขบันทึกงานซ่อม"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
                    ไม่พบรายการธุรกรรมงานเจียรตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTransaction={editingTransaction}
        onSaved={() => onRefresh()}
      />
    </div>
  );
};
