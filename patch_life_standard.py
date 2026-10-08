import sys

content = """import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { PartLifeStandard, FinMaterial, TubeDiameter, FinType, ProductionLineId, LINE_INFO_MAP } from '../types';
import { storageService } from '../services/storageService';
import { formatShots, formatThb, generateCompositeKey } from '../services/calculationService';
import { ResizableReorderableTable } from '../components/common/ResizableReorderableTable';

export const PartLifeStandardSetupView: React.FC = () => {
  const [standards, setStandards] = useState<PartLifeStandard[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [selectedTube, setSelectedTube] = useState<string>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Maps standard.id -> { field: value }
  const [editValues, setEditValues] = useState<Record<string, Record<string, number | boolean>>>({});

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
    const currentVals: Record<string, Record<string, number | boolean>> = {};
    standards.forEach(std => {
      currentVals[std.id] = {
        lifeLimitShots: std.lifeLimitShots,
        regrindDepthPerTime: std.regrindDepthPerTime ?? (parseFloat(std.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20),
        maxTotalGrindingLimit: std.maxTotalGrindingLimit ?? std.regrindStandard?.totalRegrindMm ?? 3.00,
        standardShimThickness: std.standardShimThickness ?? 0.20,
        disposeAfterUse: !!std.regrindStandard?.disposeAfterUse
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
        std.lifeLimitShots = updates.lifeLimitShots as number;
        std.regrindDepthPerTime = updates.regrindDepthPerTime as number;
        std.maxTotalGrindingLimit = updates.maxTotalGrindingLimit as number;
        std.standardShimThickness = updates.standardShimThickness as number;
        
        if (std.regrindStandard) {
          std.regrindStandard.disposeAfterUse = updates.disposeAfterUse as boolean;
          std.regrindStandard.oneTimeRegrindMm = std.regrindDepthPerTime.toFixed(2);
          std.regrindStandard.totalRegrindMm = std.maxTotalGrindingLimit;
          std.regrindStandard.maxTotalGrindingLimit = std.maxTotalGrindingLimit;
          std.regrindStandard.regrindDepthPerTime = std.regrindDepthPerTime;
          std.regrindStandard.standardShimThickness = std.standardShimThickness;
        }
        storageService.saveLifeStandard(std);
      }
    });
    setIsEditing(false);
    reload();
  };

  const handleValueChange = (stdId: string, field: string, value: string | boolean) => {
    setEditValues(prev => {
      const current = prev[stdId] || {};
      return {
        ...prev,
        [stdId]: {
          ...current,
          [field]: typeof value === 'boolean' ? value : (value === '' ? 0 : parseFloat(value as string) || 0)
        }
      };
    });
  };

  const filtered = standards.filter(s => {
    const matchSearch = 
      s.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.configKey.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.stagePunchDie && s.stagePunchDie.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMat = selectedMaterial === 'ALL' || s.configKey.material.toUpperCase() === selectedMaterial.toUpperCase();
    const matchTube = selectedTube === 'ALL' || s.configKey.tubeSize === selectedTube;
    return matchSearch && matchMat && matchTube;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-[#0F172A] border border-slate-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Fin Die Part Life Standard Matrix
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            กำหนดเกณฑ์อายุการใช้งานและพารามิเตอร์การเจียร (สามารถแก้ไขข้อมูลในตารางได้โดยตรง)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search part name / code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white text-sm focus:outline-none w-40"
            />
          </div>
          
          <select 
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-thai"
          >
            <option value="ALL">All Materials</option>
            <option value="PCM">PCM</option>
            <option value="GOLD">GOLD (Bare Al)</option>
          </select>
          
          <select 
            value={selectedTube}
            onChange={(e) => setSelectedTube(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-thai"
          >
            <option value="ALL">All Tubes</option>
            <option value="Ø5">Ø5</option>
            <option value="Ø7">Ø7</option>
          </select>

          {isEditing ? (
            <div className="flex items-center gap-2 ml-4">
              <button onClick={handleCancelClick} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveClick} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold transition-colors">
                Save Matrix
              </button>
            </div>
          ) : (
            <button onClick={handleEditClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold transition-colors ml-4">
              Edit Matrix
            </button>
          )}
        </div>
      </div>

      {/* Main Matrix Container */}
      <div className="bg-[#1E293B] rounded-lg border border-slate-700 p-5 shadow-lg">
        <ResizableReorderableTable<PartLifeStandard>
          data={filtered}
          keyExtractor={(s) => s.id}
          emptyMessage="ไม่พบข้อมูลเกณฑ์มาตรฐานอายุการใช้งาน"
          columns={[
            {
              id: 'part',
              label: 'STAGE / PART',
              width: 170,
              render: (s) => (
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-100">{s.partName}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">{s.configKey.partCode}</div>
                  <div className="text-[10px] text-slate-400">{s.stagePunchDie || s.partName}</div>
                </div>
              )
            },
            {
              id: 'material',
              label: 'MAT',
              width: 90,
              align: 'center',
              render: (s) => (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  s.configKey.material === 'PCM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  s.configKey.material === 'GOLD' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  'bg-slate-700 text-slate-200'
                }`}>
                  {s.configKey.material}
                </span>
              )
            },
            {
              id: 'tubeSize',
              label: 'TUBE',
              width: 80,
              align: 'center',
              render: (s) => (
                <span className="text-cyan-300 font-bold font-mono text-xs">
                  {s.configKey.tubeSize}
                </span>
              )
            },
            {
              id: 'lifeLimitShots',
              label: 'LIFE LIMIT (SHOTS)',
              width: 140,
              align: 'right',
              render: (s) => isEditing ? (
                <input
                  type="number"
                  value={editValues[s.id]?.lifeLimitShots as number}
                  onChange={(e) => handleValueChange(s.id, 'lifeLimitShots', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono font-bold text-green-400 text-xs">
                  {formatShots(s.lifeLimitShots)}
                </span>
              )
            },
            {
              id: 'maxRegrind',
              label: 'MAX REGRIND (MM)',
              width: 130,
              align: 'right',
              render: (s) => isEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editValues[s.id]?.maxTotalGrindingLimit as number}
                  onChange={(e) => handleValueChange(s.id, 'maxTotalGrindingLimit', e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono text-slate-300 text-xs">
                  {(s.maxTotalGrindingLimit ?? s.regrindStandard?.totalRegrindMm ?? 3.0).toFixed(2)}
                </span>
              )
            },
            {
              id: 'regrindDepth',
              label: 'DEPTH/TIME (MM)',
              width: 130,
              align: 'right',
              render: (s) => isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={editValues[s.id]?.regrindDepthPerTime as number}
                  onChange={(e) => handleValueChange(s.id, 'regrindDepthPerTime', e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono focus:border-cyan-400 focus:outline-none"
                />
              ) : (
                <span className="font-mono text-slate-300 text-xs">
                  {(s.regrindDepthPerTime ?? parseFloat(s.regrindStandard?.oneTimeRegrindMm || '0.20') || 0.20).toFixed(2)}
                </span>
              )
            },
            {
              id: 'shimThickness',
              label: 'SHIM (MM)',
              width: 110,
              align: 'right',
              render: (s) => isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={editValues[s.id]?.standardShimThickness as number}
                  onChange={(e) => handleValueChange(s.id, 'standardShimThickness', e.target.value)}
                  className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white font-mono focus:border-cyan-400 focus:outline-none"
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
              width: 110,
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
            }
          ]}
        />
      </div>
    </div>
  );
};

export const InstallQuantitySetupView: React.FC = () => {
  const [lines, setLines] = useState<any[]>([]);
  const [partMasters, setPartMasters] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const loadAll = () => {
      setLines(storageService.getLineConfigs());
      setPartMasters(storageService.getPartMasters());
    };
    loadAll();
    const unsub = storageService.subscribe(loadAll);
    return () => unsub();
  }, []);

  const lineIds = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5', 'E6'];

  interface InstallMatrixRow {
    no: number;
    part: string;
    code: string;
    total: number;
    [key: string]: string | number;
  }

  // Dynamically build matrix from part masters
  const matrixParts = partMasters.map((pm, index) => ({
    no: index + 1,
    part: pm.partName,
    code: pm.partCode
  }));

  const getCellKey = (partCode: string, lineId: string) => `${partCode}_${lineId}`;

  const installMatrix: InstallMatrixRow[] = matrixParts.map(mp => {
    const row: InstallMatrixRow = { ...mp, total: 0 };
    let total = 0;
    lineIds.forEach(lId => {
      let qty = 0;
      const lineConfig = lines.find(l => l.lineId === lId);
      if (lineConfig && lineConfig.installedPartQuantities) {
        qty = lineConfig.installedPartQuantities[mp.code] || 0;
      }
      // If we are editing, use editValues if it exists
      if (isEditing) {
        qty = editValues[getCellKey(mp.code, lId)] !== undefined ? editValues[getCellKey(mp.code, lId)] : qty;
      }
      row[lId] = qty;
      total += qty;
    });
    row.total = total;
    return row;
  });

  const grandTotal = installMatrix.reduce((sum, item) => sum + item.total, 0);

  const handleEditClick = () => {
    // Populate edit state
    const currentValues: Record<string, number> = {};
    matrixParts.forEach(mp => {
      lineIds.forEach(lId => {
        const lineConfig = lines.find(l => l.lineId === lId);
        if (lineConfig && lineConfig.installedPartQuantities) {
          currentValues[getCellKey(mp.code, lId)] = lineConfig.installedPartQuantities[mp.code] || 0;
        }
      });
    });
    setEditValues(currentValues);
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    // Build updates array
    const updates = Object.keys(editValues).map(key => {
      const [partCode, lineId] = key.split('_');
      return { lineId, partCode, installQty: editValues[key] };
    });
    
    // Save via storage service
    storageService.updateInstallQuantities(updates);
    
    // Reload local state
    setLines(storageService.getLineConfigs());
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleCellValueChange = (partCode: string, lineId: string, value: string) => {
    const num = parseInt(value, 10);
    setEditValues(prev => ({
      ...prev,
      [getCellKey(partCode, lineId)]: isNaN(num) ? 0 : num
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F172A] border border-slate-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Fin Die Installed Part Quantity Matrix
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            ตารางจำนวนชิ้นส่วนที่ติดตั้งในแม่พิมพ์แต่ละสายการผลิต (สามารถแก้ไขจำนวนติดตั้งต่อไลน์ได้)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#1E293B] px-4 py-2 rounded border border-slate-700 font-mono text-right">
            <div className="text-[10px] text-slate-400 font-bold">TOTAL ACTIVE TOOLING</div>
            <div className="text-base font-bold text-cyan-300">{grandTotal.toLocaleString()} EA (All Lines)</div>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button onClick={handleCancelClick} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveClick} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold transition-colors">
                Save Matrix
              </button>
            </div>
          ) : (
            <button onClick={handleEditClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold transition-colors">
              Edit Matrix
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-5 shadow-lg">
        <ResizableReorderableTable
          data={installMatrix}
          keyExtractor={(row) => row.no.toString()}
          emptyMessage="ไม่พบข้อมูล Install Matrix"
          columns={[
            {
              id: 'no',
              label: 'No.',
              width: 50,
              align: 'center',
              render: (row) => <span className="text-slate-500 font-bold">{row.no}</span>
            },
            {
              id: 'part',
              label: 'STAGE PUNCH / DIE',
              width: 180,
              render: (row) => <span className="font-semibold text-slate-100">{row.part}</span>
            },
            {
              id: 'code',
              label: 'PART CODE',
              width: 110,
              render: (row) => <span className="text-slate-400 font-mono">{row.code}</span>
            },
            ...lineIds.map(lId => ({
              id: lId,
              label: lId.startsWith('E3-') ? `E3 (${LINE_INFO_MAP[lId]?.shortTag || lId})` : lId,
              width: 85,
              align: 'center' as const,
              render: (row: any) => (
                isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={row[lId]}
                    onChange={(e) => handleCellValueChange(row.code, lId, e.target.value)}
                    className="w-14 sm:w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                ) : (
                  <span className="text-slate-300 font-mono">{row[lId]}</span>
                )
              )
            })),
            {
              id: 'total',
              label: 'TOTAL (EA)',
              width: 110,
              align: 'right',
              render: (row) => <span className="font-black text-emerald-400 font-mono">{row.total.toLocaleString()}</span>
            }
          ]}
        />
      </div>
    </div>
  );
};
"""

with open('src/views/PartLifeStandardSetupView.tsx', 'w') as f:
    f.write(content)

