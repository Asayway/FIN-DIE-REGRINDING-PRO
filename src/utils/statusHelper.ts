/**
 * Canonical Unified Status Helper for Fin Die Regrinding System
 * 
 * Standardizes the 6 core operational statuses across all views, modals, tables, and filters:
 * 1. EMERGENCY:   🚨 งานด่วน #1
 * 2. WAITING:     ⏳ รอคิวเจียร
 * 3. POSTPONED:   🟡 งานเลื่อน
 * 4. READY:       🔵 งานเจียรเสร็จแล้ว (รอตรวจ QC)
 * 5. COMPLETED:   🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)
 * 6. SCRAP:       ❌ ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร)
 */

export type CanonicalStatusKey =
  | 'EMERGENCY'
  | 'WAITING'
  | 'POSTPONED'
  | 'READY'
  | 'COMPLETED'
  | 'SCRAP';

export interface UnifiedStatusMeta {
  key: CanonicalStatusKey;
  label: string;
  shortLabel: string;
  badgeClass: string;
  pillClass: string;
  cardClass: string;
  leftBar: string;
  icon: string;
  subLabel?: string;
  allowQcApproval: boolean;
  isScrapped: boolean;
}

export const CANONICAL_STATUS_LIST: {
  key: CanonicalStatusKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  badgeClass: string;
}[] = [
  {
    key: 'EMERGENCY',
    label: '🚨 งานด่วน #1',
    shortLabel: 'งานด่วน #1',
    description: 'การเพิ่มคิวงานด่วนแทรกมาก่อนคิวปกติในวันนั้น',
    icon: '🚨',
    badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-md'
  },
  {
    key: 'WAITING',
    label: '⏳ รอคิวเจียร',
    shortLabel: 'รอคิวเจียร',
    description: 'งานที่รอคิวเจียรตามลำดับในวันนั้น',
    icon: '⏳',
    badgeClass: 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold'
  },
  {
    key: 'POSTPONED',
    label: '🟡 งานเลื่อน',
    shortLabel: 'งานเลื่อน',
    description: 'งานที่ยังไม่เสร็จหรือยังไม่กดยืนยัน เลื่อนบันทึกคงไว้เพื่อดูประวัติตกค้าง',
    icon: '🟡',
    badgeClass: 'bg-amber-500 text-slate-950 font-black shadow-sm'
  },
  {
    key: 'READY',
    label: '🔵 งานเจียรเสร็จแล้ว (รอตรวจ QC)',
    shortLabel: 'เจียรเสร็จแล้ว',
    description: 'พนักงานเจียรเสร็จแล้วและกดยืนยัน รอการตรวจรับ QC',
    icon: '🔵',
    badgeClass: 'bg-sky-500 text-white font-black shadow-sm'
  },
  {
    key: 'COMPLETED',
    label: '🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)',
    shortLabel: 'งานเสร็จสมบูรณ์',
    description: 'ผ่านการตรวจรับ QC เรียบร้อยและปิดงานสมบูรณ์',
    icon: '🟢',
    badgeClass: 'bg-emerald-500 text-slate-950 font-black shadow-sm'
  },
  {
    key: 'SCRAP',
    label: '❌ ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร)',
    shortLabel: 'ยกเลิก / คัดทิ้ง',
    description: 'ระยะเจียรต่ำกว่าสเปค Min หรือเกินรอบเจียร คัดทิ้งโดยไม่ต้องผ่านตรวจ QC',
    icon: '❌',
    badgeClass: 'bg-rose-950/90 text-rose-300 border border-rose-600 font-bold'
  }
];

/**
 * Resolves any work ticket or historical regrind record to one of the 6 canonical statuses.
 */
export function resolveUnifiedStatusKey(item: any): CanonicalStatusKey {
  if (!item) return 'WAITING';

  // 1. Scrap Check: Explicit scrap, cancelled, or dimension / cycle limit exceeded
  const rawStatus = String(item.status || '').toUpperCase();
  const isExplicitScrap =
    rawStatus === 'SCRAP' ||
    rawStatus === 'SCRAPPED' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'MAXIMUM REGRIND' ||
    item.isScrapped === true;

  const lengthAfter = Number(item.lengthAfterGrindMm ?? item.currentLength ?? 0);
  const minAllowed = Number(item.minAllowedLengthMm ?? item.scrapLimitMm ?? 0);
  const isDimensionUnderMin = lengthAfter > 0 && minAllowed > 0 && lengthAfter < minAllowed;

  const cycleAfter = Number(item.regrindCountAfter ?? item.regrindCycleCount ?? 0);
  const maxCycles = Number(item.maxRegrindAllowed ?? item.maxAllowedCycles ?? 0);
  const isCycleExceeded = cycleAfter > 0 && maxCycles > 0 && cycleAfter > maxCycles;

  if (isExplicitScrap || isDimensionUnderMin || isCycleExceeded) {
    return 'SCRAP';
  }

  // 2. Completed Check (QC Passed & Closed)
  if (rawStatus === 'COMPLETED' || rawStatus === 'CLOSED') {
    return 'COMPLETED';
  }

  // 3. Ready Check (Grinding Done by Tech, Awaiting QC)
  if (rawStatus === 'READY' || rawStatus === 'READY TO USE' || rawStatus === 'READY_FOR_QC') {
    return 'READY';
  }

  // 4. Emergency Check (Urgent Job #1)
  const isExplicitEmergency =
    Boolean(item.isEmergency) ||
    item.urgency === 'EMERGENCY' ||
    (typeof item.note === 'string' && (item.note.includes('ด่วน') || item.note.toLowerCase().includes('urgent'))) ||
    (typeof item.remarks === 'string' && item.remarks.includes('ด่วน'));

  if (isExplicitEmergency) {
    return 'EMERGENCY';
  }

  // 5. Postponed Check (Shifted past due date or explicit postpone)
  const todayStr = new Date().toISOString().slice(0, 10);
  const itemDate =
    item.scheduledDate ||
    item.regrindDate ||
    (item.targetCompletionDate ? item.targetCompletionDate.slice(0, 10) : '') ||
    (item.timestamp ? item.timestamp.slice(0, 10) : '');

  const isPastDueUnfinished =
    Boolean(itemDate) &&
    itemDate < todayStr &&
    rawStatus !== 'COMPLETED' &&
    rawStatus !== 'READY' &&
    rawStatus !== 'SCRAP';

  const isExplicitPostponed =
    rawStatus === 'POSTPONED' ||
    rawStatus === 'HOLD' ||
    (Number(item.shiftedCount || 0) > 0) ||
    (typeof item.note === 'string' && item.note.includes('เลื่อน')) ||
    (typeof item.remarks === 'string' && item.remarks.includes('เลื่อน'));

  if (isExplicitPostponed || isPastDueUnfinished) {
    return 'POSTPONED';
  }

  // 6. Default Waiting Queue
  return 'WAITING';
}

/**
 * Returns full metadata, CSS classes, icons, and workflow capability flags.
 */
export function getUnifiedStatusMeta(item: any): UnifiedStatusMeta {
  const key = resolveUnifiedStatusKey(item);
  const rawStatus = String(item?.status || '').toUpperCase();

  switch (key) {
    case 'EMERGENCY':
      return {
        key: 'EMERGENCY',
        label: '🚨 งานด่วน #1',
        shortLabel: 'งานด่วน #1',
        badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-md',
        cardClass: 'bg-rose-950/45 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/40 hover:border-rose-400',
        pillClass: 'bg-rose-950/90 border border-rose-500 text-rose-100 shadow-sm font-bold',
        leftBar: 'bg-rose-500',
        icon: '🚨',
        allowQcApproval: false, // QC can only inspect AFTER grinding is confirmed done (READY)
        isScrapped: false
      };

    case 'WAITING': {
      const isInProcess = rawStatus === 'IN_PROCESS';
      return {
        key: 'WAITING',
        label: isInProcess ? '⚙️ กำลังเจียร' : '⏳ รอคิวเจียร',
        shortLabel: isInProcess ? 'กำลังเจียร' : 'รอคิวเจียร',
        badgeClass: isInProcess
          ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-400'
          : 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold',
        cardClass: 'bg-slate-950/70 border-white/10 hover:border-cyan-400/40',
        pillClass: 'bg-slate-900 border border-cyan-500/40 text-cyan-200 font-bold',
        leftBar: 'bg-cyan-500',
        icon: isInProcess ? '⚙️' : '⏳',
        subLabel: isInProcess ? 'กำลังดำเนินการ' : 'รอเริ่มงาน',
        allowQcApproval: false,
        isScrapped: false
      };
    }

    case 'POSTPONED':
      return {
        key: 'POSTPONED',
        label: '🟡 งานเลื่อน',
        shortLabel: 'งานเลื่อน',
        badgeClass: 'bg-amber-500 text-slate-950 font-black shadow-sm',
        cardClass: 'bg-amber-950/35 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400',
        pillClass: 'bg-amber-950/90 border border-amber-400 text-amber-200 font-bold',
        leftBar: 'bg-amber-400',
        icon: '🟡',
        subLabel: 'เลื่อนกำหนดการ / งานตกค้าง',
        allowQcApproval: false,
        isScrapped: false
      };

    case 'READY':
      return {
        key: 'READY',
        label: '🔵 งานเจียรเสร็จแล้ว (รอตรวจ QC)',
        shortLabel: 'เจียรเสร็จแล้ว',
        badgeClass: 'bg-sky-500 text-white font-black shadow-sm',
        cardClass: 'bg-sky-950/35 border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.15)] hover:border-sky-300',
        pillClass: 'bg-sky-950/90 border border-sky-400 text-sky-100 font-bold',
        leftBar: 'bg-sky-400',
        icon: '🔵',
        subLabel: 'ช่างเจียรเสร็จแล้ว • รอตรวจ QC',
        allowQcApproval: true, // Only READY status allows QC confirmation
        isScrapped: false
      };

    case 'COMPLETED':
      return {
        key: 'COMPLETED',
        label: '🟢 งานเสร็จสมบูรณ์ (QC ผ่าน)',
        shortLabel: 'งานเสร็จสมบูรณ์',
        badgeClass: 'bg-emerald-500 text-slate-950 font-black shadow-sm',
        cardClass: 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-400',
        pillClass: 'bg-emerald-950/90 border border-emerald-500 text-emerald-100 font-bold',
        leftBar: 'bg-emerald-400',
        icon: '🟢',
        subLabel: 'QC ผ่านการตรวจรับ • ปิดงานสมบูรณ์',
        allowQcApproval: false,
        isScrapped: false
      };

    case 'SCRAP':
      return {
        key: 'SCRAP',
        label: '❌ ยกเลิก / คัดทิ้ง (ครบลิมิตเจียร)',
        shortLabel: 'ยกเลิก / คัดทิ้ง',
        badgeClass: 'bg-rose-950/90 text-rose-300 border border-rose-600 font-bold',
        cardClass: 'bg-slate-950/90 border-rose-900/60 opacity-80 hover:opacity-100',
        pillClass: 'bg-slate-950 border border-rose-600 text-rose-300 line-through font-bold',
        leftBar: 'bg-rose-700',
        icon: '❌',
        subLabel: 'ต่ำกว่า Min Spec หรือ เกินรอบเจียร (ไม่ผ่าน QC)',
        allowQcApproval: false, // SCRAP completely bypasses QC confirmation
        isScrapped: true
      };
  }
}
