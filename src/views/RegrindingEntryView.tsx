import React, { useState, useEffect, useMemo } from 'react';
import { DateRangeFilter, isDateInSelectedRange } from '../components/common/DateRangeFilter';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Layers, 
  Wrench,
  Sparkles,
  History,
  ShieldAlert,
  Sliders,
  FileText,
  Download,
  Search,
  Check,
  X,
  UserCheck,
  Building,
  UploadCloud,
  Eye,
  Plus,
  Edit2,
  Trash2,
  DollarSign
} from 'lucide-react';
import { 
  ProductionLineId, 
  RegrindingRecord, 
  RegrindMasterStandard, 
  RegrindPartStatus,
  LineLiveMonitoringData,
  LINE_INFO_MAP 
} from '../types';
import { storageService } from '../services/storageService';
import { formatShots } from '../services/calculationService';
import { exportRegrindingHistoryExcel } from '../utils/excelExport';

export const RegrindingEntryView: React.FC = () => {
  const [selectedLineId, setSelectedLineId] = useState<ProductionLineId>('E1');
  const [standards, setStandards] = useState<RegrindMasterStandard[]>([]);
  const [historyRecords, setHistoryRecords] = useState<RegrindingRecord[]>([]);
  const [currentUser, setCurrentUser] = useState(storageService.getCurrentUser());

  // Form Fields
  const [selectedPartCode, setSelectedPartCode] = useState<string>('P-LOUV-001');
  const [partInstanceOrLot, setPartInstanceOrLot] = useState<string>('');
  const [dieCode, setDieCode] = useState<string>('FD-E1-07');
  const [previousLength, setPreviousLength] = useState<number>(49.85);
  const [actualGrindingRemovedMm, setActualGrindingRemovedMm] = useState<number>(0.05);
  const [currentLength, setCurrentLength] = useState<number>(49.80);
  const [regrindCountBefore, setRegrindCountBefore] = useState<number>(1);
  const [supplierOrInternalProcess, setSupplierOrInternalProcess] = useState<'INTERNAL_TOOL_ROOM' | 'EXTERNAL_VENDOR'>('INTERNAL_TOOL_ROOM');
  const [vendorName, setVendorName] = useState<string>('Internal Fin Die Tool Room (In-House)');
  const [workOrder, setWorkOrder] = useState<string>('');
  const [cost, setCost] = useState<number>(3500);
  const [measuredRa, setMeasuredRa] = useState<number>(0.12);
  const [hardnessHrc, setHardnessHrc] = useState<number>(62.5);
  const [inspectionResult, setInspectionResult] = useState<'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL'>('PASSED');
  const [verifiedBy, setVerifiedBy] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [regrindReason, setRegrindReason] = useState<string>('Periodic Preventive Maintenance');
  const [regrindDate, setRegrindDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [note, setNote] = useState<string>('');
  const [evidenceFileName, setEvidenceFileName] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'entry' | 'standards' | 'history'>('entry');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [editingStandard, setEditingStandard] = useState<RegrindMasterStandard | null>(null);
  const [inspectModalRecord, setInspectModalRecord] = useState<RegrindingRecord | null>(null);
  const [quickInspectRecord, setQuickInspectRecord] = useState<RegrindingRecord | null>(null);
  const [quickInspectDecision, setQuickInspectDecision] = useState<'PASSED' | 'FAILED' | 'CONDITIONAL'>('PASSED');
  const [quickInspectNotes, setQuickInspectNotes] = useState<string>('');

  const linesList: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

  const reloadData = () => {
    setStandards(storageService.getRegrindMasterStandards());
    setHistoryRecords(storageService.getRegrindRecords());
    setCurrentUser(storageService.getCurrentUser());
  };

  useEffect(() => {
    setPerformedBy('');
    setVerifiedBy('');
    reloadData();
    const unsub = storageService.subscribe(reloadData);
    return () => unsub();
  }, [selectedLineId]);

  // When selectedPartCode changes, auto-fill default nominals from standard
  useEffect(() => {
    const std = standards.find(s => s.partCode === selectedPartCode);
    if (std) {
      const nom = std.nominalLengthMm || 50.0;
      const grindAmt = std.grindingAmountPerTimeMm || 0.05;
      setPreviousLength(nom);
      setActualGrindingRemovedMm(grindAmt);
      setCurrentLength(Number((nom - grindAmt).toFixed(3)));
      setPartInstanceOrLot(`LOT-${selectedPartCode.replace('P-', '')}-01`);
      if (!workOrder) {
        setWorkOrder(`WO-RGD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      }
    }
  }, [selectedPartCode, standards]);

  // Sync currentLength whenever previousLength or actualGrindingRemovedMm changes
  const handlePreviousLengthChange = (val: number) => {
    setPreviousLength(val);
    setCurrentLength(Number((val - actualGrindingRemovedMm).toFixed(3)));
  };

  const handleActualRemovedChange = (val: number) => {
    setActualGrindingRemovedMm(val);
    setCurrentLength(Number((previousLength - val).toFixed(3)));
  };

  const handleCurrentLengthChange = (val: number) => {
    setCurrentLength(val);
    setActualGrindingRemovedMm(Number((previousLength - val).toFixed(3)));
  };

  const selectedStandard: RegrindMasterStandard | undefined = standards.find(s => s.partCode === selectedPartCode);

  // Live Calculations
  const calculatedNextCycle = regrindCountBefore + 1;
  const maxCycles = selectedStandard?.maxRegrindCount || 4;
  const remainingCycles = Math.max(0, maxCycles - calculatedNextCycle);
  const minAllowedLength = selectedStandard?.minAllowedLengthMm || (selectedStandard ? selectedStandard.nominalLengthMm - selectedStandard.totalGrindingAllowanceMm : 48.0);
  const isLengthOutOfSpec = currentLength < minAllowedLength;
  const isMaxCyclesReached = calculatedNextCycle >= maxCycles;
  const isRegrindBlocked = selectedStandard && (!selectedStandard.regrindAllowed || selectedStandard.disposeAfterOneUse);

  // Status computation for display
  let previewStatus: RegrindPartStatus = 'WAITING REGRIND';
  if (isLengthOutOfSpec) {
    previewStatus = 'SCRAP';
  } else if (isMaxCyclesReached) {
    previewStatus = 'MAXIMUM REGRIND';
  } else if (inspectionResult === 'PASSED') {
    previewStatus = 'READY TO USE';
  } else if (inspectionResult === 'FAILED') {
    previewStatus = 'SCRAP';
  } else {
    previewStatus = 'HOLD';
  }

  // Handle Submit Regrind Record
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStandard) {
      setNotification({ type: 'error', message: 'Please select a valid tooling part standard.' });
      return;
    }

    if (!performedBy || !performedBy.trim()) {
      setNotification({ type: 'error', message: 'Mandatory User ID Check: Please specify Technician Name / ID (Performed By).' });
      return;
    }

    if (!regrindReason || !regrindReason.trim()) {
      setNotification({ type: 'error', message: 'Reason selection is mandatory before submission.' });
      return;
    }

    if (!regrindDate || !regrindDate.trim()) {
      setNotification({ type: 'error', message: 'Date selection is mandatory before submission.' });
      return;
    }

    if (isRegrindBlocked) {
      setNotification({
        type: 'error',
        message: `Rule 1 & 2 Violation: Regrinding is prohibited for ${selectedStandard.partName} (Single Use / Not Allowed).`
      });
      return;
    }

    const result = storageService.recordRegrind({
      lineId: selectedLineId,
      lineLastUsed: selectedLineId,
      dieCode,
      finDie: dieCode,
      partCode: selectedStandard.partCode,
      partName: selectedStandard.partName,
      partInstanceOrLot: partInstanceOrLot || `SN-${selectedStandard.partCode}-01`,
      serialNumber: partInstanceOrLot,
      previousLength,
      currentLength,
      actualGrindingRemovedMm,
      regrindCountBefore,
      regrindCountAfter: calculatedNextCycle,
      remainingRegrindCount: remainingCycles,
      maxAllowedCycles: maxCycles,
      supplierOrInternalProcess,
      vendorName,
      workOrder,
      cost,
      measuredRa,
      hardnessHrc,
      inspectionResult,
      verifiedBy,
      performedBy,
      note: `${note} [Reason: ${regrindReason}]`,
      evidence: evidenceFileName || undefined,
      status: previewStatus,
      isInspectionApproved: inspectionResult === 'PASSED',
      regrindDate
    });

    if (result.success) {
      setPerformedBy('');
      setVerifiedBy('');
      setNotification({
        type: 'success',
        message: `Successfully logged re-grinding job ${result.record?.jobCode} for ${selectedStandard.partName}. Status: ${result.record?.status}`
      });
      reloadData();
      // Reset form
      setWorkOrder(`WO-RGD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setNote('');
      setTimeout(() => setActiveTab('history'), 1200);
    } else {
      setNotification({
        type: 'error',
        message: result.error || 'Failed to record re-grinding job.'
      });
    }
  };

  // Quick Inspection Sign-Off
  const handleQuickInspectionConfirm = () => {
    if (!quickInspectRecord) return;
    const res = storageService.approveRegrindInspection(
      quickInspectRecord.id,
      currentUser.name,
      quickInspectDecision,
      quickInspectNotes
    );
    if (res.success) {
      setNotification({
        type: 'success',
        message: `Inspection result (${quickInspectDecision}) approved for Job ${quickInspectRecord.jobCode}.`
      });
      setQuickInspectRecord(null);
      setQuickInspectNotes('');
      reloadData();
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to update inspection' });
    }
  };

  // Save Master Standard Changes
  const handleSaveStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStandard) return;

    storageService.saveRegrindMasterStandard(editingStandard);
    setEditingStandard(null);
    setNotification({
      type: 'success',
      message: `Updated Regrind Master Standard for ${editingStandard.partName}.`
    });
    reloadData();
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter(rec => {
      const matchesSearch =
        rec.jobCode.toLowerCase().includes(historySearch.toLowerCase()) ||
        rec.partName.toLowerCase().includes(historySearch.toLowerCase()) ||
        rec.partCode.toLowerCase().includes(historySearch.toLowerCase()) ||
        (rec.partInstanceOrLot && rec.partInstanceOrLot.toLowerCase().includes(historySearch.toLowerCase())) ||
        (rec.workOrder && rec.workOrder.toLowerCase().includes(historySearch.toLowerCase()));
      const matchesStatus = historyStatusFilter === 'ALL' || rec.status === historyStatusFilter;
      const matchesDate = isDateInSelectedRange(rec.regrindDate || rec.createdDateTime || (rec as any).date, historyStartDate, historyEndDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [historyRecords, historySearch, historyStatusFilter, historyStartDate, historyEndDate]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Job Code',
      'Part Code',
      'Part Name',
      'Instance/Lot/SN',
      'Line',
      'Die Code',
      'Previous Length (mm)',
      'Current Length (mm)',
      'Removed (mm)',
      'Cycle Count',
      'Max Allowed Cycles',
      'Remaining Cycles',
      'Inspection Result',
      'Status',
      'Vendor / Shop',
      'Work Order',
      'Cost (THB)',
      'Date',
      'Technician',
      'Verified By'
    ];

    const rows = filteredHistory.map(r => [
      r.jobCode,
      r.partCode,
      `"${r.partName}"`,
      `"${r.partInstanceOrLot || r.serialNumber || ''}"`,
      r.lineId || r.lineLastUsed || '',
      r.dieCode || r.finDie || '',
      r.previousLength,
      r.currentLength,
      r.actualGrindingRemovedMm || r.mmRemovedThisCycle,
      r.regrindCountAfter || r.regrindCycleCount,
      r.maxAllowedCycles,
      r.remainingRegrindCount || 0,
      r.inspectionResult,
      r.status,
      `"${r.vendorName || r.grinderVendor || ''}"`,
      r.workOrder || '',
      r.cost || 0,
      r.regrindDate || r.timestamp?.substring(0, 10),
      `"${r.performedBy || r.technicianName}"`,
      `"${r.verifiedBy || r.inspectorName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinPress_Regrinding_Control_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card & Tabs Navigation (Sticky Locked at Top) */}
      <div id="regrind-header" className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <RotateCcw className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Regrinding Control
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-thai">
              ระบบบันทึกประวัติเจียระไนลับคมชิ้นส่วนแม่พิมพ์
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
          <div className="flex items-center gap-2">
            <button
              id="tab-regrind-entry"
              onClick={() => setActiveTab('entry')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'entry'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              New Entry
            </button>
            <button
              id="tab-regrind-history"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              History ({Math.min(10, historyRecords.length)})
            </button>
            <button
              id="tab-regrind-standards"
              onClick={() => setActiveTab('standards')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'standards'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Standards
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div 
          className={`p-4 rounded-lg text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
              : notification.type === 'warning'
              ? 'bg-amber-950/80 border border-amber-600 text-amber-300'
              : 'bg-rose-950/80 border border-rose-600 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-black/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: NEW REGRINDING TRANSACTION ENTRY */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (Col 8) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Re-grinding Job Record Form</span>
                <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono">
                  ISO / QC Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate grinding removal, check allowable dimensional limits, and verify post-grinding inspection.
              </p>
            </div>

            {/* Block Warning if single use */}
            {isRegrindBlocked && (
              <div className="p-4 bg-rose-950/70 border border-rose-600/80 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-200 uppercase">Regrinding Prohibited (Rule 1 & 2)</h4>
                  <p className="text-xs text-rose-300 mt-0.5">
                    {selectedStandard?.partName} ({selectedStandard?.partCode}) is marked as{' '}
                    <strong>{selectedStandard?.disposeAfterOneUse ? 'DISPOSE AFTER 1 USE' : 'REGRIND NOT ALLOWED'}</strong>.
                    Submission for this part is blocked by system safety rules.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Component & Target Die Selection */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  1. Component & Die Traceability
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Select Part Standard */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Component (Part Master) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="select-regrind-part"
                      value={selectedPartCode}
                      onChange={e => setSelectedPartCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                    >
                      {standards.map(s => (
                        <option key={s.partCode} value={s.partCode}>
                          {s.partCode} - {s.partName} {!s.regrindAllowed && '(NO REGRIND)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Instance / Lot / Serial */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Part Instance / Lot / Serial <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="input-part-instance"
                      type="text"
                      value={partInstanceOrLot}
                      onChange={e => setPartInstanceOrLot(e.target.value)}
                      placeholder="ระบุ Serial No..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Production Line & Die */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Line & Fin Die Code <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={selectedLineId}
                        onChange={e => setSelectedLineId(e.target.value as ProductionLineId)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 font-mono"
                      >
                        {linesList.map(l => {
                          const displayLine = l.startsWith('E3-') ? 'E3' : l;
                          const tag = LINE_INFO_MAP[l]?.shortTag || l;
                          return (
                            <option key={l} value={l}>LINE {displayLine} ({tag})</option>
                          );
                        })}
                      </select>
                      <input
                        type="text"
                        value={dieCode}
                        onChange={e => setDieCode(e.target.value)}
                        placeholder="รหัสแม่พิมพ์..."
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs font-mono text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Dimensional Measurement & Grinding Removal */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  2. Dimensional Precision & Removal Calculation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Previous Length */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Previous Length (mm) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="input-prev-length"
                      type="number"
                      step="0.001"
                      value={previousLength}
                      onChange={e => handlePreviousLengthChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 font-bold focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nominal Std: {selectedStandard?.nominalLengthMm.toFixed(2)} mm
                    </p>
                  </div>

                  {/* Actual Removed (mm) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Actual Removed (mm) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="input-actual-removed"
                      type="number"
                      step="0.001"
                      value={actualGrindingRemovedMm}
                      onChange={e => handleActualRemovedChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-indigo-500/80 rounded-lg px-3 py-2 text-sm font-mono text-indigo-300 font-bold focus:border-indigo-400 focus:outline-none"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Standard: {selectedStandard?.grindingAmountPerTimeMm.toFixed(3)} mm / time
                    </p>
                  </div>

                  {/* Current Length After Grinding */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Length Post-Grind (mm) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="input-current-length"
                      type="number"
                      step="0.001"
                      value={currentLength}
                      onChange={e => handleCurrentLengthChange(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                        isLengthOutOfSpec
                          ? 'border-rose-500 text-rose-400'
                          : 'border-slate-700 text-emerald-300 focus:border-indigo-500'
                      }`}
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Min Allowed: {minAllowedLength.toFixed(2)} mm
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Regrind Count Before */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Regrind Count Before
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={regrindCountBefore}
                      onChange={e => setRegrindCountBefore(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200"
                    />
                  </div>

                  {/* Resulting Cycle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Cycle Count After (New)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={calculatedNextCycle}
                      className={`w-full bg-slate-950/70 border rounded-lg px-3 py-2 text-sm font-mono font-bold ${
                        isMaxCyclesReached ? 'border-amber-500 text-amber-300' : 'border-slate-800 text-indigo-300'
                      }`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Max: {maxCycles} cycles
                    </p>
                  </div>

                  {/* Remaining Cycles */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Remaining Allowed Cycles
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={remainingCycles}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Vendor, Work Order, Cost & Surface Quality */}
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  3. Vendor, Work Order & Quality Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Shop Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Grinding Facility <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={supplierOrInternalProcess}
                      onChange={e => {
                        const val = e.target.value as any;
                        setSupplierOrInternalProcess(val);
                        setVendorName(val === 'EXTERNAL_VENDOR' ? 'Siam Precision Tooling Co., Ltd.' : 'Internal Fin Die Tool Room (In-House)');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="INTERNAL_TOOL_ROOM">Internal Die Shop</option>
                      <option value="EXTERNAL_VENDOR">External Grinding Specialist</option>
                    </select>
                  </div>

                  {/* Vendor Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Facility / Vendor Name
                    </label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={e => setVendorName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Work Order */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Work Order Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={workOrder}
                      onChange={e => setWorkOrder(e.target.value)}
                      placeholder="ระบุเลข WO..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Regrinding Cost (THB)
                    </label>
                    <input
                      type="number"
                      value={cost}
                      onChange={e => setCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Surface Roughness Ra */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Measured Roughness (Ra µm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={measuredRa}
                      onChange={e => setMeasuredRa(parseFloat(e.target.value) || 0.12)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Spec: &lt; 0.20 µm</p>
                  </div>

                  {/* Hardness */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Hardness (HRC)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={hardnessHrc}
                      onChange={e => setHardnessHrc(parseFloat(e.target.value) || 62)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Spec: 60 - 64 HRC</p>
                  </div>

                  {/* Inspection Result */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Post-Grind Inspection <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="select-inspection-result"
                      value={inspectionResult}
                      onChange={e => setInspectionResult(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-bold"
                    >
                      <option value="PASSED">PASSED (ผ่านเกณฑ์มาตรฐาน)</option>
                      <option value="CONDITIONAL">CONDITIONAL (ผ่านแบบมีเงื่อนไข)</option>
                      <option value="FAILED">FAILED (ไม่ผ่านเกณฑ์ - SCRAP)</option>
                      <option value="PENDING">PENDING (รอผลตรวจสอบ)</option>
                    </select>
                  </div>

                  {/* Verified By */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Quality Inspector <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={verifiedBy}
                      onChange={e => setVerifiedBy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                      required
                    />
                  </div>
                </div>

                {/* Section 4: Accountability & Reason / Date */}
                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    4. Accountability, Reason & Date (Mandatory Verification)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Performed By (Technician Name / ID) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Technician Name / ID (Performed By) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={performedBy}
                        onChange={e => setPerformedBy(e.target.value)}
                        placeholder="ระบุชื่อหรือรหัสช่างเจียร..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                        required
                      />
                    </div>

                    {/* Regrind Reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Reason for Regrinding <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={regrindReason}
                        onChange={e => setRegrindReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                        required
                      >
                        <option value="Periodic Preventive Maintenance">Periodic Preventive Maintenance</option>
                        <option value="Punch Tip Chipped / Worn">Punch Tip Chipped / Worn</option>
                        <option value="Burr Detected on Fin Edge">Burr Detected on Fin Edge</option>
                        <option value="Surface Scratches / Galling">Surface Scratches / Galling</option>
                        <option value="Emergency Corrective Grinding">Emergency Corrective Grinding</option>
                      </select>
                    </div>

                    {/* Regrind Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Regrinding Date <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={regrindDate}
                        onChange={e => setRegrindDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono [color-scheme:dark]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Evidence & Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Inspection Evidence / Profile Measurement Sheet
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-lg p-3 text-center bg-slate-950/50 transition-colors">
                      <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                      {evidenceFileName ? (
                        <div className="flex items-center justify-center gap-2 text-xs text-indigo-300 font-mono">
                          <span>{evidenceFileName}</span>
                          <button
                            type="button"
                            onClick={() => setEvidenceFileName(null)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="text-xs text-indigo-400 font-semibold hover:underline">
                            Upload inspection report / photo
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                setEvidenceFileName(e.target.files[0].name);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Notes & Grinding Wheel Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="ระบุรายละเอียดการเจียร..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const std = standards.find(s => s.partCode === selectedPartCode);
                    if (std) handlePreviousLengthChange(std.nominalLengthMm);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  ล้างค่าความยาว
                </button>

                <button
                  id="btn-submit-regrind"
                  type="submit"
                  disabled={isRegrindBlocked}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${
                    isRegrindBlocked
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:scale-[1.01]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  บันทึกงานเจียระไน
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary Card (Col 4) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Selected Part Service History Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                Auto Service History ({selectedPartCode})
              </h3>
              <p className="text-xs text-slate-400">
                Past regrind records for this component automatically visible to technician:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historyRecords.filter(r => r.partCode === selectedPartCode).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No previous regrind history found for this part.</p>
                ) : (
                  historyRecords.filter(r => r.partCode === selectedPartCode).map(h => (
                    <div key={h.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-indigo-300 font-bold">{h.jobCode}</span>
                        <span className="text-slate-400">{h.regrindDate || h.createdDateTime?.substring(0, 10)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Cycle: {h.regrindCountAfter || h.regrindCycleCount} / {h.maxAllowedCycles}</span>
                        <span className="font-mono text-emerald-400">{h.currentLength} mm (-{h.actualGrindingRemovedMm || h.mmRemovedThisCycle} mm)</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Status: <strong className="text-white">{h.status}</strong> | Tech: {h.performedBy || h.technicianName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Part Calculation Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Resulting State Assessment
                </h3>
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                  previewStatus === 'READY TO USE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  previewStatus === 'MAXIMUM REGRIND' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  previewStatus === 'SCRAP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {previewStatus}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Target Standard:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedStandard?.partName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Standard Grinding Rate:</span>
                  <span className="font-mono text-slate-300">{selectedStandard?.grindingAmountPerTimeMm} mm / time</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Max Grinding Allowance:</span>
                  <span className="font-mono text-slate-300">{selectedStandard?.totalGrindingAllowanceMm} mm</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Calculated Post Length:</span>
                  <span className={`font-mono font-bold ${isLengthOutOfSpec ? 'text-rose-400' : 'text-emerald-300'}`}>
                    {currentLength.toFixed(3)} mm
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Resulting Regrind Cycle:</span>
                  <span className={`font-mono font-bold ${isMaxCyclesReached ? 'text-amber-400' : 'text-indigo-300'}`}>
                    {calculatedNextCycle} / {maxCycles} cycles
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Remaining Life Cycles:</span>
                  <span className="font-mono font-bold text-slate-200">{remainingCycles} times</span>
                </div>
              </div>
            </div>

            {/* Standard Rules Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                Quality & Regrind Rules
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Rule 1 & 2:</strong> Block regrinding if single-use or not permitted.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Rule 3 & 4:</strong> Dimensions must strictly remain above minimum limit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Rule 5:</strong> Inspection pass required before status becomes <em>READY TO USE</em>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Rule 6 & 7:</strong> Preserves immutable ledger; historical records never overwritten.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Re-grinding Historical Audit Ledger
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  10 RECENT LOGS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-thai">
                สมุดบัญชีประวัติงานเจียระไนลับคม 10 รายการล่าสุดสำหรับอ้างอิงหน้างาน
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeFilter
                startDate={historyStartDate}
                endDate={historyEndDate}
                onChangeRange={(start, end) => {
                  setHistoryStartDate(start);
                  setHistoryEndDate(end);
                }}
                maxDaysAllowed={31}
              />

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาข้อมูลเจียร..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="READY TO USE">READY TO USE</option>
                <option value="WAITING REGRIND">WAITING REGRIND</option>
                <option value="MAXIMUM REGRIND">MAXIMUM REGRIND</option>
                <option value="SCRAP">SCRAP</option>
                <option value="HOLD">HOLD</option>
              </select>

              <button
                onClick={() => exportRegrindingHistoryExcel(filteredHistory, 'ALL')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Single Source of Truth Notice Banner */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs text-slate-300 font-thai">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>
                แสดงประวัติล่าสุด <strong>10 รายการ</strong> เพื่อความสะดวกรวดเร็วหน้างาน • สำหรับประวัติย้อนหลังทั้งหมดและส่งออกรายงาน Excel ให้ไปที่เมนู <strong>Reports & Analytics</strong>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <th className="p-3 text-center w-12">NO.</th>
                  <th className="p-3">Job Code / WO</th>
                  <th className="p-3">Component</th>
                  <th className="p-3">Instance / Lot</th>
                  <th className="p-3 text-right">Previous (mm)</th>
                  <th className="p-3 text-right">Removed (mm)</th>
                  <th className="p-3 text-right">Current (mm)</th>
                  <th className="p-3 text-center">Cycle / Max</th>
                  <th className="p-3 text-center">Inspection</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      No re-grinding transaction records found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.slice(0, 10).map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-cyan-400/80">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-indigo-300 block">{rec.jobCode}</span>
                        <span className="text-[11px] text-slate-500">{rec.workOrder || 'N/A'}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-200 block">{rec.partName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{rec.partCode}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        {rec.partInstanceOrLot || rec.serialNumber || '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {rec.previousLength !== undefined ? rec.previousLength.toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-300">
                        -{(rec.actualGrindingRemovedMm !== undefined ? rec.actualGrindingRemovedMm : (rec.mmRemovedThisCycle || 0)).toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-100">
                        {rec.currentLength !== undefined ? rec.currentLength.toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="font-bold text-slate-200">{rec.regrindCountAfter || rec.regrindCycleCount}</span>
                        <span className="text-slate-500 text-[10px]"> / {rec.maxAllowedCycles || 4}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.inspectionResult === 'PASSED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          rec.inspectionResult === 'CONDITIONAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          rec.inspectionResult === 'FAILED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {rec.inspectionResult || rec.inspectionStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          rec.status === 'READY TO USE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          rec.status === 'MAXIMUM REGRIND' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          rec.status === 'SCRAP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setInspectModalRecord(rec)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {rec.inspectionResult === 'PENDING' && (
                            <button
                              onClick={() => { setQuickInspectRecord(rec); setQuickInspectDecision('PASSED'); }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                              title="Sign-off Inspection"
                            >
                              Sign Off
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER STANDARDS (EXCEL CRITERIA) */}
      {activeTab === 'standards' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Master Re-grinding Engineering Standards
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-thai">
                ตารางเกณฑ์มาตรฐานวิศวกรรมการเจียระไนลับคม (อิงตามไฟล์มาตรฐาน Excel ของบริษัท)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <th className="p-3">Part Code</th>
                  <th className="p-3">Part Name</th>
                  <th className="p-3 text-right">Nominal (mm)</th>
                  <th className="p-3 text-right">Grinding Rate (mm/time)</th>
                  <th className="p-3 text-right">Total Allowance (mm)</th>
                  <th className="p-3 text-center">Max Count</th>
                  <th className="p-3 text-center">Regrind Allowed</th>
                  <th className="p-3 text-center">Dispose 1-Use</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {standards.map(std => (
                  <tr key={std.partCode} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-300">{std.partCode}</td>
                    <td className="p-3 font-bold text-slate-200">{std.partName}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{std.nominalLengthMm.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-indigo-300 font-bold">{std.grindingAmountPerTimeMm.toFixed(3)}</td>
                    <td className="p-3 text-right font-mono text-amber-300">{std.totalGrindingAllowanceMm.toFixed(2)}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-100">{std.maxRegrindCount}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        std.regrindAllowed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {std.regrindAllowed ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        std.disposeAfterOneUse
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {std.disposeAfterOneUse ? 'YES (SCRAP)' : 'NO'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setEditingStandard({ ...std })}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 mx-auto"
                      >
                        <Edit2 className="w-3 h-3 text-indigo-400" />
                        Edit Standard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT MASTER STANDARD */}
      {editingStandard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Edit Master Regrind Standard: {editingStandard.partCode}
              </h3>
              <button
                onClick={() => setEditingStandard(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStandard} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Part Name</label>
                <input
                  type="text"
                  value={editingStandard.partName}
                  onChange={e => setEditingStandard({ ...editingStandard, partName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nominal Length (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingStandard.nominalLengthMm}
                    onChange={e => setEditingStandard({ ...editingStandard, nominalLengthMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Grinding Rate (mm/time)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingStandard.grindingAmountPerTimeMm}
                    onChange={e => setEditingStandard({ ...editingStandard, grindingAmountPerTimeMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total Allowance (mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingStandard.totalGrindingAllowanceMm}
                    onChange={e => setEditingStandard({ ...editingStandard, totalGrindingAllowanceMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Max Regrind Count</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingStandard.maxRegrindCount}
                    onChange={e => setEditingStandard({ ...editingStandard, maxRegrindCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStandard.regrindAllowed}
                    onChange={e => setEditingStandard({ ...editingStandard, regrindAllowed: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="font-bold text-slate-200">Regrind Allowed (Yes/No)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStandard.disposeAfterOneUse}
                    onChange={e => setEditingStandard({ ...editingStandard, disposeAfterOneUse: e.target.checked })}
                    className="rounded border-slate-700 text-rose-600 focus:ring-0"
                  />
                  <span className="font-bold text-rose-300">Dispose After 1 Use</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStandard(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
                >
                  Save Standard Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT DETAILS */}
      {inspectModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-indigo-400" />
                  Regrinding Record: {inspectModalRecord.jobCode}
                </h3>
                <span className="text-xs text-slate-400">Line {inspectModalRecord.lineId || inspectModalRecord.lineLastUsed} • Die {inspectModalRecord.dieCode || inspectModalRecord.finDie}</span>
              </div>
              <button
                onClick={() => setInspectModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Part Name & Code:</span>
                <span className="font-bold text-slate-200">{inspectModalRecord.partName} ({inspectModalRecord.partCode})</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Instance / Serial:</span>
                <span className="font-mono text-indigo-300">{inspectModalRecord.partInstanceOrLot || inspectModalRecord.serialNumber || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Length (Prev -&gt; Post):</span>
                <span className="font-mono font-bold text-slate-100">
                  {inspectModalRecord.previousLength?.toFixed(2)} mm &rarr; {inspectModalRecord.currentLength?.toFixed(2)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Actual Removed:</span>
                <span className="font-mono font-bold text-indigo-300">
                  -{(inspectModalRecord.actualGrindingRemovedMm || inspectModalRecord.mmRemovedThisCycle || 0).toFixed(3)} mm
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Cycle Count / Max:</span>
                <span className="font-mono font-bold text-slate-200">
                  {inspectModalRecord.regrindCountAfter || inspectModalRecord.regrindCycleCount} / {inspectModalRecord.maxAllowedCycles || 4}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Status:</span>
                <span className="font-mono font-bold text-emerald-400">{inspectModalRecord.status}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Inspector Sign-off:</span>
                <span className="text-slate-200">{inspectModalRecord.verifiedBy || inspectModalRecord.inspectorName} ({inspectModalRecord.inspectionResult})</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-slate-400 block">Facility / Vendor:</span>
                <span className="text-slate-200">{inspectModalRecord.vendorName || inspectModalRecord.grinderVendor}</span>
              </div>
            </div>

            {inspectModalRecord.note && (
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs">
                <span className="text-slate-400 block font-semibold mb-1">Notes:</span>
                <p className="text-slate-300">{inspectModalRecord.note}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setInspectModalRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK INSPECT SIGN-OFF */}
      {quickInspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                QC Inspection Sign-off: {quickInspectRecord.jobCode}
              </h3>
              <button
                onClick={() => setQuickInspectRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-slate-300">
                  Component: <strong>{quickInspectRecord.partName}</strong> ({quickInspectRecord.partCode})
                </p>
                <p className="text-slate-400 mt-1">
                  Post Length: <strong>{quickInspectRecord.currentLength?.toFixed(2)} mm</strong> • Cycle: <strong>{quickInspectRecord.regrindCountAfter || quickInspectRecord.regrindCycleCount}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Inspection Decision</label>
                <select
                  value={quickInspectDecision}
                  onChange={e => setQuickInspectDecision(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-bold"
                >
                  <option value="PASSED">PASSED (Ready for Production)</option>
                  <option value="CONDITIONAL">CONDITIONAL (Conditional Approval)</option>
                  <option value="FAILED">FAILED (Scrap Tool)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Inspector Notes</label>
                <textarea
                  rows={2}
                  value={quickInspectNotes}
                  onChange={e => setQuickInspectNotes(e.target.value)}
                  placeholder="ระบุผลการตรวจสอบ/ค่าที่วัดได้..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickInspectRecord(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleQuickInspectionConfirm}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                >
                  Confirm Sign-Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
