import React from 'react';
import { ProductionLineId } from '../types';
import { InteractiveDieLayoutView } from './InteractiveDieLayoutView';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

interface ReplacementEntryViewProps {
  initialLineId?: ProductionLineId;
}

export const ReplacementEntryView: React.FC<ReplacementEntryViewProps> = ({ initialLineId = 'E1' }) => {
  return (
    <div className="w-full animate-fadeIn pb-6">
      <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดในระบบจัดการเปลี่ยนอะไหล่แม่พิมพ์ (Die Layout & Part Replacement)">
        <InteractiveDieLayoutView initialLineId={initialLineId} showLineSelector={true} />
      </ErrorBoundary>
    </div>
  );
};
