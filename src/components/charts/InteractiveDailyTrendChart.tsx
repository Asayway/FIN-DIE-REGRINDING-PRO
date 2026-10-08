import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Sparkles, Layers, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export type ChartType = 'BAR' | 'AREA' | 'COMBO';

export interface DailyChartPoint {
  day: number;
  count: number;
  label?: string;
  subValue?: string;
}

interface InteractiveDailyTrendChartProps {
  title: string;
  subtitle?: string;
  totalLabel?: string;
  data: DailyChartPoint[];
  colorTheme?: 'emerald' | 'rose' | 'cyan' | 'blue';
  height?: number;
  monthLabel?: string;
  unit?: string;
  showControls?: boolean;
  defaultChartType?: ChartType;
  benchmarkValue?: number;
  benchmarkLabel?: string;
  extraKpiValue?: string; // Optional e.g. "มูลค่าเสียหาย: ฿829,500"
  headerAction?: React.ReactNode;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const InteractiveDailyTrendChart: React.FC<InteractiveDailyTrendChartProps> = ({
  title,
  subtitle,
  totalLabel,
  data,
  colorTheme = 'emerald',
  height = 230,
  monthLabel = '',
  unit = 'งาน',
  showControls = true,
  defaultChartType = 'COMBO',
  benchmarkValue,
  benchmarkLabel = 'เป้าหมาย',
  extraKpiValue,
  headerAction,
  collapsible = true,
  isCollapsed,
  onToggleCollapse
}) => {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const [chartHeight, setChartHeight] = useState<number>(height);
  const [isDraggingHeight, setIsDraggingHeight] = useState<boolean>(false);

  // Sync if prop height changes externally
  React.useEffect(() => {
    setChartHeight(height);
  }, [height]);

  const handleStartResizeHeight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = chartHeight;
    setIsDraggingHeight(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const nextHeight = Math.max(120, Math.min(520, startHeight + deltaY));
      setChartHeight(nextHeight);
    };

    const onMouseUp = () => {
      setIsDraggingHeight(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isCurrentCollapsed = isCollapsed !== undefined ? isCollapsed : internalCollapsed;
  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Theme styling definitions
  const theme = useMemo(() => {
    switch (colorTheme) {
      case 'rose':
        return {
          primary: '#f43f5e',
          secondary: '#fb7185',
          dark: '#881337',
          glow: 'rgba(244, 63, 94, 0.4)',
          gradientId: 'roseGradient',
          barGradientFrom: 'from-rose-600',
          barGradientTo: 'to-rose-400',
          textClass: 'text-rose-400',
          bgBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          borderHover: 'border-rose-400',
          glowClass: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]',
          pointFill: '#fda4af'
        };
      case 'cyan':
      case 'blue':
        return {
          primary: '#06b6d4',
          secondary: '#38bdf8',
          dark: '#083344',
          glow: 'rgba(6, 182, 212, 0.4)',
          gradientId: 'cyanGradient',
          barGradientFrom: 'from-cyan-600',
          barGradientTo: 'to-blue-400',
          textClass: 'text-cyan-400',
          bgBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          borderHover: 'border-cyan-400',
          glowClass: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]',
          pointFill: '#7dd3fc'
        };
      case 'emerald':
      default:
        return {
          primary: '#10b981',
          secondary: '#34d399',
          dark: '#064e3b',
          glow: 'rgba(16, 185, 129, 0.4)',
          gradientId: 'emeraldGradient',
          barGradientFrom: 'from-emerald-600',
          barGradientTo: 'to-teal-400',
          textClass: 'text-emerald-400',
          bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          borderHover: 'border-emerald-400',
          glowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
          pointFill: '#6ee7b7'
        };
    }
  }, [colorTheme]);

  // Aggregate stats
  const { maxCount, totalMonth, peakDay, avgDaily } = useMemo(() => {
    const total = data.reduce((acc, d) => acc + d.count, 0);
    const max = Math.max(...data.map(d => d.count), 1);
    const peak = data.reduce((maxItem, d) => (d.count > maxItem.count ? d : maxItem), data[0] || { day: 1, count: 0 });
    const avg = data.length > 0 ? (total / data.length).toFixed(1) : '0';
    return { maxCount: max, totalMonth: total, peakDay: peak, avgDaily: avg };
  }, [data]);

  // SVG Dimensions & Smooth Path Calculations (Maximized to stretch 100% Full Width across App container)
  const svgWidth = 1400;
  const svgHeight = chartHeight;
  const paddingX = 24;
  const paddingTop = 22;
  const paddingBottom = 22;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  // Compute coordinates for each day
  const points = useMemo(() => {
    if (!data.length) return [];
    return data.map((d, i) => {
      const x = paddingX + (i / Math.max(data.length - 1, 1)) * usableWidth;
      const y = paddingTop + usableHeight - (d.count / maxCount) * usableHeight;
      return { ...d, x, y };
    });
  }, [data, maxCount, usableWidth, usableHeight]);

  // Generate smooth cubic bezier SVG path for line and area
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      const p = points[0];
      return { linePath: `M ${p.x} ${p.y}`, areaPath: `M ${p.x} ${p.y} L ${p.x} ${svgHeight - paddingBottom} Z` };
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baselineY = svgHeight - paddingBottom;
    const aPath = `${d} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

    return { linePath: d, areaPath: aPath };
  }, [points, svgHeight, paddingBottom]);

  const hoveredPoint = useMemo(() => {
    if (hoveredDay === null) return null;
    return points.find(p => p.day === hoveredDay) || null;
  }, [hoveredDay, points]);

  // Collapsed Minimal Strip View (Maximizes Viewport Space for 31-day Table)
  if (isCurrentCollapsed) {
    return (
      <div className="bg-[#080e1a]/95 border border-white/10 rounded-xl px-3 py-2 shadow-lg backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 font-sans transition-all">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`p-1 rounded-md border ${theme.bgBadge}`}>
            <BarChart3 className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
            {title}
          </h3>
          {monthLabel && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/[0.05] text-slate-300 border border-white/10">
              {monthLabel}
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            (พับเก็บกราฟอยู่ • กำลังแสดงตารางเต็มจอ)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#050b14] border border-white/10 font-mono text-[11px] h-6">
            <span className="text-slate-400 text-[10px]">{totalLabel || 'รวม'}:</span>
            <strong className={`font-black ${theme.textClass}`}>
              {totalMonth} {unit}
            </strong>
          </div>

          {extraKpiValue ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#050b14] border border-amber-500/30 font-mono text-[11px] h-6">
              <strong className="text-amber-300 text-[10.5px] font-bold">
                {extraKpiValue}
              </strong>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#050b14] border border-cyan-500/30 font-mono text-[11px] h-6">
              <span className="text-slate-400 text-[10px]">เฉลี่ย:</span>
              <strong className="text-cyan-300 text-[10.5px] font-bold">
                {avgDaily} {unit}/วัน
              </strong>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#050b14] border border-amber-500/30 font-mono text-[11px] h-6">
            <span className="text-slate-400 text-[10px]">สูงสุด:</span>
            <strong className="text-amber-300 text-[10.5px] font-bold">
              วันที่ {peakDay.day} ({peakDay.count})
            </strong>
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={toggleCollapse}
              className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-lg border shadow-sm transition-all cursor-pointer h-6 ${theme.bgBadge} hover:brightness-125`}
              title="ขยายดูกราฟสถิติรายวัน"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>ขยายดูกราฟ</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080e1a]/95 border border-white/10 rounded-xl p-2.5 sm:p-3 shadow-xl backdrop-blur-xl space-y-1.5 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: theme.primary }}
      />

      {/* Header bar with controls & Unified Metric Cards - Single Uncluttered Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`p-1.5 rounded-lg border ${theme.bgBadge}`}>
            <BarChart3 className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider font-mono">
              {title}
            </h3>
            {monthLabel && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/[0.05] text-slate-300 border border-white/10">
                {monthLabel}
              </span>
            )}
            {headerAction && <div className="ml-1">{headerAction}</div>}
          </div>
        </div>

        {/* All KPI Badges & Chart Mode Controls Combined (No Duplicate Cards!) */}
        <div className="flex items-center gap-1.5 flex-wrap justify-between xl:justify-end">
          {/* Total Accumulated Metric */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#050b14] border border-white/10 font-mono text-xs h-7">
            <span className="text-slate-400 text-[10px]">{totalLabel || 'รวมสะสม'}:</span>
            <strong className={`font-black ${theme.textClass}`}>
              {totalMonth} {unit}
            </strong>
          </div>

          {/* Extra KPI if provided (e.g. Cost or Avg) */}
          {extraKpiValue ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#050b14] border border-amber-500/30 font-mono text-xs h-7">
              <strong className="text-amber-300 text-[11px] font-bold">
                {extraKpiValue}
              </strong>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#050b14] border border-cyan-500/30 font-mono text-xs h-7">
              <span className="text-slate-400 text-[10px]">เฉลี่ย/วัน:</span>
              <strong className="text-cyan-300 text-xs font-bold">
                {avgDaily} {unit}
              </strong>
            </div>
          )}

          {/* Peak Day Metric */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#050b14] border border-amber-500/30 font-mono text-xs h-7">
            <span className="text-slate-400 text-[10px]">สูงสุด:</span>
            <strong className="text-amber-300 text-xs font-bold">
              วันที่ {peakDay.day} ({peakDay.count})
            </strong>
          </div>

          {/* Chart Type Selector Pill Group */}
          {showControls && (
            <div className="bg-slate-950/90 p-0.5 rounded-lg border border-slate-700/80 flex items-center gap-0.5 font-mono text-[10px] h-7 ml-1">
              <button
                type="button"
                onClick={() => setChartType('BAR')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 h-6 ${
                  chartType === 'BAR'
                    ? `${theme.bgBadge} font-black shadow-sm`
                    : 'text-slate-400 hover:text-white'
                }`}
                title="กราฟแท่ง (Bar Chart)"
              >
                <BarChart3 className="w-3 h-3" />
                <span>แท่ง</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('AREA')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 h-6 ${
                  chartType === 'AREA'
                    ? `${theme.bgBadge} font-black shadow-sm`
                    : 'text-slate-400 hover:text-white'
                }`}
                title="กราฟพื้นที่เส้นเรียบ (Smooth Area Line)"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Area</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('COMBO')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 h-6 ${
                  chartType === 'COMBO'
                    ? `${theme.bgBadge} font-black shadow-sm`
                    : 'text-slate-400 hover:text-white'
                }`}
                title="กราฟผสม แท่ง + เส้นเรืองแสง (Combo)"
              >
                <Sparkles className="w-3 h-3" />
                <span>ผสม</span>
              </button>
            </div>
          )}

          {/* Free Height Slider Control */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#050b14] border border-white/10 font-mono text-[10px] h-7">
            <span className="text-slate-400">ปรับความสูง:</span>
            <input
              type="range"
              min={130}
              max={480}
              step={5}
              value={chartHeight}
              onChange={e => setChartHeight(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title="เลื่อนสไลด์เพื่อปรับขนาดความสูงของกราฟได้อิสระ"
            />
            <span className="text-cyan-300 font-bold min-w-[34px] text-right">{chartHeight}px</span>
          </div>

          {/* Collapse Toggle Button */}
          {collapsible && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 transition-all cursor-pointer h-7 ml-1"
              title="พับเก็บกราฟเพื่อขยายตาราง 31 วันเต็มจอ"
            >
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>พับเก็บกราฟ</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Canvas - Stretched 100% Full Width across frame */}
      <div className="relative w-full select-none">
        {/* SVG Drawing Canvas */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full block overflow-visible"
          style={{ width: '100%', height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}
        >
          <defs>
            {/* Area Fill Gradient */}
            <linearGradient id={theme.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.45" />
              <stop offset="60%" stopColor={theme.secondary} stopOpacity="0.15" />
              <stop offset="100%" stopColor={theme.dark} stopOpacity="0.0" />
            </linearGradient>

            {/* Bar Gradient */}
            <linearGradient id={`${theme.gradientId}_bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.secondary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={theme.primary} stopOpacity="0.3" />
            </linearGradient>

            {/* Bar Peak Gradient */}
            <linearGradient id={`${theme.gradientId}_peak`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id={`glow_${colorTheme}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Gridlines & Scale Indicators */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={svgWidth - paddingX}
            y2={paddingTop}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />
          <text
            x={svgWidth - paddingX}
            y={paddingTop - 6}
            textAnchor="end"
            fill="rgba(148, 163, 184, 0.6)"
            fontSize="10"
            fontFamily="monospace"
          >
            {maxCount} {unit} Max
          </text>

          <line
            x1={paddingX}
            y1={paddingTop + usableHeight / 2}
            x2={svgWidth - paddingX}
            y2={paddingTop + usableHeight / 2}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <text
            x={svgWidth - paddingX}
            y={paddingTop + usableHeight / 2 - 4}
            textAnchor="end"
            fill="rgba(148, 163, 184, 0.4)"
            fontSize="9"
            fontFamily="monospace"
          >
            {Math.round(maxCount / 2)}
          </text>

          {/* Benchmark Line if specified */}
          {benchmarkValue !== undefined && benchmarkValue > 0 && (
            <>
              <line
                x1={paddingX}
                y1={paddingTop + usableHeight - (benchmarkValue / maxCount) * usableHeight}
                x2={svgWidth - paddingX}
                y2={paddingTop + usableHeight - (benchmarkValue / maxCount) * usableHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.8"
              />
              <text
                x={paddingX + 8}
                y={paddingTop + usableHeight - (benchmarkValue / maxCount) * usableHeight - 4}
                fill="#fbbf24"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {benchmarkLabel} ({benchmarkValue})
              </text>
            </>
          )}

          {/* Baseline */}
          <line
            x1={paddingX}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingBottom}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />

          {/* 1. AREA LAYER (Rendered for AREA and COMBO) */}
          {(chartType === 'AREA' || chartType === 'COMBO') && (
            <>
              <path d={areaPath} fill={`url(#${theme.gradientId})`} />
              <path
                d={linePath}
                fill="none"
                stroke={theme.primary}
                strokeWidth={chartType === 'COMBO' ? '2.5' : '3'}
                filter={`url(#glow_${colorTheme})`}
              />
            </>
          )}

          {/* 2. BARS LAYER (Rendered for BAR and COMBO) */}
          {(chartType === 'BAR' || chartType === 'COMBO') && (
            <g>
              {points.map(p => {
                const barWidth = Math.max(6, Math.min(usableWidth / (points.length * 2.2), 22));
                const barHeight = Math.max(2, (p.count / maxCount) * usableHeight);
                const isPeak = p.day === peakDay.day && p.count > 0;
                const isHovered = hoveredDay === p.day;
                const barX = p.x - barWidth / 2;
                const barY = svgHeight - paddingBottom - barHeight;

                return (
                  <g key={`bar-${p.day}`}>
                    {/* Background hover highlight pillar */}
                    <rect
                      x={p.x - usableWidth / points.length / 2}
                      y={paddingTop}
                      width={usableWidth / points.length}
                      height={usableHeight}
                      fill={isHovered ? 'rgba(255,255,255,0.06)' : 'transparent'}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDay(p.day)}
                      onMouseLeave={() => setHoveredDay(null)}
                    />

                    {/* Actual Bar */}
                    {p.count > 0 && (
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx={barWidth / 3}
                        fill={
                          isPeak
                            ? `url(#${theme.gradientId}_peak)`
                            : `url(#${theme.gradientId}_bar)`
                        }
                        stroke={isHovered ? '#ffffff' : isPeak ? '#f59e0b' : 'none'}
                        strokeWidth={isHovered ? 1.5 : 0}
                        opacity={chartType === 'COMBO' ? 0.75 : 0.95}
                        className="transition-all duration-200 cursor-pointer pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 3. POINTS & NUMBERS LAYER */}
          <g>
            {points.map(p => {
              const isPeak = p.day === peakDay.day && p.count > 0;
              const isHovered = hoveredDay === p.day;

              return (
                <g key={`point-${p.day}`} className="pointer-events-none">
                  {/* Point for Area / Combo */}
                  {(chartType === 'AREA' || chartType === 'COMBO' || isHovered) && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : isPeak ? 4.5 : 3}
                      fill={isHovered ? '#ffffff' : isPeak ? '#f59e0b' : theme.pointFill}
                      stroke={theme.dark}
                      strokeWidth="1.5"
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Top value label */}
                  {p.count > 0 && (
                    <text
                      x={p.x}
                      y={p.y - 7}
                      textAnchor="middle"
                      fill={isHovered ? '#ffffff' : isPeak ? '#fbbf24' : 'rgba(203, 213, 225, 0.85)'}
                      fontSize={isHovered || isPeak ? '10' : '8.5'}
                      fontWeight={isHovered || isPeak ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      className="transition-all duration-150"
                    >
                      {p.count}
                    </text>
                  )}

                  {/* Day label along bottom */}
                  <text
                    x={p.x}
                    y={svgHeight - paddingBottom + 15}
                    textAnchor="middle"
                    fill={isHovered ? '#ffffff' : isPeak ? '#fbbf24' : 'rgba(148, 163, 184, 0.8)'}
                    fontSize={isPeak || isHovered ? '10' : '8.5'}
                    fontWeight={isPeak || isHovered ? 'bold' : 'normal'}
                    fontFamily="monospace"
                  >
                    {p.day}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Vertical guideline for hovered point */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={svgHeight - paddingBottom}
              stroke="rgba(255,255,255,0.4)"
              strokeDasharray="2 2"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className={`absolute z-30 pointer-events-none p-2 rounded-xl bg-slate-950/95 border ${theme.borderHover} shadow-2xl backdrop-blur-md text-[11px] font-mono text-white animate-scaleIn`}
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1 font-bold">
              <span className={theme.textClass}>
                วันที่ {hoveredPoint.day} {monthLabel}
              </span>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                {((hoveredPoint.count / Math.max(totalMonth, 1)) * 100).toFixed(1)}% ของเดือน
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>ปริมาณงาน:</span>
              <strong className={`text-sm ${theme.textClass}`}>
                {hoveredPoint.count} {unit}
              </strong>
            </div>
            {hoveredPoint.day === peakDay.day && (
              <div className="mt-1 pt-1 border-t border-white/10 text-[9.5px] text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>วันที่มีปริมาณงานสูงสุดในรอบเดือน (Peak Day)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Benchmark & Stats Bar - Compact with Free Vertical Resize Handle */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
            <span>เฉลี่ย: <strong className="text-white">{avgDaily}</strong> {unit}/วัน</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>สูงสุด: <strong className="text-amber-400">วันที่ {peakDay.day} ({peakDay.count} {unit})</strong></span>
          </span>
        </div>

        <div
          onMouseDown={handleStartResizeHeight}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md cursor-ns-resize select-none transition-colors ${
            isDraggingHeight
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
              : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-cyan-300 border border-white/10'
          }`}
          title="คลิกค้างแล้วลากขึ้น-ลง เพื่อปรับขนาดความสูงของกราฟได้อิสระ"
        >
          <span className="w-6 h-1 rounded-full bg-cyan-400/60" />
          <span className="text-[9.5px]">ลากปรับขนาดกราฟ ({chartHeight}px)</span>
        </div>
      </div>
    </div>
  );
};
