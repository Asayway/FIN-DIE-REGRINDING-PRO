import sys

content = """import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { PartMaster, PartCategory, TubeSizeCompat } from '../types';
import { storageService } from '../services/storageService';
import { formatThb } from '../services/calculationService';
import { ResizableReorderableTable } from '../components/common/ResizableReorderableTable';

export const PartMasterView: React.FC = () => {
  const [parts, setParts] = useState<PartMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PartCategory | 'ALL'>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, Partial<PartMaster>>>({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState<PartMaster>({
    partCode: '',
    partName: '',
    partNameTh: '',
    stageName: '',
    category: 'PUNCH',
    drawingNumber: '',
    unitCostThb: 0,
    tubeSizeCompat: 'BOTH'
  });
  
  const [feedback, setFeedback] = useState<{type: 'success'|'error', message: string} | null>(null);

  const loadData = () => {
    setParts(storageService.getPartMasters());
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, []);

  const filteredParts = parts.filter(p => {
    const matchesSearch = 
      p.partCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.partNameTh && p.partNameTh.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.drawingNumber && p.drawingNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    
    return matchesSearch && matchesCat;
  });

  const handleEditClick = () => {
    const initialEdits: Record<string, Partial<PartMaster>> = {};
    parts.forEach(p => {
      initialEdits[p.partCode] = { ...p };
    });
    setEditValues(initialEdits);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleSaveMatrix = () => {
    // Collect all edited parts
    const updatedParts = parts.map(p => {
      if (editValues[p.partCode]) {
        return { ...p, ...editValues[p.partCode] } as PartMaster;
      }
      return p;
    });
    
    // Save all to storage (we can just replace or save one by one)
    updatedParts.forEach(p => storageService.savePartMaster(p));
    
    setFeedback({ type: 'success', message: 'Matrix changes saved successfully' });
    setTimeout(() => setFeedback(null), 3000);
    setIsEditing(false);
    loadData();
  };

  const handleValueChange = (partCode: string, field: keyof PartMaster, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [partCode]: {
        ...prev[partCode],
        [field]: value
      }
    }));
  };

  const handleDelete = (partCode: string) => {
    if (window.confirm(`Are you sure you want to delete ${partCode}?`)) {
      storageService.deletePartMaster(partCode);
      setFeedback({ type: 'success', message: `Deleted ${partCode}` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.partCode || !newPart.partName) {
      setFeedback({ type: 'error', message: 'Part Code and Name are required' });
      return;
    }
    
    // check if exists
    if (parts.some(p => p.partCode === newPart.partCode)) {
      setFeedback({ type: 'error', message: `Part Code ${newPart.partCode} already exists` });
      return;
    }
    
    storageService.savePartMaster(newPart);
    setShowAddModal(false);
    setNewPart({
      partCode: '',
      partName: '',
      partNameTh: '',
      stageName: '',
      category: 'PUNCH',
      drawingNumber: '',
      unitCostThb: 0,
      tubeSizeCompat: 'BOTH'
    });
    setFeedback({ type: 'success', message: 'New part added successfully' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const stats = {
    total: parts.length,
    punch: parts.filter(p => p.category === 'PUNCH').length,
    die: parts.filter(p => p.category === 'DIE').length,
    blade: parts.filter(p => p.category === 'BLADE').length,
    pin: parts.filter(p => p.category === 'PIN').length,
    corner: parts.filter(p => p.category === 'CORNER_CUT').length,
    center: parts.filter(p => p.category === 'CENTER_PUNCH').length,
    other: parts.filter(p => p.category === 'OTHER').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F172A] border border-slate-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Fin Die Part Master Catalog (ตั้งค่าชื่อและรหัสชิ้นส่วน)
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            จัดการฐานข้อมูลชื่อชิ้นส่วนแม่พิมพ์ฟินเพรส กำหนด Drawing Number, Stage, Tool Steel Material, ราคา และการรองรับขนาดท่อ
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search code, name, drawing..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white text-sm focus:outline-none w-48 font-mono"
            />
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button onClick={handleCancelClick} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveMatrix} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold transition-colors">
                Save Matrix
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={handleEditClick} 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold transition-colors"
              >
                Edit Matrix
              </button>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-sm shadow-lg shadow-cyan-900/50 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Part</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded flex items-center gap-2 text-sm font-bold ${
          feedback.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400' : 
          'bg-rose-950/80 border border-rose-800 text-rose-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'ALL' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
        >
          ALL ({stats.total})
        </button>
        <button onClick={() => setSelectedCategory('PUNCH')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'PUNCH' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          PUNCH ({stats.punch})
        </button>
        <button onClick={() => setSelectedCategory('DIE')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'DIE' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          DIE ({stats.die})
        </button>
        <button onClick={() => setSelectedCategory('BLADE')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'BLADE' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          BLADE ({stats.blade})
        </button>
        <button onClick={() => setSelectedCategory('PIN')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'PIN' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          PIN ({stats.pin})
        </button>
        <button onClick={() => setSelectedCategory('CORNER_CUT')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'CORNER_CUT' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          CORNER_CUT ({stats.corner})
        </button>
        <button onClick={() => setSelectedCategory('CENTER_PUNCH')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'CENTER_PUNCH' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          CENTER_PUNCH ({stats.center})
        </button>
        <button onClick={() => setSelectedCategory('OTHER')} className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors ${selectedCategory === 'OTHER' ? 'bg-cyan-900 border border-cyan-500 text-cyan-300' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
          OTHER ({stats.other})
        </button>
      </div>

      <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-5 shadow-lg">
        <ResizableReorderableTable<PartMaster>
          data={filteredParts}
          keyExtractor={(p) => p.partCode}
          emptyMessage="No part master records found."
          columns={[
            {
              id: 'partCode',
              label: 'PART CODE',
              width: 140,
              render: (p) => (
                <span className="font-bold text-cyan-300">{p.partCode}</span>
              )
            },
            {
              id: 'partName',
              label: 'PART NAME & THAI NAME',
              width: 250,
              render: (p) => isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={editValues[p.partCode]?.partName || ''}
                    onChange={e => handleValueChange(p.partCode, 'partName', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="English Name"
                  />
                  <input
                    type="text"
                    value={editValues[p.partCode]?.partNameTh || ''}
                    onChange={e => handleValueChange(p.partCode, 'partNameTh', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 font-thai focus:border-cyan-400 focus:outline-none"
                    placeholder="Thai Name"
                  />
                </div>
              ) : (
                <div>
                  <div className="font-bold text-slate-100 font-sans">{p.partName}</div>
                  {p.partNameTh && <div className="text-[11px] text-slate-400 font-thai">{p.partNameTh}</div>}
                </div>
              )
            },
            {
              id: 'stageName',
              label: 'STAGE',
              width: 150,
              render: (p) => isEditing ? (
                <input
                  type="text"
                  value={editValues[p.partCode]?.stageName || ''}
                  onChange={e => handleValueChange(p.partCode, 'stageName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="text-slate-300">{p.stageName || '-'}</span>
              )
            },
            {
              id: 'category',
              label: 'CATEGORY',
              width: 120,
              render: (p) => isEditing ? (
                <select
                  value={editValues[p.partCode]?.category || 'PUNCH'}
                  onChange={e => handleValueChange(p.partCode, 'category', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="PUNCH">PUNCH</option>
                  <option value="DIE">DIE</option>
                  <option value="BLADE">BLADE</option>
                  <option value="PIN">PIN</option>
                  <option value="CORNER_CUT">CORNER_CUT</option>
                  <option value="CENTER_PUNCH">CENTER_PUNCH</option>
                  <option value="OTHER">OTHER</option>
                </select>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  {p.category}
                </span>
              )
            },
            {
              id: 'drawing',
              label: 'DRAWING NO.',
              width: 150,
              render: (p) => isEditing ? (
                <input
                  type="text"
                  value={editValues[p.partCode]?.drawingNumber || ''}
                  onChange={e => handleValueChange(p.partCode, 'drawingNumber', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="text-slate-400">{p.drawingNumber || '-'}</span>
              )
            },
            {
              id: 'unitCost',
              label: 'UNIT COST (THB)',
              width: 130,
              align: 'right',
              render: (p) => isEditing ? (
                <input
                  type="number"
                  value={editValues[p.partCode]?.unitCostThb || 0}
                  onChange={e => handleValueChange(p.partCode, 'unitCostThb', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-emerald-400 text-right focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="text-emerald-400 font-bold">{formatThb(p.unitCostThb)}</span>
              )
            },
            {
              id: 'tubeCompat',
              label: 'TUBE COMPAT',
              width: 120,
              align: 'center',
              render: (p) => isEditing ? (
                <select
                  value={editValues[p.partCode]?.tubeSizeCompat || 'BOTH'}
                  onChange={e => handleValueChange(p.partCode, 'tubeSizeCompat', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-cyan-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Ø5">Ø5</option>
                  <option value="Ø7">Ø7</option>
                  <option value="Ø9.52">Ø9.52</option>
                  <option value="BOTH">BOTH</option>
                </select>
              ) : (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">
                  {p.tubeSizeCompat}
                </span>
              )
            },
            {
              id: 'action',
              label: 'ACTION',
              width: 80,
              align: 'center',
              render: (p) => (
                <button
                  type="button"
                  onClick={() => handleDelete(p.partCode)}
                  disabled={isEditing}
                  className="p-1.5 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 transition-colors disabled:opacity-50"
                  title="Delete Part"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            }
          ]}
        />
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Add New Tooling Part Master</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPart} className="space-y-3.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">PART CODE *</label>
                  <input
                    type="text"
                    value={newPart.partCode}
                    onChange={e => setNewPart({ ...newPart, partCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. PT-BP-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">CATEGORY *</label>
                  <select
                    value={newPart.category}
                    onChange={e => setNewPart({ ...newPart, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="PUNCH">PUNCH</option>
                    <option value="DIE">DIE</option>
                    <option value="BLADE">BLADE</option>
                    <option value="PIN">PIN</option>
                    <option value="CORNER_CUT">CORNER_CUT</option>
                    <option value="CENTER_PUNCH">CENTER_PUNCH</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">PART NAME (ENGLISH) *</label>
                <input
                  type="text"
                  value={newPart.partName}
                  onChange={e => setNewPart({ ...newPart, partName: e.target.value })}
                  placeholder="e.g. Bucking Punch, Louver Blade, etc."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-sans font-semibold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold font-thai">ชื่อชิ้นส่วนภาษาไทย (THAI NAME)</label>
                <input
                  type="text"
                  value={newPart.partNameTh || ''}
                  onChange={e => setNewPart({ ...newPart, partNameTh: e.target.value })}
                  placeholder="เช่น พันช์ขึ้นรูปแถวแรก, ใบมีดตัดซอย ฯลฯ"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-thai focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">STAGE NAME</label>
                  <input
                    type="text"
                    value={newPart.stageName}
                    onChange={e => setNewPart({ ...newPart, stageName: e.target.value })}
                    placeholder="e.g. Piercing Stage"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">DRAWING NUMBER</label>
                  <input
                    type="text"
                    value={newPart.drawingNumber || ''}
                    onChange={e => setNewPart({ ...newPart, drawingNumber: e.target.value })}
                    placeholder="e.g. DWG-FD-07-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">UNIT COST (THB)</label>
                  <input
                    type="number"
                    value={newPart.unitCostThb}
                    onChange={e => setNewPart({ ...newPart, unitCostThb: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">TUBE COMPATIBILITY</label>
                  <select
                    value={newPart.tubeSizeCompat}
                    onChange={e => setNewPart({ ...newPart, tubeSizeCompat: e.target.value as TubeSizeCompat })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Ø5">Ø5</option>
                    <option value="Ø7">Ø7</option>
                    <option value="Ø9.52">Ø9.52</option>
                    <option value="BOTH">BOTH (All Tube Sizes)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-sans text-xs shadow-lg shadow-cyan-900/50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to Part Master Catalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
"""

with open('src/views/PartMasterView.tsx', 'w') as f:
    f.write(content)

