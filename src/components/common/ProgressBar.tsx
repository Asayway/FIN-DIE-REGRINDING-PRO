import React from 'react';

interface ProgressBarProps {
  percent: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  showText = true,
  size = 'md',
  className = ''
}) => {
  const clamped = Math.min(100, Math.max(0, percent));

  let barBg = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let borderGlow = 'border-emerald-700/50';

  if (percent >= 100) {
    barBg = 'bg-red-600';
    textColor = 'text-red-400 font-bold';
    borderGlow = 'border-red-600 animate-pulse';
  } else if (percent >= 95) {
    barBg = 'bg-rose-500';
    textColor = 'text-rose-400 font-bold';
    borderGlow = 'border-rose-600 animate-pulse';
  } else if (percent >= 85) {
    barBg = 'bg-amber-500';
    textColor = 'text-amber-400';
    borderGlow = 'border-amber-600';
  } else if (percent >= 70) {
    barBg = 'bg-yellow-400';
    textColor = 'text-yellow-300';
    borderGlow = 'border-yellow-600';
  }

  const heightClass = size === 'sm' ? 'h-4' : size === 'lg' ? 'h-7' : 'h-5';

  return (
    <div className={`relative w-full bg-slate-900/90 rounded-sm border ${borderGlow} overflow-hidden flex items-center ${heightClass} ${className}`}>
      <div
        className={`h-full ${barBg} transition-all duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
      {showText && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {percent}%
        </span>
      )}
    </div>
  );
};
