import * as XLSX from 'xlsx';
import { ShotEntryRecord, ReplacementRecord, RegrindingRecord, LineActiveConfiguration } from '../types';

/**
 * Utility to save an XLSX workbook as a downloadable Excel file
 */
export function saveWorkbookAsExcel(workbook: XLSX.WorkBook, fileName: string) {
  const finalFileName = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') 
    ? fileName 
    : `${fileName}.xlsx`;
  
  XLSX.writeFile(workbook, finalFileName, { bookType: 'xlsx' });
}

/**
 * Export Shot Production History to Excel (.xlsx)
 */
export function exportShotProductionExcel(
  records: ShotEntryRecord[],
  lineFilter: string = 'ALL'
) {
  const data = records.map((rec, index) => ({
    'NO.': index + 1,
    'RECORD ID': rec.id,
    'LINE': `LINE ${rec.lineId}`,
    'PRODUCTION DATE': rec.productionDate || 'N/A',
    'SHIFT': rec.shift || 'N/A',
    'TIME OF RECORD': rec.timestamp ? new Date(rec.timestamp).toLocaleString('th-TH') : 'N/A',
    'ENTRY METHOD': rec.entryType || rec.inputMethod || 'MANUAL',
    'PREVIOUS SHOT': rec.previousTotal ?? 0,
    'INCREMENT SHOT': rec.shotsAdded ?? 0,
    'NEW TOTAL SHOT': rec.newTotal ?? 0,
    'OPERATOR': rec.operatorName || 'N/A',
    'REASON / REMARK': rec.entryReason || rec.notes || 'Normal Production Log'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 20 }, // RECORD ID
    { wch: 12 }, // LINE
    { wch: 16 }, // PRODUCTION DATE
    { wch: 14 }, // SHIFT
    { wch: 22 }, // TIME OF RECORD
    { wch: 14 }, // ENTRY METHOD
    { wch: 16 }, // PREVIOUS SHOT
    { wch: 16 }, // INCREMENT SHOT
    { wch: 18 }, // NEW TOTAL SHOT
    { wch: 20 }, // OPERATOR
    { wch: 30 }, // REASON / REMARK
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shot Production History');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Shot_Production_History_${lineFilter}_${dateStr}.xlsx`);
}

/**
 * Export Maintenance & Replacement History to Excel (.xlsx)
 */
export function exportReplacementHistoryExcel(
  records: ReplacementRecord[],
  lineFilter: string = 'ALL'
) {
  const data = records.map((rec, index) => ({
    'NO.': index + 1,
    'RECORD ID': rec.id,
    'WORK ORDER NO.': rec.workOrderNumber || 'N/A',
    'LINE': `LINE ${rec.lineId}`,
    'COMPONENT / PART': rec.partName,
    'PART CODE': rec.partCode || 'N/A',
    'STAGE': rec.stageName || 'N/A',
    'SCOPE / TYPE': rec.replacementType || 'FULL SET REPLACEMENT',
    'CHANGED QTY': rec.changedQuantity || rec.replacedQty || 1,
    'TOTAL INSTALLED QTY': rec.installedQuantity || rec.installQtyTotal || 1,
    'MACHINE SHOT AT CHANGE': rec.machineShotAtReplacement ?? rec.shotAtChange ?? 0,
    'REMOVED PART ACCUM SHOT': rec.removedPartUsedShot ?? rec.partAccumulatedShots ?? 0,
    'REMOVED PART ACCUM CYCLE': rec.removedPartRegrindCount ?? rec.regrindCycleCount ?? 0,
    'NEW LOT / SERIAL': `${rec.newPartLotNumber || 'N/A'} / ${rec.newPartSerialNumber || 'N/A'}`,
    'DATE & TIME': rec.timestamp ? new Date(rec.timestamp).toLocaleString('th-TH') : 'N/A',
    'REASON FOR REPLACEMENT': rec.replacementReason || rec.reason || 'Periodic EOL Change',
    'TECHNICIAN / OPERATOR': rec.changedBy || rec.operatorName || 'N/A',
    'STATUS': rec.approvalStatus || 'COMPLETED',
    'NOTES': rec.note || rec.remarks || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 18 }, // RECORD ID
    { wch: 16 }, // WORK ORDER
    { wch: 10 }, // LINE
    { wch: 24 }, // COMPONENT
    { wch: 16 }, // PART CODE
    { wch: 22 }, // STAGE
    { wch: 22 }, // SCOPE
    { wch: 12 }, // CHANGED QTY
    { wch: 12 }, // TOTAL QTY
    { wch: 18 }, // MACHINE SHOT
    { wch: 18 }, // REMOVED PART SHOT
    { wch: 12 }, // ACCUM CYCLE
    { wch: 22 }, // LOT / SERIAL
    { wch: 20 }, // DATE & TIME
    { wch: 28 }, // REASON
    { wch: 20 }, // OPERATOR
    { wch: 14 }, // STATUS
    { wch: 24 }, // NOTES
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tooling Replacements');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Tooling_Replacement_History_${lineFilter}_${dateStr}.xlsx`);
}

/**
 * Export Re-grinding & Sharpening Ledger to Excel (.xlsx)
 */
export function exportRegrindingHistoryExcel(
  records: RegrindingRecord[],
  lineFilter: string = 'ALL'
) {
  const data = records.map((rec, index) => {
    const drawingNo = rec.drawingNo || rec.drawingNumber || (rec.partCode ? rec.partCode.replace(/^[A-Z0-9]+-/, '') : 'DWG-PB-001');
    const qty = rec.quantity || 1;
    const newSpec = rec.newSpecMm !== undefined ? rec.newSpecMm : 62.50;
    const currentH = rec.previousLength !== undefined ? rec.previousLength : (rec.beforeGrindMm || 62.50);
    const afterH = rec.currentLength !== undefined ? rec.currentLength : (rec.afterGrindMm || 62.40);
    const scrapLimit = rec.scrapLimitMm !== undefined ? rec.scrapLimitMm : 61.00;

    const reasonLabel = rec.defectReason 
      ? (rec.defectReason === 'NORMAL_WEAR' ? 'NORMAL WEAR'
        : rec.defectReason === 'BURR_EXCESSIVE' ? 'BURR EXCESSIVE'
        : rec.defectReason === 'CHIPPED' ? 'CHIPPED'
        : rec.defectReason === 'GALLING_SCRATCHED' ? 'GALLING SCRATCHED'
        : rec.defectReason === 'OUT_OF_TOLERANCE' ? 'OUT OF TOLERANCE'
        : rec.defectReason === 'BROKEN' ? 'BROKEN'
        : rec.defectReason)
      : 'NORMAL WEAR';

    const laborMinutes = rec.laborTimeMinutes !== undefined
      ? rec.laborTimeMinutes
      : Math.round((rec.laborHours !== undefined ? rec.laborHours : 1) * 60);

    const laborCost = rec.laborCostThb !== undefined
      ? rec.laborCostThb
      : Math.round((laborMinutes / 60) * 180);

    const newPrice = rec.newPartPriceThb !== undefined ? rec.newPartPriceThb : 12500;
    const spareCost = rec.sparePartsCost !== undefined ? Number(rec.sparePartsCost) : 0;
    const netSaving = rec.netSavingThb !== undefined
      ? rec.netSavingThb
      : Math.max(0, newPrice - (laborCost + spareCost));

    const savingPct = rec.savingPercent !== undefined
      ? (typeof rec.savingPercent === 'number' ? `${rec.savingPercent.toFixed(1)}%` : rec.savingPercent)
      : (newPrice > 0 ? `${((netSaving / newPrice) * 100).toFixed(1)}%` : '0%');

    const operator = rec.performedBy || rec.technicianName || 'Thanakorn Phonpayung';
    const noteText = rec.note || rec.remarks || 'ลับคมด้วยหิน CBN #400';

    return {
      'NO.': index + 1,
      'สถานะ Status': rec.status || 'READY TO USE',
      'Job Code': rec.jobCode,
      'วันที่': rec.regrindDate || (rec.timestamp ? rec.timestamp.substring(0, 10) : 'N/A'),
      'ไลน์': rec.lineId ? `LINE ${rec.lineId}` : 'ALL',
      'แม่พิมพ์ CODE': rec.dieCode || rec.finDie || 'FD-E1-07',
      'ชื่อชิ้นงาน': rec.partName,
      'Drawing Code': drawingNo,
      'จำนวนงานที่ส่งเจียร': `${qty} ชิ้น`,
      'ระยะสเปคความสูง ซื้อใหม่ (mm)': newSpec.toFixed(2),
      'ความสูง ปัจจุบัน (mm)': currentH.toFixed(2),
      'ความสูง หลังเจียร (mm)': afterH.toFixed(2),
      'ระยะ Min หรือระยะที่คัดทิ้ง (mm)': scrapLimit.toFixed(2),
      'สาเหตุการส่งเจียร': reasonLabel,
      'เวลาแรงงานเจียร (นาที)': `${laborMinutes} นาที`,
      'ค่าแรงงาน labor cost (฿)': laborCost,
      'ราคาซื้อชิ้นงานใหม่ (฿)': newPrice,
      'ส่วนต่างที่ประหยัดได้ (฿)': netSaving,
      'เปอร์เซ็น ที่ ประหยัด %': savingPct,
      'ชื่อช่างผู้รับผิดชอบ': operator,
      'หมายเหตุ /รายละเอียดเพิ่มเติม': noteText
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 22 }, // STATUS
    { wch: 20 }, // JOB CODE
    { wch: 14 }, // DATE
    { wch: 10 }, // LINE
    { wch: 18 }, // DIE CODE
    { wch: 24 }, // PART NAME
    { wch: 18 }, // DRAWING CODE
    { wch: 20 }, // QTY
    { wch: 24 }, // NEW SPEC MM
    { wch: 22 }, // CURRENT H MM
    { wch: 22 }, // AFTER H MM
    { wch: 26 }, // SCRAP LIMIT MM
    { wch: 22 }, // REASON
    { wch: 22 }, // LABOR MINUTES
    { wch: 22 }, // LABOR COST
    { wch: 22 }, // NEW PRICE
    { wch: 24 }, // NET SAVING
    { wch: 22 }, // SAVING %
    { wch: 24 }, // OPERATOR
    { wch: 30 }, // REMARKS
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unified Master Logs');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Unified_Master_Logs_${lineFilter}_${dateStr}.xlsx`);
}

/**
 * Export All-in-One Comprehensive Master Excel Report (.xlsx)
 */
export function exportAllInOneMasterExcel(
  shotLogs: ShotEntryRecord[],
  replacements: ReplacementRecord[],
  regrinds: RegrindingRecord[],
  lineConfigs: LineActiveConfiguration[],
  auditLogs?: any[]
) {
  const workbook = XLSX.utils.book_new();

  // 1. Line & Die Overview Sheet
  const lineData = lineConfigs.map((cfg, idx) => ({
    'NO.': idx + 1,
    'LINE ID': `LINE ${cfg.lineId}`,
    'STATUS': cfg.machineId || (cfg.isActive ? 'ACTIVE' : 'INACTIVE'),
    'DIE CODE': cfg.dieCode || 'N/A',
    'DIE NAME': cfg.dieName || cfg.mainFinDie || 'N/A',
    'TUBE SIZE': cfg.tubeSize || 'Ø7',
    'FIN TYPE': cfg.finType || 'Slit Old',
    'PITCH / PATHS': cfg.pathsCount || '3P (Pitch)',
    'MATERIAL': `${cfg.material || 'PCM'} (${cfg.thicknessMm || 0.10}mm)`,
    'EFFECTIVE FROM': cfg.effectiveFrom ? new Date(cfg.effectiveFrom).toLocaleString('th-TH') : 'N/A'
  }));
  const wsLines = XLSX.utils.json_to_sheet(lineData);
  wsLines['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 28 },
    { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsLines, 'Line & Die Status');

  // 2. Shot Production History Sheet
  const shotData = shotLogs.map((rec, idx) => ({
    'NO.': idx + 1,
    'RECORD ID': rec.id,
    'LINE': `LINE ${rec.lineId}`,
    'PRODUCTION DATE': rec.productionDate || 'N/A',
    'SHIFT': rec.shift || 'N/A',
    'PREVIOUS SHOT': rec.previousTotal ?? 0,
    'INCREMENT SHOT': rec.shotsAdded ?? 0,
    'NEW TOTAL SHOT': rec.newTotal ?? 0,
    'ENTRY METHOD': rec.entryType || rec.inputMethod || 'MANUAL',
    'OPERATOR': rec.operatorName || 'N/A',
    'TIMESTAMP': rec.timestamp ? new Date(rec.timestamp).toLocaleString('th-TH') : 'N/A'
  }));
  const wsShots = XLSX.utils.json_to_sheet(shotData);
  wsShots['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsShots, 'Shot Production');

  // 3. Tooling Replacements Sheet
  const repData = replacements.map((rec, idx) => ({
    'NO.': idx + 1,
    'RECORD ID': rec.id,
    'WORK ORDER': rec.workOrderNumber || 'N/A',
    'LINE': `LINE ${rec.lineId}`,
    'COMPONENT': rec.partName,
    'PART CODE': rec.partCode || 'N/A',
    'STAGE': rec.stageName || 'N/A',
    'SCOPE': rec.replacementType || 'FULL SET REPLACEMENT',
    'QTY': rec.changedQuantity || rec.replacedQty || 1,
    'MACHINE SHOT': rec.machineShotAtReplacement ?? rec.shotAtChange ?? 0,
    'REMOVED PART SHOT': rec.removedPartUsedShot ?? rec.partAccumulatedShots ?? 0,
    'CYCLE': rec.removedPartRegrindCount ?? rec.regrindCycleCount ?? 0,
    'NEW LOT / SERIAL': `${rec.newPartLotNumber || 'N/A'} / ${rec.newPartSerialNumber || 'N/A'}`,
    'DATE': rec.timestamp ? new Date(rec.timestamp).toLocaleString('th-TH') : 'N/A',
    'OPERATOR': rec.changedBy || rec.operatorName || 'N/A',
    'STATUS': rec.approvalStatus || 'COMPLETED'
  }));
  const wsReps = XLSX.utils.json_to_sheet(repData);
  wsReps['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
    { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 8 },
    { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsReps, 'Part Replacements');

  // 4. Regrinding Ledger Sheet
  const rgdData = regrinds.map((rec, idx) => ({
    'NO.': idx + 1,
    'JOB CODE': rec.jobCode,
    'WORK ORDER': rec.workOrder || 'N/A',
    'DATE': rec.regrindDate || rec.sentDate || 'N/A',
    'LINE': rec.lineId ? `LINE ${rec.lineId}` : 'ALL',
    'COMPONENT': rec.partName,
    'PART CODE': rec.partCode,
    'INSTANCE / LOT': rec.partInstanceOrLot || rec.serialNumber || 'N/A',
    'CYCLE': `#${rec.regrindCycleCount ?? 1} / ${rec.maxAllowedCycles ?? 4}`,
    'PREV (mm)': rec.previousLength ?? 0,
    'REMOVED (mm)': rec.mmRemovedThisCycle ? `-${rec.mmRemovedThisCycle}` : '0.00',
    'CURR (mm)': rec.currentLength ?? 0,
    'INSPECTION': rec.inspectionResult || rec.inspectionStatus || 'PASSED',
    'STATUS': rec.status || 'READY TO USE',
    'PROCESS': rec.supplierOrInternalProcess || 'INTERNAL_TOOL_ROOM',
    'TECHNICIAN': rec.performedBy || rec.technicianName || 'N/A'
  }));
  const wsRgd = XLSX.utils.json_to_sheet(rgdData);
  wsRgd['!cols'] = [
    { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 22 },
    { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsRgd, 'Regrinding Ledger');

  // 5. System Audit Trail Sheet (if provided)
  if (auditLogs && auditLogs.length > 0) {
    const auditData = auditLogs.map((log, idx) => ({
      'NO.': idx + 1,
      'TIMESTAMP': log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : 'N/A',
      'ACTION TYPE': log.actionType || log.action || 'N/A',
      'LINE': log.lineId ? `LINE ${log.lineId}` : 'ALL',
      'DESCRIPTION': log.description || log.details || '',
      'USER / OPERATOR': log.userName || log.operatorName || 'System',
      'IP / DEVICE': log.ipAddress || 'Internal'
    }));
    const wsAudit = XLSX.utils.json_to_sheet(auditData);
    wsAudit['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsAudit, 'Audit Trail');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Master_All_In_One_Report_${dateStr}.xlsx`);
}

/**
 * Export Shot Counter Reset History to Excel (.xlsx)
 */
export function exportResetLogsExcel(
  logs: ShotEntryRecord[],
  lineFilter: string = 'ALL'
) {
  const data = logs.map((log, idx) => ({
    'NO.': idx + 1,
    'DATE TIME (เวลาบันทึก)': log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : 'N/A',
    'LINE (สายการผลิต)': `LINE ${log.lineId}`,
    'RESETTED BY (ผู้ทำรายการ)': log.operatorName || 'System',
    'PREVIOUS SHOT (ยอดเดิม)': log.previousTotal ?? 0,
    'NEW SHOT (ยอดตั้งใหม่)': log.newTotal ?? 0,
    'RESET REASON (เหตุผลการรีเซ็ต)': log.resetReason || log.entryReason || '-',
    'APPROVAL REF (รหัสอนุมัติ)': log.resetApprovalId || log.id.slice(-8)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 22 }, // TIME
    { wch: 14 }, // LINE
    { wch: 22 }, // RESETTED BY
    { wch: 18 }, // PREVIOUS SHOT
    { wch: 18 }, // NEW SHOT
    { wch: 35 }, // RESET REASON
    { wch: 20 }, // APPROVAL REF
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reset History Logs');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Shot_Reset_History_${lineFilter}_${dateStr}.xlsx`);
}

/**
 * Export Condition Inspection Logs to Excel (.xlsx)
 */
export function exportInspectionLogsExcel(
  records: any[],
  lineFilter: string = 'ALL'
) {
  const data = records.map((rec, idx) => ({
    'NO.': idx + 1,
    'TIMESTAMP': rec.timestamp || 'N/A',
    'LINE': `LINE ${rec.lineId}`,
    'STAGE': rec.stageName,
    'BURR HEIGHT (mm)': rec.burrHeightMm ?? 0,
    'WEAR RATING': rec.visualWearRating || 1,
    'LUBRICATION': rec.lubricationStatus || 'GOOD',
    'VERDICT': rec.inspectionVerdict || 'PASS',
    'INSPECTOR': rec.inspectorName || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 20 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Logs');
  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Condition_Inspection_Logs_${lineFilter}_${dateStr}.xlsx`);
}

/**
 * Export Part Master list to Excel (.xlsx)
 * Matches table schema 100% with all 5 sections: Spec, Shot Cycles, Regrind Matrix, Pricing & Supplier
 */
export function exportPartMasterExcel(items: any[]) {
  const data = items.map((item, idx) => {
    const applicableLines = Array.isArray(item.applicableLines) && item.applicableLines.length > 0
      ? item.applicableLines.join(', ')
      : 'All Lines (E1-E5)';

    const formatMm = (val: any) => {
      if (val === undefined || val === null || val === '' || val === '-') return '-';
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
      return !isNaN(num) && num > 0 ? `${num.toFixed(2)} mm` : String(val);
    };

    const newSpecStr = formatMm(item.newSpecMm);
    const scrapLimitStr = formatMm(item.scrapLimitMm || item.shotLifeCycle?.lowerSpecScrapLimit);

    const perGrindStr = item.regrindStandard?.perGrindMm || '-';
    const totalGrindVal = item.regrindStandard?.totalGrindMm;
    const totalGrindStr = totalGrindVal && totalGrindVal !== '-' ? `${totalGrindVal} mm` : '-';
    const maxCyclesVal = item.regrindStandard?.regrindCycles ?? '-';

    const priceThbStr = item.purchasePriceThb ? `฿${Number(item.purchasePriceThb).toLocaleString()}` : '-';
    const priceUsdStr = item.purchasePriceUsd ? `$${Number(item.purchasePriceUsd).toLocaleString()}` : '-';

    return {
      'NO. (ลำดับ)': item.no || idx + 1,
      'STAGE (สเตจ)': item.stage || '-',
      'PART CODE (รหัสพาร์ท)': item.partCode || '-',
      'PART NAME (ชื่อชิ้นส่วน)': item.partName || '-',
      'DRAWING NO. (เลขที่แบบ)': item.drawingNo || item.partCode || '-',
      'INSTALLED LINES (ไลน์ที่ติดตั้ง)': applicableLines,
      'E1 (Ø7 Slit)': item.shotLifeCycle?.e1_pcm !== undefined ? `${item.shotLifeCycle.e1_pcm}M` : '-',
      'E2 (Ø5 Slit)': item.shotLifeCycle?.e2_gold !== undefined ? `${item.shotLifeCycle.e2_gold}M` : '-',
      'E3-1 (Slit 3P)': item.shotLifeCycle?.e3_1_pcm !== undefined ? `${item.shotLifeCycle.e3_1_pcm}M` : '-',
      'E3-2 (WL+ 4P)': item.shotLifeCycle?.e3_2_gold !== undefined ? `${item.shotLifeCycle.e3_2_gold}M` : '-',
      'E3-3 (New Cor 4P)': item.shotLifeCycle?.e3_3_gold !== undefined ? `${item.shotLifeCycle.e3_3_gold}M` : '-',
      'E4 (Ø5 Slit)': item.shotLifeCycle?.e4_bare !== undefined ? `${item.shotLifeCycle.e4_bare}M` : '-',
      'E5 (Ø5 Slit)': item.shotLifeCycle?.e5_bare !== undefined ? `${item.shotLifeCycle.e5_bare}M` : '-',
      'NEW SPEC (mm) (สเปกใหม่)': newSpecStr,
      'SCRAP LIMIT (mm) (สเปกคัดทิ้ง)': scrapLimitStr,
      '1 TIME (mm) (ระยะเจียรต่อครั้ง)': perGrindStr,
      'TOTAL REGRIND (mm) (เจียรรวม)': totalGrindStr,
      'MAX CYCLES (รอบเจียรสูงสุด)': maxCyclesVal,
      'NOTE / STANDARD (ข้อกำหนด/หมายเหตุ)': item.regrindStandard?.note || '-',
      'PRICE THB (ราคาซื้อใหม่ บาท)': priceThbStr,
      'PRICE USD (ราคา USD)': priceUsdStr,
      'SUPPLIER (ผู้ผลิต/ผู้จำหน่าย)': item.supplier || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 24 }, // STAGE
    { wch: 16 }, // PART CODE
    { wch: 30 }, // PART NAME
    { wch: 18 }, // DRAWING NO.
    { wch: 22 }, // INSTALLED LINES
    { wch: 14 }, // E1
    { wch: 14 }, // E2
    { wch: 14 }, // E3-1
    { wch: 14 }, // E3-2
    { wch: 14 }, // E3-3
    { wch: 14 }, // E4
    { wch: 14 }, // E5
    { wch: 18 }, // NEW SPEC (mm)
    { wch: 18 }, // SCRAP LIMIT (mm)
    { wch: 18 }, // 1 TIME (mm)
    { wch: 18 }, // TOTAL REGRIND (mm)
    { wch: 16 }, // MAX CYCLES
    { wch: 32 }, // NOTE / STANDARD
    { wch: 18 }, // PRICE THB
    { wch: 16 }, // PRICE USD
    { wch: 20 }  // SUPPLIER
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parts Master');
  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Parts_Master_${dateStr}.xlsx`);
}

/**
 * Export Part Installation Matrix to Excel (.xlsx)
 */
export function exportInstallMatrixExcel(matrixRows: any[], lineColumns: any[]) {
  const data = matrixRows.map(row => {
    const rowObj: Record<string, any> = {
      'NO.': row.no,
      'STAGE (สเตจ)': row.stageName || '',
      'PART CODE (รหัสพาร์ท)': row.partCode || '',
      'PART NAME (ชื่อพาร์ท)': row.partName || '',
      'DRAWING CODE (เลขที่แบบ)': row.drawingCode || ''
    };

    lineColumns.forEach(col => {
      rowObj[`LINE ${col.id} (${col.subName})`] = row.quantities[col.id] || 0;
    });

    rowObj['TOTAL INSTALLED (EA)'] = row.total || 0;
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const cols = [
    { wch: 6 },  // NO.
    { wch: 22 }, // STAGE
    { wch: 16 }, // PART CODE
    { wch: 28 }, // PART NAME
    { wch: 18 }  // DRAWING
  ];
  lineColumns.forEach(() => {
    cols.push({ wch: 16 });
  });
  cols.push({ wch: 20 }); // TOTAL
  worksheet['!cols'] = cols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Past Install Matrix');
  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Past_Install_Matrix_${dateStr}.xlsx`);
}


