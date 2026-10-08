import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  X,
  Search,
  Plus,
  RefreshCw,
  FolderPlus,
  Sparkles,
  Filter,
  Trash2,
  Edit2,
  Check,
  LayoutList,
  Settings2,
  Database
} from 'lucide-react';
import { storageService } from '../../services/storageService';
import { PartMaster } from '../../types';
import { DEFAULT_STAGE_GROUPS, deriveLogicalStage, sortStagesInOrder } from '../../utils/stageUtils';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface StageManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const StageManagementModal: React.FC<StageManagementModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'ASSIGN' | 'MANAGE'>('ASSIGN');
  const [partMasters, setPartMasters] = useState<PartMaster[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Stage Groups State
  const [stageGroups, setStageGroups] = useState<string[]>([]);

  // New Stage Form
  const [newStageInput, setNewStageInput] = useState('');

  // Editing Stage
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editStageInput, setEditStageInput] = useState('');

  // Delete & Merge Confirmation State (No window.confirm in iframe)
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{ oldName: string; newName: string } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = () => {
    const masters = storageService.getPartMasters();
    
    // Auto-clean Thai names from previously saved stage groups if they exist
    let savedGroups = storageService.getStageGroups();
    let cleanedGroups = false;
    
    savedGroups = savedGroups.map(g => {
      if (/[\u0E00-\u0E7F]/.test(g)) {
        cleanedGroups = true;
        return g.replace(/\s*\([\u0E00-\u0E7F\s\/]+\)/g, '').trim();
      }
      return g.trim();
    });

    // Ensure strict case-insensitive deduplication
    const seen = new Set<string>();
    const deduplicatedGroups: string[] = [];
    savedGroups.forEach(g => {
      const normalized = g.toUpperCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduplicatedGroups.push(g);
      }
    });

    if (deduplicatedGroups.length !== savedGroups.length || cleanedGroups) {
      storageService.saveStageGroups(deduplicatedGroups);
      savedGroups = deduplicatedGroups;
    }
    
    // Auto-clean Thai names from parts on load
    let cleanedParts = false;
    masters.forEach(p => {
      if (p.stageName && /[\u0E00-\u0E7F]/.test(p.stageName)) {
        p.stageName = p.stageName.replace(/\s*\([\u0E00-\u0E7F\s\/]+\)/g, '').trim();
        cleanedParts = true;
      }
    });
    
    if (cleanedParts) {
      storageService.savePartMasters(masters);
    }

    setPartMasters(masters);
    setStageGroups(savedGroups);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Managed Stage Groups (strictly user-defined stage groups for the Manage tab)
  const managedStageGroups = useMemo(() => {
    return sortStagesInOrder(stageGroups);
  }, [stageGroups]);

  // All valid Stage Groups combined (strictly user-managed stage groups)
  const allStageGroups = useMemo(() => {
    return sortStagesInOrder(stageGroups);
  }, [stageGroups]);

  // Handler: Run Sync Check
  const handleRunSyncCheck = () => {
    const results = storageService.validateAndSyncStages();
    loadData();
    if (onSave) onSave();
    
    if (results.added === 0 && results.fixed === 0) {
      showToast('🛡️ ฐานข้อมูลปกติ: ไม่พบ Stage ที่ขาดหายหรือความสัมพันธ์ที่เสียหาย');
    } else {
      showToast(`⚙️ ซิงค์สำเร็จ: เพิ่ม ${results.added} Stage และแก้ไข ${results.fixed} รายการ`);
    }
  };

  if (!isOpen) return null;

  // Handler: Add new Stage Group
  const handleAddNewStage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStageInput.trim();
    if (!trimmed) return;

    if (managedStageGroups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
      showToast('⚠️ ชื่อ Stage นี้มีอยู่อยู่แล้วในระบบ');
      return;
    }

    const newGroups = [...stageGroups, trimmed];
    setStageGroups(newGroups);
    storageService.saveStageGroups(newGroups);
    setNewStageInput('');
    loadData();
    if (onSave) onSave();
    showToast(`✅ เพิ่ม Stage ใหม่ "${trimmed}" เรียบร้อย`);
  };

  // Handler: Start Editing Stage
  const startEditingStage = (stageName: string) => {
    setEditingStage(stageName);
    setEditStageInput(stageName);
  };

  const cancelEditingStage = () => {
    setEditingStage(null);
    setEditStageInput('');
  };

  const executeRenameStage = (oldName: string, newName: string) => {
    storageService.renameStageGroup(oldName, newName);
    loadData();
    if (onSave) onSave();
    setEditingStage(null);
    setEditStageInput('');
    setMergeTarget(null);
    showToast(`✅ เปลี่ยนชื่อ Stage เป็น "${newName}" สำเร็จ`);
  };

  // Handler: Save Edited Stage
  const saveEditedStage = (oldName: string) => {
    const newName = editStageInput.trim();
    if (!newName || !newName.length) {
      cancelEditingStage();
      return;
    }
    
    if (newName === oldName) {
      cancelEditingStage();
      return;
    }

    // Check if the new name already exists in managedStageGroups (excluding oldName, case-insensitive)
    const existing = managedStageGroups.find(
      g => g.trim().toLowerCase() === newName.toLowerCase() && g.trim().toLowerCase() !== oldName.toLowerCase()
    );

    if (existing) {
      setMergeTarget({ oldName, newName: existing });
      return;
    }

    executeRenameStage(oldName, newName);
  };

  // Handler: Trigger Delete Modal
  const handleDeleteStage = (stageName: string) => {
    setStageToDelete(stageName);
  };

  // Handler: Confirm Delete Stage from Modal
  const handleConfirmDeleteStage = (stageName: string) => {
    storageService.deleteStageGroup(stageName);
    loadData();
    if (onSave) onSave();
    setStageToDelete(null);
    showToast(`🗑️ ลบ Stage "${stageName}" เรียบร้อย`);
  };

  // Handler: Reassign Single Part Stage
  const handleReassignSinglePart = (partCode: string, partName: string, newStage: string) => {
    const list = storageService.getPartMasters();
    const idx = list.findIndex(p => p.partCode === partCode);
    if (idx >= 0) {
      list[idx].stageName = newStage;
      storageService.savePartMaster(list[idx]);
      loadData();
      if (onSave) onSave();
      showToast(`✅ ย้าย "${partName}" ไปยัง "${newStage}" สำเร็จ`);
    }
  };



  // Filtered Parts
  const filteredParts = partMasters.filter(p => {
    const currentStg = p.stageName || deriveLogicalStage(p.partName, p.stageName, stageGroups);
    if (stageFilter !== 'ALL' && currentStg !== stageFilter) {
      return false;
    }

    if (!partSearch.trim()) return true;
    const q = partSearch.toLowerCase();
    return (
      p.partName.toLowerCase().includes(q) ||
      currentStg.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-[#00FF00]/40 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[90vh] text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#1f2937] border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>⚙️ จัดกลุ่มและจัดการ Stage (Stage Grouping Management)</span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนด/แก้ไข Stage ให้กับชิ้นส่วนแม่พิมพ์แต่ละรายการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert Banner */}
        {toast && (
          <div className="bg-[#00FF00]/20 border-b border-[#00FF00] px-4 py-2 text-xs font-bold text-[#00FF00] flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00FF00]" />
              {toast}
            </span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex px-4 pt-3 bg-[#172131] border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('ASSIGN')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'ASSIGN' 
                ? 'bg-[#1f2937] text-[#00FF00] border-t border-x border-[#00FF00]/30' 
                : 'bg-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            <span>กำหนดพาร์ทลงสเตจ (Assign Parts)</span>
          </button>
          <button
            onClick={() => setActiveTab('MANAGE')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'MANAGE' 
                ? 'bg-[#1f2937] text-[#00FF00] border-t border-x border-[#00FF00]/30' 
                : 'bg-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>จัดการรายชื่อสเตจ (Manage Stages)</span>
          </button>
        </div>

        {activeTab === 'ASSIGN' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Control Bar: Quick Add & Auto Clean */}
            <div className="p-3 bg-[#172131] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-none">
              <form onSubmit={handleAddNewStage} className="flex flex-1 min-w-[300px] max-w-md items-center gap-2">
                <div className="relative flex-1">
                  <FolderPlus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ Stage ใหม่... (e.g. Special Punch)"
                    value={newStageInput}
                    onChange={e => setNewStageInput(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-[#00FF00]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#00FF00] hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่ม Stage</span>
                </button>
              </form>


            </div>

            {/* Search & Filter Bar */}
            <div className="p-3 bg-[#131d2e] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-none">
              <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อพาร์ท หรือสเตจ..."
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 pl-9 pr-3 py-1.5 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-[#00FF00]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <Filter className="w-3.5 h-3.5 text-[#00FF00]" />
                  <span className="text-slate-400 font-bold">กรองตาม Stage:</span>
                  <select
                    value={stageFilter}
                    onChange={e => setStageFilter(e.target.value)}
                    className="bg-[#111827] text-[#00FF00] border border-slate-700 px-2 py-1 text-xs font-bold rounded-lg focus:outline-none focus:border-[#00FF00] cursor-pointer"
                  >
                    <option value="ALL">ทุกสเตจ (All Stages)</option>
                    {allStageGroups.map(stg => (
                      <option key={stg} value={stg} className="bg-[#111827] text-white">
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  แสดง <strong className="text-[#00FF00]">{filteredParts.length}</strong> จาก {partMasters.length} รายการ
                </div>
              </div>
            </div>

            {/* Main Table Body - Exactly matching requested layout (No Part Code, No DWG No.) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-8 bg-[#0c121e]">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-[#1a2536] text-slate-300 border-b border-slate-700">
                    <th className="p-3 w-16 text-center font-bold">No</th>
                    <th className="p-3 font-bold text-white">ชื่อชิ้นส่วนแม่พิมพ์ (Part Name)</th>
                    <th className="p-3 w-80 font-bold text-[#00FF00]">Stage สเตจที่สังกัด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 font-sans">
                        ไม่พบรายการชิ้นส่วนตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part, idx) => {
                      const currentStg = deriveLogicalStage(part.partName, part.stageName, stageGroups);
                      return (
                        <tr key={part.partCode || idx} className="hover:bg-[#162234] transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-white text-sm">{part.partName}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold border bg-[#111111] uppercase whitespace-nowrap ${
                                currentStg.toUpperCase().includes('PIERCE') || currentStg.toUpperCase().includes('BURRING') ? 'border-[#FFCC00] text-[#FFCC00]' :
                                currentStg.toUpperCase().includes('IRONING') ? 'border-blue-400 text-blue-400' :
                                currentStg.toUpperCase().includes('LOUVER') || currentStg.toUpperCase().includes('SLIT') ? 'border-emerald-400 text-emerald-400' :
                                currentStg.toUpperCase().includes('REFLARE') || currentStg.toUpperCase().includes('REFLAIRE') ? 'border-purple-400 text-purple-400' :
                                currentStg.toUpperCase().includes('NOTCH') || currentStg.toUpperCase().includes('PUNCH') ? 'border-sky-400 text-sky-400' :
                                currentStg.toUpperCase().includes('CUT OFF') || currentStg.toUpperCase().includes('SIDE CUT') ? 'border-rose-400 text-rose-400' :
                                currentStg.toUpperCase().includes('FORMING') ? 'border-teal-400 text-teal-400' :
                                currentStg.toUpperCase().includes('PILOT') || currentStg.toUpperCase().includes('FEED') ? 'border-orange-400 text-orange-400' :
                                'border-slate-500 text-slate-300'
                              }`}>
                                {currentStg}
                              </span>
                              <select
                                value={currentStg}
                                onChange={e =>
                                  handleReassignSinglePart(part.partCode, part.partName, e.target.value)
                                }
                                className="flex-1 bg-[#111827] text-[#00FF00] border border-emerald-600/60 px-2 py-1 text-[11px] font-bold rounded-lg focus:outline-none focus:border-[#00FF00] cursor-pointer shadow-sm"
                              >
                                {allStageGroups.map(stg => (
                                  <option key={stg} value={stg} className="bg-[#111827] text-white">
                                    {stg}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col bg-[#0c121e]">
            <div className="p-4 bg-[#172131] border-b border-slate-800 flex-none">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">เพิ่ม Stage ใหม่</h3>
                <button
                  type="button"
                  onClick={handleRunSyncCheck}
                  className="px-3 py-1 bg-[#1a2536] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                  title="ตรวจสอบความถูกต้องของชื่อ Stage ทั้งระบบและซ่อมแซมความสัมพันธ์ที่เสียหาย"
                >
                  <Database className="w-3.5 h-3.5 text-[#00FF00] group-hover:scale-110 transition-transform" />
                  <span>SYNCHRONIZATION CHECK</span>
                </button>
              </div>
              <form onSubmit={handleAddNewStage} className="flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <FolderPlus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ Stage ใหม่... (e.g. Stage 11: Special Punch)"
                    value={newStageInput}
                    onChange={e => setNewStageInput(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 pl-9 pr-3 py-2 text-xs text-white rounded-xl placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#00FF00]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00FF00] hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่ม</span>
                </button>
              </form>
            </div>

            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <div className="bg-[#172131] rounded-xl border border-slate-800 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-[#1a2536] flex-none">
                  <h3 className="text-sm font-bold text-white">รายชื่อ Stage ทั้งหมด</h3>
                </div>
                <ul className="divide-y divide-slate-800/80 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 pb-8">
                  {managedStageGroups.map((stg, idx) => (
                    <li key={`${stg}-${idx}`} className="p-3 flex items-center justify-between hover:bg-[#1a2536] transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                        <span className="text-slate-500 font-mono text-xs w-6 text-right flex-none">{idx + 1}.</span>
                        {editingStage === stg ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editStageInput}
                              onChange={e => setEditStageInput(e.target.value)}
                              className="bg-[#111827] border border-[#00FF00] text-[#00FF00] px-3 py-1.5 text-sm font-bold rounded-lg focus:outline-none w-full shadow-inner"
                              autoFocus
                              placeholder="ระบุชื่อ Stage..."
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEditedStage(stg);
                                if (e.key === 'Escape') cancelEditingStage();
                              }}
                            />
                          </div>
                        ) : (
                          <span className={`inline-block px-2.5 py-1 text-xs font-bold border bg-[#111111] uppercase tracking-wider rounded-md ${
                            stg.toUpperCase().includes('PIERCE') || stg.toUpperCase().includes('BURRING') ? 'border-[#FFCC00] text-[#FFCC00]' :
                            stg.toUpperCase().includes('IRONING') ? 'border-blue-400 text-blue-400' :
                            stg.toUpperCase().includes('LOUVER') || stg.toUpperCase().includes('SLIT') ? 'border-emerald-400 text-emerald-400' :
                            stg.toUpperCase().includes('REFLARE') || stg.toUpperCase().includes('REFLAIRE') ? 'border-purple-400 text-purple-400' :
                            stg.toUpperCase().includes('NOTCH') || stg.toUpperCase().includes('PUNCH') ? 'border-sky-400 text-sky-400' :
                            stg.toUpperCase().includes('CUT OFF') || stg.toUpperCase().includes('SIDE CUT') ? 'border-rose-400 text-rose-400' :
                            stg.toUpperCase().includes('FORMING') ? 'border-teal-400 text-teal-400' :
                            stg.toUpperCase().includes('PILOT') || stg.toUpperCase().includes('FEED') ? 'border-orange-400 text-orange-400' :
                            'border-slate-500 text-slate-300'
                          }`}>
                            {stg}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-none">
                        {editingStage === stg ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEditedStage(stg)}
                              className="px-2.5 py-1 text-black bg-[#00FF00] hover:bg-[#00FF00]/80 rounded-lg transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer shadow"
                              title="บันทึก (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>บันทึก</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingStage}
                              className="px-2.5 py-1 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer"
                              title="ยกเลิก (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ยกเลิก</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditingStage(stg)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขชื่อ Stage"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(stg)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                              title="ลบ Stage"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#1f2937] border-t border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            จำนวน Stage ทั้งหมด: <strong className="text-[#00FF00]">{managedStageGroups.length}</strong> กลุ่ม | ชิ้นส่วนทั้งหมด: <strong className="text-white">{partMasters.length}</strong> รายการ
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#00FF00] hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            เสร็จสิ้น (Done)
          </button>
        </div>

        {/* Delete Confirmation Modal (Replaces window.confirm) */}
        <DeleteConfirmationModal
          isOpen={!!stageToDelete}
          onClose={() => setStageToDelete(null)}
          onConfirm={() => {
            if (stageToDelete) {
              handleConfirmDeleteStage(stageToDelete);
            }
          }}
          title="ยืนยันการลบ Stage (Delete Stage Group)"
          itemName={stageToDelete ? `Stage: ${stageToDelete}` : ''}
          itemDetails="ชิ้นส่วนและสเปกแม่พิมพ์ที่อยู่ในกลุ่มนี้จะถูกปรับย้ายไปยังสเตจเริ่มต้นอัตโนมัติ"
          warningText="การลบสเตจนี้จะมีผลต่อการแสดงผลของ Layout, Matrix และ Part Master ทั้งหมดทันที"
          confirmButtonText="ยืนยันการลบ Stage"
          cancelButtonText="ยกเลิก"
        />

        {/* Merge Confirmation Modal (Replaces window.confirm) */}
        {mergeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0F172A] border border-blue-900/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleUp">
              <div className="bg-blue-950/40 border-b border-blue-900/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-thai">ยืนยันการรวม Stage (Merge Stages)</h3>
                    <p className="text-[11px] text-blue-300 font-thai">Duplicate Stage Detected</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMergeTarget(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-300 font-thai leading-relaxed">
                  ชื่อ Stage <strong className="text-[#00FF00]">"{mergeTarget.newName}"</strong> มีอยู่ในระบบอยู่แล้ว
                </p>
                <div className="p-3 bg-[#172131] border border-slate-700 rounded-lg text-xs text-slate-300">
                  คุณต้องการรวม (Merge) รายการพาร์ททั้งหมดจากสเตจ <span className="text-rose-400 font-bold font-mono">"{mergeTarget.oldName}"</span> เข้ากับสเตจ <span className="text-[#00FF00] font-bold font-mono">"{mergeTarget.newName}"</span> ใช่หรือไม่?
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMergeTarget(null)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      executeRenameStage(mergeTarget.oldName, mergeTarget.newName);
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#00FF00] hover:bg-[#00FF00]/80 transition-colors cursor-pointer"
                  >
                    ยืนยันรวม Stage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
