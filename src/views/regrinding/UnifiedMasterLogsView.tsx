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
import { RegrindWorkTicket } from '../../types/regrind';
import { storageService } from '../../services/storageService';
import { regrindService } from '../../services/regrindService';
import { DateRangeFilter, isDateInSelectedRange } from '../../components/common/DateRangeFilter';
import { exportRegrindingHistoryExcel } from '../../utils/excelExport';
import { UnifiedRegrindJobModal } from '../../components/modals/UnifiedRegrindJobModal';
import { getUnifiedStatusMeta, resolveUnifiedStatusKey } from '../../utils/statusHelper';

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
  const [isJobModalOpen, setIsJobModalOpen] = useState<boolean>(false);
  const [inspectModalRecord, setInspectModalRecord] = useState<RegrindingRecord | null>(null);
  const [editingTicket, setEditingTicket] = useState<RegrindWorkTicket | null>(null);

  const sysSettings = storageService.getSettings();
  const sysLanguage = sysSettings?.language || 'TH';
  const isEnglish = sysLanguage === 'EN';

  const handleOpenTicketModal = (rec: RegrindingRecord) => {
    const queueTickets = regrindService.getQueueTickets();
    const existingTicket = queueTickets.find(t => 
      t.jobCode === rec.jobCode || 
      t.id === rec.jobCode || 
      t.id === rec.id || 
      (t.partCode === rec.partCode && t.lineId === rec.lineId && t.scheduledDate === rec.regrindDate)
    );

    if (existingTicket) {
      setEditingTicket(existingTicket);
    } else {
      const partMaster = partMasterMap.get(rec.partCode);
      const isStatusReady = (rec.status as string) === 'READY TO USE' || (rec.status as string) === 'COMPLETED';
      const isStatusScrap = (rec.status as string) === 'SCRAP' || (rec.status as string) === 'SCRAPPED';
      const isEmergencyJob = (rec.status as string) === 'EMERGENCY';

      const constructedTicket: RegrindWorkTicket = {
        id: rec.jobCode || rec.id || `JOB-RGD-${Date.now()}`,
        jobCode: rec.jobCode || `JOB-RGD-${new Date().getFullYear()}-001`,
        qrCode: rec.partInstanceOrLot || `QR-${rec.lineId || 'E1'}-${rec.partCode}`,
        picCategory: partMaster?.category?.toLowerCase() || 'punch',
        source: 'MANUAL_ENTRY',
        receivedDate: rec.regrindDate || (rec.timestamp ? rec.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        receivedBy: rec.performedBy || 'Thanakorn Phonpayung',
        lineId: (rec.lineId || rec.lineLastUsed || 'E1') as ProductionLineId,
        partCode: rec.partCode,
        partName: rec.partName,
        quantity: rec.quantity || 1,
        assignedTechnician: rec.performedBy || rec.technicianName || 'Thanakorn Phonpayung',
        scheduledDate: rec.regrindDate || (rec.timestamp ? rec.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        targetCompletionDate: `${rec.regrindDate || new Date().toISOString().slice(0, 10)}T17:00:00.000Z`,
        urgency: isEmergencyJob ? 'EMERGENCY' : 'NORMAL',
        isEmergency: isEmergencyJob,
        status: isStatusReady ? 'READY' : (isStatusScrap ? 'SCRAP' : 'PENDING'),
        nominalLengthMm: rec.newSpecMm || partMaster?.newSpecMm || 62.50,
        minAllowedLengthMm: rec.scrapLimitMm || partMaster?.scrapLimitMm || 61.00,
        previousLengthMm: rec.previousLength !== undefined ? rec.previousLength : (rec.beforeGrindMm || 62.50),
        grindDepthMm: rec.actualGrindingRemovedMm !== undefined ? rec.actualGrindingRemovedMm : 0.10,
        lengthAfterGrindMm: rec.currentLength !== undefined ? rec.currentLength : (rec.afterGrindMm || 62.40),
        shimAddedMm: 0,
        regrindCountBefore: rec.regrindCountBefore || 0,
        regrindCountAfter: rec.regrindCountAfter || rec.regrindCycleCount || 1,
        maxRegrindAllowed: rec.maxAllowedCycles || 15,
        defectReason: (rec.defectReason as any) || 'NORMAL_WEAR',
        defectNotes: rec.note || rec.remarks || '',
        remarks: rec.note || rec.remarks || '',
        laborHours: rec.laborHours || (rec.laborTimeMinutes ? rec.laborTimeMinutes / 60 : 1.0),
        sparePartsUsed: rec.sparePartsUsed || '',
        sparePartsCost: rec.sparePartsCost || 0,
        dieCode: rec.dieCode || rec.finDie || 'FD-E1-07',
        isScrapped: isStatusScrap,
        createdAt: rec.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setEditingTicket(constructedTicket);
    }
    setIsJobModalOpen(true);
  };
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

  // Create a map of part masters for quick lookup
  const partMasterMap = useMemo(() => {
    const map = new Map<string, any>();
    storageService.getPartMasters().forEach(p => map.set(p.partCode, p));
    return map;
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
        const itemKey = resolveUnifiedStatusKey(rec);
        if (tableStatusFilter === 'READY TO USE' || tableStatusFilter === 'READY') {
          if (itemKey !== 'READY') return false;
        } else if (tableStatusFilter === 'WAITING REGRIND' || tableStatusFilter === 'WAITING') {
          if (itemKey !== 'WAITING') return false;
        } else if (tableStatusFilter === 'MAXIMUM REGRIND' || tableStatusFilter === 'SCRAP') {
          if (itemKey !== 'SCRAP') return false;
        } else if (itemKey !== tableStatusFilter) {
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
    csvContent += 'No,Status,JobCode,WorkOrder,Date,Line,DieCode,PartCode,PartName,Operator,PreviousLengthMm,GrindRemovedMm,ResultLengthMm,CycleCount,MaxCycles,QCResult,Remarks,NewPrice,RepairCost,NetSaving,SavingPercent\n';

    filteredHistory.forEach((rec, idx) => {
      const partMaster = partMasterMap.get(rec.partCode);
      const newPrice = partMaster?.unitCostThb || 0;
      const repairCost = (rec.cost || 0) + (rec.sparePartsCost || 0);
      const netSaving = Math.max(0, newPrice - repairCost);
      const savingPercent = newPrice > 0 ? ((netSaving / newPrice) * 100).toFixed(1) + '%' : '0%';

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
        `"${(rec.note || '').replace(/"/g, '""')}"`,
        newPrice.toFixed(2),
        repairCost.toFixed(2),
        netSaving.toFixed(2),
        savingPercent
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

          {/* Status Filter (Canonical 6 Operational States) */}
          <select
            value={tableStatusFilter}
            onChange={e => setTableStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none font-bold cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ (All Statuses)</option>
            <option value="EMERGENCY">🚨 งานด่วน #1 (Urgent Job)</option>
            <option value="WAITING">⏳ รอคิวเจียร (Waiting Queue)</option>
            <option value="POSTPONED">🟡 งานเลื่อน (Postponed / Shifted)</option>
            <option value="READY">🔵 งานเจียรเสร็จแล้ว (รอตรวจ QC)</option>
            <option value="COMPLETED">🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)</option>
            <option value="SCRAP">❌ ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร)</option>
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

        {/* Master Log Table - Full 20 Column Engineering Matrix */}
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar rounded-xl border border-white/10">
          <table className="min-w-[2000px] w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#090d16] text-slate-300 font-mono border-b border-slate-800 shadow-md">
              <tr>
                <th className="p-2.5 text-center w-10">#</th>
                <th className="p-2.5 text-center whitespace-nowrap">{isEnglish ? 'Status' : 'สถานะ'}</th>
                <th className="p-2.5 whitespace-nowrap">Job Code</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Scheduled Date' : 'วันที่ลงคิว'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Grind Finished Date' : 'วันที่เจียรเสร็จสิ้น'}</th>
                <th className="p-2.5 text-center whitespace-nowrap">{isEnglish ? 'Line' : 'ไลน์'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Die Code' : 'แม่พิมพ์'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Part Name' : 'ชื่อชิ้นงาน'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Drawing' : 'Drawing Code'}</th>
                <th className="p-2.5 text-center whitespace-nowrap">{isEnglish ? 'Qty' : 'จำนวน'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'New Spec' : 'สเปคซื้อใหม่'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'Current Height' : 'ก่อนเจียร'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'Height After' : 'หลังเจียร'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'Scrap Limit' : 'ระยะ Min'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Defect Reason / สาเหตุ' : 'สาเหตุ / Defect Reason'}</th>
                <th className="p-2.5 text-center whitespace-nowrap">{isEnglish ? 'Labor Time (min)' : 'เวลาเจียร (นาที)'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'Labor Cost' : 'ค่าแรง'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'New Price' : 'ราคาซื้อใหม่'}</th>
                <th className="p-2.5 text-right whitespace-nowrap">{isEnglish ? 'Net Saving' : 'ประหยัดสุทธิ'}</th>
                <th className="p-2.5 text-center whitespace-nowrap">Saving %</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Operator' : 'ช่างเจียร'}</th>
                <th className="p-2.5 whitespace-nowrap">{isEnglish ? 'Remarks' : 'หมายเหตุ'}</th>
                <th className="p-2.5 text-center whitespace-nowrap">{isEnglish ? 'Actions' : 'จัดการ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={23} className="p-8 text-center text-slate-500 font-sans">
                    ไม่พบข้อมูลงานเจียระไนที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredHistory.slice(0, tablePageSize).map((rec, idx) => {
                  const partMaster = partMasterMap.get(rec.partCode);
                  
                  // Calculations for 20 fields
                  const drawingNo = rec.drawingNo || rec.drawingNumber || partMaster?.drawingNumber || (rec.partCode ? rec.partCode.replace(/^[A-Z0-9]+-/, '') : 'DWG-PB-001');
                  const qty = rec.quantity || 1;
                  const newSpec = rec.newSpecMm !== undefined ? rec.newSpecMm : (partMaster?.newSpecMm || 62.50);
                  const currentH = rec.previousLength !== undefined ? rec.previousLength : (rec.beforeGrindMm || 62.50);
                  const afterH = rec.currentLength !== undefined ? rec.currentLength : (rec.afterGrindMm || 62.40);
                  const scrapLimit = rec.scrapLimitMm !== undefined ? rec.scrapLimitMm : (partMaster?.scrapLimitMm || 61.00);
                  
                  const reasonLabel = rec.defectReason 
                    ? (rec.defectReason === 'NORMAL_WEAR' ? 'NORMAL WEAR (สึกหรอปกติ)'
                      : rec.defectReason === 'BURR_EXCESSIVE' ? 'BURR EXCESSIVE (ครีบสูงเกิน)'
                      : rec.defectReason === 'CHIPPED' ? 'CHIPPED (คมบิ่น/กะเทาะ)'
                      : rec.defectReason === 'GALLING_SCRATCHED' ? 'GALLING (ผิวเป็นรอย/เศษติด)'
                      : rec.defectReason === 'OUT_OF_TOLERANCE' ? 'OUT OF SPEC (หลุดสเปค Min)'
                      : rec.defectReason === 'BROKEN' ? 'BROKEN (แตกหักชำรุด)'
                      : rec.defectReason)
                    : 'NORMAL WEAR (สึกหรอปกติ)';

                  const laborMinutes = rec.laborTimeMinutes !== undefined
                    ? rec.laborTimeMinutes
                    : Math.round((rec.laborHours !== undefined ? rec.laborHours : 1) * 60);

                  const laborCost = rec.laborCostThb !== undefined
                    ? rec.laborCostThb
                    : Math.round((laborMinutes / 60) * 180);

                  const newPrice = rec.newPartPriceThb !== undefined
                    ? rec.newPartPriceThb
                    : (partMaster?.unitCostThb || partMaster?.purchasePriceThb || 12500);

                  const spareCost = rec.sparePartsCost !== undefined ? Number(rec.sparePartsCost) : 0;
                  const netSaving = rec.netSavingThb !== undefined
                    ? rec.netSavingThb
                    : Math.max(0, newPrice - (laborCost + spareCost));

                  const savingPct = rec.savingPercent !== undefined
                    ? (typeof rec.savingPercent === 'number' ? `${rec.savingPercent.toFixed(1)}%` : rec.savingPercent)
                    : (newPrice > 0 ? `${((netSaving / newPrice) * 100).toFixed(1)}%` : '0%');

                  const operator = rec.performedBy || rec.technicianName || 'Thanakorn Phonpayung';
                  const noteText = rec.note || rec.remarks || 'ลับคมด้วยหิน CBN #400';

                  return (
                  <tr key={rec.id ? `log-${rec.id}-${idx}` : `idx-${idx}`} className="hover:bg-white/[0.04] transition-colors">
                    {/* 1. Row No */}
                    <td className="p-2.5 text-center font-bold text-cyan-400/80">
                      {idx + 1}
                    </td>

                    {/* 2. Status */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {(() => {
                        const meta = getUnifiedStatusMeta(rec);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold whitespace-nowrap shadow-sm ${
                              meta.pillClass || meta.badgeClass
                            }`}
                            title={meta.label}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.shortLabel}</span>
                          </span>
                        );
                      })()}
                    </td>

                    {/* 3. Job Code */}
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="font-bold text-cyan-300 block text-xs">{rec.jobCode || 'N/A'}</span>
                    </td>

                    {/* 4. Scheduled Date */}
                    <td className="p-2.5 text-slate-300 text-[11px] whitespace-nowrap">
                      {rec.regrindDate || (rec.timestamp ? rec.timestamp.substring(0, 10) : '-')}
                    </td>

                    {/* 4.1. Grind Finished Date */}
                    <td className="p-2.5 whitespace-nowrap">
                      {rec.completedDate ? (
                        <span className="text-emerald-300 font-bold flex items-center gap-1">
                          <span>✓</span>
                          <span>{rec.completedDate.length >= 10 ? rec.completedDate.substring(0, 10) : rec.completedDate}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">-</span>
                      )}
                    </td>

                    {/* 5. Line */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <span className="text-white font-bold block text-xs">{rec.lineId || rec.lineLastUsed || 'E1'}</span>
                    </td>

                    {/* 6. Die Code */}
                    <td className="p-2.5 text-slate-300 font-bold whitespace-nowrap">
                      {rec.dieCode || rec.finDie || 'FD-E1-07'}
                    </td>

                    {/* 7. Part Name */}
                    <td className="p-2.5 font-sans whitespace-nowrap">
                      <span className="font-bold text-slate-100 block text-xs">{rec.partName}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{rec.partCode}</span>
                    </td>

                    {/* 8. Drawing Code */}
                    <td className="p-2.5 font-mono text-cyan-200 font-bold whitespace-nowrap">
                      {drawingNo}
                    </td>

                    {/* 9. Qty */}
                    <td className="p-2.5 text-center font-bold text-slate-200 whitespace-nowrap">
                      {qty}
                    </td>

                    {/* 10. New Spec mm */}
                    <td className="p-2.5 text-right font-bold text-slate-300 whitespace-nowrap">
                      {newSpec.toFixed(2)} mm
                    </td>

                    {/* 11. Current Height mm */}
                    <td className="p-2.5 text-right font-bold text-amber-300 whitespace-nowrap">
                      {currentH.toFixed(2)} mm
                    </td>

                    {/* 12. Height After Regrind mm */}
                    <td className="p-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                      {afterH.toFixed(2)} mm
                    </td>

                    {/* 13. Scrap Limit mm */}
                    <td className="p-2.5 text-right font-bold text-rose-400 whitespace-nowrap">
                      {scrapLimit.toFixed(2)} mm
                    </td>

                    {/* 14. Defect / Grind Reason */}
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                        {reasonLabel}
                      </span>
                    </td>

                    {/* 15. Labor Time (Minutes strictly) */}
                    <td className="p-2.5 text-center font-bold text-sky-300 whitespace-nowrap">
                      {laborMinutes}
                    </td>

                    {/* 16. Labor Cost THB */}
                    <td className="p-2.5 text-right font-bold text-amber-300 whitespace-nowrap">
                      ฿{laborCost.toLocaleString()}
                    </td>

                    {/* 17. New Part Price THB */}
                    <td className="p-2.5 text-right font-bold text-slate-200 whitespace-nowrap">
                      ฿{newPrice.toLocaleString()}
                    </td>

                    {/* 18. Net Saving THB */}
                    <td className="p-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                      ฿{netSaving.toLocaleString()}
                    </td>

                    {/* 19. Saving % */}
                    <td className="p-2.5 text-center font-bold text-cyan-300 whitespace-nowrap">
                      {savingPct}
                    </td>

                    {/* 20. Operator Name */}
                    <td className="p-2.5 text-slate-200 font-sans whitespace-nowrap">
                      👤 {operator}
                    </td>

                    {/* 21. Remarks / Notes */}
                    <td className="p-2.5 text-slate-400 font-sans text-[11px] max-w-[200px] truncate" title={noteText}>
                      {noteText}
                    </td>

                    {/* 22. Actions */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenTicketModal(rec)}
                        className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg transition-all cursor-pointer flex items-center gap-1 mx-auto"
                        title={isEnglish ? 'View & Edit Ticket' : 'แก้ไข/ดูใบลงคิวงาน'}
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px] font-bold">{isEnglish ? 'Edit' : 'แก้ไข'}</span>
                      </button>
                    </td>
                  </tr>
                  );
                })
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
        existingTicket={editingTicket}
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingTicket(null);
        }}
        onSaved={msg => {
          setIsJobModalOpen(false);
          setEditingTicket(null);
          reloadData();
          setNotification({ type: 'success', message: msg });
        }}
        initialLineId={initialLineId}
      />
    </div>
  );
};
