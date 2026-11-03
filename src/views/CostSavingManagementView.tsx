import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Tag, 
  Wrench, 
  History, 
  Cpu, 
  FlaskConical, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  Plus,
  HelpCircle,
  FileCheck,
  ExternalLink,
  Scale
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
import { CostRateMasterTab } from '../components/costSaving/CostRateMasterTab';
import { RegrindingTransactionTab } from '../components/costSaving/RegrindingTransactionTab';
import { RegrindingHistoryTab } from '../components/costSaving/RegrindingHistoryTab';
import { FormulaAuditModal } from '../components/costSaving/FormulaAuditModal';

interface CostSavingManagementViewProps {
  initialTab?: 'dashboard' | 'transactions' | 'cost-rate-master' | 'history';
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

  // Streamlined 3 tabs
  const tabs = [
    { id: 'dashboard', label: '📊 แดชบอร์ดภาพรวมต้นทุน', sub: 'Executive KPIs', icon: BarChart3 },
    { id: 'transactions', label: '🛠️ บันทึกงานซ่อม & ผลประหยัด', sub: 'Transactions Ledger', icon: Wrench },
    { id: 'history', label: '⚖️ เปรียบเทียบต้นทุนเทียบเคียง', sub: 'Fair Comparison', icon: Scale },
  ];

  return (
    <div className="w-full h-full flex flex-col font-sans text-white bg-[#0a0e17] overflow-hidden select-none">
      
      {/* Top Header Toolbar - Compact & Responsive */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-950 via-[#0c1424] to-slate-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00FF7F]/20 to-cyan-500/20 border border-[#00FF7F]/40 flex items-center justify-center text-[#00FF7F] shadow-md shadow-[#00FF7F]/10">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                แดชบอร์ดต้นทุนและผลประหยัดงานเจียร (Cost & Saving Analytics)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/40">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              วิเคราะห์ Gross/Net Saving, ต้นทุนต่อช็อต และผลประหยัดเทียบเคียงการซื้อใหม่
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Direct Link to Tooling Master Pricing */}
          <button
            type="button"
            onClick={() => onNavigate?.('tooling-specs')}
            className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/50 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-emerald-400"
            title="ไปที่หน้าสเปคแม่พิมพ์ เพื่อดูและแก้ไขราคาจัดซื้ออะไหล่ใหม่ (79 รายการ)"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>ทะเบียนราคาอะไหล่ (79 รายการ)</span>
            <ExternalLink className="w-3 h-3 text-emerald-400 ml-0.5" />
          </button>

          {/* Formula Verification Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow hover:border-cyan-400/50"
            title="ตรวจสอบสูตรคำนวณทางคณิตศาสตร์ด้วยกรณีทดสอบ"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">ตรวจสอบสูตร</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar - Tight & Scrollable */}
      <div className="px-3.5 pt-1 bg-[#0c1018]/90 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer relative whitespace-nowrap ${
                isActive
                  ? 'bg-[#0a0e17] text-white border-t border-x border-white/15 shadow-xl text-emerald-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00FF7F]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[#00FF7F]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Viewport (Scrollable with tight padding) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
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

        {activeTab === 'history' && (
          <RegrindingHistoryTab
            masters={masters}
            allTransactions={allTransactions}
          />
        )}
      </div>

      {/* Formula Audit Modal */}
      <FormulaAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
};
