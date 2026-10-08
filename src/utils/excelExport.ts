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
  const data = records.map((rec, index) => ({
    'NO.': index + 1,
    'JOB CODE': rec.jobCode,
    'WORK ORDER': rec.workOrder || 'N/A',
    'DATE': rec.regrindDate || rec.sentDate || 'N/A',
    'LINE': rec.lineId ? `LINE ${rec.lineId}` : 'ALL',
    'FIN DIE CODE': rec.dieCode || rec.finDie || 'N/A',
    'COMPONENT NAME': rec.partName,
    'PART CODE': rec.partCode,
    'INSTANCE / LOT': rec.partInstanceOrLot || rec.serialNumber || 'N/A',
    'CURRENT REGRIND CYCLE': `#${rec.regrindCycleCount ?? 1}`,
    'MAX ALLOWED CYCLE': rec.maxAllowedCycles ?? 4,
    'PREVIOUS LENGTH (mm)': rec.previousLength ?? 0,
    'REMOVED DEPTH (mm)': rec.mmRemovedThisCycle ? `-${rec.mmRemovedThisCycle}` : '0.00',
    'CURRENT LENGTH (mm)': rec.currentLength ?? 0,
    'DIMENSION INSPECTION': rec.inspectionResult || rec.inspectionStatus || 'PASSED',
    'JOB STATUS': rec.status || 'READY TO USE',
    'PROCESS / WORKSHOP': rec.supplierOrInternalProcess || 'INTERNAL_TOOL_ROOM',
    'TECHNICIAN / VENDOR': rec.performedBy || rec.technicianName || rec.vendorName || 'N/A',
    'REMARKS': rec.note || rec.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 16 }, // JOB CODE
    { wch: 16 }, // WORK ORDER
    { wch: 12 }, // DATE
    { wch: 10 }, // LINE
    { wch: 16 }, // FIN DIE CODE
    { wch: 22 }, // COMPONENT NAME
    { wch: 16 }, // PART CODE
    { wch: 18 }, // INSTANCE / LOT
    { wch: 12 }, // REGRIND CYCLE
    { wch: 12 }, // MAX CYCLE
    { wch: 16 }, // PREV LENGTH
    { wch: 16 }, // REMOVED DEPTH
    { wch: 16 }, // CURR LENGTH
    { wch: 14 }, // INSPECTION
    { wch: 16 }, // STATUS
    { wch: 20 }, // PROCESS
    { wch: 20 }, // TECHNICIAN
    { wch: 24 }, // REMARKS
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Regrinding Ledger');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, `FinDie_Regrinding_Sharpening_Ledger_${lineFilter}_${dateStr}.xlsx`);
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
 */
export function exportPartMasterExcel(items: any[]) {
  const data = items.map((item, idx) => ({
    'NO.': idx + 1,
    'STAGE (สเตจ)': item.stage || '',
    'PART CODE (รหัสพาร์ท)': item.partCode || '',
    'PART NAME (ชื่อพาร์ท)': item.partName || '',
    'DRAWING CODE (เลขที่แบบ)': item.drawingNo || item.partCode || '',
    'E1 (Ø7 Slit)': item.shotLifeCycle?.e1_pcm !== undefined ? `${item.shotLifeCycle.e1_pcm}M` : '-',
    'E2 (Ø5 Slit)': item.shotLifeCycle?.e2_gold !== undefined ? `${item.shotLifeCycle.e2_gold}M` : '-',
    'E3-1 (Slit 3P)': item.shotLifeCycle?.e3_1_pcm !== undefined ? `${item.shotLifeCycle.e3_1_pcm}M` : '-',
    'E3-2 (WL+ 4P)': item.shotLifeCycle?.e3_2_gold !== undefined ? `${item.shotLifeCycle.e3_2_gold}M` : '-',
    'E3-3 (New Cor 4P)': item.shotLifeCycle?.e3_3_gold !== undefined ? `${item.shotLifeCycle.e3_3_gold}M` : '-',
    'E4 (Ø5 Slit)': item.shotLifeCycle?.e4_bare !== undefined ? `${item.shotLifeCycle.e4_bare}M` : '-',
    'E5 (Ø5 Slit)': item.shotLifeCycle?.e5_bare !== undefined ? `${item.shotLifeCycle.e5_bare}M` : '-',
    'SCRAP LIMIT (mm)': item.shotLifeCycle?.lowerSpecScrapLimit || '62.50',
    'REGRIND / TIME (mm)': item.regrindStandard?.perGrindMm || '0.05 mm',
    'TOTAL REGRIND (mm)': item.regrindStandard?.totalGrindMm || '0.50',
    'MAX CYCLES (ครั้ง)': item.regrindStandard?.regrindCycles ?? 10,
    'NOTE / REMARK': item.regrindStandard?.note || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 22 }, // STAGE
    { wch: 16 }, // PART CODE
    { wch: 28 }, // PART NAME
    { wch: 18 }, // DRAWING CODE
    { wch: 12 }, // E1
    { wch: 12 }, // E2
    { wch: 12 }, // E3-1
    { wch: 12 }, // E3-2
    { wch: 12 }, // E3-3
    { wch: 12 }, // E4
    { wch: 12 }, // E5
    { wch: 18 }, // SCRAP LIMIT
    { wch: 20 }, // REGRIND / TIME
    { wch: 18 }, // TOTAL REGRIND
    { wch: 14 }, // MAX CYCLES
    { wch: 24 }  // NOTE
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


