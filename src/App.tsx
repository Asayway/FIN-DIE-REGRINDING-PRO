import { useState, useEffect } from 'react';
import { User, ProductionLineId, SystemSettings } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Direct View Imports for instant synchronous rendering
import { TvDashboardView } from './components/tv/TvDashboardView';
import { ReplacementEntryView } from './views/ReplacementEntryView';
import { UnifiedToolingMasterView } from './views/UnifiedToolingMasterView';
import { LoginView } from './views/LoginView';
import { RegrindPartControlView } from './views/RegrindPartControlView';
import { SmartQueueAndCalendarScheduleView } from './views/regrinding/SmartQueueAndCalendarScheduleView';
import { UnifiedMasterLogsView } from './views/regrinding/UnifiedMasterLogsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(storageService.getCurrentUser());
  const [activeRoute, setActiveRoute] = useState<string>('tv-monitoring');
  const [targetLineId, setTargetLineId] = useState<ProductionLineId>('E1');
  const [targetLogStatusFilter, setTargetLogStatusFilter] = useState<string>('ALL');
  const [settings, setSettings] = useState<SystemSettings>(storageService.getSettings());
  const [isTvFullscreen, setIsTvFullscreen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setSettings(storageService.getSettings());
      setCurrentUser(storageService.getCurrentUser());
    });
    return () => {
      unsub();
    };
  }, []);

  // Sync with browser native fullscreen exit (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTvFullscreen) {
        setIsTvFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isTvFullscreen]);

  const handleNavigate = (route: string, lineId?: ProductionLineId, logStatusFilter?: string) => {
    setActiveRoute(route);
    if (lineId) {
      setTargetLineId(lineId);
    }
    if (logStatusFilter) {
      setTargetLogStatusFilter(logStatusFilter);
    } else if (route === 'unified-logs-view' && !logStatusFilter) {
      setTargetLogStatusFilter('ALL');
    }
  };

  const handleToggleFullscreen = () => {
    const nextState = !isTvFullscreen;
    setIsTvFullscreen(nextState);
    if (nextState) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (_) {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
    }
  };

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'tv-monitoring':
      case 'reports':
        return (
          <TvDashboardView
            initialLineId={targetLineId}
            isFullscreenMode={isTvFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onNavigate={handleNavigate}
          />
        );
      case 'smart-queue-schedule':
      case 'regrind-entry':
      case 'regrinding-control':
      case 'regrind-part-control':
      case 'regrinding-management':
        return <SmartQueueAndCalendarScheduleView onNavigate={handleNavigate} />;
      case 'regrind-calendar-matrix':
        return <RegrindPartControlView initialLineId={targetLineId} onNavigate={handleNavigate} />;
      case 'unified-logs-view':
      case 'regrind-logs':
      case 'audit-trail':
        return (
          <UnifiedMasterLogsView 
            initialLineId={targetLineId} 
            initialStatusFilter={targetLogStatusFilter}
            onNavigate={handleNavigate} 
          />
        );
      case 'replacement-entry':
      case 'lock-position':
      case 'die-layout':
        return <ReplacementEntryView initialLineId={targetLineId} />;
      case 'unified-tooling-setup':
      case 'part-master':
      case 'install-quantity-setup':
      case 'spare-stock':
        return <UnifiedToolingMasterView initialTab="specs" />;
      case 'life-standard-setup':
        return <UnifiedToolingMasterView initialTab="regrind-standards" />;
      case 'line-configuration':
        return <UnifiedToolingMasterView initialTab="specs" />;
      case 'login':
        return (
          <LoginView
            onLoginSuccess={(u) => {
              setCurrentUser(u);
              setActiveRoute('tv-monitoring');
            }}
          />
        );
      default:
        return (
          <TvDashboardView
            initialLineId={targetLineId}
            isFullscreenMode={isTvFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        );
    }
  };

  if (isTvFullscreen && activeRoute === 'tv-monitoring') {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex flex-col h-screen w-screen max-h-screen max-w-screen p-0 m-0 theme-dark bg-[#000000] text-slate-100 font-sans">
        <ErrorBoundary>
          <TvDashboardView
            initialLineId={targetLineId}
            isFullscreenMode={true}
            onToggleFullscreen={handleToggleFullscreen}
            onNavigate={handleNavigate}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col ios-spring theme-dark liquid-backdrop text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        onNavigate={handleNavigate}
        activeRoute={activeRoute}
        settings={settings}
        onUpdateSettings={(s) => {
          storageService.updateSettings(s);
          setSettings(s);
        }}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Shell: Floating Sidebar + Glass Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar - Detached Floating Glass Island */}
        <Sidebar
          activeRoute={activeRoute}
          onNavigate={handleNavigate}
          userRole={currentUser.role}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          language={settings.language}
        />

        {/* Content Body - Independent full-screen view container */}
        <main className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 custom-scrollbar transition-all duration-300 w-full flex flex-col text-slate-100">
          <div className="w-full flex-1 flex flex-col min-h-full">
            <ErrorBoundary>
              {renderActiveView()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
