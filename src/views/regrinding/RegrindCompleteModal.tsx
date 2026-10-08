import React, { useState, useEffect } from 'react';
import { RegrindWorkTicket } from '../../types/regrind';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import { Ruler, ShieldCheck, AlertTriangle, CheckCircle2, X, Layers, Sparkles } from 'lucide-react';

interface RegrindCompleteModalProps {
  ticket: RegrindWorkTicket;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    remainingLengthMm: number;
    grindDepthMm: number;
    shimAddedMm: number;
    toolMaterial?: string;
    technicianName: string;
    verifiedBy: string;
    remarks: string;
  }) => void;
  currentUserName?: string;
}

const MATERIAL_OPTIONS = [
  { id: 'SKD11', label: 'SKD11', desc: 'Alloy Tool Steel (มาตรฐานแม่พิมพ์)' },
  { id: 'Carbide', label: 'Carbide (คาร์ไบด์)', desc: 'Tungsten Carbide ทนสึกหรอสูงพิเศษ' },
  { id: 'SKD61', label: 'SKD61', desc: 'Hot-work Die Steel ทนความร้อนสูง' },
  { id: 'HSS', label: 'HSS', desc: 'High Speed Steel เหล็กกล้ารอบจัด' },
];

const QUICK_DEPTHS = [0.10, 0.15, 0.20, 0.25, 0.30, 0.50];

export const RegrindCompleteModal: React.FC<RegrindCompleteModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onConfirm,
  currentUserName = 'Kittisak Wongsuwan'
}) => {
  const [remainingLength, setRemainingLength] = useState<number>(ticket.lengthAfterGrindMm || 68.00);
  const [grindDepth, setGrindDepth] = useState<number>(ticket.grindDepthMm || 0.25);
  const [shimThickness, setShimThickness] = useState<number>(ticket.shimAddedMm || 0.25);
  const [toolMaterial, setToolMaterial] = useState<string>(ticket.toolMaterial || 'SKD11');
  const [isCustomMaterial, setIsCustomMaterial] = useState<boolean>(false);
  const [customMaterialText, setCustomMaterialText] = useState<string>('');
  
  const [technicianName, setTechnicianName] = useState<string>(ticket.assignedTechnician || currentUserName);
  const [verifiedBy, setVerifiedBy] = useState<string>(ticket.verifiedBy || 'Anan Chaikit (Manager/QC)');
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (ticket) {
      const prev = ticket.previousLengthMm || ticket.nominalLengthMm || 70.00;
      const depth = ticket.grindDepthMm || 0.25;
      setGrindDepth(depth);
      setRemainingLength(Number((prev - depth).toFixed(2)));
      setShimThickness(depth);
      setTechnicianName(ticket.assignedTechnician || currentUserName);
      
      const mat = ticket.toolMaterial || 'SKD11';
      if (MATERIAL_OPTIONS.some(m => m.id === mat)) {
        setToolMaterial(mat);
        setIsCustomMaterial(false);
      } else {
        setToolMaterial('CUSTOM');
        setIsCustomMaterial(true);
        setCustomMaterialText(mat);
      }
    }
  }, [ticket, currentUserName]);

  if (!isOpen) return null;

  const minLimit = ticket.minAllowedLengthMm || 65.00;
  const isOutOfSpec = remainingLength < minLimit;
  const nextRegrindCycle = (ticket.regrindCountBefore || 0) + 1;
  const isExceedMaxCycles = nextRegrindCycle > (ticket.maxRegrindAllowed || 4);

  // Auto calculate when grind depth changes
  const handleGrindDepthChange = (val: number) => {
    const clampedVal = Math.max(0, val);
    setGrindDepth(clampedVal);
    const prev = ticket.previousLengthMm || ticket.nominalLengthMm || 70.00;
    const nextRem = Number(Math.max(0, prev - clampedVal).toFixed(2));
    setRemainingLength(nextRem);
    setShimThickness(clampedVal); // By standard, shim matches ground amount
  };

  const handleRemainingLengthChange = (val: number) => {
    setRemainingLength(val);
    const prev = ticket.previousLengthMm || ticket.nominalLengthMm || 70.00;
    const depth = Number(Math.max(0, prev - val).toFixed(2));
    setGrindDepth(depth);
    setShimThickness(depth);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName.trim()) {
      alert('กรุณากรอกชื่อช่างผู้ดำเนินการเจียร');
      return;
    }

    const finalMaterial = isCustomMaterial ? (customMaterialText.trim() || 'SKD11') : toolMaterial;

    onConfirm({
      remainingLengthMm: remainingLength,
      grindDepthMm: grindDepth,
      shimAddedMm: shimThickness,
      toolMaterial: finalMaterial,
      technicianName: technicianName.trim(),
      verifiedBy: verifiedBy.trim(),
      remarks: remarks.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0D1527] text-slate-100 border border-slate-700/80 rounded-2xl p-4 sm:p-5 max-w-xl w-full shadow-2xl space-y-3.5 max-h-[94vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <ToolingPicThumbnail
              picCategory={ticket.picCategory}
              partName={ticket.partName}
              size="md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  บันทึกผลการเจียรลับคม
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {ticket.jobCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {ticket.partName} • ไลน์ {ticket.lineId} • ตำแหน่ง {ticket.positionId || 'Main Station'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realtime Dimension Warning / Pass Banner */}
        {isOutOfSpec || isExceedMaxCycles ? (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/80 text-rose-200 text-xs space-y-1 shadow-inner">
            <div className="font-bold flex items-center gap-1.5 text-rose-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>แจ้งเตือน: ขนาดต่ำกว่าเกณฑ์มาตรฐาน (Out of Spec / Over Limit)</span>
            </div>
            <p className="text-[11.5px] text-rose-200/90 leading-relaxed">
              {isOutOfSpec && `• ความยาวคงเหลือ ${remainingLength.toFixed(2)} mm ต่ำกว่าขีดจำกัดขั้นต่ำ (${minLimit.toFixed(2)} mm)`}
              {isExceedMaxCycles && ` • เจียรครั้งที่ ${nextRegrindCycle} เกินรอบสูงสุด (${ticket.maxRegrindAllowed} ครั้ง)`}
            </p>
            <p className="font-semibold text-rose-300 text-[11px] pt-0.5">
              * ระบบจะบันทึกสถานะเป็น "ทิ้ง (Scrap)" และสร้างใบขอสั่งซื้อ (PR) ไปยังฝ่ายจัดซื้ออัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2.5 shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-emerald-300 text-xs">
                ขนาดอยู่ในเกณฑ์มาตรฐานสากล (In-Spec Standard)
              </div>
              <div className="text-[11.5px] text-emerald-300/80">
                ความยาวคงเหลือ {remainingLength.toFixed(2)} mm ≥ {minLimit.toFixed(2)} mm (รอบเจียรที่ {nextRegrindCycle}/{ticket.maxRegrindAllowed})
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* 1. Dimension & Grinding Stats */}
          <div className="bg-[#131E35] rounded-xl p-3 sm:p-3.5 border border-slate-700/80 space-y-3">
            <div className="font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Ruler className="w-4 h-4" />
                <span>บันทึกขนาด & มิติความยาว (Grinding Dimensions)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                รอบเจียร: <strong className="text-cyan-300 font-mono">{nextRegrindCycle}/{ticket.maxRegrindAllowed}</strong>
              </span>
            </div>

            {/* Reference Chips */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0B1220] p-2 rounded-lg border border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block">ความยาวเดิม (Nominal)</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {ticket.nominalLengthMm?.toFixed(2)} mm
                </span>
              </div>
              <div className="bg-[#0B1220] p-2 rounded-lg border border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block">ขีดจำกัดต่ำสุด (Min Spec)</span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {minLimit.toFixed(2)} mm
                </span>
              </div>
              <div className="bg-[#0B1220] p-2 rounded-lg border border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 block">ความยาวก่อนเจียร</span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {ticket.previousLengthMm?.toFixed(2)} mm
                </span>
              </div>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ระยะที่เจียรออก (Grind Depth) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="5.00"
                    value={grindDepth}
                    onChange={e => handleGrindDepthChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A101D] border border-cyan-500/50 text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">mm</span>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">ลัด:</span>
                  {QUICK_DEPTHS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleGrindDepthChange(d)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                        Math.abs(grindDepth - d) < 0.001
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {d.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ความยาวหลังเจียร (Remaining Length) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="200.00"
                    value={remainingLength}
                    onChange={e => handleRemainingLengthChange(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg bg-[#0A101D] border font-mono font-bold text-sm focus:ring-2 outline-none ${
                      isOutOfSpec
                        ? 'border-rose-500 text-rose-400 focus:ring-rose-500'
                        : 'border-emerald-500/50 text-emerald-300 focus:ring-emerald-400'
                    }`}
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">mm</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  * คำนวณอัตโนมัติจากความยาวก่อนเจียร - ระยะที่เจียรออก
                </span>
              </div>
            </div>

            {/* Shim Added Input */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                แผ่นชิมหนุนเสริมความสูงแม่พิมพ์ (Shim Plate Thickness Added)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={shimThickness}
                  onChange={e => setShimThickness(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0A101D] border border-slate-700 font-mono text-slate-200 focus:border-cyan-500 outline-none text-xs"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">mm</span>
              </div>
            </div>
          </div>

          {/* 2. Tool Material Selection (SKD11, Carbide, etc.) */}
          <div className="bg-[#131E35] rounded-xl p-3 sm:p-3.5 border border-slate-700/80 space-y-2.5">
            <label className="block font-bold text-slate-200 flex items-center gap-1.5 text-cyan-400">
              <Layers className="w-4 h-4" />
              <span>ประเภทวัสดุชิ้นงาน (Tool Material Type) *</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MATERIAL_OPTIONS.map(opt => {
                const isSelected = !isCustomMaterial && toolMaterial === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setToolMaterial(opt.id);
                      setIsCustomMaterial(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400'
                        : 'bg-[#0B1220] border-slate-700/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    <span className="text-[9.5px] text-slate-400 mt-1 line-clamp-1 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Material Input Option */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomMaterial(!isCustomMaterial);
                  if (!isCustomMaterial) setToolMaterial('CUSTOM');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  isCustomMaterial
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                + ระบุวัสดุอื่นๆ เอง
              </button>

              {isCustomMaterial && (
                <input
                  type="text"
                  value={customMaterialText}
                  onChange={e => setCustomMaterialText(e.target.value)}
                  placeholder="เช่น SKH-51, Tungsten Alloy, V4"
                  className="flex-1 px-3 py-1 rounded-lg bg-[#0A101D] border border-amber-500/70 text-amber-200 text-xs focus:ring-1 focus:ring-amber-400 outline-none"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* 3. Technicians & Inspector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                ชื่อช่างผู้เจียรลับคม (Technician) *
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0A101D] border border-slate-700 text-white focus:border-cyan-500 outline-none text-xs"
                placeholder="เช่น กิตติศักดิ์ วงศ์สุวรรณ"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                ผู้ตรวจสอบคุณภาพ (QC / Inspector)
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={e => setVerifiedBy(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0A101D] border border-slate-700 text-white focus:border-cyan-500 outline-none text-xs"
                placeholder="เช่น อนันต์ ชัยกิจ (Manager/QC)"
              />
            </div>
          </div>

          {/* 4. Remarks */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              หมายเหตุการเจียร (Remarks / Observation)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0A101D] border border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 outline-none text-xs"
              placeholder="เช่น เจียรด้วยหิน Diamond CBN ละเอียดพิเศษ คืนสต๊อกพร้อมใช้"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-bold shadow-lg transition-all flex items-center gap-1.5 ${
                isOutOfSpec || isExceedMaxCycles
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isOutOfSpec || isExceedMaxCycles
                  ? 'ยืนยันตัดทิ้ง & ส่งสั่งซื้อ (Scrap & Auto-PR)'
                  : 'บันทึกเสร็จสิ้น & เข้าสต๊อกพร้อมใช้'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
