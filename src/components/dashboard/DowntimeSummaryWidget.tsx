import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Play, 
  Pause, 
  AlertOctagon, 
  TrendingDown, 
  Calendar, 
  ChevronRight, 
  ChevronDown,
  Info,
  Layers,
  Activity,
  CheckCircle2,
  X,
  History,
  ArrowUpRight
} from 'lucide-react';
import { 
  ProductionLineId, 
  MachineStatus, 
  Downtime30DayReport, 
  DowntimeLogEntry, 
  DowntimeCategory, 
  LINE_INFO_MAP,
  UserRole
} from '../../types';
import { storageService } from '../../services/storageService';
import { Badge } from '../common/Badge';

interface DowntimeSummaryWidgetProps {
  compact?: boolean;
  selectedLineId?: ProductionLineId;
  onSelectLine?: (lineId: ProductionLineId) => void;
  className?: string;
  isHmiTheme?: boolean;
}

const LINE_IDS: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

export const DowntimeSummaryWidget: React.FC<DowntimeSummaryWidgetProps> = ({
  compact = false,
  selectedLineId,
  onSelectLine,
  className = '',
  isHmiTheme = false
}) => {
  const [report, setReport] = useState<Downtime30DayReport>(storageService.getLineDowntimeSummary30Days());
  const [allLogs, setAllLogs] = useState<DowntimeLogEntry[]>(storageService.getDowntimeLogs());
  const [linesMonitoring, setLinesMonitoring] = useState(storageService.getLinesMonitoring());
  const [activeModalLine, setActiveModalLine] = useState<ProductionLineId | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);
  const [statusChangeModal, setStatusChangeModal] = useState<{
    isOpen: boolean;
    lineId: ProductionLineId;
    targetStatus: MachineStatus;
    reason: string;
    category: DowntimeCategory;
  }>({
    isOpen: false,
    lineId: 'E1',
    targetStatus: 'MAINTENANCE',
    reason: '',
    category: 'SCHEDULED_MAINTENANCE'
  });

  useEffect(() => {
    const update = () => {
      setReport(storageService.getLineDowntimeSummary30Days());
      setAllLogs(storageService.getDowntimeLogs());
      setLinesMonitoring(storageService.getLinesMonitoring());
    };
    update();
    const unsub = storageService.subscribe(update);
    return () => unsub();
  }, []);

  const handleQuickStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeModal.lineId) return;

    storageService.updateLineMachineStatus(
      statusChangeModal.lineId,
      statusChangeModal.targetStatus,
      statusChangeModal.reason.trim() || undefined,
      statusChangeModal.category
    );

    setStatusChangeModal({
      isOpen: false,
      lineId: 'E1',
      targetStatus: 'MAINTENANCE',
      reason: '',
      category: 'SCHEDULED_MAINTENANCE'
    });
  };

  const activeLineSummary = activeModalLine ? report.lineSummaries[activeModalLine] : null;
  const activeLineLogs = activeModalLine 
    ? allLogs.filter(l => l.lineId === activeModalLine).slice(0, 10)
    : [];

  return (
    <div 
      className={`rounded-md border shadow-sm transition-all select-none ${
        isHmiTheme 
          ? 'bg-black border-green-800 text-green-300 font-mono' 
          : 'bg-[#0B132B] border-slate-800 text-slate-200 font-sans'
      } ${className}`}
    >
      {/* Widget Header Toolbar */}
      <div className="p-2 sm:p-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded ${
            isHmiTheme ? 'bg-green-950 text-green-400 border border-green-600' : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
          }`}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1">
                <span>30-DAY DOWNTIME SUMMARY</span>
                <span className="text-[10px] font-normal text-slate-400 hidden sm:inline font-thai">
                  (สรุปชั่วโมงหยุดเครื่องย้อนหลัง 30 วัน)
                </span>
              </h3>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                isHmiTheme 
                  ? 'bg-green-950 text-green-300 border-green-500' 
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
              }`}>
                {report.factoryUptimePercent}% Plant Uptime
              </span>
            </div>
            <div className="text-[9.5px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Period: <strong className="text-slate-300">{report.startDate} ~ {report.endDate}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Total Plant Downtime: <strong className="text-amber-400 font-bold">{report.totalFactoryDowntimeHours} hrs</strong></span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
            title={isExpanded ? "Collapse Widget" : "Expand Widget"}
          >
            <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Show Details'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {isExpanded && (
        <div className="p-2 sm:p-2.5 space-y-2">
          {/* Top Quick Stats Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-slate-400">PLANT DOWNTIME</div>
                <div className="text-xs sm:text-sm font-bold text-amber-400">{report.totalFactoryDowntimeHours} <span className="text-[9px] font-normal text-slate-400">Hours</span></div>
              </div>
              <Activity className="w-4 h-4 text-amber-400 opacity-60" />
            </div>

            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-slate-400">AVG PER LINE</div>
                <div className="text-xs sm:text-sm font-bold text-cyan-300">{report.averageLineDowntimeHours} <span className="text-[9px] font-normal text-slate-400">Hrs/Line</span></div>
              </div>
              <Layers className="w-4 h-4 text-cyan-400 opacity-60" />
            </div>

            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-slate-400">BOTTLENECK LINE</div>
                <div className="text-xs sm:text-sm font-bold text-rose-400 flex items-center gap-1">
                  <span>Line {report.bottleneckLineId}</span>
                  <span className="text-[9px] text-rose-300/80 font-normal">({report.lineSummaries[report.bottleneckLineId]?.totalDowntimeHours}h)</span>
                </div>
              </div>
              <AlertTriangle className="w-4 h-4 text-rose-400 opacity-70" />
            </div>

            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-slate-400">PLANT AVAILABILITY</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400">{report.factoryUptimePercent}%</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60" />
            </div>
          </div>

          {/* 8-Line Downtime Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {LINE_IDS.map(lineId => {
              const summary = report.lineSummaries[lineId];
              const lineData = linesMonitoring[lineId];
              const currentStatus = lineData?.machineStatus || 'RUNNING';
              const isSelected = selectedLineId === lineId;
              const isBottleneck = report.bottleneckLineId === lineId;

              // Color based on downtime severity
              const isHighDowntime = (summary?.totalDowntimeHours || 0) >= 20;
              const isMediumDowntime = (summary?.totalDowntimeHours || 0) >= 12;

              return (
                <div
                  key={lineId}
                  className={`p-2 rounded border transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-500 ring-1 ring-cyan-500/30 shadow'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    {/* Line Header & Status Badge with subtle flash if under maintenance or down */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={() => onSelectLine && onSelectLine(lineId)}
                          className="font-mono font-bold text-xs sm:text-sm text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1"
                          title={`Select Line ${lineId}`}
                        >
                          <span>Line {lineId}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                        </button>
                        {isBottleneck && (
                          <span className="px-1 py-0 rounded text-[8px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800" title="Line with highest total downtime">
                            TOP DT
                          </span>
                        )}
                      </div>

                      {/* Status Badge with subtle flashing animation */}
                      <Badge 
                        machineStatus={currentStatus} 
                        className="scale-90 origin-right"
                      />
                    </div>

                    {/* Total Downtime Hours Metric */}
                    <div className="flex items-baseline justify-between font-mono mb-1">
                      <span className="text-[10px] text-slate-400">Total Downtime (30d):</span>
                      <span className={`text-xs sm:text-sm font-bold tabular-nums ${
                        isHighDowntime ? 'text-rose-400' : isMediumDowntime ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {summary?.totalDowntimeHours || 0} <span className="text-[9px] font-normal text-slate-400">hrs</span>
                      </span>
                    </div>

                    {/* Uptime Progress Bar */}
                    <div className="space-y-0.5 mb-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>Availability</span>
                        <span className="font-bold text-slate-200">{summary?.uptimePercent || 100}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full transition-all rounded-full ${
                            (summary?.uptimePercent || 100) >= 98 ? 'bg-emerald-400' :
                            (summary?.uptimePercent || 100) >= 95 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, summary?.uptimePercent || 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini Category Breakdown Chips */}
                    <div className="grid grid-cols-3 gap-1 text-[8.5px] font-mono text-center pt-1 border-t border-slate-800/60">
                      <div className="bg-slate-900/80 p-0.5 rounded border border-slate-800 text-slate-300">
                        <div className="text-[7.5px] text-rose-400 font-semibold">UNPLANNED</div>
                        <div>{summary?.unplannedHours || 0}h</div>
                      </div>
                      <div className="bg-slate-900/80 p-0.5 rounded border border-slate-800 text-slate-300">
                        <div className="text-[7.5px] text-amber-400 font-semibold">MAINT</div>
                        <div>{summary?.maintenanceHours || 0}h</div>
                      </div>
                      <div className="bg-slate-900/80 p-0.5 rounded border border-slate-800 text-slate-300">
                        <div className="text-[7.5px] text-purple-400 font-semibold">CHANGE</div>
                        <div>{summary?.changeoverHours || 0}h</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1">
                    <button
                      onClick={() => setActiveModalLine(lineId)}
                      className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 flex items-center gap-1 transition-colors"
                      title="View detailed downtime incident history"
                    >
                      <History className="w-2.5 h-2.5" />
                      <span>Logs ({summary?.eventCount || 0})</span>
                    </button>

                    <button
                      onClick={() => setStatusChangeModal({
                        isOpen: true,
                        lineId,
                        targetStatus: currentStatus === 'RUNNING' ? 'MAINTENANCE' : 'RUNNING',
                        reason: '',
                        category: currentStatus === 'RUNNING' ? 'SCHEDULED_MAINTENANCE' : 'SCHEDULED_MAINTENANCE'
                      })}
                      className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
                      title="Update Machine Status"
                    >
                      <Wrench className="w-2.5 h-2.5 text-amber-400" />
                      <span>Set Status</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Detailed Line Downtime Logs */}
      {activeModalLine && activeLineSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#0B132B] border border-slate-800 rounded-lg max-w-2xl w-full p-4 space-y-3 shadow-2xl text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                    <span>Line {activeModalLine} - 30-Day Downtime Event Logs</span>
                    <Badge machineStatus={linesMonitoring[activeModalLine]?.machineStatus || 'RUNNING'} />
                  </h4>
                  <p className="text-xs text-slate-400 font-thai">
                    บันทึกประวัติการหยุดสายการผลิตและงานบำรุงรักษาย้อนหลัง 30 วัน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalLine(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary KPI header in modal */}
            <div className="grid grid-cols-4 gap-2 text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
              <div>
                <div className="text-[9px] text-slate-400">TOTAL DOWNTIME</div>
                <div className="font-bold text-amber-400 text-sm">{activeLineSummary.totalDowntimeHours} hrs</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">AVAILABILITY</div>
                <div className="font-bold text-emerald-400 text-sm">{activeLineSummary.uptimePercent}%</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">TOTAL INCIDENTS</div>
                <div className="font-bold text-slate-200 text-sm">{activeLineSummary.eventCount} Events</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">UNPLANNED DOWN</div>
                <div className="font-bold text-rose-400 text-sm">{activeLineSummary.unplannedHours} hrs</div>
              </div>
            </div>

            {/* Incident Logs Table */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-800 rounded bg-slate-950">
              {activeLineLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  No downtime incidents recorded for Line {activeModalLine} in this period.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="p-2">DATE & TIME</th>
                      <th className="p-2">CATEGORY</th>
                      <th className="p-2">DURATION</th>
                      <th className="p-2">REASON & DETAILS</th>
                      <th className="p-2">TECHNICIAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeLineLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/50">
                        <td className="p-2 text-slate-300 text-[11px] whitespace-nowrap">
                          {log.startTime.replace('T', ' ').substring(0, 16)}
                        </td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                            log.category === 'UNPLANNED_DOWN' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            log.category === 'SCHEDULED_MAINTENANCE' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            log.category === 'DIE_CHANGEOVER' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                            'bg-cyan-950 text-cyan-300 border-cyan-800'
                          }`}>
                            {log.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-amber-300 whitespace-nowrap">
                          {(log.durationMinutes / 60).toFixed(1)}h ({log.durationMinutes}m)
                        </td>
                        <td className="p-2 text-slate-200">
                          <div className="font-semibold text-white">{log.reason}</div>
                          {log.reasonTh && <div className="text-[10px] text-slate-400 font-thai">{log.reasonTh}</div>}
                        </td>
                        <td className="p-2 text-slate-400 text-[10px] whitespace-nowrap">
                          {log.operatorOrTech || 'Operator'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModalLine(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Status Change / Log Downtime */}
      {statusChangeModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <form 
            onSubmit={handleQuickStatusChange}
            className="bg-[#0B132B] border border-slate-800 rounded-lg max-w-md w-full p-4 space-y-3 shadow-2xl text-slate-100 font-sans"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Update Status for Line {statusChangeModal.lineId}</span>
              </h4>
              <button
                type="button"
                onClick={() => setStatusChangeModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Target Status Selection */}
              <div>
                <label className="block font-mono text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Target Machine Status
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  {(['RUNNING', 'IDLE', 'MAINTENANCE', 'STOPPED'] as MachineStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusChangeModal(prev => ({ 
                        ...prev, 
                        targetStatus: st,
                        category: st === 'MAINTENANCE' ? 'SCHEDULED_MAINTENANCE' : st === 'STOPPED' ? 'UNPLANNED_DOWN' : 'OTHER'
                      }))}
                      className={`p-1.5 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        statusChangeModal.targetStatus === st
                          ? st === 'RUNNING' ? 'bg-emerald-600 text-black border-emerald-400 font-extrabold'
                          : st === 'MAINTENANCE' ? 'bg-amber-500 text-black border-amber-300 font-extrabold'
                          : st === 'STOPPED' ? 'bg-rose-600 text-white border-rose-400 font-extrabold'
                          : 'bg-yellow-500 text-black border-yellow-300 font-extrabold'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {st === 'RUNNING' && '🟢 RUNNING'}
                      {st === 'IDLE' && '🟡 IDLE'}
                      {st === 'MAINTENANCE' && '🔧 MAINTENANCE'}
                      {st === 'STOPPED' && '🔴 DOWN / STOPPED'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Downtime Category if applicable */}
              {(statusChangeModal.targetStatus === 'MAINTENANCE' || statusChangeModal.targetStatus === 'STOPPED') && (
                <div>
                  <label className="block font-mono text-slate-400 text-[10px] uppercase font-bold mb-1">
                    Downtime Classification Category
                  </label>
                  <select
                    value={statusChangeModal.category}
                    onChange={e => setStatusChangeModal(prev => ({ ...prev, category: e.target.value as DowntimeCategory }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SCHEDULED_MAINTENANCE">SCHEDULED MAINTENANCE (บำรุงรักษาตามรอบ)</option>
                    <option value="TOOLING_REPAIR">TOOLING REPAIR / SWAP (ซ่อมแซม/สลับแม่พิมพ์)</option>
                    <option value="UNPLANNED_DOWN">UNPLANNED DOWN / BREAKDOWN (เครื่องจักรขัดข้องฉุกเฉิน)</option>
                    <option value="DIE_CHANGEOVER">DIE CHANGEOVER (เปลี่ยนแบบแม่พิมพ์)</option>
                    <option value="QUALITY_HOLD">QUALITY HOLD / INSPECTION (หยุดตรวจสอบคุณภาพ QC)</option>
                    <option value="OTHER">OTHER (อื่นๆ)</option>
                  </select>
                </div>
              )}

              {/* Reason Input */}
              <div>
                <label className="block font-mono text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Reason / Action Description <span className="text-slate-500 font-thai">(เหตุผลการหยุด/เปลี่ยนสถานะ)</span>
                </label>
                <input
                  type="text"
                  value={statusChangeModal.reason}
                  onChange={e => setStatusChangeModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={
                    statusChangeModal.targetStatus === 'MAINTENANCE' 
                      ? 'e.g. Scheduled die regrinding and lubrication check'
                      : statusChangeModal.targetStatus === 'STOPPED'
                      ? 'e.g. Emergency stop due to coil feed sensor trip'
                      : 'e.g. Resuming normal production shift'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStatusChangeModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-xs font-mono font-bold transition-all shadow"
              >
                Apply Status Change
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
