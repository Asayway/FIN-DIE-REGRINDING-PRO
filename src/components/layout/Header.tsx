import React from 'react';
import { Globe } from 'lucide-react';
import { User, SystemSettings } from '../../types';
import { useLanguage, useTranslation } from '../../i18n';

interface HeaderProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onNavigate: (route: string) => void;
  activeRoute: string;
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings
}) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleSelectLanguage = (lang: 'EN' | 'TH') => {
    setLanguage(lang);
    onUpdateSettings({ ...settings, language: lang });
  };

  const activeLang = language || settings.language || 'TH';

  return (
    <header className="sticky top-0 z-40 select-none ios-spring border-b border-white/10 bg-[#0a0e17]/95 backdrop-blur-2xl text-white font-sans shadow-md">
      <div className="px-3.5 py-1.5 flex items-center justify-between gap-3">
        {/* Left: Brand Title */}
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xs sm:text-sm tracking-wider uppercase text-white font-sans flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] inline-block"></span>
                {t('header.title', { defaultValue: 'FinDie Regrind Pro' })}
              </h1>
              <span className="hidden md:inline-block text-[10px] text-slate-400 border-l border-white/15 pl-2">
                {t('header.subtitle', { defaultValue: 'FIN DIE TOOLING SHARPENING & REGRINDING LIFECYCLE' })}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Language Switcher [ TH | EN ] */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 border border-white/10 bg-white/[0.04] backdrop-blur-md rounded-full shadow-inner">
            <div className="px-1 text-slate-400 hidden sm:flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
            </div>
            <button
              type="button"
              onClick={() => handleSelectLanguage('TH')}
              className={`px-2 py-0.5 flex items-center gap-1 ios-spring rounded-full cursor-pointer text-[10px] font-mono ${
                activeLang === 'TH'
                  ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="ภาษาไทย (Thai)"
            >
              <span>TH</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectLanguage('EN')}
              className={`px-2 py-0.5 flex items-center gap-1 ios-spring rounded-full cursor-pointer text-[10px] font-mono ${
                activeLang === 'EN' || activeLang === 'DUAL'
                  ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="English"
            >
              <span>EN</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
