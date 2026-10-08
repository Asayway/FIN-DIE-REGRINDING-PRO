import React from 'react';
import { ProductionLineId, LINE_INFO_MAP, LineInfoDetails } from '../../types';
import { storageService } from '../../services/storageService';
import { Layers } from 'lucide-react';

export interface LineFilterSelectorProps {
  selectedLine: ProductionLineId | 'ALL' | string;
  onSelectLine: (lineId: any) => void;
  allowAll?: boolean;
  allLabel?: string;
  isHmi?: boolean;
  label?: string;
  className?: string;
  showStatusDot?: boolean;
  showShortTag?: boolean;
}

const LINES_LIST: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

export const LineFilterSelector: React.FC<LineFilterSelectorProps> = ({
  selectedLine,
  onSelectLine,
  allowAll = false,
  allLabel = 'ALL 7 LINES (E1-E5)',
  isHmi = false,
  label = 'LINE:',
  className = '',
  showStatusDot = true,
  showShortTag = true
}) => {
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 flex-wrap ${className}`}>
      {label && (
        <span className="text-[11px] font-mono font-bold tracking-wider uppercase mr-0.5 flex items-center gap-1 text-cyan-400">
          {label}
        </span>
      )}

      {allowAll && (
        <button
          type="button"
          onClick={() => onSelectLine('ALL')}
          className={`liquid-pill px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap active:scale-95 cursor-pointer ${
            selectedLine === 'ALL'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 border-none shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10 hover:text-white'
          }`}
        >
          <Layers className="w-3 h-3 opacity-80" />
          <span>{allLabel}</span>
        </button>
      )}

      {LINES_LIST.map(line => {
        const info: LineInfoDetails = LINE_INFO_MAP[line] || {
          id: line,
          name: `LINE ${line}`,
          nameTh: line,
          shortTag: line,
          tubeSize: 'Ø7',
          finType: 'Slit',
          description: line
        };
        const isSelected = selectedLine === line;
        const lineMon = storageService.getLineMonitoring(line);
        const lineStatus = lineMon?.machineStatus || 'RUNNING';
        const displayLine = line.startsWith('E3-') ? line : line;

        return (
          <button
            key={line}
            type="button"
            onClick={() => onSelectLine(line)}
            className={`liquid-pill px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap active:scale-95 cursor-pointer ${
              isSelected
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 border-none shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/10'
            }`}
          >
            {showStatusDot && (
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  lineStatus === 'RUNNING'
                    ? 'bg-emerald-400 animate-pulse'
                    : lineStatus === 'IDLE'
                    ? 'bg-amber-400'
                    : lineStatus === 'MAINTENANCE'
                    ? 'bg-cyan-400'
                    : 'bg-rose-500'
                }`}
                title={`Status: ${lineStatus}`}
              />
            )}

            <span>{displayLine}</span>

            {showShortTag && (
              <span
                className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected
                    ? 'bg-black/40 text-cyan-300 font-bold border border-cyan-400/40'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {info.shortTag || line}
              </span>
            )}

            {lineStatus === 'IDLE' && (
              <span className="text-[8.5px] font-extrabold px-1 py-0 rounded bg-amber-950/90 text-amber-300 border border-amber-600/70 hidden xl:inline">
                IDLE
              </span>
            )}

            {lineStatus === 'MAINTENANCE' && (
              <span className="text-[8.5px] font-extrabold px-1 py-0 rounded bg-sky-950/90 text-sky-300 border border-sky-600/70 hidden xl:inline">
                MAINT
              </span>
            )}

            {lineStatus === 'STOPPED' && (
              <span className="text-[8.5px] font-extrabold px-1 py-0 rounded bg-rose-950/90 text-rose-300 border border-rose-600/70 hidden xl:inline">
                OFF
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
