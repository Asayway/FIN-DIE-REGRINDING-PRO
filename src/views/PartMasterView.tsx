import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Factory,
  Info,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ChevronDown,
  Wrench,
  ShieldCheck,
  RotateCw,
  Gauge,
  Tag,
  Hash,
  Eye,
  Filter,
  Check,
  X,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Repeat,
  Box
} from 'lucide-react';
import { PartMaster, PartLifeStandard, LineActiveConfiguration, ProductionLineId } from '../types';
import { storageService } from '../services/storageService';

import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';
import { StageManagementModal } from '../components/common/StageManagementModal';
import { Part3DBlueprintModal } from '../components/common/Part3DBlueprintModal';
import { exportPartMasterExcel } from '../utils/excelExport';
import { DEFAULT_STAGE_GROUPS, deriveLogicalStage, sortStagesInOrder } from '../utils/stageUtils';

export interface UnifiedPartMasterRow {
  no: number;
  partCode: string;
  partName: string;
  stage: string;
  drawingNo: string;
  material?: string;
  maintenanceType?: 'REGRIND' | 'DISPOSE';
  newSpecMm?: number;
  scrapLimitMm?: number;
  applicableLines?: string[];
  installQty: {
    e1?: number;
    e2?: number;
    e3_1?: number;
    e3_2?: number;
    e3_3?: number;
    e4?: number;
    e5?: number;
    totalQty: number;
  };
  shotLifeCycle: {
    e1_pcm?: number;
    e2_gold?: number;
    e3_1_pcm?: number;
    e3_2_gold?: number;
    e3_3_gold?: number;
    e4_bare?: number;
    e5_bare?: number;
    partsSpec?: string;
    lowerSpecScrapLimit?: string | number;
  };
  regrindStandard?: {
    perGrindMm?: string;
    totalGrindMm?: string | number;
    regrindCycles?: number | string;
    note?: string;
  };
}

export const normalizeToMillion = (val: any): number | undefined => {
  if (val === undefined || val === null || val === '' || val === '-') return undefined;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return undefined;
  if (num >= 10000) {
    return Number((num / 1_000_000).toFixed(4));
  }
  return num;
};

export const millionToShots = (val: any): number => {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  if (num >= 10000) return Math.round(num);
  return Math.round(num * 1_000_000);
};

export const getPartDefaultSpecs = (partName: string) => {
  const upper = partName.toUpperCase();
  if (upper.includes('PIERCE PUNCH')) {
    return {
      newSpecMm: 46.20,
      scrapLimitMm: 44.80,
      perGrindMm: '0.10 mm',
      totalGrindMm: '1.40',
      maxCycles: 14,
      note: 'Change every 10-15 Day (เปลี่ยนทุกๆ 10-15 วัน)'
    };
  }
  if (upper.includes('BURRING PUNCH')) {
    return {
      newSpecMm: 62.50,
      scrapLimitMm: 62.50,
      perGrindMm: 'Dispose',
      totalGrindMm: '-',
      maxCycles: 'Dispose',
      note: 'Dispose of after 1 use (เปลี่ยนใหม่หลังใช้งาน)'
    };
  }
  if (upper.includes('PIERCE DIE') || upper.includes('BURRING DIE')) {
    return {
      newSpecMm: 28.00,
      scrapLimitMm: 27.00,
      perGrindMm: '0.10 mm',
      totalGrindMm: '1.00',
      maxCycles: 10,
      note: 'Standard regrind 0.10mm'
    };
  }
  if (upper.includes('IRONING') || upper.includes('BUCKING')) {
    return {
      newSpecMm: 35.00,
      scrapLimitMm: 33.50,
      perGrindMm: '0.15 mm',
      totalGrindMm: '1.50',
      maxCycles: 10,
      note: 'Standard regrind 0.15mm'
    };
  }
  if (upper.includes('LOUVER')) {
    return {
      newSpecMm: 50.00,
      scrapLimitMm: 48.00,
      perGrindMm: '0.20 mm',
      totalGrindMm: '2.00',
      maxCycles: 10,
      note: 'Standard regrind 0.20mm'
    };
  }
  if (upper.includes('SLIT') || upper.includes('CUT OFF') || upper.includes('CUTTER') || upper.includes('FLARE') || upper.includes('BLADE')) {
    return {
      newSpecMm: 75.00,
      scrapLimitMm: 72.00,
      perGrindMm: '0.25 mm',
      totalGrindMm: '3.00',
      maxCycles: 12,
      note: 'Blade sharpening standard'
    };
  }
  return {
    newSpecMm: 28.00,
    scrapLimitMm: 27.00,
    perGrindMm: '0.10 mm',
    totalGrindMm: '1.00',
    maxCycles: 10,
    note: 'Standard regular sharpen'
  };
};

export const calculateRegrindMatrix = (newSpec: number, scrapLimit: number, perGrindInput: any) => {
  const isDispose = (perGrindInput || '').toString().toLowerCase().includes('dispose');
  if (isDispose) {
    return {
      totalGrindMm: '-',
      regrindCycles: 'Dispose'
    };
  }
  const perGrindVal = parseFloat(perGrindInput.replace(/[^0-9.]/g, '')) || 0;
  const total = Math.max(0, newSpec - scrapLimit);
  const totalStr = total.toFixed(2);
  const cycles = perGrindVal > 0 ? Math.floor(total / perGrindVal) : 0;
  return {
    totalGrindMm: totalStr,
    regrindCycles: cycles
  };
};

export const PartMasterView: React.FC = () => {
  const [partMasters, setPartMasters] = useState<PartMaster[]>([]);
  const [lifeStandards, setLifeStandards] = useState<PartLifeStandard[]>([]);
  const [lineConfigs, setLineConfigs] = useState<LineActiveConfiguration[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
  const [selectedPartForDetail, setSelectedPartForDetail] = useState<UnifiedPartMasterRow | null>(null);
  const [selectedPartFor3D, setSelectedPartFor3D] = useState<UnifiedPartMasterRow | null>(null);
  const [showRegrindOnly, setShowRegrindOnly] = useState(false);

  // Inline Add New Part Row State (Top of table, no popup)
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newRowData, setNewRowData] = useState({
    stage: 'Stage 1: Piercing & Burring',
    partName: '',
    partCode: '',
    e1_pcm: 5.0,
    e2_gold: 5.0,
    e3_1_pcm: 5.0,
    e3_2_gold: 5.0,
    e3_3_gold: 5.0,
    e4_bare: 4.0,
    e5_bare: 4.0,
    newSpecMm: 46.20,
    scrapLimitMm: 44.80,
    perGrindMm: '0.10 mm',
    totalGrindMm: '1.40',
    regrindCycles: 14 as number | string,
    note: 'Standard regular sharpen'
  });

  // Inline Row Editing State (Direct cell editing on row)
  const [inlineEditingPartCode, setInlineEditingPartCode] = useState<string | null>(null);
  const [inlineEditRowData, setInlineEditRowData] = useState<any | null>(null);

  // Table Batch Edit Mode State (Edit cells across table)
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Stage Grouping Manager Modal State
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);

  // Delete State
  const [deleteTargetPart, setDeleteTargetPart] = useState<UnifiedPartMasterRow | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load from database / storageService
  const loadDatabaseData = () => {
    setPartMasters(storageService.getPartMasters());
    setLifeStandards(storageService.getLifeStandards());
    setLineConfigs(storageService.getLineConfigs());
  };

  useEffect(() => {
    loadDatabaseData();
    const unsub = storageService.subscribe(loadDatabaseData);
    return () => unsub();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Build unified items from database
  const unifiedItems = useMemo<UnifiedPartMasterRow[]>(() => {
    const e1Config = lineConfigs.find(l => l.lineId === 'E1');
    const e2Config = lineConfigs.find(l => l.lineId === 'E2');
    const e3_1Config = lineConfigs.find(l => l.lineId === 'E3-1');
    const e3_2Config = lineConfigs.find(l => l.lineId === 'E3-2');
    const e3_3Config = lineConfigs.find(l => l.lineId === 'E3-3');
    const e4Config = lineConfigs.find(l => l.lineId === 'E4');
    const e5Config = lineConfigs.find(l => l.lineId === 'E5');

    return partMasters.map((pm, idx) => {
      const ls = lifeStandards.find(s => (s as any).partCode === pm.partCode || s.configKey?.partCode === pm.partCode || s.id === pm.partCode);
      
      const pmInstall = (pm as any).installQty || {};
      const qE1 = pmInstall.e1 ?? e1Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE2 = pmInstall.e2 ?? e2Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE3_1 = pmInstall.e3_1 ?? e3_1Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE3_2 = pmInstall.e3_2 ?? e3_2Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE3_3 = pmInstall.e3_3 ?? e3_3Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE4 = pmInstall.e4 ?? e4Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const qE5 = pmInstall.e5 ?? e5Config?.installedPartQuantities?.[pm.partCode] ?? 0;
      const totalQty = pmInstall.totalQty ?? (qE1 + qE2 + qE3_1 + qE3_2 + qE3_3 + qE4 + qE5);

      const defaultSpecs = getPartDefaultSpecs(pm.partName);

      const newSpecNum = typeof (pm as any).newSpecMm === 'number'
        ? (pm as any).newSpecMm
        : typeof (ls as any)?.newSpecMm === 'number'
          ? (ls as any).newSpecMm
          : defaultSpecs.newSpecMm;

      const scrapLimitNum = typeof (pm as any).scrapLimitMm === 'number'
        ? (pm as any).scrapLimitMm
        : typeof (ls as any)?.scrapLimitMm === 'number'
          ? (ls as any).scrapLimitMm
          : typeof (ls as any)?.lowerSpecScrapLimit === 'number'
            ? Number((ls as any).lowerSpecScrapLimit) || defaultSpecs.scrapLimitMm
            : defaultSpecs.scrapLimitMm;

      const pmRegrind = (pm as any).regrindStandard;
      const perGrind = pmRegrind?.perGrindMm || (ls as any)?.regrindStandard?.oneTimeRegrindMm || (ls as any)?.oneTimeRegrindMm || defaultSpecs.perGrindMm;
      const isDisposable = perGrind.toString().toLowerCase().includes('dispose') || pm.maintenanceType === 'DISPOSE';

      const matrixCalc = calculateRegrindMatrix(newSpecNum, scrapLimitNum, perGrind);
      const totalGrind = pmRegrind?.totalGrindMm || (ls as any)?.regrindStandard?.totalRegrindMm || (ls as any)?.totalRegrindMm || matrixCalc.totalGrindMm;
      const maxCycles = pmRegrind?.regrindCycles ?? (ls as any)?.regrindStandard?.maxRegrindCount ?? (ls as any)?.maxRegrindCount ?? matrixCalc.regrindCycles;
      const note = pmRegrind?.note || (ls as any)?.specialNotes || (ls as any)?.notes || defaultSpecs.note;

      const pmShot = (pm as any).shotLifeCycle;
      const e1_shot = pmShot?.e1_pcm !== undefined ? normalizeToMillion(pmShot.e1_pcm) : (qE1 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E1'] ?? 5.0) : undefined);
      const e2_shot = pmShot?.e2_gold !== undefined ? normalizeToMillion(pmShot.e2_gold) : (qE2 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E2'] ?? 5.0) : undefined);
      const e3_1_shot = pmShot?.e3_1_pcm !== undefined ? normalizeToMillion(pmShot.e3_1_pcm) : (qE3_1 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E3-1'] ?? 5.0) : undefined);
      const e3_2_shot = pmShot?.e3_2_gold !== undefined ? normalizeToMillion(pmShot.e3_2_gold) : (qE3_2 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E3-2'] ?? 5.0) : undefined);
      const e3_3_shot = pmShot?.e3_3_gold !== undefined ? normalizeToMillion(pmShot.e3_3_gold) : (qE3_3 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E3-3'] ?? 5.0) : undefined);
      const e4_shot = pmShot?.e4_bare !== undefined ? normalizeToMillion(pmShot.e4_bare) : (qE4 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E4'] ?? 4.0) : undefined);
      const e5_shot = pmShot?.e5_bare !== undefined ? normalizeToMillion(pmShot.e5_bare) : (qE5 > 0 ? normalizeToMillion((ls as any)?.shotLifeStandards?.['E5'] ?? 4.0) : undefined);

      const applicableLines: string[] = (pm as any).applicableLines || [];
      if (applicableLines.length === 0) {
        if (qE1 > 0) applicableLines.push('E1');
        if (qE2 > 0) applicableLines.push('E2');
        if (qE3_1 > 0) applicableLines.push('E3-1');
        if (qE3_2 > 0) applicableLines.push('E3-2');
        if (qE3_3 > 0) applicableLines.push('E3-3');
        if (qE4 > 0) applicableLines.push('E4');
        if (qE5 > 0) applicableLines.push('E5');
      }

      return {
        no: idx + 1,
        partCode: pm.partCode,
        partName: pm.partName,
        stage: pm.stageName || deriveLogicalStage(pm.partName, pm.stageName),
        drawingNo: (pm as any).drawingNumber || pm.partCode,
        material: (pm as any).material || 'SKD11 / Carbide',
        maintenanceType: isDisposable ? 'DISPOSE' : 'REGRIND',
        newSpecMm: newSpecNum,
        scrapLimitMm: scrapLimitNum,
        applicableLines,
        installQty: {
          e1: qE1 || undefined,
          e2: qE2 || undefined,
          e3_1: qE3_1 || undefined,
          e3_2: qE3_2 || undefined,
          e3_3: qE3_3 || undefined,
          e4: qE4 || undefined,
          e5: qE5 || undefined,
          totalQty
        },
        shotLifeCycle: {
          e1_pcm: e1_shot,
          e2_gold: e2_shot,
          e3_1_pcm: e3_1_shot,
          e3_2_gold: e3_2_shot,
          e3_3_gold: e3_3_shot,
          e4_bare: e4_shot,
          e5_bare: e5_shot,
          partsSpec: `${newSpecNum.toFixed(2)} mm`,
          lowerSpecScrapLimit: `${scrapLimitNum.toFixed(2)} mm`
        },
        regrindStandard: {
          perGrindMm: perGrind,
          totalGrindMm: totalGrind,
          regrindCycles: maxCycles,
          note
        }
      };
    });
  }, [partMasters, lifeStandards, lineConfigs]);

  // Extract all unique stages (combining custom stage groups and active item stages)
  const allStages = useMemo(() => {
    const rawGroups = storageService.getStageGroups();
    const seen = new Set<string>();
    const uniqueList: string[] = [];

    // First add managed groups
    rawGroups.forEach(g => {
      const normalized = g.trim().toUpperCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        uniqueList.push(g.trim());
      }
    });

    // Then add any stages from items that aren't in groups yet
    unifiedItems.forEach(item => {
      if (item.stage && item.stage !== '-') {
        const normalized = item.stage.trim().toUpperCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueList.push(item.stage.trim());
        }
      }
    });

    return sortStagesInOrder(uniqueList);
  }, [unifiedItems, partMasters]); // Added partMasters to dependency to ensure update on notify

  // Filtered master items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      // Stage filter
      if (selectedStage !== 'ALL') {
        const matchExact = item.stage.toUpperCase() === selectedStage.toUpperCase();
        if (!matchExact) {
          return false;
        }
      }

      // Line filter
      if (selectedLineFilter !== 'ALL') {
        const qtyMap: Record<string, number | undefined> = {
          'E1': item.installQty.e1,
          'E2': item.installQty.e2,
          'E3-1': item.installQty.e3_1,
          'E3-2': item.installQty.e3_2,
          'E3-3': item.installQty.e3_3,
          'E4': item.installQty.e4,
          'E5': item.installQty.e5,
        };
        const lineQty = qtyMap[selectedLineFilter];
        if (!lineQty || lineQty <= 0) return false;
      }

      // Regrind only filter
      if (showRegrindOnly && (item.regrindStandard?.perGrindMm === '-' || item.regrindStandard?.perGrindMm?.includes('Dispose'))) {
        return false;
      }

      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = item.partName.toLowerCase().includes(term);
        const matchCode = item.partCode.toLowerCase().includes(term);
        const matchStage = item.stage.toLowerCase().includes(term);
        const matchNo = item.no.toString() === term;
        return matchName || matchCode || matchStage || matchNo;
      }

      return true;
    });
  }, [unifiedItems, selectedStage, selectedLineFilter, showRegrindOnly, searchTerm]);

  // Save new part entered via inline top row
  const handleSaveNewRowInline = () => {
    if (!newRowData.partName.trim()) {
      showToast('กรุณาระบุ Part Name ให้ครบถ้วน', 'error');
      return;
    }

    const code = newRowData.partCode.trim() 
      ? newRowData.partCode.trim().toUpperCase() 
      : `P-${Date.now().toString().slice(-5)}`;
    
    if (partMasters.some(p => p.partCode.toUpperCase() === code)) {
      showToast(`รายการ ${newRowData.partName} มีอยู่ในระบบแล้ว`, 'error');
      return;
    }

    const newMaster: PartMaster = {
      partCode: code,
      partName: newRowData.partName.trim(),
      partNameTh: newRowData.partName.trim(),
      stageName: newRowData.stage,
      category: 'PUNCH',
      drawingNumber: code,
      unit: 'PCS',
      unitCostThb: 0,
      tubeSizeCompat: 'BOTH'
    };

    const isDispose = newRowData.perGrindMm.toString().toLowerCase().includes('dispose');
    const newLifeStd: PartLifeStandard = {
      id: `STD-ALL-${code}`,
      configKey: {
        lineId: 'ALL',
        configurationId: `CFG-ALL-${code}`,
        dieCode: 'FD-ALL',
        finType: 'Slit (half)',
        material: 'PCM' as any,
        thicknessMm: 0.10,
        tubeSize: 'Ø7' as any,
        partCode: code,
        position: 'ALL',
        effectiveDate: new Date().toISOString().substring(0, 10)
      },
      compositeKeyString: `ALL|PCM|0.10mm|Ø7|${code}`,
      partName: newRowData.partName.trim(),
      stagePunchDie: newRowData.stage,
      lifeLimitShots: millionToShots(newRowData.e1_pcm),
      regrindDepthPerTime: parseFloat(newRowData.perGrindMm) || 0.05,
      maxTotalGrindingLimit: parseFloat(newRowData.totalGrindMm) || 0.50,
      standardShimThickness: 0.20,
      notes: newRowData.note.trim(),
      regrindStandard: {
        oneTimeRegrindMm: newRowData.perGrindMm,
        totalRegrindMm: newRowData.totalGrindMm,
        maxRegrindCount: typeof newRowData.regrindCycles === 'number' ? newRowData.regrindCycles : 10,
        disposeAfterUse: isDispose,
        regrindIntervalNote: newRowData.note.trim()
      },
      createdBy: 'Die Engineer Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    (newLifeStd as any).shotLifeStandards = {
      'E1': millionToShots(newRowData.e1_pcm),
      'E2': millionToShots(newRowData.e2_gold),
      'E3-1': millionToShots(newRowData.e3_1_pcm),
      'E3-2': millionToShots(newRowData.e3_2_gold),
      'E3-3': millionToShots(newRowData.e3_3_gold),
      'E4': millionToShots(newRowData.e4_bare),
      'E5': millionToShots(newRowData.e5_bare),
    };
    (newLifeStd as any).scrapLimit = `${newRowData.scrapLimitMm.toFixed(2)}`;
    (newLifeStd as any).newSpecMm = newRowData.newSpecMm;
    (newLifeStd as any).scrapLimitMm = newRowData.scrapLimitMm;

    storageService.savePartMaster(newMaster);
    storageService.saveLifeStandard(newLifeStd);

    showToast(`เพิ่มชิ้นส่วนใหม่ ${newMaster.partName} (${newMaster.partCode}) บันทึกลงตารางสำเร็จแล้ว`);
    setIsAddingInline(false);
    setNewRowData({
      stage: 'Stage 1: Piercing & Burring',
      partName: '',
      partCode: '',
      e1_pcm: 5.0,
      e2_gold: 5.0,
      e3_1_pcm: 5.0,
      e3_2_gold: 5.0,
      e3_3_gold: 5.0,
      e4_bare: 4.0,
      e5_bare: 4.0,
      newSpecMm: 46.20,
      scrapLimitMm: 44.80,
      perGrindMm: '0.10 mm',
      totalGrindMm: '1.40',
      regrindCycles: 14 as number | string,
      note: 'Standard regular sharpen'
    });
    loadDatabaseData();
  };

  // Start inline editing of an existing row
  const handleStartInlineEdit = (item: UnifiedPartMasterRow) => {
    setInlineEditingPartCode(item.partCode);
    setInlineEditRowData({
      partCode: item.partCode,
      partName: item.partName,
      stage: item.stage,
      e1_pcm: item.shotLifeCycle.e1_pcm ?? 5.0,
      e2_gold: item.shotLifeCycle.e2_gold ?? 5.0,
      e3_1_pcm: item.shotLifeCycle.e3_1_pcm ?? 5.0,
      e3_2_gold: item.shotLifeCycle.e3_2_gold ?? 5.0,
      e3_3_gold: item.shotLifeCycle.e3_3_gold ?? 5.0,
      e4_bare: item.shotLifeCycle.e4_bare ?? 4.0,
      e5_bare: item.shotLifeCycle.e5_bare ?? 4.0,
      newSpecMm: item.newSpecMm ?? 46.20,
      scrapLimitMm: item.scrapLimitMm ?? 44.80,
      perGrindMm: item.regrindStandard?.perGrindMm ?? '0.10 mm',
      totalGrindMm: item.regrindStandard?.totalGrindMm ?? '1.40',
      regrindCycles: item.regrindStandard?.regrindCycles ?? 14,
      note: item.regrindStandard?.note ?? ''
    });
  };

  // Save inline edit for a row
  const handleSaveInlineEdit = () => {
    if (!inlineEditRowData) return;
    const pm = partMasters.find(p => p.partCode === inlineEditRowData.partCode);
    if (pm) {
      const updatedPm: PartMaster = {
        ...pm,
        partName: inlineEditRowData.partName,
        stageName: inlineEditRowData.stage
      };
      (updatedPm as any).newSpecMm = inlineEditRowData.newSpecMm;
      (updatedPm as any).scrapLimitMm = inlineEditRowData.scrapLimitMm;
      storageService.savePartMaster(updatedPm);
    }

    const ls = lifeStandards.find(s => (s as any).partCode === inlineEditRowData.partCode || s.configKey?.partCode === inlineEditRowData.partCode || s.id === inlineEditRowData.partCode);
    const isDispose = (inlineEditRowData.perGrindMm || '').toString().toLowerCase().includes('dispose');
    if (ls) {
      const updatedLs: PartLifeStandard = {
        ...ls,
        partName: inlineEditRowData.partName,
        stagePunchDie: inlineEditRowData.stage,
        lifeLimitShots: millionToShots(inlineEditRowData.e1_pcm),
        notes: inlineEditRowData.note,
        regrindStandard: {
          ...ls.regrindStandard,
          oneTimeRegrindMm: inlineEditRowData.perGrindMm,
          totalRegrindMm: inlineEditRowData.totalGrindMm,
          maxRegrindCount: typeof inlineEditRowData.regrindCycles === 'number' ? inlineEditRowData.regrindCycles : 10,
          disposeAfterUse: isDispose,
          regrindIntervalNote: inlineEditRowData.note
        }
      };
      (updatedLs as any).shotLifeStandards = {
        'E1': millionToShots(inlineEditRowData.e1_pcm),
        'E2': millionToShots(inlineEditRowData.e2_gold),
        'E3-1': millionToShots(inlineEditRowData.e3_1_pcm),
        'E3-2': millionToShots(inlineEditRowData.e3_2_gold),
        'E3-3': millionToShots(inlineEditRowData.e3_3_gold),
        'E4': millionToShots(inlineEditRowData.e4_bare),
        'E5': millionToShots(inlineEditRowData.e5_bare),
      };
      (updatedLs as any).newSpecMm = inlineEditRowData.newSpecMm;
      (updatedLs as any).scrapLimitMm = inlineEditRowData.scrapLimitMm;
      (updatedLs as any).scrapLimit = `${inlineEditRowData.scrapLimitMm}`;
      storageService.saveLifeStandard(updatedLs);
    } else {
      // Create dynamic fallback life standard to prevent silent save failure
      const code = inlineEditRowData.partCode;
      const newLs: PartLifeStandard = {
        id: `STD-ALL-${code}`,
        configKey: {
          lineId: 'ALL',
          configurationId: `CFG-ALL-${code}`,
          dieCode: 'FD-ALL',
          finType: 'Slit (half)',
          material: 'PCM' as any,
          thicknessMm: 0.10,
          tubeSize: 'Ø7' as any,
          partCode: code,
          position: 'ALL',
          effectiveDate: new Date().toISOString().substring(0, 10)
        },
        compositeKeyString: `ALL|PCM|0.10mm|Ø7|${code}`,
        partName: inlineEditRowData.partName,
        stagePunchDie: inlineEditRowData.stage,
        lifeLimitShots: millionToShots(inlineEditRowData.e1_pcm),
        regrindDepthPerTime: parseFloat(inlineEditRowData.perGrindMm) || 0.05,
        maxTotalGrindingLimit: parseFloat(inlineEditRowData.totalGrindMm) || 0.50,
        standardShimThickness: 0.20,
        notes: inlineEditRowData.note,
        regrindStandard: {
          oneTimeRegrindMm: inlineEditRowData.perGrindMm,
          totalRegrindMm: inlineEditRowData.totalGrindMm,
          maxRegrindCount: typeof inlineEditRowData.regrindCycles === 'number' ? inlineEditRowData.regrindCycles : 10,
          disposeAfterUse: isDispose,
          regrindIntervalNote: inlineEditRowData.note
        },
        createdBy: 'System Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      (newLs as any).shotLifeStandards = {
        'E1': millionToShots(inlineEditRowData.e1_pcm),
        'E2': millionToShots(inlineEditRowData.e2_gold),
        'E3-1': millionToShots(inlineEditRowData.e3_1_pcm),
        'E3-2': millionToShots(inlineEditRowData.e3_2_gold),
        'E3-3': millionToShots(inlineEditRowData.e3_3_gold),
        'E4': millionToShots(inlineEditRowData.e4_bare),
        'E5': millionToShots(inlineEditRowData.e5_bare),
      };
      (newLs as any).newSpecMm = inlineEditRowData.newSpecMm;
      (newLs as any).scrapLimitMm = inlineEditRowData.scrapLimitMm;
      (newLs as any).scrapLimit = `${inlineEditRowData.scrapLimitMm}`;
      storageService.saveLifeStandard(newLs);
    }

    showToast(`บันทึกการแก้ไข ${inlineEditRowData.partName} (${inlineEditRowData.partCode}) ในตารางสำเร็จแล้ว`);
    setInlineEditingPartCode(null);
    setInlineEditRowData(null);
    loadDatabaseData();
  };

  // Table Edit Mode Handlers
  const handleStartEdit = () => {
    const values: Record<string, any> = {};
    unifiedItems.forEach(item => {
      values[item.partCode] = {
        partName: item.partName,
        stage: item.stage,
        e1_pcm: item.shotLifeCycle.e1_pcm ?? 5.0,
        e2_gold: item.shotLifeCycle.e2_gold ?? 5.0,
        e3_1_pcm: item.shotLifeCycle.e3_1_pcm ?? 5.0,
        e3_2_gold: item.shotLifeCycle.e3_2_gold ?? 5.0,
        e3_3_gold: item.shotLifeCycle.e3_3_gold ?? 5.0,
        e4_bare: item.shotLifeCycle.e4_bare ?? 4.0,
        e5_bare: item.shotLifeCycle.e5_bare ?? 4.0,
        newSpecMm: item.newSpecMm ?? 46.20,
        scrapLimitMm: item.scrapLimitMm ?? 44.80,
        perGrindMm: item.regrindStandard?.perGrindMm ?? '0.10 mm',
        totalGrindMm: item.regrindStandard?.totalGrindMm ?? '1.40',
        regrindCycles: item.regrindStandard?.regrindCycles ?? 14,
        note: item.regrindStandard?.note ?? ''
      };
    });
    setEditValues(values);
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('คุณมีการแก้ไขที่ยังไม่ได้บันทึก ต้องการยกเลิกใช่หรือไม่?')) {
        return;
      }
    }
    setIsEditing(false);
    setEditValues({});
    setHasUnsavedChanges(false);
  };

  const handleCellEditChange = (partCode: string, field: string, val: any) => {
    setEditValues(prev => ({
      ...prev,
      [partCode]: {
        ...(prev[partCode] || {}),
        [field]: val
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveBatchEdit = () => {
    try {
      const updatedParts = [...partMasters];
      const updatedStds = [...lifeStandards];

      updatedParts.forEach((pm, idx) => {
        const rowEdit = editValues[pm.partCode];
        if (rowEdit) {
          const updatedPm: PartMaster = {
            ...pm,
            partName: rowEdit.partName,
            stageName: rowEdit.stage
          };
          (updatedPm as any).newSpecMm = rowEdit.newSpecMm;
          (updatedPm as any).scrapLimitMm = rowEdit.scrapLimitMm;
          
          updatedParts[idx] = updatedPm;

          const lsIdx = updatedStds.findIndex(s => (s as any).partCode === pm.partCode || s.configKey?.partCode === pm.partCode || s.id === pm.partCode);
          if (lsIdx >= 0) {
            const ls = updatedStds[lsIdx];
            const isDispose = (rowEdit.perGrindMm || '').toString().toLowerCase().includes('dispose');
            const updatedLs: PartLifeStandard = {
              ...ls,
              partName: rowEdit.partName,
              stagePunchDie: rowEdit.stage,
              lifeLimitShots: millionToShots(rowEdit.e1_pcm),
              notes: rowEdit.note,
              regrindStandard: {
                ...ls.regrindStandard,
                oneTimeRegrindMm: rowEdit.perGrindMm,
                totalRegrindMm: rowEdit.totalGrindMm,
                maxRegrindCount: typeof rowEdit.regrindCycles === 'number' ? rowEdit.regrindCycles : parseInt(rowEdit.regrindCycles) || 10,
                disposeAfterUse: isDispose,
                regrindIntervalNote: rowEdit.note
              }
            };
            (updatedLs as any).shotLifeStandards = {
              'E1': millionToShots(rowEdit.e1_pcm),
              'E2': millionToShots(rowEdit.e2_gold),
              'E3-1': millionToShots(rowEdit.e3_1_pcm),
              'E3-2': millionToShots(rowEdit.e3_2_gold),
              'E3-3': millionToShots(rowEdit.e3_3_gold),
              'E4': millionToShots(rowEdit.e4_bare),
              'E5': millionToShots(rowEdit.e5_bare),
            };
            (updatedLs as any).newSpecMm = rowEdit.newSpecMm;
            (updatedLs as any).scrapLimitMm = rowEdit.scrapLimitMm;
            (updatedLs as any).scrapLimit = `${rowEdit.scrapLimitMm}`;
            
            updatedStds[lsIdx] = updatedLs;
          }
        }
      });

      storageService.savePartMastersBulk(updatedParts, updatedStds);

      showToast(`บันทึกการแก้ไขข้อมูลตาราง ${partMasters.length} รายการลงในฐานข้อมูลเรียบร้อยแล้ว`);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      loadDatabaseData();
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`, 'error');
    }
  };

  // Delete part handler
  const handleConfirmDeletePart = () => {
    if (!deleteTargetPart) return;
    try {
      storageService.deletePartMaster(deleteTargetPart.partCode);
      showToast(`ลบข้อมูลชิ้นส่วน ${deleteTargetPart.partName} (${deleteTargetPart.partCode}) เรียบร้อยแล้ว`);
      setDeleteTargetPart(null);
      if (selectedPartForDetail?.partCode === deleteTargetPart.partCode) {
        setSelectedPartForDetail(null);
      }
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาดในการลบ: ${err.message}`, 'error');
    }
  };

  // Reorder functionality
  const handleMovePart = (partCode: string, direction: 'up' | 'down' | 'top' | 'bottom' | 'swap', targetIndexParam?: number) => {
    const newItems = [...partMasters];
    const index = newItems.findIndex(p => p.partCode === partCode);
    if (index === -1) return;

    let targetIndex = -1;
    if (direction === 'up') targetIndex = index - 1;
    else if (direction === 'down') targetIndex = index + 1;
    else if (direction === 'top') targetIndex = 0;
    else if (direction === 'bottom') targetIndex = newItems.length - 1;
    else if (direction === 'swap' && targetIndexParam !== undefined) {
      targetIndex = targetIndexParam;
    }

    if (targetIndex < 0 || targetIndex >= newItems.length || targetIndex === index) return;

    // Move to specific position (shifting others)
    const itemToMove = newItems.splice(index, 1)[0];
    newItems.splice(targetIndex, 0, itemToMove);

    // Persist new order
    storageService.savePartMasters(newItems);
    showToast(`ปรับปรุงตำแหน่งชิ้นส่วนเรียบร้อยแล้ว`, 'success');
    loadDatabaseData();
  };

  // Stage color badge style - Unified with PART INSTALL aesthetic
  const getStageColor = (stage: string) => {
    const stg = (stage || '').toUpperCase();
    
    // Define colors for standard stages
    if (stg.includes('PIERCE') || stg.includes('BURRING')) return 'border-[#FFCC00] text-[#FFCC00]'; // Yellow/Amber
    if (stg.includes('IRONING')) return 'border-blue-400 text-blue-400';
    if (stg.includes('LOUVER') || stg.includes('SLIT')) return 'border-emerald-400 text-emerald-400';
    if (stg.includes('REFLAIRE') || stg.includes('REFLARE')) return 'border-purple-400 text-purple-400';
    if (stg.includes('NOTCH') || stg.includes('PUNCH')) return 'border-sky-400 text-sky-400';
    if (stg.includes('CUT OFF') || stg.includes('SIDE CUT')) return 'border-rose-400 text-rose-400';
    if (stg.includes('FORMING')) return 'border-teal-400 text-teal-400';
    if (stg.includes('PILOT') || stg.includes('FEED')) return 'border-orange-400 text-orange-400';
    
    // Fallback for custom stages
    return 'border-slate-500 text-slate-300';
  };

  // Export to Excel Function (.xlsx)
  const handleExportCSV = () => {
    exportPartMasterExcel(filteredItems);
  };

  return (
    <div className="space-y-3.5 font-sans text-white animate-fadeIn pb-8">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-2.5 border flex items-center justify-between text-xs font-mono font-bold shadow-lg animate-fadeIn ${
          toastMessage.type === 'success'
            ? 'bg-[#111111] border-[#00FF00] text-[#00FF00]'
            : 'bg-rose-950 border-[#C40045] text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SEARCH, STAGE DROPDOWN & LINE FILTERS + ACTIONS */}
      {/* ======================================================== */}
      <div className="bg-[#111111] border border-[#666666] p-3 space-y-2.5 shadow-md mb-2">
        
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-1">
          {/* Left Side: Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Stage Dropdown Filter & Manager Button */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#666666] px-2.5 py-1 text-xs min-w-[200px]">
                <Layers className="w-3.5 h-3.5 text-[#00FF00]" />
                <select
                  value={selectedStage}
                  onChange={e => setSelectedStage(e.target.value)}
                  className="bg-transparent text-[#00FF00] font-mono text-xs font-bold focus:outline-none cursor-pointer w-full"
                >
                  <option value="ALL" className="bg-[#111111] text-white">ทุกสเตจ (All Stages)</option>
                  {allStages.map(stage => (
                    <option key={stage} value={stage} className="bg-[#111111] text-white">
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsStageManagerOpen(true)}
                className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] text-[#00FF00] border border-[#666666] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                title="เปิดหน้าต่างจัดกลุ่มและจัดการ Stage"
              >
                <Sliders className="w-3.5 h-3.5 text-[#00FF00]" />
                <span>⚙️ จัดกลุ่ม Stage</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพาร์ท หรือสเตจ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#666666] pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#00FF00]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Additional Line Filter */}
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#666666] px-2.5 py-1 text-xs">
              <Factory className="w-3.5 h-3.5 text-[#FFCC00]" />
              <span className="font-mono text-[11px] text-slate-300">Installed Line:</span>
              <select
                value={selectedLineFilter}
                onChange={e => setSelectedLineFilter(e.target.value)}
                className="bg-transparent text-[#FFCC00] font-mono text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#111111] text-white">ทุกไลน์ (All 7 Lines)</option>
                <option value="E1" className="bg-[#111111] text-white">Line E1 (Ø7 Slit)</option>
                <option value="E2" className="bg-[#111111] text-white">Line E2 (Ø5 Slit)</option>
                <option value="E3-1" className="bg-[#111111] text-white">Line E3-1 (Slit 3P)</option>
                <option value="E3-2" className="bg-[#111111] text-white">Line E3-2 (WL+ 4P)</option>
                <option value="E3-3" className="bg-[#111111] text-white">Line E3-3 (New Cor 4P)</option>
                <option value="E4" className="bg-[#111111] text-white">Line E4 (Ø5 Slit)</option>
                <option value="E5" className="bg-[#111111] text-white">Line E5 (Ø5 Slit)</option>
              </select>
            </div>

            {(selectedStage !== 'ALL' || selectedLineFilter !== 'ALL' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStage('ALL');
                  setSelectedLineFilter('ALL');
                  setShowRegrindOnly(false);
                  setSearchTerm('');
                }}
                className="px-2 py-1 text-xs bg-[#222222] hover:bg-[#333333] text-slate-300 border border-[#666666] flex items-center gap-1 transition-colors cursor-pointer"
                title="รีเซ็ตตัวกรองทั้งหมด"
              >
                <X className="w-3 h-3 text-[#FFCC00]" />
                <span>รีเซ็ต</span>
              </button>
            )}
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <button
              type="button"
              onClick={() => setIsAddingInline(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isAddingInline 
                  ? 'bg-amber-400 text-black font-extrabold shadow-md'
                  : 'bg-[#00FF00] hover:bg-[#00dd00] text-black'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายการใหม่ (Add Part Master)</span>
            </button>

            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-[#222222] hover:bg-[#333333] text-slate-300 text-xs font-bold border border-[#666666] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ยกเลิก</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveBatchEdit}
                  className="px-4 py-1.5 bg-[#00FF00] hover:bg-[#00dd00] text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข ({hasUnsavedChanges ? 'มีการเปลี่ยนแปลง' : 'พร้อมบันทึก'})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-slate-200 border border-[#666666] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#00FF00]" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-[#00FF00] border border-[#00FF00] font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขตัวเลขในตาราง (Edit Cells)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MASTER DATA TABLE - TIGHT INDUSTRIAL TABLE WITH LOCKED STICKY HEADER */}
      {/* ======================================================== */}
      <div className="bg-[#111111] border border-[#666666] shadow-xl overflow-hidden">
        <div className="p-2.5 bg-[#1a1a1a] border-b border-[#666666] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00FF00]" />
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              PARTS MASTER DATA DICTIONARY ({filteredItems.length} / {unifiedItems.length} รายการ)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00FF00]"></span>
              <span>หัวตารางล็อกคงที่ (Locked Sticky Header)</span>
            </span>
            <span>• คลิกแถวเพื่อดูรายละเอียด</span>
          </div>
        </div>

        {/* Scrollable Container with Sticky Table Headers */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin relative">
          <table 
            className="w-full text-left text-xs font-mono min-w-full" 
            style={{ borderCollapse: 'separate', borderSpacing: 0 }}
          >
            {/* Multi-tier Locked Sticky Table Header */}
            <thead>
              {/* Header Tier 1 (Sticky Top 0) */}
              <tr className="text-white text-[11px] select-none">
                <th 
                  colSpan={4} 
                  className="sticky top-0 z-20 py-1.5 px-2 border-b border-r border-[#666666] text-white font-bold text-left bg-[#444455] shadow-xs"
                >
                  1. PART IDENTIFICATION & SPEC
                </th>
                <th 
                  colSpan={7} 
                  className="sticky top-0 z-20 py-1.5 px-2 border-b border-r border-[#666666] text-[#00FF00] font-bold text-center bg-[#3a3a4a] shadow-xs"
                >
                  2. STANDARDIZATION OF SHOT USAGE CYCLE (MILLION SHOTS)
                </th>
                <th 
                  colSpan={6} 
                  className="sticky top-0 z-20 py-1.5 px-2 border-b border-r border-[#666666] text-purple-300 font-bold text-center bg-[#444455] shadow-xs"
                >
                  3. STANDARD RE-GRINDING MATRIX (SPEC & AUTO-CALCULATED)
                </th>
                <th 
                  colSpan={1} 
                  className="sticky top-0 z-20 py-1.5 px-2 border-b border-[#666666] text-[#FFCC00] font-bold text-center bg-[#3a3a4a] shadow-xs w-20"
                >
                  4. ACTIONS
                </th>
              </tr>

              {/* Header Tier 2 (Sticky Top 28px) */}
              <tr className="text-white text-[10px] tracking-wider select-none font-bold">
                {/* 1. Identification */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center w-8 border-b border-r border-[#666666] bg-[#555566]">No</th>
                <th className="sticky top-[27px] z-20 py-1 px-1.5 border-b border-r border-[#666666] bg-[#555566] min-w-[145px] w-36">Stage</th>
                <th className="sticky top-[27px] z-20 py-1 px-1.5 border-b border-r border-[#666666] bg-[#555566] min-w-[150px]">Part Name & Drawing No.</th>
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center border-b border-r border-[#666666] bg-[#4a4a5a] min-w-[125px]">
                  <div className="font-bold text-cyan-300 text-[11px]">Installed Lines</div>
                  <div className="text-[9px] text-slate-300 font-normal">ไลน์ที่ติดตั้ง (E1-E5)</div>
                </th>

                {/* 2. Shot Usage Standards */}
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E1</div>
                  <div className="text-[9px] text-slate-300 font-normal">Ø7 Slit</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E2</div>
                  <div className="text-[9px] text-slate-300 font-normal">Ø5 Slit</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E3-1</div>
                  <div className="text-[9px] text-slate-300 font-normal">Slit 3P</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E3-2</div>
                  <div className="text-[9px] text-slate-300 font-normal">WL+ 4P</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[62px]">
                  <div className="font-bold text-white text-[11px]">E3-3</div>
                  <div className="text-[9px] text-slate-300 font-normal">New Cor 4P</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E4</div>
                  <div className="text-[9px] text-slate-300 font-normal">Ø5 Slit</div>
                </th>
                <th className="sticky top-[27px] z-20 py-0.5 px-1 text-center border-b border-r border-[#666666] bg-[#4a4a5a] text-[#00FF00] min-w-[56px]">
                  <div className="font-bold text-white text-[11px]">E5</div>
                  <div className="text-[9px] text-slate-300 font-normal">Ø5 Slit</div>
                </th>

                {/* 3. Regrinding Standards & Specs */}
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center text-emerald-300 border-b border-r border-[#666666] bg-[#555566] min-w-[70px]">New Spec (mm)</th>
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center text-amber-300 border-b border-r border-[#666666] bg-[#555566] min-w-[70px]">Scrap Limit</th>
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center text-purple-300 border-b border-r border-[#666666] bg-[#555566] min-w-[60px]">1 time (mm)</th>
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center text-purple-300 border-b border-r border-[#666666] bg-[#555566] min-w-[60px]">Total (mm)</th>
                <th className="sticky top-[27px] z-20 py-1 px-1 text-center text-purple-300 border-b border-r border-[#666666] bg-[#555566] min-w-[60px]">Max Cycles</th>
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-purple-200 border-b border-r border-[#666666] bg-[#555566] min-w-[120px]">Note / Standard</th>

                {/* 4. Actions */}
                <th className="sticky top-[27px] z-20 py-1 px-1.5 text-center text-[#FFCC00] border-b border-[#666666] bg-[#4a4a5a] w-24">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {/* ======================================================== */}
              {/* TOP INLINE ADD ROW (Direct Entry at Top of Table) */}
              {/* ======================================================== */}
              {isAddingInline && (
                <tr className="bg-[#1e2e1e] border-b-2 border-[#00FF00] animate-fadeIn">
                  <td className="py-1 px-2 text-center text-[#00FF00] font-bold border-r border-[#444444]">
                    NEW
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444] min-w-[145px]">
                    <select
                      value={newRowData.stage}
                      onChange={e => setNewRowData({ ...newRowData, stage: e.target.value })}
                      className="w-full bg-[#111111] text-[#00FF00] border border-[#00FF00] p-1 text-[11px] font-bold font-mono focus:outline-none min-w-[140px]"
                    >
                      {allStages.length > 0 ? (
                        allStages.map(stg => (
                          <option key={stg} value={stg} className="bg-[#111111] text-white">
                            {stg}
                          </option>
                        ))
                      ) : (
                        <option value="Stage 1: Piercing & Burring">Stage 1: Piercing & Burring</option>
                      )}
                    </select>
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Part Name (e.g. 1st Piercing Punch)"
                        value={newRowData.partName}
                        onChange={e => {
                          const pName = e.target.value;
                          const defs = getPartDefaultSpecs(pName);
                          const calc = calculateRegrindMatrix(defs.newSpecMm, defs.scrapLimitMm, defs.perGrindMm);
                          setNewRowData({ 
                            ...newRowData, 
                            partName: pName,
                            newSpecMm: defs.newSpecMm,
                            scrapLimitMm: defs.scrapLimitMm,
                            perGrindMm: defs.perGrindMm,
                            totalGrindMm: calc.totalGrindMm,
                            regrindCycles: calc.regrindCycles,
                            note: defs.note
                          });
                        }}
                        className="w-full bg-[#111111] text-white border border-[#00FF00] px-1.5 py-0.5 text-xs font-bold font-mono focus:outline-none"
                      />
                    </div>
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444] text-center">
                    <span className="text-[10px] text-slate-400">All Lines</span>
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e1_pcm}
                      onChange={e => setNewRowData({ ...newRowData, e1_pcm: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e2_gold}
                      onChange={e => setNewRowData({ ...newRowData, e2_gold: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e3_1_pcm}
                      onChange={e => setNewRowData({ ...newRowData, e3_1_pcm: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e3_2_gold}
                      onChange={e => setNewRowData({ ...newRowData, e3_2_gold: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e3_3_gold}
                      onChange={e => setNewRowData({ ...newRowData, e3_3_gold: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e4_bare}
                      onChange={e => setNewRowData({ ...newRowData, e4_bare: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.5"
                      value={newRowData.e5_bare}
                      onChange={e => setNewRowData({ ...newRowData, e5_bare: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>

                  {/* Section 3 Inputs with Auto-Calculation */}
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.1"
                      value={newRowData.newSpecMm}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const calc = calculateRegrindMatrix(val, newRowData.scrapLimitMm, newRowData.perGrindMm);
                        setNewRowData({ 
                          ...newRowData, 
                          newSpecMm: val, 
                          totalGrindMm: calc.totalGrindMm, 
                          regrindCycles: calc.regrindCycles 
                        });
                      }}
                      className="w-full bg-[#111111] text-center text-emerald-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="number"
                      step="0.1"
                      value={newRowData.scrapLimitMm}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const calc = calculateRegrindMatrix(newRowData.newSpecMm, val, newRowData.perGrindMm);
                        setNewRowData({ 
                          ...newRowData, 
                          scrapLimitMm: val, 
                          totalGrindMm: calc.totalGrindMm, 
                          regrindCycles: calc.regrindCycles 
                        });
                      }}
                      className="w-full bg-[#111111] text-center text-amber-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="text"
                      value={newRowData.perGrindMm}
                      onChange={e => {
                        const pg = e.target.value;
                        const calc = calculateRegrindMatrix(newRowData.newSpecMm, newRowData.scrapLimitMm, pg);
                        setNewRowData({ 
                          ...newRowData, 
                          perGrindMm: pg, 
                          totalGrindMm: calc.totalGrindMm, 
                          regrindCycles: calc.regrindCycles 
                        });
                      }}
                      className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="text"
                      value={newRowData.totalGrindMm}
                      onChange={e => setNewRowData({ ...newRowData, totalGrindMm: e.target.value })}
                      className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="text"
                      value={newRowData.regrindCycles}
                      onChange={e => setNewRowData({ ...newRowData, regrindCycles: e.target.value })}
                      className="w-full bg-[#111111] text-center text-purple-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 border-r border-[#444444]">
                    <input
                      type="text"
                      placeholder="Note / Standard"
                      value={newRowData.note}
                      onChange={e => setNewRowData({ ...newRowData, note: e.target.value })}
                      className="w-full bg-[#111111] text-slate-300 border border-[#666666] px-1 py-0.5 text-[11px] font-mono"
                    />
                  </td>
                  <td className="py-1 px-1 text-center bg-[#182818]">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={handleSaveNewRowInline}
                        className="px-2 py-1 bg-[#00FF00] hover:bg-[#00dd00] text-black font-bold text-[11px] flex items-center gap-0.5 cursor-pointer shadow-sm"
                        title="บันทึกรายการใหม่ (Save)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึก</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingInline(false)}
                        className="p-1 bg-[#222222] hover:bg-[#333333] text-slate-400 hover:text-white border border-[#666666] cursor-pointer"
                        title="ยกเลิก (Cancel)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredItems.length === 0 && !isAddingInline ? (
                <tr>
                  <td colSpan={17} className="py-8 text-center text-slate-500 bg-[#161616] border-b border-[#666666]">
                    ไม่พบข้อมูลชิ้นส่วนที่ตรงกับคำค้นหาหรือตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedPartForDetail?.no === item.no;
                  const isEditingThisRow = inlineEditingPartCode === item.partCode;
                  const isDisposable = item.regrindStandard?.perGrindMm?.includes('Dispose') || item.maintenanceType === 'DISPOSE';
                  const rowEdit = editValues[item.partCode];

                  if (isEditing && rowEdit) {
                    return (
                      <tr key={item.partCode} className="bg-[#1e2a1e] border-b border-[#00FF00] animate-fadeIn">
                        <td className="py-1 px-2 text-center font-bold text-[#00FF00] border-r border-[#444444]">
                          {item.no}
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444] min-w-[145px]">
                          <select
                            value={rowEdit.stage}
                            onChange={e => handleCellEditChange(item.partCode, 'stage', e.target.value)}
                            className="w-full bg-[#111111] text-[#00FF00] border border-[#00FF00] p-1 text-[11px] font-mono focus:outline-none min-w-[140px]"
                          >
                            {allStages.map(stg => (
                              <option key={stg} value={stg} className="bg-[#111111] text-white">
                                {stg}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={rowEdit.partName}
                            onChange={e => handleCellEditChange(item.partCode, 'partName', e.target.value)}
                            className="w-full bg-[#111111] text-white border border-[#00FF00] px-1 py-0.5 text-xs font-bold font-mono focus:outline-none"
                          />
                        </td>
                        {/* Installed Lines Cell */}
                        <td className="py-1 px-1 border-r border-[#444444] text-center min-w-[125px]">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {item.applicableLines && item.applicableLines.length > 0 ? (
                              item.applicableLines.map((line: string) => {
                                let badgeColor = 'bg-sky-950 text-sky-300 border-sky-600';
                                if (line === 'E2') badgeColor = 'bg-amber-950 text-amber-300 border-amber-600';
                                else if (line.startsWith('E3')) badgeColor = 'bg-purple-950 text-purple-300 border-purple-600';
                                else if (line === 'E4') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-600';
                                else if (line === 'E5') badgeColor = 'bg-teal-950 text-teal-300 border-teal-600';

                                return (
                                  <span key={line} className={`px-1 py-0.2 text-[9px] font-bold border rounded ${badgeColor}`}>
                                    {line}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-400">E1-E5</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e1_pcm}
                            onChange={e => handleCellEditChange(item.partCode, 'e1_pcm', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e2_gold}
                            onChange={e => handleCellEditChange(item.partCode, 'e2_gold', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e3_1_pcm}
                            onChange={e => handleCellEditChange(item.partCode, 'e3_1_pcm', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e3_2_gold}
                            onChange={e => handleCellEditChange(item.partCode, 'e3_2_gold', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e3_3_gold}
                            onChange={e => handleCellEditChange(item.partCode, 'e3_3_gold', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e4_bare}
                            onChange={e => handleCellEditChange(item.partCode, 'e4_bare', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={rowEdit.e5_bare}
                            onChange={e => handleCellEditChange(item.partCode, 'e5_bare', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>

                        {/* Batch Edit Matrix Section */}
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.1"
                            value={rowEdit.newSpecMm}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const calc = calculateRegrindMatrix(val, rowEdit.scrapLimitMm || 0, rowEdit.perGrindMm || '');
                              handleCellEditChange(item.partCode, 'newSpecMm', val);
                              handleCellEditChange(item.partCode, 'totalGrindMm', calc.totalGrindMm);
                              handleCellEditChange(item.partCode, 'regrindCycles', calc.regrindCycles);
                            }}
                            className="w-full bg-[#111111] text-center text-emerald-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.1"
                            value={rowEdit.scrapLimitMm}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const calc = calculateRegrindMatrix(rowEdit.newSpecMm || 0, val, rowEdit.perGrindMm || '');
                              handleCellEditChange(item.partCode, 'scrapLimitMm', val);
                              handleCellEditChange(item.partCode, 'totalGrindMm', calc.totalGrindMm);
                              handleCellEditChange(item.partCode, 'regrindCycles', calc.regrindCycles);
                            }}
                            className="w-full bg-[#111111] text-center text-amber-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={rowEdit.perGrindMm}
                            onChange={e => {
                              const pg = e.target.value;
                              const calc = calculateRegrindMatrix(rowEdit.newSpecMm || 0, rowEdit.scrapLimitMm || 0, pg);
                              handleCellEditChange(item.partCode, 'perGrindMm', pg);
                              handleCellEditChange(item.partCode, 'totalGrindMm', calc.totalGrindMm);
                              handleCellEditChange(item.partCode, 'regrindCycles', calc.regrindCycles);
                            }}
                            className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={rowEdit.totalGrindMm}
                            onChange={e => handleCellEditChange(item.partCode, 'totalGrindMm', e.target.value)}
                            className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={rowEdit.regrindCycles}
                            onChange={e => handleCellEditChange(item.partCode, 'regrindCycles', e.target.value)}
                            className="w-full bg-[#111111] text-center text-purple-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={rowEdit.note}
                            onChange={e => handleCellEditChange(item.partCode, 'note', e.target.value)}
                            className="w-full bg-[#111111] text-slate-300 border border-[#666666] px-1 py-0.5 text-[11px] font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 text-center bg-[#182818]">
                          <div className="flex items-center justify-center gap-1 text-[11px] text-[#00FF00] font-mono font-bold">
                            EDITING
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (isEditingThisRow && inlineEditRowData) {
                    return (
                      <tr key={item.partCode} className="bg-[#242416] border-b border-[#FFCC00] animate-fadeIn">
                        <td className="py-1 px-2 text-center font-bold text-[#FFCC00] border-r border-[#444444]">
                          {item.no}
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444] min-w-[145px]">
                          <select
                            value={inlineEditRowData.stage}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, stage: e.target.value })}
                            className="w-full bg-[#111111] text-[#FFCC00] border border-[#FFCC00] p-1 text-[11px] font-mono focus:outline-none min-w-[140px]"
                          >
                            {allStages.map(stg => (
                              <option key={stg} value={stg} className="bg-[#111111] text-white">
                                {stg}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={inlineEditRowData.partName}
                              onChange={e => setInlineEditRowData({ ...inlineEditRowData, partName: e.target.value })}
                              className="w-full bg-[#111111] text-white border border-[#FFCC00] px-1 py-0.5 text-xs font-bold font-mono focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444] text-center min-w-[125px]">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {item.applicableLines && item.applicableLines.length > 0 ? (
                              item.applicableLines.map((line: string) => {
                                let badgeColor = 'bg-sky-950 text-sky-300 border-sky-600';
                                if (line === 'E2') badgeColor = 'bg-amber-950 text-amber-300 border-amber-600';
                                else if (line.startsWith('E3')) badgeColor = 'bg-purple-950 text-purple-300 border-purple-600';
                                else if (line === 'E4') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-600';
                                else if (line === 'E5') badgeColor = 'bg-teal-950 text-teal-300 border-teal-600';

                                return (
                                  <span key={line} className={`px-1 py-0.2 text-[9px] font-bold border rounded ${badgeColor}`}>
                                    {line}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-400">Auto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e1_pcm}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e1_pcm: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e2_gold}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e2_gold: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e3_1_pcm}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e3_1_pcm: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e3_2_gold}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e3_2_gold: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e3_3_gold}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e3_3_gold: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e4_bare}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e4_bare: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.5"
                            value={inlineEditRowData.e5_bare}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, e5_bare: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#111111] text-center text-[#00FF00] border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>

                        {/* Inline Row Direct Edit Matrix Inputs */}
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.1"
                            value={inlineEditRowData.newSpecMm}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const calc = calculateRegrindMatrix(val, inlineEditRowData.scrapLimitMm || 0, inlineEditRowData.perGrindMm || '');
                              setInlineEditRowData({
                                ...inlineEditRowData,
                                newSpecMm: val,
                                totalGrindMm: calc.totalGrindMm,
                                regrindCycles: calc.regrindCycles
                              });
                            }}
                            className="w-full bg-[#111111] text-center text-emerald-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="number"
                            step="0.1"
                            value={inlineEditRowData.scrapLimitMm}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const calc = calculateRegrindMatrix(inlineEditRowData.newSpecMm || 0, val, inlineEditRowData.perGrindMm || '');
                              setInlineEditRowData({
                                ...inlineEditRowData,
                                scrapLimitMm: val,
                                totalGrindMm: calc.totalGrindMm,
                                regrindCycles: calc.regrindCycles
                              });
                            }}
                            className="w-full bg-[#111111] text-center text-amber-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={inlineEditRowData.perGrindMm}
                            onChange={e => {
                              const pg = e.target.value;
                              const calc = calculateRegrindMatrix(inlineEditRowData.newSpecMm || 0, inlineEditRowData.scrapLimitMm || 0, pg);
                              setInlineEditRowData({
                                ...inlineEditRowData,
                                perGrindMm: pg,
                                totalGrindMm: calc.totalGrindMm,
                                regrindCycles: calc.regrindCycles
                              });
                            }}
                            className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={inlineEditRowData.totalGrindMm}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, totalGrindMm: e.target.value })}
                            className="w-full bg-[#111111] text-center text-purple-300 border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={inlineEditRowData.regrindCycles}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, regrindCycles: e.target.value })}
                            className="w-full bg-[#111111] text-center text-purple-300 font-bold border border-[#666666] py-0.5 text-xs font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 border-r border-[#444444]">
                          <input
                            type="text"
                            value={inlineEditRowData.note}
                            onChange={e => setInlineEditRowData({ ...inlineEditRowData, note: e.target.value })}
                            className="w-full bg-[#111111] text-slate-300 border border-[#666666] px-1 py-0.5 text-[11px] font-mono"
                          />
                        </td>
                        <td className="py-1 px-1 text-center bg-[#282414]">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveInlineEdit}
                              className="px-2 py-1 bg-[#FFCC00] hover:bg-[#e6b800] text-black font-bold text-[11px] flex items-center gap-0.5 cursor-pointer shadow-sm"
                              title="บันทึกการแก้ไข (Save)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>บันทึก</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineEditingPartCode(null);
                                setInlineEditRowData(null);
                              }}
                              className="p-1 bg-[#222222] hover:bg-[#333333] text-slate-400 hover:text-white border border-[#666666] cursor-pointer"
                              title="ยกเลิก (Cancel)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.partCode}
                      className={`transition-colors border-b border-[#444444] ${
                        isSelected
                          ? 'bg-[#2a2a2a]'
                          : 'bg-[#1e1e1e] hover:bg-[#282828]'
                      }`}
                    >
                      {/* 1. Identification */}
                      <td className="py-1 px-2 text-center font-bold text-slate-400 border-r border-[#444444]">
                        {item.no}
                      </td>
                      <td className="py-1 px-2 border-r border-[#444444] min-w-[145px]">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold border bg-[#111111] uppercase whitespace-nowrap ${getStageColor(item.stage)}`}>
                          {item.stage}
                        </span>
                      </td>
                      <td className="py-1 px-2 font-bold text-white border-r border-[#444444]">
                        <div className="flex items-center justify-between gap-1 group">
                          <div>
                            <span 
                              onClick={() => setSelectedPartFor3D(item)} 
                              className="block cursor-pointer hover:text-[#00FF00] transition-colors leading-tight"
                              title="คลิกเพื่อดู 3D Blueprint และตารางสเปกคำนวณรอบเจียร"
                            >
                              {item.partName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                DWG: {item.drawingNo}
                              </span>
                              {item.partName.includes('Ø7') && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700 font-bold">
                                  Ø7
                                </span>
                              )}
                              {item.partName.includes('Ø5') && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                                  Ø5
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPartFor3D(item);
                              }}
                              className="p-1 rounded bg-[#111111] hover:bg-[#00FF00]/20 text-slate-400 hover:text-[#00FF00] border border-[#444444] transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                              title="เปิดแบบ 3D Blueprint / คำนวณรอบเจียรอัตโนมัติ"
                            >
                              <Box className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Installed Lines Badges (Idea 4) */}
                      <td className="py-1 px-1.5 border-r border-[#444444] text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {item.applicableLines && item.applicableLines.length > 0 ? (
                            item.applicableLines.map((line: string) => {
                              let badgeColor = 'bg-sky-950 text-sky-300 border-sky-600';
                              if (line === 'E2') badgeColor = 'bg-amber-950 text-amber-300 border-amber-600';
                              else if (line.startsWith('E3')) badgeColor = 'bg-purple-950 text-purple-300 border-purple-600';
                              else if (line === 'E4') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-600';
                              else if (line === 'E5') badgeColor = 'bg-teal-950 text-teal-300 border-teal-600';

                              const lineQtyMap: Record<string, number | undefined> = {
                                'E1': item.installQty.e1,
                                'E2': item.installQty.e2,
                                'E3-1': item.installQty.e3_1,
                                'E3-2': item.installQty.e3_2,
                                'E3-3': item.installQty.e3_3,
                                'E4': item.installQty.e4,
                                'E5': item.installQty.e5,
                              };
                              const qty = lineQtyMap[line];

                              return (
                                <span
                                  key={line}
                                  className={`px-1 py-0.2 rounded text-[10px] font-bold border ${badgeColor}`}
                                  title={`${line}: ${qty !== undefined ? `${qty} pcs installed` : 'Active'}`}
                                >
                                  {line}{qty ? ` (${qty})` : ''}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* 2. Shot Usage Cycle Standards */}
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e1_pcm !== undefined ? `${item.shotLifeCycle.e1_pcm}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e2_gold !== undefined ? `${item.shotLifeCycle.e2_gold}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e3_1_pcm !== undefined ? `${item.shotLifeCycle.e3_1_pcm}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e3_2_gold !== undefined ? `${item.shotLifeCycle.e3_2_gold}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e3_3_gold !== undefined ? `${item.shotLifeCycle.e3_3_gold}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e4_bare !== undefined ? `${item.shotLifeCycle.e4_bare}M` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-[#00FF00] border-r border-[#444444]">
                        {item.shotLifeCycle.e5_bare !== undefined ? `${item.shotLifeCycle.e5_bare}M` : '-'}
                      </td>

                      {/* 3. Regrind Standards Matrix (Specs & Calculated Cycles) */}
                      <td className="py-1 px-2 text-center text-emerald-300 font-bold border-r border-[#444444]">
                        {item.newSpecMm ? `${item.newSpecMm.toFixed(2)} mm` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-amber-300 font-bold border-r border-[#444444]">
                        {item.scrapLimitMm ? `${item.scrapLimitMm.toFixed(2)} mm` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-[#444444]">
                        {isDisposable ? (
                          <span className="text-[10px] text-[#C40045] bg-[#22000c] px-1 py-0.2 border border-[#C40045]">
                            Disposable
                          </span>
                        ) : (
                          <span className="text-purple-300">{item.regrindStandard?.perGrindMm || '-'}</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center text-purple-300 border-r border-[#444444]">
                        {item.regrindStandard?.totalGrindMm !== '-' && item.regrindStandard?.totalGrindMm ? `${item.regrindStandard.totalGrindMm} mm` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-purple-300 font-bold border-r border-[#444444]">
                        {item.regrindStandard?.regrindCycles ?? '-'}
                      </td>
                      <td 
                        className="py-1 px-2 text-slate-300 text-[11px] truncate max-w-[180px] border-r border-[#444444]" 
                        title={item.regrindStandard?.note}
                      >
                        {item.regrindStandard?.note && item.regrindStandard?.note !== '-' ? item.regrindStandard.note : '-'}
                      </td>

                      {/* 4. Row Action Buttons: Intuitive Easy Reorder, Edit and Delete */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Easy Intuitive Reorder Controls (Top / Up / Down / Bottom) */}
                          {(() => {
                            const itemIdx = partMasters.findIndex(p => p.partCode === item.partCode);
                            const isFirst = itemIdx === 0;
                            const isLast = itemIdx === partMasters.length - 1;
                            return (
                              <div className="flex items-center gap-1 border-r border-[#444444] pr-2 mr-0.5 font-mono">
                                <span className="text-[10px] font-bold text-slate-400 bg-[#111111] px-1.5 py-0.5 rounded border border-[#333333]" title={`ลำดับปัจจุบันที่ ${itemIdx + 1}`}>
                                  #{itemIdx + 1}
                                </span>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePart(item.partCode, 'top');
                                  }}
                                  disabled={isFirst}
                                  className={`p-1 rounded text-[10px] font-bold border transition-all ${
                                    isFirst
                                      ? 'bg-[#111111] text-slate-700 border-slate-800 cursor-not-allowed'
                                      : 'bg-[#1a1a1a] hover:bg-cyan-500/20 text-cyan-400 border-[#555555] hover:border-cyan-400 cursor-pointer'
                                  }`}
                                  title="ย้ายขึ้นบนสุด (Move to Top)"
                                >
                                  <ChevronsUp className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePart(item.partCode, 'up');
                                  }}
                                  disabled={isFirst}
                                  className={`p-1 rounded text-[11px] font-bold border transition-all ${
                                    isFirst
                                      ? 'bg-[#111111] text-slate-700 border-slate-800 cursor-not-allowed'
                                      : 'bg-[#1a1a1a] hover:bg-[#00FF00]/20 text-[#00FF00] border-[#555555] hover:border-[#00FF00] cursor-pointer'
                                  }`}
                                  title="เลื่อนขึ้น 1 ลำดับ (Move Up)"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePart(item.partCode, 'down');
                                  }}
                                  disabled={isLast}
                                  className={`p-1 rounded text-[11px] font-bold border transition-all ${
                                    isLast
                                      ? 'bg-[#111111] text-slate-700 border-slate-800 cursor-not-allowed'
                                      : 'bg-[#1a1a1a] hover:bg-[#00FF00]/20 text-[#00FF00] border-[#555555] hover:border-[#00FF00] cursor-pointer'
                                  }`}
                                  title="เลื่อนลง 1 ลำดับ (Move Down)"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePart(item.partCode, 'bottom');
                                  }}
                                  disabled={isLast}
                                  className={`p-1 rounded text-[10px] font-bold border transition-all ${
                                    isLast
                                      ? 'bg-[#111111] text-slate-700 border-slate-800 cursor-not-allowed'
                                      : 'bg-[#1a1a1a] hover:bg-cyan-500/20 text-cyan-400 border-[#555555] hover:border-cyan-400 cursor-pointer'
                                  }`}
                                  title="ย้ายลงล่างสุด (Move to Bottom)"
                                >
                                  <ChevronsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartInlineEdit(item);
                            }}
                            className="p-1.5 bg-[#111111] hover:bg-[#333333] text-[#00FF00] border border-[#555555] hover:border-[#00FF00] rounded transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลชิ้นส่วนพาร์ทแบบ Inline (Edit Part Row)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetPart(item);
                            }}
                            className="p-1.5 bg-[#111111] hover:bg-[#2b000a] text-slate-400 hover:text-[#C40045] border border-[#555555] hover:border-[#C40045] rounded transition-colors cursor-pointer"
                            title="ลบชิ้นส่วนนี้ (Delete Part)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ======================================================== */}
      {/* 6. DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      <DeleteConfirmationModal
        isOpen={!!deleteTargetPart}
        onClose={() => setDeleteTargetPart(null)}
        onConfirm={handleConfirmDeletePart}
        title="ยืนยันการลบชิ้นส่วนแม่พิมพ์ (Delete Part Master)"
        itemName={deleteTargetPart ? `${deleteTargetPart.partName} (${deleteTargetPart.partCode})` : ''}
        itemDetails={deleteTargetPart ? `Stage: ${deleteTargetPart.stage} | Total Installed: ${deleteTargetPart.installQty.totalQty} EA` : ''}
        warningText="การลบชิ้นส่วนนี้จะลบสเปกอายุการใช้งาน (Life Standards) และจำนวนติดตั้งในสายการผลิต (Matrix) ทั้งหมดออกอย่างถาวร"
      />

      {/* ======================================================== */}
      {/* 7. STAGE GROUPING MANAGEMENT MODAL */}
      {/* ======================================================== */}
      <StageManagementModal
        isOpen={isStageManagerOpen}
        onClose={() => setIsStageManagerOpen(false)}
        onSave={loadDatabaseData}
      />

      {/* ======================================================== */}
      {/* 8. 3D BLUEPRINT & REGRIND CALCULATION MODAL */}
      {/* ======================================================== */}
      <Part3DBlueprintModal
        isOpen={!!selectedPartFor3D}
        onClose={() => setSelectedPartFor3D(null)}
        partRow={selectedPartFor3D}
      />

    </div>
  );
};
