import { useState, useEffect } from 'react';
import { User, ProductionLineId, SystemSettings } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// In-Scope Core Views for Fin Die Regrinding & Cost Saving Management
import { CostSavingManagementView } from './views/CostSavingManagementView';
import { SmartQueueAndCalendarScheduleView } from './views/regrinding/SmartQueueAndCalendarScheduleView';
import { RegrindingEntryView } from './views/RegrindingEntryView';
import { UnifiedMasterLogsView } from './views/regrinding/UnifiedMasterLogsView';
import { ToolingMasterSpecsView } from './views/regrinding/ToolingMasterSpecsView';
import { LoginView } from './views/LoginView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(storageService.getCurrentUser());
  const [activeRoute, setActiveRoute] = useState<string>('cost-saving-management');
  const [targetLineId, setTargetLineId] = useState<ProductionLineId>('E1');
  const [targetLogStatusFilter, setTargetLogStatusFilter] = useState<string>('ALL');
  const [settings, setSettings] = useState<SystemSettings>(storageService.getSettings());
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

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'cost-saving-management':
      case 'cost-saving':
      case 'cost-dashboard':
      case 'cost-reports':
      case 'dashboard':
      case 'reports':
        return <CostSavingManagementView onNavigate={handleNavigate} />;

      case 'smart-queue-schedule':
      case 'regrind-queue':
      case 'regrinding-control':
        return <SmartQueueAndCalendarScheduleView onNavigate={handleNavigate} />;

      case 'regrind-entry':
      case 'regrind-record':
      case 'quality-inspection':
        return <RegrindingEntryView />;

      case 'unified-logs-view':
      case 'regrind-logs':
      case 'repair-history':
      case 'audit-trail':
        return (
          <UnifiedMasterLogsView 
            initialLineId={targetLineId} 
            initialStatusFilter={targetLogStatusFilter}
            onNavigate={handleNavigate} 
          />
        );

      case 'tooling-specs':
      case 'regrind-standards':
        return <ToolingMasterSpecsView />;

      case 'login':
        return (
          <LoginView
            onLoginSuccess={(u) => {
              setCurrentUser(u);
              setActiveRoute('cost-saving-management');
            }}
          />
        );

      default:
        return <CostSavingManagementView onNavigate={handleNavigate} />;
    }
  };

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
