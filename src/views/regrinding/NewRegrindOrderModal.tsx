import React, { useState, useEffect } from 'react';
import { ProductionLineId } from '../../types';
import { ToolingPartMasterItem, DefectReasonCode, DEFECT_REASON_LABELS } from '../../types/regrind';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import { PlusCircle, Wrench, X } from 'lucide-react';
import { storageService } from '../../services/storageService';

interface NewRegrindOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolingMasters: ToolingPartMasterItem[];
  onSubmit: (data: {
    partName: string;
    partCode: string;
    lineId: ProductionLineId;
    stageName: string;
    positionId: string;
    defectReason: DefectReasonCode;
    defectNotes: string;
    previousLengthMm: number;
    regrindCountBefore: number;
    urgency: 'HIGH' | 'NORMAL' | 'LOW';
    receivedBy: string;
  }) => void;
  currentUserName?: string;
}

export const NewRegrindOrderModal: React.FC<NewRegrindOrderModalProps> = ({
  isOpen,
  onClose,
  toolingMasters,
  onSubmit,
  currentUserName = 'Somchai Prasert'
}) => {
  const [selectedPartName, setSelectedPartName] = useState<string>('');
  const [lineId, setLineId] = useState<ProductionLineId>('E1');
  const [stageName, setStageName] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('P-01');
  const [defectReason, setDefectReason] = useState<DefectReasonCode>('NORMAL_WEAR');
  const [defectNotes, setDefectNotes] = useState<string>('');
  const [previousLengthMm, setPreviousLengthMm] = useState<number>(0);
  const [regrindCountBefore, setRegrindCountBefore] = useState<number>(0);
  const [urgency, setUrgency] = useState<'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [receivedBy, setReceivedBy] = useState<string>(currentUserName);
  
  const [stageGroups, setStageGroups] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const groups = storageService.getStageGroups();
      setStageGroups(groups);
      
      if (toolingMasters.length > 0) {
        const first = toolingMasters[0];
        setSelectedPartName(first.partName);
        setPreviousLengthMm(first.nominalLengthMm);
        
        // Find stage for this part if possible
        const partMaster = storageService.getPartMasters().find(p => p.partCode === first.partCode);
        if (partMaster && partMaster.stageName) {
          setStageName(partMaster.stageName);
        } else if (groups.length > 0) {
          setStageName(groups[0]);
        }
      }
    }
  }, [isOpen, toolingMasters]);

  if (!isOpen) return null;

  const currentMaster = toolingMasters.find(m => m.partName === selectedPartName) || toolingMasters[0];

  const handleMasterChange = (name: string) => {
    setSelectedPartName(name);
    const m = toolingMasters.find(x => x.partName === name);
    if (m) {
      setPreviousLengthMm(m.nominalLengthMm);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMaster) return;

    onSubmit({
      partName: currentMaster.partName,
      partCode: currentMaster.partCode,
      lineId,
      stageName,
      positionId: positionId.trim() || 'P-01',
      defectReason,
      defectNotes: defectNotes.trim() || 'นำส่งเจียรตามรอบการบำรุงรักษา',
      previousLengthMm,
      regrindCountBefore,
      urgency,
      receivedBy: receivedBy.trim() || 'Tooling Tech'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>เปิดใบงานเจียรใหม่ (New Regrind Work Order)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Tooling Part Master Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              เลือกชิ้นส่วนทูลลิ่ง / แม่พิมพ์ (Tooling Part Name) *
            </label>
            <div className="flex items-center gap-3">
              <ToolingPicThumbnail
                picCategory={currentMaster?.picCategory}
                partName={currentMaster?.partName}
                size="md"
              />
              <select
                value={selectedPartName}
                onChange={e => handleMasterChange(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-cyan-500"
              >
                {toolingMasters.map(m => (
                  <option key={m.id} value={m.partName}>
                    {m.partName} ({m.partCode}) - {m.tubeSize}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สายการผลิต (Line ID) *
              </label>
              <select
                value={lineId}
                onChange={e => setLineId(e.target.value as ProductionLineId)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="E1">E1 (Standard 7mm)</option>
                <option value="E2">E2 (Micro 5mm)</option>
                <option value="E3-1">E3-1 (Fin Press)</option>
                <option value="E3-2">E3-2 (Fin Press)</option>
                <option value="E3-3">E3-3 (Fin Press)</option>
                <option value="E4">E4 (5mm High Speed)</option>
                <option value="E5">E5 (5mm Dual Row)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                กลุ่มสเตจ (Stage Group) *
              </label>
              <select
                value={stageName}
                onChange={e => setStageName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                {stageGroups.map(stg => (
                  <option key={stg} value={stg}>
                    {stg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ตำแหน่ง (Position ID)
              </label>
              <input
                type="text"
                value={positionId}
                onChange={e => setPositionId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                placeholder="เช่น BURR-04, P-02"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ความเร่งด่วน (Urgency)
              </label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as 'HIGH' | 'NORMAL' | 'LOW')}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="NORMAL">ปกติ (Normal)</option>
                <option value="HIGH">ด่วนมาก (High Priority)</option>
                <option value="LOW">ต่ำ (Low Priority)</option>
              </select>
            </div>
          </div>

          {/* Dimensional Specs */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ความยาววัดได้ปัจจุบัน (Length mm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={previousLengthMm}
                  onChange={e => setPreviousLengthMm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
                <span className="absolute right-3 top-1.5 text-slate-400 font-mono">mm</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                สเปคต่ำสุด: {currentMaster?.minAllowedLengthMm.toFixed(2)} mm
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                เจียรมาแล้ว (Regrind Count)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={regrindCountBefore}
                  onChange={e => setRegrindCountBefore(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  / Max {currentMaster?.maxRegrindCount} ครั้ง
                </span>
              </div>
            </div>
          </div>

          {/* Defect Code & Reason */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              สาเหตุที่ส่งเจียร (Defect Reason Code) *
            </label>
            <select
              value={defectReason}
              onChange={e => setDefectReason(e.target.value as DefectReasonCode)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {(Object.keys(DEFECT_REASON_LABELS) as DefectReasonCode[]).map(code => (
                <option key={code} value={code}>
                  {DEFECT_REASON_LABELS[code].th} ({DEFECT_REASON_LABELS[code].en})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              บันทึกเพิ่มเติม / อาการ (Defect Notes)
            </label>
            <input
              type="text"
              value={defectNotes}
              onChange={e => setDefectNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="เช่น ขอบมีรอยครีบสะสม ช่างหน้างานถอดมาส่งเจียรลับคม"
            />
          </div>

          {/* Receiver Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ผู้รับงานเข้าคิว (Received By) *
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>บันทึกเปิดใบงานเข้าคิว</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
