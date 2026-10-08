import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  X,
  Eye,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { ProductionLineId, RegrindingRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { regrindService } from '../../services/regrindService';
import { DateRangeFilter, isDateInSelectedRange } from '../../components/common/DateRangeFilter';
import { exportRegrindingHistoryExcel } from '../../utils/excelExport';
import { UnifiedRegrindJobModal } from '../../components/modals/UnifiedRegrindJobModal';

export interface UnifiedMasterLogsViewProps {
  initialLineId?: ProductionLineId;
  initialStatusFilter?: string;
  onNavigate?: (route: string, lineId?: ProductionLineId, statusFilter?: string) => void;
}

export const UnifiedMasterLogsView: React.FC<UnifiedMasterLogsViewProps> = ({
  initialLineId = 'E1',
  initialStatusFilter = 'ALL',
  onNavigate
}) => {
  const [historyRecords, setHistoryRecords] = useState<RegrindingRecord[]>([]);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [inspectModalRecord, setInspectModalRecord] = useState<RegrindingRecord | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Filters for Unified Master Logs
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableToolFilter, setTableToolFilter] = useState<string>('ALL');
  const [tableOperatorFilter, setTableOperatorFilter] = useState<string>('ALL');
  const [tableLineFilter, setTableLineFilter] = useState<string>('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>(initialStatusFilter);
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [tablePageSize, setTablePageSize] = useState<number>(25);

  useEffect(() => {
    if (initialStatusFilter) {
      setTableStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const linesList: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  const reloadData = () => {
    const recs = storageService.getRegrindRecords();
    setHistoryRecords(recs);
  };

  useEffect(() => {
    reloadData();
    const unsub = storageService.subscribe(() => {
      reloadData();
    });
    return () => unsub();
  }, []);

  // Filter dynamic dropdown options
  const availableToolOptions = useMemo(() => {
    const map = new Map<string, string>();
    historyRecords.forEach(r => {
      if (r.partCode) {
        map.set(r.partCode, `${r.partName || r.partCode} (${r.partCode})`);
      }
    });
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [historyRecords]);

  const availableOperatorOptions = useMemo(() => {
    const set = new Set<string>();
    historyRecords.forEach(r => {
      if (r.performedBy) set.add(r.performedBy);
    });
    return Array.from(set);
  }, [historyRecords]);

  const filteredHistory = useMemo(() => {
    return historyRecords.filter(rec => {
      // 1. Text Search (Tool ID, Operator, Job Code, Part Name, Serial/Lot)
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchSearch =
          (rec.jobCode && rec.jobCode.toLowerCase().includes(q)) ||
          (rec.workOrder && rec.workOrder.toLowerCase().includes(q)) ||
          (rec.partCode && rec.partCode.toLowerCase().includes(q)) ||
          (rec.partName && rec.partName.toLowerCase().includes(q)) ||
          (rec.partInstanceOrLot && rec.partInstanceOrLot.toLowerCase().includes(q)) ||
          (rec.serialNumber && rec.serialNumber.toLowerCase().includes(q)) ||
          (rec.performedBy && rec.performedBy.toLowerCase().includes(q)) ||
          (rec.note && rec.note.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // 2. Tool ID filter
      if (tableToolFilter !== 'ALL' && rec.partCode !== tableToolFilter) {
        return false;
      }

      // 3. Operator filter
      if (tableOperatorFilter !== 'ALL' && rec.performedBy !== tableOperatorFilter) {
        return false;
      }

      // 4. Line filter
      if (tableLineFilter !== 'ALL') {
        const rLine = rec.lineId || rec.lineLastUsed;
        if (rLine !== tableLineFilter) return false;
      }

      // 5. Status filter
      if (tableStatusFilter !== 'ALL') {
        if (tableStatusFilter === 'COMPLETED' || tableStatusFilter === 'READY TO USE') {
          if (rec.status !== 'READY TO USE' && rec.status !== 'COMPLETED' && rec.inspectionResult !== 'PASSED') return false;
        } else if (tableStatusFilter === 'WAITING REGRIND' || tableStatusFilter === 'ACTIVE') {
          if (rec.status !== 'WAITING REGRIND' && rec.status !== 'IN_PROCESS' && rec.status !== 'PENDING') return false;
        } else if (tableStatusFilter === 'AWAITING_INSPECTION') {
          if (rec.inspectionResult !== 'PENDING' && rec.inspectionStatus !== 'PENDING' && rec.status !== 'HOLD' && rec.status !== 'WAITING REGRIND') return false;
        } else if (tableStatusFilter === 'URGENT_CRITICAL') {
          if (rec.status !== 'MAXIMUM REGRIND' && rec.status !== 'SCRAP' && !rec.note?.toLowerCase().includes('urgent') && !rec.note?.includes('ด่วน')) return false;
        } else if (rec.status !== tableStatusFilter) {
          return false;
        }
      }

      // 6. Date Range filter
      if (historyStartDate || historyEndDate) {
        const recDate = rec.regrindDate || (rec.timestamp ? rec.timestamp.substring(0, 10) : '');
        if (!isDateInSelectedRange(recDate, historyStartDate, historyEndDate)) {
          return false;
        }
      }

      return true;
    });
  }, [
    historyRecords,
    tableSearch,
    tableToolFilter,
    tableOperatorFilter,
    tableLineFilter,
    tableStatusFilter,
    historyStartDate,
    historyEndDate
  ]);

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก CSV');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'No,Status,JobCode,WorkOrder,Date,Line,DieCode,PartCode,PartName,Operator,PreviousLengthMm,GrindRemovedMm,ResultLengthMm,CycleCount,MaxCycles,QCResult,Remarks\n';

    filteredHistory.forEach((rec, idx) => {
      const row = [
        idx + 1,
        `"${rec.status || 'READY'}"`,
        `"${rec.jobCode || ''}"`,
        `"${rec.workOrder || ''}"`,
        `"${rec.regrindDate || (rec.timestamp ? rec.timestamp.substring(0, 10) : '')}"`,
        `"${rec.lineId || rec.lineLastUsed || ''}"`,
        `"${rec.dieCode || rec.finDie || ''}"`,
        `"${rec.partCode || ''}"`,
        `"${rec.partName || ''}"`,
        `"${rec.performedBy || ''}"`,
        rec.previousLength !== undefined ? rec.previousLength.toFixed(2) : (rec.beforeGrindMm !== undefined ? rec.beforeGrindMm.toFixed(2) : ''),
        rec.actualGrindingRemovedMm !== undefined ? rec.actualGrindingRemovedMm.toFixed(3) : (rec.grindAmountMm !== undefined ? rec.grindAmountMm.toFixed(3) : ''),
        rec.currentLength !== undefined ? rec.currentLength.toFixed(2) : (rec.afterGrindMm !== undefined ? rec.afterGrindMm.toFixed(2) : ''),
        rec.regrindCountAfter || rec.regrindCycleCount || 1,
        rec.maxAllowedCycles || 4,
        `"${rec.inspectionResult || rec.inspectionStatus || 'PASSED'}"`,
        `"${(rec.note || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinDie_MasterLogs_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col space-y-3 p-2 sm:p-4 overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar font-sans text-slate-100">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 font-mono text-xs animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-950/95 border-amber-500 text-amber-200'
              : 'bg-rose-950/95 border-rose-500 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : notification.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container: Pure Log Records (No 31-Day Calendar Tabs) */}
      <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl space-y-3.5">
        {/* Header & Filter Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide">
                  รายการ Log ประวัติงานเจียระไน & รายการคัดทิ้งทั้งหมด (Unified Master Logs)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  {filteredHistory.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ฐานข้อมูลบันทึกประวัติการลับคม, ตรวจรับ QC, และคัดทิ้งแม่พิมพ์ทุกไลน์ (E1–E5) ครบถ้วน 100%
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap bg-slate-950/80 p-2.5 rounded-xl border border-white/5">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา Tool ID, ชื่อช่าง, Job Code, Lot..."
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Tool ID Filter */}
          <select
            value={tableToolFilter}
            onChange={e => setTableToolFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none font-bold cursor-pointer max-w-[180px]"
            title="กรองตามรหัสพั้นช์/ดาย (Tool ID)"
          >
            <option value="ALL">ทุก Tool ID (All Tools)</option>
            {availableToolOptions.map(tool => (
              <option key={tool.code} value={tool.code}>
                {tool.label}
              </option>
            ))}
          </select>

          {/* Operator Filter */}
          <select
            value={tableOperatorFilter}
            onChange={e => setTableOperatorFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:border-cyan-500 focus:outline-none font-bold cursor-pointer max-w-[180px]"
            title="กรองตามชื่อช่างผู้เจียร (Operator Name)"
          >
            <option value="ALL">ทุกช่างเจียร (All Operators)</option>
            {availableOperatorOptions.map(op => (
              <option key={op} value={op}>
                👤 {op}
              </option>
            ))}
          </select>

          {/* Line Filter */}
          <select
            value={tableLineFilter}
            onChange={e => setTableLineFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none font-bold cursor-pointer"
          >
            <option value="ALL">ทุกลายน์ (All Lines)</option>
            {linesList.map(l => (
              <option key={l} value={l}>
                LINE {l}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={tableStatusFilter}
            onChange={e => setTableStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none font-bold cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="WAITING REGRIND">🟡 WAITING REGRIND (กำลังทำ / รอเจียร)</option>
            <option value="READY TO USE">🟢 READY TO USE (เจียรเสร็จ / ผ่าน QC)</option>
            <option value="AWAITING_INSPECTION">🔵 AWAITING QC (รอตรวจวัด QC / HOLD)</option>
            <option value="URGENT_CRITICAL">🔴 URGENT (งานด่วน / ครบลิมิต / คัดทิ้ง)</option>
            <option value="MAXIMUM REGRIND">🟠 MAXIMUM REGRIND (ครบลิมิต)</option>
            <option value="SCRAP">🔴 SCRAP (คัดทิ้ง)</option>
            <option value="HOLD">⚪ HOLD (ระงับ)</option>
          </select>

          {/* Date Range Filter */}
          <DateRangeFilter
            startDate={historyStartDate}
            endDate={historyEndDate}
            onChangeRange={(s, e) => {
              setHistoryStartDate(s);
              setHistoryEndDate(e);
            }}
            maxDaysAllowed={90}
            compact={true}
          />

          {/* Clear Filters Button */}
          {(tableSearch ||
            tableToolFilter !== 'ALL' ||
            tableOperatorFilter !== 'ALL' ||
            tableLineFilter !== 'ALL' ||
            tableStatusFilter !== 'ALL' ||
            historyStartDate ||
            historyEndDate) && (
            <button
              type="button"
              onClick={() => {
                setTableSearch('');
                setTableToolFilter('ALL');
                setTableOperatorFilter('ALL');
                setTableLineFilter('ALL');
                setTableStatusFilter('ALL');
                setHistoryStartDate('');
                setHistoryEndDate('');
              }}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="ล้างตัวกรองทั้งหมด"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างค่า</span>
            </button>
          )}

          {/* Excel Export */}
          <button
            type="button"
            onClick={() => exportRegrindingHistoryExcel(filteredHistory, tableLineFilter)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ml-auto"
            title="ส่งออกรายงาน Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>

        {/* Master Log Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <th className="p-2.5 text-center w-10">#</th>
                <th className="p-2.5 text-center">สถานะ (Status)</th>
                <th className="p-2.5">Job Code / WO</th>
                <th className="p-2.5">วันที่ (Date)</th>
                <th className="p-2.5">ไลน์ / แม่พิมพ์</th>
                <th className="p-2.5">Tool ID & ชื่ออะไหล่</th>
                <th className="p-2.5">ช่างผู้เจียร (Operator)</th>
                <th className="p-2.5 text-right">เดิม (mm)</th>
                <th className="p-2.5 text-right">เจียรออก (mm)</th>
                <th className="p-2.5 text-right">หลังเจียร (mm)</th>
                <th className="p-2.5 text-center">รอบที่ / สูงสุด</th>
                <th className="p-2.5 text-center">ตรวจ QC</th>
                <th className="p-2.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500 font-sans">
                    ไม่พบข้อมูลงานเจียระไนที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredHistory.slice(0, tablePageSize).map((rec, idx) => (
                  <tr key={rec.id || idx} className="hover:bg-white/[0.04] transition-colors">
                    <td className="p-2.5 text-center font-bold text-cyan-400/80">
                      {idx + 1}
                    </td>

                    {/* Status Column */}
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          rec.status === 'READY TO USE' || rec.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : rec.status === 'MAXIMUM REGRIND'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : rec.status === 'SCRAP' || rec.status === 'SCRAPPED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : rec.status === 'WAITING REGRIND'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.status === 'READY TO USE' || rec.status === 'COMPLETED'
                              ? 'bg-emerald-400'
                              : rec.status === 'SCRAP' || rec.status === 'SCRAPPED'
                              ? 'bg-rose-400'
                              : rec.status === 'MAXIMUM REGRIND'
                              ? 'bg-orange-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span>
                          {rec.status === 'READY TO USE' || rec.status === 'COMPLETED'
                            ? 'เจียรแล้ว (READY)'
                            : rec.status === 'SCRAP' || rec.status === 'SCRAPPED'
                            ? 'ตัดทิ้ง (SCRAP)'
                            : rec.status === 'MAXIMUM REGRIND'
                            ? 'ครบลิมิต (MAX)'
                            : rec.status === 'WAITING REGRIND'
                            ? 'รอเจียร (WAITING)'
                            : rec.status}
                        </span>
                      </span>
                    </td>

                    <td className="p-2.5">
                      <span className="font-bold text-cyan-300 block text-xs">{rec.jobCode || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400">{rec.workOrder || '-'}</span>
                    </td>

                    <td className="p-2.5 text-slate-300 text-[11px]">
                      {rec.regrindDate || (rec.timestamp ? rec.timestamp.substring(0, 10) : '-')}
                    </td>

                    <td className="p-2.5">
                      <span className="text-white font-bold block text-xs">{rec.lineId || rec.lineLastUsed || 'E1'}</span>
                      <span className="text-[10px] text-slate-400">{rec.dieCode || rec.finDie || '-'}</span>
                    </td>

                    <td className="p-2.5 font-sans">
                      <span className="font-bold text-slate-100 block text-xs">{rec.partName}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {rec.partCode} {rec.partInstanceOrLot ? `• ${rec.partInstanceOrLot}` : ''}
                      </span>
                    </td>

                    <td className="p-2.5 font-sans text-slate-200 font-semibold text-xs">
                      {rec.performedBy || 'Thanakorn Phonpayung'}
                    </td>

                    <td className="p-2.5 text-right text-slate-300">
                      {rec.previousLength !== undefined
                        ? rec.previousLength.toFixed(2)
                        : rec.beforeGrindMm !== undefined
                        ? rec.beforeGrindMm.toFixed(2)
                        : '-'}
                    </td>

                    <td className="p-2.5 text-right font-bold text-cyan-300">
                      -{(rec.actualGrindingRemovedMm !== undefined
                        ? rec.actualGrindingRemovedMm
                        : rec.grindAmountMm !== undefined
                        ? rec.grindAmountMm
                        : rec.mmRemovedThisCycle || 0
                      ).toFixed(3)}
                    </td>

                    <td className="p-2.5 text-right font-bold text-white">
                      {rec.currentLength !== undefined
                        ? rec.currentLength.toFixed(2)
                        : rec.afterGrindMm !== undefined
                        ? rec.afterGrindMm.toFixed(2)
                        : '-'}
                    </td>

                    <td className="p-2.5 text-center text-xs">
                      <span className="font-bold text-slate-200">
                        {rec.regrindCountAfter || rec.regrindCycleCount || 1}
                      </span>
                      <span className="text-slate-500 text-[10px]"> / {rec.maxAllowedCycles || 4}</span>
                    </td>

                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.inspectionResult === 'PASSED' || rec.inspectionResult === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : rec.inspectionResult === 'CONDITIONAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : rec.inspectionResult === 'FAILED' || rec.inspectionResult === 'FAIL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rec.inspectionResult || rec.inspectionStatus || 'PASS'}
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setInspectModalRecord(rec)}
                        className="p-1.5 bg-white/[0.06] hover:bg-white/[0.15] text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="ดูรายละเอียดฉบับเต็ม"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
            <span>
              แสดง 1 ถึง {Math.min(tablePageSize, filteredHistory.length)} จากทั้งหมด {filteredHistory.length} รายการ
            </span>
            <div className="flex items-center gap-2">
              <span>แสดงแถว:</span>
              <select
                value={tablePageSize}
                onChange={e => setTablePageSize(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Full Record Inspection Modal */}
      {inspectModalRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="bg-[#0b101b] border-2 border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn font-sans"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>บันทึกงานเจียระไน: {inspectModalRecord.jobCode}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  LINE {inspectModalRecord.lineId || inspectModalRecord.lineLastUsed} • แม่พิมพ์{' '}
                  {inspectModalRecord.dieCode || inspectModalRecord.finDie}
                </span>
              </div>
              <button
                onClick={() => setInspectModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">สถานะ:</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] mt-1 ${
                    inspectModalRecord.status === 'READY TO USE' || inspectModalRecord.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : inspectModalRecord.status === 'SCRAP' || inspectModalRecord.status === 'SCRAPPED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {inspectModalRecord.status}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Serial / Lot:</span>
                <span className="font-mono text-cyan-300 mt-1 block">
                  {inspectModalRecord.partInstanceOrLot || inspectModalRecord.serialNumber || '-'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ชื่อชิ้นส่วน & รหัส:</span>
                <span className="font-bold text-slate-200 mt-1 block">
                  {inspectModalRecord.partName} ({inspectModalRecord.partCode})
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ช่างผู้ปฏิบัติงาน:</span>
                <span className="font-bold text-slate-200 mt-1 block">{inspectModalRecord.performedBy || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ความยาวก่อน &rarr; หลังเจียร:</span>
                <span className="font-mono font-bold text-slate-100 mt-1 block">
                  {(inspectModalRecord.previousLength !== undefined
                    ? inspectModalRecord.previousLength
                    : inspectModalRecord.beforeGrindMm || 0
                  ).toFixed(2)}{' '}
                  mm &rarr;{' '}
                  {(inspectModalRecord.currentLength !== undefined
                    ? inspectModalRecord.currentLength
                    : inspectModalRecord.afterGrindMm || 0
                  ).toFixed(2)}{' '}
                  mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ระยะที่เจียรออก:</span>
                <span className="font-mono font-bold text-cyan-300 mt-1 block">
                  -{(inspectModalRecord.actualGrindingRemovedMm !== undefined
                    ? inspectModalRecord.actualGrindingRemovedMm
                    : inspectModalRecord.grindAmountMm !== undefined
                    ? inspectModalRecord.grindAmountMm
                    : inspectModalRecord.mmRemovedThisCycle || 0
                  ).toFixed(3)}{' '}
                  mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">รอบการเจียร:</span>
                <span className="font-mono text-slate-200 mt-1 block">
                  รอบที่ {inspectModalRecord.regrindCountAfter || inspectModalRecord.regrindCycleCount || 1} /{' '}
                  {inspectModalRecord.maxAllowedCycles || 4}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">ผลการตรวจรับ QC:</span>
                <span className="font-bold text-emerald-400 mt-1 block">
                  {inspectModalRecord.inspectionResult || inspectModalRecord.inspectionStatus || 'PASSED'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 block mb-1 font-bold">หมายเหตุ / ข้อมูลเพิ่มเติม:</span>
              <p className="italic text-slate-200">{inspectModalRecord.note || 'ไม่มีหมายเหตุเพิ่มเติม'}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectModalRecord(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Regrind Job Modal */}
      <UnifiedRegrindJobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSaved={msg => {
          setIsJobModalOpen(false);
          reloadData();
          setNotification({ type: 'success', message: msg });
        }}
        initialLineId={initialLineId}
      />
    </div>
  );
};
