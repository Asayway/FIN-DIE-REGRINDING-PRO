import React, { useState } from 'react';

interface ToolingPicThumbnailProps {
  picCategory?: string;
  partName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showZoomOnClick?: boolean;
  className?: string;
}

export const ToolingPicThumbnail: React.FC<ToolingPicThumbnailProps> = ({
  picCategory = 'burring_7',
  partName = 'Tooling Element',
  size = 'md',
  showZoomOnClick = true,
  className = ''
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const getDimensions = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-10 h-10';
      case 'lg': return 'w-14 h-14';
      case 'xl': return 'w-24 h-24';
      default: return 'w-10 h-10';
    }
  };

  const renderToolingVector = (zoom: boolean = false) => {
    const strokeCol = '#334155';
    const bodyFill = '#94a3b8';
    const highlightFill = '#cbd5e1';
    const shadowFill = '#64748b';
    const edgeCol = '#0284c7';

    switch (picCategory) {
      case 'burring_7':
      case 'burring_5':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Cylindrical Stepped Punch with Flange */}
            <rect x="22" y="6" width="16" height="12" rx="1.5" fill={highlightFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="16" y="18" width="28" height="6" rx="1.5" fill={shadowFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="20" y="24" width="20" height="24" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            {/* Fluted Cutting Tip */}
            <path d="M22 48 L22 54 L30 57 L38 54 L38 48 Z" fill={edgeCol} stroke={strokeCol} strokeWidth="1.5" />
            <line x1="30" y1="24" x2="30" y2="48" stroke={highlightFill} strokeWidth="2" strokeDasharray="3 2" />
          </svg>
        );

      case 'pierce_7':
      case 'pierce_5':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Guide Pierce Punch with Sharp Ground Tip */}
            <rect x="23" y="6" width="14" height="10" rx="1.5" fill={highlightFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="18" y="16" width="24" height="6" rx="1" fill={shadowFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="24" y="22" width="12" height="26" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            <polygon points="24,48 30,56 36,48" fill="#e11d48" stroke={strokeCol} strokeWidth="1.5" />
            <circle cx="30" cy="20" r="1.5" fill="#f8fafc" />
          </svg>
        );

      case 'slit_blade_7':
      case 'slit_blade_5a':
      case 'slit_blade_5b':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Rectangular Slitter Blade with Mounting Counterbores */}
            <rect x="6" y="18" width="48" height="24" rx="2" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            {/* Razor Edge Grinding Bevel */}
            <rect x="6" y="38" width="48" height="4" fill={edgeCol} stroke={strokeCol} strokeWidth="1" />
            {/* Screw Mounting Holes */}
            <circle cx="16" cy="30" r="4" fill="#1e293b" stroke={highlightFill} strokeWidth="1.5" />
            <circle cx="44" cy="30" r="4" fill="#1e293b" stroke={highlightFill} strokeWidth="1.5" />
            <line x1="8" y1="21" x2="52" y2="21" stroke={highlightFill} strokeWidth="1.5" />
          </svg>
        );

      case 'side_cut_punch_7':
      case 'side_cut_punch_5':
      case 'cut_off_punch_7':
      case 'cut_off_punch_5':
      case 'cut_off_punch_e6':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Heavy Punch Block with Shear Angle */}
            <polygon points="12,12 48,12 48,46 12,52" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            <polygon points="12,46 48,42 48,46 12,52" fill="#d97706" stroke={strokeCol} strokeWidth="1.5" />
            <circle cx="22" cy="22" r="3" fill="#1e293b" />
            <circle cx="38" cy="22" r="3" fill="#1e293b" />
            <line x1="14" y1="14" x2="46" y2="14" stroke={highlightFill} strokeWidth="2" />
          </svg>
        );

      case 'side_cut_die_7':
      case 'side_cut_die_5':
      case 'cut_off_die_7':
      case 'cut_off_die_5':
      case 'cut_off_die_e6':
      case 'slit_die_he5':
      case 'notching_die_7':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Bottom Die Insert Block with Cavity Slot */}
            <rect x="8" y="14" width="44" height="32" rx="2" fill={shadowFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="18" y="22" width="24" height="16" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="12" cy="18" r="2" fill="#cbd5e1" />
            <circle cx="48" cy="18" r="2" fill="#cbd5e1" />
            <circle cx="12" cy="42" r="2" fill="#cbd5e1" />
            <circle cx="48" cy="42" r="2" fill="#cbd5e1" />
          </svg>
        );

      case 'expander_clamp':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Expander M/C Clamp Block */}
            <rect x="10" y="10" width="40" height="40" rx="3" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            <rect x="16" y="24" width="28" height="12" rx="2" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="14" y1="18" x2="46" y2="18" stroke={highlightFill} strokeWidth="1.5" />
          </svg>
        );

      case 'brass_bushing':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Brass / Bronze Bushing Ring */}
            <circle cx="30" cy="30" r="22" fill="#d97706" stroke="#78350f" strokeWidth="2" />
            <circle cx="30" cy="30" r="14" fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" />
            <circle cx="30" cy="30" r="8" fill="#0f172a" stroke="#78350f" strokeWidth="1.5" />
            {/* Oil Grooves */}
            <line x1="16" y1="30" x2="44" y2="30" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        );

      case 'shim_washer':
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Precision Ground Shim Ring */}
            <circle cx="30" cy="30" r="20" fill={highlightFill} stroke={strokeCol} strokeWidth="1.5" />
            <circle cx="30" cy="30" r="10" fill="#0f172a" stroke={strokeCol} strokeWidth="1.5" />
            <circle cx="30" cy="30" r="16" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm">
            {/* Generic Precision Tooling Silhouette */}
            <rect x="14" y="10" width="32" height="40" rx="3" fill={bodyFill} stroke={strokeCol} strokeWidth="1.5" />
            <line x1="20" y1="20" x2="40" y2="20" stroke={highlightFill} strokeWidth="2" />
            <line x1="20" y1="30" x2="40" y2="30" stroke={highlightFill} strokeWidth="2" />
            <circle cx="30" cy="40" r="3" fill="#0284c7" />
          </svg>
        );
    }
  };

  return (
    <>
      <div
        onClick={() => showZoomOnClick && setIsZoomOpen(true)}
        className={`relative inline-flex items-center justify-center rounded-lg p-1 bg-slate-800/80 border border-slate-700/80 hover:border-cyan-400/80 hover:bg-slate-700/90 transition-all flex-shrink-0 group ${getDimensions()} ${showZoomOnClick ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
        title={`คลิกเพื่อดูรูปภาพ CAD/Pic ขนาดใหญ่: ${partName}`}
      >
        {renderToolingVector(false)}

        {showZoomOnClick && (
          <div className="absolute inset-0 bg-cyan-900/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
            <span className="text-[9px] font-bold text-cyan-200 bg-slate-900/90 px-1 py-0.5 rounded shadow">
              Zoom
            </span>
          </div>
        )}
      </div>

      {/* Large Tooling CAD & Real Photo Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                  {partName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Category: {picCategory.toUpperCase()} | Precision Tooling Pic
                </p>
              </div>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* High-Resolution CAD & Silhouette Display */}
            <div className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-xl p-8 border border-slate-800 flex items-center justify-center shadow-inner h-56">
              <div className="w-36 h-36">
                {renderToolingVector(true)}
              </div>
              
              {/* Precision Engineering Crosshair Overlays */}
              <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 rounded-xl m-2 flex items-center justify-center">
                <div className="w-full h-px bg-cyan-500/15" />
                <div className="h-full w-px bg-cyan-500/15 absolute" />
              </div>
              <div className="absolute bottom-2 right-3 text-[10px] font-mono text-cyan-400/80 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-900/60">
                1:1 Scale CAD View
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ชื่อชิ้นส่วน (Part Name):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{partName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">มาตรฐานผิวก่อน-หลังเจียร:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-300">Ra ≤ 0.12 µm / HRC 62-64</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ฟังก์ชันการทำงาน:</span>
                <span className="text-slate-700 dark:text-slate-300">เทียบภาพเพื่อป้องกันการหยิบสลับชิ้นทูลลิ่งในไลน์</span>
              </div>
            </div>

            <button
              onClick={() => setIsZoomOpen(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              ปิดหน้าต่าง (Close Preview)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
