content = """import React, { useState } from 'react';
import { 
  Sliders, 
  Box, 
  Layers,
  DatabaseZap
} from 'lucide-react';
import { PartLifeStandardSetupView, InstallQuantitySetupView } from './PartLifeStandardSetupView';
import { PartMasterView } from './PartMasterView';
import { storageService } from '../services/storageService';
import { EmbeddedMigrationModal } from '../components/migration/EmbeddedMigrationModal';

interface UnifiedToolingMasterViewProps {
  initialTab?: 'standards' | 'master' | 'install';
}

export const UnifiedToolingMasterView: React.FC<UnifiedToolingMasterViewProps> = ({
  initialTab = 'install'
}) => {
  const [activeTab, setActiveTab] = useState<'standards' | 'master' | 'install'>(initialTab);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // System Settings & HMI Theme
  const systemSettings = storageService.getSettings();
  const isHmi = systemSettings?.theme === 'hmi' || systemSettings?.theme === 'industrial-dark';

  return (
    <div className="space-y-3 animate-fadeIn font-sans text-slate-100 pb-6">
      
      {/* Top Header & Sub-Tabs Navigation Bar (Sticky Locked at Top) */}
      <div className={`sticky top-0 z-30 backdrop-blur-md rounded-xl p-3 sm:p-4 shadow-2xl space-y-3 border ${
        isHmi 
          ? 'bg-black/95 border-2 border-green-500 text-green-400' 
          : 'bg-[#0E172A]/95 border-slate-800/90 text-slate-100'
      }`}>
        
        {/* Row 1: Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase bg-cyan-950 text-cyan-300 border border-cyan-500 font-mono flex items-center gap-2 shadow-sm">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>FIN DIE TOOLING & SPARE MASTER HUB</span>
            </span>
            <span className="hidden md:inline text-slate-400 text-xs font-thai">
              ศูนย์จัดการมาตรฐานแม่พิมพ์ สเปก และแคตตาล็อกอะไหล่ (E1 - E6)
            </span>
          </div>
          
          <button 
            onClick={() => setShowMigrationModal(true)}
            className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 rounded-lg text-xs font-mono flex items-center gap-2 transition-all shadow-lg"
          >
            <DatabaseZap className="w-3.5 h-3.5" />
            <span>MIGRATE STANDARD (REVISION: 2025-01-31)</span>
          </button>
        </div>

        {/* Row 2: Sub-Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">

          <button
            onClick={() => setActiveTab('standards')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border ${
              activeTab === 'standards'
                ? isHmi
                  ? 'bg-green-500 text-black border-green-400 shadow-md font-extrabold'
                  : 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-bold'
                : isHmi
                  ? 'bg-zinc-950 text-green-400 border-green-900 hover:bg-zinc-900'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. LIFE STANDARD SETUP</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border ${
              activeTab === 'master'
                ? isHmi
                  ? 'bg-green-500 text-black border-green-400 shadow-md font-extrabold'
                  : 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-bold'
                : isHmi
                  ? 'bg-zinc-950 text-green-400 border-green-900 hover:bg-zinc-900'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>2. PART MASTER CATALOG</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border ${
              activeTab === 'install'
                ? isHmi
                  ? 'bg-green-500 text-black border-green-400 shadow-md font-extrabold'
                  : 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-bold'
                : isHmi
                  ? 'bg-zinc-950 text-green-400 border-green-900 hover:bg-zinc-900'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. INSTALL MATRIX</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS */}

      {activeTab === 'standards' && (
        <div className="pt-2">
          <PartLifeStandardSetupView />
        </div>
      )}

      {activeTab === 'master' && (
        <div className="pt-2">
          <PartMasterView />
        </div>
      )}

      {activeTab === 'install' && (
        <div className="pt-2">
          <InstallQuantitySetupView />
        </div>
      )}

      <EmbeddedMigrationModal isOpen={showMigrationModal} onClose={() => setShowMigrationModal(false)} />
    </div>
  );
};
"""

with open('src/views/UnifiedToolingMasterView.tsx', 'w') as f:
    f.write(content)
