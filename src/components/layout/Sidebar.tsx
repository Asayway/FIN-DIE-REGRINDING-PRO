import React from 'react';
import {
  Tv,
  Wrench,
  Database,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  BarChart3,
  Flame,
  Calendar,
  FileText
} from 'lucide-react';
import { UserRole, AppTheme } from '../../types';
import { useTranslation, useLanguage, LanguageCode } from '../../i18n';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  allowedRoles?: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeRoute: string;
  onNavigate: (routeId: string) => void;
  userRole: UserRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  theme?: AppTheme;
  language?: LanguageCode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  collapsed = false,
  onToggleCollapse
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isTh = language === 'TH';

  const sections: NavSection[] = [
    {
      title: isTh ? 'OVERVIEW (ภาพรวม)' : 'OVERVIEW',
      items: [
        {
          id: 'tv-monitoring',
          label: isTh ? 'แดชบอร์ด' : 'Dashboard',
          icon: BarChart3
        }
      ]
    },
    {
      title: isTh ? 'REGRIND (งานเจียระไน)' : 'REGRIND CONTROL',
      items: [
        {
          id: 'smart-queue-schedule',
          label: isTh ? 'คิวงานเจียร' : 'Job Queue',
          icon: Flame,
          badge: 'QUEUE'
        },
        {
          id: 'regrind-calendar-matrix',
          label: isTh ? 'สรุปแผนงานเจียร' : 'Regrind Plan Summary',
          icon: Calendar
        },
        {
          id: 'unified-logs-view',
          label: isTh ? 'ประวัติการเจียร' : 'Regrind Logs',
          icon: FileText
        }
      ]
    },
    {
      title: isTh ? 'MASTER DATA (ฐานข้อมูล)' : 'MASTER DATA',
      items: [
        {
          id: 'unified-tooling-setup',
          label: isTh ? 'สเปคแม่พิมพ์' : 'Tooling Specs',
          icon: Database
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop (Mobile only) */}
      {!collapsed && (
        <div 
          onClick={onToggleCollapse}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container: Detached Floating Glass Island */}
      <aside
        className={`flex flex-col flex-shrink-0 ios-spring select-none h-auto my-2 ml-2 mb-2 rounded-3xl z-40 bg-[#0c1018]/85 backdrop-blur-2xl border border-white/10 shadow-2xl text-white font-sans ${
          collapsed 
            ? 'hidden md:flex md:w-14' 
            : 'fixed inset-y-2 left-2 w-56 md:relative md:inset-auto md:w-52 lg:w-56'
        }`}
      >
        {/* Top Toggle Button Inside Sidebar */}
        {onToggleCollapse && (
          <div className="p-2 border-b flex items-center justify-between border-white/10 bg-transparent">
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-2xl transition-all border border-white/10 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] text-white hover:text-cyan-400 cursor-pointer active:scale-95 ${collapsed ? 'w-full flex justify-center' : 'ml-auto'}`}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar Collapse"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              )}
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3 custom-scrollbar bg-transparent">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-2 pb-1">
                  <div className="text-[9px] font-bold font-mono tracking-widest uppercase text-slate-400/80">
                    {section.title}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 768 && onToggleCollapse) {
                          onToggleCollapse();
                        }
                      }}
                      className={`liquid-pill w-full flex items-center gap-2.5 px-3 py-2 text-left ios-spring rounded-2xl group cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.2)] font-bold'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                      title={item.label}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div className="truncate">
                            <div className={`text-[12px] tracking-tight truncate leading-tight ${
                              isActive ? 'text-cyan-200 font-bold' : 'text-slate-200 group-hover:text-white'
                            }`}>
                              {item.label}
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`ml-1 text-[8.5px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                                isActive
                                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                  : 'bg-white/[0.06] text-slate-300 border-white/10'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
