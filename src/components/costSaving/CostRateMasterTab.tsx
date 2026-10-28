import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  Edit3, 
  Power, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Info, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Search,
  RefreshCw,
  History
} from 'lucide-react';
import { CostRateMasterItem } from '../../types/costSaving';
import { costSavingService } from '../../services/costSavingService';
import { CostRateModal } from './CostRateModal';

interface CostRateMasterTabProps {
  rates: CostRateMasterItem[];
  onRefresh: () => void;
}

export const CostRateMasterTab: React.FC<CostRateMasterTabProps> = ({
  rates,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRate, setSelectedRate] = useState<CostRateMasterItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const filteredRates = rates.filter(r => {
    const q = searchTerm.toLowerCase();
    return r.machineId.toLowerCase().includes(q) ||
      r.machineName.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      r.rateCalculationMethod.toLowerCase().includes(q);
  });

  const handleToggleActive = (id: string, name: string) => {
    const res = costSavingService.toggleCostRateMasterActive(id);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="w-full space-y-5 animate-fadeIn">
      
      {/* Top Banner Toolbar */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-[#0d1527] to-slate-900 border border-white/10 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
              <span>อัตราต้นทุนเครื่องจักรเจียร & ค่าแรงช่าง (Grinding Machine & Labor Cost Rates)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                MASTER RATES
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              กำหนด Machine Cost Rate, Labor Rate, Consumables Rate และวันที่มีผลบังคับใช้สำหรับคำนวณงานซ่อมจริง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Machine ID / ชื่อเครื่องจักร..."
              className="pl-9 pr-3 py-1.5 bg-slate-950 border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none w-48 sm:w-60"
            />
          </div>

          {/* Add New Rate */}
          <button
            type="button"
            onClick={() => {
              setSelectedRate(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มอัตราต้นทุนใหม่ (Add Rate)</span>
          </button>
        </div>
      </div>

      {/* Safety Guideline Note */}
      <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl flex items-start gap-3 text-xs text-cyan-200">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-cyan-300 font-bold">
            ข้อกำหนดทางวิศวกรรมการคิดต้นทุนเครื่องจักร & ค่าแรง (Engineering Costing Principles)
          </strong>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • <strong>Machine Cost Rate:</strong> ควรสะท้อนค่าเสื่อมราคาเครื่องจักร (Depreciation), ค่าบำรุงรักษา (Maintenance), ค่าพลังงานไฟฟ้า (Power) และค่าใช้จ่ายจัดสรรให้เครื่องจักร
            <br />
            • <strong>Double-Counting Prevention:</strong> หากอัตราค่าเครื่องจักรรวมค่าแรงช่างประจำเครื่องจักรแล้ว (Includes Labor = TRUE) ระบบจะปรับค่าแรงให้เป็น 0 โดยอัตโนมัติเมื่อคำนวณงานซ่อมเพื่อป้องกันการคิดซ้ำ
            <br />
            • <strong>Historical Preservation:</strong> การแก้ไขอัตราจะบันทึกเป็นประวัติเวอร์ชัน (Revision History) โดยไม่กระทบยอดต้นทุนในอดีตของงานซ่อมเก่า
          </p>
        </div>
      </div>

      {/* Rates Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRates.map(rate => (
          <div
            key={rate.id}
            className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
              rate.isActive 
                ? 'bg-[#0c121e]/90 border-white/15 hover:border-cyan-400/50 shadow-xl' 
                : 'bg-slate-950/60 border-white/5 opacity-60'
            }`}
          >
            {/* Top Status & Machine ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-slate-900 border border-white/15 text-cyan-300">
                    {rate.machineId}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    rate.isActive 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {rate.isActive ? 'ACTIVE (ใช้งานอยู่)' : 'INACTIVE (ปิดใช้)'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRate(rate);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="แก้ไขอัตราต้นทุน"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rate.id, rate.machineName)}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      rate.isActive 
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                    }`}
                    title={rate.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Machine Name */}
              <h4 className="text-sm font-bold text-white mb-3 line-clamp-1">
                {rate.machineName}
              </h4>

              {/* Rates Breakdown Box */}
              <div className="p-3 bg-black/50 rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Machine Cost Rate:</span>
                  <span className="font-bold text-cyan-300 text-sm">฿{rate.machineCostRatePerHour.toFixed(2)} / hr</span>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                  <span className="text-slate-400">Operator Labor Rate:</span>
                  <span className={`font-bold ${rate.includesLaborInMachineRate ? 'text-amber-400 line-through' : 'text-emerald-400'}`}>
                    {rate.includesLaborInMachineRate ? '฿0.00 (รวมในเครื่องแล้ว)' : `฿${rate.operatorLaborRatePerHour.toFixed(2)} / hr`}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px]">
                  <span className="text-slate-400">Consumables Rate:</span>
                  <span className="text-slate-300">฿{(rate.consumablesCostRatePerHour || 0).toFixed(2)} / hr</span>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px]">
                  <span className="text-slate-400">QC Inspection Rate:</span>
                  <span className="text-slate-300">฿{(rate.qcCostRatePerHour || 0).toFixed(2)} / hr</span>
                </div>
              </div>

              {/* Labor Inclusion Badge Notice */}
              <div className="mt-2.5">
                {rate.includesLaborInMachineRate ? (
                  <div className="p-2 bg-amber-950/50 border border-amber-500/40 rounded-xl text-[10px] text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>รวมค่าแรงช่างในอัตราเครื่องจักรแล้ว (ป้องกันคิดค่าแรงซ้ำ)</span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-[10px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>คิดค่าแรงช่างแยกตามชั่วโมงปฏิบัติงานจริง</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {rate.notes && (
                <p className="mt-2 text-[11px] text-slate-400 italic line-clamp-2">
                  "{rate.notes}"
                </p>
              )}
            </div>

            {/* Bottom Metadata */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                มีผล: {rate.effectiveDate}
              </span>
              <span className="text-slate-500 truncate max-w-[120px]">
                {rate.rateCalculationMethod}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredRates.length === 0 && (
        <div className="p-12 text-center bg-slate-900/40 border border-white/10 rounded-3xl text-slate-400 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold">ไม่พบรายการอัตราต้นทุนเครื่องจักรที่ตรงกับคำค้นหา</p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-xs text-cyan-400 hover:underline"
          >
            ล้างคำค้นหา
          </button>
        </div>
      )}

      {/* Modal */}
      <CostRateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialRate={selectedRate}
        onSaved={onRefresh}
      />
    </div>
  );
};
