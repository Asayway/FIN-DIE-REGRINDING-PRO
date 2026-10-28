import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Tag, 
  Wrench, 
  History, 
  Cpu, 
  FileSpreadsheet, 
  FlaskConical, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  Plus,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { 
  PartCostMasterItem, 
  CostRateMasterItem,
  RegrindingTransactionItem, 
  CostDashboardFilter, 
  CostSummaryMetrics 
} from '../types/costSaving';
import { costSavingService } from '../services/costSavingService';
import { CostSavingCalculationService } from '../services/costSavingCalculationService';

// Tabs
import { CostDashboardTab } from '../components/costSaving/CostDashboardTab';
import { PartCostMasterTab } from '../components/costSaving/PartCostMasterTab';
import { CostRateMasterTab } from '../components/costSaving/CostRateMasterTab';
import { RegrindingTransactionTab } from '../components/costSaving/RegrindingTransactionTab';
import { RegrindingHistoryTab } from '../components/costSaving/RegrindingHistoryTab';
import { DecisionSupportTab } from '../components/costSaving/DecisionSupportTab';
import { ReportsAndExportTab } from '../components/costSaving/ReportsAndExportTab';
import { FormulaAuditModal } from '../components/costSaving/FormulaAuditModal';

interface CostSavingManagementViewProps {
  initialTab?: 'dashboard' | 'transactions' | 'part-master' | 'cost-rate-master' | 'history' | 'decision' | 'reports';
  onNavigate?: (route: string) => void;
}

export const CostSavingManagementView: React.FC<CostSavingManagementViewProps> = ({
  initialTab = 'dashboard',
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [masters, setMasters] = useState<PartCostMasterItem[]>([]);
  const [costRates, setCostRates] = useState<CostRateMasterItem[]>([]);
  const [allTransactions, setAllTransactions] = useState<RegrindingTransactionItem[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Global Filter State for Dashboard
  const [filters, setFilters] = useState<CostDashboardFilter>({
    periodType: 'MONTHLY',
    year: 2026,
    month: 10,
    lineId: 'ALL',
    partNo: 'ALL',
    partType: 'ALL',
    qualityStatus: 'ALL',
    dataTypeFilter: 'ALL'
  });

  const loadData = () => {
    setMasters(costSavingService.getPartCostMasters());
    setCostRates(costSavingService.getCostRateMasters());
    setAllTransactions(costSavingService.getTransactions());
  };

  useEffect(() => {
    loadData();
    const unsub = costSavingService.subscribe(loadData);
    return () => unsub();
  }, []);

  // Filtered transactions for Dashboard
  const dashboardFilteredTransactions = useMemo(() => {
    return costSavingService.getTransactions(filters);
  }, [filters, allTransactions]);

  // Aggregate metrics for Dashboard
  const dashboardMetrics: CostSummaryMetrics = useMemo(() => {
    return CostSavingCalculationService.aggregateMetrics(dashboardFilteredTransactions);
  }, [dashboardFilteredTransactions]);

  const tabs = [
    { id: 'dashboard', label: '📊 แดชบอร์ดต้นทุน', sub: 'Executive KPIs', icon: BarChart3 },
    { id: 'transactions', label: '🛠️ ธุรกรรมงานเจียร', sub: 'Transactions Ledger', icon: Wrench },
    { id: 'part-master', label: '🏷️ ทะเบียนต้นทุนชิ้นส่วน', sub: 'Part Cost Master', icon: Tag },
    { id: 'cost-rate-master', label: '⚙️ อัตราเครื่องจักร & ค่าแรง', sub: 'Machine & Labor Rates', icon: Cpu },
    { id: 'history', label: '📜 ประวัติ & Fair Comparison', sub: 'Tool History & Shots', icon: History },
    { id: 'decision', label: '🧠 ระบบแนะนำการซ่อม', sub: 'Decision Support', icon: Layers },
    { id: 'reports', label: '📑 รายงาน & Excel Export', sub: 'Monthly/Yearly', icon: FileSpreadsheet },
  ];

  return (
    <div className="w-full h-full flex flex-col font-sans text-white bg-[#0a0e17] overflow-hidden select-none">
      
      {/* Top Header Toolbar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#0c1424] to-slate-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00FF7F]/20 to-cyan-500/20 border border-[#00FF7F]/40 flex items-center justify-center text-[#00FF7F] shadow-lg shadow-[#00FF7F]/10">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                โมดูลวิเคราะห์ต้นทุนและการประหยัด (Cost Saving & Regrinding Management)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/40">
                PRO MODULE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ระบบคำนวณ Gross/Net Saving, ต้นทุนต่อช็อต และการเปรียบเทียบเทียบเคียงเพื่อการตัดสินใจเชิงวิศวกรรม
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Formula Verification Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow hover:border-cyan-400/50"
            title="ตรวจสอบสูตรคำนวณทางคณิตศาสตร์ด้วยกรณีทดสอบก่อนนำขึ้นใช้งานจริง"
          >
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">ตรวจสอบสูตร (Formula Audit)</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="px-5 pt-2 bg-[#0c1018]/80 border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer relative whitespace-nowrap ${
                isActive
                  ? 'bg-[#0a0e17] text-white border-t border-x border-white/15 shadow-2xl'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#00FF7F]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#00FF7F]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Viewport (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
        {activeTab === 'dashboard' && (
          <CostDashboardTab
            transactions={dashboardFilteredTransactions}
            metrics={dashboardMetrics}
            filters={filters}
            onFilterChange={setFilters}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'transactions' && (
          <RegrindingTransactionTab
            transactions={allTransactions}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'part-master' && (
          <PartCostMasterTab
            masters={masters}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'cost-rate-master' && (
          <CostRateMasterTab
            rates={costRates}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'history' && (
          <RegrindingHistoryTab
            masters={masters}
            allTransactions={allTransactions}
          />
        )}

        {activeTab === 'decision' && (
          <DecisionSupportTab
            masters={masters}
            transactions={allTransactions}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsAndExportTab
            allTransactions={allTransactions}
          />
        )}
      </div>

      {/* Formula Verification Audit Modal */}
      <FormulaAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
};
