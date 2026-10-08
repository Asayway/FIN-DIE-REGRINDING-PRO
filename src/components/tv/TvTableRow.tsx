import React from 'react';
import { PartLiveTrackingItem } from '../../types';
import { formatShots } from '../../services/calculationService';

interface TvTableRowProps {
  item: PartLiveTrackingItem;
  idx: number;
  colWidths: Record<string, number>;
  onSelectModalItem: (item: PartLiveTrackingItem) => void;
  t?: any;
  isFullscreen?: boolean;
  layoutMode?: 'DETAILED' | 'COMPACT';
}

export const TvTableRow: React.FC<TvTableRowProps> = React.memo(({
  item,
  colWidths,
  onSelectModalItem,
  isFullscreen = false,
  layoutMode = 'DETAILED'
}) => {
  const isCompact = layoutMode === 'COMPACT';
  const usedShotVal = item.usedShot !== undefined ? item.usedShot : item.currentShot;
  const availableSpareVal = item.availableSpare !== undefined ? item.availableSpare : item.backupQty;
  const isStdMissing = item.isStandardMissing || item.lifeLimit <= 0;
  const percentVal = Math.round(item.usagePercent || (item.lifeLimit > 0 ? (usedShotVal / item.lifeLimit) * 100 : 0));
  const stageLower = (item.stagePunchDie || item.partName || '').toLowerCase();

  // Low stock & order flags
  const isLowStock = item.stockStatus === 'OUT_OF_STOCK' || item.stockStatus === 'LOW_STOCK' || (availableSpareVal !== undefined && availableSpareVal <= 0);
  const isOrderFlagged = item.orderStatus === 'PO OPEN' || item.orderStatus === 'PR PREPARING' || item.orderStatus === 'ORDERED';
  const isCriticalWear = item.lifeStatus === 'CRITICAL' || item.lifeStatus === 'OVER_LIFE';

  // Determine Order Require alert circle color based on Signal Standard thresholds
  let orderRequireColor = '';
  let orderRequireTitle = '';

  if (item.lifeStatus === 'OVER_LIFE' || percentVal >= 100) {
    orderRequireColor = 'status-orb-gloss bg-rose-600 border border-rose-400/80 shadow-[0_0_14px_rgba(225,29,72,0.85)]';
    orderRequireTitle = 'Over Life Replace Count - Order Required';
  } else if (item.lifeStatus === 'CRITICAL' || isCriticalWear) {
    orderRequireColor = 'status-orb-gloss bg-rose-600 border border-rose-400/80 shadow-[0_0_14px_rgba(225,29,72,0.85)]';
    orderRequireTitle = 'Critical Replace Count - Order Required';
  } else if (item.lifeStatus === 'PREPARE') {
    orderRequireColor = 'status-orb-gloss bg-amber-500 border border-amber-300/80 shadow-[0_0_14px_rgba(245,158,11,0.85)]';
    orderRequireTitle = 'Prepare Replace Count - Order Required';
  } else if (item.lifeStatus === 'WARNING') {
    orderRequireColor = 'status-orb-gloss bg-yellow-400 border border-yellow-200/80 shadow-[0_0_14px_rgba(250,204,21,0.85)]';
    orderRequireTitle = 'Warning Replace Count - Order Required';
  } else if (isLowStock || isOrderFlagged) {
    orderRequireColor = 'status-orb-gloss bg-orange-500 border border-orange-300/80 shadow-[0_0_14px_rgba(249,115,22,0.85)]';
    orderRequireTitle = 'Low Stock - Order Required';
  }

  const needsOrder = !!orderRequireColor;

  // Progress percentage clamp & fill
  const clampPercent = item.lifeLimit > 0 ? Math.min(100, Math.max(0, percentVal)) : 0;

  // Life Time (Days) calculation or explicit state
  let lifeTimeDisplay: React.ReactNode = '-';
  if (isStdMissing) {
    lifeTimeDisplay = (
      <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-slate-500 uppercase`}>
        STANDARD NOT SET
      </span>
    );
  } else if (item.daysRemainingForecast !== undefined && item.daysRemainingForecast > 0) {
    lifeTimeDisplay = item.daysRemainingForecast;
  } else if (item.daysRemainingForecast === 0) {
    lifeTimeDisplay = (
      <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-rose-400 uppercase`}>
        0 (OVER LIFE)
      </span>
    );
  } else {
    // If daily rate is 0 or unconfigured, we do not invent arbitrary divisors
    lifeTimeDisplay = (
      <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-slate-500 uppercase`}>
        NO FORECAST
      </span>
    );
  }

  // Row height: flex-1 min-h-0 so rows fill available screen height dynamically
  const rowHeightClass = isCompact
    ? 'flex-1 min-h-[28px] sm:min-h-[32px] md:min-h-[36px] py-0.5'
    : 'flex-1 min-h-[36px] sm:min-h-[40px] md:min-h-[46px] py-0.5 sm:py-1';

  // Standard text scale classes based on Detailed vs Compact
  const fontPrimaryClass = isCompact
    ? 'text-xs sm:text-sm md:text-base font-bold'
    : 'text-base sm:text-xl md:text-2xl lg:text-3xl font-black';

  const fontShotClass = isCompact
    ? 'text-sm sm:text-base md:text-lg lg:text-xl font-black'
    : 'text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black';

  const fontProgressClass = isCompact
    ? 'text-xs sm:text-sm md:text-base font-black'
    : 'text-base sm:text-xl md:text-2xl lg:text-3xl font-mono font-black';

  // Format clean English display name for TV Monitor
  const getCleanDisplayName = () => {
    let name = item.partName || item.stagePunchDie || '';
    if (name.includes('(')) {
      name = name.replace(/\s*\(.*?\)/g, '').trim();
    }
    return name || item.partName || item.stagePunchDie || 'Tooling Part';
  };
  const displayName = getCleanDisplayName();

  return (
    <div 
      className={`flex items-center font-sans bg-transparent hover:bg-white/[0.03] border-b border-white/[0.06] transition-colors ${rowHeightClass}`}
    >
      {/* 1. Stage Punch / Die (Left aligned, white bold text, large display for distance reading) */}
      <div 
        onClick={() => onSelectModalItem(item)}
        className={`h-full flex items-center justify-start px-2 sm:px-3.5 font-sans text-white border-r border-white/[0.08] flex-shrink-0 cursor-pointer truncate tracking-tight ${fontPrimaryClass}`}
        style={{ width: `${colWidths.stage}%` }}
        title={displayName}
      >
        <span className="truncate hover:text-cyan-300 transition-colors">{displayName}</span>
      </div>

      {/* 2. Replacement Count (Right aligned, white bold text, large display) */}
      <div 
        className={`h-full flex items-center justify-end px-2 sm:px-3 text-slate-200 flex-shrink-0 border-r border-white/[0.08] whitespace-nowrap tabular-nums font-mono ${fontPrimaryClass}`}
        style={{ width: `${colWidths.replacement}%` }}
      >
        {isStdMissing ? (
          <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-slate-500 uppercase`}>STANDARD NOT SET</span>
        ) : (
          formatShots(item.lifeLimit)
        )}
      </div>

      {/* 3. Shot Count (High-contrast Glossy Emerald Pill, right aligned, extra large display) */}
      <div 
        className="h-full flex items-center justify-end px-1 sm:px-1.5 flex-shrink-0 border-r border-white/[0.08]"
        style={{ width: `${colWidths.shot}%` }}
      >
        <div className={`w-full h-full flex items-center justify-end px-2 sm:px-3 rounded-lg sm:rounded-xl whitespace-nowrap tabular-nums font-mono transition-all ${fontShotClass} ${
          item.lifeLimit > 0 
            ? 'bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.3)]' 
            : 'bg-white/[0.03] text-slate-400'
        }`}>
          {usedShotVal !== undefined && !isNaN(usedShotVal) ? (
            formatShots(usedShotVal)
          ) : (
            <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-slate-400 uppercase`}>NO DATA</span>
          )}
        </div>
      </div>

      {/* 4. Progress (Liquid Progress Chamber with Frosted Glass Trough) */}
      <div 
        className="h-full flex items-center justify-center flex-shrink-0 border-r border-white/[0.08] px-1 sm:px-2"
        style={{ width: `${colWidths.progress}%` }}
      >
        <div className="w-full h-full my-1 rounded-lg sm:rounded-xl liquid-progress-chamber flex items-center justify-center relative overflow-hidden border border-white/10">
          {item.lifeLimit > 0 && clampPercent > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 transition-all duration-300 bg-white/20 backdrop-blur-xs shadow-inner"
              style={{ width: `${clampPercent}%` }}
            />
          )}
          <span className={`relative z-10 select-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${fontProgressClass}`}>
            {item.lifeLimit > 0 ? `${percentVal}%` : '-'}
          </span>
        </div>
      </div>

      {/* 5. Life Time (Days) (Right aligned, white bold text, large display) */}
      <div 
        className={`h-full flex items-center justify-end px-2 sm:px-3 text-white flex-shrink-0 border-r border-white/[0.08] whitespace-nowrap tabular-nums font-mono ${fontPrimaryClass}`}
        style={{ width: `${colWidths.lifetime}%` }}
      >
        {lifeTimeDisplay}
      </div>

      {/* 6. Install Qty. (Right aligned, white bold text, large display) */}
      <div 
        className={`h-full flex items-center justify-end px-2 sm:px-3 text-white flex-shrink-0 border-r border-white/[0.08] whitespace-nowrap tabular-nums font-mono ${fontPrimaryClass}`}
        style={{ width: `${colWidths.installQty}%` }}
      >
        {item.installQty !== undefined && item.installQty > 0 ? (
          item.installQty
        ) : item.installQty === 0 ? (
          <span className={`${isCompact ? 'text-[9px]' : 'text-xs'} font-mono font-bold text-amber-400 uppercase`}>0 (NOT SET)</span>
        ) : (
          <span className={`${isCompact ? 'text-[8px]' : 'text-[10px] sm:text-xs'} font-mono font-bold text-slate-500 uppercase`}>NOT SET</span>
        )}
      </div>

      {/* 7. Stock Qty. (Right aligned, white bold text, large display) */}
      <div 
        className={`h-full flex items-center justify-end px-2 sm:px-3 text-white flex-shrink-0 border-r border-white/[0.08] whitespace-nowrap tabular-nums font-mono ${fontPrimaryClass}`}
        style={{ width: `${colWidths.stockQty}%` }}
      >
        {item.lineStockQty !== undefined || availableSpareVal !== undefined ? (
          <div className="flex flex-col items-end justify-center leading-none">
            <span className={`${(item.lineStockQty ?? availableSpareVal) === 0 ? 'text-rose-400' : 'text-white font-black'}`}>
              {item.lineStockQty ?? availableSpareVal}
            </span>
            {item.totalStockQty !== undefined && item.totalStockQty !== (item.lineStockQty ?? availableSpareVal) && (
              <span className={`${isCompact ? 'text-[9px]' : 'text-[10px] sm:text-[11px] md:text-[12px]'} text-slate-400 font-bold mt-0.5 font-sans`}>
                (รวม: {item.totalStockQty})
              </span>
            )}
          </div>
        ) : (
          <span className={`${isCompact ? 'text-[8px]' : 'text-[10px] sm:text-xs'} font-mono font-bold text-slate-500 uppercase`}>NO STOCK</span>
        )}
      </div>

      {/* 8. Order Require (3D Glossy Status Orb indicator matching Signal Standard) */}
      <div 
        onClick={() => onSelectModalItem(item)}
        className="h-full flex items-center justify-center px-2 flex-shrink-0 cursor-pointer select-none"
        style={{ width: `${colWidths.orderRequire}%` }}
        title={orderRequireTitle}
      >
        {needsOrder && (
          <div className="flex items-center justify-center">
            <span className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7'} inline-block ${orderRequireColor}`} />
          </div>
        )}
      </div>
    </div>
  );
});
