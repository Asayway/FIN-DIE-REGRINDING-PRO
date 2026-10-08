import React, { useState, useMemo } from 'react';
import { RegrindWorkTicket, RegrindQueueStatus, DEFECT_REASON_LABELS } from '../../types/regrind';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import {
  Wrench,
  CheckCircle2,
  AlertOctagon,
  Play,
  Search,
  Filter,
  QrCode,
  PlusCircle,
  Clock,
  Sparkles,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Ruler
} from 'lucide-react';
import { ProductionLineId } from '../../types';

interface RegrindQueueTableProps {
  tickets: RegrindWorkTicket[];
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onStartGrind: (ticket: RegrindWorkTicket) => void;
  onCompleteGrind: (ticket: RegrindWorkTicket) => void;
  onScrap: (ticket: RegrindWorkTicket) => void;
  onValidateLength?: (ticket: RegrindWorkTicket) => void;
  onOpenNewOrderModal: () => void;
  onOpenQrScanner: () => void;
  onViewPrDetails?: (prNumber: string) => void;
  selectedGlobalPart?: string;
}

export const RegrindQueueTable: React.FC<RegrindQueueTableProps> = ({
  tickets,
  activeStatusFilter,
  onStatusFilterChange,
  onStartGrind,
  onCompleteGrind,
  onScrap,
  onValidateLength,
  onOpenNewOrderModal,
  onOpenQrScanner,
  onViewPrDetails,
  selectedGlobalPart = 'ALL'
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lineFilter, setLineFilter] = useState<string>('ALL');

  const filteredTickets = useMemo(() => {
    const list = tickets.filter(t => {
      // Global Part Filter (Module 3 Requirement)
      if (selectedGlobalPart !== 'ALL' && t.partName.toLowerCase() !== selectedGlobalPart.toLowerCase()) {
        return false;
      }
      // Status filter
      if (activeStatusFilter !== 'ALL' && t.status !== activeStatusFilter) {
        return false;
      }
      // Line filter
      if (lineFilter !== 'ALL' && t.lineId !== lineFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.partName.toLowerCase().includes(q);
        const matchJob = t.jobCode.toLowerCase().includes(q);
        const matchQr = t.qrCode.toLowerCase().includes(q);
        const matchPos = (t.positionId || '').toLowerCase().includes(q);
        const matchLine = t.lineId.toLowerCase().includes(q);
        if (!matchName && !matchJob && !matchQr && !matchPos && !matchLine) {
          return false;
        }
      }
      return true;
    });

    // Priority-Sorted List: Delayed/Overdue jobs stay at the TOP (Module 2 Requirement)
    return list.sort((a, b) => {
      const now = new Date();
      const aTarget = a.targetCompletionDate ? new Date(a.targetCompletionDate) : null;
      const bTarget = b.targetCompletionDate ? new Date(b.targetCompletionDate) : null;

      const aIsOverdue = a.isDelayed || (aTarget && aTarget < now && a.status !== 'READY' && a.status !== 'SCRAP');
      const bIsOverdue = b.isDelayed || (bTarget && bTarget < now && b.status !== 'READY' && b.status !== 'SCRAP');

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      // Secondary sort: status priority PENDING -> IN_PROCESS -> PAUSED -> READY -> SCRAP
      const statusOrder: Record<RegrindQueueStatus, number> = {
        PENDING: 1,
        IN_PROCESS: 2,
        PAUSED: 3,
        READY: 4,
        SCRAP: 5
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [tickets, activeStatusFilter, lineFilter, searchQuery, selectedGlobalPart]);

  const getStatusBadge = (status: RegrindQueueStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            รอเจียร (Pending)
          </span>
        );
      case 'IN_PROCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            กำลังเจียร (In-Process)
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            พร้อมใช้ (Ready)
          </span>
        );
      case 'SCRAP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            ทิ้ง / หมดสเปค (Scrap)
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input + Line filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อทูลลิ่ง, Job Code, QR, หรือตำแหน่ง (เช่น Burring, E1)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <select
            value={lineFilter}
            onChange={e => setLineFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">ทุกสายการผลิต (All Lines: E1-E5)</option>
            <option value="E1">Line E1 (7mm Standard)</option>
            <option value="E2">Line E2 (5mm Micro)</option>
            <option value="E3-1">Line E3-1</option>
            <option value="E3-2">Line E3-2</option>
            <option value="E3-3">Line E3-3</option>
            <option value="E4">Line E4</option>
            <option value="E5">Line E5</option>
          </select>
        </div>

        {/* Right: Quick action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenQrScanner}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-cyan-100 dark:bg-slate-800 dark:hover:bg-cyan-950/60 text-slate-700 hover:text-cyan-800 dark:text-slate-300 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 transition-all shadow-xs"
          >
            <QrCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>สแกน QR / Barcode</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewOrderModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เปิดใบงานใหม่ (New Job)</span>
          </button>
        </div>
      </div>

      {/* Status Tab Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'ALL', label: 'ทั้งหมด (All Tickets)', count: tickets.length },
          { id: 'PENDING', label: 'รอเจียร (Pending)', count: tickets.filter(t => t.status === 'PENDING').length },
          { id: 'IN_PROCESS', label: 'กำลังเจียร (In-Process)', count: tickets.filter(t => t.status === 'IN_PROCESS').length },
          { id: 'READY', label: 'สต๊อกพร้อมใช้ (Ready)', count: tickets.filter(t => t.status === 'READY').length },
          { id: 'SCRAP', label: 'ทิ้ง / หมดสเปค (Scrap)', count: tickets.filter(t => t.status === 'SCRAP' || t.isScrapped).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onStatusFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeStatusFilter === tab.id
                ? 'bg-slate-900 text-white dark:bg-cyan-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeStatusFilter === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3">ชิ้นส่วน & ตำแหน่ง (Tooling Part)</th>
              <th className="p-3 text-center">รูป CAD / Pic</th>
              <th className="p-3">รหัส QR & Job Code</th>
              <th className="p-3">สถานะ (Status)</th>
              <th className="p-3">มิติ & รอบเจียร (Length & Life)</th>
              <th className="p-3">สาเหตุความชำรุด (Defect Reason)</th>
              <th className="p-3">ช่างผู้รับผิดชอบ</th>
              <th className="p-3 text-right">ดำเนินการ (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      ไม่พบรายการใบงานเจียรในตัวกรองนี้
                    </p>
                    <p className="text-[11px] text-slate-400">
                      สามารถเปิดใบงานใหม่ หรือสแกน QR Code ทูลลิ่งเพื่อเริ่มกระบวนการได้ทันที
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map(ticket => {
                const minLimit = ticket.minAllowedLengthMm || 65.00;
                const currentLen = ticket.lengthAfterGrindMm || ticket.previousLengthMm || ticket.nominalLengthMm;
                const lifeProgressPct = Math.min(
                  100,
                  Math.max(0, ((currentLen - minLimit) / (ticket.nominalLengthMm - minLimit || 1)) * 100)
                );
                const reasonInfo = DEFECT_REASON_LABELS[ticket.defectReason] || DEFECT_REASON_LABELS.NORMAL_WEAR;

                return (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Part & Line Position */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{ticket.partName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {ticket.lineId}
                        </span>
                        {ticket.isDelayed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-orange-500 text-white animate-pulse shadow-xs">
                            [Delayed] เลื่อนวัน
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>ตำแหน่ง: <strong className="text-slate-700 dark:text-slate-300 font-mono">{ticket.positionId || 'Common'}</strong></span>
                        {ticket.quantity && ticket.quantity > 1 && (
                          <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                            (Qty: {ticket.quantity} ชิ้น)
                          </span>
                        )}
                        {ticket.source === 'AUTO_FROM_DIE_LAYOUT' && (
                          <span className="text-[9px] px-1 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-semibold">
                            Auto-Queue
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CAD / Picture Vector Thumbnail with Zoom */}
                    <td className="p-3 text-center">
                      <ToolingPicThumbnail
                        picCategory={ticket.picCategory}
                        partName={ticket.partName}
                        size="sm"
                      />
                    </td>

                    {/* QR Code & Job Code */}
                    <td className="p-3 font-mono">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {ticket.jobCode}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-cyan-500" />
                        <span>{ticket.qrCode}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {getStatusBadge(ticket.status)}
                    </td>

                    {/* Dimensional & Life Progress */}
                    <td className="p-3 min-w-[170px]">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {currentLen.toFixed(2)} mm
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Min: {minLimit.toFixed(2)} mm
                        </span>
                      </div>
                      {/* Visual life bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ticket.isScrapped || currentLen < minLimit
                              ? 'bg-rose-500'
                              : lifeProgressPct < 30
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${lifeProgressPct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex justify-between">
                        <span>รอบเจียร: <strong className="text-slate-700 dark:text-slate-300">{ticket.regrindCountAfter || ticket.regrindCountBefore || 1}/{ticket.maxRegrindAllowed}</strong></span>
                        {ticket.shimAddedMm > 0 && (
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                            +Shim {ticket.shimAddedMm.toFixed(2)}mm
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Defect Reason Tag */}
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${reasonInfo.color}`}>
                        {reasonInfo.th}
                      </span>
                      {ticket.defectNotes && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {ticket.defectNotes}
                        </p>
                      )}
                    </td>

                    {/* Technician */}
                    <td className="p-3 text-[11px]">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {ticket.assignedTechnician || ticket.receivedBy}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">

                        {ticket.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => onStartGrind(ticket)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>เริ่มเจียร</span>
                          </button>
                        )}

                        {ticket.status === 'IN_PROCESS' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onCompleteGrind(ticket)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>บันทึกเสร็จ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onScrap(ticket)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold text-xs transition-colors"
                              title="ตัดทิ้งเนื่องจากชำรุดเสียหาย"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>ทิ้ง</span>
                            </button>
                          </>
                        )}

                        {ticket.status === 'READY' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>ในสต๊อกพร้อมใช้</span>
                          </span>
                        )}

                        {ticket.status === 'SCRAP' && (
                          <div className="flex items-center gap-1">
                            {ticket.purchasingPrNumber ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800"
                                title="เลขที่ใบขอสั่งซื้อทดแทน"
                              >
                                <span>{ticket.purchasingPrNumber}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded">
                                Scrapped
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
