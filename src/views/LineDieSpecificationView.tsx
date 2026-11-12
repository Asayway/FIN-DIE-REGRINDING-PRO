import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Layers,
  Sparkles,
  Save,
  Info,
  Check,
  X,
  Cpu,
  Factory,
  Database,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileText,
  RotateCcw
} from 'lucide-react';
import { 
  ProductionLineId, 
  LineActiveConfiguration, 
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
  defaultNote: string;
}

const ALL_LINE_OPTIONS: LineOption[] = [
  { id: 'E1', label: 'E1', tag: 'Ø7 Slit', defaultTube: 'Ø7', defaultFin: 'Slit (half)', defaultPitch: '3P (Pitch)', defaultMaterial: 'PCM (0.1mm)', defaultDieCode: '151915000446', defaultSpm: 120, defaultNote: '' },
  { id: 'E2', label: 'E2', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'Slit (half)', defaultPitch: '3P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: "'151920001155", defaultSpm: 120, defaultNote: '' },
  { id: 'E3-1', label: 'E3-1', tag: 'Slit 3P', defaultTube: 'Ø7', defaultFin: 'Slit (half)', defaultPitch: '3P (Pitch)', defaultMaterial: 'PCM (0.1mm)', defaultDieCode: "'151920001155", defaultSpm: 120, defaultNote: '' },
  { id: 'E3-2', label: 'E3-2', tag: 'WL+ 4P', defaultTube: 'Ø7', defaultFin: 'Wide Louver', defaultPitch: '4P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: 'THHF04221781', defaultSpm: 120, defaultNote: '' },
  { id: 'E3-3', label: 'E3-3', tag: 'Corr 4P', defaultTube: 'Ø7', defaultFin: 'New Corrugate', defaultPitch: '4P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: "'151915000335 / '1519150", defaultSpm: 120, defaultNote: '' },
  { id: 'E4', label: 'E4', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'Slit (half)', defaultPitch: '3P (Pitch)', defaultMaterial: 'GOLD (0.1mm)', defaultDieCode: "'151915000403", defaultSpm: 120, defaultNote: '' },
  { id: 'E5', label: 'E5', tag: 'Ø5 Slit', defaultTube: 'Ø5', defaultFin: 'Slit (half)', defaultPitch: '3P (Pitch)', defaultMaterial: 'BARE (0.1mm)', defaultDieCode: "'151915000253", defaultSpm: 120, defaultNote: '' },
];

export const LineDieSpecificationView: React.FC<LineDieSpecificationViewProps> = ({
  onAddNewPartClick
}) => {
  const { language } = useLanguage();
  const [lineConfigs, setLineConfigs] = useState<Record<string, LineActiveConfiguration>>({});
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
    let shouldSyncDefaults = false;

    ALL_LINE_OPTIONS.forEach(opt => {
      const found = rawConfigs.find(c => c.lineId === opt.id);

      // Check if found config has legacy mock placeholders like FD-E* or dedicated press notes
      const isLegacy = !found || !found.dieCode || found.dieCode.startsWith('FD-E') || found.notes === 'แท่นผลิตเดี่ยว (Dedicated Press)' || found.notes?.includes('แท่นผลิตเดี่ยว');

      if (found && !isLegacy) {
        configMap[opt.id] = {
          ...found,
          pathsCount: found.pathsCount || opt.defaultPitch,
          dieCode: found.dieCode || opt.defaultDieCode,
          defaultSpm: found.defaultSpm || opt.defaultSpm,
          notes: found.notes !== undefined ? found.notes : opt.defaultNote
        };
      } else {
        shouldSyncDefaults = true;
        configMap[opt.id] = {
          id: found?.id || `CFG-${opt.id}-001`,
          lineId: opt.id,
          lineName: found?.lineName || `Fin Press Line ${opt.id}`,
          dieCode: opt.defaultDieCode,
          dieName: found?.dieName || `Fin Die ${opt.id} (${opt.tag})`,
          tubeSize: opt.defaultTube,
          finType: opt.defaultFin as any,
          material: opt.defaultMaterial as any,
          thicknessMm: 0.10,
          effectiveFrom: found?.effectiveFrom || new Date().toISOString(),
          isActive: true,
          status: 'ACTIVE',
          defaultSpm: opt.defaultSpm,
          pathsCount: opt.defaultPitch,
          notes: opt.defaultNote,
          installedPartQuantities: found?.installedPartQuantities || {}
        };
      }
    });

    setLineConfigs(configMap);
    if (shouldSyncDefaults) {
      storageService.saveLineConfigs(Object.values(configMap));
    }
  };

  const handleResetToDefaults = () => {
    const configMap: Record<string, LineActiveConfiguration> = {};
    ALL_LINE_OPTIONS.forEach(opt => {
      configMap[opt.id] = {
        id: lineConfigs[opt.id]?.id || `CFG-${opt.id}-001`,
        lineId: opt.id,
        lineName: lineConfigs[opt.id]?.lineName || `Fin Press Line ${opt.id}`,
        dieCode: opt.defaultDieCode,
        dieName: `Fin Die ${opt.id} (${opt.tag})`,
        tubeSize: opt.defaultTube,
        finType: opt.defaultFin as any,
        material: opt.defaultMaterial as any,
        thicknessMm: 0.10,
        effectiveFrom: new Date().toISOString(),
        isActive: true,
        status: 'ACTIVE',
        defaultSpm: opt.defaultSpm,
        pathsCount: opt.defaultPitch,
        notes: opt.defaultNote,
        installedPartQuantities: lineConfigs[opt.id]?.installedPartQuantities || {}
      };
    });
    setLineConfigs(configMap);
    storageService.saveLineConfigs(Object.values(configMap));
    showToast('คืนค่าสเปกแม่พิมพ์ทั้ง 7 ไลน์ กลับเป็นค่าเริ่มต้นมาตรฐานโรงงานเรียบร้อยแล้ว');
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

  const handleNoteChange = (lineId: ProductionLineId, noteValue: string) => {
    const current = lineConfigs[lineId];
    if (!current) return;

    const updated: LineActiveConfiguration = {
      ...current,
      notes: noteValue
    };

    setLineConfigs(prev => ({
      ...prev,
      [lineId]: updated
    }));

    storageService.saveLineConfig(updated);
  };

  const handleNoteBlur = (lineId: ProductionLineId) => {
    showToast(`บันทึกหมายเหตุไลน์ ${lineId} เรียบร้อยแล้ว`);
  };

  const showToast = (msg: string) => {
    setFeedback({ type: 'success', message: msg });
    setTimeout(() => {
      setFeedback(null);
    }, 2500);
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
      stageName: 'Piercing & Burring',
      category: 'PUNCH',
      drawingNumber: '',
      unit: 'PCS',
      unitCostThb: 0,
      tubeSizeCompat: 'BOTH'
    });
  };

  return (
    <div className="space-y-3.5 font-sans text-slate-100 animate-fadeIn pb-6">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TOP HEADER: UNIFIED MATRIX TITLE & ACTIONS */}
      <div className="bg-[#0b1329] border border-cyan-900/60 rounded-xl p-3 sm:p-3.5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/80 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white font-mono tracking-wide">
                ตั้งค่าสเปกแม่พิมพ์สายการผลิตทั้งหมด (UNIFIED 7-LINES DIE SPEC MATRIX)
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 font-mono text-[10px] font-black">
                7 LINES ALL-IN-ONE
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2 font-mono flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="คืนค่าสเปกแม่พิมพ์ทั้ง 7 ไลน์ กลับเป็นค่าเริ่มต้นมาตรฐานโรงงาน (Default Specs)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>คืนค่าเริ่มต้น (Default Specs)</span>
          </button>

          <button
            id="btn-add-new-part"
            onClick={() => {
              if (onAddNewPartClick) {
                onAddNewPartClick();
              } else {
                setShowAddPartModal(true);
              }
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>+ เพิ่มชิ้นส่วนใหม่ (ADD NEW PART)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* UNIFIED 7-LINES MATRIX TABLE (ALL IN ONE SCREEN)         */}
      {/* ======================================================== */}
      <div className="bg-[#0b1426] border border-cyan-900/60 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[960px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#0f1d38] border-b border-cyan-800/80 text-[11px] font-mono uppercase tracking-wider text-cyan-300">
                <th className="py-2.5 px-3 font-extrabold w-32 border-r border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-cyan-400" />
                    <span>1. LINE (ไลน์ผลิต)</span>
                  </div>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-36 border-r border-slate-800">
                  <span>2. TUBE SIZE (ท่อ)</span>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-40 border-r border-slate-800">
                  <span>3. FIN TYPE (ลายฟิน)</span>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-32 border-r border-slate-800">
                  <span>4. PITCH (พิตช์)</span>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-36 border-r border-slate-800">
                  <span>5. MATERIAL (วัสดุ)</span>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-44 border-r border-slate-800">
                  <span>6. DIE CODE (รหัสแม่พิมพ์)</span>
                </th>
                <th className="py-2.5 px-2.5 font-extrabold w-28 border-r border-slate-800">
                  <span>7. SPM (สปีด)</span>
                </th>
                <th className="py-2.5 px-3 font-extrabold">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>8. NOTE & REMARKS (หมายเหตุ / กรอกรายละเอียด Free style)</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body - 7 Lines */}
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {ALL_LINE_OPTIONS.map((line, idx) => {
                const cfg = lineConfigs[line.id] || {
                  dieCode: line.defaultDieCode,
                  tubeSize: line.defaultTube,
                  finType: line.defaultFin as any,
                  material: line.defaultMaterial as any,
                  pathsCount: line.defaultPitch,
                  defaultSpm: line.defaultSpm,
                  notes: line.defaultNote
                };
                const isE3Line = line.id.startsWith('E3-');
                const isE3Active = activeE3Die === line.id;
                const rowBg = idx % 2 === 0 ? 'bg-[#091122]/70' : 'bg-[#070d1a]/70';

                return (
                  <tr 
                    key={line.id} 
                    className={`${rowBg} hover:bg-cyan-950/30 transition-colors`}
                  >
                    {/* 1. LINE ID & TAG */}
                    <td className="py-2 px-3 border-r border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/70 flex items-center justify-center font-bold text-cyan-300 text-xs shadow-inner">
                          {line.label}
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-xs">
                            {line.label}
                          </div>
                          <span className="text-[10px] text-slate-400 font-thai block leading-tight">
                            {line.tag}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. TUBE SIZE */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <select
                        id={`tube-size-${line.id}`}
                        value={cfg.tubeSize || line.defaultTube}
                        onChange={(e) => handleFieldChange(line.id, 'tubeSize', e.target.value as TubeSize)}
                        className="w-full bg-[#070d1a] border border-slate-700 hover:border-cyan-500 rounded-lg px-2 py-1 text-xs text-cyan-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="Ø7">Ø7 (7 mm)</option>
                        <option value="Ø5">Ø5 (5 mm)</option>
                        <option value="Ø9.52">Ø9.52 (3/8")</option>
                        <option value="Ø8">Ø8 (8 mm)</option>
                        <option value="Ø6.35">Ø6.35 (1/4")</option>
                      </select>
                    </td>

                    {/* 3. FIN TYPE */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <select
                        id={`fin-type-${line.id}`}
                        value={cfg.finType || line.defaultFin}
                        onChange={(e) => handleFieldChange(line.id, 'finType', e.target.value as FinType)}
                        className="w-full bg-[#070d1a] border border-slate-700 hover:border-cyan-500 rounded-lg px-2 py-1 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
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
                    </td>

                    {/* 4. DIE SPEC / PITCH */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <select
                        id={`die-spec-${line.id}`}
                        value={cfg.pathsCount || line.defaultPitch}
                        onChange={(e) => handleFieldChange(line.id, 'pathsCount', e.target.value)}
                        className="w-full bg-[#070d1a] border border-slate-700 hover:border-cyan-500 rounded-lg px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="3P (Pitch)">3P (Pitch)</option>
                        <option value="4P (Pitch)">4P (Pitch)</option>
                      </select>
                    </td>

                    {/* 5. FIN MATERIAL */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <select
                        id={`fin-material-${line.id}`}
                        value={cfg.material || line.defaultMaterial}
                        onChange={(e) => handleFieldChange(line.id, 'material', e.target.value as AluminumMaterial)}
                        className="w-full bg-[#070d1a] border border-slate-700 hover:border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="PCM (0.1mm)">PCM (0.1mm)</option>
                        <option value="BARE (0.1mm)">BARE (0.1mm)</option>
                        <option value="GOLD (0.1mm)">GOLD (0.1mm)</option>
                      </select>
                    </td>

                    {/* 6. DIE CODE */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <input
                        id={`die-code-${line.id}`}
                        type="text"
                        value={cfg.dieCode || line.defaultDieCode}
                        onChange={(e) => handleFieldChange(line.id, 'dieCode', e.target.value)}
                        className="w-full bg-[#070d1a] border border-slate-700 hover:border-cyan-400 rounded-lg px-2 py-1 text-xs text-cyan-200 font-bold font-mono focus:outline-none focus:border-cyan-400 focus:bg-[#0c162d]"
                        placeholder="รหัสแม่พิมพ์..."
                      />
                    </td>

                    {/* 7. DEFAULT SPM */}
                    <td className="py-2 px-2 border-r border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <input
                          id={`default-spm-${line.id}`}
                          type="number"
                          value={cfg.defaultSpm || line.defaultSpm}
                          onChange={(e) => handleFieldChange(line.id, 'defaultSpm', Number(e.target.value) || 100)}
                          className="w-full bg-[#070d1a] border border-slate-700 hover:border-cyan-400 rounded-lg px-2 py-1 text-xs text-emerald-300 font-bold text-center font-mono focus:outline-none focus:border-cyan-400"
                        />
                        <span className="text-[10px] text-slate-500">spm</span>
                      </div>
                    </td>

                    {/* 8. NOTE & REMARKS (FREE-STYLE EDITABLE INPUT) */}
                    <td className="py-2 px-3">
                      <input
                        id={`note-input-${line.id}`}
                        type="text"
                        value={cfg.notes !== undefined ? cfg.notes : ''}
                        onChange={(e) => handleNoteChange(line.id, e.target.value)}
                        onBlur={() => handleNoteBlur(line.id)}
                        placeholder="พิมพ์บันทึกหมายเหตุ / รายละเอียดการทำงาน (Free style)..."
                        className="w-full bg-[#070d1a] border border-slate-700/80 hover:border-cyan-400 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 font-thai focus:outline-none focus:bg-[#0c162d] transition-all"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer"
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
