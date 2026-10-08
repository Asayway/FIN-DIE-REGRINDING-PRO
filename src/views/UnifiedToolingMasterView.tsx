import React, { useState } from 'react';
import { 
  Box, 
  Factory,
  Grid3X3,
  Sliders
} from 'lucide-react';
import { LineDieSpecificationView } from './LineDieSpecificationView';
import { PartMasterView } from './PartMasterView';
import { InstallQuantityMatrixView } from './InstallQuantityMatrixView';
import { StockQuantityMatrixView } from './StockQuantityMatrixView';
import { PartLifeStandardSetupView } from './PartLifeStandardSetupView';
import { useLanguage } from '../i18n';

interface UnifiedToolingMasterViewProps {
  initialTab?: 'specs' | 'master' | 'matrix' | 'install' | 'stock';
}

export const UnifiedToolingMasterView: React.FC<UnifiedToolingMasterViewProps> = ({
  initialTab = 'specs'
}) => {
  const { language } = useLanguage();
  const getInitialTab = (): 'specs' | 'master' | 'matrix' | 'stock' => {
    if (initialTab === 'install' || initialTab === 'matrix') return 'matrix';
    if (initialTab === 'stock') return 'stock';
    if (initialTab === 'master') return 'master';
    return 'specs';
  };

  const [activeTab, setActiveTab] = useState<'specs' | 'master' | 'matrix' | 'stock'>(getInitialTab());

  return (
    <div className="space-y-4 animate-fadeIn font-sans text-white pb-6 px-2 sm:px-4 pt-2">
      
      {/* Sub-Tabs Navigation Bar (Sticky Locked at Top Floating Glass Island) */}
      <div className="sticky top-2 z-30 liquid-glass-island border border-white/15 p-2 sm:p-2.5 shadow-2xl rounded-2xl sm:rounded-full backdrop-blur-2xl flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-nowrap font-mono min-w-max">
          <button
            id="tab-specs"
            onClick={() => setActiveTab('specs')}
            className={`liquid-pill rounded-full px-3.5 sm:px-5 py-2 font-bold text-xs sm:text-sm cursor-pointer flex items-center gap-2 active:scale-95 ${
              activeTab === 'specs'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>
              {language === 'TH' ? '1. สเปคแม่พิมพ์ไลน์' : '1. LINE SPEC'}
            </span>
          </button>

          <button
            id="tab-master"
            onClick={() => setActiveTab('master')}
            className={`liquid-pill rounded-full px-3.5 sm:px-5 py-2 font-bold text-xs sm:text-sm cursor-pointer flex items-center gap-2 active:scale-95 ${
              activeTab === 'master'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>
              {language === 'TH' ? '2. มาสเตอร์ชิ้นส่วน' : '2. PART MASTER'}
            </span>
          </button>

          <button
            id="tab-matrix"
            onClick={() => setActiveTab('matrix')}
            className={`liquid-pill rounded-full px-3.5 sm:px-5 py-2 font-bold text-xs sm:text-sm cursor-pointer flex items-center gap-2 active:scale-95 ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>
              {language === 'TH' ? '3. จำนวนติดตั้งชิ้นส่วน' : '3. PART INSTALL'}
            </span>
          </button>

          <button
            id="tab-stock"
            onClick={() => setActiveTab('stock')}
            className={`liquid-pill rounded-full px-3.5 sm:px-5 py-2 font-bold text-xs sm:text-sm cursor-pointer flex items-center gap-2 active:scale-95 ${
              activeTab === 'stock'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>
              {language === 'TH' ? '4. จำนวนสต็อกอะไหล่' : '4. STOCK MATRIX'}
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'specs' && (
        <div className="pt-0.5">
          <LineDieSpecificationView onAddNewPartClick={() => setActiveTab('master')} />
        </div>
      )}

      {activeTab === 'master' && (
        <div className="pt-0.5">
          <PartMasterView />
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="pt-0.5">
          <InstallQuantityMatrixView onNavigateToMaster={() => setActiveTab('master')} />
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="pt-0.5">
          <StockQuantityMatrixView onNavigateToMaster={() => setActiveTab('master')} />
        </div>
      )}
    </div>
  );
};

