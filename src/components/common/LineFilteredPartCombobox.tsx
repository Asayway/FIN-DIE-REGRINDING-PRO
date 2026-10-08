import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown, Check, X, Layers, Wrench, Scissors, Info } from 'lucide-react';
import { ProductionLineId, RegrindMasterStandard, LINE_INFO_MAP } from '../../types';
import { storageService } from '../../services/storageService';
import { regrindService } from '../../services/regrindService';

export interface FilteredLinePartItem {
  partCode: string;
  partName: string;
  lineId: ProductionLineId;
  tubeSizeCompat: 'Ø7' | 'Ø9.52' | 'Ø5' | 'ALL';
  category: string;
  partTypeLabel: string;
  nominalLengthMm: number;
  grindingAmountPerTimeMm: number;
  minAllowedLengthMm: number;
  maxRegrindCount: number;
  regrindAllowed: boolean;
  disposeAfterOneUse: boolean;
  isStandardRegrindTool: boolean;
}

const LINE_PREFIX_LIST = ['E3-1', 'E3-2', 'E3-3', 'E1', 'E2', 'E4', 'E5'];

export function detectTubeSize(partCode: string, partName: string, explicitTube?: string): 'Ø7' | 'Ø9.52' | 'Ø5' | 'ALL' {
  if (explicitTube === 'Ø7' || explicitTube === 'Ø9.52' || explicitTube === 'Ø5') {
    return explicitTube;
  }
  const combined = `${partCode} ${partName}`.toUpperCase();
  if (combined.includes('9.52') || combined.includes('P9-') || combined.includes('Ø9')) return 'Ø9.52';
  if (combined.includes('Ø 5') || combined.includes('Ø5') || combined.includes('P5-')) return 'Ø5';
  if (combined.includes('Ø 7') || combined.includes('Ø7') || combined.includes('P7-')) return 'Ø7';
  return 'ALL';
}

export function getPartTypeLabel(partName: string, partCode: string): string {
  const combined = `${partName} ${partCode}`.toUpperCase();
  if (combined.includes('BURRING')) return 'พั้นช์ขึ้นรูป (Burring)';
  if (combined.includes('PIERCING') || combined.includes('PIERCE')) return 'พั้นช์เจาะ (Piercing)';
  if (combined.includes('FLARE')) return 'พั้นช์บาน (Flare)';
  if (combined.includes('DRAW')) return 'พั้นช์ดึง (Draw)';
  if (combined.includes('IRON')) return 'พั้นช์รีด (Ironing)';
  if (combined.includes('REFLARE')) return 'พั้นช์บานซ้ำ (Reflare)';
  if (combined.includes('FIN CUT') || combined.includes('BLADE') || combined.includes('TRIM')) return 'ใบมีดตัด (Fin Cut)';
  if (combined.includes('NOTCH')) return 'พั้นช์บากคม (Notch Punch)';
  if (combined.includes('FEED FINGER')) return 'ขาป้อนฟิน (Feed Finger)';
  if (combined.includes('PIN')) return 'สลักพิน (Guide Pin)';
  if (/^S[1-6]/.test(partName) || /^S[1-6]/.test(partCode)) return 'พั้นช์สเตชั่นแม่พิมพ์';
  return 'อะไหล่ทูลลิ่ง Fin Die';
}

export function getSupportedTubesForLine(lineId: ProductionLineId): string[] {
  const lineInfo = LINE_INFO_MAP[lineId];
  const primaryTube = lineInfo?.tubeSize || 'Ø7';
  if (lineId === 'E1' || lineId === 'E3-3') {
    return ['Ø7', 'Ø9.52'];
  }
  return [primaryTube];
}

export function getFilteredPartsForLine(
  lineId: ProductionLineId,
  customStandards?: RegrindMasterStandard[]
): FilteredLinePartItem[] {
  const supportedTubes: string[] = getSupportedTubesForLine(lineId);
  const partMasters = storageService.getPartMasters();
  const lifeStandards = storageService.getLifeStandards();
  const regrindStds = customStandards && customStandards.length > 0
    ? customStandards
    : storageService.getRegrindMasterStandards();

  // Deduplicate strictly by normalized Part Name to ensure exactly 1 entry per canonical part
  const nameMap = new Map<string, FilteredLinePartItem>();
  const normalizeKey = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');

  partMasters.forEach(pm => {
    // Check if applicable for this line
    const activeLines: string[] = pm.applicableLines || [];
    const lineKey = lineId.toLowerCase().replace('-', '_');
    const hasInstallInLine = pm.installQty && typeof (pm.installQty as any)[lineKey] === 'number' && (pm.installQty as any)[lineKey] > 0;
    const isLineApplicable = activeLines.length === 0 || activeLines.includes(lineId) || hasInstallInLine;

    const tube = pm.tubeSizeCompat === 'BOTH' ? 'ALL' : detectTubeSize(pm.partCode, pm.partName, pm.tubeSizeCompat);
    const isTubeCompatible = tube === 'ALL' || supportedTubes.includes(tube);

    if (!isLineApplicable && !isTubeCompatible) return;

    const key = normalizeKey(pm.partName);
    if (nameMap.has(key)) return;

    // Cross-link to PartLifeStandard and RegrindMasterStandard
    const lifeStd = lifeStandards.find(ls => 
      ls.configKey?.partCode === pm.partCode ||
      ls.partCode === pm.partCode || 
      ls.id?.includes(pm.partCode) ||
      ls.partName?.toUpperCase() === pm.partName?.toUpperCase()
    );
    const regrindStd = regrindStds.find(rs => 
      rs.partCode === pm.partCode || 
      rs.partCode === `${lineId}-${pm.partCode}` ||
      rs.partName?.toUpperCase() === pm.partName?.toUpperCase()
    );

    const isDie = pm.category === 'DIE' || pm.partName.toUpperCase().includes('DIE');
    const isBlade = pm.category === 'BLADE' || pm.partName.toUpperCase().includes('BLADE');
    const isDisposable = 
      pm.maintenanceType === 'DISPOSE' ||
      pm.regrindStandard?.perGrindMm?.toLowerCase().includes('dispose') ||
      pm.regrindStandard?.note?.toLowerCase().includes('dispose') ||
      regrindStd?.disposeAfterOneUse === true;

    // Parse regrind numbers from Part Master 100%
    const perGrindNum = parseFloat(pm.regrindStandard?.perGrindMm || '') || (regrindStd?.grindingAmountPerTimeMm ?? (isDie ? 0.20 : 0.25));
    const totalGrindNum = parseFloat(pm.regrindStandard?.totalGrindMm || '') || (regrindStd?.totalGrindingAllowanceMm ?? (isDisposable ? 0 : isDie ? 3.0 : 4.0));
    const maxCyclesNum = parseInt(pm.regrindStandard?.regrindCycles || '') || (regrindStd?.maxRegrindCount ?? (isDisposable ? 0 : 5));

    // Nominal length: Priority from PartMaster newSpecMm, then lifeStd, then regrindStd, then category default
    const nominalLength = Number(pm.newSpecMm) || Number(lifeStd?.newSpecMm) || Number(regrindStd?.nominalLengthMm) || (isDie ? 45.00 : isBlade ? 120.00 : 70.00);
    const minAllowedLength = Number(pm.scrapLimitMm) || Number(lifeStd?.scrapLimitMm) || Number(regrindStd?.minAllowedLengthMm) || Number((nominalLength - totalGrindNum).toFixed(2));

    nameMap.set(key, {
      partCode: pm.partCode,
      partName: pm.partName,
      lineId,
      tubeSizeCompat: tube === 'ALL' ? ((supportedTubes[0] as any) || 'ALL') : tube,
      category: pm.category || 'PUNCH',
      partTypeLabel: getPartTypeLabel(pm.partName, pm.partCode),
      nominalLengthMm: nominalLength,
      grindingAmountPerTimeMm: isDisposable ? 0 : perGrindNum,
      minAllowedLengthMm: minAllowedLength,
      maxRegrindCount: isDisposable ? 0 : maxCyclesNum,
      regrindAllowed: !isDisposable,
      disposeAfterOneUse: isDisposable,
      isStandardRegrindTool: true
    });
  });

  return Array.from(nameMap.values()).sort((a, b) => {
    const aSpecific = a.tubeSizeCompat !== 'ALL' ? 0 : 1;
    const bSpecific = b.tubeSizeCompat !== 'ALL' ? 0 : 1;
    if (aSpecific !== bSpecific) return aSpecific - bSpecific;
    return a.partName.localeCompare(b.partName);
  });
}

interface LineFilteredPartComboboxProps {
  lineId: ProductionLineId;
  selectedPartCode: string;
  selectedPartName?: string;
  onSelectPart: (item: FilteredLinePartItem) => void;
  standards?: RegrindMasterStandard[];
  label?: string;
  required?: boolean;
  accentColor?: 'cyan' | 'rose' | 'emerald';
}

export const LineFilteredPartCombobox: React.FC<LineFilteredPartComboboxProps> = ({
  lineId,
  selectedPartCode,
  selectedPartName,
  onSelectPart,
  standards,
  label = 'รายการอะไหล่ / พั้นช์',
  required = true,
  accentColor = 'cyan'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'STANDARD_FORMING' | 'CUTTERS' | 'STATION'>('ALL');
  const [showSharedInfo, setShowSharedInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lineInfo = LINE_INFO_MAP[lineId];
  const supportedTubes = getSupportedTubesForLine(lineId);

  // Strictly filtered parts for selected lineId
  const lineParts = useMemo(() => {
    return getFilteredPartsForLine(lineId, standards);
  }, [lineId, standards]);

  // Currently selected part object
  const currentSelectedPart = useMemo(() => {
    return (
      lineParts.find(p => p.partCode === selectedPartCode) ||
      (selectedPartName ? lineParts.find(p => p.partName.toLowerCase() === selectedPartName.toLowerCase()) : undefined)
    );
  }, [lineParts, selectedPartCode, selectedPartName]);

  // Auto-adjust selected part when lineId changes if current part is incompatible
  useEffect(() => {
    setActiveCategoryFilter('ALL');
    if (lineParts.length === 0) return;

    const stillValid = lineParts.some(
      p => p.partCode === selectedPartCode || (selectedPartName && p.partName === selectedPartName)
    );

    if (!stillValid) {
      const baseKeyword = (selectedPartName || selectedPartCode || '')
        .replace(/Ø\s*(9\.52|7|5)/gi, '')
        .replace(/FD-P[579]-/gi, '')
        .trim()
        .split(' ')[0];

      const equivalent = baseKeyword
        ? lineParts.find(p => p.partName.toLowerCase().includes(baseKeyword.toLowerCase()))
        : undefined;

      onSelectPart(equivalent || lineParts[0]);
    }
  }, [lineId, lineParts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter lineParts by searchQuery and category filter
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return lineParts.filter(item => {
      if (activeCategoryFilter === 'STANDARD_FORMING') {
        const isForming = item.isStandardRegrindTool && !item.partName.toUpperCase().includes('FIN CUT') && !item.partName.toUpperCase().includes('BLADE');
        if (!isForming) return false;
      } else if (activeCategoryFilter === 'CUTTERS') {
        const isCutter = item.partName.toUpperCase().includes('CUT') || item.partName.toUpperCase().includes('BLADE') || item.partName.toUpperCase().includes('TRIM');
        if (!isCutter) return false;
      } else if (activeCategoryFilter === 'STATION') {
        if (item.isStandardRegrindTool) return false;
      }

      if (!q) return true;
      return (
        item.partName.toLowerCase().includes(q) ||
        item.partCode.toLowerCase().includes(q) ||
        item.partTypeLabel.toLowerCase().includes(q) ||
        item.tubeSizeCompat.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [lineParts, searchQuery, activeCategoryFilter]);

  const borderFocusClass =
    accentColor === 'rose'
      ? 'focus-within:border-rose-500 border-rose-500/40'
      : accentColor === 'emerald'
      ? 'focus-within:border-emerald-500 border-emerald-500/40'
      : 'focus-within:border-cyan-400 border-slate-700';

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Clean Minimalist Label Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-200">
            {label} {required && <span className="text-rose-400">*</span>}
          </label>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSharedInfo(prev => !prev);
            }}
            className="text-slate-400 hover:text-cyan-300 p-0.5 rounded cursor-pointer transition-colors"
            title="คลิกดูคำอธิบายรายการร่วม / ทูลลิ่งมาตรฐาน"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          LINE {lineId} ({lineParts.length} รายการ)
        </span>
      </div>

      {/* Info Popup for Shared Items */}
      {showSharedInfo && (
        <div className="mb-2 p-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-slate-300 text-[11px] shadow-xl animate-fadeIn space-y-1">
          <div className="flex items-center justify-between font-bold text-cyan-300 text-xs">
            <span>ℹ️ รายการร่วม (Shared Tooling)</span>
            <button
              type="button"
              onClick={() => setShowSharedInfo(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed">
            คือพั้นช์/ใบมีดมาตรฐานที่<strong>ใช้ร่วมกันได้ในทุกไลน์ที่ขนาดท่อเดียวกัน</strong> (เช่น ท่อ Ø7 ใช้ได้ทั้ง Line E1, E2, E3-1, E3-2) สามารถเบิกใช้และแชร์โควตาลับคมร่วมกันได้
          </p>
        </div>
      )}

      {/* Trigger & Search Input */}
      <div
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 10);
        }}
        className={`w-full bg-slate-950 border-2 ${
          isOpen ? 'border-cyan-400 ring-2 ring-cyan-500/20' : borderFocusClass
        } rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 cursor-pointer transition-all shadow-inner`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder={`พิมพ์ค้นหาชื่อพาร์ท หรือ รหัสอะไหล่...`}
              className="w-full bg-transparent text-white font-bold focus:outline-none placeholder-slate-400 text-sm"
            />
          ) : currentSelectedPart ? (
            <div className="flex items-center gap-2.5 truncate">
              <span className="font-black text-white truncate text-sm sm:text-base tracking-tight">
                {currentSelectedPart.partName}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/25 text-cyan-300 font-mono text-xs font-black shrink-0 border border-cyan-500/30">
                LINE {lineId}
              </span>
            </div>
          ) : (
            <span className="text-slate-300 text-sm font-semibold">คลิกเลือก หรือ พิมพ์ค้นหาอะไหล่...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isOpen && searchQuery && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-[#0b101b] border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Category Tabs */}
          <div className="p-1.5 bg-slate-950/95 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryFilter('ALL');
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ทั้งหมด ({lineParts.length})
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryFilter('STANDARD_FORMING');
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                activeCategoryFilter === 'STANDARD_FORMING'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>พั้นช์ขึ้นรูป</span>
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryFilter('CUTTERS');
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                activeCategoryFilter === 'CUTTERS'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Scissors className="w-3 h-3" />
              <span>ใบมีดตัด</span>
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryFilter('STATION');
              }}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                activeCategoryFilter === 'STATION'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>สเตชั่นแม่พิมพ์</span>
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                ไม่พบรายการที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredOptions.map(item => {
                const isSelected =
                  item.partCode === selectedPartCode ||
                  (selectedPartName && item.partName === selectedPartName);

                return (
                  <button
                    key={item.partCode}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onSelectPart(item);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-white border-l-4 border-cyan-400'
                        : 'hover:bg-white/[0.08] text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white truncate">
                        {item.partName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10.5px] font-bold shrink-0 border border-white/10">
                        LINE {item.lineId}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[3]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
