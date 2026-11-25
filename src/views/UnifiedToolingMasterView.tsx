import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Factory,
  Grid3X3,
  Tag
} from 'lucide-react';
import { LineDieSpecificationView } from './LineDieSpecificationView';
import { PartMasterView } from './PartMasterView';
import { InstallQuantityMatrixView } from './InstallQuantityMatrixView';
import { StockQuantityMatrixView } from './StockQuantityMatrixView';
import { useLanguage } from '../i18n';

interface UnifiedToolingMasterViewProps {
  initialTab?: 'specs' | 'master' | 'matrix' | 'install' | 'stock';
}

export const UnifiedToolingMasterView: React.FC<UnifiedToolingMasterViewProps> = ({
  initialTab = 'master'
}) => {
  const { language } = useLanguage();
  const getInitialTab = (): 'specs' | 'master' | 'matrix' | 'stock' => {
    if (initialTab === 'install' || initialTab === 'matrix') return 'matrix';
    if (initialTab === 'stock') return 'stock';
    if (initialTab === 'specs') return 'specs';
    return 'master';
  };

  const [activeTab, setActiveTab] = useState<'specs' | 'master' | 'matrix' | 'stock'>(getInitialTab());

  return (
    <div className="space-y-3 animate-fadeIn font-sans text-white pb-4 px-2 sm:px-3 pt-1.5 h-full flex flex-col overflow-hidden">
      
      {/* Sub-Tabs Navigation Bar (Sticky Locked at Top Floating Glass Island) */}
      <div className="shrink-0 liquid-glass-island border border-white/15 p-1.5 sm:p-2 shadow-xl rounded-2xl backdrop-blur-xl flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap font-mono min-w-max">
          <button
            id="tab-specs"
            onClick={() => setActiveTab('specs')}
            className={`liquid-pill rounded-xl px-3 sm:px-4 py-1.5 font-bold text-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap ${
              activeTab === 'specs'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>
              {language === 'TH' ? '1. สเปคแม่พิมพ์ไลน์' : '1. LINE DIE SPEC'}
            </span>
          </button>

          <button
            id="tab-master"
            onClick={() => setActiveTab('master')}
            className={`liquid-pill rounded-xl px-3 sm:px-4 py-1.5 font-bold text-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap ${
              activeTab === 'master'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>
              {language === 'TH' ? '2. มาสเตอร์ชิ้นส่วน' : '2. PART MASTER'}
            </span>
          </button>

          <button
            id="tab-matrix"
            onClick={() => setActiveTab('matrix')}
            className={`liquid-pill rounded-xl px-3 sm:px-4 py-1.5 font-bold text-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>
              {language === 'TH' ? '3. จำนวนติดตั้งชิ้นส่วน' : '3. PART INSTALL'}
            </span>
          </button>

          <button
            id="tab-stock"
            onClick={() => setActiveTab('stock')}
            className={`liquid-pill rounded-xl px-3 sm:px-4 py-1.5 font-bold text-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)] border-none'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>
              {language === 'TH' ? '4. สต็อกอะไหล่หมุนเวียนงานซ่อม' : '4. REPAIR SPARE STOCK'}
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS (Flex-1 scrollable viewport) */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {activeTab === 'specs' && (
          <LineDieSpecificationView onAddNewPartClick={() => setActiveTab('master')} />
        )}

        {activeTab === 'master' && (
          <PartMasterView />
        )}

        {activeTab === 'matrix' && (
          <InstallQuantityMatrixView onNavigateToMaster={() => setActiveTab('master')} />
        )}

        {activeTab === 'stock' && (
          <StockQuantityMatrixView onNavigateToMaster={() => setActiveTab('master')} />
        )}
      </div>
    </div>
  );
};
