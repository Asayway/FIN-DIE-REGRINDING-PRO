import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Wrench, 
  PlusCircle, 
  AlertTriangle, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { ProductionLineId, LineLiveMonitoringData, LINE_INFO_MAP } from '../types';
import { storageService } from '../services/storageService';
import { formatShots } from '../services/calculationService';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { DowntimeSummaryWidget } from '../components/dashboard/DowntimeSummaryWidget';

interface LineOverviewViewProps {
  onNavigate: (route: string, lineId?: ProductionLineId) => void;
}

export const LineOverviewView: React.FC<LineOverviewViewProps> = ({ onNavigate }) => {
  const [lines, setLines] = useState<Record<ProductionLineId, LineLiveMonitoringData>>({} as any);

  useEffect(() => {
    setLines(storageService.getLinesMonitoring());
    const unsub = storageService.subscribe(() => {
      setLines(storageService.getLinesMonitoring());
    });
    return () => unsub();
  }, []);

  const lineIds: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  return (
    <div className="space-y-3">
      {/* Top Banner Toolbar */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-md p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Fin Press Production Lines Overview
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              7 Lines Monitored
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/80">
              SAMPLE DATA - NOT FOR PRODUCTION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-thai">
            ภาพรวมสายการผลิตปั๊มฟินแลกเปลี่ยนความร้อน E1 - E5 พร้อมสถานะชิ้นส่วนแม่พิมพ์แบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onNavigate('tv-monitoring')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition-all shadow-sm"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>OPEN TV DASHBOARD</span>
          </button>
        </div>
      </div>

      {/* 30-Day Downtime Summary Widget */}
      <DowntimeSummaryWidget 
        onSelectLine={(lId) => onNavigate('tv-monitoring', lId)}
      />

      {/* Grid of All 8 Production Lines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {lineIds.map(lineId => {
          const lineData = lines[lineId];
          if (!lineData) return null;

          const items = lineData.items || [];
          const criticalItems = items.filter(i => i.alertStatus === 'CRITICAL' || i.alertStatus === 'OVER_LIFE');
          const warningItems = items.filter(i => i.alertStatus === 'WARNING' || i.alertStatus === 'PREPARE');
          const maxUsageItem = [...items].sort((a, b) => b.usagePercent - a.usagePercent)[0];

          return (
            <div
              key={lineId}
              className="bg-[#0B132B] border border-slate-800 hover:border-cyan-500/50 rounded-md overflow-hidden shadow transition-all flex flex-col justify-between group"
            >
              {/* Header with Line Status Badge (includes subtle flashing animation when under maintenance or down) */}
              <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm sm:text-base text-cyan-300">
                      Line {lineId.startsWith('E3-') ? 'E3' : lineId}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate">({LINE_INFO_MAP[lineId]?.shortTag || lineData.lineName})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {lineData.activeConfig?.dieCode || 'N/A'} • {lineData.activeConfig?.tubeSize || 'Ø7'} • {lineData.activeConfig?.material || 'PCM'}
                  </div>
                </div>

                {/* Status Badge with subtle flashing animation */}
                <Badge machineStatus={lineData.machineStatus || 'RUNNING'} />
              </div>

              {/* Body */}
              <div className="p-2.5 space-y-2 flex-1">
                {/* Shots KPI */}
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80">
                    <div className="text-[9px] text-slate-500 font-bold">TOTAL SHOTS</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                      {formatShots(lineData.machineShotTotal)}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80">
                    <div className="text-[9px] text-slate-500 font-bold">DAILY SHOTS</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
                      {formatShots(lineData.dailyShot)}
                    </div>
                  </div>
                </div>

                {/* Most Critical Part on this line */}
                {maxUsageItem && (
                  <div className="bg-slate-950/70 p-2 rounded border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium text-[11px] truncate max-w-[130px]">
                        {maxUsageItem.stagePunchDie || maxUsageItem.partName}
                      </span>
                      <span className={`font-mono font-bold text-xs ${
                        maxUsageItem.usagePercent >= 95 ? 'text-rose-400' :
                        maxUsageItem.usagePercent >= 85 ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        {maxUsageItem.usagePercent}% Life
                      </span>
                    </div>
                    <ProgressBar percent={maxUsageItem.usagePercent} size="sm" />
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>Rem: {formatShots(maxUsageItem.remainingShot)}</span>
                      <span>Stock: {maxUsageItem.backupQty} EA</span>
                    </div>
                  </div>
                )}

                {/* Alert Indicators */}
                <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
                  {criticalItems.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[10px] animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {criticalItems.length} Critical
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[10px] font-mono">✓ Tools Healthy</span>
                  )}

                  {warningItems.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px]">
                      {warningItems.length} Warning
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => onNavigate('tv-monitoring', lineId)}
                  className="flex-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-semibold font-mono flex items-center justify-center gap-1 transition-colors border border-slate-800"
                >
                  <Tv className="w-3 h-3" />
                  <span>TV View</span>
                </button>

                <button
                  onClick={() => onNavigate('replacement-entry', lineId)}
                  className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium font-mono flex items-center gap-1 transition-colors border border-slate-800"
                  title="Replace or Swap Die Tooling"
                >
                  <Wrench className="w-3 h-3 text-amber-400" />
                  <span>Swap</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

