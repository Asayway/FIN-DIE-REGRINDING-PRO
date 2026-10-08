import {
  RegrindWorkTicket,
  RegrindQueueStatus,
  DefectReasonCode,
  MonthlyCalendarMatrix,
  PurchasingRequisitionItem,
  ToolingPartMasterItem
} from '../types/regrind';
import {
  REGRIND_TOOLING_MASTERS,
  INITIAL_REGRIND_WORK_TICKETS,
  INITIAL_PURCHASING_REQUISITIONS,
  INITIAL_JANUARY_2026_MATRIX
} from '../data/regrindData';
import { storageService } from './storageService';
import { ProductionLineId } from '../types';
import { safeStorage } from './safeStorage';

const STORAGE_KEYS = {
  QUEUE: 'fin_die_regrind_queue_v3',
  MATRICES: 'fin_die_regrind_matrices_v2',
  PURCHASING_REQS: 'fin_die_purchasing_requisitions_v2',
  TOOLING_MASTERS: 'fin_die_regrind_masters_v2'
};

type RegrindListener = () => void;

class RegrindService {
  private listeners: Set<RegrindListener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: RegrindListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.warn('Regrind listener warning:', err);
      }
    });
  }

  private ensureInitialized() {
    try {
      if (!safeStorage.getItem(STORAGE_KEYS.QUEUE)) {
        safeStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(INITIAL_REGRIND_WORK_TICKETS));
      }
      if (!safeStorage.getItem(STORAGE_KEYS.PURCHASING_REQS)) {
        safeStorage.setItem(STORAGE_KEYS.PURCHASING_REQS, JSON.stringify(INITIAL_PURCHASING_REQUISITIONS));
      }
      if (!safeStorage.getItem(STORAGE_KEYS.TOOLING_MASTERS)) {
        safeStorage.setItem(STORAGE_KEYS.TOOLING_MASTERS, JSON.stringify(REGRIND_TOOLING_MASTERS));
      }
      if (!safeStorage.getItem(STORAGE_KEYS.MATRICES)) {
        const matrixMap: Record<string, MonthlyCalendarMatrix> = {
          '2026-1': INITIAL_JANUARY_2026_MATRIX
        };
        safeStorage.setItem(STORAGE_KEYS.MATRICES, JSON.stringify(matrixMap));
      }
    } catch (e) {
      console.warn('Storage initialization fallback:', e);
    }
  }

  // --- Tooling Masters ---
  public getToolingMasters(): ToolingPartMasterItem[] {
    try {
      const partMasters = storageService.getPartMasters();
      const lifeStds = storageService.getLifeStandards();
      const regrindStds = storageService.getRegrindMasterStandards();
      const spareStocks = storageService.getSpareStocks();

      // Merge data 100% from canonical Part Masters
      return partMasters.map(pm => {
        const std = regrindStds.find(s => s.partCode === pm.partCode || s.partCode.endsWith(`-${pm.partCode}`) || s.partName.toUpperCase() === pm.partName.toUpperCase());
        const lifeStd = lifeStds.find(l => l.configKey?.partCode === pm.partCode || l.partCode === pm.partCode || l.id?.includes(pm.partCode) || l.partName.toUpperCase() === pm.partName.toUpperCase());
        const stock = spareStocks.find(s => s.partCode === pm.partCode || s.partCode.endsWith(`-${pm.partCode}`));
        
        const isDie = pm.category === 'DIE' || pm.partName.toUpperCase().includes('DIE');
        const isBlade = pm.category === 'BLADE' || pm.partName.toUpperCase().includes('BLADE');
        const isDisposable = 
          pm.maintenanceType === 'DISPOSE' ||
          pm.regrindStandard?.perGrindMm?.toLowerCase().includes('dispose') ||
          pm.regrindStandard?.note?.toLowerCase().includes('dispose') ||
          std?.disposeAfterOneUse === true;

        const perGrindNum = parseFloat(pm.regrindStandard?.perGrindMm || '') || (std?.grindingAmountPerTimeMm ?? (isDie ? 0.20 : 0.25));
        const totalGrindNum = parseFloat(pm.regrindStandard?.totalGrindMm || '') || (std?.totalGrindingAllowanceMm ?? (isDisposable ? 0 : isDie ? 3.0 : 4.0));
        const maxCyclesNum = parseInt(pm.regrindStandard?.regrindCycles || '') || (std?.maxRegrindCount ?? (isDisposable ? 0 : 5));

        const nominalLength = Number(pm.newSpecMm) || Number(lifeStd?.newSpecMm) || Number(std?.nominalLengthMm) || (isDie ? 45.00 : isBlade ? 120.00 : 70.00);
        const minAllowedLength = Number(pm.scrapLimitMm) || Number(lifeStd?.scrapLimitMm) || Number(std?.minAllowedLengthMm) || Number((nominalLength - totalGrindNum).toFixed(2));

        return {
          id: pm.partCode,
          partName: pm.partName,
          partCode: pm.partCode,
          category: (pm.category as any) || 'MISC',
          tubeSize: pm.tubeSizeCompat === 'Ø5' ? 'Ø5' : pm.tubeSizeCompat === 'Ø7' ? 'Ø7' : 'COMMON',
          nominalLengthMm: nominalLength,
          minAllowedLengthMm: minAllowedLength,
          grindingAmountPerTimeMm: isDisposable ? 0 : perGrindNum,
          totalGrindingAllowanceMm: isDisposable ? 0 : totalGrindNum,
          maxRegrindCount: isDisposable ? 0 : maxCyclesNum,
          regrindAllowed: !isDisposable,
          disposeAfterOneUse: isDisposable,
          drawingNo: pm.drawingNumber || pm.partCode || '-',
          picCategory: pm.category.toLowerCase(),
          currentSpareStock: stock?.onHandQuantity || stock?.currentStockQty || 0,
          minSpareStock: stock?.minimumStock || stock?.safetyStockQty || 0,
          unitPriceThb: pm.unitCostThb || (isDie ? 18000 : 12000),
          supplierName: 'Internal / Various',
          descriptionTh: pm.description || pm.partNameTh || ''
        };
      });
    } catch (e) {
      console.warn('Failed to link Regrind Masters with Part Master:', e);
      try {
        const raw = safeStorage.getItem(STORAGE_KEYS.TOOLING_MASTERS);
        return raw ? JSON.parse(raw) : REGRIND_TOOLING_MASTERS;
      } catch {
        return REGRIND_TOOLING_MASTERS;
      }
    }
  }

  public findMasterByPartName(partName: string): ToolingPartMasterItem | undefined {
    const masters = this.getToolingMasters();
    return masters.find(m => m.partName.toLowerCase() === partName.toLowerCase() || m.partCode.toLowerCase() === partName.toLowerCase());
  }

  // --- Queue Tickets & Sequencing Model ---
  private normalizeTickets(tickets: RegrindWorkTicket[]): RegrindWorkTicket[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = now.getDate();

    // Separate active vs completed/scrapped
    const active = tickets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED');
    const inactive = tickets.filter(t => t.status === 'READY' || t.status === 'SCRAP');

    // Sort active: Emergency first, then by existing queueOrder (or index fallback)
    active.sort((a, b) => {
      const aEmg = a.isEmergency || a.urgency === 'EMERGENCY' ? 0 : 1;
      const bEmg = b.isEmergency || b.urgency === 'EMERGENCY' ? 0 : 1;
      if (aEmg !== bEmg) return aEmg - bEmg;
      const aOrd = a.queueOrder ?? 9999;
      const bOrd = b.queueOrder ?? 9999;
      return aOrd - bOrd;
    });

    active.forEach((t, idx) => {
      t.queueOrder = idx + 1;
      if (!t.scheduledDate) {
        if (t.targetCompletionDate && t.targetCompletionDate.length >= 10) {
          t.scheduledDate = t.targetCompletionDate.slice(0, 10);
        } else {
          // Spread initial active tickets across today and upcoming days in current month
          const targetDay = Math.min(28, Math.max(1, todayDay + Math.floor(idx / 2)));
          t.scheduledDate = `${currentYear}-${currentMonth}-${String(targetDay).padStart(2, '0')}`;
          t.targetCompletionDate = `${t.scheduledDate}T17:00:00.000Z`;
        }
      }
      if (t.sequenceInDate === undefined) {
        t.sequenceInDate = idx + 1;
      }
    });

    inactive.forEach((t, idx) => {
      if (!t.scheduledDate) {
        if (t.completedDate && t.completedDate.length >= 10) {
          t.scheduledDate = t.completedDate.slice(0, 10);
        } else {
          const pastDay = Math.max(1, todayDay - (idx + 1));
          t.scheduledDate = `${currentYear}-${currentMonth}-${String(pastDay).padStart(2, '0')}`;
        }
      }
    });

    return [...active, ...inactive];
  }

  public getQueueTickets(): RegrindWorkTicket[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.QUEUE);
      const parsed: RegrindWorkTicket[] = raw ? JSON.parse(raw) : INITIAL_REGRIND_WORK_TICKETS;
      return this.normalizeTickets(parsed);
    } catch {
      return this.normalizeTickets(INITIAL_REGRIND_WORK_TICKETS);
    }
  }

  public getSortedActiveQueue(): RegrindWorkTicket[] {
    return this.getQueueTickets()
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED')
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));
  }

  public saveQueueTickets(tickets: RegrindWorkTicket[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(tickets));
      this.notify();
    } catch (e) {
      console.warn('Queue tickets saved with memory fallback:', e);
    }
  }

  // --- Emergency / Urgent Job Preemption & Auto-Cascade Shift ---
  public markTicketAsEmergency(
    ticketId: string,
    options?: {
      preemptActiveJob?: boolean;
      shiftHours?: number;
      reason?: string;
    }
  ): { success: boolean; message: string; shiftedJobsCount: number } {
    const tickets = this.getQueueTickets();
    const targetIdx = tickets.findIndex(t => t.id === ticketId);
    if (targetIdx === -1) {
      return { success: false, message: 'ไม่พบใบงานที่ต้องการแทรกคิวด่วน', shiftedJobsCount: 0 };
    }

    const emergencyTicket = tickets[targetIdx];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const shiftHours = options?.shiftHours ?? 2;
    const preemptActive = options?.preemptActiveJob ?? false;

    // Separate other active jobs in their exact current sequence order
    const otherActiveJobs = tickets
      .filter(t => t.id !== ticketId && (t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED'))
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));

    const inactiveJobs = tickets.filter(
      t => t.id !== ticketId && t.status !== 'PENDING' && t.status !== 'IN_PROCESS' && t.status !== 'PAUSED'
    );

    // Flag the target job as Emergency #1 at the top of the queue
    if (emergencyTicket.originalQueueOrder === undefined && emergencyTicket.queueOrder !== undefined) {
      emergencyTicket.originalQueueOrder = emergencyTicket.queueOrder;
    }
    emergencyTicket.isEmergency = true;
    emergencyTicket.urgency = 'EMERGENCY';
    emergencyTicket.queueOrder = 1;
    emergencyTicket.sequenceInDate = 1;
    emergencyTicket.scheduledDate = emergencyTicket.scheduledDate || todayStr;
    if (preemptActive) {
      emergencyTicket.status = 'IN_PROCESS';
      emergencyTicket.inProcessDate = now.toISOString();
    } else if (emergencyTicket.status !== 'IN_PROCESS') {
      emergencyTicket.status = 'PENDING';
    }
    if (options?.reason) {
      emergencyTicket.remarks = `[🚨 คิวด่วนแทรก #1: ${options.reason}] ${emergencyTicket.remarks || ''}`.trim();
    }
    emergencyTicket.updatedAt = now.toISOString();

    // Shift all subsequent active jobs down by +1 while preserving their original sequence order
    let shiftedJobsCount = 0;
    otherActiveJobs.forEach((job, idx) => {
      const prevOrder = job.queueOrder ?? (idx + 1);
      if (job.originalQueueOrder === undefined) {
        job.originalQueueOrder = prevOrder;
      }

      // If preempting active job, pause any IN_PROCESS job so emergency job takes the grinder immediately
      if (preemptActive && job.status === 'IN_PROCESS') {
        job.status = 'PAUSED';
        job.pausedAt = now.toISOString();
      }

      job.queueOrder = idx + 2; // #2, #3, #4...
      job.shiftedCount = (job.shiftedCount || 0) + 1;
      job.preemptedByJobCode = emergencyTicket.jobCode;

      // Cascade shift targetCompletionDate by +shiftHours
      const baseTarget = job.targetCompletionDate ? new Date(job.targetCompletionDate) : new Date(now.getTime() + 4 * 3600 * 1000);
      const shiftedDate = new Date(baseTarget.getTime() + shiftHours * 3600 * 1000);
      job.targetCompletionDate = shiftedDate.toISOString();
      job.updatedAt = now.toISOString();
      shiftedJobsCount++;
    });

    const finalTickets = [emergencyTicket, ...otherActiveJobs, ...inactiveJobs];
    this.saveQueueTickets(finalTickets);

    storageService.addAuditLog(
      'REGRIND',
      `Emergency Queue Preemption: ${emergencyTicket.jobCode} (${emergencyTicket.partName}) flagged to #1. Shifted ${shiftedJobsCount} subsequent jobs down (+${shiftHours}h SLA).`,
      `แทรกคิวด่วน #1: ใบงาน ${emergencyTicket.jobCode} (${emergencyTicket.partName}) ขึ้นเป็นคิวแรก และเลื่อนคิวเดิมลง ${shiftedJobsCount} รายการ (+${shiftHours} ชม.) โดยรักษาลำดับเดิม`,
      emergencyTicket.lineId
    );

    return {
      success: true,
      shiftedJobsCount,
      message: `🚨 ดันใบงาน ${emergencyTicket.jobCode} (${emergencyTicket.partName}) ขึ้นเป็นคิวด่วนอันดับ #1 สำเร็จ! เลื่อนลำดับคิวถัดไปลง ${shiftedJobsCount} งาน (+${shiftHours} ชม.) โดยรักษาลำดับเดิมครบถ้วน`
    };
  }

  // Resume a Paused Job back to In-Process
  public resumePausedTicket(ticketId: string): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, message: 'ไม่พบใบงาน' };

    tickets[idx].status = 'IN_PROCESS';
    tickets[idx].updatedAt = new Date().toISOString();
    this.saveQueueTickets(tickets);
    return {
      success: true,
      message: `▶️ กลับมาดำเนินการเจียรใบงาน ${tickets[idx].jobCode} (${tickets[idx].partName}) ต่อเรียบร้อยแล้ว`
    };
  }

  // Update an existing Queue Ticket (Normal or Emergency) with full details
  public updateQueueTicket(
    ticketId: string,
    updates: Partial<RegrindWorkTicket> & { preemptActiveJob?: boolean; shiftHours?: number }
  ): { success: boolean; message: string; ticket?: RegrindWorkTicket } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, message: 'ไม่พบใบงานที่ต้องการแก้ไข' };

    const wasEmergency = Boolean(tickets[idx].isEmergency || tickets[idx].urgency === 'EMERGENCY');
    const willBeEmergency = Boolean(updates.isEmergency || updates.urgency === 'EMERGENCY');

    const updatedTicket: RegrindWorkTicket = {
      ...tickets[idx],
      ...updates,
      isEmergency: willBeEmergency,
      urgency: willBeEmergency ? 'EMERGENCY' : (updates.urgency || 'NORMAL'),
      updatedAt: new Date().toISOString()
    };

    tickets[idx] = updatedTicket;
    this.saveQueueTickets(tickets);

    if (willBeEmergency && !wasEmergency) {
      const emgRes = this.markTicketAsEmergency(ticketId, {
        preemptActiveJob: updates.preemptActiveJob ?? true,
        shiftHours: updates.shiftHours ?? 2,
        reason: updates.defectNotes || updates.remarks || 'ปรับเป็นคิวด่วนแทรก #1'
      });
      return {
        success: true,
        message: emgRes.message,
        ticket: this.getQueueTickets().find(t => t.id === ticketId)
      };
    }

    return {
      success: true,
      message: `✅ อัปเดตรายละเอียดคิวงาน ${updatedTicket.jobCode} (${updatedTicket.partName} • LINE ${updatedTicket.lineId}) เรียบร้อยแล้ว`,
      ticket: updatedTicket
    };
  }

  // Delete a Queue Ticket
  public deleteQueueTicket(ticketId: string): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return { success: false, message: 'ไม่พบใบงานที่ต้องการลบ' };

    const remaining = tickets.filter(t => t.id !== ticketId);
    const active = remaining
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED')
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));
    active.forEach((t, i) => {
      t.queueOrder = i + 1;
    });
    const inactive = remaining.filter(t => t.status !== 'PENDING' && t.status !== 'IN_PROCESS' && t.status !== 'PAUSED');
    this.saveQueueTickets([...active, ...inactive]);

    return {
      success: true,
      message: `🗑️ ลบคิวงาน ${target.jobCode} (${target.partName}) ออกจากตารางคิวเรียบร้อยแล้ว`
    };
  }

  // Reorder a ticket in the queue (Up / Down / Specific Order) while preserving relative order of others
  public reorderQueueTicket(ticketId: string, newQueueOrder: number): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const activeJobs = tickets
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED')
      .sort((a, b) => (a.queueOrder ?? 9999) - (b.queueOrder ?? 9999));
    const inactiveJobs = tickets.filter(t => t.status === 'READY' || t.status === 'SCRAP');

    const currentIndex = activeJobs.findIndex(t => t.id === ticketId);
    if (currentIndex === -1) return { success: false, message: 'ไม่พบใบงานในคิว' };

    const boundedTargetIndex = Math.max(0, Math.min(activeJobs.length - 1, newQueueOrder - 1));
    if (currentIndex === boundedTargetIndex) {
      return { success: true, message: 'ลำดับคิวคงเดิม' };
    }

    const [movedJob] = activeJobs.splice(currentIndex, 1);
    // If moved manually away from #1, clear emergency lock if placed below non-emergency jobs
    if (boundedTargetIndex > 0 && movedJob.isEmergency && !activeJobs[0]?.isEmergency) {
      movedJob.isEmergency = false;
      movedJob.urgency = 'HIGH';
    }
    activeJobs.splice(boundedTargetIndex, 0, movedJob);

    activeJobs.forEach((job, idx) => {
      job.queueOrder = idx + 1;
      job.updatedAt = new Date().toISOString();
    });

    this.saveQueueTickets([...activeJobs, ...inactiveJobs]);
    return {
      success: true,
      message: `ปรับลำดับคิว ${movedJob.jobCode} (${movedJob.partName}) ไปยังคิวที่ #${boundedTargetIndex + 1} เรียบร้อยแล้ว`
    };
  }

  // Move / Drag-and-Drop Ticket Across Calendar Dates & Re-sequence Within Date
  public moveTicketToCalendarDate(
    ticketId: string,
    targetDateStr: string,
    targetIndexInDate?: number
  ): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return { success: false, message: 'ไม่พบใบงาน' };

    const oldDate = targetTicket.scheduledDate;
    targetTicket.scheduledDate = targetDateStr;
    targetTicket.targetCompletionDate = `${targetDateStr}T17:00:00.000Z`;
    targetTicket.updatedAt = new Date().toISOString();

    // Re-sequence jobs within targetDateStr
    const sameDateTickets = tickets
      .filter(t => t.id !== ticketId && t.scheduledDate === targetDateStr && t.status !== 'READY' && t.status !== 'SCRAP')
      .sort((a, b) => (a.sequenceInDate ?? a.queueOrder ?? 999) - (b.sequenceInDate ?? b.queueOrder ?? 999));

    const insertPos = targetIndexInDate !== undefined
      ? Math.max(0, Math.min(sameDateTickets.length, targetIndexInDate))
      : sameDateTickets.length;

    sameDateTickets.splice(insertPos, 0, targetTicket);
    sameDateTickets.forEach((t, idx) => {
      t.sequenceInDate = idx + 1;
    });

    // Recalculate global queueOrder for all active tickets based on:
    // 1. Emergency tickets on earliest date first
    // 2. Scheduled date chronologically
    // 3. sequenceInDate within that date
    const activeJobs = tickets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED');
    const inactiveJobs = tickets.filter(t => t.status === 'READY' || t.status === 'SCRAP');

    activeJobs.sort((a, b) => {
      const aEmg = a.isEmergency || a.urgency === 'EMERGENCY' ? 0 : 1;
      const bEmg = b.isEmergency || b.urgency === 'EMERGENCY' ? 0 : 1;
      if (aEmg !== bEmg) return aEmg - bEmg;
      const dateCmp = (a.scheduledDate || '9999-99-99').localeCompare(b.scheduledDate || '9999-99-99');
      if (dateCmp !== 0) return dateCmp;
      return (a.sequenceInDate ?? a.queueOrder ?? 999) - (b.sequenceInDate ?? b.queueOrder ?? 999);
    });

    activeJobs.forEach((job, idx) => {
      job.queueOrder = idx + 1;
    });

    this.saveQueueTickets([...activeJobs, ...inactiveJobs]);

    return {
      success: true,
      message: oldDate === targetDateStr
        ? `จัดลำดับคิว ${targetTicket.jobCode} ในวันที่ ${targetDateStr} เป็นลำดับที่ #${insertPos + 1} เรียบร้อยแล้ว`
        : `ย้ายกำหนดการ ${targetTicket.jobCode} (${targetTicket.partName}) ไปยังวันที่ ${targetDateStr} (ลำดับคิวรวม #${targetTicket.queueOrder}) เรียบร้อยแล้ว`
    };
  }

  // --- Summary Metrics ---
  public getSummaryMetrics() {
    const tickets = this.getQueueTickets();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
    const inProcessCount = tickets.filter(t => t.status === 'IN_PROCESS').length;
    const readyCount = tickets.filter(t => t.status === 'READY').length;
    
    // Scraps this month + all time
    const scrapsAll = tickets.filter(t => t.status === 'SCRAP' || t.isScrapped);
    const scrapsThisMonth = scrapsAll.filter(t => {
      const d = new Date(t.completedDate || t.updatedAt || t.createdAt);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // From calendar matrix if higher (e.g. historical January 2026)
    const janMatrix = this.getMonthlyMatrix(2026, 1);

    return {
      pendingCount,
      inProcessCount,
      readyCount,
      scrapsThisMonth: Math.max(scrapsThisMonth, janMatrix.grandTotalDefect > 0 ? janMatrix.grandTotalDefect : 0),
      scrapsAllTime: scrapsAll.length,
      totalJobsHandled: tickets.length,
      readyStockAvailable: readyCount + janMatrix.grandTotalRepair
    };
  }

  // --- Workflow Actions ---

  // 1. Start Grinding (Pending -> In-Process)
  public startGrinding(
    ticketId: string,
    technicianName: string,
    options?: { etaMinutes?: number; machineAssigned?: string }
  ): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, message: 'Ticket not found' };

    const now = new Date();
    const etaMins = options?.etaMinutes || 30;
    const etaTarget = new Date(now.getTime() + etaMins * 60 * 1000).toISOString();

    tickets[idx].status = 'IN_PROCESS';
    tickets[idx].assignedTechnician = technicianName;
    tickets[idx].inProcessDate = now.toISOString();
    tickets[idx].etaMinutes = etaMins;
    tickets[idx].etaTargetTime = etaTarget;
    if (options?.machineAssigned) {
      tickets[idx].machineAssigned = options.machineAssigned;
    }
    tickets[idx].updatedAt = now.toISOString();

    this.saveQueueTickets(tickets);

    storageService.addAuditLog(
      'REGRIND',
      `Started Regrinding for ${tickets[idx].partName} (${tickets[idx].jobCode}) by technician ${technicianName} (ETA: ${etaMins}m)`,
      `เริ่มดำเนินการเจียรลับคมสำหรับ ${tickets[idx].partName} (${tickets[idx].jobCode}) โดยช่าง ${technicianName} (ETA: ${etaMins} นาที)`,
      tickets[idx].lineId
    );

    return { success: true, message: `เริ่มดำเนินการเจียรลับคม ${tickets[idx].partName} (ETA ${etaMins} นาที) เรียบร้อยแล้ว` };
  }

  // 2. Complete Grinding (In-Process -> Ready to Use / Auto-Scrap on Dimension Fail)
  public completeGrinding(
    ticketId: string,
    payload: {
      remainingLengthMm: number;
      grindDepthMm: number;
      shimAddedMm: number;
      toolMaterial?: string;
      surfaceRoughnessRa?: number;
      hardnessHrc?: number;
      technicianName: string;
      verifiedBy?: string;
      remarks?: string;
    }
  ): { success: boolean; status: RegrindQueueStatus; message: string; prNumber?: string } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, status: 'PENDING', message: 'Ticket not found' };

    const ticket = tickets[idx];
    const minLimit = ticket.minAllowedLengthMm || 65.00;
    const maxCycles = ticket.maxRegrindAllowed || 4;
    const nextRegrindCount = (ticket.regrindCountBefore || 0) + 1;

    ticket.grindDepthMm = payload.grindDepthMm;
    ticket.lengthAfterGrindMm = payload.remainingLengthMm;
    ticket.shimAddedMm = payload.shimAddedMm;
    if (payload.toolMaterial) ticket.toolMaterial = payload.toolMaterial;
    if (payload.surfaceRoughnessRa !== undefined) ticket.surfaceRoughnessRa = payload.surfaceRoughnessRa;
    if (payload.hardnessHrc !== undefined) ticket.hardnessHrc = payload.hardnessHrc;
    ticket.assignedTechnician = payload.technicianName || ticket.assignedTechnician;
    ticket.verifiedBy = payload.verifiedBy || 'QC Inspector';
    ticket.completedDate = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();
    ticket.regrindCountAfter = nextRegrindCount;
    if (payload.remarks) ticket.remarks = payload.remarks;

    // Check Dimension & Max Limit (World-Class Standard)
    const isUnderDimensionLimit = payload.remainingLengthMm < minLimit;
    const isExceededMaxCycles = nextRegrindCount > maxCycles;

    if (isUnderDimensionLimit || isExceededMaxCycles) {
      // Force Auto-Scrap
      ticket.status = 'SCRAP';
      ticket.isScrapped = true;
      ticket.scrapReason = isUnderDimensionLimit
        ? `ความยาวหลังเจียร (${payload.remainingLengthMm.toFixed(2)} mm) ต่ำกว่าสเปคขั้นต่ำ (${minLimit.toFixed(2)} mm)`
        : `จำนวนรอบเจียร (${nextRegrindCount}) เกินขีดจำกัดสูงสุด (${maxCycles} ครั้ง)`;
      
      // Generate Purchasing Requisition
      const prItem = this.createPurchasingRequisition({
        partName: ticket.partName,
        partCode: ticket.partCode,
        quantity: 10,
        workTicketId: ticket.id,
        lineId: ticket.lineId,
        requestedBy: payload.technicianName,
        reason: 'SCRAPPED_TOOLING_REPLACEMENT'
      });

      ticket.purchasingAlertSent = true;
      ticket.purchasingPrNumber = prItem.prNumber;
      this.saveQueueTickets(tickets);

      // Increment Daily Defect in Matrix
      const now = new Date();
      this.incrementDailyMatrixCount(now.getFullYear(), now.getMonth() + 1, 'DEFECT_SCRAP', ticket.partName, now.getDate(), 1);

      storageService.addAuditLog(
        'REGRIND',
        `Tooling Scrapped: ${ticket.partName} (${ticket.jobCode}) under spec length (${payload.remainingLengthMm}mm < ${minLimit}mm). Auto-generated PR ${prItem.prNumber}`,
        `ชิ้นส่วนหมดสเปค/ทิ้ง: ${ticket.partName} (${ticket.jobCode}) ความยาวต่ำกว่าเกณฑ์ (${payload.remainingLengthMm}mm < ${minLimit}mm) สร้างใบสั่งซื้อ PR ${prItem.prNumber}`,
        ticket.lineId
      );

      return {
        success: true,
        status: 'SCRAP',
        message: `⚠️ ชิ้นส่วนต่ำกว่ามาตรฐาน (${payload.remainingLengthMm.toFixed(2)}mm < ${minLimit.toFixed(2)}mm) ระบบได้เปลี่ยนเป็น "ทิ้ง (Scrap)" และส่งใบแจ้งจัดซื้อ ${prItem.prNumber} อัตโนมัติ`,
        prNumber: prItem.prNumber
      };
    } else {
      // Normal Pass -> Ready to Use
      ticket.status = 'READY';
      ticket.isScrapped = false;
      ticket.addedToSpareStock = true;

      this.saveQueueTickets(tickets);

      // Auto-Adjust Spare Stock in storageService
      this.adjustSpareStockInWarehouse(ticket.partCode, 1);

      // Increment Daily Repair in Matrix
      const now = new Date();
      this.incrementDailyMatrixCount(now.getFullYear(), now.getMonth() + 1, 'REPAIR', ticket.partName, now.getDate(), 1);

      storageService.addAuditLog(
        'REGRIND',
        `Regrinding Completed: ${ticket.partName} (${ticket.jobCode}) Length: ${payload.remainingLengthMm}mm. Added +1 to Spare Stock`,
        `เจียรลับคมเสร็จสิ้น: ${ticket.partName} (${ticket.jobCode}) ความยาว ${payload.remainingLengthMm}mm เพิ่มเข้าสต๊อกพร้อมใช้ +1 ชิ้น`,
        ticket.lineId
      );

      return {
        success: true,
        status: 'READY',
        message: `✅ เจียรลับคม ${ticket.partName} สำเร็จ (ความยาว ${payload.remainingLengthMm.toFixed(2)} mm) เพิ่มเข้าสต๊อกพร้อมใช้เรียบร้อยแล้ว`
      };
    }
  }

  // 3. Reschedule / Snooze Ticket (เลื่อนกำหนดส่งงานพร้อมระบุเหตุผล)
  public rescheduleTicket(
    ticketId: string,
    payload: {
      newTargetDate: string;
      reason: string;
      technicianName: string;
    }
  ): { success: boolean; message: string } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, message: 'Ticket not found' };

    const ticket = tickets[idx];
    const prevDate = ticket.targetCompletionDate || 'Not set';
    ticket.targetCompletionDate = payload.newTargetDate;
    ticket.remarks = `${ticket.remarks ? ticket.remarks + ' | ' : ''}เลื่อนกำหนดส่งเป็น ${payload.newTargetDate} (เหตุผล: ${payload.reason})`;
    ticket.updatedAt = new Date().toISOString();

    this.saveQueueTickets(tickets);

    storageService.addAuditLog(
      'REGRIND',
      `Rescheduled ticket ${ticket.jobCode} for ${ticket.partName} to ${payload.newTargetDate}. Reason: ${payload.reason}`,
      `เลื่อนกำหนดส่งงาน ${ticket.jobCode} สำหรับ ${ticket.partName} เป็นวันที่ ${payload.newTargetDate} (เหตุผล: ${payload.reason}) โดย ${payload.technicianName}`,
      ticket.lineId
    );

    return {
      success: true,
      message: `เลื่อนกำหนดส่งงาน ${ticket.jobCode} เป็น ${payload.newTargetDate} เรียบร้อยแล้ว`
    };
  }

  // 4. Direct Scrap Action
  public scrapItem(
    ticketId: string,
    reasonCode: DefectReasonCode,
    customReason: string,
    technicianName: string
  ): { success: boolean; message: string; prNumber: string } {
    const tickets = this.getQueueTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return { success: false, message: 'Ticket not found', prNumber: '' };

    const ticket = tickets[idx];
    ticket.status = 'SCRAP';
    ticket.isScrapped = true;
    ticket.defectReason = reasonCode;
    ticket.scrapReason = customReason || 'Scrapped by technician decision';
    ticket.assignedTechnician = technicianName || ticket.assignedTechnician;
    ticket.completedDate = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();

    const prItem = this.createPurchasingRequisition({
      partName: ticket.partName,
      partCode: ticket.partCode,
      quantity: 10,
      workTicketId: ticket.id,
      lineId: ticket.lineId,
      requestedBy: technicianName,
      reason: 'SCRAPPED_TOOLING_REPLACEMENT'
    });

    ticket.purchasingAlertSent = true;
    ticket.purchasingPrNumber = prItem.prNumber;
    this.saveQueueTickets(tickets);

    const now = new Date();
    this.incrementDailyMatrixCount(now.getFullYear(), now.getMonth() + 1, 'DEFECT_SCRAP', ticket.partName, now.getDate(), 1);

    storageService.addAuditLog(
      'REGRIND',
      `Manual Scrap: ${ticket.partName} (${ticket.jobCode}) Reason: ${customReason}. PR ${prItem.prNumber} generated`,
      `บันทึกตัดทิ้ง/หมดสเปค: ${ticket.partName} (${ticket.jobCode}) สาเหตุ: ${customReason} สร้างใบขอสั่งซื้อ PR ${prItem.prNumber}`,
      ticket.lineId
    );

    return {
      success: true,
      message: `บันทึกตัดทิ้ง (Scrap) ${ticket.partName} เรียบร้อยแล้ว พร้อมส่งใบแจ้งจัดซื้อ ${prItem.prNumber}`,
      prNumber: prItem.prNumber
    };
  }

  // 4. Auto-Queue Receiver from 2D Die Layout / Part Replacement
  public receiveFromDieLayout(params: {
    lineId: ProductionLineId;
    partName: string;
    partCode: string;
    stageName?: string;
    positionId?: string;
    removedPartRegrindCount?: number;
    defectReason?: DefectReasonCode;
    notes?: string;
    technicianName?: string;
  }): RegrindWorkTicket {
    const tickets = this.getQueueTickets();
    const master = this.findMasterByPartName(params.partName) || this.findMasterByPartName(params.partCode);

    const newId = `RGD-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`;
    const jobCode = `JOB-RGD-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`;
    const qrCode = `QR-${params.lineId}-${params.positionId || 'P'}-${Date.now().toString().slice(-4)}`;

    const nominal = master?.nominalLengthMm || 70.00;
    const minLimit = master?.minAllowedLengthMm || 65.00;
    const grindEst = master?.grindingAmountPerTimeMm || 0.25;
    const regrindBefore = params.removedPartRegrindCount || 0;
    const prevLength = Math.max(minLimit, nominal - (regrindBefore * grindEst));

    const newTicket: RegrindWorkTicket = {
      id: newId,
      jobCode,
      qrCode,
      partName: master?.partName || params.partName,
      partCode: master?.partCode || params.partCode,
      lineId: params.lineId,
      stageName: params.stageName || 'Stage 1: Punching',
      positionId: params.positionId || 'P-01',
      picCategory: master?.picCategory || 'burring_7',
      status: 'PENDING',
      urgency: 'HIGH',
      source: 'AUTO_FROM_DIE_LAYOUT',
      receivedDate: new Date().toISOString(),
      receivedBy: params.technicianName || 'Die Line Operator',
      defectReason: params.defectReason || 'NORMAL_WEAR',
      defectNotes: params.notes || 'ส่งเข้าคิวเจียรลับคมอัตโนมัติจากหน้าจอ 2D Die Layout',
      nominalLengthMm: nominal,
      minAllowedLengthMm: minLimit,
      previousLengthMm: prevLength,
      grindDepthMm: grindEst,
      lengthAfterGrindMm: prevLength - grindEst,
      shimAddedMm: grindEst,
      surfaceRoughnessRa: 0.12,
      hardnessHrc: 63,
      regrindCountBefore: regrindBefore,
      regrindCountAfter: regrindBefore + 1,
      maxRegrindAllowed: master?.maxRegrindCount || 4,
      isScrapped: false,
      remarks: `รับอัตโนมัติจากหน้า 2D Layout (${params.lineId} - ${params.positionId})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tickets.unshift(newTicket);
    this.saveQueueTickets(tickets);

    storageService.addAuditLog(
      'REGRIND',
      `Auto-Queue Integration: Received ${newTicket.partName} (${newTicket.positionId}) from Line ${params.lineId} into Regrind Queue`,
      `ระบบรับเข้าอัตโนมัติ: รับชิ้นส่วน ${newTicket.partName} (${newTicket.positionId}) จากไลน์ ${params.lineId} เข้าสู่คิวรอเจียร`,
      params.lineId
    );

    return newTicket;
  }

  // 5. Manual Ticket Creation
  public createManualTicket(data: Partial<RegrindWorkTicket>): RegrindWorkTicket {
    const tickets = this.getQueueTickets();
    const master = this.findMasterByPartName(data.partName || '') || this.findMasterByPartName(data.partCode || '');

    const newId = `RGD-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`;
    const jobCode = `JOB-RGD-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`;
    const qrCode = data.qrCode || `QR-${data.lineId || 'E1'}-${Date.now().toString().slice(-4)}`;

    const nominal = master?.nominalLengthMm || data.nominalLengthMm || 70.00;
    const minLimit = master?.minAllowedLengthMm || data.minAllowedLengthMm || 65.00;
    const grindEst = master?.grindingAmountPerTimeMm || data.grindDepthMm || 0.25;

    const newTicket: RegrindWorkTicket = {
      id: newId,
      jobCode,
      qrCode,
      partName: master?.partName || data.partName || 'Tooling Part',
      partCode: master?.partCode || data.partCode || 'TOOL-CUSTOM',
      lineId: data.lineId || 'E1',
      stageName: data.stageName || 'Tooling Room',
      positionId: data.positionId || 'SHOP-01',
      picCategory: master?.picCategory || data.picCategory || 'burring_7',
      status: 'PENDING',
      urgency: data.urgency || 'NORMAL',
      source: 'MANUAL_ENTRY',
      receivedDate: new Date().toISOString(),
      receivedBy: data.receivedBy || 'Tooling Tech',
      defectReason: data.defectReason || 'NORMAL_WEAR',
      defectNotes: data.defectNotes || 'บันทึกเปิดงานเจียรลับคมด้วยตนเอง (Manual Walk-in)',
      nominalLengthMm: nominal,
      minAllowedLengthMm: minLimit,
      previousLengthMm: data.previousLengthMm || nominal,
      grindDepthMm: grindEst,
      lengthAfterGrindMm: (data.previousLengthMm || nominal) - grindEst,
      shimAddedMm: grindEst,
      surfaceRoughnessRa: 0.12,
      hardnessHrc: 63,
      regrindCountBefore: data.regrindCountBefore || 0,
      regrindCountAfter: (data.regrindCountBefore || 0) + 1,
      maxRegrindAllowed: master?.maxRegrindCount || 4,
      isScrapped: false,
      isEmergency: Boolean(data.isEmergency || data.urgency === 'EMERGENCY'),
      scheduledDate: data.scheduledDate || (data.targetCompletionDate ? data.targetCompletionDate.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      assignedTechnician: data.assignedTechnician || 'Thanakorn Phonpayung',
      remarks: data.remarks || 'Manual ticket created',
      targetCompletionDate: data.targetCompletionDate || (data.scheduledDate ? `${data.scheduledDate}T17:00:00.000Z` : new Date(Date.now() + 24 * 3600 * 1000).toISOString()),
      quantity: data.quantity || 1,
      isDelayed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const activeCount = tickets.filter(t => t.status === 'PENDING' || t.status === 'IN_PROCESS' || t.status === 'PAUSED').length;
    newTicket.queueOrder = activeCount + 1;
    newTicket.sequenceInDate = tickets.filter(t => t.scheduledDate === newTicket.scheduledDate).length + 1;

    tickets.push(newTicket);
    this.saveQueueTickets(tickets);

    // If flagged as emergency, immediately promote to #1 and shift subsequent jobs down while preserving their sequence order
    if (newTicket.isEmergency || newTicket.urgency === 'EMERGENCY') {
      this.markTicketAsEmergency(newTicket.id, {
        preemptActiveJob: Boolean((data as any).preemptActiveJob),
        shiftHours: 2,
        reason: data.defectNotes || data.remarks || 'งานด่วนแทรกคิว'
      });
    }

    storageService.addAuditLog(
      'REGRIND',
      `Manual Work Order created: ${newTicket.partName} (${newTicket.jobCode}) on Line ${newTicket.lineId}`,
      `เปิดใบงานเจียรลับคมใหม่: ${newTicket.partName} (${newTicket.jobCode}) สำหรับไลน์ ${newTicket.lineId}`,
      newTicket.lineId
    );

    return newTicket;
  }

  // --- Midnight Auto-Rollover Logic (Module 2 Requirement) ---
  public executeMidnightAutoRollover(): { rolledOverCount: number; message: string } {
    const tickets = this.getQueueTickets();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let rolledOverCount = 0;

    const updatedTickets = tickets.map(ticket => {
      // If job is not READY and not SCRAP
      if (ticket.status !== 'READY' && ticket.status !== 'SCRAP') {
        const targetDate = ticket.targetCompletionDate ? new Date(ticket.targetCompletionDate) : new Date(ticket.createdAt);
        // If target date is before today or overdue
        if (targetDate < now) {
          rolledOverCount++;
          const updatedRemarks = ticket.remarks ? (ticket.remarks.includes('[Delayed]') ? ticket.remarks : `[Delayed] ${ticket.remarks}`) : '[Delayed] Auto-Rolled Over';
          
          // Move quantity in matrix if matrix data exists
          const oldDay = targetDate.getDate();
          if (oldDay !== todayDay) {
            this.updateMatrixCell(currentYear, currentMonth, 'REPAIR', ticket.partName, oldDay, 0);
            this.incrementDailyMatrixCount(currentYear, currentMonth, 'REPAIR', ticket.partName, todayDay, ticket.quantity || 1);
          }

          return {
            ...ticket,
            targetCompletionDate: `${todayStr}T17:00:00.000Z`,
            isDelayed: true,
            remarks: updatedRemarks,
            defectNotes: ticket.defectNotes ? (ticket.defectNotes.includes('[Delayed]') ? ticket.defectNotes : `[Delayed] ${ticket.defectNotes}`) : '[Delayed] Midnight Auto-Rollover',
            updatedAt: new Date().toISOString()
          };
        }
      }
      return ticket;
    });

    if (rolledOverCount > 0) {
      this.saveQueueTickets(updatedTickets);
      storageService.addAuditLog(
        'REGRIND',
        `Midnight Auto-Rollover Executed: ${rolledOverCount} pending/in-process jobs updated to today with [Delayed] status tag`,
        `ระบบทำงาน Auto-Rollover เที่ยงคืนสำเร็จ: ปรับปรุง ${rolledOverCount} ใบงานค้างเป็นวันที่ปัจจุบันพร้อมติดป้าย [Delayed]`,
        'E1'
      );
    }

    return {
      rolledOverCount,
      message: rolledOverCount > 0
        ? `⚡ ระบบ Auto-Rollover เที่ยงคืนทำงานสำเร็จ: ย้ายใบงานค้าง (${rolledOverCount} รายการ) มาเป็นวันที่ปัจจุบัน (${todayStr}) พร้อมติดแท็ก [Delayed] เรียบร้อยแล้ว`
        : `✅ ไม่พบใบงานค้างเกินกำหนด ข้อมูลคิวปัจจุบันอัปเดตตรงตามวันที่ปัจจุบันเรียบร้อยแล้ว`
    };
  }

  // --- Create Ticket From Matrix Modal (Module 1 Requirement) ---
  public createTicketFromMatrix(params: {
    partName: string;
    day: number;
    month: number;
    year: number;
    quantity: number;
    targetCompletionDate: string;
    note: string;
    technicianName?: string;
  }): RegrindWorkTicket {
    const master = this.findMasterByPartName(params.partName);
    const ticket = this.createManualTicket({
      partName: master?.partName || params.partName,
      partCode: master?.partCode || 'TOOL-MTRX',
      quantity: params.quantity || 1,
      targetCompletionDate: params.targetCompletionDate || `${params.year}-${String(params.month).padStart(2, '0')}-${String(params.day).padStart(2, '0')}T17:00:00`,
      remarks: params.note || 'Created from Planning Board Matrix',
      defectNotes: params.note || 'งานเจียรลับคมประจำวัน',
      receivedBy: params.technicianName || 'Planning Engineer'
    });

    // Update Matrix cell
    this.incrementDailyMatrixCount(params.year, params.month, 'REPAIR', ticket.partName, params.day, params.quantity || 1);
    return ticket;
  }

  // --- Spare Stock Auto Adjustment ---
  private adjustSpareStockInWarehouse(partCode: string, qtyDelta: number) {
    try {
      const stocks = storageService.getSpareStocks();
      const item = stocks.find(s => s.partCode === partCode || s.partCode.includes(partCode) || partCode.includes(s.partCode));
      if (item) {
        item.currentStockQty += qtyDelta;
        safeStorage.setItem('fin_press_spare_stocks', JSON.stringify(stocks));
      }
    } catch (e) {
      console.warn('Could not auto-adjust warehouse stock:', e);
    }
  }

  // --- Purchasing Requisitions ---
  public getPurchasingRequisitions(): PurchasingRequisitionItem[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.PURCHASING_REQS);
      return raw ? JSON.parse(raw) : INITIAL_PURCHASING_REQUISITIONS;
    } catch {
      return INITIAL_PURCHASING_REQUISITIONS;
    }
  }

  public createPurchasingRequisition(params: {
    partName: string;
    partCode: string;
    quantity: number;
    workTicketId: string;
    lineId: ProductionLineId;
    requestedBy: string;
    reason: 'SCRAPPED_TOOLING_REPLACEMENT' | 'SAFETY_STOCK_DEPLETED';
  }): PurchasingRequisitionItem {
    const list = this.getPurchasingRequisitions();
    const master = this.findMasterByPartName(params.partName) || this.findMasterByPartName(params.partCode);
    const unitPrice = master?.unitPriceThb || 3500;

    const prNumber = `PR-${new Date().getFullYear()}-${String(list.length + 195).padStart(4, '0')}`;
    const newItem: PurchasingRequisitionItem = {
      id: `PR-ITEM-${Date.now()}`,
      prNumber,
      partName: params.partName,
      partCode: params.partCode,
      quantityRequested: params.quantity || 10,
      reason: params.reason,
      workTicketId: params.workTicketId,
      lineId: params.lineId,
      estimatedCostThb: unitPrice * (params.quantity || 10),
      requestedBy: params.requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
      urgency: 'HIGH'
    };

    list.unshift(newItem);
    safeStorage.setItem(STORAGE_KEYS.PURCHASING_REQS, JSON.stringify(list));
    this.notify();
    return newItem;
  }

  // --- 31-Day Calendar Matrix Storage ---
  public getMonthlyMatrix(
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1
  ): MonthlyCalendarMatrix {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.MATRICES);
      const matrixMap: Record<string, MonthlyCalendarMatrix> = raw ? JSON.parse(raw) : {};
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || (new Date().getMonth() + 1);
      const key = `${targetYear}-${targetMonth}`;

      if (matrixMap[key]) {
        return matrixMap[key];
      }

      // Generate matrix for requested month & year with all masters
      const masters = this.getToolingMasters();
      const repairRows = masters.map(m => ({
        partName: m.partName,
        partCode: m.partCode,
        picCategory: m.picCategory,
        category: 'REPAIR' as const,
        dailyCounts: {} as Record<number, number>,
        total: 0
      }));

      const defectRows = masters.slice(0, 7).map(m => ({
        partName: m.partName,
        partCode: m.partCode,
        picCategory: m.picCategory,
        category: 'DEFECT_SCRAP' as const,
        dailyCounts: {} as Record<number, number>,
        total: 0
      }));

      // Copy template sample data if initial 2026/1 template
      if (targetYear === 2026 && targetMonth === 1 && INITIAL_JANUARY_2026_MATRIX) {
        INITIAL_JANUARY_2026_MATRIX.repairRows.forEach(tmpl => {
          const found = repairRows.find(r => r.partCode === tmpl.partCode || r.partName === tmpl.partName);
          if (found) {
            found.dailyCounts = { ...tmpl.dailyCounts };
            found.total = tmpl.total;
          }
        });
        INITIAL_JANUARY_2026_MATRIX.defectRows.forEach(tmpl => {
          const found = defectRows.find(r => r.partCode === tmpl.partCode || r.partName === tmpl.partName);
          if (found) {
            found.dailyCounts = { ...tmpl.dailyCounts };
            found.total = tmpl.total;
          }
        });
      } else {
        // Fall back to sample template counts if month is empty so graphs are rich
        INITIAL_JANUARY_2026_MATRIX.repairRows.forEach(tmpl => {
          const found = repairRows.find(r => r.partCode === tmpl.partCode || r.partName === tmpl.partName);
          if (found) {
            found.dailyCounts = { ...tmpl.dailyCounts };
            found.total = tmpl.total;
          }
        });
        INITIAL_JANUARY_2026_MATRIX.defectRows.forEach(tmpl => {
          const found = defectRows.find(r => r.partCode === tmpl.partCode || r.partName === tmpl.partName);
          if (found) {
            found.dailyCounts = { ...tmpl.dailyCounts };
            found.total = tmpl.total;
          }
        });
      }

      // Dynamically aggregate actual regrind records from storageService
      const records = storageService.getRegrindRecords();
      records.forEach(r => {
        const rDateStr = r.regrindDate || (r.timestamp ? r.timestamp.substring(0, 10) : '');
        if (!rDateStr) return;
        const [rY, rM, rD] = rDateStr.split('-').map(Number);
        if (rY === targetYear && rM === targetMonth && rD >= 1 && rD <= 31) {
          const targetRows = r.status === 'SCRAP' ? defectRows : repairRows;
          const foundRow = targetRows.find(row => row.partCode === r.partCode || row.partName === r.partName);
          if (foundRow) {
            foundRow.dailyCounts[rD] = (foundRow.dailyCounts[rD] || 0) + 1;
            foundRow.total = Object.values(foundRow.dailyCounts).reduce((a, b) => a + b, 0);
          }
        }
      });

      const monthNames = ['', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const grandTotalRepair = repairRows.reduce((sum, r) => sum + r.total, 0);
      const grandTotalDefect = defectRows.reduce((sum, r) => sum + r.total, 0);

      const generatedMatrix: MonthlyCalendarMatrix = {
        year: targetYear,
        month: targetMonth,
        monthLabelEn: `${monthNames[targetMonth] || 'MONTH'} ${targetYear}`,
        repairRows,
        defectRows,
        grandTotalRepair,
        grandTotalDefect
      };

      matrixMap[key] = generatedMatrix;
      safeStorage.setItem(STORAGE_KEYS.MATRICES, JSON.stringify(matrixMap));
      return generatedMatrix;
    } catch {
      return INITIAL_JANUARY_2026_MATRIX;
    }
  }

  public saveMonthlyMatrix(matrix: MonthlyCalendarMatrix): void {
    try {
      const raw = safeStorage.getItem(STORAGE_KEYS.MATRICES);
      const matrixMap: Record<string, MonthlyCalendarMatrix> = raw ? JSON.parse(raw) : {};
      const key = `${matrix.year}-${matrix.month}`;
      matrixMap[key] = matrix;
      safeStorage.setItem(STORAGE_KEYS.MATRICES, JSON.stringify(matrixMap));
      this.notify();
    } catch (e) {
      console.warn('Failed to save monthly matrix:', e);
    }
  }

  public updateMatrixCell(
    year: number,
    month: number,
    category: 'REPAIR' | 'DEFECT_SCRAP',
    partName: string,
    day: number,
    count: number
  ): void {
    const matrix = this.getMonthlyMatrix(year, month);
    const rows = category === 'REPAIR' ? matrix.repairRows : matrix.defectRows;
    let row = rows.find(r => r.partName.toLowerCase() === partName.toLowerCase());

    if (!row) {
      // Auto-create missing row dynamically from Part Masters or fallback name
      const master = this.findMasterByPartName(partName);
      row = {
        partName: master?.partName || partName,
        partCode: master?.partCode || 'TOOL-MTRX',
        picCategory: master?.picCategory || 'burring_7',
        category,
        dailyCounts: {},
        total: 0
      };
      rows.push(row);
    }

    if (count > 0) {
      row.dailyCounts[day] = count;
    } else {
      delete row.dailyCounts[day];
    }
    row.total = Object.values(row.dailyCounts).reduce((a, b) => a + b, 0);

    if (category === 'REPAIR') {
      matrix.grandTotalRepair = matrix.repairRows.reduce((sum, r) => sum + r.total, 0);
    } else {
      matrix.grandTotalDefect = matrix.defectRows.reduce((sum, r) => sum + r.total, 0);
    }

    this.saveMonthlyMatrix(matrix);
  }

  public incrementDailyMatrixCount(
    year: number,
    month: number,
    category: 'REPAIR' | 'DEFECT_SCRAP',
    partName: string,
    day: number,
    incrementBy: number = 1
  ): void {
    const matrix = this.getMonthlyMatrix(year, month);
    const rows = category === 'REPAIR' ? matrix.repairRows : matrix.defectRows;
    let row = rows.find(r => r.partName.toLowerCase() === partName.toLowerCase());

    const current = row ? (row.dailyCounts[day] || 0) : 0;
    this.updateMatrixCell(year, month, category, partName, day, current + incrementBy);
  }
}

export const regrindService = new RegrindService();
