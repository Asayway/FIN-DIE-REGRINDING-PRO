import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  RotateCcw,
  Ruler,
  Layers
} from 'lucide-react';
import { UnifiedPartMasterRow } from '../../views/PartMasterView';
import { useLanguage } from '../../i18n/LanguageContext';

interface PartRegrindLadderModalProps {
  isOpen: boolean;
  onClose: () => void;
  partRow: UnifiedPartMasterRow | null;
}

const extractStepNumbers = (raw?: string | number | null): number[] => {
  if (raw === undefined || raw === null) return [];
  const matches = String(raw).match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter(n => Number.isFinite(n) && n > 0);
};

export const PartRegrindLadderModal: React.FC<PartRegrindLadderModalProps> = ({
  isOpen,
  onClose,
  partRow
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const perGrindRaw = String(partRow?.regrindStandard?.perGrindMm ?? '').trim();
  const parsedSteps = useMemo(() => extractStepNumbers(perGrindRaw), [perGrindRaw]);
  const hasRangeSteps = parsedSteps.length >= 2;
  const minStep = parsedSteps.length > 0 ? Math.min(...parsedSteps) : 0.10;
  const maxStep = parsedSteps.length > 0 ? Math.max(...parsedSteps) : 0.10;
  const avgStep = hasRangeSteps ? Number(((minStep + maxStep) / 2).toFixed(3)) : minStep;

  const [selectedStepMm, setSelectedStepMm] = useState<number>(minStep);

  useEffect(() => {
    setSelectedStepMm(minStep);
  }, [partRow?.partCode, minStep]);

  if (!isOpen || !partRow) return null;

  const newSpecNum = typeof partRow.newSpecMm === 'number'
    ? partRow.newSpecMm
    : parseFloat(String(partRow.shotLifeCycle?.partsSpec || '0').replace(/[^0-9.]/g, '')) || 0;

  const scrapLimitNum = typeof partRow.scrapLimitMm === 'number'
    ? partRow.scrapLimitMm
    : parseFloat(String(partRow.shotLifeCycle?.lowerSpecScrapLimit || '0').replace(/[^0-9.]/g, '')) || 0;

  const lowerPerGrind = perGrindRaw.toLowerCase();
  const isNonRegrindable =
    lowerPerGrind.includes('dispose') ||
    perGrindRaw === '-' ||
    partRow.maintenanceType === 'DISPOSE' ||
    newSpecNum <= 0;

  const actualAllowableGrind = isNonRegrindable ? 0 : Math.max(0, Number((newSpecNum - scrapLimitNum).toFixed(4)));
  const stdTotalRaw = partRow.regrindStandard?.totalGrindMm;
  const stdTotalParsed = stdTotalRaw !== undefined && stdTotalRaw !== null && String(stdTotalRaw).trim() !== '-'
    ? parseFloat(String(stdTotalRaw))
    : NaN;
  const stdTotalNum = Number.isFinite(stdTotalParsed) ? stdTotalParsed : actualAllowableGrind;

  const isSpecMatched = isNonRegrindable || Math.abs(actualAllowableGrind - stdTotalNum) <= 0.015;
  const activeStep = selectedStepMm > 0 ? selectedStepMm : minStep;

  // Compute exact cycle limits (floating-point safe via + 1e-6)
  const theoreticalMaxCycles = (isNonRegrindable || activeStep <= 0 || actualAllowableGrind <= 0)
    ? 0
    : Math.floor(actualAllowableGrind / activeStep + 1e-6);

  const minCyclesAtMaxStep = (isNonRegrindable || maxStep <= 0 || actualAllowableGrind <= 0)
    ? 0
    : Math.floor(actualAllowableGrind / maxStep + 1e-6);
  const maxCyclesAtMinStep = (isNonRegrindable || minStep <= 0 || actualAllowableGrind <= 0)
    ? 0
    : Math.floor(actualAllowableGrind / minStep + 1e-6);

  const stdCyclesDisplay = String(partRow.regrindStandard?.regrindCycles ?? '-');
  const stdCycleBounds = extractStepNumbers(stdCyclesDisplay);
  const stdPracticalMin = stdCycleBounds.length > 0 ? Math.min(...stdCycleBounds) : null;
  const stdPracticalMax = stdCycleBounds.length > 0 ? Math.max(...stdCycleBounds) : null;

  const tubeBadge = partRow.partName.includes('Ø5')
    ? 'Ø5 mm'
    : partRow.partName.includes('Ø7')
      ? 'Ø7 mm'
      : 'Standard Tooling';

  const rowLimit = Math.min(40, theoreticalMaxCycles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#121316] border border-[#00FF00]/40 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#1a1b1e] border-b border-[#2d2e38]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/30 text-[#00FF00]">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#00FF00] bg-[#00FF00]/10 px-2 py-0.5 rounded border border-[#00FF00]/30">
                  {partRow.stage}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  DWG: {partRow.drawingNo || partRow.partCode}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isNonRegrindable
                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isNonRegrindable ? 'DISPOSE / NON-REGRIND' : 'STANDARD REGRIND MATRIX'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide mt-0.5 flex items-center gap-2">
                {partRow.partName}
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({tubeBadge})
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#22222a] hover:bg-[#333340] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title={isEn ? 'Close' : 'ปิดหน้าต่าง (Close)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content: Calculation Ladder & Standard Spec Audit */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#0d0e11] space-y-4">

          {/* Standard Re-Grinding Audit Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 font-mono">
            <div className="bg-[#14151a] border border-emerald-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">New Spec (L₀)</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {newSpecNum > 0 ? `${newSpecNum.toFixed(2)} mm` : '-'}
              </div>
            </div>

            <div className="bg-[#14151a] border border-amber-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">Scrap Limit (L<sub>min</sub>)</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {scrapLimitNum > 0 ? `${scrapLimitNum.toFixed(2)} mm` : '-'}
              </div>
            </div>

            <div className="bg-[#14151a] border border-purple-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">1 Time Step (Δl)</div>
              <div className="text-base font-bold text-purple-300 mt-0.5">
                {isNonRegrindable ? (perGrindRaw || 'Dispose') : `${perGrindRaw} mm`}
              </div>
            </div>

            <div className="bg-[#14151a] border border-cyan-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">{isEn ? 'L₀ − L_min (Actual)' : <>L₀ − L<sub>min</sub> (จริง)</>}</div>
              <div className="text-lg font-bold text-cyan-300 mt-0.5">
                {isNonRegrindable ? '-' : `${actualAllowableGrind.toFixed(2)} mm`}
              </div>
            </div>

            <div className="bg-[#14151a] border border-[#2d2e38] rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">Standard Total</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {isNonRegrindable ? '-' : `${stdTotalNum.toFixed(2)} mm`}
              </div>
            </div>

            <div className="bg-[#14151a] border border-[#00FF00]/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase">Standard Cycles</div>
              <div className="text-base font-bold text-[#00FF00] mt-0.5">
                {stdCyclesDisplay}
              </div>
            </div>
          </div>

          {/* Spec Verification Status Strip */}
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border font-mono text-xs ${
            isNonRegrindable
              ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
              : isSpecMatched
                ? 'bg-emerald-950/25 border-emerald-500/35 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isNonRegrindable ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : isSpecMatched ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                {isNonRegrindable
                  ? isEn
                    ? `Standard specification: "${perGrindRaw || 'Dispose of after 1 use'}" — non-regrindable tooling.`
                    : `รายการนี้กำหนดมาตรฐานเป็น "${perGrindRaw || 'Dispose of after 1 use'}" — ไม่นำกลับมาเจียรลับคมซ้ำ`
                  : isSpecMatched
                    ? isEn
                      ? `Verified against Standard Re-Grinding: ${newSpecNum.toFixed(2)} − ${scrapLimitNum.toFixed(2)} = ${actualAllowableGrind.toFixed(2)} mm (matches Total ${stdTotalNum.toFixed(2)} mm)`
                      : `ตรวจสอบแล้วตรงตาม Standard Re-Grinding: ${newSpecNum.toFixed(2)} − ${scrapLimitNum.toFixed(2)} = ${actualAllowableGrind.toFixed(2)} mm (ตรงกับ Total ${stdTotalNum.toFixed(2)} mm)`
                    : isEn
                      ? `Spec Mismatch Warning: L₀ − L_min (${actualAllowableGrind.toFixed(2)} mm) ≠ Total (${stdTotalNum.toFixed(2)} mm)`
                      : `คำเตือนสเปกไม่ตรงกัน: L₀ − L_min (${actualAllowableGrind.toFixed(2)} mm) ≠ Total (${stdTotalNum.toFixed(2)} mm)`}
              </span>
            </div>

            {!isNonRegrindable && (
              <div className="text-[11px] text-slate-300">
                {hasRangeSteps
                  ? isEn
                    ? `Calculated Range: ${minCyclesAtMaxStep}–${maxCyclesAtMinStep} cycles | Standard: ${stdCyclesDisplay}`
                    : `ช่วงตามคณิตศาสตร์: ${minCyclesAtMaxStep}–${maxCyclesAtMinStep} รอบ | ใช้จริงตาม Standard: ${stdCyclesDisplay}`
                  : isEn
                    ? `Max Calculated Cycles: ${theoreticalMaxCycles} cycles (Standard: ${stdCyclesDisplay})`
                    : `จำนวนรอบสูงสุดตามระยะเจียร: ${theoreticalMaxCycles} รอบ (Standard: ${stdCyclesDisplay})`}
              </div>
            )}
          </div>

          {/* Step Selector & Ladder Table */}
          {!isNonRegrindable ? (
            <div className="bg-[#14151a] border border-[#2a2b34] rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2e38] pb-3">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2 font-mono">
                    <Ruler className="w-4 h-4 text-[#00FF00]" />
                    <span>{isEn ? 'Regrind Life Cycle Step Ladder' : 'ตารางลำดับรอบการเจียรลับคม (Regrind Life Cycle Step Ladder)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEn
                      ? <>Simulates remaining length from Brand New Spec L₀ = {newSpecNum.toFixed(2)} mm down to Scrap Limit L<sub>min</sub> = {scrapLimitNum.toFixed(2)} mm</>
                      : <>จำลองค่าความยาวคงเหลือตั้งแต่พาร์ทใหม่ L₀ = {newSpecNum.toFixed(2)} mm จนถึงเกณฑ์ปลดระวาง L<sub>min</sub> = {scrapLimitNum.toFixed(2)} mm</>}
                  </p>
                </div>

                {/* Interactive Step Controls */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {hasRangeSteps && (
                    <div className="flex items-center bg-[#0a0b0d] p-1 rounded-lg border border-[#2d2e38] gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedStepMm(minStep)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          Math.abs(activeStep - minStep) < 1e-4
                            ? 'bg-[#00FF00] text-black'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Min {minStep.toFixed(2)} ({maxCyclesAtMinStep} {isEn ? 'cycles' : 'รอบ'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStepMm(avgStep)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          Math.abs(activeStep - avgStep) < 1e-4
                            ? 'bg-cyan-400 text-black'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Avg {avgStep.toFixed(3)} ({Math.floor(actualAllowableGrind / avgStep + 1e-6)} {isEn ? 'cycles' : 'รอบ'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStepMm(maxStep)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          Math.abs(activeStep - maxStep) < 1e-4
                            ? 'bg-purple-400 text-black'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Max {maxStep.toFixed(2)} ({minCyclesAtMaxStep} {isEn ? 'cycles' : 'รอบ'})
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 bg-[#0a0b0d] px-2.5 py-1 rounded-lg border border-[#2d2e38]">
                    <span className="text-slate-400 text-[11px]">{isEn ? 'Sim Δl:' : 'Δl จำลอง:'}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="2.00"
                      value={selectedStepMm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (Number.isFinite(val) && val > 0) setSelectedStepMm(val);
                      }}
                      className="w-16 bg-[#16171d] border border-[#3a3b48] rounded px-1.5 py-0.5 text-center text-[#00FF00] font-bold focus:outline-none focus:border-[#00FF00]"
                    />
                    <span className="text-slate-400 text-[11px]">mm</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStepMm(minStep)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title={isEn ? 'Reset to initial grind step' : 'รีเซ็ตค่าระยะเจียรเริ่มต้น'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step Ladder Matrix Table */}
              <div className="overflow-x-auto rounded-lg border border-[#2d2e38]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1a1b22] text-slate-300 uppercase text-[10px] border-b border-[#2d2e38]">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16 whitespace-nowrap">{isEn ? 'Cycle #' : 'รอบที่'}</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">{isEn ? 'Part Status / Grind Cycle' : 'สถานะพาร์ท / รอบการเจียร'}</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">{isEn ? 'Post-Grind Length (L)' : 'ความยาวหลังเจียร (L)'}</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">{isEn ? 'Removal / Step (Δl)' : 'เจียรครั้งละ (Δl)'}</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">{isEn ? 'Cumulative Removal (Σ Δl)' : 'เจียรสะสม (Σ Δl)'}</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">{isEn ? 'Margin to Scrap Limit' : 'ระยะถึง Scrap Limit'}</th>
                      <th className="py-2.5 px-3 text-center min-w-[175px] whitespace-nowrap">{isEn ? 'Condition Assessment' : 'การประเมินสภาพ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262732] bg-[#101115]">
                    {/* Cycle 0 (Brand New Part) */}
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 text-center font-bold text-[#00FF00] bg-[#00FF00]/5">0</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEn ? 'Brand New Factory Part (L₀)' : 'ชิ้นส่วนใหม่จากโรงงาน (L₀)'}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-white text-sm whitespace-nowrap">{newSpecNum.toFixed(2)} mm</td>
                      <td className="py-2 px-3 text-center text-slate-500">-</td>
                      <td className="py-2 px-3 text-center text-slate-400">0.00 mm</td>
                      <td className="py-2 px-3 text-center text-emerald-400 font-bold whitespace-nowrap">+{actualAllowableGrind.toFixed(2)} mm</td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center whitespace-nowrap text-[11px] text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/25">
                          {isEn ? 'Brand New (100%)' : 'ชิ้นส่วนใหม่ (100%)'}
                        </span>
                      </td>
                    </tr>

                    {/* Step Iterations */}
                    {Array.from({ length: rowLimit }, (_, idx) => {
                      const cycleNum = idx + 1;
                      const accumRaw = Number((cycleNum * activeStep).toFixed(4));
                      const remRaw = Number((newSpecNum - accumRaw).toFixed(4));
                      const remLen = Math.max(scrapLimitNum, remRaw);
                      const marginToScrap = Math.max(0, Number((remLen - scrapLimitNum).toFixed(4)));
                      const isAtScrapLimit = marginToScrap <= 1e-4 || cycleNum === theoreticalMaxCycles;
                      const inStdOperationalRange =
                        !isAtScrapLimit &&
                        stdPracticalMin !== null &&
                        stdPracticalMax !== null &&
                        cycleNum >= stdPracticalMin &&
                        cycleNum <= stdPracticalMax;
                      const isPastStdOperationalRange =
                        !isAtScrapLimit &&
                        stdPracticalMax !== null &&
                        cycleNum > stdPracticalMax;

                      return (
                        <tr
                          key={cycleNum}
                          className={`hover:bg-white/5 transition-colors ${
                            isAtScrapLimit
                              ? 'bg-amber-500/10'
                              : inStdOperationalRange
                                ? 'bg-cyan-500/5'
                                : isPastStdOperationalRange
                                  ? 'bg-orange-500/5'
                                  : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-bold text-slate-200">{cycleNum}</td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                            {isAtScrapLimit ? (
                              <strong className="text-amber-400 font-bold">
                                {isEn ? 'Final Allowable Regrind Cycle' : 'เจียรครั้งสุดท้ายที่สเปกยอมรับ'}
                              </strong>
                            ) : (
                              isEn ? `Regrind Cycle #${cycleNum}` : `เจียรลับคมครั้งที่ ${cycleNum}`
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-purple-300 text-sm whitespace-nowrap">
                            {remLen.toFixed(2)} mm
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400 whitespace-nowrap">
                            -{activeStep.toFixed(Math.round(activeStep * 1000) % 10 === 0 ? 2 : 3)} mm
                          </td>
                          <td className="py-2 px-3 text-center text-cyan-300 whitespace-nowrap">
                            {accumRaw.toFixed(2)} mm
                          </td>
                          <td className={`py-2 px-3 text-center font-bold whitespace-nowrap ${
                            marginToScrap <= activeStep + 1e-4 ? 'text-amber-400' : 'text-emerald-300'
                          }`}>
                            +{marginToScrap.toFixed(2)} mm
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {isAtScrapLimit ? (
                              <span
                                className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-amber-300 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/35"
                                title={isEn ? `Reached minimum length L_min = ${scrapLimitNum.toFixed(2)} mm` : `ความยาวถึงค่าต่ำสุด L_min = ${scrapLimitNum.toFixed(2)} mm แล้ว`}
                              >
                                {isEn ? '⚠️ Scrap Limit' : '⚠️ ถึง Scrap Limit'}
                              </span>
                            ) : inStdOperationalRange ? (
                              <span
                                className="inline-flex items-center whitespace-nowrap text-[11px] text-cyan-300 font-bold bg-cyan-500/15 px-2.5 py-0.5 rounded border border-cyan-500/30"
                                title={isEn ? `Standard replacement window (${stdCyclesDisplay})` : `เกณฑ์รอบเปลี่ยนตาม Standard (${stdCyclesDisplay})`}
                              >
                                {isEn ? 'Std Replace Window' : 'เกณฑ์เปลี่ยน Standard'}
                              </span>
                            ) : isPastStdOperationalRange ? (
                              <span
                                className="inline-flex items-center whitespace-nowrap text-[11px] text-orange-300 font-semibold bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/25"
                                title={isEn ? `Beyond recommended Standard (${stdCyclesDisplay}) but above L_min` : `เกินรอบแนะนำ Standard (${stdCyclesDisplay}) แต่ความยาวยังไม่ถึง L_min`}
                              >
                                {isEn ? 'Over Std Cycles' : 'เกินรอบ Standard'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center whitespace-nowrap text-[11px] text-emerald-300/90 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                {isEn ? 'In-Spec / Normal' : 'ใช้งานได้ปกติ'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Scrap Row */}
                    <tr className="bg-rose-500/10 hover:bg-rose-500/15 transition-colors">
                      <td className="py-2 px-3 text-center font-bold text-rose-400 bg-rose-500/10">&gt; {theoreticalMaxCycles}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEn ? <>Below L<sub>min</sub> / Scrap</> : <>ต่ำกว่า L<sub>min</sub> / ปลดระวาง</>}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-rose-400 text-sm whitespace-nowrap">&lt; {scrapLimitNum.toFixed(2)} mm</td>
                      <td className="py-2 px-3 text-center text-rose-300">-</td>
                      <td className="py-2 px-3 text-center text-rose-300 whitespace-nowrap">&gt; {actualAllowableGrind.toFixed(2)} mm</td>
                      <td className="py-2 px-3 text-center text-rose-400 font-bold whitespace-nowrap">0.00 mm</td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center whitespace-nowrap text-[11px] text-rose-300 font-bold bg-rose-500/15 px-2.5 py-0.5 rounded border border-rose-500/30">
                          {isEn ? '❌ Scrap (< L_min)' : '❌ ปลดระวาง (< L_min)'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#14151a] border border-[#2a2b34] rounded-xl p-6 text-center space-y-3 font-mono">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Disposable / Non-Regrindable Tooling' : 'ชิ้นส่วนประเภทใช้แล้วทิ้ง / ไม่มีรอบการเจียรซ้ำ (Non-Regrindable Tooling)'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                {isEn
                  ? <>Per Standard Re-Grinding table, this part is specified as: <strong className="text-rose-300">{perGrindRaw || 'Dispose of after 1 use'}</strong> — no regrind cycle table applies (Note: {(partRow.regrindStandard?.note || '-').replace(/\s*\([^)]*[\u0E00-\u0E7F][^)]*\)/g, '').trim() || '-'})</>
                  : <>ตามตาราง Standard Re-Grinding ชิ้นส่วนนี้มีข้อกำหนด: <strong className="text-rose-300">{perGrindRaw || 'Dispose of after 1 use'}</strong> จึงไม่มีตารางลดความยาวจากการเจียรลับคม (หมายเหตุ: {partRow.regrindStandard?.note || '-'})</>}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#18191c] border-t border-[#2d2e38] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00FF00]" />
            <span>Fin Die Tooling Specification Standard Rev 2025 — Regrind Cycle Verification</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#25262c] hover:bg-[#32333b] text-white font-bold rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            {isEn ? 'Close' : 'ปิดหน้าต่าง'}
          </button>
        </div>

      </div>
    </div>
  );
};

// Backwards-compatible alias
export const Part3DBlueprintModal = PartRegrindLadderModal;
