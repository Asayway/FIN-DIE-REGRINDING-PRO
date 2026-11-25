import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Wrench,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Tv,
  RefreshCw,
  FileSpreadsheet,
  FileDown,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  X,
  ArrowUpRight,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList
} from 'recharts';
import {
  ProductionLineId,
  RegrindingRecord,
  PartMaster,
  PartRepairStockItem
} from '../../types';
import { RegrindWorkTicket } from '../../types/regrind';
import {
  RegrindingTransactionItem,
  CostDashboardFilter,
  CostSummaryMetrics,
  CostPeriodFilter
} from '../../types/costSaving';
import { regrindService } from '../../services/regrindService';
import { storageService } from '../../services/storageService';
import { resolveUnifiedStatusKey, CanonicalStatusKey } from '../../utils/statusHelper';
import { exportManagementReportPDF } from '../../utils/managementReportPdf';
import { useLanguage } from '../../i18n';

interface CostDashboardTabProps {
  transactions?: RegrindingTransactionItem[];
  metrics?: CostSummaryMetrics;
  filters: CostDashboardFilter;
  onFilterChange: (newFilters: CostDashboardFilter) => void;
  onNavigateToTab: (route: string, lineId?: ProductionLineId, statusFilter?: string) => void;
}

const PRODUCTION_LINES: ProductionLineId[] = ['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DEFECT_REASON_LABELS_TH: Record<string, string> = {
  NORMAL_WEAR: 'สึกหรอปกติ (Normal Wear)',
  BURR_EXCESSIVE: 'ครีบสูงเกิน (Burr Excessive)',
  CHIPPED: 'คมบิ่น / กะเทาะ (Chipped)',
  GALLING_SCRATCHED: 'ผิวเป็นรอย / เศษติด (Galling)',
  OUT_OF_TOLERANCE: 'หลุดสเปค Min (Out of Spec)',
  BROKEN: 'แตกหักชำรุด (Broken)'
};

const DEFECT_REASON_LABELS_EN: Record<string, string> = {
  NORMAL_WEAR: 'Normal Wear',
  BURR_EXCESSIVE: 'Excessive Burr',
  CHIPPED: 'Chipped Edge',
  GALLING_SCRATCHED: 'Galling / Scratched',
  OUT_OF_TOLERANCE: 'Out of Spec (Below Min)',
  BROKEN: 'Broken / Cracked'
};

function formatReasonLabel(raw?: string, isEn?: boolean): string {
  const key = (raw || 'NORMAL_WEAR').trim();
  const map = isEn ? DEFECT_REASON_LABELS_EN : DEFECT_REASON_LABELS_TH;
  if (map[key]) return map[key];
  return key.replace(/_/g, ' ');
}

function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getRecordDateStr(rec: RegrindingRecord): string {
  const raw = rec.regrindDate || rec.completedDate || rec.timestamp || '';
  return raw.length >= 10 ? raw.slice(0, 10) : '';
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday per ISO 8601
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const diffWeeks = Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return 1 + diffWeeks;
}

function getWeekBounds(anchorDateStr: string): { start: string; end: string; isoWeek: number } {
  const base = anchorDateStr ? new Date(`${anchorDateStr}T00:00:00`) : new Date();
  if (isNaN(base.getTime())) {
    const now = new Date();
    const fallback = toLocalIsoDate(now);
    return { start: fallback, end: fallback, isoWeek: getIsoWeekNumber(now) };
  }
  const day = base.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(base);
  mon.setDate(base.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toLocalIsoDate(mon), end: toLocalIsoDate(sun), isoWeek: getIsoWeekNumber(mon) };
}

function getMonthIsoWeeks(anchorDateStr: string): Array<{ label: string; start: string; end: string }> {
  const base = anchorDateStr ? new Date(`${anchorDateStr}T00:00:00`) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;
  const monthStart = new Date(validBase.getFullYear(), validBase.getMonth(), 1);
  const monthEnd = new Date(validBase.getFullYear(), validBase.getMonth() + 1, 0);

  const startDay = monthStart.getDay();
  const diffToMon = startDay === 0 ? -6 : 1 - startDay;
  const curMon = new Date(monthStart);
  curMon.setDate(monthStart.getDate() + diffToMon);

  const weeks: Array<{ label: string; start: string; end: string }> = [];
  while (curMon <= monthEnd) {
    const curSun = new Date(curMon);
    curSun.setDate(curMon.getDate() + 6);
    const weekNo = getIsoWeekNumber(curMon);
    weeks.push({
      label: `W${String(weekNo).padStart(2, '0')}`,
      start: toLocalIsoDate(curMon),
      end: toLocalIsoDate(curSun)
    });
    curMon.setDate(curMon.getDate() + 7);
  }
  return weeks;
}

function getRecordShiftHourOffset(rec: RegrindingRecord, targetDateStr: string): number {
  const rawTime = rec.completedDate || rec.inspectionApprovedAt || rec.timestamp || '';
  if (/[\sT]\d{2}:\d{2}/.test(rawTime)) {
    const normalized = rawTime.includes(' ') && !rawTime.includes('T') ? rawTime.replace(' ', 'T') : rawTime;
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      const localDate = toLocalIsoDate(parsed);
      const baseDate = new Date(`${targetDateStr}T00:00:00`);
      baseDate.setDate(baseDate.getDate() + 1);
      const nextDateStr = toLocalIsoDate(baseDate);
      const hr = parsed.getHours();

      if (localDate === targetDateStr) {
        return hr >= 8 ? hr - 8 : hr + 16;
      }
      if (localDate === nextDateStr && hr < 8) {
        return hr + 16;
      }
    }
  }
  // Date-only logs without time default to 08:00 shift start
  return 0;
}

function extractRecordFinancials(rec: RegrindingRecord, partMaster?: PartMaster) {
  const qty = Math.max(1, Number(rec.quantity) || 1);
  const laborMinutes =
    rec.laborTimeMinutes !== undefined
      ? Number(rec.laborTimeMinutes)
      : Math.round((rec.laborHours !== undefined ? Number(rec.laborHours) : 1) * 60);
  const laborCost =
    rec.laborCostThb !== undefined
      ? Number(rec.laborCostThb)
      : Math.round((laborMinutes / 60) * 180);
  const spareCost = rec.sparePartsCost !== undefined ? Number(rec.sparePartsCost) : 0;
  const repairCost =
    rec.totalTrueCost !== undefined && Number(rec.totalTrueCost) > 0
      ? Number(rec.totalTrueCost)
      : laborCost + spareCost;

  const fallbackUnitPrice = partMaster?.unitCostThb || partMaster?.purchasePriceThb || 12500;
  const newPrice =
    rec.newPartPriceTotal !== undefined && Number(rec.newPartPriceTotal) > 0
      ? Number(rec.newPartPriceTotal)
      : rec.newPartPriceThb !== undefined && Number(rec.newPartPriceThb) > 0
      ? Number(rec.newPartPriceThb)
      : fallbackUnitPrice;

  const explicitSaving = rec.netSavingTHB ?? rec.netSavingThb;
  const netSaving =
    explicitSaving !== undefined
      ? Math.max(0, Number(explicitSaving))
      : Math.max(0, newPrice - repairCost);

  return {
    qty,
    laborMinutes,
    repairCost,
    newPrice,
    netSaving
  };
}

export const CostDashboardTab: React.FC<CostDashboardTabProps> = ({
  filters,
  onFilterChange,
  onNavigateToTab
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const monthNamesShort = isEn ? EN_MONTHS_SHORT : THAI_MONTHS_SHORT;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvAutoRefresh, setTvAutoRefresh] = useState<boolean>(true);
  const [tvCountdown, setTvCountdown] = useState<number>(30);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [topListScope, setTopListScope] = useState<'PERIOD' | 'ALL_TIME'>('PERIOD');
  const [topDisplayLimit, setTopDisplayLimit] = useState<5 | 10>(5);
  const [chartViewMode, setChartViewMode] = useState<'SPLIT' | 'TREND' | 'CUMULATIVE'>('SPLIT');
  const [showChartDataLabels, setShowChartDataLabels] = useState<boolean>(false);

  const formatCompactThbLabel = (val: number): string => {
    const sign = val < 0 ? '-' : '';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (abs >= 100_000) return `${sign}฿${Math.round(abs / 1_000)}k`;
    if (abs >= 1_000) return `${sign}฿${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    return `${sign}฿${Math.round(abs)}`;
  };

  // Live reactive data subscriptions across the entire application
  const [allTickets, setAllTickets] = useState<RegrindWorkTicket[]>(() => regrindService.getQueueTickets());
  const [regrindRecords, setRegrindRecords] = useState<RegrindingRecord[]>(() => storageService.getRegrindRecords());
  const [partMasters, setPartMasters] = useState<PartMaster[]>(() => storageService.getPartMasters());
  const [storedRepairStocks, setStoredRepairStocks] = useState<Record<string, PartRepairStockItem>>(() =>
    storageService.getPartRepairStocks()
  );
  const [lineConfigs, setLineConfigs] = useState(() => storageService.getLineConfigs());

  const refreshLiveData = () => {
    setAllTickets(regrindService.getQueueTickets());
    setRegrindRecords(storageService.getRegrindRecords());
    setPartMasters(storageService.getPartMasters());
    setStoredRepairStocks(storageService.getPartRepairStocks());
    setLineConfigs(storageService.getLineConfigs());
    setLastRefreshTime(
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  useEffect(() => {
    refreshLiveData();
    const unsub1 = regrindService.subscribe(refreshLiveData);
    const unsub2 = storageService.subscribe(refreshLiveData);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    if (!isTvMode || !tvAutoRefresh) return;
    const timer = setInterval(() => {
      setTvCountdown(prev => {
        if (prev <= 1) {
          refreshLiveData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTvMode, tvAutoRefresh]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Ignore fullscreen denial in restricted iframes
    }
  };

  // Lookup maps
  const partMasterMap = useMemo(() => {
    const map = new Map<string, PartMaster>();
    partMasters.forEach(pm => {
      if (pm.partCode) map.set(pm.partCode, pm);
      if (pm.partName) map.set(pm.partName.trim().toUpperCase(), pm);
    });
    return map;
  }, [partMasters]);

  const activeSelectedDate = useMemo(() => {
    return filters.selectedDate || new Date().toISOString().slice(0, 10);
  }, [filters.selectedDate]);

  const weekBounds = useMemo(() => getWeekBounds(activeSelectedDate), [activeSelectedDate]);

  const latestRecordDate = useMemo(() => {
    let latest = '';
    regrindRecords.forEach(r => {
      const d = getRecordDateStr(r);
      if (d && d > latest) latest = d;
    });
    return latest;
  }, [regrindRecords]);

  // -------------------------------------------------------------
  // 1. REAL-TIME STATUS COUNTS ACROSS ENTIRE QUEUE & APP
  // -------------------------------------------------------------
  const lineFilteredTickets = useMemo(() => {
    if (filters.lineId === 'ALL') return allTickets;
    return allTickets.filter(t => t.lineId === filters.lineId);
  }, [allTickets, filters.lineId]);

  const realtimeQueueSummary = useMemo(() => {
    const counts: Record<CanonicalStatusKey, { jobs: number; pieces: number }> = {
      EMERGENCY: { jobs: 0, pieces: 0 },
      IN_PROCESS: { jobs: 0, pieces: 0 },
      WAITING: { jobs: 0, pieces: 0 },
      POSTPONED: { jobs: 0, pieces: 0 },
      READY: { jobs: 0, pieces: 0 },
      COMPLETED: { jobs: 0, pieces: 0 },
      SCRAP: { jobs: 0, pieces: 0 }
    };

    lineFilteredTickets.forEach(ticket => {
      const key = resolveUnifiedStatusKey(ticket);
      const qty = Math.max(1, Number(ticket.quantity) || 1);
      counts[key].jobs += 1;
      counts[key].pieces += qty;
    });

    const totalJobs = lineFilteredTickets.length;
    const totalActivePieces =
      counts.EMERGENCY.pieces +
      counts.IN_PROCESS.pieces +
      counts.WAITING.pieces +
      counts.POSTPONED.pieces +
      counts.READY.pieces;

    return { counts, totalJobs, totalActivePieces };
  }, [lineFilteredTickets]);

  // -------------------------------------------------------------
  // 2. STOCK PART REPAIR LIVE POOL (MATCHES STOCK MATRIX 1:1)
  // -------------------------------------------------------------
  const stockPoolSummary = useMemo(() => {
    const ticketsByPart: Record<string, { inProcess: number; pending: number }> = {};
    allTickets.forEach(ticket => {
      const nameKey = (ticket.partName || '').trim().toUpperCase();
      const codeKey = (ticket.partCode || '').trim().toUpperCase();
      const qty = Math.max(1, Number(ticket.quantity) || 1);
      [nameKey, codeKey].filter(Boolean).forEach(k => {
        if (!ticketsByPart[k]) ticketsByPart[k] = { inProcess: 0, pending: 0 };
        if (ticket.status === 'IN_PROCESS') ticketsByPart[k].inProcess += qty;
        else if (ticket.status === 'PENDING') ticketsByPart[k].pending += qty;
      });
    });

    let readyToUseTotal = 0;
    let inProcessTotal = 0;
    let awaitingTotal = 0;
    let lowStockCount = 0;

    partMasters.forEach(pm => {
      const pCode = pm.partCode;
      const cleanCode = pCode.trim().toUpperCase();
      const cleanName = pm.partName.trim().toUpperCase();
      const stored = storedRepairStocks[pCode] || storedRepairStocks[cleanCode];
      const liveQueue = ticketsByPart[cleanCode] || ticketsByPart[cleanName] || { inProcess: 0, pending: 0 };

      let installedTotal = 0;
      lineConfigs.forEach(lc => {
        installedTotal += lc.installedPartQuantities?.[pCode] || 0;
      });

      const defaultSafetyTarget = installedTotal > 0 ? Math.max(10, Math.round(installedTotal * 0.15)) : 10;
      const readyQty = stored?.readyToUseQty ?? 0;
      const inProcQty = liveQueue.inProcess;
      const awaitQty = stored ? stored.awaitingRepairQty ?? liveQueue.pending : liveQueue.pending;
      const safetyTarget = stored ? stored.safetyStockTarget ?? defaultSafetyTarget : defaultSafetyTarget;

      readyToUseTotal += readyQty;
      inProcessTotal += inProcQty;
      awaitingTotal += awaitQty;
      if (readyQty < safetyTarget) lowStockCount += 1;
    });

    return {
      readyToUseTotal,
      inProcessTotal,
      awaitingTotal,
      lowStockCount
    };
  }, [partMasters, storedRepairStocks, allTickets, lineConfigs]);

  // -------------------------------------------------------------
  // 3. FILTERED REPAIR HISTORY RECORDS (BY PERIOD & LINE)
  // -------------------------------------------------------------
  const lineFilteredRecords = useMemo(() => {
    if (filters.lineId === 'ALL') return regrindRecords;
    return regrindRecords.filter(r => (r.lineId || r.lineLastUsed) === filters.lineId);
  }, [regrindRecords, filters.lineId]);

  const periodFilteredRecords = useMemo(() => {
    return lineFilteredRecords.filter(rec => {
      const dateStr = getRecordDateStr(rec);
      if (filters.periodType === 'ALL') return true;
      if (!dateStr) return false;

      if (filters.periodType === 'DAILY') return dateStr === activeSelectedDate;
      if (filters.periodType === 'WEEKLY') return dateStr >= weekBounds.start && dateStr <= weekBounds.end;
      if (filters.periodType === 'MONTHLY') {
        return Number(dateStr.slice(0, 4)) === filters.year && Number(dateStr.slice(5, 7)) === (filters.month || 1);
      }
      if (filters.periodType === 'YEARLY') return Number(dateStr.slice(0, 4)) === filters.year;
      if (filters.periodType === 'QUARTERLY') {
        const yr = Number(dateStr.slice(0, 4));
        const mo = Number(dateStr.slice(5, 7));
        const q = Math.floor((mo - 1) / 3) + 1;
        return yr === filters.year && q === (filters.quarter || 1);
      }
      return true;
    });
  }, [lineFilteredRecords, filters.periodType, filters.year, filters.month, filters.quarter, activeSelectedDate, weekBounds]);

  // -------------------------------------------------------------
  // 4. FINANCIAL SAVING KPI AGGREGATES (100% FROM MASTER LOGS)
  // -------------------------------------------------------------
  const savingSummary = useMemo(() => {
    let validJobs = 0;
    let validPieces = 0;
    let totalNewPurchaseAvoided = 0;
    let totalRepairCost = 0;
    let totalNetSaving = 0;

    let realizedNewPurchase = 0;
    let realizedNetSaving = 0;

    let scrapJobs = 0;
    let scrapPieces = 0;
    let scrapNewValueLoss = 0;

    periodFilteredRecords.forEach(rec => {
      const pm = partMasterMap.get(rec.partCode) || partMasterMap.get((rec.partName || '').trim().toUpperCase());
      const fin = extractRecordFinancials(rec, pm);
      const statusKey = resolveUnifiedStatusKey(rec);

      if (statusKey === 'SCRAP') {
        scrapJobs += 1;
        scrapPieces += fin.qty;
        scrapNewValueLoss += fin.newPrice;
      } else {
        validJobs += 1;
        validPieces += fin.qty;
        totalNewPurchaseAvoided += fin.newPrice;
        totalRepairCost += fin.repairCost;
        totalNetSaving += fin.netSaving;

        if (statusKey === 'COMPLETED' || statusKey === 'READY') {
          realizedNewPurchase += fin.newPrice;
          realizedNetSaving += fin.netSaving;
        }
      }
    });

    const totalLogs = periodFilteredRecords.length;
    const savingPct = totalNewPurchaseAvoided > 0 ? (totalNetSaving / totalNewPurchaseAvoided) * 100 : 0;
    const repairCostPct = totalNewPurchaseAvoided > 0 ? (totalRepairCost / totalNewPurchaseAvoided) * 100 : 0;
    const scrapRatePct = totalLogs > 0 ? (scrapJobs / totalLogs) * 100 : 0;

    return {
      totalLogs,
      validJobs,
      validPieces,
      totalNewPurchaseAvoided,
      totalRepairCost,
      totalNetSaving,
      savingPct,
      repairCostPct,
      realizedNetSaving,
      scrapJobs,
      scrapPieces,
      scrapNewValueLoss,
      scrapRatePct
    };
  }, [periodFilteredRecords, partMasterMap]);

  // -------------------------------------------------------------
  // 5. FULL-WIDTH ADAPTIVE TREND CHART SERIES
  // -------------------------------------------------------------
  const { trendChartData, dailyHasNightShift } = useMemo(() => {
    const buildPoint = (label: string, records: RegrindingRecord[], tooltipLabel?: string) => {
      let avoided = 0;
      let repair = 0;
      let saving = 0;
      let count = 0;

      records.forEach(rec => {
        if (resolveUnifiedStatusKey(rec) === 'SCRAP') return;
        const pm = partMasterMap.get(rec.partCode) || partMasterMap.get((rec.partName || '').trim().toUpperCase());
        const fin = extractRecordFinancials(rec, pm);
        avoided += fin.newPrice;
        repair += fin.repairCost;
        saving += fin.netSaving;
        count += 1;
      });

      const savingPct = avoided > 0 ? Number(((saving / avoided) * 100).toFixed(1)) : 0;
      return {
        label,
        tooltipLabel: tooltipLabel || label,
        avoided: Math.round(avoided),
        repair: Math.round(repair),
        saving: Math.round(saving),
        savingPct,
        count
      };
    };

    let rawPoints: ReturnType<typeof buildPoint>[] = [];
    let hasNightShift = false;

    if (filters.periodType === 'DAILY') {
      const hourBuckets = new Map<number, RegrindingRecord[]>();
      periodFilteredRecords.forEach(rec => {
        const offset = getRecordShiftHourOffset(rec, activeSelectedDate);
        if (offset > 12) hasNightShift = true;
        const list = hourBuckets.get(offset) || [];
        list.push(rec);
        hourBuckets.set(offset, list);
      });

      const maxOffset = hasNightShift ? 23 : 12; // 08:00-20:00 by default, 08:00-07:00 (24h) if night shift exists
      const points: ReturnType<typeof buildPoint>[] = [];
      for (let offset = 0; offset <= maxOffset; offset++) {
        const hour24 = (8 + offset) % 24;
        const label = `${String(hour24).padStart(2, '0')}:00`;
        const tooltipLabel =
          offset >= 16
            ? `${label} (${isEn ? 'Night Shift +1d' : 'กะดึก +1 วัน'})`
            : label;
        points.push(buildPoint(label, hourBuckets.get(offset) || [], tooltipLabel));
      }
      rawPoints = points;
    } else if (filters.periodType === 'WEEKLY') {
      const monthWeeks = getMonthIsoWeeks(activeSelectedDate);
      rawPoints = monthWeeks.map(wk => {
        const recs = lineFilteredRecords.filter(r => {
          const d = getRecordDateStr(r);
          return d >= wk.start && d <= wk.end;
        });
        return buildPoint(wk.label, recs, `${wk.label} (${wk.start.slice(5)} – ${wk.end.slice(5)})`);
      });
    } else if (filters.periodType === 'MONTHLY') {
      const yr = filters.year;
      const mo = filters.month || 11;
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const points: ReturnType<typeof buildPoint>[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const recs = periodFilteredRecords.filter(r => getRecordDateStr(r) === iso);
        points.push(buildPoint(String(day), recs));
      }
      rawPoints = points;
    } else if (filters.periodType === 'YEARLY') {
      rawPoints = monthNamesShort.map((mLabel, mIdx) => {
        const monthPrefix = `${filters.year}-${String(mIdx + 1).padStart(2, '0')}`;
        const recs = periodFilteredRecords.filter(r => getRecordDateStr(r).startsWith(monthPrefix));
        return buildPoint(mLabel, recs);
      });
    } else {
      const bucketMap = new Map<string, RegrindingRecord[]>();
      periodFilteredRecords.forEach(r => {
        const ym = getRecordDateStr(r).slice(0, 7);
        if (!ym) return;
        const list = bucketMap.get(ym) || [];
        list.push(r);
        bucketMap.set(ym, list);
      });
      rawPoints = Array.from(bucketMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, recs]) => {
          const [y, m] = ym.split('-');
          const label = `${monthNamesShort[Math.max(0, Number(m) - 1)]} ${y.slice(2)}`;
          return buildPoint(label, recs);
        });
    }

    let runningSaving = 0;
    let runningRepair = 0;
    let runningAvoided = 0;
    const series = rawPoints.map(pt => {
      runningSaving += pt.saving;
      runningRepair += pt.repair;
      runningAvoided += pt.avoided;
      return {
        ...pt,
        cumulativeSaving: runningSaving,
        cumulativeRepair: runningRepair,
        cumulativeAvoided: runningAvoided
      };
    });

    return {
      trendChartData: series,
      dailyHasNightShift: hasNightShift
    };
  }, [filters.periodType, filters.year, filters.month, activeSelectedDate, lineFilteredRecords, periodFilteredRecords, partMasterMap, isEn, monthNamesShort]);

  // Compact Line Chips for quick click-filter inside the Full-Width Chart header
  const lineQuickChips = useMemo(() => {
    const map = new Map<ProductionLineId, { jobs: number; saving: number; newPrice: number }>();
    PRODUCTION_LINES.forEach(l => map.set(l, { jobs: 0, saving: 0, newPrice: 0 }));

    regrindRecords.forEach(rec => {
      const dateStr = getRecordDateStr(rec);
      if (filters.periodType === 'DAILY' && dateStr !== activeSelectedDate) return;
      if (filters.periodType === 'WEEKLY' && (dateStr < weekBounds.start || dateStr > weekBounds.end)) return;
      if (
        filters.periodType === 'MONTHLY' &&
        (Number(dateStr.slice(0, 4)) !== filters.year || Number(dateStr.slice(5, 7)) !== (filters.month || 1))
      ) {
        return;
      }
      if (filters.periodType === 'YEARLY' && Number(dateStr.slice(0, 4)) !== filters.year) return;

      if (resolveUnifiedStatusKey(rec) === 'SCRAP') return;
      const line = (rec.lineId || rec.lineLastUsed || 'E1') as ProductionLineId;
      const entry = map.get(line);
      if (!entry) return;
      const pm = partMasterMap.get(rec.partCode) || partMasterMap.get((rec.partName || '').trim().toUpperCase());
      const fin = extractRecordFinancials(rec, pm);
      entry.jobs += 1;
      entry.saving += fin.netSaving;
      entry.newPrice += fin.newPrice;
    });

    return Array.from(map.entries()).map(([lineId, val]) => ({
      lineId,
      jobs: val.jobs,
      saving: val.saving,
      savingPct: val.newPrice > 0 ? (val.saving / val.newPrice) * 100 : 0
    }));
  }, [regrindRecords, filters.periodType, filters.year, filters.month, activeSelectedDate, weekBounds, partMasterMap]);

  // -------------------------------------------------------------
  // 6. TOP 10 ANALYTICS (COMPUTED TOP 10, DEFAULT COLLAPSED TO TOP 5)
  // -------------------------------------------------------------
  const topAnalyticsSourceRecords = useMemo(() => {
    return topListScope === 'PERIOD' ? periodFilteredRecords : lineFilteredRecords;
  }, [topListScope, periodFilteredRecords, lineFilteredRecords]);

  // Top 10 Repaired Parts
  const top10RepairedParts = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        partCode: string;
        partName: string;
        jobs: number;
        pieces: number;
        totalSaving: number;
        lines: Set<string>;
      }
    >();

    topAnalyticsSourceRecords.forEach(rec => {
      if (resolveUnifiedStatusKey(rec) === 'SCRAP') return;
      const partName = (rec.partName || rec.partCode || 'Unknown Part').trim();
      const partCode = (rec.partCode || '').trim();
      const mapKey = partName.toUpperCase();
      const pm = partMasterMap.get(partCode) || partMasterMap.get(mapKey);
      const fin = extractRecordFinancials(rec, pm);

      const cur = map.get(mapKey) || {
        key: mapKey,
        partCode,
        partName,
        jobs: 0,
        pieces: 0,
        totalSaving: 0,
        lines: new Set<string>()
      };
      cur.jobs += 1;
      cur.pieces += fin.qty;
      cur.totalSaving += fin.netSaving;
      if (rec.lineId || rec.lineLastUsed) cur.lines.add(rec.lineId || rec.lineLastUsed);
      map.set(mapKey, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.jobs - a.jobs || b.pieces - a.pieces || b.totalSaving - a.totalSaving)
      .slice(0, 10)
      .map(item => ({ ...item, lineList: Array.from(item.lines).join(', ') }));
  }, [topAnalyticsSourceRecords, partMasterMap]);

  // Top 10 Scrapped Parts
  const top10ScrappedParts = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        partCode: string;
        partName: string;
        scrapJobs: number;
        scrapPieces: number;
        lostValueThb: number;
        reasons: Map<string, number>;
      }
    >();

    topAnalyticsSourceRecords.forEach(rec => {
      if (resolveUnifiedStatusKey(rec) !== 'SCRAP') return;
      const partName = (rec.partName || rec.partCode || 'Unknown Part').trim();
      const partCode = (rec.partCode || '').trim();
      const mapKey = partName.toUpperCase();
      const pm = partMasterMap.get(partCode) || partMasterMap.get(mapKey);
      const fin = extractRecordFinancials(rec, pm);
      const reason = formatReasonLabel(rec.defectReason, isEn);

      const cur = map.get(mapKey) || {
        key: mapKey,
        partCode,
        partName,
        scrapJobs: 0,
        scrapPieces: 0,
        lostValueThb: 0,
        reasons: new Map<string, number>()
      };
      cur.scrapJobs += 1;
      cur.scrapPieces += fin.qty;
      cur.lostValueThb += fin.newPrice;
      cur.reasons.set(reason, (cur.reasons.get(reason) || 0) + 1);
      map.set(mapKey, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.scrapJobs - a.scrapJobs || b.scrapPieces - a.scrapPieces || b.lostValueThb - a.lostValueThb)
      .slice(0, 10)
      .map(item => {
        const topReason = Array.from(item.reasons.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        return { ...item, topReason };
      });
  }, [topAnalyticsSourceRecords, partMasterMap, isEn]);

  // Top 10 Repair & Defect Reasons
  const top10DefectReasons = useMemo(() => {
    const map = new Map<
      string,
      {
        reasonCode: string;
        label: string;
        count: number;
        pieces: number;
        scrapCount: number;
        repairCost: number;
      }
    >();

    const total = topAnalyticsSourceRecords.length;
    topAnalyticsSourceRecords.forEach(rec => {
      const code = (rec.defectReason || 'NORMAL_WEAR').trim();
      const pm = partMasterMap.get(rec.partCode) || partMasterMap.get((rec.partName || '').trim().toUpperCase());
      const fin = extractRecordFinancials(rec, pm);
      const isScrap = resolveUnifiedStatusKey(rec) === 'SCRAP';

      const cur = map.get(code) || {
        reasonCode: code,
        label: formatReasonLabel(code, isEn),
        count: 0,
        pieces: 0,
        scrapCount: 0,
        repairCost: 0
      };
      cur.count += 1;
      cur.pieces += fin.qty;
      if (isScrap) cur.scrapCount += 1;
      cur.repairCost += fin.repairCost;
      map.set(code, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.pieces - a.pieces)
      .slice(0, 10)
      .map(item => ({
        ...item,
        pct: total > 0 ? (item.count / total) * 100 : 0
      }));
  }, [topAnalyticsSourceRecords, partMasterMap, isEn]);

  // Visible slices based on compact Top 5 vs expanded Top 10 toggle
  const visibleRepairedParts = useMemo(
    () => top10RepairedParts.slice(0, topDisplayLimit),
    [top10RepairedParts, topDisplayLimit]
  );
  const visibleScrappedParts = useMemo(
    () => top10ScrappedParts.slice(0, topDisplayLimit),
    [top10ScrappedParts, topDisplayLimit]
  );
  const visibleDefectReasons = useMemo(
    () => top10DefectReasons.slice(0, topDisplayLimit),
    [top10DefectReasons, topDisplayLimit]
  );

  // -------------------------------------------------------------
  // ACTIONS: EXPORT CSV & PRINT PDF & FILTER HELPERS
  // -------------------------------------------------------------
  const handleSetPeriod = (periodType: CostPeriodFilter) => {
    onFilterChange({
      ...filters,
      periodType,
      selectedDate: filters.selectedDate || new Date().toISOString().slice(0, 10)
    });
  };

  const handleResetFilters = () => {
    const now = new Date();
    onFilterChange({
      periodType: 'MONTHLY',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      selectedDate: now.toISOString().slice(0, 10),
      lineId: 'ALL',
      partNo: 'ALL',
      partType: 'ALL',
      qualityStatus: 'ALL',
      dataTypeFilter: 'ALL'
    });
    refreshLiveData();
  };

  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push('FinDie Regrind Pro - Executive Dashboard Export');
    lines.push(`Period,${filters.periodType},Line,${filters.lineId},Generated,${new Date().toISOString()}`);
    lines.push('');
    lines.push('=== SUMMARY SAVING (FROM REPAIR LOGS) ===');
    lines.push(`Net Cost Saving (THB),${savingSummary.totalNetSaving.toFixed(2)}`);
    lines.push(`Saving Percentage (%),${savingSummary.savingPct.toFixed(2)}%`);
    lines.push(`New Part Equivalent Value (THB),${savingSummary.totalNewPurchaseAvoided.toFixed(2)}`);
    lines.push(`Total Repair Cost (THB),${savingSummary.totalRepairCost.toFixed(2)}`);
    lines.push(`Valid Repair Jobs,${savingSummary.validJobs}`);
    lines.push(`Scrapped Jobs,${savingSummary.scrapJobs}`);
    lines.push(`Scrap Value Loss (THB),${savingSummary.scrapNewValueLoss.toFixed(2)}`);
    lines.push('');
    lines.push('=== TOP 10 FREQUENTLY REPAIRED PARTS ===');
    lines.push('Rank,PartCode,PartName,RepairJobs,Pieces,TotalSavingTHB');
    top10RepairedParts.forEach((p, i) => {
      lines.push(`${i + 1},"${p.partCode}","${p.partName}",${p.jobs},${p.pieces},${p.totalSaving.toFixed(2)}`);
    });
    lines.push('');
    lines.push('=== TOP 10 FREQUENTLY SCRAPPED PARTS ===');
    lines.push('Rank,PartCode,PartName,ScrapJobs,ScrapPieces,LostValueTHB,TopReason');
    top10ScrappedParts.forEach((p, i) => {
      lines.push(`${i + 1},"${p.partCode}","${p.partName}",${p.scrapJobs},${p.scrapPieces},${p.lostValueThb.toFixed(2)},"${p.topReason}"`);
    });
    lines.push('');
    lines.push('=== TOP 10 DEFECT REASONS ===');
    lines.push('Rank,ReasonCode,Label,Count,Percent');
    top10DefectReasons.forEach((r, i) => {
      lines.push(`${i + 1},"${r.reasonCode}","${r.label}",${r.count},${r.pct.toFixed(1)}%`);
    });

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FinDie_Dashboard_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      isEn
        ? 'Exported Cost Saving & Top 10 Summary (CSV) successfully.'
        : 'ส่งออกรายงานสรุปผลประหยัดและ Top 10 (CSV) เรียบร้อยแล้ว'
    );
    setTimeout(() => setExportNotice(null), 3500);
  };

  const periodScopeDescription = useMemo(() => {
    if (filters.periodType === 'DAILY') {
      return isEn ? `Daily (${activeSelectedDate})` : `รายวัน (${activeSelectedDate})`;
    }
    if (filters.periodType === 'WEEKLY') {
      const wkTag = `W${String(weekBounds.isoWeek).padStart(2, '0')}`;
      return isEn
        ? `Weekly (${wkTag} · ${weekBounds.start} to ${weekBounds.end})`
        : `รายสัปดาห์ (${wkTag} · ${weekBounds.start} ถึง ${weekBounds.end})`;
    }
    if (filters.periodType === 'MONTHLY') {
      const mName = monthNamesShort[Math.max(0, (filters.month || 1) - 1)];
      return isEn ? `Monthly (${mName} ${filters.year})` : `รายเดือน (${mName} ${filters.year})`;
    }
    if (filters.periodType === 'YEARLY') {
      return isEn ? `Yearly (${filters.year})` : `รายปี (${filters.year})`;
    }
    return isEn ? 'All Time' : 'สะสมทั้งหมด (All Time)';
  }, [filters.periodType, filters.year, filters.month, activeSelectedDate, weekBounds, isEn, monthNamesShort]);

  const cumulativeEndSaving = useMemo(() => {
    return trendChartData.length > 0 ? trendChartData[trendChartData.length - 1].cumulativeSaving : 0;
  }, [trendChartData]);

  const handleExportReportPDF = () => {
    try {
      const filename = exportManagementReportPDF({
        lang: isEn ? 'EN' : 'TH',
        kpi: {
          periodLabel: periodScopeDescription,
          lineLabel:
            filters.lineId === 'ALL'
              ? isEn
                ? 'All Lines (E1–E5)'
                : 'ทุกลายน์ (E1–E5)'
              : `LINE ${filters.lineId}`,
          generatedAt: new Date().toLocaleString(isEn ? 'en-GB' : 'th-TH'),
          totalNetSaving: savingSummary.totalNetSaving,
          savingPct: savingSummary.savingPct,
          realizedNetSaving: savingSummary.realizedNetSaving,
          totalNewPurchaseAvoided: savingSummary.totalNewPurchaseAvoided,
          totalRepairCost: savingSummary.totalRepairCost,
          repairCostPct: savingSummary.repairCostPct,
          validJobs: savingSummary.validJobs,
          validPieces: savingSummary.validPieces,
          totalLogs: savingSummary.totalLogs,
          scrapJobs: savingSummary.scrapJobs,
          scrapPieces: savingSummary.scrapPieces,
          scrapRatePct: savingSummary.scrapRatePct,
          scrapNewValueLoss: savingSummary.scrapNewValueLoss
        },
        status: {
          queueTotalJobs: realtimeQueueSummary.totalJobs,
          queueCounts: statusTiles.map(tile => ({
            label: tile.label,
            jobs: realtimeQueueSummary.counts[tile.key].jobs,
            pieces: realtimeQueueSummary.counts[tile.key].pieces
          })),
          stockReady: stockPoolSummary.readyToUseTotal,
          stockInProcess: stockPoolSummary.inProcessTotal,
          stockAwaiting: stockPoolSummary.awaitingTotal,
          stockLowCount: stockPoolSummary.lowStockCount
        },
        trend: trendChartData.map(pt => ({
          label: pt.label,
          saving: pt.saving,
          cumulativeSaving: pt.cumulativeSaving,
          repair: pt.repair
        })),
        lines: lineQuickChips,
        topRepaired: top10RepairedParts,
        topScrapped: top10ScrappedParts,
        topReasons: top10DefectReasons
      });
      setExportNotice(
        isEn
          ? `Exported Management PDF Report (${filename}) successfully.`
          : `ส่งออกรายงานผู้บริหาร (${filename}) เรียบร้อยแล้ว`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice(
        isEn
          ? 'Unable to generate PDF report. Please try again.'
          : 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง'
      );
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const statusTiles: Array<{
    key: CanonicalStatusKey;
    label: string;
    accentText: string;
    borderClass: string;
    route: string;
  }> = [
    { key: 'EMERGENCY', label: isEn ? 'Urgent #1' : 'งานด่วน #1', accentText: 'text-rose-400', borderClass: 'border-rose-500/40', route: 'smart-queue-schedule' },
    { key: 'IN_PROCESS', label: isEn ? 'Grinding' : 'กำลังเจียร', accentText: 'text-purple-300', borderClass: 'border-purple-500/40', route: 'smart-queue-schedule' },
    { key: 'WAITING', label: isEn ? 'Waiting' : 'รอคิวเจียร', accentText: 'text-cyan-300', borderClass: 'border-cyan-500/35', route: 'smart-queue-schedule' },
    { key: 'POSTPONED', label: isEn ? 'Postponed' : 'งานเลื่อน', accentText: 'text-amber-300', borderClass: 'border-amber-500/35', route: 'smart-queue-schedule' },
    { key: 'READY', label: isEn ? 'Ready for QC' : 'เจียรเสร็จ / รอ QC', accentText: 'text-sky-300', borderClass: 'border-sky-500/35', route: 'smart-queue-schedule' },
    { key: 'COMPLETED', label: isEn ? 'QC Passed' : 'QC ผ่าน', accentText: 'text-emerald-300', borderClass: 'border-emerald-500/35', route: 'unified-logs-view' },
    { key: 'SCRAP', label: isEn ? 'Scrapped' : 'ยกเลิก / คัดทิ้ง', accentText: 'text-rose-300', borderClass: 'border-rose-900/60', route: 'unified-logs-view' }
  ];

  const renderCoreDashboard = () => (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      {/* TIER 1: REAL-TIME QUEUE (7 STATUSES) & STOCK POOL */}
      <div className="shrink-0 grid grid-cols-1 xl:grid-cols-12 gap-2">
        {/* Real-time 7-Status Queue Monitor */}
        <div className="xl:col-span-8 bg-[#0b101b] border border-white/10 rounded-xl px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="font-bold text-white">
                {isEn ? 'Real-Time Grinding Queue Status' : 'สถานะคิวงานเจียร Real-Time'}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                {isEn
                  ? `${realtimeQueueSummary.totalJobs} Total Jobs (${realtimeQueueSummary.totalActivePieces.toLocaleString()} Active EA)`
                  : `ทั้งหมด ${realtimeQueueSummary.totalJobs} คิว (${realtimeQueueSummary.totalActivePieces.toLocaleString()} EA คงค้าง)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigateToTab(
                  'smart-queue-schedule',
                  filters.lineId !== 'ALL' ? (filters.lineId as ProductionLineId) : undefined
                )
              }
              className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isEn ? 'Open Queue Schedule' : 'เปิดตารางคิวงาน'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {statusTiles.map(tile => {
              const stat = realtimeQueueSummary.counts[tile.key];
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() =>
                    onNavigateToTab(
                      tile.route,
                      filters.lineId !== 'ALL' ? (filters.lineId as ProductionLineId) : undefined,
                      tile.key
                    )
                  }
                  className={`text-left bg-[#080c15] hover:bg-white/[0.04] border ${tile.borderClass} rounded-lg px-2 py-1.5 transition-colors cursor-pointer`}
                >
                  <div className="text-[10px] text-slate-400 truncate">{tile.label}</div>
                  <div className="flex items-baseline justify-between gap-1 mt-0.5">
                    <span className={`text-lg font-bold font-mono tabular-nums leading-none ${tile.accentText}`}>
                      {stat.jobs}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                      {stat.pieces.toLocaleString()} EA
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Stock Part Repair Pool */}
        <div className="xl:col-span-4 bg-[#0b101b] border border-white/10 rounded-xl px-2.5 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-bold text-white">
                {isEn ? 'Spare Part Repair Stock' : 'สต็อกอะไหล่หมุนเวียนงานซ่อม'}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400 font-mono tabular-nums">
                {isEn ? `${partMasters.length} Parts` : `${partMasters.length} พาร์ท`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('tooling-specs')}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isEn ? 'Manage Stock' : 'จัดการสต็อก'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-[#080c15] border border-emerald-500/30 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400 truncate">{isEn ? 'Ready to Issue' : 'พร้อมเบิก'}</div>
              <div className="text-sm font-bold font-mono tabular-nums text-emerald-300 leading-tight mt-0.5">
                {stockPoolSummary.readyToUseTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#080c15] border border-purple-500/30 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400 truncate">{isEn ? 'Grinding' : 'กำลังเจียร'}</div>
              <div className="text-sm font-bold font-mono tabular-nums text-purple-300 leading-tight mt-0.5">
                {stockPoolSummary.inProcessTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#080c15] border border-amber-500/30 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400 truncate">{isEn ? 'Awaiting Repair' : 'รอซ่อม'}</div>
              <div className="text-sm font-bold font-mono tabular-nums text-amber-300 leading-tight mt-0.5">
                {stockPoolSummary.awaitingTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#080c15] border border-white/10 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-400 truncate">{isEn ? 'Below Safety' : 'ต่ำกว่าเกณฑ์'}</div>
              <div
                className={`text-sm font-bold font-mono tabular-nums leading-tight mt-0.5 ${
                  stockPoolSummary.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {isEn ? `${stockPoolSummary.lowStockCount} Parts` : `${stockPoolSummary.lowStockCount} พาร์ท`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: COST SAVING HERO METRICS (FROM UNIFIED REPAIR LOGS) */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-[#0b101b] border border-emerald-500/35 rounded-xl px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-emerald-300">
              {isEn ? 'Net Cost Saving' : 'ยอดเงินที่ Saving ได้สุทธิ'}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight leading-none">
              ฿{Math.round(savingSummary.totalNetSaving).toLocaleString()}
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono tabular-nums leading-none">
              {savingSummary.savingPct.toFixed(1)}%
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono tabular-nums">
            <span>
              {isEn
                ? `Done / QC: ฿${Math.round(savingSummary.realizedNetSaving).toLocaleString()}`
                : `ซ่อมเสร็จ/รอ QC: ฿${Math.round(savingSummary.realizedNetSaving).toLocaleString()}`}
            </span>
            <span>{isEn ? `${savingSummary.validJobs} Jobs` : `${savingSummary.validJobs} ใบงาน`}</span>
          </div>
        </div>

        <div className="bg-[#0b101b] border border-white/10 rounded-xl px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-cyan-300">
              {isEn ? 'New Purchase Cost Avoided' : 'มูลค่าซื้อชิ้นใหม่ที่ทดแทนได้'}
            </span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight mt-1 leading-none">
            ฿{Math.round(savingSummary.totalNewPurchaseAvoided).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums truncate">
            {isEn
              ? `${periodScopeDescription} · ${savingSummary.validPieces.toLocaleString()} Pcs Reused`
              : `${periodScopeDescription} · ${savingSummary.validPieces.toLocaleString()} ชิ้นซ่อมใช้ต่อ`}
          </div>
        </div>

        <div className="bg-[#0b101b] border border-white/10 rounded-xl px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-amber-300">
              {isEn ? 'Actual Regrind Repair Cost' : 'ต้นทุนงานซ่อมเจียรจริง'}
            </span>
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight leading-none">
              ฿{Math.round(savingSummary.totalRepairCost).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-amber-300 font-mono tabular-nums leading-none">
              {isEn
                ? `${savingSummary.repairCostPct.toFixed(1)}% of New Cost`
                : `${savingSummary.repairCostPct.toFixed(1)}% ของราคาใหม่`}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
            {isEn ? 'Based on actual labor & machine logs' : 'อ้างอิงค่าแรง + อะไหล่/ต้นทุนเครื่องจาก Log จริง'}
          </div>
        </div>

        <div className="bg-[#0b101b] border border-white/10 rounded-xl px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-rose-300">
              {isEn ? 'Job Volume & Scrap Rate' : 'ปริมาณงานซ่อม & อัตราคัดทิ้ง'}
            </span>
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="text-xl font-bold text-white font-mono tabular-nums tracking-tight leading-none">
              {savingSummary.totalLogs}{' '}
              <span className="text-[11px] font-normal text-slate-400">{isEn ? 'Jobs' : 'ใบงาน'}</span>
            </div>
            <div className="text-xs font-semibold text-rose-400 font-mono tabular-nums leading-none">
              {isEn
                ? `Scrap ${savingSummary.scrapJobs} (${savingSummary.scrapRatePct.toFixed(1)}%)`
                : `คัดทิ้ง ${savingSummary.scrapJobs} (${savingSummary.scrapRatePct.toFixed(1)}%)`}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono tabular-nums">
            <span>
              {isEn
                ? `Scrap Loss: ฿${Math.round(savingSummary.scrapNewValueLoss).toLocaleString()}`
                : `มูลค่าคัดทิ้ง: ฿${Math.round(savingSummary.scrapNewValueLoss).toLocaleString()}`}
            </span>
            <span>{isEn ? `${savingSummary.scrapPieces} pcs` : `${savingSummary.scrapPieces} ชิ้น`}</span>
          </div>
        </div>
      </div>

      {/* Empty Period Hint Banner */}
      {periodFilteredRecords.length === 0 && (
        <div className="shrink-0 bg-[#0b101b] border border-amber-500/35 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isEn ? 'No regrind repair logs found for ' : 'ไม่พบประวัติงานซ่อมในช่วงเวลา '}
              <strong className="font-mono">{periodScopeDescription}</strong>
              {filters.lineId !== 'ALL' ? ` (LINE ${filters.lineId})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filters.periodType === 'DAILY' && latestRecordDate && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, selectedDate: latestRecordDate })}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono text-[11px] cursor-pointer"
              >
                {isEn ? `Go to Latest Job Date (${latestRecordDate})` : `ไปยังวันที่มีงานล่าสุด (${latestRecordDate})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSetPeriod('ALL')}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-mono text-[11px] cursor-pointer"
            >
              {isEn
                ? `View All-Time Logs (${regrindRecords.length} entries)`
                : `ดูประวัติสะสมทั้งหมด (${regrindRecords.length} รายการ)`}
            </button>
          </div>
        </div>
      )}

      {/* TIER 3: FULL-WIDTH PERIOD COMPARISON + CUMULATIVE SAVINGS TREND (RECHARTS LINECHART) */}
      <div className="flex-[1.15] min-h-[210px] bg-[#0b101b] border border-white/10 rounded-xl px-3 py-2 flex flex-col">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <h2 className="font-bold text-white">
              {isEn
                ? `Savings & Cumulative Trend (${periodScopeDescription})`
                : `แนวโน้มยอดประหยัด & สะสม (${periodScopeDescription})`}
            </h2>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
            {/* Interactive Per-Line Summary Chips */}
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono tabular-nums">
              {lineQuickChips.map(chip => {
                const isSelected = filters.lineId === chip.lineId;
                return (
                  <button
                    key={chip.lineId}
                    type="button"
                    onClick={() =>
                      onFilterChange({
                        ...filters,
                        lineId: isSelected ? 'ALL' : chip.lineId
                      })
                    }
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-[#080c15] text-slate-300 border-white/10 hover:border-cyan-400/50'
                    }`}
                    title={isEn ? `Click to filter LINE ${chip.lineId}` : `คลิกเพื่อกรองเฉพาะ LINE ${chip.lineId}`}
                  >
                    {chip.lineId}: ฿{Math.round(chip.saving).toLocaleString()} ({chip.jobs})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowChartDataLabels(prev => !prev)}
              aria-pressed={showChartDataLabels}
              className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                showChartDataLabels
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white hover:border-cyan-400/50'
              }`}
              title={isEn ? 'Toggle data point numbers on charts' : 'กดเปิด/ปิดการแสดงตัวเลขแต่ละจุดบนกราฟ'}
            >
              {showChartDataLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>
                {isEn
                  ? showChartDataLabels
                    ? 'Labels: ON'
                    : 'Labels: OFF'
                  : showChartDataLabels
                  ? 'ตัวเลขกราฟ: เปิด'
                  : 'ตัวเลขกราฟ: ปิด'}
              </span>
            </button>

            <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-white/10 rounded-lg text-[10.5px]">
              <button
                type="button"
                onClick={() => setChartViewMode('SPLIT')}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  chartViewMode === 'SPLIT' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Split View' : '2 กราฟ'}
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('TREND')}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  chartViewMode === 'TREND' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Period Comparison' : 'เปรียบเทียบรายช่วง'}
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('CUMULATIVE')}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  chartViewMode === 'CUMULATIVE' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Cumulative (Line)' : 'แนวโน้มสะสม (Line)'}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigateToTab(
                  'unified-logs-view',
                  filters.lineId !== 'ALL' ? (filters.lineId as ProductionLineId) : undefined
                )
              }
              className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isEn ? 'View All Logs' : 'ดูประวัติ Log ทั้งหมด'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full">
          {trendChartData.some(p => p.count > 0) ? (
            <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
              {chartViewMode !== 'CUMULATIVE' && (
                <div
                  className={`${
                    chartViewMode === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
                  } h-full min-h-[160px] lg:min-h-0 bg-[#080c15] border border-white/10 rounded-lg px-2 py-1.5 flex flex-col`}
                >
                  <div className="shrink-0 flex items-center justify-between text-[10.5px] mb-0.5 px-1">
                    <span className="font-semibold text-slate-200 truncate">
                      {isEn
                        ? 'New Cost Avoided vs. Net Saving vs. Repair Cost'
                        : 'เปรียบเทียบมูลค่าซื้อใหม่ / ยอดประหยัด / ต้นทุนซ่อม'}
                      {filters.periodType === 'DAILY' && (
                        <span className="ml-1.5 font-mono text-[10px] text-cyan-400">
                          {dailyHasNightShift
                            ? isEn
                              ? '(08:00–07:00 · 24h Shift)'
                              : '(08:00–07:00 · กะดึก 24 ชม.)'
                            : '(08:00–20:00)'}
                        </span>
                      )}
                      {filters.periodType === 'WEEKLY' && trendChartData.length > 0 && (
                        <span className="ml-1.5 font-mono text-[10px] text-cyan-400">
                          ({trendChartData[0].label}–{trendChartData[trendChartData.length - 1].label})
                        </span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-cyan-300 shrink-0">
                      Saving {savingSummary.savingPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={trendChartData}
                        margin={{ top: showChartDataLabels ? 20 : 4, right: 6, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis
                          yAxisId="left"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#38bdf8"
                          fontSize={10}
                          tickLine={false}
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: 'rgba(255,255,255,0.12)',
                            borderRadius: '0.5rem',
                            fontSize: '11px',
                            color: '#f8fafc'
                          }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltipLabel || label}
                          formatter={(value: any, name: string) => {
                            if (name === 'Saving %') return [`${value}%`, name];
                            return [`฿${Number(value).toLocaleString()}`, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '2px' }} />
                        <Bar
                          yAxisId="left"
                          dataKey="avoided"
                          name={isEn ? 'New Part Value' : 'มูลค่าซื้อใหม่'}
                          fill="#334155"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="saving"
                          name={isEn ? 'Net Saving' : 'ยอดประหยัดสุทธิ'}
                          fill="#10b981"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        >
                          {showChartDataLabels && (
                            <LabelList
                              dataKey="saving"
                              content={(props: any) => {
                                const idx = typeof props.index === 'number' ? props.index : -1;
                                const pt = idx >= 0 ? trendChartData[idx] : undefined;
                                if (!pt || pt.count <= 0) return null;
                                const cx = Number(props.x || 0) + Number(props.width || 0) / 2;
                                const cy = Math.max(12, Number(props.y || 0) - 5);
                                return (
                                  <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    fill="#34d399"
                                    stroke="#080c15"
                                    strokeWidth={3}
                                    paintOrder="stroke"
                                    fontSize={9}
                                    fontWeight={700}
                                    className="font-mono tabular-nums pointer-events-none"
                                  >
                                    {formatCompactThbLabel(Number(props.value || 0))}
                                  </text>
                                );
                              }}
                            />
                          )}
                        </Bar>
                        <Bar
                          yAxisId="left"
                          dataKey="repair"
                          name={isEn ? 'Repair Cost' : 'ต้นทุนซ่อม'}
                          fill="#f59e0b"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="savingPct"
                          name="Saving %"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#38bdf8' }}
                        >
                          {showChartDataLabels && (
                            <LabelList
                              dataKey="savingPct"
                              content={(props: any) => {
                                const idx = typeof props.index === 'number' ? props.index : -1;
                                const pt = idx >= 0 ? trendChartData[idx] : undefined;
                                if (!pt || pt.count <= 0) return null;
                                const cx = Number(props.x || 0);
                                const rawY = Number(props.y || 0);
                                const cy = rawY < 18 ? rawY + 13 : rawY - 7;
                                return (
                                  <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    fill="#38bdf8"
                                    stroke="#080c15"
                                    strokeWidth={3}
                                    paintOrder="stroke"
                                    fontSize={8.5}
                                    fontWeight={700}
                                    className="font-mono tabular-nums pointer-events-none"
                                  >
                                    {`${Number(props.value || 0).toFixed(1).replace(/\.0$/, '')}%`}
                                  </text>
                                );
                              }}
                            />
                          )}
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {chartViewMode !== 'TREND' && (
                <div
                  className={`${
                    chartViewMode === 'SPLIT' ? 'lg:col-span-6' : 'lg:col-span-12'
                  } h-full min-h-[160px] lg:min-h-0 bg-[#080c15] border border-emerald-500/25 rounded-lg px-2 py-1.5 flex flex-col`}
                >
                  <div className="shrink-0 flex items-center justify-between text-[10.5px] mb-0.5 px-1">
                    <span className="font-semibold text-emerald-300 truncate">
                      {isEn
                        ? 'Cumulative Cost Savings Trend'
                        : 'กราฟเส้นแนวโน้มยอดประหยัดสะสม (Cumulative Savings Trend)'}
                      {filters.periodType === 'DAILY' && (
                        <span className="ml-1.5 font-mono text-[10px] text-emerald-400/80">
                          {dailyHasNightShift ? '(08:00–07:00 · 24h)' : '(08:00–20:00)'}
                        </span>
                      )}
                      {filters.periodType === 'WEEKLY' && trendChartData.length > 0 && (
                        <span className="ml-1.5 font-mono text-[10px] text-emerald-400/80">
                          ({trendChartData[0].label}–{trendChartData[trendChartData.length - 1].label})
                        </span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-emerald-400 shrink-0">
                      {isEn
                        ? `Cumulative: ฿${Math.round(cumulativeEndSaving).toLocaleString()}`
                        : `สะสม: ฿${Math.round(cumulativeEndSaving).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendChartData}
                        margin={{ top: showChartDataLabels ? 20 : 4, right: 14, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}M`
                              : v >= 1000
                              ? `${Math.round(v / 1000)}k`
                              : String(v)
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: 'rgba(16,185,129,0.35)',
                            borderRadius: '0.5rem',
                            fontSize: '11px',
                            color: '#f8fafc'
                          }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltipLabel || label}
                          formatter={(value: any, name: string) => [`฿${Number(value).toLocaleString()}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '2px' }} />
                        <Line
                          type="monotone"
                          dataKey="cumulativeSaving"
                          name={isEn ? 'Cumulative Saving (฿)' : 'ยอดประหยัดสะสม (฿)'}
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                          activeDot={{ r: 4.5, fill: '#34d399' }}
                        >
                          {showChartDataLabels && (
                            <LabelList
                              dataKey="cumulativeSaving"
                              content={(props: any) => {
                                const idx = typeof props.index === 'number' ? props.index : -1;
                                const pt = idx >= 0 ? trendChartData[idx] : undefined;
                                if (!pt || pt.count <= 0) return null;
                                const cx = Number(props.x || 0);
                                const rawY = Number(props.y || 0);
                                const cy = rawY < 18 ? rawY + 13 : rawY - 8;
                                return (
                                  <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    fill="#34d399"
                                    stroke="#080c15"
                                    strokeWidth={3}
                                    paintOrder="stroke"
                                    fontSize={9}
                                    fontWeight={700}
                                    className="font-mono tabular-nums pointer-events-none"
                                  >
                                    {formatCompactThbLabel(Number(props.value || 0))}
                                  </text>
                                );
                              }}
                            />
                          )}
                        </Line>
                        <Line
                          type="monotone"
                          dataKey="cumulativeRepair"
                          name={isEn ? 'Cumulative Repair Cost (฿)' : 'ต้นทุนซ่อมสะสม (฿)'}
                          stroke="#f59e0b"
                          strokeWidth={1.75}
                          strokeDasharray="4 3"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs border border-dashed border-white/10 rounded-lg">
              {isEn
                ? 'No repair logs recorded in this timeframe for trend analysis'
                : 'ยังไม่มีรายการบันทึกในกรอบเวลาที่เลือกสำหรับกราฟแนวโน้ม'}
            </div>
          )}
        </div>
      </div>

      {/* TIER 4: TOP 10 RANKINGS (COMPACT TOP 5 DEFAULT + EXPAND TO TOP 10) */}
      <div className="flex-1 min-h-[210px] bg-[#0b101b] border border-white/10 rounded-xl px-3 py-2 flex flex-col">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
          <div className="flex items-center gap-2 text-xs">
            <h2 className="font-bold text-white">
              {isEn ? 'Top 10 Analytics from Live Repair Logs' : 'จัดอันดับ Top 10 จากประวัติงานซ่อมจริง'}
            </h2>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-[11px] text-slate-400">
              {topDisplayLimit === 5
                ? isEn
                  ? 'Compact Top 5'
                  : 'ย่อแสดง 5 อันดับแรก'
                : isEn
                ? 'Full Top 10'
                : 'แสดงครบ 10 อันดับ'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Compact Top 5 vs Top 10 Switch */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-white/10 rounded-lg text-[10.5px]">
              <button
                type="button"
                onClick={() => setTopDisplayLimit(5)}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  topDisplayLimit === 5 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Top 5' : 'ย่อ Top 5'}
              </button>
              <button
                type="button"
                onClick={() => setTopDisplayLimit(10)}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  topDisplayLimit === 10 ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Full Top 10' : 'ดูครบ Top 10'}
              </button>
            </div>

            {/* Period vs All-Time Switch */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-white/10 rounded-lg text-[10.5px]">
              <button
                type="button"
                onClick={() => setTopListScope('PERIOD')}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  topListScope === 'PERIOD' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? 'Selected Period' : 'ช่วงเวลาที่เลือก'}
              </button>
              <button
                type="button"
                onClick={() => setTopListScope('ALL_TIME')}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer whitespace-nowrap ${
                  topListScope === 'ALL_TIME' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isEn ? `All Time (${lineFilteredRecords.length})` : `สะสมทั้งหมด (${lineFilteredRecords.length})`}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 1. Top 10 Frequently Repaired Parts (Shows Top 5 default) */}
          <div className="min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-bold text-cyan-300">
                {isEn ? 'Most Repaired Parts (Top 10)' : 'ชิ้นงานที่ซ่อมบ่อยที่สุด (Top 10)'}
              </h3>
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {isEn
                  ? `Showing ${visibleRepairedParts.length}/${top10RepairedParts.length}`
                  : `แสดง ${visibleRepairedParts.length}/${top10RepairedParts.length}`}
              </span>
            </div>

            {visibleRepairedParts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-white/10 rounded-lg text-xs text-slate-500">
                {isEn ? 'No repair history in this period' : 'ไม่มีรายการซ่อมในช่วงเวลานี้'}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-white/5 border border-white/10 rounded-lg bg-[#080c15]">
                {visibleRepairedParts.map((item, idx) => {
                  const maxJobs = top10RepairedParts[0]?.jobs || 1;
                  const barPct = Math.round((item.jobs / maxJobs) * 100);
                  return (
                    <div key={item.key} className="px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono tabular-nums text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                          <span className="font-semibold text-white truncate" title={`${item.partName} (${item.partCode})`}>
                            {item.partName}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums shrink-0 flex items-center gap-2 text-[10.5px]">
                          <span className="font-bold text-cyan-300">
                            {isEn ? `${item.jobs} jobs (${item.pieces} pcs)` : `${item.jobs} ครั้ง (${item.pieces} ชิ้น)`}
                          </span>
                          <span className="text-emerald-400">฿{Math.round(item.totalSaving).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Top 10 Frequently Scrapped Parts (Shows Top 5 default) */}
          <div className="min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-bold text-rose-300">
                {isEn ? 'Most Scrapped Parts (Top 10)' : 'ชิ้นงานที่ทิ้งบ่อยที่สุด (Scrap Top 10)'}
              </h3>
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {isEn
                  ? `Showing ${visibleScrappedParts.length}/${top10ScrappedParts.length}`
                  : `แสดง ${visibleScrappedParts.length}/${top10ScrappedParts.length}`}
              </span>
            </div>

            {visibleScrappedParts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-white/10 rounded-lg text-xs text-slate-500 text-center gap-1">
                <span>{isEn ? 'No scrapped parts in selected period' : 'ไม่มีรายการคัดทิ้งในช่วงเวลาที่เลือก'}</span>
                {topListScope === 'PERIOD' && (
                  <button
                    type="button"
                    onClick={() => setTopListScope('ALL_TIME')}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] cursor-pointer underline"
                  >
                    {isEn ? 'View All-Time Scrap History' : 'ดูยอดคัดทิ้งสะสมทั้งหมด'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-white/5 border border-white/10 rounded-lg bg-[#080c15]">
                {visibleScrappedParts.map((item, idx) => {
                  const maxScrap = top10ScrappedParts[0]?.scrapJobs || 1;
                  const barPct = Math.round((item.scrapJobs / maxScrap) * 100);
                  return (
                    <div key={item.key} className="px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono tabular-nums text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                          <span className="font-semibold text-white truncate" title={`${item.partName} (${item.topReason})`}>
                            {item.partName}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums shrink-0 flex items-center gap-2 text-[10.5px]">
                          <span className="font-bold text-rose-400">
                            {isEn
                              ? `${item.scrapJobs} jobs (${item.scrapPieces} pcs)`
                              : `${item.scrapJobs} ครั้ง (${item.scrapPieces} ชิ้น)`}
                          </span>
                          <span className="text-slate-400">฿{Math.round(item.lostValueThb).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Top 10 Repair & Defect Reasons (Shows Top 5 default) */}
          <div className="min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-bold text-amber-300">
                {isEn ? 'Common Defect Reasons (Top 10)' : 'สาเหตุการซ่อมที่พบบ่อย (Top 10)'}
              </h3>
              <span className="text-[10px] font-mono tabular-nums text-slate-400">
                {isEn
                  ? `Showing ${visibleDefectReasons.length}/${top10DefectReasons.length}`
                  : `แสดง ${visibleDefectReasons.length}/${top10DefectReasons.length}`}
              </span>
            </div>

            {visibleDefectReasons.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-white/10 rounded-lg text-xs text-slate-500">
                {isEn ? 'No defect reason data in this period' : 'ไม่มีข้อมูลสาเหตุการซ่อมในช่วงเวลานี้'}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-white/5 border border-white/10 rounded-lg bg-[#080c15]">
                {visibleDefectReasons.map((item, idx) => {
                  const maxCount = top10DefectReasons[0]?.count || 1;
                  const barPct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.reasonCode} className="px-2 py-1.5 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono tabular-nums text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                          <span className="font-semibold text-white truncate" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums shrink-0 flex items-center gap-2 text-[10.5px]">
                          <span className="font-bold text-amber-300">
                            {isEn
                              ? `${item.count} jobs (${item.pct.toFixed(1)}%)`
                              : `${item.count} ครั้ง (${item.pct.toFixed(1)}%)`}
                          </span>
                          <span className="text-slate-400">฿{Math.round(item.repairCost).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-1 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilterControls = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 p-0.5 bg-slate-950 border border-white/10 rounded-lg text-[11px]">
        {(
          [
            { id: 'DAILY', label: isEn ? 'Daily' : 'รายวัน' },
            { id: 'WEEKLY', label: isEn ? 'Weekly' : 'รายสัปดาห์' },
            { id: 'MONTHLY', label: isEn ? 'Monthly' : 'รายเดือน' },
            { id: 'YEARLY', label: isEn ? 'Yearly' : 'รายปี' },
            { id: 'ALL', label: isEn ? 'All Time' : 'ทั้งหมด' }
          ] as { id: CostPeriodFilter; label: string }[]
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSetPeriod(tab.id)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filters.periodType === tab.id
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(filters.periodType === 'DAILY' || filters.periodType === 'WEEKLY') && (
        <input
          type="date"
          value={activeSelectedDate}
          onChange={e => onFilterChange({ ...filters, selectedDate: e.target.value })}
          className="h-7 px-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none"
        />
      )}

      {filters.periodType === 'MONTHLY' && (
        <div className="flex items-center gap-1.5">
          <select
            value={filters.month || 11}
            onChange={e => onFilterChange({ ...filters, month: Number(e.target.value) })}
            className="h-7 px-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {monthNamesShort.map((mName, idx) => (
              <option key={mName} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>
          <select
            value={filters.year}
            onChange={e => onFilterChange({ ...filters, year: Number(e.target.value) })}
            className="h-7 px-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {filters.periodType === 'YEARLY' && (
        <select
          value={filters.year}
          onChange={e => onFilterChange({ ...filters, year: Number(e.target.value) })}
          className="h-7 px-2 bg-slate-950 border border-white/15 rounded-lg text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none cursor-pointer"
        >
          {[2025, 2026, 2027].map(y => (
            <option key={y} value={y}>
              {isEn ? `Year ${y}` : `ปี ${y}`}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.lineId}
        onChange={e => onFilterChange({ ...filters, lineId: e.target.value })}
        className="h-7 px-2.5 bg-slate-950 border border-white/15 rounded-lg text-cyan-300 font-mono text-[11px] font-semibold focus:border-cyan-400 focus:outline-none cursor-pointer"
      >
        <option value="ALL">{isEn ? 'All Lines (E1–E5)' : 'ทุกลายน์ (E1–E5)'}</option>
        {PRODUCTION_LINES.map(l => (
          <option key={l} value={l}>
            LINE {l}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full lg:h-full lg:flex-1 lg:min-h-0 flex flex-col gap-2 font-sans text-white bg-[#060911] p-2 sm:p-2.5 rounded-2xl border border-white/10 relative lg:overflow-hidden"
    >
      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-emerald-950 border border-emerald-500/50 text-emerald-200 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* TOP COMMAND & FILTER BAR */}
      <div className="shrink-0 bg-[#0b101b] border border-white/10 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {renderFilterControls()}

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono tabular-nums mr-1 hidden xl:inline">
            {isEn ? `Updated ${lastRefreshTime}` : `อัปเดต ${lastRefreshTime}`}
          </span>

          <button
            type="button"
            onClick={() => setIsTvMode(true)}
            className="h-7 px-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV View</span>
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="h-7 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isEn ? 'Reset' : 'รีเซ็ต'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-7 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportReportPDF}
            className="h-7 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Export summary report as PDF for management review"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {renderCoreDashboard()}

      {/* TV VIEW FULLSCREEN KIOSK MODAL */}
      {isTvMode && (
        <div className="fixed inset-0 z-50 bg-[#05080f] flex flex-col font-sans text-white p-2.5 sm:p-3 overflow-hidden">
          <div className="bg-[#0b101b] border border-cyan-500/30 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 mb-1.5">
            <div className="flex items-center gap-3">
              <Tv className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white">FinDie Regrind Pro — Executive & Factory TV View</h2>
                <p className="text-[11px] text-slate-400">
                  {periodScopeDescription} · {isEn ? `Last updated ${lastRefreshTime}` : `อัปเดตล่าสุด ${lastRefreshTime}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3 py-1 rounded-lg font-mono text-xs text-cyan-300">
                <span>{isEn ? `Auto-refresh: ${tvCountdown}s` : `รีเฟรชอัตโนมัติ: ${tvCountdown}s`}</span>
                <button
                  type="button"
                  onClick={() => setTvAutoRefresh(!tvAutoRefresh)}
                  className="p-1 hover:bg-white/10 rounded cursor-pointer"
                >
                  {tvAutoRefresh ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? (isEn ? 'Exit Fullscreen' : 'ย่อหน้าจอ') : isEn ? 'Fullscreen' : 'เต็มจอ'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTvMode(false)}
                className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-4 h-4" />
                <span>{isEn ? 'Close TV View' : 'ปิด TV View'}</span>
              </button>
            </div>
          </div>

          {/* COMPACT FILTER BAR FOR TV VIEW & FULLSCREEN */}
          <div className="shrink-0 bg-[#0b101b] border border-white/10 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 mb-2">
            {renderFilterControls()}

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isEn ? 'Reset' : 'รีเซ็ต'}</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{renderCoreDashboard()}</div>
        </div>
      )}
    </div>
  );
};
