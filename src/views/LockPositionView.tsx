import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Layers,
  Wrench,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  History,
  CheckSquare,
  Square,
  AlertOctagon,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  X
} from 'lucide-react';
import {
  ProductionLineId,
  PositionLockRecord,
  PositionLockStatus,
  LineLiveMonitoringData
} from '../types';
import { storageService } from '../services/storageService';
import { formatShots } from '../services/calculationService';
import { LineFilterSelector } from '../components/common/LineFilterSelector';

interface LockPositionViewProps {
  initialLineId?: ProductionLineId;
}

const ALL_LINES: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

const LOCK_TYPE_INFO: Record<PositionLockStatus, { label: string; labelTh: string; color: string; bg: string; border: string }> = {
  UNLOCKED: {
    label: 'UNLOCKED / ACTIVE',
    labelTh: 'ปกติ / ใช้งาน',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-700/80'
  },
  LOCKED_MAINTENANCE: {
    label: 'LOCKED - MAINTENANCE',
    labelTh: 'ล็อคซ่อมบำรุง / รอเจียร์',
    color: 'text-red-400',
    bg: 'bg-red-950/70',
    border: 'border-red-600/90'
  },
  LOCKED_BYPASS: {
    label: 'LOCKED - BYPASS PIN',
    labelTh: 'ล็อคบายพาส / สวมพินดัมมี่',
    color: 'text-amber-400',
    bg: 'bg-amber-950/70',
    border: 'border-amber-600/90'
  },
  LOCKED_TRIAL: {
    label: 'LOCKED - TRIAL RUN',
    labelTh: 'ล็อคทดสอบคอยล์ตัวอย่าง',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/70',
    border: 'border-cyan-600/90'
  },
  LOCKED_CALIBRATION: {
    label: 'LOCKED - CALIBRATION',
    labelTh: 'ล็อคตั้งระยะชิม/เคลียแรนซ์',
    color: 'text-purple-400',
    bg: 'bg-purple-950/70',
    border: 'border-purple-600/90'
  },
  LOCKED_HOLD: {
    label: 'LOCKED - QC HOLD',
    labelTh: 'ล็อคอายัดตรวจสอบคุณภาพ',
    color: 'text-rose-400',
    bg: 'bg-rose-950/70',
    border: 'border-rose-600/90'
  }
};

const COMMON_LOCK_REASONS = [
  'Punch tip chipped - Bypassed for regrinding shift 2',
  'Die clearance tolerance out of spec (>0.015mm)',
  'Trial run with coated PCM 0.10mm coil - Counter frozen',
  'Shim plate adjustment in progress (Target 0.20mm)',
  'Burr height inspection on fin collar edge',
  'Waiting for new spare punch arrival from tooling warehouse',
  'Station isolated with blanking guide pin',
  'Periodic engineering maintenance lockout'
];

export const LockPositionView: React.FC<LockPositionViewProps> = ({ initialLineId = 'E1' }) => {
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>(initialLineId);
  const [positionLocks, setPositionLocks] = useState<PositionLockRecord[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  
  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal State for Single / Batch Editing
  const [activeEditingItem, setActiveEditingItem] = useState<PositionLockRecord | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [modalLockType, setModalLockType] = useState<PositionLockStatus>('LOCKED_MAINTENANCE');
  const [modalReason, setModalReason] = useState<string>(COMMON_LOCK_REASONS[0]);
  const [modalCustomReason, setModalCustomReason] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalFreezeShot, setModalFreezeShot] = useState<boolean>(true);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const currentUser = storageService.getCurrentUser();
  const activeConfig = storageService.getLineConfigs().find(c => c.lineId === selectedLineId) || null;

  const loadData = () => {
    const data = storageService.getPositionLocks(selectedLineId);
    setPositionLocks(data);
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]);
  }, [selectedLineId]);

  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [selectedLineId]);

  // Distinct Stages for Filter Dropdown
  const stagesList = useMemo(() => {
    const set = new Set(positionLocks.map(p => p.stageName));
    return ['ALL', ...Array.from(set)];
  }, [positionLocks]);

  // Filtered Positions
  const filteredPositions = useMemo(() => {
    return positionLocks.filter(p => {
      if (selectedStage !== 'ALL' && p.stageName !== selectedStage) return false;
      if (statusFilter === 'LOCKED' && !p.isLocked) return false;
      if (statusFilter === 'UNLOCKED' && p.isLocked) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.positionId.toLowerCase().includes(q) ||
          p.partCode.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q) ||
          p.stageName.toLowerCase().includes(q) ||
          (p.lockReason && p.lockReason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [positionLocks, selectedStage, statusFilter, searchQuery]);

  // Grouped by Stage for Grid Display
  const groupedByStage = useMemo(() => {
    const groups: Record<string, PositionLockRecord[]> = {};
    filteredPositions.forEach(pos => {
      if (!groups[pos.stageName]) {
        groups[pos.stageName] = [];
      }
      groups[pos.stageName].push(pos);
    });
    return groups;
  }, [filteredPositions]);

  // Statistics
  const stats = useMemo(() => {
    const total = positionLocks.length;
    const locked = positionLocks.filter(p => p.isLocked).length;
    const unlocked = total - locked;
    const maintenance = positionLocks.filter(p => p.lockType === 'LOCKED_MAINTENANCE').length;
    const bypass = positionLocks.filter(p => p.lockType === 'LOCKED_BYPASS').length;
    const trial = positionLocks.filter(p => p.lockType === 'LOCKED_TRIAL').length;
    const frozenCount = positionLocks.filter(p => p.freezeShotCount).length;
    return { total, locked, unlocked, maintenance, bypass, trial, frozenCount };
  }, [positionLocks]);

  // Toggle Single Lock Quick Action
  const handleQuickToggle = (pos: PositionLockRecord) => {
    if (pos.isLocked) {
      storageService.savePositionLock(pos.id, false, 'UNLOCKED', '', '');
    } else {
      setActiveEditingItem(pos);
      setModalLockType('LOCKED_MAINTENANCE');
      setModalReason(COMMON_LOCK_REASONS[0]);
      setModalCustomReason('');
      setModalNotes('');
      setModalFreezeShot(true);
    }
  };

  // Save Single Lock Edit
  const handleSaveSingleLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditingItem) return;
    const finalReason = modalCustomReason.trim() || modalReason;
    storageService.savePositionLock(
      activeEditingItem.id,
      true,
      modalLockType,
      finalReason,
      modalNotes,
      modalFreezeShot
    );
    setActiveEditingItem(null);
  };

  // Batch Lock Selected
  const handleBatchLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    const finalReason = modalCustomReason.trim() || modalReason;
    storageService.batchUpdatePositionLocks(
      selectedIds,
      true,
      modalLockType,
      finalReason,
      modalNotes
    );
    setIsBatchModalOpen(false);
    setSelectedIds([]);
  };

  // Batch Unlock Selected
  const handleBatchUnlock = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to unlock all ${selectedIds.length} selected positions?`)) {
      storageService.batchUpdatePositionLocks(
        selectedIds,
        false,
        'UNLOCKED',
        'Batch unlocked by tooling operator'
      );
      setSelectedIds([]);
    }
  };

  // Select / Deselect All
  const handleSelectAll = () => {
    if (selectedIds.length === filteredPositions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPositions.map(p => p.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Line Selector (Sticky Locked at Top) */}
      <div className="sticky top-0 z-30 bg-[#0B1322]/95 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                  DIE POSITION LOCK CONTROL
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-semibold">
                  ล็อคตำแหน่งแม่พิมพ์
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lock/unlock individual station punch pins, freeze shot counters, and manage bypass tooling states.
              </p>
            </div>
          </div>

          {/* Line Switcher */}
          <LineFilterSelector
            selectedLine={selectedLineId}
            onSelectLine={(line) => setSelectedLineId(line)}
            label="LINE:"
          />
        </div>

        {/* KPI Metric Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          {/* Total */}
          <div className="bg-[#0E172A] border border-slate-800/90 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">TOTAL POSITIONS</div>
            <div className="text-lg font-mono font-bold text-slate-100">{stats.total}</div>
          </div>

          {/* Active / Unlocked */}
          <div className="bg-[#06201B] border border-emerald-800/80 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-emerald-400 font-medium uppercase">ACTIVE (UNLOCKED)</div>
            <div className="text-lg font-mono font-bold text-emerald-400">{stats.unlocked}</div>
          </div>

          {/* Locked Total */}
          <div className="bg-[#3B0707] border border-red-800/80 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-red-300 font-medium uppercase">LOCKED TOTAL</div>
            <div className="text-lg font-mono font-bold text-red-400">{stats.locked}</div>
          </div>

          {/* Maintenance Lock */}
          <div className="bg-[#2B0E17] border border-rose-900/80 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-rose-300 font-medium uppercase">MAINTENANCE HOLD</div>
            <div className="text-lg font-mono font-bold text-rose-400">{stats.maintenance}</div>
          </div>

          {/* Bypass Pin */}
          <div className="bg-[#2B1B0A] border border-amber-900/80 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-amber-300 font-medium uppercase">BYPASS / DUMMY</div>
            <div className="text-lg font-mono font-bold text-amber-400">{stats.bypass}</div>
          </div>

          {/* Trial Run */}
          <div className="bg-[#0B1E2E] border border-cyan-900/80 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-cyan-300 font-medium uppercase">TRIAL / TEST</div>
            <div className="text-lg font-mono font-bold text-cyan-400">{stats.trial}</div>
          </div>

          {/* Frozen Counter */}
          <div className="bg-[#19142B] border border-purple-900/80 rounded-lg p-2.5 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] text-purple-300 font-medium uppercase">FROZEN COUNTER</div>
            <div className="text-lg font-mono font-bold text-purple-400">{stats.frozenCount}</div>
          </div>
        </div>
      </div>

      {/* Action Controls & Filters Bar */}
      <div className="bg-[#0B1322] border border-slate-800/80 rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-mono">STAGE:</span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {stagesList.map(stg => (
                <option key={stg} value={stg} className="bg-slate-900 text-slate-200">
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              ALL ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('LOCKED')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'LOCKED' ? 'bg-red-500 text-slate-950 font-bold' : 'text-red-400 hover:text-red-300'
              }`}
            >
              LOCKED ({stats.locked})
            </button>
            <button
              onClick={() => setStatusFilter('UNLOCKED')}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === 'UNLOCKED' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              UNLOCKED ({stats.unlocked})
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[180px] max-w-[260px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตำแหน่ง/รหัส..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* View Mode & Batch Toolbar */}
        <div className="flex items-center gap-2">
          {/* Batch Actions when items are selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-cyan-500/50 shadow-md animate-pulse">
              <span className="text-xs font-mono font-bold text-cyan-300">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={() => {
                  setModalLockType('LOCKED_MAINTENANCE');
                  setModalReason(COMMON_LOCK_REASONS[0]);
                  setModalCustomReason('');
                  setModalNotes('');
                  setIsBatchModalOpen(true);
                }}
                className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Batch Lock</span>
              </button>
              <button
                onClick={handleBatchUnlock}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1"
              >
                <Unlock className="w-3 h-3" />
                <span>Batch Unlock</span>
              </button>
            </div>
          )}

          {/* Select All Toggle */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-mono"
            title="Select all filtered positions"
          >
            {selectedIds.length === filteredPositions.length && filteredPositions.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>SELECT ALL</span>
          </button>

          {/* View Toggle (Grid vs Table) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'GRID' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              PIN MATRIX
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'TABLE' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              TABLE VIEW
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: GRID VIEW (Station Pin Matrix) */}
      {viewMode === 'GRID' && (
        <div className="space-y-4">
          {(Object.entries(groupedByStage) as [string, PositionLockRecord[]][]).map(([stageName, positions]) => {
            const stageLockedCount = positions.filter(p => p.isLocked).length;
            return (
              <div
                key={stageName}
                className="bg-[#0B1322] border border-slate-800/80 rounded-xl p-4 shadow-lg"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                    <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wide">
                      {stageName}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({positions[0]?.partCode} - {positions[0]?.partName})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {positions.length} Positions
                    </span>
                    {stageLockedCount > 0 ? (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700/80 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-red-400" />
                        <span>{stageLockedCount} LOCKED</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>ALL ACTIVE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive Punch Pin Grid */}
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <div 
                    className="grid gap-2 min-w-max" 
                    style={{ 
                      gridTemplateColumns: positions.length >= (activeConfig?.rowsCount || 42) 
                        ? `repeat(${activeConfig?.rowsCount || 60}, minmax(40px, 1fr))` 
                        : 'repeat(auto-fill, minmax(60px, 1fr))' 
                    }}
                  >
                  {positions.map(pos => {
                    const isSelected = selectedIds.includes(pos.id);
                    const lockInfo = LOCK_TYPE_INFO[pos.lockType];

                    return (
                      <div
                        key={pos.id}
                        onClick={() => handleToggleSelectId(pos.id)}
                        className={`relative rounded-lg p-2 transition-all cursor-pointer border group flex flex-col justify-between ${
                          pos.isLocked
                            ? `${lockInfo.bg} ${lockInfo.border} shadow-md`
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                        } ${isSelected ? 'ring-2 ring-cyan-400 scale-[1.02]' : ''}`}
                      >
                        {/* Checkbox indicator on hover or when selected */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-slate-100">
                            {pos.positionId}
                          </span>
                          {pos.isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
                          )}
                        </div>

                        {/* Status Label */}
                        <div className="text-[9px] font-mono font-semibold truncate mt-0.5">
                          {pos.isLocked ? (
                            <span className={lockInfo.color}>{pos.lockType.replace('LOCKED_', '')}</span>
                          ) : (
                            <span className="text-slate-400">ACTIVE</span>
                          )}
                        </div>

                        {/* Frozen indicator */}
                        {pos.freezeShotCount && (
                          <div className="text-[8px] font-mono text-purple-300 mt-1 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>FROZEN</span>
                          </div>
                        )}

                        {/* Quick action overlay on hover */}
                        <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickToggle(pos);
                            }}
                            className={`w-full py-0.5 rounded text-[9px] font-mono font-semibold transition-colors ${
                              pos.isLocked
                                ? 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100'
                                : 'bg-red-800/80 hover:bg-red-700 text-red-100'
                            }`}
                          >
                            {pos.isLocked ? 'UNLOCK' : 'LOCK'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content: TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="bg-[#0B1322] border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#0B172E] text-cyan-300/90 text-[11px] font-semibold uppercase border-b border-slate-800">
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPositions.length && filteredPositions.length > 0}
                      onChange={handleSelectAll}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-800/70 font-mono">NO.</th>
                  <th className="py-2.5 px-3 border-r border-slate-800/70 font-sans">STAGE / STATION</th>
                  <th className="py-2.5 px-3 border-r border-slate-800/70">PART CODE</th>
                  <th className="py-2.5 px-3 border-r border-slate-800/70">POS ID</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-800/70">LOCK STATUS</th>
                  <th className="py-2.5 px-3 border-r border-slate-800/70 font-sans">REASON / NOTES</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-800/70">FROZEN SHOT</th>
                  <th className="py-2.5 px-3 border-r border-slate-800/70">LOCKED BY</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {filteredPositions.map((pos, idx) => {
                  const isSelected = selectedIds.includes(pos.id);
                  const lockInfo = LOCK_TYPE_INFO[pos.lockType];

                  return (
                    <tr
                      key={pos.id}
                      className={`hover:bg-cyan-950/20 transition-colors ${
                        pos.isLocked ? 'bg-red-950/15' : ''
                      } ${isSelected ? 'bg-cyan-950/30' : ''}`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectId(pos.id)}
                          className="rounded bg-slate-900 border-slate-700 text-cyan-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-cyan-400/80 border-r border-slate-800/70">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 font-sans font-medium text-slate-100 border-r border-slate-800/70">
                        {pos.stageName}
                      </td>

                      <td className="py-2 px-3 text-cyan-300 font-semibold border-r border-slate-800/70">
                        {pos.partCode}
                      </td>

                      <td className="py-2 px-3 font-bold text-white border-r border-slate-800/70">
                        {pos.positionId}
                      </td>

                      <td className="py-2 px-3 text-center border-r border-slate-800/70">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${lockInfo.bg} ${lockInfo.color} ${lockInfo.border}`}>
                          {pos.isLocked ? pos.lockType.replace('LOCKED_', '') : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-sans text-slate-300 border-r border-slate-800/70 max-w-[280px] truncate">
                        {pos.lockReason ? (
                          <span>
                            <strong className="text-slate-200">{pos.lockReason}</strong>
                            {pos.notes && <span className="text-slate-400 italic block text-[10px] truncate">{pos.notes}</span>}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center font-mono border-r border-slate-800/70">
                        {pos.freezeShotCount ? (
                          <span className="text-purple-300 font-semibold">{formatShots(pos.frozenAtShot || 0)}</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-slate-300 border-r border-slate-800/70">
                        {pos.lockedBy ? (
                          <div>
                            <span className="text-xs text-slate-200">{pos.lockedBy}</span>
                            {pos.lockedAt && (
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(pos.lockedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleQuickToggle(pos)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                            pos.isLocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-red-600 hover:bg-red-500 text-white'
                          }`}
                        >
                          {pos.isLocked ? 'UNLOCK' : 'LOCK'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Position Lock Modal */}
      {activeEditingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E172A] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Lock className="w-5 h-5" />
                <span>LOCK POSITION: {activeEditingItem.positionId}</span>
              </div>
              <button
                onClick={() => setActiveEditingItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleLock} className="space-y-3.5">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Station / Stage:</span>
                  <span className="text-white font-bold">{activeEditingItem.stageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part Code:</span>
                  <span className="text-cyan-300">{activeEditingItem.partCode} ({activeEditingItem.partName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Line & Die:</span>
                  <span className="text-white">{activeEditingItem.lineId} ({activeEditingItem.dieCode})</span>
                </div>
              </div>

              {/* Lock Type Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lock Classification (ประเภทการล็อค):
                </label>
                <select
                  value={modalLockType}
                  onChange={(e) => setModalLockType(e.target.value as PositionLockStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOCKED_MAINTENANCE">LOCKED - MAINTENANCE (ซ่อมบำรุง / รอเจียร์)</option>
                  <option value="LOCKED_BYPASS">LOCKED - BYPASS PIN (สวมพินดัมมี่ / ข้ามชิ้นส่วน)</option>
                  <option value="LOCKED_TRIAL">LOCKED - TRIAL RUN (ทดสอบแม่พิมพ์ / ล็อคยอดช็อต)</option>
                  <option value="LOCKED_CALIBRATION">LOCKED - CALIBRATION (ตั้งระยะชิม/เคลียแรนซ์)</option>
                  <option value="LOCKED_HOLD">LOCKED - QC HOLD (อายัดเพื่อตรวจสอบคุณภาพ)</option>
                </select>
              </div>

              {/* Reason Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Locking (สาเหตุการล็อค):
                </label>
                <select
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {COMMON_LOCK_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="">-- Other Custom Reason --</option>
                </select>
              </div>

              {/* Custom Reason */}
              {!modalReason && (
                <div>
                  <input
                    type="text"
                    placeholder="ระบุสาเหตุ..."
                    value={modalCustomReason}
                    onChange={(e) => setModalCustomReason(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Freeze Shot Checkbox */}
              <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  id="freezeCheck"
                  checked={modalFreezeShot}
                  onChange={(e) => setModalFreezeShot(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <label htmlFor="freezeCheck" className="text-xs text-slate-300 cursor-pointer">
                  Freeze Shot Counter for this position (หยุดนับยอดช็อตตำแหน่งนี้)
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Technician Notes / Work Order (หมายเหตุ):
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="ระบุหมายเหตุ/รายละเอียด..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveEditingItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Lock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Lock Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E172A] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Lock className="w-5 h-5" />
                <span>BATCH LOCK: {selectedIds.length} POSITIONS</span>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchLock} className="space-y-3.5">
              <p className="text-xs text-slate-400">
                Apply lock status and freeze counter simultaneously for all <strong className="text-white">{selectedIds.length}</strong> selected positions.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lock Classification:
                </label>
                <select
                  value={modalLockType}
                  onChange={(e) => setModalLockType(e.target.value as PositionLockStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOCKED_MAINTENANCE">LOCKED - MAINTENANCE</option>
                  <option value="LOCKED_BYPASS">LOCKED - BYPASS PIN</option>
                  <option value="LOCKED_TRIAL">LOCKED - TRIAL RUN</option>
                  <option value="LOCKED_CALIBRATION">LOCKED - CALIBRATION</option>
                  <option value="LOCKED_HOLD">LOCKED - QC HOLD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Batch Lock:
                </label>
                <select
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {COMMON_LOCK_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="">-- Other Custom Reason --</option>
                </select>
              </div>

              {!modalReason && (
                <div>
                  <input
                    type="text"
                    placeholder="ระบุสาเหตุ..."
                    value={modalCustomReason}
                    onChange={(e) => setModalCustomReason(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes:
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="ระบุหมายเหตุ..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock All Selected</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
