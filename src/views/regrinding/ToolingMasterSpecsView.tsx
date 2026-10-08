import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Package,
  ShieldCheck,
  Ruler,
  DatabaseZap
} from 'lucide-react';
import { PartLifeStandard, FinMaterial, TubeDiameter, FinType, ProductionLineId, LINE_INFO_MAP, PartMaster, SpareStockItem } from '../../types';
import { storageService } from '../../services/storageService';
import { formatShots, formatThb, generateCompositeKey } from '../../services/calculationService';
import { ResizableReorderableTable } from '../../components/common/ResizableReorderableTable';
import { DebouncedNumericInput } from '../../components/common/DebouncedNumericInput';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import { ToolingPartMasterItem } from '../../types/regrind';

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

interface ToolingMasterSpecsViewProps {
  masters?: ToolingPartMasterItem[];
}

export const ToolingMasterSpecsView: React.FC<ToolingMasterSpecsViewProps> = () => {
  const [standards, setStandards] = useState<PartLifeStandard[]>([]);
  const [partMasters, setPartMasters] = useState<PartMaster[]>([]);
  const [spareStocks, setSpareStocks] = useState<SpareStockItem[]>([]);
  
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

  const reloadData = () => {
    setStandards(storageService.getLifeStandards());
    setPartMasters(storageService.getPartMasters());
    setSpareStocks(storageService.getSpareStocks());
  };

  useEffect(() => {
    reloadData();
    const unsub = storageService.subscribe(reloadData);
    return () => unsub();
  }, []);

  // Map part master helpers
  const partMasterMap = useMemo(() => {
    const map = new Map<string, PartMaster>();
    partMasters.forEach(pm => {
      map.set(pm.partCode.toUpperCase(), pm);
      map.set(pm.partName.toLowerCase(), pm);
    });
    return map;
  }, [partMasters]);

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    spareStocks.forEach(stk => {
      map.set(stk.partCode.toUpperCase(), stk.currentStockQty);
    });
    return map;
  }, [spareStocks]);

  const getPartPicCategory = (partName: string, partCode: string): string => {
    const pm = partMasterMap.get(partCode.toUpperCase()) || partMasterMap.get(partName.toLowerCase());
    if (pm && pm.picCategory) return pm.picCategory;
    const lower = partName.toLowerCase();
    if (lower.includes('burr')) return 'burring_7';
    if (lower.includes('pierce')) return 'pierce_7';
    if (lower.includes('slit')) return 'slit_blade_7';
    if (lower.includes('side cut punch')) return 'side_cut_punch_7';
    if (lower.includes('side cut die')) return 'side_cut_die_7';
    if (lower.includes('cut off punch') || lower.includes('cutoff punch')) return 'cutoff_punch_7';
    if (lower.includes('cut off die') || lower.includes('cutoff die')) return 'cutoff_die_7';
    if (lower.includes('louver')) return 'louver_blade_7';
    if (lower.includes('guide')) return 'guide_pin_7';
    return 'generic_punch';
  };

  const getNominalLength = (partCode: string, partName: string): number => {
    const pm = partMasterMap.get(partCode.toUpperCase()) || partMasterMap.get(partName.toLowerCase());
    if (pm && pm.nominalLengthMm) return pm.nominalLengthMm;
    const lower = partName.toLowerCase();
    if (lower.includes('burr')) return 70.00;
    if (lower.includes('pierce')) return 68.00;
    if (lower.includes('slit')) return 120.00;
    if (lower.includes('cut off') || lower.includes('cutoff')) return 85.00;
    if (lower.includes('side cut')) return 90.00;
    return 70.00;
  };

  const getMinAllowedLength = (partCode: string, partName: string, maxRegrind: number): number => {
    const pm = partMasterMap.get(partCode.toUpperCase()) || partMasterMap.get(partName.toLowerCase());
    if (pm && pm.minAllowedLengthMm) return pm.minAllowedLengthMm;
    const nominal = getNominalLength(partCode, partName);
    return Math.max(0, nominal - (maxRegrind || 3.0));
  };

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
      if (!std) return;
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
    setSaveSuccessMsg('บันทึกการแก้ไขเกณฑ์มาตรฐานเรียบร้อยแล้ว (Matrix Saved & Synchronized Successfully)');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reloadData();
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
        maxRegrindCount: Math.round((Number(newStd.maxTotalGrindingLimit) || 3.0) / (Number(newStd.regrindDepthPerTime) || 0.20)),
        disposeAfterUse: newStd.disposeAfterUse,
        regrindIntervalNote: newStd.notes.trim()
      },
      createdBy: 'Die Regrind Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.saveLifeStandard(createdStandard);
    setShowAddModal(false);
    setSaveSuccessMsg(`เพิ่มเกณฑ์มาตรฐานสำหรับ ${newStd.partName} สำเร็จแล้ว`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reloadData();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetStd) return;
    storageService.deleteLifeStandard(deleteTargetStd.id);
    setSaveSuccessMsg(`ลบเกณฑ์มาตรฐานสำหรับ ${deleteTargetStd.partName} (${deleteTargetStd.configKey.partCode}) สำเร็จแล้ว`);
    setDeleteTargetStd(null);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reloadData();
  };

  const handleSaveSingleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetStd) return;
    storageService.saveLifeStandard(editTargetStd);
    setSaveSuccessMsg(`บันทึกการแก้ไขเกณฑ์มาตรฐาน ${editTargetStd.partName} สำเร็จแล้ว`);
    setEditTargetStd(null);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    reloadData();
  };

  // Filter standards by Line, Search, Material, Tube
  const filtered = useMemo(() => {
    return standards.filter(s => {
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
  }, [standards, searchTerm, selectedLine, selectedMaterial, selectedTube]);

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

      {/* Main Filter & Action Bar Header */}
      <div className="bg-[#0F172A] border border-slate-700 rounded-xl p-4 shadow-md space-y-3">
        {/* Row 1: Header Info & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Fin Die Part Life & Regrinding Standard Matrix</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                    {filtered.length} STANDARDS SYNCED
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-thai">
                  ดึงข้อมูลและเชื่อมโยงมาตรฐานโดยตรงจาก Fin Die Part Life Standard Matrix (เกณฑ์อายุ, ระยะเจียร/ครั้ง, และลิมิตความยาวรวม)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Add Standard Button */}
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
                <button 
                  onClick={handleCancelClick} 
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveClick} 
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-lg shadow-emerald-950"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Matrix</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEditClick} 
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-lg shadow-cyan-950"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Matrix</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="ค้นหาชิ้นส่วน/รหัส..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-white text-xs sm:text-sm focus:outline-none w-36 sm:w-48 font-thai"
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
          </div>

          <div className="text-xs text-slate-400 font-mono">
            แสดง <strong className="text-cyan-400">{filtered.length}</strong> / {standards.length} รายการ
          </div>
        </div>

        {/* Row 3: Line Quick Selection Buttons (แถบเลือก Line เหมือนหน้า Fin Die Install / Die Specs) */}
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

      {/* ========================================================================= */}
      {/* MATRIX TABLE VIEW (สไตล์เดียวกับ Fin Die Install Matrix) */}
      {/* ========================================================================= */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700 p-3 sm:p-4 shadow-lg">
        <ResizableReorderableTable<PartLifeStandard>
          data={filtered}
          keyExtractor={(s) => s.id}
          emptyMessage="ไม่พบข้อมูลเกณฑ์มาตรฐานอายุการใช้งานและพารามิเตอร์การเจียรที่ตรงกับเงื่อนไข"
          columns={[
              {
                id: 'no',
                label: 'NO.',
                width: 50,
                minWidth: 40,
                align: 'center',
                render: (_, idx) => (
                  <span className="text-cyan-400/80 font-mono font-bold text-xs">{idx + 1}</span>
                )
              },
              {
                id: 'pic',
                label: 'PIC',
                width: 55,
                minWidth: 48,
                align: 'center',
                render: (s) => (
                  <ToolingPicThumbnail
                    picCategory={getPartPicCategory(s.partName, s.configKey.partCode)}
                    partName={s.partName}
                    size="xs"
                  />
                )
              },
              {
                id: 'part',
                label: 'STAGE / PART NAME',
                width: 220,
                minWidth: 160,
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
                  const thick = s.configKey.thicknessMm ? `${s.configKey.thicknessMm}mm` : '0.1mm';

                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      isPcm ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                      isGold ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      isBare ? 'bg-slate-500/25 text-slate-200 border border-slate-500/40' :
                      'bg-slate-700 text-slate-200'
                    }`}>
                      <span>{isPcm ? 'PCM' : isGold ? 'GOLD' : isBare ? 'BARE' : mat}</span>
                      <span className="opacity-75 text-[10px]">({thick})</span>
                    </span>
                  );
                }
              },
              {
                id: 'tubeSize',
                label: 'TUBE',
                width: 75,
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
                label: '1 TIME / GRIND (MM)',
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
                  <span className="font-mono text-sky-300 font-bold text-xs">
                    {(s.regrindDepthPerTime ?? (parseFloat(s.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20)).toFixed(2)} mm
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
                  <span className="font-mono text-rose-400 font-bold text-xs">
                    {(s.maxTotalGrindingLimit ?? s.regrindStandard?.totalRegrindMm ?? 3.0).toFixed(2)} mm
                  </span>
                )
              },
              {
                id: 'maxCycles',
                label: 'MAX CYCLES',
                width: 100,
                minWidth: 80,
                align: 'center',
                render: (s) => {
                  const oneTime = s.regrindDepthPerTime ?? 0.20;
                  const total = s.maxTotalGrindingLimit ?? 3.0;
                  const cycles = s.regrindStandard?.maxRegrindCount || Math.round(total / (oneTime || 0.20));
                  return (
                    <span className="font-mono font-bold text-amber-300 text-xs">
                      {cycles} รอบ
                    </span>
                  );
                }
              },
              {
                id: 'shimThickness',
                label: 'SHIM (MM)',
                width: 95,
                minWidth: 75,
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
                id: 'nominalMin',
                label: 'NOMINAL / MIN (MM)',
                width: 140,
                minWidth: 110,
                align: 'center',
                render: (s) => {
                  const nominal = getNominalLength(s.configKey.partCode, s.partName);
                  const minLimit = getMinAllowedLength(s.configKey.partCode, s.partName, s.maxTotalGrindingLimit || 3.0);
                  return (
                    <div className="font-mono text-xs">
                      <span className="text-slate-200">{nominal.toFixed(1)}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400 font-bold">{minLimit.toFixed(1)}</span>
                    </div>
                  );
                }
              },
              {
                id: 'spareStock',
                label: 'STOCK',
                width: 85,
                minWidth: 70,
                align: 'center',
                render: (s) => {
                  const qty = stockMap.get(s.configKey.partCode.toUpperCase()) ?? 45;
                  return (
                    <span className="font-mono font-bold text-cyan-300 text-xs">
                      {qty} ชิ้น
                    </span>
                  );
                }
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
                width: 200,
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
                width: 85,
                minWidth: 75,
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
                <h3 className="text-lg font-bold text-white font-thai">แก้ไขเกณฑ์มาตรฐาน & ลิมิตเจียร (Edit Standard)</h3>
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
                  id="chk-edit-dispose-std"
                  checked={!!editTargetStd.regrindStandard?.disposeAfterUse}
                  onChange={e => setEditTargetStd({
                    ...editTargetStd,
                    regrindStandard: {
                      ...editTargetStd.regrindStandard,
                      oneTimeRegrindMm: (editTargetStd.regrindDepthPerTime || 0.20).toFixed(2),
                      totalRegrindMm: editTargetStd.maxTotalGrindingLimit || 3.0,
                      maxRegrindCount: Math.round((editTargetStd.maxTotalGrindingLimit || 3.0) / (editTargetStd.regrindDepthPerTime || 0.20)),
                      disposeAfterUse: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="chk-edit-dispose-std" className="text-xs text-slate-300 cursor-pointer">
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
                <h3 className="text-lg font-bold text-white">เพิ่มเกณฑ์มาตรฐาน & ลิมิตเจียร (Add Part Life Standard)</h3>
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
                  id="chk-new-dispose"
                  checked={newStd.disposeAfterUse}
                  onChange={e => setNewStd({ ...newStd, disposeAfterUse: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="chk-new-dispose" className="text-xs text-slate-300 cursor-pointer">
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
