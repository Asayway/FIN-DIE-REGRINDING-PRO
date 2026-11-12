import React, { useState, useEffect, useMemo } from 'react';
import { 
  PartCostMasterItem, 
  CostRateMasterItem,
  RegrindingTransactionItem, 
  CostDashboardFilter, 
  CostSummaryMetrics 
} from '../types/costSaving';
import { costSavingService } from '../services/costSavingService';
import { CostSavingCalculationService } from '../services/costSavingCalculationService';

// Main Dashboard Component
import { CostDashboardTab } from '../components/costSaving/CostDashboardTab';

interface CostSavingManagementViewProps {
  initialTab?: string;
  onNavigate?: (route: string) => void;
}

export const CostSavingManagementView: React.FC<CostSavingManagementViewProps> = ({
  onNavigate
}) => {
  const [allTransactions, setAllTransactions] = useState<RegrindingTransactionItem[]>([]);

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

  const handleNavigateToTab = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    }
  };

  return (
    <div className="w-full h-full flex flex-col font-sans text-white bg-[#0a0e17] overflow-hidden select-none p-2 sm:p-3">
      {/* Main Dashboard Viewport */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <CostDashboardTab
          transactions={dashboardFilteredTransactions}
          metrics={dashboardMetrics}
          filters={filters}
          onFilterChange={setFilters}
          onNavigateToTab={handleNavigateToTab}
        />
      </div>
    </div>
  );
};
