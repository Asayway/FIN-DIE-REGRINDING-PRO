import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Search, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  HelpCircle, 
  AlertCircle,
  Factory,
  Save,
  RotateCw,
  Sliders
} from 'lucide-react';
import { storageService, DEFAULT_TV_DISPLAY_CONFIGS } from '../services/storageService';
import { ProductionLineId, PartMaster } from '../types';
import { getPartProgressiveRank } from '../services/calculationService';
import { 
  TvAutoCycleConfig, 
  TvAutoCycleOrderModal, 
  getSavedAutoCycleConfig 
} from '../components/tv/TvAutoCycleOrderModal';

export const TvDisplayConfigView: React.FC = () => {
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>('E1');
  const [partMasters, setPartMasters] = useState<PartMaster[]>([]);
  const [lineConfigs, setLineConfigs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Local active selections for current line
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleConfig, setCycleConfig] = useState<TvAutoCycleConfig>(getSavedAutoCycleConfig);

  // Line labels matching the main application
  const lineDisplayNames: Record<ProductionLineId, string> = {
    'E1': 'LINE E1 (Ø7 Slit)',
    'E2': 'LINE E2 (Ø5 Slit)',
    'E3-1': 'LINE E3 SLit 3P',
    'E3-2': 'LINE E3 WL+ 4P',
    'E3-3': 'LINE E3 New Cor 4P',
    'E4': 'LINE E4 (Ø5 Slit)',
    'E5': 'LINE E5 (Ø5 Slit)'
  };

  const getStageColor = (stage: string) => {
    const stg = (stage || '').toUpperCase();
    if (stg.includes('PIERCE') || stg.includes('BURRING')) return 'border-[#FFCC00] text-[#FFCC00]'; // Yellow/Amber
    if (stg.includes('IRONING')) return 'border-blue-400 text-blue-400';
    if (stg.includes('LOUVER') || stg.includes('SLIT')) return 'border-emerald-400 text-emerald-400';
    if (stg.includes('REFLAIRE') || stg.includes('REFLARE')) return 'border-purple-400 text-purple-400';
    if (stg.includes('NOTCH') || stg.includes('PUNCH')) return 'border-sky-400 text-sky-400';
    if (stg.includes('CUT OFF') || stg.includes('SIDE CUT')) return 'border-rose-400 text-rose-400';
    if (stg.includes('FORMING')) return 'border-teal-400 text-teal-400';
    if (stg.includes('PILOT') || stg.includes('FEED')) return 'border-orange-400 text-orange-400';
    return 'border-slate-500 text-slate-300';
  };

  const loadData = () => {
    const parts = storageService.getPartMasters();
    setPartMasters(parts);
    setLineConfigs(storageService.getLineConfigs());

    // Load saved TV Display configs
    const configs = storageService.getTvDisplayConfigs();
    const activeLineConfig = configs[selectedLineId] || [];
    setSelectedParts(activeLineConfig);
  };

  useEffect(() => {
    loadData();
  }, [selectedLineId]);

  // Current line configuration
  const currentLineConfig = useMemo(() => {
    const cfgs = lineConfigs.length > 0 ? lineConfigs : storageService.getLineConfigs();
    return cfgs.find(cfg => cfg.lineId === selectedLineId);
  }, [lineConfigs, selectedLineId]);

  // Identify which parts are actually installed/active on this line
  const installedPartsMap = useMemo(() => {
    if (!currentLineConfig || !currentLineConfig.installedPartQuantities) {
      return {};
    }
    return currentLineConfig.installedPartQuantities as Record<string, number>;
  }, [currentLineConfig]);

  // Count total installed parts on current line
  const totalInstalledCount = useMemo(() => {
    return partMasters.filter(pm => (installedPartsMap[pm.partCode] || 0) > 0).length;
  }, [partMasters, installedPartsMap]);

  // Filter & sort part masters for the left pane (Concept 1: Strict Installed Line Filter)
  const availableParts = useMemo(() => {
    // Check if parts are already selected
    const selectedSet = new Set(selectedParts);
    
    let list = partMasters.map(pm => {
      const isInstalled = (installedPartsMap[pm.partCode] || 0) > 0;
      const installQty = installedPartsMap[pm.partCode] || 0;
      return {
        ...pm,
        isInstalled,
        installQty,
        isSelected: selectedSet.has(pm.partCode)
      };
    });

    // Filter strictly to ONLY installed parts on this line to avoid confusing selection lists
    list = list.filter(p => p.isInstalled);

    // Query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.partCode.toLowerCase().includes(q) || 
        p.partName.toLowerCase().includes(q) || 
        (p.stageName && p.stageName.toLowerCase().includes(q))
      );
    }

    // Sort by manufacturing progressive process sequence (getPartProgressiveRank)
    return list.sort((a, b) => {
      const rankA = getPartProgressiveRank(a.partName, a.stageName);
      const rankB = getPartProgressiveRank(b.partName, b.stageName);
      if (rankA !== rankB) return rankA - rankB;
      return a.partCode.localeCompare(b.partCode);
    });
  }, [partMasters, installedPartsMap, searchQuery]);

  // Retrieve the full PartMaster info for the selected parts in the right pane
  const activeTvPartsList = useMemo(() => {
    return selectedParts.map((pCode, index) => {
      const pm = partMasters.find(p => p.partCode === pCode || p.partName === pCode);
      const isInstalled = (installedPartsMap[pCode] || (pm ? installedPartsMap[pm.partCode] : 0) || 0) > 0;
      return {
        partCode: pm ? pm.partCode : pCode,
        partName: pm ? pm.partName : pCode,
        stageName: pm ? pm.stageName : 'Unknown Stage',
        isInstalled,
        index
      };
    });
  }, [selectedParts, partMasters, installedPartsMap]);

  // Add item to TV Display List
  const handleAddPart = (partCode: string) => {
    if (selectedParts.includes(partCode)) return;
    setSelectedParts(prev => [...prev, partCode]);
  };

  // Remove item from TV Display List
  const handleRemovePart = (partCode: string) => {
    setSelectedParts(prev => prev.filter(c => c !== partCode));
  };

  // Select all installed parts for current line
  const handleSelectAllInstalled = () => {
    const installedCodes = partMasters
      .filter(pm => (installedPartsMap[pm.partCode] || 0) > 0)
      .map(pm => pm.partCode);
    setSelectedParts(installedCodes);
  };

  // Clear all selected items
  const handleClearAll = () => {
    setSelectedParts([]);
  };

  // Move item Up in ordering
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSelectedParts(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
  };

  // Move item Down in ordering
  const handleMoveDown = (index: number) => {
    if (index === selectedParts.length - 1) return;
    setSelectedParts(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
  };

  // Save the configuration
  const handleSave = () => {
    try {
      const configs = storageService.getTvDisplayConfigs();
      configs[selectedLineId] = selectedParts;
      storageService.saveTvDisplayConfigs(configs);

      // Create detailed audit log
      storageService.addAuditLog(
        'SYSTEM',
        `Configured TV display items for ${selectedLineId}: selected ${selectedParts.length} parts`,
        `ตั้งค่ารายการแสดงผล TV ของไลน์ ${selectedLineId} สำเร็จแล้ว (เลือกแล้ว ${selectedParts.length} พาร์ท)`
      );

      setSaveSuccessMsg(`บันทึกการตั้งค่าการแสดงผล TV สำหรับไลน์ ${selectedLineId} เรียบร้อยแล้ว (เชื่อมโยงไปยังหน้าจอ TV อัตโนมัติ)`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    }
  };

  // Reset to default (progressive key tooling order for this line)
  const handleResetToDefault = () => {
    const defaultCodes = DEFAULT_TV_DISPLAY_CONFIGS[selectedLineId];
    if (defaultCodes && defaultCodes.length > 0) {
      setSelectedParts([...defaultCodes]);
      return;
    }
    const installedCodes = partMasters
      .filter(pm => (installedPartsMap[pm.partCode] || 0) > 0)
      .map(pm => pm.partCode)
      .sort((a, b) => {
        const pmA = partMasters.find(p => p.partCode === a);
        const pmB = partMasters.find(p => p.partCode === b);
        const rankA = getPartProgressiveRank(pmA?.partName || '', pmA?.stageName || '');
        const rankB = getPartProgressiveRank(pmB?.partName || '', pmB?.stageName || '');
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });
    setSelectedParts(installedCodes.slice(0, 14));
  };

  return (
    <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 space-y-4 font-sans text-slate-200 shadow-2xl">
      
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-amber-400" />
            <span>ตั้งค่าการแสดงผล TV (TV DISPLAY SETTINGS)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            เลือกชิ้นส่วนอะไหล่ 12 - 14 รายการหลักที่ต้องการแสดงผลในแต่ละไลน์ เพื่อไม่ให้หน้าจอ TV Dashboard หนาแน่นเกินไป
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCycleModalOpen(true)}
            className="liquid-pill px-3.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-cyan-500/30 active:scale-95 shadow-sm"
            title="ตั้งค่าลำดับการหมุนเวียนสายการผลิตบนหน้าจอ TV (Auto Cycle Order)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ลำดับหมุนเวียนไลน์</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="liquid-pill px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 active:scale-95 shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>ค่าเริ่มต้น</span>
          </button>

          <button
            onClick={handleSave}
            className="liquid-pill px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-lg">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Line Select Bar */}
      <div className="flex flex-wrap gap-2 p-2 bg-black/40 rounded-2xl border border-white/10">
        {(['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'] as ProductionLineId[]).map((lineId) => {
          const isActive = selectedLineId === lineId;
          const display = lineDisplayNames[lineId];
          const hasCustomConfig = (storageService.getTvDisplayConfigs()[lineId] || []).length > 0;

          return (
            <button
              key={lineId}
              onClick={() => setSelectedLineId(lineId)}
              className={`liquid-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                isActive 
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] font-black' 
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>{display}</span>
              {hasCustomConfig && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-slate-950' : 'bg-amber-400'}`}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selector Panels Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: AVAILABLE PARTS (Lg 5 spans) */}
        <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col h-[540px]">
          <div className="flex flex-col gap-2 mb-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span>รายการพาร์ท</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono border border-amber-400/30">
                  {availableParts.length} รายการ
                </span>
              </span>
              
              <button
                onClick={handleSelectAllInstalled}
                className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30 font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title="เลือกพาร์ทที่ติดตั้งในไลน์นี้ทั้งหมดขึ้นจอ TV"
              >
                <Plus className="w-3 h-3" />
                <span>เลือกที่ติดตั้งทั้งหมด</span>
              </button>
            </div>

            {/* Information Banner indicating that only installed parts are shown */}
            <div className="p-2 bg-amber-400/5 border border-amber-400/25 rounded-xl text-[10px] text-amber-300 font-medium leading-relaxed">
              แสดงเฉพาะพาร์ทที่ติดตั้งในสเตจต่างๆ ของไลน์ <strong>{selectedLineId}</strong> ({totalInstalledCount} พาร์ท) เพื่อป้องกันการสับสน
            </div>
          </div>

          {/* Search box */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามพาร์ทโค้ด, ชื่อพาร์ท หรือสเตจ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="liquid-input w-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* List items scroll area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs custom-scrollbar">
            {availableParts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                ไม่พบข้อมูลพาร์ทที่ติดตั้งในไลน์นี้
              </div>
            ) : (
              availableParts.map((pm) => {
                const isSelected = selectedParts.includes(pm.partCode);
                return (
                  <div 
                    key={pm.partCode}
                    className="p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 bg-white/[0.05] border-white/15 hover:border-amber-400/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {pm.stageName && (
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black border bg-black/40 uppercase tracking-wider rounded-lg ${getStageColor(pm.stageName)}`}>
                            {pm.stageName}
                          </span>
                        )}
                        {pm.isInstalled ? (
                          <span className="bg-indigo-950/60 text-indigo-300 text-[9px] px-2 py-0.5 rounded-lg font-semibold border border-indigo-500/30 font-mono">
                            ติดตั้งแล้ว ({pm.installQty} ชิ้น)
                          </span>
                        ) : (
                          <span className="bg-slate-900/60 text-slate-400 text-[9px] px-2 py-0.5 rounded-lg border border-white/10 font-mono">
                            ไม่ได้ติดตั้ง
                          </span>
                        )}
                        {isSelected && (
                          <span className="bg-amber-950/80 text-amber-400 text-[9px] px-2 py-0.5 rounded-lg font-black border border-amber-500/40">
                            เลือกแล้ว
                          </span>
                        )}
                      </div>
                      <div className="text-white font-extrabold text-[12px] leading-tight">
                        {pm.partName}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddPart(pm.partCode)}
                      disabled={isSelected}
                      className={`p-2 rounded-xl transition-all shrink-0 ${
                        isSelected 
                          ? 'bg-white/[0.02] text-slate-600 border border-white/5 cursor-not-allowed' 
                          : 'bg-amber-400/15 text-amber-300 border border-amber-400/40 hover:bg-amber-400 hover:text-slate-950 cursor-pointer active:scale-95 shadow-sm'
                      }`}
                      title="เพิ่มพาร์ทลงในรายการแสดงผล TV"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TV DISP ACTIVE ITEMS (Lg 7 spans) */}
        <div className="lg:col-span-7 bg-black/40 border border-white/10 rounded-2xl p-3.5 flex flex-col h-[540px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white">รายการที่จะนำขึ้นหน้าจอ TV</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono border ${
                selectedParts.length > 14 
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' 
                  : selectedParts.length >= 12
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : selectedParts.length > 0
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-white/10 text-slate-300 border-white/10'
              }`}>
                {selectedParts.length} รายการ
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedParts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 px-2 py-0.5 rounded-lg border border-rose-500/30 font-bold transition-all cursor-pointer"
                >
                  ล้างรายการ
                </button>
              )}
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>แนะนำ 12 - 14 รายการ</span>
              </span>
            </div>
          </div>

          {/* Recommendation / Limit indicator */}
          {selectedParts.length > 14 && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl text-[10px] mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                <strong>คำเตือน:</strong> คุณเลือกไป {selectedParts.length} รายการแล้ว (เกิน 14 รายการ) หน้าจอ TV อาจจะดูอัดแน่นและตัวอักษรเล็กเกินกว่าจะสแกนสายตาได้อย่างรวดเร็ว
              </span>
            </div>
          )}

          {/* List items ordering and remove panel */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs custom-scrollbar">
            {selectedParts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Tv className="w-12 h-12 text-slate-600 stroke-[1.5] mb-2" />
                <p className="text-xs font-bold text-slate-400">ยังไม่มีการเจาะจงรายการตั้งค่า</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[280px]">
                  จะใช้ค่าเริ่มต้นคือดึงรายการชิ้นส่วนอะไหล่ทั้งหมดที่ติดตั้งบนไลน์นี้มาแสดงผล หรือกดปุ่ม <strong>"เลือกที่ติดตั้งทั้งหมด"</strong> เพื่อเริ่มจัดเรียง
                </p>
              </div>
            ) : (
              activeTvPartsList.map((item, index) => {
                return (
                  <div 
                    key={item.partCode}
                    className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between gap-3 animate-fadeIn"
                  >
                    {/* Index & Reorder Controls */}
                    <div className="flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-xl border border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 w-4 text-center font-mono">
                        {index + 1}
                      </span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`p-0.5 hover:bg-white/10 rounded transition-all cursor-pointer ${
                            index === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300'
                          }`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedParts.length - 1}
                          className={`p-0.5 hover:bg-white/10 rounded transition-all cursor-pointer ${
                            index === selectedParts.length - 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300'
                          }`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Part Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {item.stageName && (
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black border bg-black/40 uppercase tracking-wider rounded-lg ${getStageColor(item.stageName)}`}>
                            {item.stageName}
                          </span>
                        )}
                        {!item.isInstalled && (
                          <span className="bg-amber-950/50 text-amber-300 border border-amber-500/40 text-[8px] px-1.5 py-0.5 rounded-lg font-bold">
                            ไม่ได้ติดตั้ง
                          </span>
                        )}
                      </div>
                      <div className="text-white font-extrabold text-[12px] leading-tight">
                        {item.partName}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleRemovePart(item.partCode)}
                      className="p-2 bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
                      title="ลบออกจากรายการ TV"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Auto Cycle Line Order Configuration Modal */}
      <TvAutoCycleOrderModal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        config={cycleConfig}
        onSaveConfig={(newCfg) => setCycleConfig(newCfg)}
        currentLineId={selectedLineId}
        getLineMachineStatus={(id) => {
          const monitoring = storageService.getLinesMonitoring()[id];
          if (monitoring?.machineStatus) return monitoring.machineStatus;
          return id === 'E5' ? 'STOPPED' : 'RUNNING';
        }}
        getLineLabel={(id) => {
          if (id === 'E1') return 'E1';
          if (id === 'E2') return 'E2';
          if (id === 'E3-1') return 'E3 SLit';
          if (id === 'E3-2') return 'E3 WL';
          if (id === 'E3-3') return 'E3 New corr';
          if (id === 'E4') return 'E4';
          if (id === 'E5') return 'E5';
          return id;
        }}
        getLineSubTag={(id) => {
          if (id === 'E1') return 'Ø7 Slit';
          if (id === 'E2') return 'Ø5 Slit';
          if (id === 'E3-1') return '3P';
          if (id === 'E3-2') return '4P';
          if (id === 'E3-3') return '4P';
          if (id === 'E4') return 'Ø5 Slit';
          if (id === 'E5') return 'Ø5 Slit';
          return '';
        }}
      />

    </div>
  );
};
