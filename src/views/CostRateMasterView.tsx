import React, { useState, useEffect } from 'react';
import { CostRateMasterItem } from '../types/costSaving';
import { costSavingService } from '../services/costSavingService';
import { CostRateMasterTab } from '../components/costSaving/CostRateMasterTab';

export const CostRateMasterView: React.FC = () => {
  const [costRates, setCostRates] = useState<CostRateMasterItem[]>([]);

  const loadData = () => {
    setCostRates(costSavingService.getCostRateMasters());
  };

  useEffect(() => {
    loadData();
    const unsub = costSavingService.subscribe(loadData);
    return () => unsub();
  }, []);

  return (
    <div className="w-full h-full flex flex-col font-sans text-white bg-[#0a0e17] p-2 sm:p-4 overflow-y-auto custom-scrollbar">
      <CostRateMasterTab
        costRates={costRates}
        onRefresh={loadData}
      />
    </div>
  );
};
