import React, { useState, useEffect, useMemo } from 'react';
import {
  RegrindingTransactionItem,
  CostDashboardFilter,
  CostSummaryMetrics
} from '../types/costSaving';
import { ProductionLineId } from '../types';
import { costSavingService } from '../services/costSavingService';
import { CostSavingCalculationService } from '../services/costSavingCalculationService';
import { CostDashboardTab } from '../components/costSaving/CostDashboardTab';

interface CostSavingManagementViewProps {
  initialTab?: string;
  onNavigate?: (route: string, lineId?: ProductionLineId, logStatusFilter?: string) => void;
}

export const CostSavingManagementView: React.FC<CostSavingManagementViewProps> = ({
  onNavigate
}) => {
  const [allTransactions, setAllTransactions] = useState<RegrindingTransactionItem[]>([]);

  const now = new Date();
  const [filters, setFilters] = useState<CostDashboardFilter>({
    periodType: 'MONTHLY',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    selectedDate: now.toISOString().slice(0, 10),
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

  const dashboardFilteredTransactions = useMemo(() => {
    return costSavingService.getTransactions(filters);
  }, [filters, allTransactions]);

  const dashboardMetrics: CostSummaryMetrics = useMemo(() => {
    return CostSavingCalculationService.aggregateMetrics(dashboardFilteredTransactions);
  }, [dashboardFilteredTransactions]);

  const handleNavigateToTab = (route: string, lineId?: ProductionLineId, logStatusFilter?: string) => {
    if (onNavigate) {
      onNavigate(route, lineId, logStatusFilter);
    }
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col font-sans text-white bg-[#0a0e17] overflow-hidden select-none">
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden">
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
