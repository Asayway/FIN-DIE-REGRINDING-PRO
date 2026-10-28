import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  History, 
  DollarSign, 
  Tag, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Filter
} from 'lucide-react';
import { PartCostMasterItem, PartCategoryType } from '../../types/costSaving';
import { PartCostModal } from './PartCostModal';
import { costSavingService } from '../../services/costSavingService';

interface PartCostMasterTabProps {
  masters: PartCostMasterItem[];
  onRefresh: () => void;
}

export const PartCostMasterTab: React.FC<PartCostMasterTabProps> = ({
  masters,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartCostMasterItem | null>(null);

  // Price revision modal state
  const [viewHistoryPart, setViewHistoryPart] = useState<PartCostMasterItem | null>(null);

  // Filtered masters
  const filteredMasters = useMemo(() => {
    return masters.filter(m => {
      if (selectedType !== 'ALL' && m.partType !== selectedType) return false;
      if (selectedLine !== 'ALL' && m.machineLine !== 'ALL' && m.machineLine !== selectedLine) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNo = m.partNo.toLowerCase().includes(q);
        const matchName = m.partName.toLowerCase().includes(q);
        const matchSupplier = m.supplier.toLowerCase().includes(q);
        if (!matchNo && !matchName && !matchSupplier) return false;
      }
      return true;
    });
  }, [masters, searchTerm, selectedType, selectedLine]);

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Top Action & Search Bar */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Part No., Part Name หรือ Supplier..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกประเภท (All Types)</option>
            <option value="PUNCH">PUNCH (พั้นช์)</option>
            <option value="DIE">DIE (ดาย)</option>
            <option value="BLADE">BLADE (ใบมีดตัด)</option>
            <option value="PIN">PIN (สลัก/พิน)</option>
            <option value="CORNER_CUT">CORNER CUT</option>
          </select>

          {/* Line Filter */}
          <select
            value={selectedLine}
            onChange={e => setSelectedLine(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">ทุกไลน์ (All Lines)</option>
            <option value="E1">LINE E1</option>
            <option value="E2">LINE E2</option>
            <option value="E3-1">LINE E3</option>
            <option value="E4">LINE E4</option>
            <option value="E5">LINE E5</option>
          </select>
        </div>

        {/* Add Part Cost Master Button */}
        <button
          type="button"
          onClick={() => {
            setEditingPart(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่ม Part Cost Master ใหม่</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-[#0c1018]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white uppercase tracking-wider">
              ทะเบียนต้นทุนแม่พิมพ์ (Part Cost Master Dictionary)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
              {filteredMasters.length} รายการ
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            ฐานข้อมูลอ้างอิงราคาซื้อใหม่และขีดจำกัดสเปคทางวิศวกรรม
          </span>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-white/10 text-[11px] text-slate-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-3.5">Part No.</th>
                <th className="py-3 px-3.5">ชื่อชิ้นส่วนแม่พิมพ์ (Part Name)</th>
                <th className="py-3 px-3 text-center">ประเภท</th>
                <th className="py-3 px-3 text-center">ไลน์</th>
                <th className="py-3 px-3 text-right">ราคาจัดซื้อใหม่</th>
                <th className="py-3 px-3 text-right">อายุเป้าหมาย (Shots)</th>
                <th className="py-3 px-3">ผู้ผลิต (Supplier)</th>
                <th className="py-3 px-3 text-center">เริ่มมีผล</th>
                <th className="py-3 px-3 text-center">รอบเจียรสูงสุด</th>
                <th className="py-3 px-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredMasters.length > 0 ? (
                filteredMasters.map((m, idx) => (
                  <tr key={`${m.id}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-bold text-cyan-300 font-mono whitespace-nowrap">
                      {m.partNo}
                    </td>
                    <td className="py-3 px-3.5 font-sans text-white font-medium">
                      <div>{m.partName}</div>
                      {m.disposeAfterOneUse && (
                        <span className="inline-block px-1.5 py-0.2 text-[9px] rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 mt-0.5">
                          Single Use (ห้ามเจียร)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-white/10">
                        {m.partType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-400">
                      {m.machineLine === 'ALL' ? 'ALL' : `L-${m.machineLine}`}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-white whitespace-nowrap">
                      ฿{m.newPurchasePrice.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{m.currency}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 whitespace-nowrap font-bold">
                      {m.expectedNewToolLife.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300 truncate max-w-[150px]">
                      {m.supplier}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap text-[11px]">
                      {m.effectiveDate || '-'}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300 whitespace-nowrap">
                      {m.disposeAfterOneUse ? '0 (ทิ้ง)' : `${m.maxRegrindCount} ครั้ง`}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPart(m);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="แก้ไขข้อมูลและราคา"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {m.priceRevisionHistory && m.priceRevisionHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewHistoryPart(m)}
                            className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                            title={`ดูประวัติการปรับราคา (${m.priceRevisionHistory.length} ครั้ง)`}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                    ไม่พบข้อมูลชิ้นส่วนตามเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part Cost Modal */}
      <PartCostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPart={editingPart}
        onSaved={() => onRefresh()}
      />

      {/* Standalone Price Revision Audit Modal */}
      {viewHistoryPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0c1018] border border-amber-500/40 rounded-3xl p-5 shadow-2xl text-white font-sans space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">
                  ประวัติราคาจัดซื้อ: {viewHistoryPart.partNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewHistoryPart(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {viewHistoryPart.partName} • ราคาปัจจุบัน: <strong className="text-white font-mono">฿{viewHistoryPart.newPurchasePrice.toLocaleString()} {viewHistoryPart.currency}</strong>
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {viewHistoryPart.priceRevisionHistory.map((rev, idx) => (
                <div key={rev.id || idx} className="p-3 bg-slate-950 rounded-2xl border border-white/10 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-white text-sm">
                      ฿{rev.newPrice.toLocaleString()} {rev.currency}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {rev.revisionDate.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  {rev.oldPrice !== rev.newPrice && (
                    <div className="text-[11px] text-slate-400">
                      ราคาเดิม: ฿{rev.oldPrice.toLocaleString()}
                    </div>
                  )}
                  <div className="text-[11px] text-amber-300 mt-1">
                    เหตุผล: {rev.reason}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    บันทึกโดย: {rev.changedBy} • มีผล: {rev.effectiveDate}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setViewHistoryPart(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
