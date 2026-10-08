import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Sparkles, 
  Plus, 
  RotateCcw, 
  Calendar, 
  Check, 
  AlertTriangle, 
  Layers, 
  User, 
  Hash, 
  Wrench, 
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { ProductionLineId } from '../../types';
import { PinHistoryEntry, getLineStageConfigs } from '../../views/InteractiveDieLayoutView';
import { formatShots } from '../../services/calculationService';
import { safeStorage } from '../../services/safeStorage';

export const MASTER_LOGS_STORAGE_KEY = 'findie_master_history_logs_v2';

export const loadStoredMasterLogs = (): PinHistoryEntry[] => {
  try {
    const raw = safeStorage.getItem(MASTER_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading stored master logs:', err);
  }
  return [];
};

export const saveStoredMasterLogs = (logs: PinHistoryEntry[]) => {
  try {
    safeStorage.setItem(MASTER_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (err) {
    console.warn('Error saving stored master logs:', err);
  }
};

// Generate realistic factory baseline maintenance logs
export const generateStandardMasterHistory = (targetScope: ProductionLineId | 'ALL' = 'ALL'): PinHistoryEntry[] => {
  const lines: ProductionLineId[] = targetScope === 'ALL' 
    ? ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5']
    : [targetScope];

  const technicians = ['ช่างสมชาย (Toolroom Lead)', 'ช่างวิชัย (Die Specialist)', 'ช่างประเสริฐ (Maintenance Tech)', 'ช่างกิตติศักดิ์ (Senior Tech)', 'ช่างสุรชัย (Press Specialist)'];
  const generatedLogs: PinHistoryEntry[] = [];
  const now = new Date();

  lines.forEach((lineId, lineIdx) => {
    const stages = getLineStageConfigs(lineId);
    if (!stages || stages.length === 0) return;

    // Stage 1: Draw / Piercing - Replace Pins
    const s1 = stages[0];
    const date1 = new Date(now.getTime() - (lineIdx * 48 + 4) * 3600 * 1000);
    generatedLogs.push({
      id: `SET-LOG-${lineId}-01`,
      dateTime: date1.toISOString().slice(0, 16).replace('T', ' '),
      lineId,
      stageId: s1.stageId,
      stageName: s1.stageName,
      pinCode: 'P01',
      partName: `${s1.shortName} Punch Pin`,
      actionType: 'REPLACE_NEW',
      actionLabelTh: 'เปลี่ยนอะไหล่ใหม่ (Replace New)',
      machineShot: 1250000 + lineIdx * 150000,
      pinShot: 350000,
      technician: technicians[lineIdx % technicians.length],
      remarks: 'เปลี่ยนอะไหล่ใหม่ตามรอบอายุการใช้งาน (Preventive Maintenance Schedule)'
    });

    // Stage 2: Slit or Second Stage - Regrind Blade
    if (stages.length > 1) {
      const s2 = stages[1];
      const date2 = new Date(now.getTime() - (lineIdx * 36 + 18) * 3600 * 1000);
      generatedLogs.push({
        id: `SET-LOG-${lineId}-02`,
        dateTime: date2.toISOString().slice(0, 16).replace('T', ' '),
        lineId,
        stageId: s2.stageId,
        stageName: s2.stageName,
        pinCode: 'B01',
        partName: `${s2.shortName} Die / Blade`,
        actionType: 'REGRIND',
        actionLabelTh: 'ส่งเจียรลับคม (Regrind)',
        machineShot: 1180000 + lineIdx * 120000,
        pinShot: 180000,
        technician: technicians[(lineIdx + 1) % technicians.length],
        regrindDepthMm: 0.20,
        shimThicknessMm: 0.20,
        remarks: 'เจียรลับคมรอบมาตรฐาน (Standard Regrind) รองแผ่นชิม 0.20mm'
      });
    }

    // Stage 3: Forming or Middle Stage - Broken Chipped Replacement
    if (stages.length > 2) {
      const s3 = stages[2];
      const date3 = new Date(now.getTime() - (lineIdx * 24 + 30) * 3600 * 1000);
      generatedLogs.push({
        id: `SET-LOG-${lineId}-03`,
        dateTime: date3.toISOString().slice(0, 16).replace('T', ' '),
        lineId,
        stageId: s3.stageId,
        stageName: s3.stageName,
        pinCode: 'F01',
        partName: `${s3.shortName} Forming Die`,
        actionType: 'BROKEN',
        actionLabelTh: 'แจ้งชำรุด / แตกหัก (Broken Alert)',
        machineShot: 950000 + lineIdx * 90000,
        pinShot: 140000,
        technician: technicians[(lineIdx + 2) % technicians.length],
        remarks: 'ตรวจพบรอยบิ่นขอบชิ้นงาน (Chipping observed on fin collar) ถอดเปลี่ยนอะไหล่สำรอง'
      });
    }

    // Stage 4: Cut off or Last Stage - Setup Change Overhaul
    if (stages.length > 3) {
      const sLast = stages[stages.length - 1];
      const date4 = new Date(now.getTime() - (lineIdx * 12 + 60) * 3600 * 1000);
      generatedLogs.push({
        id: `SET-LOG-${lineId}-04`,
        dateTime: date4.toISOString().slice(0, 16).replace('T', ' '),
        lineId,
        stageId: sLast.stageId,
        stageName: sLast.stageName,
        pinCode: 'ALL',
        partName: `${sLast.shortName} Full Assembly`,
        actionType: 'SETUP_CHANGE',
        actionLabelTh: 'Toolroom Setup Overhaul',
        machineShot: 800000 + lineIdx * 80000,
        pinShot: 250000,
        technician: technicians[(lineIdx + 3) % technicians.length],
        remarks: 'ตรวจสอบระยะประกบ Alignment และโอเวอร์ฮอลล์ประจำไตรมาส (Quarterly Overhaul)'
      });
    }
  });

  return generatedLogs;
};

// =========================================================================
// 1. CLEAR MASTER LOG MODAL (ล้างประวัติ)
// =========================================================================
interface ClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLineId: ProductionLineId;
  onConfirmClear: (scope: 'CURRENT_LINE' | 'ALL_LINES', clearSystemReplacements: boolean) => void;
}

export const MasterLogClearModal: React.FC<ClearModalProps> = ({
  isOpen,
  onClose,
  selectedLineId,
  onConfirmClear
}) => {
  const [scope, setScope] = useState<'CURRENT_LINE' | 'ALL_LINES'>('CURRENT_LINE');
  const [clearSystemReplacements, setClearSystemReplacements] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono animate-fadeIn">
      <div className="liquid-glass-sheet bg-[#090d16]/95 border border-rose-500/30 rounded-2xl text-white max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">ล้างประวัติ Master Log</h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                เลือกขอบเขตข้อมูลประวัติการซ่อมบำรุงและเปลี่ยนอะไหล่ที่ต้องการล้าง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="font-sans leading-relaxed">
            <b>คำเตือน:</b> การล้างประวัติจะไม่สามารถกู้คืนได้ ประวัติการเปลี่ยนอะไหล่และงานเจียรลับคมของชิ้นส่วนจะถูกล้างเป็น 0 รายการ
          </div>
        </div>

        {/* Scope Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 block">เลือกขอบเขตที่ต้องการล้าง:</label>

          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            scope === 'CURRENT_LINE'
              ? 'bg-rose-950/30 border-rose-500/60 text-white shadow-sm'
              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
          }`}>
            <input
              type="radio"
              name="clearScope"
              checked={scope === 'CURRENT_LINE'}
              onChange={() => setScope('CURRENT_LINE')}
              className="mt-0.5 text-rose-500 focus:ring-rose-500"
            />
            <div>
              <span className="font-bold text-xs">ล้างเฉพาะไลน์ปัจจุบัน (Line {selectedLineId})</span>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                ล้างประวัติการเปลี่ยน/ซ่อมบำรุงเฉพาะชิ้นส่วนในแม่พิมพ์สายการผลิต {selectedLineId} เท่านั้น
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            scope === 'ALL_LINES'
              ? 'bg-rose-950/40 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
          }`}>
            <input
              type="radio"
              name="clearScope"
              checked={scope === 'ALL_LINES'}
              onChange={() => setScope('ALL_LINES')}
              className="mt-0.5 text-rose-500 focus:ring-rose-500"
            />
            <div>
              <span className="font-bold text-xs text-rose-300">ล้างประวัติทุกไลน์ทั้งหมด (All Lines E1 - E5)</span>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                รีเซ็ตและล้างประวัติ Master Log ของทุกสายการผลิตในโรงงานให้ว่างเปล่า 0 รายการ
              </p>
            </div>
          </label>
        </div>

        {/* Option: Clear central records */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={clearSystemReplacements}
            onChange={e => setClearSystemReplacements(e.target.checked)}
            className="rounded text-rose-500 focus:ring-rose-500"
          />
          <span className="text-slate-300 font-sans">
            ล้างประวัติการเปลี่ยนอะไหล่ในฐานข้อมูลระบบกลาง (System Replacement History) ด้วย
          </span>
        </label>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmClear(scope, clearSystemReplacements);
              onClose();
            }}
            className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.5)] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>ยืนยันการล้างประวัติ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. SET MASTER LOG MODAL (Set ประวัติ / Seed / Add Manual Log)
// =========================================================================
interface SetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLineId: ProductionLineId;
  onApplySeed: (logs: PinHistoryEntry[], scope: ProductionLineId | 'ALL') => void;
  onAddManualLog: (log: PinHistoryEntry) => void;
}

export const MasterLogSetModal: React.FC<SetModalProps> = ({
  isOpen,
  onClose,
  selectedLineId,
  onApplySeed,
  onAddManualLog
}) => {
  const [activeTab, setActiveTab] = useState<'SEED' | 'MANUAL'>('SEED');

  // Seed tab state
  const [seedScope, setSeedScope] = useState<ProductionLineId | 'ALL'>('ALL');
  const [seedType, setSeedType] = useState<'STANDARD' | 'REGRIND_FOCUS' | 'DEFECT_FOCUS'>('STANDARD');

  // Manual entry tab state
  const [manualLineId, setManualLineId] = useState<ProductionLineId>(selectedLineId);
  const stages = getLineStageConfigs(manualLineId);
  const [manualStageId, setManualStageId] = useState<string>(stages[0]?.stageId || '');
  const [manualPinCode, setManualPinCode] = useState<string>('P01');
  const [manualPartName, setManualPartName] = useState<string>(stages[0]?.shortName ? `${stages[0]?.shortName} Punch` : 'Punch Pin');
  const [manualAction, setManualAction] = useState<'REPLACE_NEW' | 'REGRIND' | 'BROKEN' | 'SETUP_CHANGE'>('REPLACE_NEW');
  const [manualMachineShot, setManualMachineShot] = useState<number>(1500000);
  const [manualPinShot, setManualPinShot] = useState<number>(350000);
  const [manualTechnician, setManualTechnician] = useState<string>('ช่างสมชาย (Toolroom Lead)');
  const [manualRemarks, setManualRemarks] = useState<string>('เปลี่ยนอะไหล่ตามรอบอายุการใช้งาน (Preventive Maintenance Schedule)');
  const [manualDateTime, setManualDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [manualRegrindDepth, setManualRegrindDepth] = useState<number>(0.20);
  const [manualShim, setManualShim] = useState<number>(0.20);

  // Update part name when stage changes
  const handleStageChange = (stageId: string) => {
    setManualStageId(stageId);
    const found = stages.find(s => s.stageId === stageId);
    if (found) {
      setManualPartName(`${found.shortName} Die/Punch`);
    }
  };

  if (!isOpen) return null;

  const handleExecuteSeed = () => {
    let generated = generateStandardMasterHistory(seedScope);
    if (seedType === 'REGRIND_FOCUS') {
      generated = generated.map(g => ({
        ...g,
        actionType: 'REGRIND',
        actionLabelTh: 'ส่งเจียรลับคม (Regrind)',
        regrindDepthMm: 0.20,
        shimThicknessMm: 0.20,
        remarks: 'เจียรลับคมใบมีดและคมตัดตามรอบ (Standard Regrind Cycle)'
      }));
    } else if (seedType === 'DEFECT_FOCUS') {
      generated = generated.map(g => ({
        ...g,
        actionType: 'BROKEN',
        actionLabelTh: 'แจ้งชำรุด / แตกหัก (Broken Alert)',
        remarks: 'ตรวจพบบิ่นแตกร้าวระหว่างผลิต เปลี่ยนอะไหล่เร่งด่วน (Emergency Replacement)'
      }));
    }
    onApplySeed(generated, seedScope);
    onClose();
  };

  const handleExecuteManual = (e: React.FormEvent) => {
    e.preventDefault();
    const actionLabelTh = manualAction === 'REPLACE_NEW' ? 'เปลี่ยนอะไหล่ใหม่ (Replace New)' :
                          manualAction === 'REGRIND' ? 'ส่งเจียรลับคม (Regrind)' :
                          manualAction === 'BROKEN' ? 'แจ้งชำรุด / แตกหัก (Broken Alert)' :
                          'Toolroom Setup Overhaul';

    const stageObj = stages.find(s => s.stageId === manualStageId);

    const newLog: PinHistoryEntry = {
      id: `MANUAL-LOG-${Date.now()}`,
      dateTime: manualDateTime.replace('T', ' '),
      lineId: manualLineId,
      stageId: manualStageId,
      stageName: stageObj?.stageName || manualStageId,
      pinCode: manualPinCode.trim() || 'ALL',
      partName: manualPartName.trim() || 'Part Die',
      actionType: manualAction,
      actionLabelTh,
      machineShot: Number(manualMachineShot) || 0,
      pinShot: Number(manualPinShot) || 0,
      technician: manualTechnician.trim() || 'Technician',
      regrindDepthMm: manualAction === 'REGRIND' ? Number(manualRegrindDepth) : undefined,
      shimThicknessMm: manualAction === 'REGRIND' ? Number(manualShim) : undefined,
      remarks: manualRemarks.trim() || '-'
    };

    onAddManualLog(newLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono animate-fadeIn">
      <div className="liquid-glass-sheet bg-[#090d16]/95 border border-cyan-500/40 rounded-2xl text-white max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex-none p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">Set ประวัติของ Master Log</h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                กำหนดชุดประวัติเริ่มต้น (Seed Data) หรือเพิ่มรายการประวัติย้อนหลังด้วยตนเอง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex-none px-4 pt-3 border-b border-white/10 bg-black/20 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SEED')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'SEED'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set ประวัติมาตรฐาน (Seed Factory Logs)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'MANUAL'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ บันทึกประวัติย้อนหลัง (Add Manual Log)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs">
          {activeTab === 'SEED' ? (
            <div className="space-y-4">
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-1 text-slate-300 font-sans">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>ระบบจำลองประวัติมาตรฐานโรงงาน (Standard Baseline Generator)</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  ระบบจะสร้างชุดข้อมูลประวัติการซ่อมบำรุงที่สมจริง ครอบคลุมทั้งงานเปลี่ยนใหม่ (Replace), เจียรลับคม (Regrind), และแจ้งชำรุด (Broken) พร้อมยอดช็อต วันที่ และชื่อช่างผู้บันทึกอย่างสมบูรณ์
                </p>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300 block">เลือกสายการผลิตที่ต้องการ Set ประวัติ:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeedScope(selectedLineId)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      seedScope === selectedLineId
                        ? 'bg-cyan-950/40 border-cyan-400 text-white font-bold shadow-sm'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">เฉพาะไลน์ปัจจุบัน</div>
                    <div className="text-sm font-black text-cyan-300 mt-0.5">Line {selectedLineId}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeedScope('ALL')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      seedScope === 'ALL'
                        ? 'bg-cyan-950/40 border-cyan-400 text-white font-bold shadow-sm'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">ทุกไลน์พร้อมกัน</div>
                    <div className="text-sm font-black text-amber-300 mt-0.5">All Lines (E1 - E5)</div>
                  </button>
                </div>
              </div>

              {/* Preset Style */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300 block">เลือกรูปแบบชุดประวัติ:</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    seedType === 'STANDARD'
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="seedType"
                      checked={seedType === 'STANDARD'}
                      onChange={() => setSeedType('STANDARD')}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-200">ชุดประวัติมาตรฐานโรงงาน (Standard Mix)</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        ผสมผสานงานเปลี่ยนอะไหล่ใหม่ (Replace), ส่งเจียรลับคม (Regrind) และการตรวจเช็ค Alignment ครบทุก Stage
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    seedType === 'REGRIND_FOCUS'
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="seedType"
                      checked={seedType === 'REGRIND_FOCUS'}
                      onChange={() => setSeedType('REGRIND_FOCUS')}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-cyan-300">ชุดประวัติเน้นงานเจียรลับคม (Regrind & Sharpening Focus)</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        เน้นบันทึกงานเจียรลับคมของใบมีด Slit และคมตัด พร้อมระบุค่าความลึก (Depth) และแผ่นชิม (Shim)
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    seedType === 'DEFECT_FOCUS'
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="seedType"
                      checked={seedType === 'DEFECT_FOCUS'}
                      onChange={() => setSeedType('DEFECT_FOCUS')}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-rose-300">ชุดประวัติงานชำรุดและการเปลี่ยนเร่งด่วน (Defect & Incident Focus)</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        จำลองกรณีเข็มหัก บิ่น แตก เพื่อทดสอบระบบการแจ้งเตือนชิ้นส่วนชำรุดและการเปลี่ยนอะไหล่เร่งด่วน
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecuteManual} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Line */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">สายการผลิต (Line):</label>
                  <select
                    value={manualLineId}
                    onChange={e => {
                      const newLine = e.target.value as ProductionLineId;
                      setManualLineId(newLine);
                      const newStages = getLineStageConfigs(newLine);
                      if (newStages[0]) {
                        setManualStageId(newStages[0].stageId);
                        setManualPartName(`${newStages[0].shortName} Punch`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-cyan-300"
                  >
                    {(['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'] as ProductionLineId[]).map(l => (
                      <option key={l} value={l}>LINE {l}</option>
                    ))}
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Stage แม่พิมพ์:</label>
                  <select
                    value={manualStageId}
                    onChange={e => handleStageChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                  >
                    {stages.map(s => (
                      <option key={s.stageId} value={s.stageId}>{s.shortName} ({s.stageName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pin / Position Code */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">ตำแหน่ง (Position / Block):</label>
                  <input
                    type="text"
                    value={manualPinCode}
                    onChange={e => setManualPinCode(e.target.value)}
                    placeholder="เช่น P01, B01, หรือ ALL"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                  />
                </div>

                {/* Part Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">ชื่อชิ้นส่วน (Part Name):</label>
                  <input
                    type="text"
                    value={manualPartName}
                    onChange={e => setManualPartName(e.target.value)}
                    placeholder="เช่น Punch Pin Ø7"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Action Type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">ประเภทงาน (Action):</label>
                  <select
                    value={manualAction}
                    onChange={e => setManualAction(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-amber-300"
                  >
                    <option value="REPLACE_NEW">● เปลี่ยนอะไหล่ใหม่ (Replace New)</option>
                    <option value="REGRIND">⚡ ส่งเจียรลับคม (Regrind)</option>
                    <option value="BROKEN">✖ แจ้งชำรุด / แตกหัก (Broken)</option>
                    <option value="SETUP_CHANGE">⚙ Toolroom Setup Overhaul</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">วัน-เวลา (Date & Time):</label>
                  <input
                    type="datetime-local"
                    value={manualDateTime}
                    onChange={e => setManualDateTime(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              {/* Machine Shot & Pin Shot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Shot เครื่องสะสม:</label>
                  <input
                    type="number"
                    value={manualMachineShot}
                    onChange={e => setManualMachineShot(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Shot ใช้งานของชิ้นส่วน:</label>
                  <input
                    type="number"
                    value={manualPinShot}
                    onChange={e => setManualPinShot(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-emerald-400"
                  />
                </div>
              </div>

              {/* Regrind Details if Regrind */}
              {manualAction === 'REGRIND' && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-300 block mb-1">ความลึกที่เจียร (Depth mm):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={manualRegrindDepth}
                      onChange={e => setManualRegrindDepth(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-300 block mb-1">ความหนาแผ่นชิม (Shim mm):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={manualShim}
                      onChange={e => setManualShim(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Technician */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">ช่างผู้บันทึก (Technician):</label>
                <input
                  type="text"
                  value={manualTechnician}
                  onChange={e => setManualTechnician(e.target.value)}
                  placeholder="เช่น ช่างสมชาย"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">สาเหตุ / หมายเหตุ (Remarks):</label>
                <input
                  type="text"
                  value={manualRemarks}
                  onChange={e => setManualRemarks(e.target.value)}
                  placeholder="ระบุสาเหตุการเปลี่ยนหรือผลการตรวจสอบ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>บันทึกประวัติ Master Log</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer (for SEED tab) */}
        {activeTab === 'SEED' && (
          <div className="flex-none p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">
              พร้อม Set ข้อมูล {seedScope === 'ALL' ? 'ทุกไลน์ (E1 - E5)' : `ไลน์ ${seedScope}`} ทันที
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteSeed}
                className="px-5 py-2 text-xs font-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>บันทึกและ Set ประวัติทันที</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 3. DELETE SINGLE LOG MODAL (ลบรายการเดี่ยว)
// =========================================================================
interface DeleteSingleModalProps {
  log: PinHistoryEntry | null;
  onClose: () => void;
  onConfirmDelete: (logId: string) => void;
}

export const MasterLogDeleteModal: React.FC<DeleteSingleModalProps> = ({
  log,
  onClose,
  onConfirmDelete
}) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono animate-fadeIn">
      <div className="liquid-glass-sheet bg-[#090d16]/95 border border-rose-500/40 rounded-2xl text-white max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">ยืนยันการลบรายการประวัติ</h3>
            <p className="text-[11px] text-slate-400 font-sans">รายการนี้จะถูกลบออกจาก Master Log อย่างถาวร</p>
          </div>
        </div>

        <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">วัน-เวลา:</span>
            <span className="font-bold text-slate-200">{log.dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Line & Stage:</span>
            <span className="font-bold text-cyan-300">Line {log.lineId} - {log.stageName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ตำแหน่ง / ชิ้นส่วน:</span>
            <span className="font-bold text-slate-200">{log.pinCode} ({log.partName})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ประเภทงาน:</span>
            <span className="font-bold text-amber-300">{log.actionLabelTh || log.actionType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ช่างผู้บันทึก:</span>
            <span className="text-slate-300">{log.technician}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(log.id);
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบรายการนี้</span>
          </button>
        </div>
      </div>
    </div>
  );
};
