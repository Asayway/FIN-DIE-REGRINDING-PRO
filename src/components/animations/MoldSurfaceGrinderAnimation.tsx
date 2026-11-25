import React from 'react';
import { useLanguage } from '../../i18n';

interface MoldSurfaceGrinderAnimationProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  theme?: 'purple' | 'amber';
  showLabel?: boolean;
  className?: string;
  partName?: string;
}

/**
 * Animated High-Precision Surface Grinder Icon & Visual for Spare Part Molds
 * Depicts the Okamoto Surface Grinding process:
 * 1. High-speed spinning CBN grinding wheel with dynamic rotational blur
 * 2. Reciprocating precision magnetic chuck table sliding the mold punch/die
 * 3. Radiant micro-sparks and coolant sheen at the grinding contact interface
 */
export const MoldSurfaceGrinderAnimation: React.FC<MoldSurfaceGrinderAnimationProps> = ({
  size = 'sm',
  theme = 'purple',
  showLabel = false,
  className = '',
  partName
}) => {
  const sizeMap = {
    xs: { box: 'w-4 h-4', wheel: 14, tableW: 16, sparkSize: 'w-1 h-1' },
    sm: { box: 'w-6 h-6', wheel: 20, tableW: 24, sparkSize: 'w-1.5 h-1.5' },
    md: { box: 'w-10 h-10', wheel: 32, tableW: 38, sparkSize: 'w-2 h-2' },
    lg: { box: 'w-16 h-16', wheel: 48, tableW: 56, sparkSize: 'w-3 h-3' }
  };

  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const dim = sizeMap[size] || sizeMap.sm;
  const isPurple = theme === 'purple';

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      {/* Grinder Motion Graphic Container */}
      <div className={`relative ${dim.box} flex items-center justify-center shrink-0 overflow-hidden`}>
        {/* Glow behind grinding interface */}
        <div
          className={`absolute inset-0 rounded-full blur-[2px] animate-pulse ${
            isPurple ? 'bg-purple-500/30' : 'bg-amber-500/20'
          }`}
        />

        <svg
          viewBox="0 0 40 40"
          className={`w-full h-full ${
            isPurple
              ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]'
              : 'drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]'
          }`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wheel Spindle / Column Support */}
          <rect x="18" y="2" width="4" height="10" rx="1" fill="#64748b" opacity="0.8" />
          <line x1="16" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Spinning CBN Grinding Wheel */}
          <g className="origin-[20px_16px] animate-spin" style={{ animationDuration: '0.85s' }}>
            {/* Outer Abrasive Rim */}
            <circle
              cx="20"
              cy="16"
              r="10"
              stroke={isPurple ? '#c084fc' : '#f59e0b'}
              strokeWidth="2.5"
              strokeDasharray="3 2"
              fill="#1e1b4b"
            />
            {/* Inner Wheel Body */}
            <circle
              cx="20"
              cy="16"
              r="6"
              fill="#312e81"
              stroke={isPurple ? '#a855f7' : '#06b6d4'}
              strokeWidth="1"
            />
            {/* Center Arbor Nut */}
            <circle cx="20" cy="16" r="2.5" fill="#f8fafc" />
            {/* Wheel Spokes / Rotation markers */}
            <line x1="20" y1="10" x2="20" y2="22" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="14" y1="16" x2="26" y2="16" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="15.8" y1="11.8" x2="24.2" y2="20.2" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="24.2" y1="11.8" x2="15.8" y2="20.2" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
          </g>

          {/* Grinding Sparks Stream at Contact Tangent (x: 20, y: 26) */}
          <g className="animate-pulse">
            {/* Spark Trail 1 */}
            <path
              d="M20 26 C23 25, 27 24, 31 23"
              stroke={isPurple ? '#e879f9' : '#fbbf24'}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="2 1"
            />
            {/* Spark Trail 2 */}
            <path
              d="M20 26 C22 27, 26 28, 29 27"
              stroke={isPurple ? '#38bdf8' : '#f97316'}
              strokeWidth="1"
              strokeLinecap="round"
            />
            {/* Micro Spark Burst */}
            <circle cx="22" cy="25.5" r="1.2" fill="#fff" className="animate-ping" />
            <circle cx="26" cy="24" r="0.9" fill={isPurple ? '#f0abfc' : '#fef08a'} />
            <circle cx="29" cy="23.5" r="0.7" fill={isPurple ? '#a855f7' : '#f59e0b'} />
          </g>

          {/* Reciprocating Mold Spare Part Workpiece (PUNCH/DIE) */}
          <g>
            {/* Magnetic Table Base Line */}
            <rect x="4" y="33" width="32" height="3" rx="1" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
            
            {/* Mold Workpiece (slight horizontal reciprocating motion) */}
            <rect
              x="12"
              y="26"
              width="16"
              height="7"
              rx="1"
              fill={isPurple ? '#4f46e5' : '#0284c7'}
              stroke={isPurple ? '#818cf8' : '#38bdf8'}
              strokeWidth="1"
            />
            {/* Precision Ground Top Surface Sheen */}
            <line x1="13" y1="26" x2="27" y2="26" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />
            {/* Mold Punch Tip / Chamfer detail */}
            <line x1="16" y1="29.5" x2="24" y2="29.5" stroke="#e0f2fe" strokeWidth="0.8" strokeDasharray="1 1" />
          </g>
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span
            className={`text-[11px] font-black flex items-center gap-1 ${
              isPurple ? 'text-purple-300' : 'text-amber-300'
            }`}
          >
            <span>{isEn ? 'Grinding' : 'กำลังเจียรราบ'}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full animate-ping inline-block ${
                isPurple ? 'bg-purple-400' : 'bg-amber-400'
              }`}
            />
          </span>
          {partName && (
            <span className="text-[9.5px] font-mono text-slate-300 truncate max-w-[120px]">
              {partName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
