import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storageService';
import { regrindService } from '../../services/regrindService';
import { ToolingPicThumbnail } from '../../components/regrind/ToolingPicThumbnail';
import {
  Ruler,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Sliders,
  DollarSign,
  FileCheck,
  Send,
  Printer
} from 'lucide-react';
import { PartLifeStandard } from '../../types';
import { RegrindWorkTicket, ToolingPartMasterItem, DefectReasonCode } from '../../types/regrind';

interface ToolLengthValidationFormProps {
  initialTicket?: RegrindWorkTicket | null;
  onValidationComplete?: (result: {
    status: 'READY' | 'SCRAP';
    partName: string;
    remainingLength: number;
    prNumber?: string;
  }) => void;
  currentUserName?: string;
}

const MATERIAL_OPTIONS = [
  { id: 'SKD11', label: 'SKD11 (JIS Tool Steel)', desc: 'High Carbon, High Chromium - มาตรฐานแม่พิมพ์' },
  { id: 'Carbide', label: 'Tungsten Carbide (คาร์ไบด์)', desc: 'Ultra-high wear resistance ทนสึกหรอสูงพิเศษ' },
  { id: 'SKD61', label: 'SKD61 (Hot-work Die Steel)', desc: 'High toughness & thermal resistance' },
  { id: 'HSS', label: 'HSS (High Speed Steel)', desc: 'เหล็กกล้ารอบจัด คมทนทาน' },
];

export const ToolLengthValidationForm: React.FC<ToolLengthValidationFormProps> = ({
  initialTicket,
  onValidationComplete,
  currentUserName = 'Kittisak Wongsuwan'
}) => {
  // Master data sources
  const lifeStandards: PartLifeStandard[] = useMemo(() => storageService.getLifeStandards(), []);
  const regrindMasters: ToolingPartMasterItem[] = useMemo(() => regrindService.getToolingMasters(), []);
  const tickets: RegrindWorkTicket[] = useMemo(() => regrindService.getQueueTickets(), []);

  // Form states
  const [selectedPartCode, setSelectedPartCode] = useState<string>(
    initialTicket?.partCode || regrindMasters[0]?.partCode || 'P-BURR-07'
  );
  const [linkedTicketId, setLinkedTicketId] = useState<string>(initialTicket?.id || '');
  const [technicianName, setTechnicianName] = useState<string>(
    initialTicket?.assignedTechnician || currentUserName
  );
  const [verifiedBy, setVerifiedBy] = useState<string>('Anan Chaikit (QC Manager)');
  const [serialOrLot, setSerialOrLot] = useState<string>(
    initialTicket?.qrCode || `SN-${Date.now().toString().slice(-6)}`
  );
  const [toolMaterial, setToolMaterial] = useState<string>(initialTicket?.toolMaterial || 'SKD11');
  const [isCustomMaterial, setIsCustomMaterial] = useState<boolean>(false);
  const [customMaterialText, setCustomMaterialText] = useState<string>('');

  // Measurement states
  const [previousLength, setPreviousLength] = useState<number>(70.00);
  const [grindDepth, setGrindDepth] = useState<number>(0.25);
  const [manualRemainingLength, setManualRemainingLength] = useState<number | null>(null);
  const [shimThickness, setShimThickness] = useState<number>(0.25);
  const [currentCycleCount, setCurrentCycleCount] = useState<number>(1);
  const [lineId, setLineId] = useState<string>(initialTicket?.lineId || 'E1');
  const [notes, setNotes] = useState<string>('');

  // Scrap Prompt Modal state
  const [isAutoScrapPromptOpen, setIsAutoScrapPromptOpen] = useState<boolean>(false);
  const [scrapCompletedInfo, setScrapCompletedInfo] = useState<{ prNumber: string; message: string } | null>(null);
  const [readyCompletedInfo, setReadyCompletedInfo] = useState<{ message: string } | null>(null);

  // Find active Part Master and Part Life Standard
  const activeMaster = useMemo(() => {
    return regrindMasters.find(m => m.partCode === selectedPartCode || m.partName === selectedPartCode) || regrindMasters[0];
  }, [regrindMasters, selectedPartCode]);

  const activeLifeStandard = useMemo(() => {
    return lifeStandards.find(s => s.partName === activeMaster?.partName);
  }, [lifeStandards, activeMaster]);

  // Load defaults when part or ticket changes
  useEffect(() => {
    if (initialTicket) {
      setSelectedPartCode(initialTicket.partCode);
      setLinkedTicketId(initialTicket.id);
      setPreviousLength(initialTicket.previousLengthMm || initialTicket.nominalLengthMm || 70.00);
      setGrindDepth(initialTicket.grindDepthMm || 0.25);
      setShimThickness(initialTicket.shimAddedMm || 0.25);
      setCurrentCycleCount((initialTicket.regrindCountBefore || 0) + 1);
      setLineId(initialTicket.lineId || 'E1');
      setSerialOrLot(initialTicket.qrCode || `SN-${Date.now().toString().slice(-6)}`);
      setManualRemainingLength(null);
    } else if (activeMaster) {
      setPreviousLength(activeMaster.nominalLengthMm || 70.00);
      setGrindDepth(activeMaster.grindingAmountPerTimeMm || 0.25);
      setShimThickness(activeMaster.grindingAmountPerTimeMm || 0.25);
      setCurrentCycleCount(1);
      setManualRemainingLength(null);
    }
  }, [initialTicket, activeMaster]);

  // Thresholds from Part Life Standard Matrix & Regrind Master
  const nominalLength = activeMaster?.nominalLengthMm || 70.00;
  const minAllowedThreshold = activeMaster?.minAllowedLengthMm || 65.00;
  const maxAllowedCycles = activeMaster?.maxRegrindCount || 4;
  const maxGrindAllowance = activeMaster?.totalGrindingAllowanceMm || (nominalLength - minAllowedThreshold);
  const stdGrindPerTime = activeMaster?.grindingAmountPerTimeMm || 0.25;

  // Real-time calculations
  const calculatedRemainingLength = useMemo(() => {
    if (manualRemainingLength !== null && !isNaN(manualRemainingLength)) {
      return manualRemainingLength;
    }
    return Number(Math.max(0, previousLength - grindDepth).toFixed(2));
  }, [manualRemainingLength, previousLength, grindDepth]);

  const cumulativeMaterialRemoved = Number((nominalLength - calculatedRemainingLength).toFixed(2));
  const remainingGrindingMargin = Number((calculatedRemainingLength - minAllowedThreshold).toFixed(2));
  const remainingCyclesBeforeScrap = Math.max(0, maxAllowedCycles - currentCycleCount);
  const healthPercentage = Math.max(0, Math.min(100, Math.round(((calculatedRemainingLength - minAllowedThreshold) / (nominalLength - minAllowedThreshold)) * 100)));

  // Validation Rules
  const isBelowMinThreshold = calculatedRemainingLength < minAllowedThreshold;
  const isCycleExceeded = currentCycleCount > maxAllowedCycles;
  const isNearThresholdWarning = !isBelowMinThreshold && remainingGrindingMargin <= 0.30;
  const isInvalid = isBelowMinThreshold || isCycleExceeded;

  // Auto trigger scrap prompt if invalid
  useEffect(() => {
    if (isInvalid) {
      setIsAutoScrapPromptOpen(true);
    } else {
      setIsAutoScrapPromptOpen(false);
    }
  }, [isInvalid, calculatedRemainingLength, currentCycleCount]);

  const handleGrindDepthChange = (val: number) => {
    const depth = Math.max(0, val);
    setGrindDepth(depth);
    setShimThickness(depth);
    setManualRemainingLength(Number(Math.max(0, previousLength - depth).toFixed(2)));
  };

  const handleManualRemainingChange = (val: number) => {
    setManualRemainingLength(val);
    const depth = Number(Math.max(0, previousLength - val).toFixed(2));
    setGrindDepth(depth);
    setShimThickness(depth);
  };

  const handlePartSelect = (code: string) => {
    setSelectedPartCode(code);
    setManualRemainingLength(null);
    setScrapCompletedInfo(null);
    setReadyCompletedInfo(null);
  };

  // Submit Safe / Ready Grinding
  const handleApproveAndPass = () => {
    if (isInvalid) {
      setIsAutoScrapPromptOpen(true);
      return;
    }

    const finalMat = isCustomMaterial ? (customMaterialText || 'SKD11') : toolMaterial;

    if (linkedTicketId) {
      const res = regrindService.completeGrinding(linkedTicketId, {
        remainingLengthMm: calculatedRemainingLength,
        grindDepthMm: grindDepth,
        shimAddedMm: shimThickness,
        toolMaterial: finalMat,
        technicianName,
        verifiedBy,
        remarks: notes || `ผ่านการตรวจสอบตามเกณฑ์ Part Life Standard (เหลือ ${calculatedRemainingLength.toFixed(2)} mm)`
      });

      if (res.success) {
        setReadyCompletedInfo({
          message: `✅ บันทึกผลสำเร็จ: ${activeMaster.partName} ความยาว ${calculatedRemainingLength.toFixed(2)} mm ผ่านเกณฑ์มาตรฐานและเพิ่มเข้าสต๊อกเรียบร้อยแล้ว`
        });
        if (onValidationComplete) {
          onValidationComplete({
            status: 'READY',
            partName: activeMaster.partName,
            remainingLength: calculatedRemainingLength
          });
        }
      }
    } else {
      // Standalone validation pass
      storageService.addAuditLog(
        'REGRIND',
        `Dimension Validation Passed: ${activeMaster.partName} (${selectedPartCode}) Length: ${calculatedRemainingLength.toFixed(2)}mm >= Min: ${minAllowedThreshold}mm. Cycle: ${currentCycleCount}/${maxAllowedCycles}`,
        `ผ่านการตรวจสอบมิติความยาว: ${activeMaster.partName} (${selectedPartCode}) คงเหลือ ${calculatedRemainingLength.toFixed(2)} มม. (เกณฑ์ขั้นต่ำ ${minAllowedThreshold} มม.)`,
        lineId as any
      );

      setReadyCompletedInfo({
        message: `✅ ตรวจสอบมิติผ่านเกณฑ์มาตรฐาน: ${activeMaster.partName} (${calculatedRemainingLength.toFixed(2)} mm ≥ ${minAllowedThreshold.toFixed(2)} mm) สามารถนำไปประกอบใช้งานได้`
      });

      if (onValidationComplete) {
        onValidationComplete({
          status: 'READY',
          partName: activeMaster.partName,
          remainingLength: calculatedRemainingLength
        });
      }
    }
  };

  // Trigger Automatic Scrap Action
  const handleConfirmScrapAction = () => {
    const reasonText = isBelowMinThreshold
      ? `ความยาวหลังเจียร (${calculatedRemainingLength.toFixed(2)} mm) ต่ำกว่าเกณฑ์ขั้นต่ำ Part Life Standard (${minAllowedThreshold.toFixed(2)} mm)`
      : `รอบการเจียร (${currentCycleCount}) เกินขีดจำกัดสูงสุด (${maxAllowedCycles} ครั้ง)`;

    let prNumber = '';

    if (linkedTicketId) {
      const res = regrindService.scrapItem(
        linkedTicketId,
        'OUT_OF_TOLERANCE',
        reasonText,
        technicianName
      );
      prNumber = res.prNumber;
    } else {
      // Standalone Scrap Requisition
      const prItem = regrindService.createPurchasingRequisition({
        partName: activeMaster.partName,
        partCode: activeMaster.partCode,
        quantity: 10,
        workTicketId: `VAL-SCRAP-${Date.now()}`,
        lineId: (lineId as any) || 'E1',
        requestedBy: technicianName,
        reason: 'SCRAPPED_TOOLING_REPLACEMENT'
      });
      prNumber = prItem.prNumber;

      storageService.addAuditLog(
        'REGRIND',
        `Scrapped via Validation Form: ${activeMaster.partName} (${activeMaster.partCode}) below min spec (${calculatedRemainingLength.toFixed(2)}mm < ${minAllowedThreshold}mm). Created PR ${prNumber}`,
        `บันทึกตัดทิ้งจากหน้าตรวจสอบมิติ: ${activeMaster.partName} (${activeMaster.partCode}) ต่ำกว่าเกณฑ์มาตรฐาน สร้างใบสั่งซื้อ PR ${prNumber}`,
        lineId as any
      );
    }

    setIsAutoScrapPromptOpen(false);
    setScrapCompletedInfo({
      prNumber,
      message: `ชิ้นส่วน ${activeMaster.partName} ถูกเปลี่ยนสถานะเป็น "ทิ้ง (Scrap)" และส่งใบขอสั่งซื้อ (PR) ${prNumber} เรียบร้อยแล้ว`
    });

    if (onValidationComplete) {
      onValidationComplete({
        status: 'SCRAP',
        partName: activeMaster.partName,
        remainingLength: calculatedRemainingLength,
        prNumber
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <Ruler className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  แบบฟอร์มตรวจสอบ & คำนวณมิติความยาวทูลลิ่ง (Tool Length Validation Matrix)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Part Life Standard Matrix
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                คำนวณความยาวคงเหลือเทียบกับค่าพิกัดจำกัดขั้นต่ำ (Min Spec) และแจ้งเตือนตัดทิ้ง (Auto-Scrap) อัตโนมัติเมื่อต่ำกว่ามาตรฐาน
              </p>
            </div>
          </div>

          {/* Linked Ticket Indicator */}
          {linkedTicketId && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400">เชื่อมโยงใบงาน:</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{initialTicket?.jobCode || linkedTicketId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Alerts */}
      {readyCompletedInfo && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{readyCompletedInfo.message}</span>
          </div>
          <button
            onClick={() => setReadyCompletedInfo(null)}
            className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold"
          >
            ตกลง
          </button>
        </div>
      )}

      {scrapCompletedInfo && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold">{scrapCompletedInfo.message}</div>
              <div className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-mono">
                PR Requisition ID: <strong>{scrapCompletedInfo.prNumber}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setScrapCompletedInfo(null)}
            className="text-xs px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-500 font-semibold"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Part Selection & Specs Reference */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>1. เลือกชิ้นส่วนทูลลิ่ง & พิกัดมาตรฐาน (Part & Standard Matrix)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                พบมาตรฐาน {regrindMasters.length} รายการ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  รายการทูลลิ่งแม่พิมพ์ (Tooling Part Name) *
                </label>
                <select
                  value={selectedPartCode}
                  onChange={e => handlePartSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  {regrindMasters.map(m => (
                    <option key={m.partCode} value={m.partCode}>
                      {m.partName} ({m.partCode}) - {m.tubeSize}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ไลน์การผลิต & Serial/QR Code
                </label>
                <div className="flex gap-2">
                  <select
                    value={lineId}
                    onChange={e => setLineId(e.target.value)}
                    className="w-24 px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    {['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={serialOrLot}
                    onChange={e => setSerialOrLot(e.target.value)}
                    placeholder="QR / Serial Code"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Part Matrix Standard Specs Summary Card */}
            {activeMaster && (
              <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 flex items-start gap-3">
                <ToolingPicThumbnail
                  picCategory={activeMaster.picCategory}
                  partName={activeMaster.partName}
                  size="md"
                />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ความยาวเริ่มต้น (L-nominal)</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm">
                      {nominalLength.toFixed(2)} mm
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">พิกัดต่ำสุด (L-min)</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono text-xs sm:text-sm">
                      {minAllowedThreshold.toFixed(2)} mm
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">เจียรได้รวมสูงสุด</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm">
                      {maxGrindAllowance.toFixed(2)} mm
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">รอบเจียรสูงสุด</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm">
                      {maxAllowedCycles} ครั้ง
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Measurement & Calculation Inputs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-sm">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>2. บันทึกค่าการวัด & คำนวณความยาว (Dimensional Input & Calculation)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Previous Length */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ความยาวก่อนเจียรล่าสุด (L-prev) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="200.00"
                    value={previousLength}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPreviousLength(val);
                      if (manualRemainingLength === null) {
                        setManualRemainingLength(Number(Math.max(0, val - grindDepth).toFixed(2)));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">mm</span>
                </div>
              </div>

              {/* Cycle Count */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รอบการเจียรครั้งนี้ (Regrind Cycle) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={currentCycleCount}
                    onChange={e => setCurrentCycleCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    / {maxAllowedCycles} ครั้ง
                  </span>
                </div>
              </div>

              {/* Grind Depth Removed */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ระยะที่เจียรออก (Delta-L Grind) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="5.00"
                    value={grindDepth}
                    onChange={e => handleGrindDepthChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-cyan-400 dark:border-cyan-600 font-mono font-bold text-cyan-700 dark:text-cyan-300 focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">mm</span>
                </div>
                {/* Quick depth presets */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">พรีเซ็ต:</span>
                  {[0.10, 0.15, 0.20, 0.25, 0.30, 0.50].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleGrindDepthChange(d)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                        Math.abs(grindDepth - d) < 0.001
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {d.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remaining Length Result */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ความยาวคงเหลือหลังเจียร (L-curr) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="200.00"
                    value={calculatedRemainingLength}
                    onChange={e => handleManualRemainingChange(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 text-xs rounded-xl font-mono font-black border focus:ring-2 outline-none ${
                      isBelowMinThreshold
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 focus:ring-emerald-500'
                    }`}
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">mm</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  * คำนวณจาก (L-prev - Delta-L Grind) หรือป้อนค่าจากการวัดจริง
                </span>
              </div>
            </div>

            {/* Shim Compensation */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                แผ่นชิมหนุนชดเชยความสูง (Shim Plate Compensation)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  step="0.01"
                  value={shimThickness}
                  onChange={e => setShimThickness(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
                <span className="absolute right-3 top-1.5 text-slate-400 font-mono text-xs">mm</span>
              </div>
            </div>
          </div>

          {/* Tool Material Selection (SKD11, Carbide, etc.) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 shadow-sm">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>3. ประเภทวัสดุชิ้นงาน (Tool Material Type)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MATERIAL_OPTIONS.map(opt => {
                const isSelected = !isCustomMaterial && toolMaterial === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setToolMaterial(opt.id);
                      setIsCustomMaterial(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-500 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
                    </div>
                    <span className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 block">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCustomMaterial(!isCustomMaterial);
                  if (!isCustomMaterial) setToolMaterial('CUSTOM');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  isCustomMaterial
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                + ระบุเกรดวัสดุอื่นๆ
              </button>

              {isCustomMaterial && (
                <input
                  type="text"
                  value={customMaterialText}
                  onChange={e => setCustomMaterialText(e.target.value)}
                  placeholder="เช่น SKH-51, Tungsten Alloy, V4"
                  className="flex-1 px-3 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-amber-400 text-amber-900 dark:text-amber-200 font-bold"
                />
              )}
            </div>
          </div>

          {/* Technicians & Inspector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อช่างผู้ดำเนินการเจียร (Technician)
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ผู้ตรวจสอบคุณภาพ (QC / Inspector)
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={e => setVerifiedBy(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Evaluation & Scrap Matrix Dashboard (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Validation Result Card */}
          <div className={`rounded-2xl border p-4 space-y-4 shadow-sm transition-all ${
            isBelowMinThreshold
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
              : isCycleExceeded
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : isNearThresholdWarning
              ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>ผลการตรวจสอบมาตรฐาน (Standard Verdict)</span>
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                isBelowMinThreshold
                  ? 'bg-rose-600 text-white'
                  : isCycleExceeded
                  ? 'bg-amber-600 text-white'
                  : isNearThresholdWarning
                  ? 'bg-yellow-500 text-slate-950'
                  : 'bg-emerald-600 text-white'
              }`}>
                {isBelowMinThreshold
                  ? 'SCRAP REQUIRED'
                  : isCycleExceeded
                  ? 'MAX CYCLES REACHED'
                  : isNearThresholdWarning
                  ? 'NEAR LIMIT WARNING'
                  : 'PASS / IN-SPEC'}
              </span>
            </div>

            {/* Main Verdict Big Indicator */}
            <div className="text-center py-2">
              <div className={`text-3xl font-black font-mono tracking-tight ${
                isBelowMinThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {calculatedRemainingLength.toFixed(2)} <span className="text-sm font-sans font-normal">mm</span>
              </div>
              <p className="text-xs mt-1 font-semibold text-slate-600 dark:text-slate-300">
                {isBelowMinThreshold ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    ⚠️ ต่ำกว่าเกณฑ์ขั้นต่ำ {minAllowedThreshold.toFixed(2)} mm (-{Math.abs(remainingGrindingMargin).toFixed(2)} mm)
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✅ ผ่านเกณฑ์มาตรฐาน (เหนือลิมิต +{remainingGrindingMargin.toFixed(2)} mm)
                  </span>
                )}
              </p>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-rose-600 dark:text-rose-400">Min: {minAllowedThreshold.toFixed(2)} mm</span>
                <span className="text-slate-600 dark:text-slate-400">Life: {healthPercentage}%</span>
                <span className="text-slate-700 dark:text-slate-300">Nominal: {nominalLength.toFixed(2)} mm</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                {/* Min spec mark */}
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(5, healthPercentage))}%`,
                    backgroundColor: isBelowMinThreshold ? '#e11d48' : healthPercentage < 30 ? '#eab308' : '#10b981'
                  }}
                />
              </div>
            </div>

            {/* Calculations Breakdown Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">เนื้อที่เจียรสะสมรวม:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {cumulativeMaterialRemoved.toFixed(2)} / {maxGrindAllowance.toFixed(2)} mm
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">ระยะเจียรคงเหลือที่อนุญาต:</span>
                <strong className={`font-mono ${isBelowMinThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {remainingGrindingMargin.toFixed(2)} mm
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">รอบเจียรคงเหลือโดยประมาณ:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {remainingCyclesBeforeScrap} รอบ (จากสูงสุด {maxAllowedCycles})
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">แผ่นชิมที่แนะนำหนุนเสริม:</span>
                <strong className="font-mono text-cyan-600 dark:text-cyan-400">
                  +{shimThickness.toFixed(2)} mm
                </strong>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 space-y-2">
              {isInvalid ? (
                <button
                  type="button"
                  onClick={() => setIsAutoScrapPromptOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>ตัดทิ้งชิ้นงาน & ออกใบแจ้งจัดซื้อ (Scrap & Auto-PR)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApproveAndPass}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกผ่านเกณฑ์ & เพิ่มเข้าสต๊อกพร้อมใช้</span>
                </button>
              )}
            </div>
          </div>

          {/* Part Life Standard Matrix Reference Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>กฎเกณฑ์มาตรฐาน Part Life Standard Matrix</span>
            </div>
            <ul className="space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span><strong>Rule 1:</strong> หากความยาว (L-curr) ต่ำกว่า L-min ({minAllowedThreshold} mm) ต้องถูกปรับสถานะเป็น SCRAP ทันที</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span><strong>Rule 2:</strong> เมื่อตัดทิ้ง ระบบจะสร้างใบขอสั่งซื้อ (PR Requisition) ไปยังฝ่ายจัดซื้อเพื่อรักษาระดับ Safety Stock</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-600 font-bold">•</span>
                <span><strong>Rule 3:</strong> เมื่อผ่านเกณฑ์ ระบบจะเพิ่มจำนวน Spare Stock +1 ในคลังอัตโนมัติ</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AUTOMATIC PROMPT TO SCRAP MODAL */}
      {isAutoScrapPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0F172A] text-slate-100 border-2 border-rose-600 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-3 rounded-2xl bg-rose-600/30 border border-rose-500 text-rose-400">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  แจ้งเตือนตัดทิ้งอัตโนมัติ (Automatic Scrap Prompt)
                </h3>
                <p className="text-xs text-rose-300 font-medium mt-0.5">
                  ตรวจพบขนาดต่ำกว่าเกณฑ์ Part Life Standard Matrix
                </p>
              </div>
            </div>

            <div className="bg-rose-950/50 border border-rose-700/80 rounded-xl p-3.5 text-xs space-y-2 text-rose-200">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>สาเหตุที่ต้องตัดทิ้ง (Scrap Trigger Reason):</span>
              </div>
              <p className="text-[11.5px] leading-relaxed">
                {isBelowMinThreshold && (
                  <span>
                    • ความยาวปัจจุบัน <strong>{calculatedRemainingLength.toFixed(2)} mm</strong> ต่ำกว่าพิกัดจำกัดขั้นต่ำ (Min Spec) ที่กำหนดไว้ <strong>{minAllowedThreshold.toFixed(2)} mm</strong> ใน Part Life Standard Matrix
                  </span>
                )}
                {isCycleExceeded && (
                  <span className="block mt-1">
                    • จำนวนรอบเจียร <strong>{currentCycleCount} ครั้ง</strong> เกินขีดจำกัดสูงสุด (Max Cycles) ที่อนุญาต <strong>{maxAllowedCycles} ครั้ง</strong>
                  </span>
                )}
              </p>
              <div className="text-[11px] pt-1 text-slate-300 border-t border-rose-900/60 font-mono">
                ชิ้นส่วน: {activeMaster.partName} ({activeMaster.partCode}) | ไลน์ {lineId}
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-300">กระบวนการที่จะเกิดขึ้นอัตโนมัติ:</div>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>1. ปรับสถานะใบงานเป็น <strong>"SCRAP (ทิ้ง/หมดสเปค)"</strong></li>
                <li>2. ส่งใบขอสั่งซื้อทดแทน (PR) จำนวน 10 ชิ้น ไปยังฝ่ายจัดซื้ออัตโนมัติ</li>
                <li>3. บันทึกประวัติ Defect Code: <strong>OUT_OF_TOLERANCE</strong> และลงบันทึก Audit Log</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAutoScrapPromptOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                ย้อนกลับไปแก้ไขค่า
              </button>
              <button
                type="button"
                onClick={handleConfirmScrapAction}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50 flex items-center gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>ยืนยันตัดทิ้ง & ออกใบ PR ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
