import React, { useState, useEffect } from 'react';
import { regrindService } from '../services/regrindService';
import {
  RegrindWorkTicket,
  MonthlyCalendarMatrix,
  ToolingPartMasterItem,
  PurchasingRequisitionItem,
  DefectReasonCode
} from '../types/regrind';
import { ProductionLineId } from '../types';
import { RegrindKpiCards } from './regrinding/RegrindKpiCards';
import { RegrindQueueTable } from './regrinding/RegrindQueueTable';
import { Excel31DayMatrixView } from './regrinding/Excel31DayMatrixView';
import { RegrindingAnalyticsView } from './regrinding/RegrindingAnalyticsView';
import { RegrindCompleteModal } from './regrinding/RegrindCompleteModal';
import { RegrindScrapModal } from './regrinding/RegrindScrapModal';
import { NewRegrindOrderModal } from './regrinding/NewRegrindOrderModal';
import { QrScannerModal } from './regrinding/QrScannerModal';
import {
  Wrench,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  Calendar,
  Zap,
  Filter,
  Cpu
} from 'lucide-react';

interface RegrindingManagementViewProps {
  selectedLine?: ProductionLineId;
  onNavigateToDieLayout?: () => void;
  currentUserName?: string;
}

export const RegrindingManagementView: React.FC<RegrindingManagementViewProps> = ({
  selectedLine = 'E1',
  onNavigateToDieLayout,
  currentUserName = 'Kittisak Wongsuwan'
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedGlobalPartFilter, setSelectedGlobalPartFilter] = useState<string>('ALL');

  const [tickets, setTickets] = useState<RegrindWorkTicket[]>([]);
  const [metrics, setMetrics] = useState(regrindService.getSummaryMetrics());
  const [matrix, setMatrix] = useState<MonthlyCalendarMatrix>(regrindService.getMonthlyMatrix(2026, 1));
  const [toolingMasters, setToolingMasters] = useState<ToolingPartMasterItem[]>([]);
  const [purchasingReqs, setPurchasingReqs] = useState<PurchasingRequisitionItem[]>([]);

  // Modals state
  const [completeModalTicket, setCompleteModalTicket] = useState<RegrindWorkTicket | null>(null);
  const [scrapModalTicket, setScrapModalTicket] = useState<RegrindWorkTicket | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);

  // Toast notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'warning' | 'info', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const reloadData = () => {
    setTickets(regrindService.getQueueTickets());
    setMetrics(regrindService.getSummaryMetrics());
    setMatrix(regrindService.getMonthlyMatrix(matrix.year || 2026, matrix.month || 1));
    setToolingMasters(regrindService.getToolingMasters());
    setPurchasingReqs(regrindService.getPurchasingRequisitions());
  };

  useEffect(() => {
    reloadData();
    const unsubscribe = regrindService.subscribe(() => {
      reloadData();
    });
    return () => unsubscribe();
  }, []);

  // Midnight Auto-Rollover Task Trigger (Module 2 Requirement)
  const handleTriggerAutoRollover = () => {
    const res = regrindService.executeMidnightAutoRollover();
    if (res.rolledOverCount > 0) {
      showToast('warning', `⚡ ระบบ Auto-Rollover (เที่ยงคืน): ปรับวันและติดแท็ก [Delayed] ให้กับใบงานที่ค้าง ${res.rolledOverCount} รายการเรียบร้อยแล้ว`);
    } else {
      showToast('info', '⚡ ระบบ Auto-Rollover (เที่ยงคืน): ตรวจสอบแล้ว ไม่มีใบงานเจียรที่ค้างชำระ/เกินกำหนด');
    }
    reloadData();
  };

  // --- Handlers ---
  const handleStartGrind = (ticket: RegrindWorkTicket) => {
    const res = regrindService.startGrinding(ticket.id, currentUserName);
    if (res.success) {
      showToast('info', res.message);
      reloadData();
    }
  };

  const handleConfirmCompleteGrind = (payload: {
    remainingLengthMm: number;
    grindDepthMm: number;
    shimAddedMm: number;
    toolMaterial?: string;
    technicianName: string;
    verifiedBy: string;
    remarks: string;
  }) => {
    if (!completeModalTicket) return;
    const res = regrindService.completeGrinding(completeModalTicket.id, payload);
    setCompleteModalTicket(null);
    if (res.success) {
      if (res.status === 'SCRAP') {
        showToast('warning', res.message);
      } else {
        showToast('success', res.message);
      }
      reloadData();
    }
  };

  const handleConfirmScrap = (payload: {
    reasonCode: DefectReasonCode;
    customReason: string;
    technicianName: string;
    reorderQuantity: number;
  }) => {
    if (!scrapModalTicket) return;
    const res = regrindService.scrapItem(
      scrapModalTicket.id,
      payload.reasonCode,
      payload.customReason,
      payload.technicianName
    );
    setScrapModalTicket(null);
    if (res.success) {
      showToast('warning', res.message);
      reloadData();
    }
  };

  const handleCreateManualOrder = (data: {
    partName: string;
    partCode: string;
    lineId: ProductionLineId;
    stageName: string;
    positionId: string;
    defectReason: DefectReasonCode;
    defectNotes: string;
    previousLengthMm: number;
    regrindCountBefore: number;
    urgency: 'HIGH' | 'NORMAL' | 'LOW';
    receivedBy: string;
  }) => {
    const newTicket = regrindService.createManualTicket(data);
    setIsNewOrderModalOpen(false);
    showToast('success', `เปิดใบงาน ${newTicket.jobCode} (${newTicket.partName}) เรียบร้อยแล้ว`);
    reloadData();
  };

  const handleUpdateMatrixCell = (
    category: 'REPAIR' | 'DEFECT_SCRAP',
    partName: string,
    day: number,
    count: number
  ) => {
    regrindService.updateMatrixCell(matrix.year, matrix.month, category, partName, day, count);
    reloadData();
  };

  const handleMonthChange = (year: number, month: number) => {
    const newMat = regrindService.getMonthlyMatrix(year, month);
    setMatrix(newMat);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : toastMsg.type === 'warning'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-sky-900 text-sky-100 border-sky-700'
          }`}
        >
          {toastMsg.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {toastMsg.type === 'warning' && <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          {toastMsg.type === 'info' && <Wrench className="w-5 h-5 text-sky-400 flex-shrink-0" />}
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <Wrench className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  ระบบจัดการงานเจียรลับคมทูลลิ่ง & แม่พิมพ์ (Tooling Regrinding Hub)
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ยกระดับจากระบบ Excel สู่ Web Application จัดการคิวงาน, มิติความยาว, ปฏิทิน 31 วัน, และบันทึกประวัติ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Global Single-Select Filter: Part Name (Module 3 Requirement) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-cyan-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Part Name:</span>
              <select
                value={selectedGlobalPartFilter}
                onChange={e => setSelectedGlobalPartFilter(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-cyan-600 dark:text-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ทุกชิ้นส่วนแม่พิมพ์ (All Part Names)</option>
                {toolingMasters.map(m => (
                  <option key={m.id} value={m.partName}>
                    {m.partName} ({m.partCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Midnight Auto-Rollover Task Button (Module 2 Requirement) */}
            <button
              type="button"
              onClick={handleTriggerAutoRollover}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all animate-pulse"
              title="ทดสอบรันกระบวนการ Auto-Rollover เมื่อถึงเวลาเที่ยงคืน"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ รัน Auto-Rollover (เที่ยงคืน)</span>
            </button>

            {onNavigateToDieLayout && (
              <button
                type="button"
                onClick={onNavigateToDieLayout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                title="กลับไปยังหน้าผังแม่พิมพ์ 2D Die Layout"
              >
                <span>ไปยัง 2D Die Layout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={reloadData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

        <RegrindKpiCards
          metrics={metrics}
          onFilterStatus={status => {
            setStatusFilter(status);
            // Scroll to queue table if needed
            const queueEl = document.getElementById('job-queue-section');
            if (queueEl) queueEl.scrollIntoView({ behavior: 'smooth' });
          }}
          activeStatusFilter={statusFilter}
        />

      {/* 1. Job Queue Section */}
      <section id="job-queue-section" className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">คิวงานเจียร (Job Queue List)</h2>
            <p className="text-xs text-slate-500">จัดการรายการใบงานเจียรลับคมที่กำลังดำเนินการและรอคิว</p>
          </div>
        </div>
        <RegrindQueueTable
          tickets={tickets}
          activeStatusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onStartGrind={handleStartGrind}
          onCompleteGrind={ticket => setCompleteModalTicket(ticket)}
          onScrap={ticket => setScrapModalTicket(ticket)}
          onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          selectedGlobalPart={selectedGlobalPartFilter}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 2. Planning Board Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">ตารางวางแผน 31 วัน (Planning Board)</h2>
              <p className="text-xs text-slate-500">แผนการซ่อมบำรุงและเจียรลับคมรายวัน</p>
            </div>
          </div>
          <Excel31DayMatrixView
            matrix={matrix}
            onUpdateCell={handleUpdateMatrixCell}
            onMonthChange={handleMonthChange}
            mode="REPAIR"
            selectedGlobalPart={selectedGlobalPartFilter}
            onRefreshData={reloadData}
          />
        </section>

        {/* 3. Defect/Scrap Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">ตารางงานเสีย (Defect/Scrap Matrix)</h2>
              <p className="text-xs text-slate-500">บันทึกรายการที่ไม่สามารถเจียรลับคมต่อได้</p>
            </div>
          </div>
          <Excel31DayMatrixView
            matrix={matrix}
            onUpdateCell={handleUpdateMatrixCell}
            onMonthChange={handleMonthChange}
            mode="DEFECT_SCRAP"
            selectedGlobalPart={selectedGlobalPartFilter}
            onRefreshData={reloadData}
          />
        </section>
      </div>

      {/* 4. Analytics Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">วิเคราะห์ข้อมูล (Regrinding Analytics)</h2>
            <p className="text-xs text-slate-500">สถิติและแนวโน้มการใช้งานทูลลิ่ง</p>
          </div>
        </div>
        <RegrindingAnalyticsView
          selectedGlobalPart={selectedGlobalPartFilter}
        />
      </section>

      {/* Modals */}
      {completeModalTicket && (
        <RegrindCompleteModal
          ticket={completeModalTicket}
          isOpen={!!completeModalTicket}
          onClose={() => setCompleteModalTicket(null)}
          onConfirm={handleConfirmCompleteGrind}
          currentUserName={currentUserName}
        />
      )}

      {scrapModalTicket && (
        <RegrindScrapModal
          ticket={scrapModalTicket}
          isOpen={!!scrapModalTicket}
          onClose={() => setScrapModalTicket(null)}
          onConfirm={handleConfirmScrap}
          currentUserName={currentUserName}
        />
      )}

      {isNewOrderModalOpen && (
        <NewRegrindOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          toolingMasters={toolingMasters}
          onSubmit={handleCreateManualOrder}
          currentUserName={currentUserName}
        />
      )}

      {isQrScannerOpen && (
        <QrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          tickets={tickets}
          onSelectTicket={t => {
            if (t.status === 'IN_PROCESS') {
              setCompleteModalTicket(t);
            } else if (t.status === 'PENDING') {
              handleStartGrind(t);
            }
          }}
        />
      )}
    </div>
  );
};
