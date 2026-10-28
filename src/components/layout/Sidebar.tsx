import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  FileText,
  TrendingUp,
  FilePlus,
  Sliders,
  DollarSign,
  ShieldCheck
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
  const { language } = useLanguage();
  const isTh = language === 'TH';

  const sections: NavSection[] = [
    {
      title: isTh ? 'COST SAVING & DASHBOARD' : 'COST SAVING & DASHBOARD',
      items: [
        {
          id: 'cost-saving-management',
          label: isTh ? 'ต้นทุนและผลประหยัด' : 'Cost & Saving Analytics',
          icon: TrendingUp,
          badge: 'SAVING'
        }
      ]
    },
    {
      title: isTh ? 'REGRINDING & REPAIR WORK' : 'REGRINDING & REPAIR WORK',
      items: [
        {
          id: 'smart-queue-schedule',
          label: isTh ? 'คิวงานเจียร & ตารางนัด' : 'Regrind Job Queue',
          icon: Flame,
          badge: 'QUEUE'
        },
        {
          id: 'regrind-entry',
          label: isTh ? 'บันทึกงานเจียร & ตรวจ QC' : 'Regrind Record & QC',
          icon: FilePlus
        },
        {
          id: 'unified-logs-view',
          label: isTh ? 'ประวัติงานซ่อมและเจียร' : 'Repair & Regrind Logs',
          icon: FileText
        }
      ]
    },
    {
      title: isTh ? 'ENGINEERING STANDARDS' : 'ENGINEERING STANDARDS',
      items: [
        {
          id: 'tooling-specs',
          label: isTh ? 'สเปคมาตรฐานการเจียร' : 'Tooling Regrind Specs',
          icon: Sliders
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
            : 'fixed inset-y-2 left-2 w-56 md:relative md:inset-auto md:w-56 lg:w-60'
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
        <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-4 custom-scrollbar bg-transparent">
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
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate text-xs font-semibold">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
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

        {/* Footer info */}
        {!collapsed && (
          <div className="p-2.5 border-t border-white/10 text-[10px] text-slate-400 text-center font-mono">
            FIN DIE REGRIND PRO v2.4
          </div>
        )}
      </aside>
    </>
  );
};
