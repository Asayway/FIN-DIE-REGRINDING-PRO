import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Power,
  Wrench,
  PauseCircle,
  PlayCircle,
  Plus,
  Layers,
  Sparkles,
  Save,
  Info,
  Check,
  X,
  Cpu,
  Factory,
  Database
} from 'lucide-react';
import { 
  ProductionLineId, 
  LineActiveConfiguration, 
  MachineStatus, 
  TubeSize, 
  FinType, 
  AluminumMaterial,
  PartMaster
} from '../types';
import { storageService } from '../services/storageService';
import { sortStagesInOrder } from '../utils/stageUtils';
import { useLanguage } from '../i18n';

interface LineDieSpecificationViewProps {
  onAddNewPartClick?: () => void;
}

interface LineOption {
  id: ProductionLineId;
  label: string;
  tag: string;
  defaultTube: TubeSize;
  defaultFin: string;
  defaultPitch: string;
  defaultMaterial: string;
  defaultDieCode: string;
  defaultSpm: number;
}

const ALL_LINE_OPTIONS: LineOption[] = [
  { id: 'E1', label: 'E1', tag: 'Ø7 Slit', defaultTube: 'Ø7', defaultFin: 'Slit Old', defaultPitch: '4P (Pitch)', defaultMaterial: 'PCM (0.1mm)', defaultDieCode: 'FD-E1-07', defaultSpm: 100 },
  { id: 'E2', label: 'E2', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'Slit Old', defaultPitch: '4P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: 'FD-E2-05', defaultSpm: 100 },
  { id: 'E3-1', label: 'E3-1', tag: 'Slit 3P', defaultTube: 'Ø7', defaultFin: 'New Slit', defaultPitch: '3P (Pitch)', defaultMaterial: 'PCM (0.1mm)', defaultDieCode: 'FD-E31-07', defaultSpm: 100 },
  { id: 'E3-2', label: 'E3-2', tag: 'WL+ 4P', defaultTube: 'Ø7', defaultFin: 'Wide Louver', defaultPitch: '4P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: 'FD-E32-07', defaultSpm: 100 },
  { id: 'E3-3', label: 'E3-3', tag: 'Corr 4P', defaultTube: 'Ø7', defaultFin: 'Corrugate', defaultPitch: '4P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: 'FD-E33-07', defaultSpm: 100 },
  { id: 'E4', label: 'E4', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'Slit Old', defaultPitch: '3P (Pitch)', defaultMaterial: 'BARE (0.1mm)', defaultDieCode: 'FD-E4-05', defaultSpm: 100 },
  { id: 'E5', label: 'E5', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'New Slit', defaultPitch: '3P (Pitch)', defaultMaterial: 'BARE (0.1mm)', defaultDieCode: 'FD-E5-05', defaultSpm: 100 },
];

export const LineDieSpecificationView: React.FC<LineDieSpecificationViewProps> = ({
  onAddNewPartClick
}) => {
  const { language } = useLanguage();
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('E1');
  const [lineConfigs, setLineConfigs] = useState<Record<string, LineActiveConfiguration>>({});
  const [lineStatuses, setLineStatuses] = useState<Record<string, MachineStatus>>({});
  const [activeE3Die, setActiveE3Die] = useState<'E3-1' | 'E3-2' | 'E3-3'>(() => storageService.getActiveE3FinDie());
  const [stageGroups, setStageGroups] = useState<string[]>(() => storageService.getStageGroups());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Part Modal state
  const [showAddPartModal, setShowAddPartModal] = useState<boolean>(false);
  const [newPartData, setNewPartData] = useState<PartMaster>({
    partCode: '',
    partName: '',
    partNameTh: '',
    stageName: 'Piercing & Burring',
    category: 'PUNCH',
    drawingNumber: '',
    unit: 'PCS',
    unitCostThb: 0,
    tubeSizeCompat: 'BOTH'
  });

  const loadData = () => {
    setActiveE3Die(storageService.getActiveE3FinDie());
    setStageGroups(storageService.getStageGroups());
    const rawConfigs = storageService.getLineConfigs();
    const configMap: Record<string, LineActiveConfiguration> = {};
    const statusMap: Record<string, MachineStatus> = {};

    ALL_LINE_OPTIONS.forEach(opt => {
      const found = rawConfigs.find(c => c.lineId === opt.id);
      const liveData = storageService.getLineMonitoring(opt.id);
      const machineStatus = liveData?.machineStatus || (opt.id === 'E5' ? 'STOPPED' : 'RUNNING');
      
      statusMap[opt.id] = machineStatus;

      if (found) {
        configMap[opt.id] = {
          ...found,
          pathsCount: found.pathsCount || opt.defaultPitch,
          dieCode: found.dieCode || opt.defaultDieCode,
          defaultSpm: found.defaultSpm || opt.defaultSpm
        };
      } else {
        configMap[opt.id] = {
          id: `CFG-${opt.id}-AUTO`,
          lineId: opt.id,
          lineName: `Fin Press Line ${opt.id}`,
          dieCode: opt.defaultDieCode,
          dieName: `Fin Die ${opt.id} (${opt.tag})`,
          tubeSize: opt.defaultTube,
          finType: opt.defaultFin as any,
          material: opt.defaultMaterial as any,
          thicknessMm: 0.10,
          effectiveFrom: new Date().toISOString(),
          isActive: machineStatus === 'RUNNING',
          status: machineStatus === 'RUNNING' ? 'ACTIVE' : 'INACTIVE',
          defaultSpm: opt.defaultSpm,
          pathsCount: opt.defaultPitch,
          installedPartQuantities: {}
        };
      }
    });

    setLineConfigs(configMap);
    setLineStatuses(statusMap);
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleFieldChange = (lineId: ProductionLineId, field: keyof LineActiveConfiguration, value: any) => {
    const current = lineConfigs[lineId];
    if (!current) return;

    const updated: LineActiveConfiguration = {
      ...current,
      [field]: value
    };

    setLineConfigs(prev => ({
      ...prev,
      [lineId]: updated
    }));

    storageService.saveLineConfig(updated);
    showToast(`อัปเดตสเปก ${field.toString()} ของไลน์ ${lineId} เรียบร้อยแล้ว`);
  };

  const handleStatusChange = (lineId: ProductionLineId, status: MachineStatus) => {
    // If setting an E3 line to RUNNING, automatically make it the active die
    if (lineId.startsWith('E3-') && status === 'RUNNING') {
      storageService.setActiveE3FinDie(lineId as "E3-1" | "E3-2" | "E3-3");
    }

    setLineStatuses(prev => ({
      ...prev,
      [lineId]: status
    }));

    storageService.updateLineMachineStatus(lineId, status);
    
    // Also sync config active status
    const current = lineConfigs[lineId];
    if (current) {
      const updatedConfig: LineActiveConfiguration = {
        ...current,
        isActive: status === 'RUNNING',
        status: status === 'RUNNING' ? 'ACTIVE' : 'INACTIVE'
      };
      storageService.saveLineConfig(updatedConfig);
    }

    showToast(`เปลี่ยนสถานะไลน์ ${lineId} เป็น [${status}] เรียบร้อยแล้ว`);
  };

  const showToast = (msg: string) => {
    setFeedback({ type: 'success', message: msg });
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleSaveNewPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartData.partName.trim()) {
      alert('กรุณากรอกชื่ออะไหล่ (Part Name)');
      return;
    }

    const code = newPartData.partCode.trim()
      ? newPartData.partCode.toUpperCase().trim()
      : `P-${Date.now().toString().slice(-5)}`;

    const currentParts = storageService.getPartMasters();
    if (currentParts.some(p => p.partCode.toUpperCase() === code)) {
      alert(`ชิ้นส่วน ${newPartData.partName} มีอยู่ในระบบแล้ว`);
      return;
    }

    const created: PartMaster = {
      ...newPartData,
      partCode: code,
      partName: newPartData.partName.trim(),
      partNameTh: newPartData.partNameTh?.trim() || newPartData.partName.trim(),
      drawingNumber: newPartData.drawingNumber?.trim() || '-',
      unit: newPartData.unit || 'PCS',
      unitCostThb: Number(newPartData.unitCostThb) || 0
    };

    storageService.savePartMaster(created);
    setShowAddPartModal(false);
    showToast(`เพิ่มชิ้นส่วนใหม่ ${created.partName} เข้าระบบแคตตาล็อกเรียบร้อยแล้ว`);
    
    // Reset form
    setNewPartData({
      partCode: '',
      partName: '',
      partNameTh: '',
      stageName: 'Stage 1: Piercing & Burring',
      category: 'PUNCH',
      drawingNumber: '',
      unit: 'PCS',
      unitCostThb: 0,
      tubeSizeCompat: 'BOTH'
    });
  };

  const displayedLines = selectedLineFilter === 'ALL' 
    ? ALL_LINE_OPTIONS 
    : ALL_LINE_OPTIONS.filter(l => l.id === selectedLineFilter);

  return (
    <div className="space-y-4 font-sans text-slate-100 animate-fadeIn">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TOP BAR: LINE SELECTION PILLS & ADD NEW PART BUTTON */}
      <div className="bg-[#0b1329] border border-cyan-900/50 rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-extrabold text-cyan-400 tracking-wider flex items-center gap-1.5 mr-1">
            <Factory className="w-4 h-4" />
            <span>LINE:</span>
          </span>

          {/* ALL LINES PILL */}
          <button
            id="pill-all-lines"
            onClick={() => setSelectedLineFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
              selectedLineFilter === 'ALL'
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-lg shadow-cyan-950/50 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ALL LINES (7 Lines: E1-E5)</span>
          </button>

          {/* INDIVIDUAL LINE PILLS */}
          {ALL_LINE_OPTIONS.map(line => {
            const isSelected = selectedLineFilter === line.id;
            const status = lineStatuses[line.id] || 'RUNNING';
            const isOff = status === 'STOPPED';
            const isIdle = status === 'IDLE';
            const isMaint = status === 'MAINTENANCE';
            const isRunning = status === 'RUNNING';

            // Status dot color with glowing pulse
            const dotColorClass = isRunning
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
              : isIdle
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
              : isMaint
              ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)] animate-pulse'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse';

            // Badge text & color
            const statusBadgeText = isRunning ? 'RUN' : isIdle ? 'IDLE' : isMaint ? 'MAINT' : 'OFF';

            const badgeStyle = isRunning
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70'
              : isIdle
              ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 font-black'
              : isMaint
              ? 'bg-sky-950/90 text-sky-300 border-sky-600/70'
              : 'bg-rose-950/90 text-rose-300 border-rose-600/80 font-black';

            // Pill container background
            const pillContainerClass = isSelected
              ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-lg shadow-cyan-950/50 scale-105'
              : isRunning
              ? 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-emerald-500/60 hover:text-white'
              : isIdle
              ? 'bg-amber-950/30 text-amber-200 border-amber-800/60 hover:border-amber-500'
              : isMaint
              ? 'bg-sky-950/30 text-sky-200 border-sky-800/60 hover:border-sky-500'
              : 'bg-rose-950/30 text-rose-300 border-rose-900/60 hover:border-rose-700';

            return (
              <button
                key={line.id}
                id={`pill-line-${line.id}`}
                onClick={() => setSelectedLineFilter(line.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${pillContainerClass}`}
              >
                {/* Status Dot with permanent color */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColorClass}`} />
                
                <span>{line.label}</span>
                
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isSelected ? 'bg-slate-950/20 text-slate-900 font-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  {line.tag}
                </span>

                {/* Status Tag Badge */}
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono border ${badgeStyle}`}>
                  {statusBadgeText}
                </span>
              </button>
            );
          })}
        </div>

        {/* ADD NEW PART BUTTON */}
        <button
          id="btn-add-new-part"
          onClick={() => {
            if (onAddNewPartClick) {
              onAddNewPartClick();
            } else {
              setShowAddPartModal(true);
            }
          }}
          className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 font-mono ml-auto"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>+ เพิ่มชิ้นส่วนใหม่ (ADD NEW PART)</span>
        </button>
      </div>

      {/* SUB-HEADER BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500 text-cyan-300 font-mono text-[11px] font-bold">
            UNIFIED LINE & DIE SETTING
          </span>
          <span className="text-slate-400 font-thai">
            | ตั้งค่าสเปกไลน์ผลิตและสถานะเปิด/ปิดการทำงาน
          </span>
        </div>
        <div className="text-slate-400 font-mono text-xs">
          กำลังตั้งค่า: <span className="text-cyan-300 font-bold">{selectedLineFilter === 'ALL' ? 'ALL LINES (7 Lines: E1-E5)' : `LINE ${selectedLineFilter}`}</span>
        </div>
      </div>

      {/* LINE E3 ACTIVE FIN DIE SELECTION WIDGET */}
      {(selectedLineFilter === 'ALL' || selectedLineFilter.startsWith('E3')) && (
        <div className="bg-[#0A1120] border border-cyan-500/50 rounded-2xl p-4 shadow-xl mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                ไลน์ E3: การสลับใช้งาน Fin Die (Active Fin Die Selector for Machine E3)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                เครื่องปั๊ม E3 แชร์การผลิต 3 Fin Die (E3-1, E3-2, E3-3) ยอดช็อตเครื่องปั๊มจะถูกคำนวณสะสมเฉพาะ Fin Die ที่เลือกเปิดใช้งานอยู่เท่านั้น Fin Die อื่นจะถูกคงยอดช็อตเดิมไว้
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Fin Die ที่เปิดใช้งานขณะนี้:</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {activeE3Die === 'E3-1' ? 'E3-1 (Slit 3P)' : activeE3Die === 'E3-2' ? 'E3-2 (WL+ 4P)' : 'E3-3 (Corr 4P)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              { id: 'E3-1', label: 'E3-1 (Slit 3P)', tag: 'E3 Slit 3P', desc: 'Ø7 Slit, PCM (0.1mm)' },
              { id: 'E3-2', label: 'E3-2 (WL+ 4P)', tag: 'E3 WL+ 4P', desc: 'Ø7 Wide Louver, GOLD (0.1mm)' },
              { id: 'E3-3', label: 'E3-3 (Corr 4P)', tag: 'E3 New Cor 4P', desc: 'Ø7 New Corrugate, GOLD (0.1mm)' }
            ].map(item => {
              const isActive = activeE3Die === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    storageService.setActiveE3FinDie(item.id as any);
                    showToast(`สลับใช้งาน Fin Die ไลน์ E3 เป็น [${item.label}] เรียบร้อยแล้ว`);
                  }}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-extrabold text-xs ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {item.label}
                    </span>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                        🟢 ACTIVE (คำนวณช็อต)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                        ⏸️ STANDBY (คงยอดช็อตเดิม)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LINE SPEC CARDS */}
      <div className="space-y-4">
        {displayedLines.map(line => {
          const cfg = lineConfigs[line.id] || {
            dieCode: line.defaultDieCode,
            tubeSize: line.defaultTube,
            finType: line.defaultFin as any,
            material: line.defaultMaterial as any,
            pathsCount: line.defaultPitch,
            defaultSpm: line.defaultSpm
          };
          const currentStatus = lineStatuses[line.id] || 'RUNNING';
          const isRunning = currentStatus === 'RUNNING';
          const isStopped = currentStatus === 'STOPPED';
          const isIdle = currentStatus === 'IDLE';
          const isMaintenance = currentStatus === 'MAINTENANCE';

          return (
            <div 
              key={line.id}
              className="bg-[#0b1426] border border-cyan-900/40 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden transition-all hover:border-cyan-700/60"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  {/* Line Circle Badge */}
                  <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-500 flex items-center justify-center font-mono font-extrabold text-cyan-300 text-xs sm:text-sm shadow-inner px-1 text-center">
                    {line.label}
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide">
                        สเปกและสถานะสายการผลิต (LINE SPEC & STATUS) - ไลน์ {line.label} ({line.tag})
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                        isRunning 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500' 
                          : isStopped
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500'
                          : isIdle
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                          : 'bg-blue-950/80 text-blue-300 border-blue-500'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-thai mt-0.5">
                      ปรับสเปกขนาดท่อ, ลายฟิน, Pitch, ชนิดวัสดุ และกำหนดสถานะเปิด/ปิดการทำงานของไลน์ผลิต
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Grid (6 Spec Fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* 1. TUBE SIZE */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    1. TUBE SIZE (ขนาดท่อ)
                  </label>
                  <select
                    id={`tube-size-${line.id}`}
                    value={cfg.tubeSize || line.defaultTube}
                    onChange={(e) => handleFieldChange(line.id, 'tubeSize', e.target.value as TubeSize)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="Ø7">Ø7 (ท่อ 7 มม.)</option>
                    <option value="Ø5">Ø5 (ท่อ 5 มม.)</option>
                    <option value="Ø9.52">Ø9.52 (ท่อ 3/8")</option>
                    <option value="Ø8">Ø8 (ท่อ 8 มม.)</option>
                    <option value="Ø6.35">Ø6.35 (ท่อ 1/4")</option>
                  </select>
                </div>

                {/* 2. FIN TYPE */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    2. FIN TYPE (ลายฟิน)
                  </label>
                  <select
                    id={`fin-type-${line.id}`}
                    value={cfg.finType || line.defaultFin}
                    onChange={(e) => handleFieldChange(line.id, 'finType', e.target.value as FinType)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="Slit Old">Slit Old</option>
                    <option value="Slit (half)">Slit (half)</option>
                    <option value="New Slit">New Slit</option>
                    <option value="Slit (Full)">Slit (Full)</option>
                    <option value="Louver">Louver</option>
                    <option value="Wide Louver">Wide Louver</option>
                    <option value="New Corrugate">New Corrugate</option>
                    <option value="Corrugate">Corrugate</option>
                  </select>
                </div>

                {/* 3. DIE SPEC / PITCH */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    3. DIE SPEC / PITCH
                  </label>
                  <select
                    id={`die-spec-${line.id}`}
                    value={cfg.pathsCount || line.defaultPitch}
                    onChange={(e) => handleFieldChange(line.id, 'pathsCount', e.target.value)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="3P (Pitch)">3P (Pitch)</option>
                    <option value="4P (Pitch)">4P (Pitch)</option>
                  </select>
                </div>

                {/* 4. FIN MATERIAL */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    4. FIN MATERIAL (ชนิดวัสดุ)
                  </label>
                  <select
                    id={`fin-material-${line.id}`}
                    value={cfg.material || line.defaultMaterial}
                    onChange={(e) => handleFieldChange(line.id, 'material', e.target.value as AluminumMaterial)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer font-mono"
                  >
                    <option value="PCM (0.1mm)">PCM (0.1mm)</option>
                    <option value="BARE (0.1mm)">BARE (0.1mm)</option>
                    <option value="GOLD (0.1mm)">GOLD (0.1mm)</option>
                  </select>
                </div>

                {/* 5. DIE CODE & DIE NAME */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    5. DIE CODE & DIE NAME
                  </label>
                  <input
                    id={`die-code-${line.id}`}
                    type="text"
                    value={cfg.dieCode || line.defaultDieCode}
                    onChange={(e) => handleFieldChange(line.id, 'dieCode', e.target.value)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    placeholder="รหัสแม่พิมพ์..."
                  />
                </div>

                {/* 6. DEFAULT SPM */}
                <div className="space-y-1.5 bg-[#070d1a] border border-slate-800/90 p-2.5 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    6. DEFAULT SPM
                  </label>
                  <input
                    id={`default-spm-${line.id}`}
                    type="number"
                    value={cfg.defaultSpm || line.defaultSpm}
                    onChange={(e) => handleFieldChange(line.id, 'defaultSpm', Number(e.target.value) || 100)}
                    className="w-full bg-[#0e172a] border border-cyan-800/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="ความเร็ว SPM..."
                  />
                </div>
              </div>

              {/* OPERATIONAL STATUS SECTION */}
              <div className="space-y-2.5 bg-[#070d1c] border border-cyan-950/80 p-4 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-mono">
                        กำหนดสถานะการเปิด/ปิดไลน์ผลิต (LINE OPERATIONAL & PRODUCTION STATUS)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-thai">
                        เลือกสถานะไลน์ผลิต หากไลน์ไม่มีแผนผลิต ให้ตั้งค่าเป็น IDLE หรือ STOPPED (ปิดไลน์) ระบบจะแสดงสัญลักษณ์และแจ้งเตือนพนักงาน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400">STATUS:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                      isRunning
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : isStopped
                        ? 'bg-rose-950 text-rose-300 border-rose-500'
                        : isIdle
                        ? 'bg-amber-950 text-amber-300 border-amber-500'
                        : 'bg-blue-950 text-blue-300 border-blue-500'
                    }`}>
                      {isRunning ? '🟢 RUNNING' : isStopped ? '🔴 STOPPED' : isIdle ? '🟡 IDLE' : '🔧 MAINTENANCE'}
                    </span>
                  </div>
                </div>

                {/* 4 Status Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  {/* RUNNING BUTTON */}
                  <button
                    id={`btn-status-running-${line.id}`}
                    onClick={() => handleStatusChange(line.id, 'RUNNING')}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all border ${
                      isRunning
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/50'
                        : 'bg-[#0a141c] text-emerald-400/80 border-slate-800 hover:border-emerald-700/50 hover:bg-emerald-950/20'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-slate-950 animate-ping' : 'bg-emerald-500'}`} />
                    <span>RUNNING (เปิดผลิตปกติ)</span>
                  </button>

                  {/* IDLE BUTTON */}
                  <button
                    id={`btn-status-idle-${line.id}`}
                    onClick={() => handleStatusChange(line.id, 'IDLE')}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all border ${
                      isIdle
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-900/40 ring-2 ring-amber-400/50'
                        : 'bg-[#14120a] text-amber-400/80 border-slate-800 hover:border-amber-700/50 hover:bg-amber-950/20'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isIdle ? 'bg-slate-950' : 'bg-amber-500'}`} />
                    <span>IDLE (พักสาย/ไม่มีแผน)</span>
                  </button>

                  {/* MAINTENANCE BUTTON */}
                  <button
                    id={`btn-status-maint-${line.id}`}
                    onClick={() => handleStatusChange(line.id, 'MAINTENANCE')}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all border ${
                      isMaintenance
                        ? 'bg-blue-500 hover:bg-blue-400 text-slate-950 border-blue-300 shadow-lg shadow-blue-900/40 ring-2 ring-blue-400/50'
                        : 'bg-[#0a121c] text-blue-400/80 border-slate-800 hover:border-blue-700/50 hover:bg-blue-950/20'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>MAINTENANCE (ซ่อมบำรุง)</span>
                  </button>

                  {/* STOPPED BUTTON */}
                  <button
                    id={`btn-status-stopped-${line.id}`}
                    onClick={() => handleStatusChange(line.id, 'STOPPED')}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all border ${
                      isStopped
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-900/50 ring-2 ring-rose-500/50'
                        : 'bg-[#180a0e] text-rose-400/80 border-slate-800 hover:border-rose-700/50 hover:bg-rose-950/20'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>STOPPED (ปิดไลน์ผลิต)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD NEW PART MODAL */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1426] border border-cyan-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-500">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    เพิ่มชิ้นส่วนใหม่ (ADD NEW PART MASTER)
                  </h3>
                  <p className="text-xs text-slate-400 font-thai">
                    ลงทะเบียนรหัสอะไหล่ใหม่เข้าสู่ฐานข้อมูลกลาง Part Master Catalog
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddPartModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPart} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    CATEGORY (หมวดหมู่) *
                  </label>
                  <select
                    value={newPartData.category}
                    onChange={(e) => setNewPartData({ ...newPartData, category: e.target.value as any })}
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="PUNCH">PUNCH (พั้นช์/เข็มเจาะ)</option>
                    <option value="DIE">DIE (ดาย/แม่พิมพ์)</option>
                    <option value="BLADE">BLADE (ใบมีดตัด)</option>
                    <option value="PIN">PIN (พินนำ/พินประคอง)</option>
                    <option value="CORNER_CUT">CORNER CUT (มีดตัดมุม)</option>
                    <option value="CENTER_PUNCH">CENTER PUNCH</option>
                    <option value="OTHER">OTHER (อื่นๆ)</option>
                  </select>
                </div>

                {/* Part Name EN */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    PART NAME (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPartData.partName}
                    onChange={(e) => setNewPartData({ ...newPartData, partName: e.target.value })}
                    placeholder="ชื่อภาษาอังกฤษ..."
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Part Name TH */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    PART NAME (TH)
                  </label>
                  <input
                    type="text"
                    value={newPartData.partNameTh}
                    onChange={(e) => setNewPartData({ ...newPartData, partNameTh: e.target.value })}
                    placeholder="ชื่อภาษาไทย..."
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs font-thai text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Stage */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    STAGE (สเตจ)
                  </label>
                  <select
                    value={newPartData.stageName}
                    onChange={(e) => setNewPartData({ ...newPartData, stageName: e.target.value })}
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {sortStagesInOrder(stageGroups).map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                {/* Tube Size Compat */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    TUBE COMPATIBILITY
                  </label>
                  <select
                    value={newPartData.tubeSizeCompat}
                    onChange={(e) => setNewPartData({ ...newPartData, tubeSizeCompat: e.target.value as any })}
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="BOTH">BOTH (ใช้ได้ทั้ง Ø5 และ Ø7)</option>
                    <option value="Ø7">Ø7 Only</option>
                    <option value="Ø5">Ø5 Only</option>
                  </select>
                </div>

                {/* Drawing No */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    DRAWING NUMBER
                  </label>
                  <input
                    type="text"
                    value={newPartData.drawingNumber}
                    onChange={(e) => setNewPartData({ ...newPartData, drawingNumber: e.target.value })}
                    placeholder="เลขที่แบบ..."
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Unit Cost THB */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    ESTIMATED UNIT COST (THB)
                  </label>
                  <input
                    type="number"
                    value={newPartData.unitCostThb || ''}
                    onChange={(e) => setNewPartData({ ...newPartData, unitCostThb: Number(e.target.value) || 0 })}
                    placeholder="ราคาต่อหน่วย (บาท)..."
                    className="w-full bg-[#070d1a] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกชิ้นส่วนใหม่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
