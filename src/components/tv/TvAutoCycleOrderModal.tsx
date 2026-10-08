import React, { useState } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  RotateCcw, 
  Sliders, 
  Layers, 
  Activity,
  CheckSquare,
  Square,
  Play
} from 'lucide-react';
import { ProductionLineId, MachineStatus } from '../../types';
import { safeStorage } from '../../services/safeStorage';

export interface TvAutoCycleConfig {
  order: ProductionLineId[];
  enabledLines: Record<ProductionLineId, boolean>;
  mode: 'ALL_SEQUENTIAL' | 'CUSTOM_SELECTED' | 'RUNNING_ONLY';
}

export const DEFAULT_TV_CYCLE_CONFIG: TvAutoCycleConfig = {
  order: ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'],
  enabledLines: {
    'E1': true,
    'E2': true,
    'E3-1': true,
    'E3-2': true,
    'E3-3': true,
    'E4': true,
    'E5': true
  },
  mode: 'ALL_SEQUENTIAL'
};

export const getSavedAutoCycleConfig = (): TvAutoCycleConfig => {
  try {
    const raw = safeStorage.getItem('findie_tv_autocycle_config_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.order) && parsed.order.length > 0) {
        const allLines: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];
        const sanitizedOrder: ProductionLineId[] = parsed.order.filter((id: string): id is ProductionLineId => allLines.includes(id as any));
        allLines.forEach(id => {
          if (!sanitizedOrder.includes(id)) {
            sanitizedOrder.push(id);
          }
        });

        const sanitizedEnabled: Record<ProductionLineId, boolean> = {
          'E1': parsed.enabledLines?.['E1'] ?? true,
          'E2': parsed.enabledLines?.['E2'] ?? true,
          'E3-1': parsed.enabledLines?.['E3-1'] ?? true,
          'E3-2': parsed.enabledLines?.['E3-2'] ?? true,
          'E3-3': parsed.enabledLines?.['E3-3'] ?? true,
          'E4': parsed.enabledLines?.['E4'] ?? true,
          'E5': parsed.enabledLines?.['E5'] ?? true
        };

        return {
          order: sanitizedOrder,
          enabledLines: sanitizedEnabled,
          mode: parsed.mode || 'ALL_SEQUENTIAL'
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved auto cycle config', e);
  }
  return DEFAULT_TV_CYCLE_CONFIG;
};

export const saveAutoCycleConfig = (cfg: TvAutoCycleConfig) => {
  try {
    safeStorage.setItem('findie_tv_autocycle_config_v2', JSON.stringify(cfg));
  } catch (e) {
    console.warn('Failed to save auto cycle config', e);
  }
};

export interface TvAutoCycleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TvAutoCycleConfig;
  onSaveConfig: (newConfig: TvAutoCycleConfig) => void;
  currentLineId: ProductionLineId;
  getLineMachineStatus: (lineId: ProductionLineId) => MachineStatus;
  getLineLabel: (lineId: ProductionLineId) => string;
  getLineSubTag: (lineId: ProductionLineId) => string;
}

export const TvAutoCycleOrderModal: React.FC<TvAutoCycleOrderModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentLineId,
  getLineMachineStatus,
  getLineLabel,
  getLineSubTag
}) => {
  const [localOrder, setLocalOrder] = useState<ProductionLineId[]>(config.order);
  const [localEnabled, setLocalEnabled] = useState<Record<ProductionLineId, boolean>>(config.enabledLines);
  const [localMode, setLocalMode] = useState<'ALL_SEQUENTIAL' | 'CUSTOM_SELECTED' | 'RUNNING_ONLY'>(config.mode);

  // Sync state whenever modal opens with external config
  React.useEffect(() => {
    if (isOpen) {
      setLocalOrder(config.order);
      setLocalEnabled(config.enabledLines);
      setLocalMode(config.mode);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Move item up in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setLocalOrder(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setLocalMode('CUSTOM_SELECTED');
  };

  // Move item down in order
  const handleMoveDown = (index: number) => {
    if (index >= localOrder.length - 1) return;
    setLocalOrder(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setLocalMode('CUSTOM_SELECTED');
  };

  // Toggle individual line enable state
  const handleToggleLine = (lineId: ProductionLineId) => {
    setLocalEnabled(prev => ({
      ...prev,
      [lineId]: !prev[lineId]
    }));
    setLocalMode('CUSTOM_SELECTED');
  };

  // Preset: Reset to standard sequential order E1 -> E2 -> E3-1 -> E3-2 -> E3-3 -> E4 -> E5
  const handleResetDefault = () => {
    setLocalOrder(['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5']);
    setLocalEnabled({
      'E1': true,
      'E2': true,
      'E3-1': true,
      'E3-2': true,
      'E3-3': true,
      'E4': true,
      'E5': true
    });
    setLocalMode('ALL_SEQUENTIAL');
  };

  // Preset: Only running lines
  const handleSetRunningOnly = () => {
    const newEnabled: Record<ProductionLineId, boolean> = {
      'E1': false,
      'E2': false,
      'E3-1': false,
      'E3-2': false,
      'E3-3': false,
      'E4': false,
      'E5': false
    };
    localOrder.forEach(l => {
      const st = getLineMachineStatus(l);
      if (st === 'RUNNING' || st === 'SIMULATION_ACTIVE') {
        newEnabled[l] = true;
      }
    });
    setLocalEnabled(newEnabled);
    setLocalMode('RUNNING_ONLY');
  };

  // Select all lines
  const handleSelectAll = () => {
    setLocalEnabled({
      'E1': true,
      'E2': true,
      'E3-1': true,
      'E3-2': true,
      'E3-3': true,
      'E4': true,
      'E5': true
    });
    setLocalMode('ALL_SEQUENTIAL');
  };

  // Deselect all lines
  const handleDeselectAll = () => {
    setLocalEnabled({
      'E1': false,
      'E2': false,
      'E3-1': false,
      'E3-2': false,
      'E3-3': false,
      'E4': false,
      'E5': false
    });
    setLocalMode('CUSTOM_SELECTED');
  };

  // Save changes
  const handleSave = () => {
    const finalConfig: TvAutoCycleConfig = {
      order: localOrder,
      enabledLines: localEnabled,
      mode: localMode
    };
    saveAutoCycleConfig(finalConfig);
    onSaveConfig(finalConfig);
    onClose();
  };

  // Compute active preview sequence
  const previewSequence = localOrder.filter(lineId => {
    if (localMode === 'RUNNING_ONLY') {
      const st = getLineMachineStatus(lineId);
      return st === 'RUNNING' || st === 'SIMULATION_ACTIVE';
    }
    return localEnabled[lineId];
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono animate-fadeIn">
      <div className="liquid-glass-sheet bg-[#090d16]/95 border border-white/20 rounded-2xl text-white max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex-none p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                <span>ตั้งค่าลำดับการสลับไลน์ TV (Auto Cycle Order)</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                จัดเรียงลำดับการแสดงผลหน้าจอทีวีตามความต้องการ และเลือกเฉพาะไลน์ที่ต้องการหมุนเวียน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.15] p-2 rounded-full cursor-pointer transition-all active:scale-95"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Preset Quick Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 bg-black/40 rounded-xl border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              โหมดลำดับ:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleResetDefault}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  localMode === 'ALL_SEQUENTIAL'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                มาตรฐาน (E1 → E5)
              </button>
              <button
                type="button"
                onClick={handleSetRunningOnly}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  localMode === 'RUNNING_ONLY'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                เฉพาะกำลังผลิต (Running Only)
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/[0.04] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all cursor-pointer"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/[0.04] text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>

          {/* Active Flow Preview Banner */}
          <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>ตัวอย่างเส้นทางการหมุนเวียน (Active Rotation Flow):</span>
              </span>
              <span className="text-cyan-400/80 font-bold">
                {previewSequence.length} จาก {localOrder.length} ไลน์
              </span>
            </div>

            {previewSequence.length === 0 ? (
              <div className="text-amber-300 text-center py-2 text-[11px] font-bold">
                ⚠️ ยังไม่ได้เลือกไลน์ใดๆ เลย (กรุณาเลือกอย่างน้อย 1 ไลน์)
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {previewSequence.map((lineId, idx) => {
                  const isCurrent = lineId === currentLineId;
                  const label = getLineLabel(lineId);
                  return (
                    <React.Fragment key={lineId}>
                      <div className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 whitespace-nowrap border ${
                        isCurrent
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 border-white shadow-[0_0_10px_rgba(6,182,212,0.5)] font-black'
                          : 'bg-black/60 text-slate-200 border-cyan-500/30'
                      }`}>
                        <span className="text-[9px] opacity-75">#{idx + 1}</span>
                        <span>{label}</span>
                        {isCurrent && <span className="text-[8px] px-1 bg-slate-950 text-cyan-300 rounded">จอตอนนี้</span>}
                      </div>
                      {idx < previewSequence.length - 1 && (
                        <span className="text-cyan-400 text-xs font-bold flex-shrink-0">➔</span>
                      )}
                    </React.Fragment>
                  );
                })}
                <span className="text-cyan-400/60 text-[10px] font-bold flex-shrink-0 ml-1">➔ (วนกลับ)</span>
              </div>
            )}
          </div>

          {/* Reorderable Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
              <span>ลำดับและสถานะสายการผลิต (คลิก ⬆️ ⬇️ เพื่อปรับลำดับ):</span>
              <span>สถานะเครื่องจักร</span>
            </div>

            <div className="space-y-1.5">
              {localOrder.map((lineId, index) => {
                const isEnabled = localEnabled[lineId];
                const status = getLineMachineStatus(lineId);
                const isRunning = status === 'RUNNING' || status === 'SIMULATION_ACTIVE';
                const isIdle = status === 'IDLE';
                const isStopped = status === 'STOPPED' || status === 'MAINTENANCE';
                const label = getLineLabel(lineId);
                const subTag = getLineSubTag(lineId);
                const isCurrent = lineId === currentLineId;

                return (
                  <div
                    key={lineId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isEnabled
                        ? 'bg-black/40 border-white/15 hover:border-amber-400/40 text-white'
                        : 'bg-black/20 border-white/5 text-slate-500 opacity-60'
                    }`}
                  >
                    {/* Left: Position & Checkbox & Label */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white/10 text-slate-300 font-mono font-black text-xs flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleLine(lineId)}
                        className="flex items-center gap-2 text-left cursor-pointer active:scale-95 group"
                      >
                        {isEnabled ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <span className={`font-bold font-mono text-xs sm:text-sm ${
                          isEnabled ? 'text-white' : 'text-slate-400 line-through'
                        }`}>
                          {label}
                        </span>
                        {subTag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-sans font-bold">
                            {subTag}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                            กำลังแสดงผล
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Right: Status badge & Move Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Operational Status Dot & Label */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isRunning
                            ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            : isIdle
                            ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]'
                            : 'bg-rose-400 shadow-[0_0_4px_#f87171]'
                        }`} />
                        <span className="text-slate-300 hidden sm:inline">{status}</span>
                      </div>

                      {/* Move Up / Down Buttons */}
                      <div className="flex items-center gap-1 bg-black/60 rounded-lg p-0.5 border border-white/10">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="p-1 rounded hover:bg-white/15 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localOrder.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="p-1 rounded hover:bg-white/15 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex-none p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่ามาตรฐาน</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="liquid-pill px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกและใช้งานทันที</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
