import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Info,
  Filter,
  Check,
  X,
  Factory,
  Edit3,
  Trash2
} from 'lucide-react';
import { PartLifeStandard, FinMaterial, TubeDiameter, FinType, ProductionLineId, LINE_INFO_MAP } from '../types';
import { storageService } from '../services/storageService';
import { formatShots, formatThb, generateCompositeKey } from '../services/calculationService';
import { ResizableReorderableTable } from '../components/common/ResizableReorderableTable';
import { DebouncedNumericInput } from '../components/common/DebouncedNumericInput';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';

interface LineQuickFilter {
  id: string;
  label: string;
  subLabel: string;
  tube: string;
  material: string;
  finType: string;
  paths: string;
}

const LINE_QUICK_FILTERS: LineQuickFilter[] = [
  { id: 'ALL', label: 'ALL LINES', subLabel: 'ทุกสายการผลิต (7 Lines: E1-E5)', tube: 'ALL', material: 'ALL', finType: 'ALL', paths: '-' },
  { id: 'E1', label: 'E1', subLabel: 'Ø7 Slit, PCM', tube: 'Ø7', material: 'PCM', finType: 'Slit Old', paths: '4P (Pitch)' },
  { id: 'E2', label: 'E2', subLabel: 'Ø5 Slit, GOLD', tube: 'Ø5', material: 'GOLD', finType: 'Slit Old', paths: '4P (Pitch)' },
  { id: 'E3-1', label: 'E3-1', subLabel: 'Slit 3P, PCM', tube: 'Ø7', material: 'PCM', finType: 'New Slit', paths: '3P (Pitch)' },
  { id: 'E3-2', label: 'E3-2', subLabel: 'WL+ 4P, GOLD', tube: 'Ø7', material: 'GOLD', finType: 'Wide Louver', paths: '4P (Pitch)' },
  { id: 'E3-3', label: 'E3-3', subLabel: 'Corr 4P, GOLD', tube: 'Ø7', material: 'GOLD', finType: 'Corrugate', paths: '4P (Pitch)' },
  { id: 'E4', label: 'E4', subLabel: 'Ø5 Slit, BARE', tube: 'Ø5', material: 'BARE', finType: 'Slit Old', paths: '3P (Pitch)' },
  { id: 'E5', label: 'E5', subLabel: 'Ø5 Slit, BARE', tube: 'Ø5', material: 'BARE', finType: 'New Slit', paths: '3P (Pitch)' },
];

export const PartLifeStandardSetupView: React.FC = () => {
  const [standards, setStandards] = useState<PartLifeStandard[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedTube, setSelectedTube] = useState<string>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTargetStd, setEditTargetStd] = useState<PartLifeStandard | null>(null);
  const [deleteTargetStd, setDeleteTargetStd] = useState<PartLifeStandard | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  
  // Maps standard.id -> { field: value } (supports number, boolean, string)
  const [editValues, setEditValues] = useState<Record<string, Record<string, number | boolean | string>>>({});

  // New Standard Form State
  const [newStd, setNewStd] = useState({
    partName: '',
    partCode: '',
    stagePunchDie: '',
    lineId: 'ALL',
    material: 'PCM',
    tubeSize: 'Ø7',
    thicknessMm: 0.10,
    lifeLimitShots: 1500000,
    regrindDepthPerTime: 0.20,
    maxTotalGrindingLimit: 3.00,
    standardShimThickness: 0.20,
    disposeAfterUse: false,
    notes: 'Change every 10-15 Day (เปลี่ยนทุกๆ 10-15 วัน)'
  });

  const reload = () => {
    const data = storageService.getLifeStandards();
    setStandards(data);
  };

  useEffect(() => {
    reload();
    const unsub = storageService.subscribe(reload);
    return () => unsub();
  }, []);

  const handleEditClick = () => {
    const currentVals: Record<string, Record<string, number | boolean | string>> = {};
    standards.forEach(std => {
      if (!std) return;
      currentVals[std.id] = {
        material: std.configKey?.material || 'PCM',
        tubeSize: std.configKey?.tubeSize || 'Ø7',
        lifeLimitShots: std.lifeLimitShots,
        regrindDepthPerTime: std.regrindDepthPerTime ?? (parseFloat(std.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20),
        maxTotalGrindingLimit: std.maxTotalGrindingLimit ?? std.regrindStandard?.totalRegrindMm ?? 3.00,
        standardShimThickness: std.standardShimThickness ?? 0.20,
        disposeAfterUse: !!std.regrindStandard?.disposeAfterUse,
        notes: std.notes || std.regrindStandard?.regrindIntervalNote || std.changeIntervalNotes || ''
      };
    });
    setEditValues(currentVals);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    standards.forEach(std => {
      const updates = editValues[std.id];
      if (updates) {
        if (updates.material) {
          std.configKey.material = updates.material as any;
        }
        if (updates.tubeSize) {
          std.configKey.tubeSize = updates.tubeSize as any;
        }
        std.lifeLimitShots = updates.lifeLimitShots as number;
        std.regrindDepthPerTime = updates.regrindDepthPerTime as number;
        std.maxTotalGrindingLimit = updates.maxTotalGrindingLimit as number;
        std.standardShimThickness = updates.standardShimThickness as number;
        std.notes = (updates.notes as string) || '';
        
        if (std.regrindStandard) {
          std.regrindStandard.disposeAfterUse = updates.disposeAfterUse as boolean;
          std.regrindStandard.oneTimeRegrindMm = (std.regrindDepthPerTime || 0.20).toFixed(2);
          std.regrindStandard.totalRegrindMm = std.maxTotalGrindingLimit;
          std.regrindStandard.maxTotalGrindingLimit = std.maxTotalGrindingLimit;
          std.regrindStandard.regrindDepthPerTime = std.regrindDepthPerTime;
          std.regrindStandard.standardShimThickness = std.standardShimThickness;
          std.regrindStandard.regrindIntervalNote = std.notes;
        }
        
        std.updatedAt = new Date().toISOString();
        storageService.saveLifeStandard(std);
      }
    });
    setIsEditing(false);
    setSaveSuccessMsg('บันทึกการแก้ไขเกณฑ์มาตรฐานเรียบร้อยแล้ว (Matrix Saved Successfully)');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reload();
  };

  const handleValueChange = (stdId: string, field: string, value: string | boolean | number) => {
    setEditValues(prev => {
      const current = prev[stdId] || {};
      let parsedVal: any = value;
      if (field === 'lifeLimitShots' || field === 'maxTotalGrindingLimit' || field === 'regrindDepthPerTime' || field === 'standardShimThickness') {
        parsedVal = typeof value === 'string' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
      }
      return {
        ...prev,
        [stdId]: {
          ...current,
          [field]: parsedVal
        }
      };
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStd.partName.trim() || !newStd.partCode.trim()) {
      alert('กรุณากรอก Part Name และ Part Code');
      return;
    }

    const newId = `STD-${newStd.material}-${newStd.partCode.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`;
    const createdStandard: PartLifeStandard = {
      id: newId,
      configKey: {
        lineId: newStd.lineId,
        configurationId: `CFG-${newStd.lineId}-${newStd.material}`,
        dieCode: `FD-${newStd.lineId}`,
        finType: 'Slit (half)',
        material: newStd.material as any,
        thicknessMm: 0.10,
        tubeSize: newStd.tubeSize as any,
        partCode: newStd.partCode.trim(),
        position: 'ALL',
        effectiveDate: new Date().toISOString().substring(0, 10)
      },
      compositeKeyString: `${newStd.lineId}|${newStd.material}|0.10mm|${newStd.tubeSize}|${newStd.partCode}`,
      partName: newStd.partName.trim(),
      stagePunchDie: newStd.stagePunchDie.trim() || newStd.partName.trim(),
      lifeLimitShots: Number(newStd.lifeLimitShots) || 1500000,
      regrindDepthPerTime: Number(newStd.regrindDepthPerTime) || 0.20,
      maxTotalGrindingLimit: Number(newStd.maxTotalGrindingLimit) || 3.00,
      standardShimThickness: Number(newStd.standardShimThickness) || 0.20,
      notes: newStd.notes.trim(),
      regrindStandard: {
        oneTimeRegrindMm: (Number(newStd.regrindDepthPerTime) || 0.20).toFixed(2),
        totalRegrindMm: Number(newStd.maxTotalGrindingLimit) || 3.00,
        maxRegrindCount: 7,
        disposeAfterUse: newStd.disposeAfterUse,
        regrindIntervalNote: newStd.notes.trim()
      },
      createdBy: 'Die Engineer Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.saveLifeStandard(createdStandard);
    setShowAddModal(false);
    setSaveSuccessMsg(`เพิ่มเกณฑ์มาตรฐานสำหรับ ${newStd.partName} สำเร็จแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reload();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetStd) return;
    storageService.deleteLifeStandard(deleteTargetStd.id);
    setSaveSuccessMsg(`ลบเกณฑ์มาตรฐานสำหรับ ${deleteTargetStd.partName} (${deleteTargetStd.configKey.partCode}) สำเร็จแล้ว`);
    setDeleteTargetStd(null);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reload();
  };

  const handleSaveSingleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetStd) return;
    storageService.saveLifeStandard(editTargetStd);
    setSaveSuccessMsg(`บันทึกการแก้ไขเกณฑ์มาตรฐาน ${editTargetStd.partName} สำเร็จแล้ว`);
    setEditTargetStd(null);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reload();
  };

  // Filter standards by Line, Search, Material, Tube
  const filtered = standards.filter(s => {
    const matchSearch = 
      s.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.configKey.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.stagePunchDie && s.stagePunchDie.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Line matching
    let matchLine = true;
    if (selectedLine !== 'ALL') {
      const lineOpt = LINE_QUICK_FILTERS.find(f => f.id === selectedLine);
      if (lineOpt) {
        // If standard has matching lineId or matches line's tube and material
        const stdLine = s.configKey?.lineId || 'ALL';
        const stdMat = (s.configKey?.material || '').toUpperCase();
        const stdTube = s.configKey?.tubeSize;

        if (stdLine === selectedLine) {
          matchLine = true;
        } else if (stdLine === 'ALL') {
          const matchTube = lineOpt.tube === 'ALL' || stdTube === lineOpt.tube;
          const matchMat = lineOpt.material === 'ALL' || stdMat.includes(lineOpt.material);
          matchLine = matchTube && matchMat;
        } else {
          matchLine = false;
        }
      }
    }

    const mat = (s.configKey.material || '').toUpperCase();
    const matchMat = 
      selectedMaterial === 'ALL' || 
      mat === selectedMaterial.toUpperCase() ||
      mat.includes(selectedMaterial.toUpperCase());

    const matchTube = selectedTube === 'ALL' || s.configKey.tubeSize === selectedTube;

    return matchSearch && matchLine && matchMat && matchTube;
  });

  const activeLineFilterObj = LINE_QUICK_FILTERS.find(f => f.id === selectedLine) || LINE_QUICK_FILTERS[0];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-900/90 border border-emerald-500 text-emerald-200 rounded-lg flex items-center justify-between shadow-xl animate-fadeIn text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-thai font-medium">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sticky Header Section */}
      <div className="sticky top-[130px] sm:top-[115px] z-20 pb-1 bg-slate-900/95 backdrop-blur-sm -mx-2 px-2 space-y-3">
        {/* Header & Action Bar */}
        <div className="bg-[#0F172A] border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Fin Die Part Life Standard Matrix</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-thai">
              เกณฑ์อายุการใช้งานชิ้นส่วนแม่พิมพ์และพารามิเตอร์การเจียรตามมาตรฐานวัสดุ (PCM, BARE, GOLD ความหนา 0.1mm)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="ค้นหาชิ้นส่วน/รหัส..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-white text-xs sm:text-sm focus:outline-none w-36 sm:w-44"
              />
            </div>
            
            {/* Material Filter */}
            <select 
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-thai font-bold"
            >
              <option value="ALL">All Materials (ทุกวัสดุ)</option>
              <option value="PCM">PCM (0.1mm)</option>
              <option value="BARE">BARE (0.1mm)</option>
              <option value="GOLD">GOLD (0.1mm)</option>
            </select>
            
            {/* Tube Filter */}
            <select 
              value={selectedTube}
              onChange={(e) => setSelectedTube(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-thai font-bold"
            >
              <option value="ALL">All Tubes (ท่อทั้งหมด)</option>
              <option value="Ø5">Ø5</option>
              <option value="Ø7">Ø7</option>
            </select>

            {/* Add New Standard Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Standard</span>
            </button>

            {/* Edit / Save Action */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelClick} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveClick} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-lg shadow-emerald-950">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Matrix</span>
                </button>
              </div>
            ) : (
              <button onClick={handleEditClick} className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-lg shadow-cyan-950">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Matrix</span>
              </button>
            )}
          </div>
        </div>

        {/* Line Quick Selection Buttons (แถบเลือก Line เหมือนหน้า Line Die Specification) */}
        <div className="bg-[#0B1528] border border-slate-800 rounded-lg p-2 flex flex-wrap items-center gap-1.5 shadow-inner">
          <span className="text-[11px] font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
            <Factory className="w-3.5 h-3.5 text-cyan-400" />
            <span>LINE:</span>
          </span>

          {LINE_QUICK_FILTERS.map(lf => {
            const isSelected = selectedLine === lf.id;
            return (
              <button
                key={lf.id}
                onClick={() => setSelectedLine(lf.id)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-extrabold scale-105 z-10'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <span>{lf.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                  ({lf.subLabel})
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Line Profile Banner */}
        {selectedLine !== 'ALL' && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 font-mono">SELECTED LINE: {activeLineFilterObj.label}</span>
              <span className="text-slate-400">|</span>
              <span>Tube: <strong className="text-white font-mono">{activeLineFilterObj.tube}</strong></span>
              <span className="text-slate-400">|</span>
              <span>Material: <strong className="text-amber-300 font-mono">{activeLineFilterObj.material} (0.1mm)</strong></span>
              <span className="text-slate-400">|</span>
              <span>Fin Type: <strong className="text-slate-200">{activeLineFilterObj.finType}</strong></span>
              <span className="text-slate-400">|</span>
              <span>Paths: <strong className="text-slate-200">{activeLineFilterObj.paths}</strong></span>
            </div>
            <div className="text-[11px] text-slate-400">
              พบ {filtered.length} รายการมาตรฐาน
            </div>
          </div>
        )}
      </div>

      {/* Main Matrix Table Container */}
      <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-4 shadow-lg">
        <ResizableReorderableTable<PartLifeStandard>
          data={filtered}
          keyExtractor={(s) => s.id}
          emptyMessage="ไม่พบข้อมูลเกณฑ์มาตรฐานอายุการใช้งานที่ตรงกับเงื่อนไขการค้นหา"
          columns={[
            {
              id: 'no',
              label: 'NO.',
              width: 55,
              minWidth: 45,
              align: 'center',
              render: (_, idx) => (
                <span className="text-cyan-400/80 font-mono font-bold text-xs">{idx + 1}</span>
              )
            },
            {
              id: 'part',
              label: 'STAGE / PART NAME',
              width: 200,
              minWidth: 150,
              render: (s) => (
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-100 truncate" title={s.partName}>{s.partName}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">{s.configKey.partCode}</div>
                  <div className="text-[10px] text-slate-400 truncate">{s.stagePunchDie || s.partName}</div>
                </div>
              )
            },
            {
              id: 'material',
              label: 'MAT / THICK',
              width: 140,
              minWidth: 120,
              align: 'center',
              render: (s) => {
                const currentMat = (editValues[s.id]?.material as string) ?? s.configKey.material ?? 'PCM';
                
                if (isEditing) {
                  return (
                    <select
                      value={currentMat}
                      onChange={(e) => handleValueChange(s.id, 'material', e.target.value)}
                      className="bg-slate-900 border border-cyan-500/80 text-cyan-300 font-bold font-mono rounded px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none w-full"
                    >
                      <option value="PCM">PCM (0.1mm)</option>
                      <option value="BARE">BARE (0.1mm)</option>
                      <option value="GOLD">GOLD (0.1mm)</option>
                    </select>
                  );
                }

                const mat = currentMat.toUpperCase();
                const isPcm = mat.includes('PCM');
                const isGold = mat.includes('GOLD');
                const isBare = mat.includes('BARE');
                const isHydro = mat.includes('HYDRO');
                const thick = s.configKey.thicknessMm ? `${s.configKey.thicknessMm}mm` : '0.1mm';

                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    isPcm ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                    isGold ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    isBare ? 'bg-slate-500/25 text-slate-200 border border-slate-500/40' :
                    isHydro ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-slate-700 text-slate-200'
                  }`}>
                    <span>{isPcm ? 'PCM' : isGold ? 'GOLD' : isBare ? 'BARE' : isHydro ? 'HYDRO' : mat}</span>
                    <span className="opacity-75 text-[10px]">({thick})</span>
                  </span>
                );
              }
            },
            {
              id: 'tubeSize',
              label: 'TUBE',
              width: 80,
              minWidth: 60,
              align: 'center',
              render: (s) => {
                const currentTube = (editValues[s.id]?.tubeSize as string) ?? s.configKey.tubeSize ?? 'Ø7';
                if (isEditing) {
                  return (
                    <select
                      value={currentTube}
                      onChange={(e) => handleValueChange(s.id, 'tubeSize', e.target.value)}
                      className="bg-slate-900 border border-slate-600 text-cyan-300 font-bold font-mono rounded px-1.5 py-1 text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="Ø5">Ø5</option>
                      <option value="Ø7">Ø7</option>
                    </select>
                  );
                }
                return (
                  <span className="text-cyan-300 font-bold font-mono text-xs">
                    {currentTube}
                  </span>
                );
              }
            },
            {
              id: 'lifeLimitShots',
              label: 'LIFE LIMIT (SHOTS)',
              width: 145,
              minWidth: 110,
              align: 'right',
              render: (s) => isEditing ? (
                <DebouncedNumericInput
                  value={editValues[s.id]?.lifeLimitShots as number}
                  onChange={(val) => handleValueChange(s.id, 'lifeLimitShots', val)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {formatShots(s.lifeLimitShots)}
                </span>
              )
            },
            {
              id: 'regrindDepth',
              label: '1 TIME / REGRIND (MM)',
              width: 135,
              minWidth: 95,
              align: 'right',
              render: (s) => isEditing ? (
                <DebouncedNumericInput
                  step={0.01}
                  value={editValues[s.id]?.regrindDepthPerTime as number}
                  onChange={(val) => handleValueChange(s.id, 'regrindDepthPerTime', val)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono text-slate-300 text-xs">
                  {(s.regrindDepthPerTime ?? (parseFloat(s.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20)).toFixed(2)}
                </span>
              )
            },
            {
              id: 'maxRegrind',
              label: 'MAX REGRIND (MM)',
              width: 130,
              minWidth: 90,
              align: 'right',
              render: (s) => isEditing ? (
                <DebouncedNumericInput
                  step={0.1}
                  value={editValues[s.id]?.maxTotalGrindingLimit as number}
                  onChange={(val) => handleValueChange(s.id, 'maxTotalGrindingLimit', val)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono text-slate-300 text-xs">
                  {(s.maxTotalGrindingLimit ?? s.regrindStandard?.totalRegrindMm ?? 3.0).toFixed(2)}
                </span>
              )
            },
            {
              id: 'shimThickness',
              label: 'SHIM (MM)',
              width: 100,
              minWidth: 80,
              align: 'right',
              render: (s) => isEditing ? (
                <DebouncedNumericInput
                  step={0.01}
                  value={editValues[s.id]?.standardShimThickness as number}
                  onChange={(val) => handleValueChange(s.id, 'standardShimThickness', val)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono text-slate-300 text-xs">
                  {(s.standardShimThickness ?? 0.20).toFixed(2)}
                </span>
              )
            },
            {
              id: 'dispose',
              label: '1-USE (DISPOSE)',
              width: 100,
              minWidth: 80,
              align: 'center',
              render: (s) => isEditing ? (
                <input
                  type="checkbox"
                  checked={editValues[s.id]?.disposeAfterUse as boolean}
                  onChange={(e) => handleValueChange(s.id, 'disposeAfterUse', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
              ) : (
                <span className={`text-[11px] font-bold ${s.regrindStandard?.disposeAfterUse ? 'text-rose-400' : 'text-slate-500'}`}>
                  {s.regrindStandard?.disposeAfterUse ? 'YES' : 'NO'}
                </span>
              )
            },
            {
              id: 'notes',
              label: 'NOTE / REMARK',
              width: 220,
              minWidth: 140,
              render: (s) => {
                const currentNote = (editValues[s.id]?.notes as string) ?? (s.notes || s.regrindStandard?.regrindIntervalNote || s.changeIntervalNotes || '');
                if (isEditing) {
                  return (
                    <input
                      type="text"
                      value={currentNote}
                      onChange={(e) => handleValueChange(s.id, 'notes', e.target.value)}
                      placeholder="ระบุหมายเหตุ..."
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none font-thai"
                    />
                  );
                }
                return currentNote ? (
                  <span className="text-xs text-slate-300 font-thai line-clamp-2" title={currentNote}>
                    {currentNote}
                  </span>
                ) : (
                  <span className="text-xs text-slate-600 italic">-</span>
                );
              }
            },
            {
              id: 'actions',
              label: 'ACTIONS',
              width: 90,
              minWidth: 80,
              align: 'center',
              render: (s) => (
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setEditTargetStd({ ...s })}
                    title="แก้ไขเกณฑ์มาตรฐาน (Edit Standard)"
                    className="p-1.5 text-cyan-400 hover:text-white bg-slate-800 hover:bg-cyan-600 rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetStd(s)}
                    title="ลบเกณฑ์มาตรฐาน (Delete Standard)"
                    className="p-1.5 text-rose-400 hover:text-white bg-slate-800 hover:bg-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Modal: Edit Single Part Life Standard */}
      {editTargetStd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-cyan-700/60 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white font-thai">แก้ไขเกณฑ์มาตรฐานอายุการใช้งาน (Edit Standard)</h3>
              </div>
              <button 
                onClick={() => setEditTargetStd(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleEdit} className="space-y-4 font-thai text-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">PART CODE: <strong className="text-cyan-400">{editTargetStd.configKey.partCode}</strong></div>
                  <div className="font-bold text-white">{editTargetStd.partName}</div>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  <div>Line: <span className="text-slate-200 font-bold">{editTargetStd.configKey.lineId}</span></div>
                  <div>Die: <span className="text-slate-300 font-mono">{editTargetStd.configKey.dieCode || '-'}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Material (ประเภทวัสดุ)</label>
                  <select
                    value={editTargetStd.configKey.material}
                    onChange={e => setEditTargetStd({
                      ...editTargetStd,
                      configKey: { ...editTargetStd.configKey, material: e.target.value as any }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="PCM">PCM (0.1mm)</option>
                    <option value="BARE">BARE (0.1mm)</option>
                    <option value="GOLD">GOLD (0.1mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tube Diameter (ขนาดท่อ)</label>
                  <select
                    value={editTargetStd.configKey.tubeSize}
                    onChange={e => setEditTargetStd({
                      ...editTargetStd,
                      configKey: { ...editTargetStd.configKey, tubeSize: e.target.value as any }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Ø5">Ø5</option>
                    <option value="Ø7">Ø7</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Life Limit (Shots) *</label>
                  <DebouncedNumericInput
                    value={editTargetStd.lifeLimitShots}
                    onChange={val => setEditTargetStd({ ...editTargetStd, lifeLimitShots: val })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Grinding Depth 1 Time (mm)</label>
                  <DebouncedNumericInput
                    step={0.01}
                    value={editTargetStd.regrindDepthPerTime ?? 0.20}
                    onChange={val => setEditTargetStd({ ...editTargetStd, regrindDepthPerTime: val })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Max Total Grinding (mm)</label>
                  <DebouncedNumericInput
                    step={0.1}
                    value={editTargetStd.maxTotalGrindingLimit ?? 3.0}
                    onChange={val => setEditTargetStd({ ...editTargetStd, maxTotalGrindingLimit: val })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Standard Shim Thickness (mm)</label>
                  <DebouncedNumericInput
                    step={0.01}
                    value={editTargetStd.standardShimThickness ?? 0.20}
                    onChange={val => setEditTargetStd({ ...editTargetStd, standardShimThickness: val })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Note / Remark (หมายเหตุ / ความถี่เปลี่ยน)</label>
                <input
                  type="text"
                  placeholder="ระบุหมายเหตุ..."
                  value={editTargetStd.notes || ''}
                  onChange={e => setEditTargetStd({ ...editTargetStd, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-edit-dispose"
                  checked={!!editTargetStd.regrindStandard?.disposeAfterUse}
                  onChange={e => setEditTargetStd({
                    ...editTargetStd,
                    regrindStandard: {
                      ...editTargetStd.regrindStandard,
                      oneTimeRegrindMm: (editTargetStd.regrindDepthPerTime || 0.20).toFixed(2),
                      totalRegrindMm: editTargetStd.maxTotalGrindingLimit || 3.0,
                      maxRegrindCount: 7,
                      disposeAfterUse: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="chk-edit-dispose" className="text-xs text-slate-300 cursor-pointer">
                  Single Use / Dispose after use (ชิ้นส่วนใช้ครั้งเดียวทิ้ง ไม่นำกลับมาเจียร)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditTargetStd(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-extrabold transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Part Life Standard */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">เพิ่มเกณฑ์มาตรฐานอายุการใช้งาน (Add Part Life Standard)</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 font-thai text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Part Code (รหัสชิ้นส่วน) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุรหัสอะไหล่..."
                    value={newStd.partCode}
                    onChange={e => setNewStd({ ...newStd, partCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Part Name (ชื่อชิ้นส่วน) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่ออะไหล่..."
                    value={newStd.partName}
                    onChange={e => setNewStd({ ...newStd, partName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Line (สายการผลิต)</label>
                  <select
                    value={newStd.lineId}
                    onChange={e => setNewStd({ ...newStd, lineId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ALL">ALL (ทุกไลน์: E1-E5)</option>
                    <option value="E1">E1 (Ø7 Slit, PCM)</option>
                    <option value="E2">E2 (Ø5 Slit, GOLD)</option>
                    <option value="E3-1">E3-1 (Slit 3P, PCM)</option>
                    <option value="E3-2">E3-2 (WL+ 4P, GOLD)</option>
                    <option value="E3-3">E3-3 (Corr 4P, GOLD)</option>
                    <option value="E4">E4 (Ø5 Slit, BARE)</option>
                    <option value="E5">E5 (Ø5 Slit, BARE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Material (ประเภทวัสดุ)</label>
                  <select
                    value={newStd.material}
                    onChange={e => setNewStd({ ...newStd, material: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="PCM">PCM (0.1mm)</option>
                    <option value="BARE">BARE (0.1mm)</option>
                    <option value="GOLD">GOLD (0.1mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tube Size (ขนาดท่อ)</label>
                  <select
                    value={newStd.tubeSize}
                    onChange={e => setNewStd({ ...newStd, tubeSize: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Ø7">Ø7</option>
                    <option value="Ø5">Ø5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Life Limit (Shots เกณฑ์อายุ)</label>
                  <input
                    type="number"
                    step="100000"
                    value={newStd.lifeLimitShots}
                    onChange={e => setNewStd({ ...newStd, lifeLimitShots: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">1 Time Regrind (mm/ครั้ง)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStd.regrindDepthPerTime}
                    onChange={e => setNewStd({ ...newStd, regrindDepthPerTime: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Max Regrind Limit (mm รวม)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStd.maxTotalGrindingLimit}
                    onChange={e => setNewStd({ ...newStd, maxTotalGrindingLimit: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Note / Remark (หมายเหตุ / ความถี่เปลี่ยน)</label>
                <input
                  type="text"
                  placeholder="ระบุหมายเหตุ/ข้อกำหนด..."
                  value={newStd.notes}
                  onChange={e => setNewStd({ ...newStd, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-dispose"
                  checked={newStd.disposeAfterUse}
                  onChange={e => setNewStd({ ...newStd, disposeAfterUse: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="chk-dispose" className="text-xs text-slate-300 cursor-pointer">
                  Single Use / Dispose after use (ชิ้นส่วนใช้ครั้งเดียวทิ้ง ไม่นำกลับมาเจียร)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-extrabold transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>บันทึกเพิ่มเกณฑ์มาตรฐาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTargetStd}
        onClose={() => setDeleteTargetStd(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTargetStd ? `[${deleteTargetStd.configKey.partCode}] ${deleteTargetStd.partName}` : ''}
        itemDetails={deleteTargetStd ? `สายการผลิต: ${deleteTargetStd.configKey.lineId} | วัสดุ: ${deleteTargetStd.configKey.material} | ขนาดท่อ: ${deleteTargetStd.configKey.tubeSize} | มาตรฐานอายุ: ${formatShots(deleteTargetStd.lifeLimitShots)} ช็อต` : undefined}
        warningText="การลบเกณฑ์มาตรฐานนี้จะส่งผลต่อการคำนวณอายุการใช้งานที่เหลือและการแจ้งเตือนในแดชบอร์ด"
      />
    </div>
  );
};

export const InstallQuantitySetupView: React.FC = () => {
  const [lines, setLines] = useState<any[]>([]);
  const [partMasters, setPartMasters] = useState<any[]>([]);
  const [standards, setStandards] = useState<PartLifeStandard[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'REGRINDABLE' | 'DISPOSABLE'>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editQtyValues, setEditQtyValues] = useState<Record<string, number>>({});
  const [editSpecValues, setEditSpecValues] = useState<Record<string, {
    lifeLimitShots: number;
    regrindDepthPerTime: number;
    maxTotalGrindingLimit: number;
    standardShimThickness: number;
    disposeAfterUse: boolean;
    notes: string;
  }>>({});
  
  const [editingRowItem, setEditingRowItem] = useState<any | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  
  const loadAll = () => {
    setLines(storageService.getLineConfigs());
    setPartMasters(storageService.getPartMasters());
    setStandards(storageService.getLifeStandards());
  };

  useEffect(() => {
    loadAll();
    const unsub = storageService.subscribe(loadAll);
    return () => unsub();
  }, []);

  const lineIds = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  interface UnifiedMatrixRow {
    no: number;
    part: string;
    code: string;
    stage: string;
    category: string;
    total: number;
    lifeLimitShots: number;
    regrindDepthPerTime: number;
    maxTotalGrindingLimit: number;
    standardShimThickness: number;
    disposeAfterUse: boolean;
    notes: string;
    matchedStandardId?: string;
    [key: string]: any;
  }

  const getCellKey = (partCode: string, lineId: string) => `${partCode}_${lineId}`;

  // Dynamically build unified matrix from part masters & life standards
  const unifiedMatrix: UnifiedMatrixRow[] = partMasters.map((pm, index) => {
    // Find matching Life Standard
    const matchedStd = standards.find(s => 
      s.configKey?.partCode === pm.partCode || 
      s.partName === pm.partName ||
      s.stagePunchDie === pm.stageName ||
      s.stagePunchDie === pm.partName
    );

    // Default or current specs
    const defaultLifeLimit = matchedStd?.lifeLimitShots || 18000000;
    const defaultRegrindDepth = matchedStd?.regrindDepthPerTime ?? (parseFloat(matchedStd?.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20);
    const defaultMaxRegrind = matchedStd?.maxTotalGrindingLimit ?? (typeof matchedStd?.regrindStandard?.totalRegrindMm === 'number' ? matchedStd.regrindStandard.totalRegrindMm : 1.50);
    const defaultShim = matchedStd?.standardShimThickness ?? 0.20;
    const defaultDispose = !!(matchedStd?.regrindStandard?.disposeAfterUse);
    const defaultNotes = matchedStd?.notes || matchedStd?.regrindStandard?.regrindIntervalNote || matchedStd?.changeIntervalNotes || '';

    const specEdit = editSpecValues[pm.partCode];

    const row: UnifiedMatrixRow = {
      no: index + 1,
      part: pm.partName,
      code: pm.partCode,
      stage: pm.stageName || '-',
      category: pm.category || 'OTHER',
      total: 0,
      matchedStandardId: matchedStd?.id,
      lifeLimitShots: isEditing && specEdit ? specEdit.lifeLimitShots : defaultLifeLimit,
      regrindDepthPerTime: isEditing && specEdit ? specEdit.regrindDepthPerTime : defaultRegrindDepth,
      maxTotalGrindingLimit: isEditing && specEdit ? specEdit.maxTotalGrindingLimit : defaultMaxRegrind,
      standardShimThickness: isEditing && specEdit ? specEdit.standardShimThickness : defaultShim,
      disposeAfterUse: isEditing && specEdit ? specEdit.disposeAfterUse : defaultDispose,
      notes: isEditing && specEdit ? specEdit.notes : defaultNotes
    };

    let total = 0;
    lineIds.forEach(lId => {
      let qty = 0;
      const lineConfig = lines.find(l => l.lineId === lId);
      if (lineConfig && lineConfig.installedPartQuantities) {
        qty = lineConfig.installedPartQuantities[pm.partCode] || 0;
      }
      if (isEditing) {
        qty = editQtyValues[getCellKey(pm.partCode, lId)] !== undefined ? editQtyValues[getCellKey(pm.partCode, lId)] : qty;
      }
      row[lId] = qty;
      total += qty;
    });
    row.total = total;
    return row;
  });

  // Filtered rows
  const filteredMatrix = unifiedMatrix.filter(row => {
    const matchesSearch = 
      row.part.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.notes.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'REGRINDABLE') {
      return !row.disposeAfterUse && row.maxTotalGrindingLimit > 0;
    }
    if (filterType === 'DISPOSABLE') {
      return row.disposeAfterUse || row.maxTotalGrindingLimit === 0;
    }
    return true;
  });

  const grandTotalTooling = unifiedMatrix.reduce((sum, item) => sum + item.total, 0);
  const totalDisposableCount = unifiedMatrix.filter(i => i.disposeAfterUse || i.maxTotalGrindingLimit === 0).length;
  const totalRegrindableCount = unifiedMatrix.length - totalDisposableCount;

  const handleEditClick = () => {
    // Populate quantity edit values
    const currentQty: Record<string, number> = {};
    const currentSpecs: Record<string, any> = {};

    unifiedMatrix.forEach(row => {
      lineIds.forEach(lId => {
        currentQty[getCellKey(row.code, lId)] = row[lId] || 0;
      });
      currentSpecs[row.code] = {
        lifeLimitShots: row.lifeLimitShots,
        regrindDepthPerTime: row.regrindDepthPerTime,
        maxTotalGrindingLimit: row.maxTotalGrindingLimit,
        standardShimThickness: row.standardShimThickness,
        disposeAfterUse: row.disposeAfterUse,
        notes: row.notes
      };
    });

    setEditQtyValues(currentQty);
    setEditSpecValues(currentSpecs);
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    // 1. Save Line Installed Quantities
    const qtyUpdates = Object.keys(editQtyValues).map(key => {
      const [partCode, lineId] = key.split('_');
      return { lineId, partCode, installQty: editQtyValues[key] };
    });
    storageService.updateInstallQuantities(qtyUpdates);

    // 2. Save Life Standards
    const allStds = storageService.getLifeStandards();
    const updatedStds = [...allStds];

    Object.keys(editSpecValues).forEach(partCode => {
      const spec = editSpecValues[partCode];
      const targetPart = partMasters.find(p => p.partCode === partCode);
      const existingIdx = updatedStds.findIndex(s => s.configKey?.partCode === partCode || s.partName === targetPart?.partName);

      if (existingIdx >= 0) {
        const std = { ...updatedStds[existingIdx] };
        std.lifeLimitShots = spec.lifeLimitShots;
        std.regrindDepthPerTime = spec.regrindDepthPerTime;
        std.maxTotalGrindingLimit = spec.maxTotalGrindingLimit;
        std.standardShimThickness = spec.standardShimThickness;
        std.notes = spec.notes;
        if (std.regrindStandard) {
          std.regrindStandard.disposeAfterUse = spec.disposeAfterUse;
          std.regrindStandard.oneTimeRegrindMm = (spec.regrindDepthPerTime || 0.20).toFixed(2);
          std.regrindStandard.totalRegrindMm = spec.maxTotalGrindingLimit;
          std.regrindStandard.maxTotalGrindingLimit = spec.maxTotalGrindingLimit;
          std.regrindStandard.regrindDepthPerTime = spec.regrindDepthPerTime;
          std.regrindStandard.standardShimThickness = spec.standardShimThickness;
          std.regrindStandard.regrindIntervalNote = spec.notes;
        }
        std.updatedAt = new Date().toISOString();
        updatedStds[existingIdx] = std;
      } else if (targetPart) {
        // Create new standard entry
        const newStd: PartLifeStandard = {
          id: `STD-ALL-${partCode.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`,
          configKey: {
            lineId: 'ALL',
            configurationId: 'CFG-ALL',
            dieCode: 'FD-ALL',
            finType: 'Slit (half)',
            material: 'PCM',
            thicknessMm: 0.10,
            tubeSize: targetPart.tubeSizeCompat === 'Ø5' ? 'Ø5' : 'Ø7',
            partCode: partCode,
            position: 'ALL',
            effectiveDate: new Date().toISOString().substring(0, 10)
          },
          compositeKeyString: `ALL|PCM|0.10mm|Ø7|${partCode}`,
          partName: targetPart.partName,
          stagePunchDie: targetPart.stageName || targetPart.partName,
          lifeLimitShots: spec.lifeLimitShots,
          regrindDepthPerTime: spec.regrindDepthPerTime,
          maxTotalGrindingLimit: spec.maxTotalGrindingLimit,
          standardShimThickness: spec.standardShimThickness,
          notes: spec.notes,
          regrindStandard: {
            oneTimeRegrindMm: (spec.regrindDepthPerTime || 0.20).toFixed(2),
            totalRegrindMm: spec.maxTotalGrindingLimit,
            maxRegrindCount: 7,
            disposeAfterUse: spec.disposeAfterUse,
            regrindIntervalNote: spec.notes
          },
          createdBy: 'Unified Matrix Admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedStds.push(newStd);
      }
    });

    storageService.saveLifeStandards(updatedStds);
    setIsEditing(false);
    setSaveSuccessMsg('บันทึกการแก้ไขจำนวนติดตั้งและเกณฑ์อายุการใช้งาน (Matrix Saved Successfully)');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    loadAll();
  };

  const handleCancelClick = () => {
    setEditQtyValues({});
    setEditSpecValues({});
    setIsEditing(false);
  };

  const handleQtyChange = (partCode: string, lineId: string, value: string) => {
    const num = parseInt(value, 10);
    setEditQtyValues(prev => ({
      ...prev,
      [getCellKey(partCode, lineId)]: isNaN(num) ? 0 : num
    }));
  };

  const handleSpecChange = (partCode: string, field: string, value: any) => {
    setEditSpecValues(prev => {
      const current = prev[partCode] || {
        lifeLimitShots: 18000000,
        regrindDepthPerTime: 0.20,
        maxTotalGrindingLimit: 1.50,
        standardShimThickness: 0.20,
        disposeAfterUse: false,
        notes: ''
      };
      return {
        ...prev,
        [partCode]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleSaveSingleRowModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRowItem) return;

    // 1. Update quantities
    const updates = lineIds.map(lId => ({
      lineId: lId,
      partCode: editingRowItem.code,
      installQty: editingRowItem[lId] || 0
    }));
    storageService.updateInstallQuantities(updates);

    // 2. Update Life Standard
    const allStds = storageService.getLifeStandards();
    const existingIdx = allStds.findIndex(s => s.configKey?.partCode === editingRowItem.code || s.partName === editingRowItem.part);
    
    if (existingIdx >= 0) {
      const std = { ...allStds[existingIdx] };
      std.lifeLimitShots = Number(editingRowItem.lifeLimitShots) || 18000000;
      std.regrindDepthPerTime = Number(editingRowItem.regrindDepthPerTime) || 0.20;
      std.maxTotalGrindingLimit = Number(editingRowItem.maxTotalGrindingLimit) || 1.50;
      std.standardShimThickness = Number(editingRowItem.standardShimThickness) || 0.20;
      std.notes = editingRowItem.notes || '';
      if (std.regrindStandard) {
        std.regrindStandard.disposeAfterUse = !!editingRowItem.disposeAfterUse;
        std.regrindStandard.oneTimeRegrindMm = (Number(editingRowItem.regrindDepthPerTime) || 0.20).toFixed(2);
        std.regrindStandard.totalRegrindMm = Number(editingRowItem.maxTotalGrindingLimit) || 1.50;
        std.regrindStandard.maxTotalGrindingLimit = Number(editingRowItem.maxTotalGrindingLimit) || 1.50;
        std.regrindStandard.regrindDepthPerTime = Number(editingRowItem.regrindDepthPerTime) || 0.20;
        std.regrindStandard.standardShimThickness = Number(editingRowItem.standardShimThickness) || 0.20;
        std.regrindStandard.regrindIntervalNote = editingRowItem.notes || '';
      }
      std.updatedAt = new Date().toISOString();
      storageService.saveLifeStandard(std);
    } else {
      const newStd: PartLifeStandard = {
        id: `STD-ALL-${editingRowItem.code.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-4)}`,
        configKey: {
          lineId: 'ALL',
          configurationId: 'CFG-ALL',
          dieCode: 'FD-ALL',
          finType: 'Slit (half)',
          material: 'PCM',
          thicknessMm: 0.10,
          tubeSize: 'Ø7',
          partCode: editingRowItem.code,
          position: 'ALL',
          effectiveDate: new Date().toISOString().substring(0, 10)
        },
        compositeKeyString: `ALL|PCM|0.10mm|Ø7|${editingRowItem.code}`,
        partName: editingRowItem.part,
        stagePunchDie: editingRowItem.stage || editingRowItem.part,
        lifeLimitShots: Number(editingRowItem.lifeLimitShots) || 18000000,
        regrindDepthPerTime: Number(editingRowItem.regrindDepthPerTime) || 0.20,
        maxTotalGrindingLimit: Number(editingRowItem.maxTotalGrindingLimit) || 1.50,
        standardShimThickness: Number(editingRowItem.standardShimThickness) || 0.20,
        notes: editingRowItem.notes || '',
        regrindStandard: {
          oneTimeRegrindMm: (Number(editingRowItem.regrindDepthPerTime) || 0.20).toFixed(2),
          totalRegrindMm: Number(editingRowItem.maxTotalGrindingLimit) || 1.50,
          maxRegrindCount: 7,
          disposeAfterUse: !!editingRowItem.disposeAfterUse,
          regrindIntervalNote: editingRowItem.notes || ''
        },
        createdBy: 'Unified Matrix Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      storageService.saveLifeStandard(newStd);
    }

    setEditingRowItem(null);
    setSaveSuccessMsg(`บันทึกข้อมูลและสเปก ${editingRowItem.part} เรียบร้อยแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    loadAll();
  };

  const handleExportCsv = () => {
    const headers = [
      'NO',
      'STAGE / PART NAME',
      'PART CODE',
      'E1',
      'E2',
      'E3_1',
      'E3_2',
      'E3_3',
      'E4',
      'E5',
      'TOTAL_EA',
      'LIFE_LIMIT_SHOTS',
      'ONE_TIME_REGRIND_MM',
      'MAX_REGRIND_MM',
      'SHIM_MM',
      'DISPOSE_1_USE',
      'NOTES'
    ];

    const csvRows = [headers.join(',')];
    unifiedMatrix.forEach(r => {
      const values = [
        r.no,
        `"${r.part.replace(/"/g, '""')}"`,
        `"${r.code}"`,
        r['E1'] || 0,
        r['E2'] || 0,
        r['E3-1'] || 0,
        r['E3-2'] || 0,
        r['E3-3'] || 0,
        r['E4'] || 0,
        r['E5'] || 0,
        r.total,
        r.lifeLimitShots,
        r.regrindDepthPerTime,
        r.maxTotalGrindingLimit,
        r.standardShimThickness,
        r.disposeAfterUse ? 'YES' : 'NO',
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FinDie_Installed_and_Life_Matrix_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      
      {/* Toast Alert */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-emerald-400 animate-slideUp font-mono text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-white" />
          <span className="font-semibold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Header & KPI Summary Cards */}
      <div className="bg-[#0F172A] border border-slate-700 rounded-lg p-4 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Fin Die Installed Quantity & Tool Life Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-thai">
              ตารางรวมจำนวนติดตั้งในแม่พิมพ์แยกตามสายการผลิต (E1-E5) พร้อมสเปกอายุการใช้งาน (Life Limit, Max Regrind, Shim, 1-Use) จบในหน้าเดียว
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelClick}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClick}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Matrix</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditClick}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Matrix</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
          <div className="bg-[#1E293B] px-3 py-2 rounded border border-slate-700 font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">TOTAL ACTIVE TOOLING</div>
            <div className="text-base font-black text-cyan-300">{grandTotalTooling.toLocaleString()} EA</div>
          </div>

          <div className="bg-[#1E293B] px-3 py-2 rounded border border-slate-700 font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">TOTAL MASTER PARTS</div>
            <div className="text-base font-black text-white">{unifiedMatrix.length} Parts</div>
          </div>

          <div className="bg-[#1E293B] px-3 py-2 rounded border border-slate-700 font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">RE-GRINDABLE PARTS</div>
            <div className="text-base font-black text-emerald-400">{totalRegrindableCount} Parts</div>
          </div>

          <div className="bg-[#1E293B] px-3 py-2 rounded border border-slate-700 font-mono">
            <div className="text-[10px] text-slate-400 font-bold uppercase">DISPOSABLE (1-USE)</div>
            <div className="text-base font-black text-rose-400">{totalDisposableCount} Parts</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อชิ้นส่วน, รหัส Part Code, Stage หรือหมายเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Filter:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              ทั้งหมด ({unifiedMatrix.length})
            </button>
            <button
              onClick={() => setFilterType('REGRINDABLE')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                filterType === 'REGRINDABLE'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              สลับคมได้ ({totalRegrindableCount})
            </button>
            <button
              onClick={() => setFilterType('DISPOSABLE')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                filterType === 'DISPOSABLE'
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              ใช้ครั้งเดียวทิ้ง ({totalDisposableCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Unified Table */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-3 sm:p-4 shadow-lg overflow-hidden">
        <ResizableReorderableTable
          data={filteredMatrix}
          keyExtractor={(row) => row.code}
          emptyMessage="ไม่พบข้อมูลในเงื่อนไขการค้นหา"
          columns={[
            {
              id: 'no',
              label: 'NO.',
              width: 50,
              minWidth: 40,
              align: 'center',
              render: (row) => <span className="text-cyan-400/90 font-mono font-bold text-xs">{row.no}</span>
            },
            {
              id: 'part',
              label: 'STAGE PUNCH / DIE',
              width: 170,
              render: (row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-100 text-xs">{row.part}</span>
                  <span className="text-[10px] text-slate-400">{row.stage}</span>
                </div>
              )
            },
            {
              id: 'code',
              label: 'PART CODE',
              width: 110,
              render: (row) => <span className="text-cyan-300 font-mono text-xs">{row.code}</span>
            },
            // Line Installed Quantity Columns
            ...lineIds.map(lId => ({
              id: lId,
              label: lId.startsWith('E3-') ? `E3 (${LINE_INFO_MAP[lId]?.shortTag || lId})` : lId,
              width: 75,
              align: 'center' as const,
              render: (row: any) => (
                isEditing ? (
                  <DebouncedNumericInput
                    min={0}
                    value={row[lId]}
                    onChange={(val) => handleQtyChange(row.code, lId, val)}
                    className="w-13 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                ) : (
                  <span className={`font-mono text-xs ${row[lId] > 0 ? 'text-slate-200 font-semibold' : 'text-slate-600'}`}>
                    {row[lId] > 0 ? row[lId] : '-'}
                  </span>
                )
              )
            })),
            {
              id: 'total',
              label: 'TOTAL (EA)',
              width: 90,
              align: 'right',
              render: (row) => <span className="font-black text-emerald-400 font-mono text-xs">{row.total.toLocaleString()}</span>
            },
            // Merged Tool Life & Regrind Specification Columns
            {
              id: 'lifeLimitShots',
              label: 'LIFE LIMIT (SHOTS)',
              width: 130,
              align: 'right',
              render: (row) => (
                isEditing ? (
                  <DebouncedNumericInput
                    min={1000}
                    step={100000}
                    value={row.lifeLimitShots}
                    onChange={(val) => handleSpecChange(row.code, 'lifeLimitShots', parseInt(val, 10) || 0)}
                    className="w-24 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-right text-emerald-400 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                ) : (
                  <span className="text-emerald-400 font-mono font-bold text-xs">
                    {formatShots(row.lifeLimitShots)}
                  </span>
                )
              )
            },
            {
              id: 'regrindDepthPerTime',
              label: '1 TIME / REGRIND',
              width: 110,
              align: 'center',
              render: (row) => (
                isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.regrindDepthPerTime}
                    onChange={(e) => handleSpecChange(row.code, 'regrindDepthPerTime', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono text-xs text-slate-300">
                    {row.regrindDepthPerTime > 0 ? `${row.regrindDepthPerTime.toFixed(2)} mm` : '-'}
                  </span>
                )
              )
            },
            {
              id: 'maxTotalGrindingLimit',
              label: 'MAX REGRIND',
              width: 110,
              align: 'center',
              render: (row) => (
                isEditing ? (
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={row.maxTotalGrindingLimit}
                    onChange={(e) => handleSpecChange(row.code, 'maxTotalGrindingLimit', parseFloat(e.target.value) || 0)}
                    className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono text-xs text-slate-300">
                    {row.maxTotalGrindingLimit > 0 ? `${row.maxTotalGrindingLimit.toFixed(2)} mm` : '-'}
                  </span>
                )
              )
            },
            {
              id: 'standardShimThickness',
              label: 'SHIM (MM)',
              width: 90,
              align: 'center',
              render: (row) => (
                isEditing ? (
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={row.standardShimThickness}
                    onChange={(e) => handleSpecChange(row.code, 'standardShimThickness', parseFloat(e.target.value) || 0)}
                    className="w-14 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                ) : (
                  <span className="font-mono text-xs text-slate-300">
                    {row.standardShimThickness > 0 ? `${row.standardShimThickness.toFixed(2)} mm` : '-'}
                  </span>
                )
              )
            },
            {
              id: 'disposeAfterUse',
              label: '1-USE / DISPOSE',
              width: 110,
              align: 'center',
              render: (row) => (
                isEditing ? (
                  <button
                    type="button"
                    onClick={() => handleSpecChange(row.code, 'disposeAfterUse', !row.disposeAfterUse)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                      row.disposeAfterUse 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-slate-800 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {row.disposeAfterUse ? 'YES (1-USE)' : 'NO (REGRIND)'}
                  </button>
                ) : (
                  row.disposeAfterUse || row.maxTotalGrindingLimit === 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-700/60">
                      YES (1-USE)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700">
                      NO
                    </span>
                  )
                )
              )
            },
            {
              id: 'notes',
              label: 'NOTE / REMARK',
              width: 160,
              render: (row) => (
                isEditing ? (
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => handleSpecChange(row.code, 'notes', e.target.value)}
                    placeholder="หมายเหตุ..."
                    className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-white focus:outline-none focus:border-cyan-400 text-xs font-sans"
                  />
                ) : (
                  <span className="text-slate-400 text-xs truncate block" title={row.notes}>
                    {row.notes || '-'}
                  </span>
                )
              )
            },
            {
              id: 'actions',
              label: 'ACTIONS',
              width: 75,
              align: 'center',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setEditingRowItem({ ...row })}
                  className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                  title="แก้ไขสเปกชิ้นส่วนนี้"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )
            }
          ]}
        />
      </div>

      {/* Row Edit Modal Dialog */}
      {editingRowItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-600 text-white rounded-lg p-5 max-w-2xl w-full shadow-2xl relative font-sans space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">แก้ไขข้อมูลและสเปกชิ้นส่วนแม่พิมพ์</h3>
                  <p className="text-xs text-slate-400 font-mono">{editingRowItem.part} ({editingRowItem.code})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRowItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleRowModal} className="space-y-4 text-xs">
              
              {/* Section 1: Line Installed Quantities */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  1. จำนวนติดตั้งแยกตามสายการผลิต (Installed Quantities per Line)
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 bg-slate-900 p-2.5 rounded border border-slate-800">
                  {lineIds.map(lId => (
                    <div key={lId} className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block text-center">
                        {lId.startsWith('E3-') ? `E3 (${LINE_INFO_MAP[lId]?.shortTag || lId})` : lId}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingRowItem[lId] !== undefined ? editingRowItem[lId] : 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setEditingRowItem((prev: any) => ({ ...prev, [lId]: val }));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Tool Life & Regrinding Standards */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  2. มาตรฐานอายุการใช้งานและการเจียรคม (Tool Life & Regrind Specifications)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Life Limit (มาตรฐานอายุช็อต)</label>
                    <input
                      type="number"
                      step="100000"
                      min="1000"
                      value={editingRowItem.lifeLimitShots || 18000000}
                      onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, lifeLimitShots: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">1 Time Regrind (ระยะเจียรต่อครั้ง - mm)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingRowItem.regrindDepthPerTime || 0.20}
                      onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, regrindDepthPerTime: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Max Regrind (ระยะเจียรรวมสูงสุด - mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={editingRowItem.maxTotalGrindingLimit || 1.50}
                      onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, maxTotalGrindingLimit: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Standard Shim (ความหนาชิมมาตรฐาน - mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={editingRowItem.standardShimThickness || 0.20}
                      onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, standardShimThickness: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={!!editingRowItem.disposeAfterUse}
                        onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, disposeAfterUse: e.target.checked }))}
                        className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700"
                      />
                      <span className="text-slate-200 font-bold">ใช้ครั้งเดียวทิ้ง (Dispose of after 1 use - ไม่สามารถเจียรคมซ้ำได้)</span>
                    </label>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-slate-300 font-medium">หมายเหตุรอบการเปลี่ยน / การบำรุงรักษา</label>
                    <input
                      type="text"
                      value={editingRowItem.notes || ''}
                      onChange={(e) => setEditingRowItem((prev: any) => ({ ...prev, notes: e.target.value }))}
                      placeholder="เช่น Change every 10-15 Day (เปลี่ยนทุกๆ 10-15 วัน)"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingRowItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
