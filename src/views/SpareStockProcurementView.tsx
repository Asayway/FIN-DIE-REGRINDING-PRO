import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  FileText,
  Calendar,
  Truck,
  ShieldAlert,
  Edit3,
  Layers,
  ArrowRight,
  TrendingDown,
  Warehouse,
  ShoppingBag,
  ExternalLink,
  Info,
  Building,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import { SpareStockItem, ProcurementStatus, CombinedRiskLevel, User } from '../types';
import { storageService } from '../services/storageService';
import { 
  calculateAvailableQuantity, 
  calculateReplacementCoverage, 
  calculateDeliveryRisk,
  calculateCombinedRisk,
  formatShots, 
  formatThb 
} from '../services/calculationService';
import { getRolePermissions } from '../services/authService';

export const SpareStockProcurementView: React.FC = () => {
  const [stocks, setStocks] = useState<SpareStockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterProcurement, setFilterProcurement] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [selectedStock, setSelectedStock] = useState<SpareStockItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(storageService.getCurrentUser());

  // Form state
  const [editForm, setEditForm] = useState<Partial<SpareStockItem>>({});
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const reload = () => {
    const data = storageService.getSpareStocks();
    setStocks(data);
    setCurrentUser(storageService.getCurrentUser());
    if (data.length > 0 && !selectedStock) {
      setSelectedStock(data[0]);
    } else if (selectedStock) {
      const refreshed = data.find(s => s.id === selectedStock.id);
      if (refreshed) setSelectedStock(refreshed);
    }
  };

  useEffect(() => {
    reload();
    const unsub = storageService.subscribe(reload);
    return () => unsub();
  }, []);

  const permissions = getRolePermissions(currentUser.role);
  const canEditStock = permissions.canManageStockAndMovements || permissions.canAdministerSystem;
  const canEditProcurement = permissions.canManageProcurement || permissions.canAdministerSystem;
  const canModify = canEditStock || canEditProcurement;

  const filtered = stocks.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.partName.toLowerCase().includes(term) ||
      s.partCode.toLowerCase().includes(term) ||
      (s.supplier || '').toLowerCase().includes(term) ||
      (s.warehouseLocation || '').toLowerCase().includes(term) ||
      (s.prNumber || '').toLowerCase().includes(term) ||
      (s.poNumber || '').toLowerCase().includes(term);

    const matchProcurement = filterProcurement === 'ALL' || s.procurementStatus === filterProcurement;
    const matchRisk = filterRisk === 'ALL' || s.combinedRisk === filterRisk;
    return matchSearch && matchProcurement && matchRisk;
  });

  const handleSelect = (item: SpareStockItem) => {
    setSelectedStock(item);
    setEditForm({ ...item });
    setIsEditing(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleStartEdit = () => {
    if (!selectedStock) return;
    setEditForm({ ...selectedStock });
    setAdjustmentReason('');
    setIsEditing(true);
  };

  const handleFormChange = (field: keyof SpareStockItem, value: any) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto compute live available quantity and coverage
      if (field === 'onHandQuantity' || field === 'reservedQuantity' || field === 'quarantineQuantity') {
        const onHand = field === 'onHandQuantity' ? Number(value) : Number(updated.onHandQuantity || 0);
        const reserved = field === 'reservedQuantity' ? Number(value) : Number(updated.reservedQuantity || 0);
        const quarantine = field === 'quarantineQuantity' ? Number(value) : Number(updated.quarantineQuantity || 0);
        updated.availableQuantity = calculateAvailableQuantity(onHand, reserved, quarantine);

        const reqPerFull = Number(updated.requiredQuantityPerFullReplacement || 1);
        updated.replacementCoverage = calculateReplacementCoverage(updated.availableQuantity, reqPerFull);
      }

      if (field === 'requiredQuantityPerFullReplacement') {
        const avail = Number(updated.availableQuantity || 0);
        const reqPerFull = Number(value || 1);
        updated.replacementCoverage = calculateReplacementCoverage(avail, reqPerFull);
      }

      // Live delivery risk calculation
      if (field === 'expectedDeliveryDate' || field === 'forecastReplacementDate') {
        const forecast = field === 'forecastReplacementDate' ? value : updated.forecastReplacementDate;
        const expected = field === 'expectedDeliveryDate' ? value : updated.expectedDeliveryDate;
        const risk = calculateDeliveryRisk(forecast, expected);
        updated.hasDeliveryRisk = risk.hasDeliveryRisk;
        updated.deliveryRiskDays = risk.daysLate;
      }

      return updated;
    });
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !editForm.partCode) return;

    if (!adjustmentReason.trim()) {
      setErrorMsg('Mandatory Reason: Please specify the operational or purchasing reason for this change.');
      return;
    }

    try {
      const saved = storageService.saveSpareStock({
        ...selectedStock,
        ...editForm,
        note: adjustmentReason
      } as any);

      setSelectedStock(saved);
      setIsEditing(false);
      setErrorMsg(null);
      setSuccessMsg(`Successfully updated inventory & procurement record for ${saved.partCode} (${saved.partName})`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`Failed to save record: ${err.message}`);
    }
  };

  // Summary KPIs
  const totalItems = stocks.length;
  const criticalSupplyCount = stocks.filter(s => s.combinedRisk === 'CRITICAL SUPPLY' || s.combinedRisk === 'STOP RISK').length;
  const deliveryRiskCount = stocks.filter(s => s.hasDeliveryRisk || s.combinedRisk === 'DELIVERY RISK').length;
  const inTransitCount = stocks.filter(s => s.procurementStatus === 'IN TRANSIT' || s.procurementStatus === 'IN PRODUCTION').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Fin Die Spare Stock & Procurement Management Module
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            บริหารสต็อกอะไหล่แม่พิมพ์ฟิน (On-Hand, Reserved, Quarantine) และติดตามวงจรจัดซื้อ (PR, PO, ETA, Delivery Risk) ตามมาตรฐาน ISO/IATF
          </p>
        </div>

        {/* Current Role Indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-xs flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Current Role:</span>
            <span className="font-bold text-cyan-300">{currentUser.role}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>TOTAL MONITORED PARTS</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalItems} <span className="text-xs font-normal text-slate-500">Items</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Active tooling specifications</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>CRITICAL SUPPLY RISK</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-black mt-1 ${criticalSupplyCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {criticalSupplyCount} <span className="text-xs font-normal text-slate-500">Parts</span>
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Coverage &lt; 1 Full Set</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>DELIVERY ETA RISKS</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black mt-1 ${deliveryRiskCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {deliveryRiskCount} <span className="text-xs font-normal text-slate-500">PO Deliveries</span>
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">Expected delivery &gt; Tool life ETA</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>ORDERS IN PIPELINE</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {inTransitCount} <span className="text-xs font-normal text-slate-500">Active</span>
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">In production or in transit</div>
        </div>
      </div>

      {/* Filter and Search Bar (Sticky Locked at Top) */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xl">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาอะไหล่/PR/PO/ผู้ผลิต..."
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Procurement:</span>
            <select
              value={filterProcurement}
              onChange={e => setFilterProcurement(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Statuses (14)</option>
              <option value="NOT REQUIRED">NOT REQUIRED</option>
              <option value="REQUIREMENT IDENTIFIED">REQUIREMENT IDENTIFIED</option>
              <option value="PR PREPARING">PR PREPARING</option>
              <option value="PR SUBMITTED">PR SUBMITTED</option>
              <option value="PR APPROVED">PR APPROVED</option>
              <option value="PO PROCESS">PO PROCESS</option>
              <option value="PO ISSUED">PO ISSUED</option>
              <option value="SUPPLIER CONFIRMED">SUPPLIER CONFIRMED</option>
              <option value="IN PRODUCTION">IN PRODUCTION</option>
              <option value="IN TRANSIT">IN TRANSIT</option>
              <option value="PARTIAL DELIVERY">PARTIAL DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Risk Matrix:</span>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="NORMAL">NORMAL</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL SUPPLY">CRITICAL SUPPLY</option>
              <option value="STOP RISK">STOP RISK</option>
              <option value="DELIVERY RISK">DELIVERY RISK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500 text-emerald-300 rounded text-xs flex items-center gap-2 animate-fadeIn font-mono">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-950/90 border border-rose-500 text-rose-300 rounded text-xs flex items-center gap-2 animate-fadeIn font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Stock and Procurement Inventory Table */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-cyan-400" />
              Spare Inventory & Procurement Matrix
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Showing {filtered.length} of {stocks.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-2 text-center w-12 font-mono">NO.</th>
                  <th className="py-2.5 px-3">PART / SPECIFICATION</th>
                  <th className="py-2.5 px-2 text-center">ON HAND</th>
                  <th className="py-2.5 px-2 text-center">RSV / QUA</th>
                  <th className="py-2.5 px-2 text-center text-cyan-400 font-bold">AVAILABLE</th>
                  <th className="py-2.5 px-2 text-center">COVERAGE</th>
                  <th className="py-2.5 px-2 text-center">PROCUREMENT</th>
                  <th className="py-2.5 px-2 text-center">RISK LEVEL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((s, idx) => {
                  const isSelected = selectedStock?.id === s.id;
                  const available = s.availableQuantity !== undefined ? s.availableQuantity : calculateAvailableQuantity(s.onHandQuantity, s.reservedQuantity, s.quarantineQuantity);
                  const coverage = s.replacementCoverage !== undefined ? s.replacementCoverage : calculateReplacementCoverage(available, s.requiredQuantityPerFullReplacement || 1);

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-cyan-950/60 border-l-4 border-cyan-400 text-cyan-100' 
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-400/80">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-100">{s.partName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span className="text-cyan-400">{s.partCode}</span>
                          <span>•</span>
                          <span>{s.warehouseLocation || 'RACK-A-01'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center font-semibold text-slate-200">
                        {s.onHandQuantity}
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-400 text-[11px]">
                        <span className="text-amber-400" title="Reserved">{s.reservedQuantity || 0}</span> / <span className="text-purple-400" title="Quarantine">{s.quarantineQuantity || 0}</span>
                      </td>

                      <td className={`py-2.5 px-2 text-center font-black ${
                        available === 0 ? 'text-rose-400' : available < (s.requiredQuantityPerFullReplacement || 1) ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {available}
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          coverage >= 1 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {coverage.toFixed(2)}x
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-bold ${
                          s.procurementStatus === 'DELIVERED' 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : s.procurementStatus === 'IN TRANSIT' || s.procurementStatus === 'IN PRODUCTION'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : s.procurementStatus === 'OVERDUE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {s.procurementStatus}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.combinedRisk === 'STOP RISK'
                            ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                            : s.combinedRisk === 'CRITICAL SUPPLY'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : s.combinedRisk === 'DELIVERY RISK'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : s.combinedRisk === 'WARNING'
                            ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {s.combinedRisk || 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Stock, Procurement & Risk Inspector / Editor */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              {isEditing ? 'Edit Stock & Procurement Details' : 'Stock & Procurement Inspector'}
            </h3>

            {canModify && !isEditing && selectedStock && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Record
              </button>
            )}
          </div>

          {selectedStock ? (
            <div>
              {!isEditing ? (
                /* Inspector View */
                <div className="space-y-4 text-xs font-mono">
                  {/* Part Header */}
                  <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-1">
                    <div className="text-sm font-bold text-white">{selectedStock.partName}</div>
                    <div className="text-slate-400 text-[11px] flex items-center justify-between">
                      <span>Code: <strong className="text-cyan-400">{selectedStock.partCode}</strong></span>
                      <span>Loc: <strong className="text-slate-200">{selectedStock.warehouseLocation || 'RACK-A-01'}</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic mt-1">{selectedStock.specification}</div>
                  </div>

                  {/* Stock Breakdown */}
                  <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
                      Warehouse Stock Quantities
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>On Hand: <strong className="text-white font-bold">{selectedStock.onHandQuantity} EA</strong></div>
                      <div>Reserved: <strong className="text-amber-400 font-bold">{selectedStock.reservedQuantity || 0} EA</strong></div>
                      <div>Quarantine: <strong className="text-purple-400 font-bold">{selectedStock.quarantineQuantity || 0} EA</strong></div>
                      <div>Available: <strong className="text-emerald-400 font-bold">{selectedStock.availableQuantity} EA</strong></div>
                    </div>
                    <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                      <div>Min Stock: {selectedStock.minimumStock} EA</div>
                      <div>Max Stock: {selectedStock.maximumStock} EA</div>
                      <div>Required / Full Set: {selectedStock.requiredQuantityPerFullReplacement} EA</div>
                      <div>Coverage: <strong className="text-cyan-300 font-bold">{selectedStock.replacementCoverage}x</strong></div>
                    </div>
                  </div>

                  {/* Procurement Details */}
                  <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      Procurement & Delivery Status
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="font-bold text-cyan-300">{selectedStock.procurementStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">PR Number:</span>
                        <span>{selectedStock.prNumber || '-'} ({selectedStock.prApprovalStatus || 'N/A'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">PO Number:</span>
                        <span className="font-bold text-emerald-400">{selectedStock.poNumber || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Supplier:</span>
                        <span className="text-slate-200">{selectedStock.supplier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ordered Qty:</span>
                        <span>{selectedStock.orderedQuantity} EA (Confirmed: {selectedStock.confirmedQuantity} EA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expected ETA:</span>
                        <span className="text-amber-300">{selectedStock.expectedDeliveryDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Buyer:</span>
                        <span className="text-slate-300">{selectedStock.buyer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Life Risk Card */}
                  <div className={`p-3.5 rounded border ${
                    selectedStock.hasDeliveryRisk || selectedStock.combinedRisk === 'DELIVERY RISK' || selectedStock.combinedRisk === 'STOP RISK'
                      ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  } space-y-2`}>
                    <div className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        Risk Analysis
                      </span>
                      <span className="font-bold">{selectedStock.combinedRisk || 'NORMAL'}</span>
                    </div>
                    <div className="text-[11px] space-y-1 text-slate-300">
                      <div>Forecast Replacement Date: <strong>{selectedStock.forecastReplacementDate || 'N/A'}</strong></div>
                      <div>Expected Delivery Date: <strong>{selectedStock.expectedDeliveryDate || 'N/A'}</strong></div>
                      {selectedStock.hasDeliveryRisk && (
                        <div className="text-rose-400 font-bold flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Delivery Risk: Estimated {selectedStock.deliveryRiskDays} days late compared to tool life forecast!
                        </div>
                      )}
                      {selectedStock.note && (
                        <div className="text-slate-400 mt-1 italic">Note: {selectedStock.note}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Editor Form */
                <form onSubmit={handleSaveStock} className="space-y-3.5 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="font-bold text-cyan-300">{editForm.partName}</div>
                    <div className="text-slate-500 text-[11px]">Code: {editForm.partCode}</div>
                  </div>

                  {/* Warehouse Stock Fields */}
                  <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="font-bold text-slate-300 text-[11px] text-cyan-400">1. INVENTORY STOCK ADJUSTMENT</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">On Hand (EA)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.onHandQuantity ?? 0}
                          onChange={e => handleFormChange('onHandQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Reserved (EA)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.reservedQuantity ?? 0}
                          onChange={e => handleFormChange('reservedQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-amber-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Quarantine (EA)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.quarantineQuantity ?? 0}
                          onChange={e => handleFormChange('quarantineQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-purple-400 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                      <div>
                        Available Stock: <strong className="text-emerald-400">{editForm.availableQuantity ?? 0} EA</strong>
                      </div>
                      <div>
                        Coverage: <strong className="text-cyan-300">{editForm.replacementCoverage ?? 0}x</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Warehouse Location</label>
                        <input
                          type="text"
                          value={editForm.warehouseLocation || ''}
                          onChange={e => handleFormChange('warehouseLocation', e.target.value)}
                          placeholder="ตำแหน่งจัดเก็บ..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Req. Qty / Full Set</label>
                        <input
                          type="number"
                          min="1"
                          value={editForm.requiredQuantityPerFullReplacement ?? 1}
                          onChange={e => handleFormChange('requiredQuantityPerFullReplacement', parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Procurement & Purchase Order Fields */}
                  <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="font-bold text-slate-300 text-[11px] text-emerald-400">2. PROCUREMENT & PO TRACKING</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Procurement Status</label>
                        <select
                          value={editForm.procurementStatus || 'NOT REQUIRED'}
                          onChange={e => handleFormChange('procurementStatus', e.target.value as ProcurementStatus)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-cyan-300 font-bold text-xs"
                        >
                          <option value="NOT REQUIRED">NOT REQUIRED</option>
                          <option value="REQUIREMENT IDENTIFIED">REQUIREMENT IDENTIFIED</option>
                          <option value="PR PREPARING">PR PREPARING</option>
                          <option value="PR SUBMITTED">PR SUBMITTED</option>
                          <option value="PR APPROVED">PR APPROVED</option>
                          <option value="PO PROCESS">PO PROCESS</option>
                          <option value="PO ISSUED">PO ISSUED</option>
                          <option value="SUPPLIER CONFIRMED">SUPPLIER CONFIRMED</option>
                          <option value="IN PRODUCTION">IN PRODUCTION</option>
                          <option value="IN TRANSIT">IN TRANSIT</option>
                          <option value="PARTIAL DELIVERY">PARTIAL DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="OVERDUE">OVERDUE</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">PR Number</label>
                        <input
                          type="text"
                          value={editForm.prNumber || ''}
                          onChange={e => handleFormChange('prNumber', e.target.value)}
                          placeholder="เลขที่ PR..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">PO Number</label>
                        <input
                          type="text"
                          value={editForm.poNumber || ''}
                          onChange={e => handleFormChange('poNumber', e.target.value)}
                          placeholder="เลขที่ PO..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-emerald-400 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Supplier</label>
                        <input
                          type="text"
                          value={editForm.supplier || ''}
                          onChange={e => handleFormChange('supplier', e.target.value)}
                          placeholder="ชื่อผู้ผลิต/ซัพพลายเออร์..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Ordered Qty (EA)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.orderedQuantity ?? 0}
                          onChange={e => handleFormChange('orderedQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1">Expected Delivery Date (ETA)</label>
                        <input
                          type="date"
                          value={editForm.expectedDeliveryDate || ''}
                          onChange={e => handleFormChange('expectedDeliveryDate', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white font-bold [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Reason for Audit Log */}
                  <div className="space-y-1 bg-amber-950/30 border border-amber-700/50 p-2.5 rounded">
                    <label className="block text-amber-300 font-bold text-[11px]">
                      Mandatory Reason for Stock / Procurement Change *
                    </label>
                    <textarea
                      rows={2}
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      placeholder="ระบุเหตุผลในการปรับปรุง..."
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition-colors shadow-lg shadow-cyan-500/20"
                    >
                      ยืนยันบันทึกข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const ReplacementHistoryView: React.FC = () => {
  const [replacements, setReplacements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    setReplacements(storageService.getReplacements());
    const unsub = storageService.subscribe(() => setReplacements(storageService.getReplacements()));
    return () => unsub();
  }, []);

  const filtered = replacements.filter(r =>
    (r.partName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.lineId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.replacementType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Fin Die Tooling Replacement Audit Trail
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            ประวัติการเปลี่ยนอะไหล่แม่พิมพ์ทั้งหมด พร้อมยอดช็อตสะสม สาเหตุ และผู้ปฏิบัติงาน
          </p>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="ค้นหาประวัติ..."
          className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 w-64 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">RECORD ID</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">LINE</th>
                <th className="py-2.5 px-3">PART / STAGE</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3 text-right">SHOT AT CHANGE</th>
                <th className="py-2.5 px-3 text-center">QTY</th>
                <th className="py-2.5 px-3">REASON</th>
                <th className="py-2.5 px-3">OPERATOR</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">{r.id}</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.timestamp || r.replacementDate}</td>
                  <td className="py-2.5 px-3 font-bold text-white">Line {r.lineId}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{r.stageName || r.partName}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                      {r.replacementType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-rose-400">
                    {formatShots(r.machineShotAtReplacement || r.shotAtReplacement || r.usedShotAtReplacement || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-cyan-300 font-bold">{r.changedQuantity || r.replacedQty || 1}</td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px] truncate max-w-[180px]">{r.replacementReason || r.reason}</td>
                  <td className="py-2.5 px-3 text-slate-300">{r.changedBy || r.operatorName}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.approvalStatus === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {r.approvalStatus || 'APPROVED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

