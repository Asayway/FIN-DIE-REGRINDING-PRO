import { ProductionLineId } from '../types';

export interface StageBlockConfig {
  blockIndex: number;      // 1-based (e.g. 1)
  blockName: string;       // e.g. "Unified Stage Block"
  startCol: number;        // e.g. 1
  endCol: number;          // e.g. 68
  colsInBlock: number;     // e.g. 68
}

export type DieGridType = 'GRID_PINS' | 'DIE_SEGMENTS' | 'ROW_BLADES' | 'CUT_OFF' | 'SIDE_CUT';

export interface LineStageGridConfig {
  stageId: string;
  stageName: string;
  shortName: string;
  stageCategory: 'PUNCH_MATRIX' | 'DIE_SEGMENT' | 'BLADE' | 'CUTOFF' | 'SIDECUT';
  partCode: string;
  partName: string;
  material: string;
  drawingNo: string;
  rows: number;            // 3 (1st, 2nd, 3rd) or 2 (Upper, Down) or 1 (Sheet/Blade)
  cols: number;            // e.g. 68 (E2), 60 (E1), 66 (E4/E5), 56 (E3-3), 46 (E6)
  totalPins: number;       // Total quantity in 1 set
  maxShots: number;
  maxRegrind: number;
  blocks: StageBlockConfig[];
  gridType: DieGridType;
  sheetCount?: number;     // For Slit Die A/B
}

export interface LineDieMatrixSpec {
  lineId: ProductionLineId;
  lineName: string;
  tubeSize: string;
  finType: string;
  totalPinsPerSet: number;
  stages: LineStageGridConfig[];
}

/**
 * Creates 1 Unified Block per Stage (Full Width, no arbitrary subdivisions)
 */
const makeUnifiedBlock = (cols: number, name = 'Unified Stage Block'): StageBlockConfig[] => [
  {
    blockIndex: 1,
    blockName: name,
    startCol: 1,
    endCol: cols,
    colsInBlock: cols
  }
];

/**
 * Factory fin press stages generator based on real physical mold check sheets:
 * 1. BURRING PUNCH (1 Block, cols x 3 rows: 1st, 2nd, 3rd)
 * 2. PIERCE PUNCH (1 Block, cols x 3 rows: 1st, 2nd, 3rd)
 * 3. IRONING PUNCH (1 Block, cols x 3 rows: 1st, 2nd, 3rd)
 * 4. REFLARE PUNCH (1 Block, cols x 3 rows: 1st, 2nd, 3rd)
 * 5. SLIT / LOUVER PUNCH (1 Block, cols x 3 rows: 1st, 2nd, 3rd)
 * 6. SLIT DIE A & B (1 Block: Die A 1-12 sheet, Die B 1-12 sheet)
 * 7. ROW SLIT BLADE (1 Block: Blades 1-N with shot recording)
 * 8. CUT OFF (1 Block: No 1-4, Up/Down)
 * 9. SIDE CUT (1 Block: No 1-2, Up/Down)
 */
export const createStandardStages = (
  lineId: ProductionLineId,
  cols: number,
  tubeSize: string,
  isLouver = false,
  bladeCount = cols,
  slitDieSheets = 12
): LineStageGridConfig[] => {
  const totalPunchQty = cols * 3;

  // 1. BURRING PUNCH STAGE
  const burringPunch: LineStageGridConfig = {
    stageId: 's-burr',
    stageName: 'BURRING STAGE',
    shortName: 'BURRING',
    stageCategory: 'PUNCH_MATRIX',
    partCode: `P-BURR-${lineId}`,
    partName: `BURRING PUNCH (${tubeSize})`,
    material: 'SKH-51 (Powder HSS)',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-BURR`,
    rows: 3,
    cols: cols,
    totalPins: totalPunchQty,
    maxShots: 100000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `BURRING 1 BLOCK (${cols} Col × 3 Row = ${totalPunchQty} EA)`),
    gridType: 'GRID_PINS'
  };

  // 2. PIERCE PUNCH STAGE
  const piercePunch: LineStageGridConfig = {
    stageId: 's-pierce',
    stageName: 'PIERCE STAGE',
    shortName: 'PIERCE',
    stageCategory: 'PUNCH_MATRIX',
    partCode: `P-PIERCE-${lineId}`,
    partName: `PIERCE PUNCH (${tubeSize})`,
    material: 'SKH-51 (Powder HSS)',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-PIERCE`,
    rows: 3,
    cols: cols,
    totalPins: totalPunchQty,
    maxShots: 100000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `PIERCE 1 BLOCK (${cols} Col × 3 Row = ${totalPunchQty} EA)`),
    gridType: 'GRID_PINS'
  };

  // 3. IRONING PUNCH STAGE
  const ironingPunch: LineStageGridConfig = {
    stageId: 's-iron',
    stageName: 'IRONING STAGE',
    shortName: 'IRONING',
    stageCategory: 'PUNCH_MATRIX',
    partCode: `P-IRON-${lineId}`,
    partName: `IRONING PUNCH & DIE (${tubeSize})`,
    material: 'Carbide V30 / DC53',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-IRON`,
    rows: 3,
    cols: cols,
    totalPins: totalPunchQty,
    maxShots: 80000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `IRONING 1 BLOCK (${cols} Col × 3 Row = ${totalPunchQty} EA)`),
    gridType: 'GRID_PINS'
  };

  // 4. REFLARE PUNCH STAGE
  const reflarePunch: LineStageGridConfig = {
    stageId: 's-reflare',
    stageName: 'REFLARE STAGE',
    shortName: 'REFLARE',
    stageCategory: 'PUNCH_MATRIX',
    partCode: `P-REFL-${lineId}`,
    partName: `REFLARE PUNCH & DIE (${tubeSize})`,
    material: 'SKH-51 (TiCN Coated)',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-REFL`,
    rows: 3,
    cols: cols,
    totalPins: totalPunchQty,
    maxShots: 90000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `REFLARE 1 BLOCK (${cols} Col × 3 Row = ${totalPunchQty} EA)`),
    gridType: 'GRID_PINS'
  };

  // 5. SLIT / LOUVER PUNCH STAGE
  const slitLouverPunch: LineStageGridConfig = {
    stageId: 's-slit-punch',
    stageName: isLouver ? 'LOUVER PUNCH STAGE' : 'SLIT PUNCH STAGE',
    shortName: isLouver ? 'LOUVER PUNCH' : 'SLIT PUNCH',
    stageCategory: 'PUNCH_MATRIX',
    partCode: isLouver ? `P-LOUV-${lineId}` : `P-SLIT-${lineId}`,
    partName: isLouver ? `LOUVER PUNCH (${tubeSize})` : `SLIT PUNCH (${tubeSize})`,
    material: 'Carbide V30',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-SLIT-P`,
    rows: 3,
    cols: cols,
    totalPins: totalPunchQty,
    maxShots: 85000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `${isLouver ? 'LOUVER' : 'SLIT'} PUNCH 1 BLOCK (${cols} Col × 3 Row = ${totalPunchQty} EA)`),
    gridType: 'GRID_PINS'
  };

  // 6. SLIT / LOUVER DIE STAGE
  const slitLouverDie: LineStageGridConfig = {
    stageId: 's-slit-die',
    stageName: isLouver ? 'LOUVER DIE STAGE' : 'SLIT DIE STAGE',
    shortName: isLouver ? 'LOUVER DIE' : 'SLIT DIE',
    stageCategory: 'DIE_SEGMENT',
    partCode: `D-SLIT-${lineId}`,
    partName: isLouver ? `LOUVER DIE A & B (${tubeSize})` : `SLIT DIE A & B (${tubeSize})`,
    material: 'Carbide V30 / Tungsten',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-SLIT-D`,
    rows: 2,
    cols: slitDieSheets,
    sheetCount: slitDieSheets,
    totalPins: slitDieSheets * 2,
    maxShots: 90000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(slitDieSheets, `${isLouver ? 'LOUVER' : 'SLIT'} DIE 1 BLOCK (DIE A: 1-${slitDieSheets}, DIE B: 1-${slitDieSheets})`),
    gridType: 'DIE_SEGMENTS'
  };

  // 7. ROW SLIT BLADE STAGE
  const rowSlitBlade: LineStageGridConfig = {
    stageId: 's-row-slit',
    stageName: 'ROW SLIT STAGE',
    shortName: 'ROW SLIT',
    stageCategory: 'BLADE',
    partCode: `B-ROWSLIT-${lineId}`,
    partName: `ROW SLIT BLADE (${tubeSize})`,
    material: 'SKD-11 / DC53 Hardened',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-RSLIT`,
    rows: 1,
    cols: bladeCount,
    totalPins: bladeCount,
    maxShots: 75000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(bladeCount, `ROW SLIT BLADE 1 BLOCK (Blade No. 1 to ${bladeCount})`),
    gridType: 'ROW_BLADES'
  };

  // 8. CUT OFF STAGE
  const cutoffStage: LineStageGridConfig = {
    stageId: 's-cutoff',
    stageName: 'CUT OFF STAGE',
    shortName: 'CUT OFF',
    stageCategory: 'CUTOFF',
    partCode: `C-CUTOFF-${lineId}`,
    partName: `CUT OFF PUNCH & DIE (${tubeSize})`,
    material: 'DC53 / High Alloy Tool Steel',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-CUTOFF`,
    rows: 2,
    cols: 4,
    totalPins: 4 * 2,
    maxShots: 60000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(4, 'CUT OFF 1 BLOCK (No. 1 to 4 • Upper / Down)'),
    gridType: 'CUT_OFF'
  };

  // 9. SIDE CUT STAGE
  const sidecutStage: LineStageGridConfig = {
    stageId: 's-sidecut',
    stageName: 'SIDE CUT STAGE',
    shortName: 'SIDE CUT',
    stageCategory: 'SIDECUT',
    partCode: `S-SIDECUT-${lineId}`,
    partName: `SIDE CUT PUNCH & DIE (${tubeSize})`,
    material: 'DC53 / SKD-11',
    drawingNo: `DWG-FD-${tubeSize.replace('Ø', '')}-${lineId}-SIDECUT`,
    rows: 2,
    cols: 2,
    totalPins: 2 * 2,
    maxShots: 60000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(2, 'SIDE CUT 1 BLOCK (No. 1 to 2 • Upper / Down)'),
    gridType: 'SIDE_CUT'
  };

  // 10. S1 CENTER NOTCH (E1 Only)
  const s1CenterNotch: LineStageGridConfig = {
    stageId: 's-s1-center-notch',
    stageName: 'S1 CENTER NOTCH STAGE',
    shortName: 'S1 CENTER NOTCH',
    stageCategory: 'PUNCH_MATRIX',
    partCode: 'DWG-S1-002',
    partName: 'S1 CENTER NOTCH PUNCH',
    material: 'SKD-11 / Powder HSS',
    drawingNo: 'DWG-S1-002',
    rows: 3,
    cols: cols,
    totalPins: cols * 3,
    maxShots: 27000000,
    maxRegrind: 15,
    blocks: makeUnifiedBlock(cols, `S1 CENTER NOTCH 1 BLOCK (${cols} Col × 3 Row)`),
    gridType: 'GRID_PINS'
  };

  // 11. CORNER CUT (E1, E4 Only)
  const cornerCut: LineStageGridConfig = {
    stageId: 's-corner-cut',
    stageName: 'CORNER CUT STAGE',
    shortName: 'CORNER CUT',
    stageCategory: 'PUNCH_MATRIX',
    partCode: 'DWG-CC-002',
    partName: 'CORNER CUT PUNCH',
    material: 'SKD-11 / Powder HSS',
    drawingNo: 'DWG-CC-002',
    rows: 3,
    cols: cols,
    totalPins: cols * 3,
    maxShots: 27000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(cols, `CORNER CUT 1 BLOCK (${cols} Col × 3 Row)`),
    gridType: 'GRID_PINS'
  };

  // 12. S5 CENTER NOTCH (E1 Only)
  const s5CenterNotch: LineStageGridConfig = {
    stageId: 's-s5-center-notch',
    stageName: 'S5 CENTER NOTCH STAGE',
    shortName: 'S5 CENTER NOTCH',
    stageCategory: 'PUNCH_MATRIX',
    partCode: 'DWG-S5-002',
    partName: 'CORNER CUT S1/S0 PUNCH',
    material: 'SKD-11 / Powder HSS',
    drawingNo: 'DWG-S5-002',
    rows: 3,
    cols: cols,
    totalPins: cols * 3,
    maxShots: 27000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(cols, `S5 CENTER NOTCH 1 BLOCK (${cols} Col × 3 Row)`),
    gridType: 'GRID_PINS'
  };

  // 13. HITCH FEED (All Lines)
  const hitchFeed: LineStageGridConfig = {
    stageId: 's-hitch-feed',
    stageName: 'HITCH FEED STAGE',
    shortName: 'HITCH FEED',
    stageCategory: 'PUNCH_MATRIX',
    partCode: tubeSize === 'Ø5' ? 'DWG-HF-001' : 'DWG-HF-002',
    partName: 'HITCH FEED PIN',
    material: 'SKD-11 / DC53',
    drawingNo: tubeSize === 'Ø5' ? 'DWG-HF-001' : 'DWG-HF-002',
    rows: 3,
    cols: cols,
    totalPins: cols * 3,
    maxShots: 100000000,
    maxRegrind: 5,
    blocks: makeUnifiedBlock(cols, `HITCH FEED 1 BLOCK (${cols} Col × 3 Row)`),
    gridType: 'GRID_PINS'
  };

  // 14. WIDE LOWER (E3-2, E3-3 Only)
  const wideLower: LineStageGridConfig = {
    stageId: 's-wide-lower',
    stageName: 'WIDE LOWER STAGE',
    shortName: 'WIDE LOWER',
    stageCategory: 'PUNCH_MATRIX',
    partCode: 'DWG-WL-001',
    partName: 'LOUVER PUNCH (WIDE LOWER) UP',
    material: 'Carbide V30',
    drawingNo: 'DWG-WL-001',
    rows: 3,
    cols: cols,
    totalPins: cols * 3,
    maxShots: 100000000,
    maxRegrind: 4,
    blocks: makeUnifiedBlock(cols, `WIDE LOWER 1 BLOCK (${cols} Col × 3 Row)`),
    gridType: 'GRID_PINS'
  };

  // Construct stages dynamically based on Line ID / Zone installed parts
  const activeStages: LineStageGridConfig[] = [];

  // Always include Pierce & Burring (as separate Burring / Pierce punches)
  activeStages.push(burringPunch);
  activeStages.push(piercePunch);

  // Ironing
  if (lineId === 'E1' || lineId === 'E2' || lineId === 'E3-1' || lineId === 'E4' || lineId === 'E5') {
    activeStages.push(ironingPunch);
  }

  // Wide Lower (E3-2, E3-3)
  if (lineId === 'E3-2' || lineId === 'E3-3') {
    activeStages.push(wideLower);
  }

  // Reflare
  if (lineId === 'E1' || lineId === 'E2' || lineId === 'E3-1' || lineId === 'E4' || lineId === 'E5') {
    activeStages.push(reflarePunch);
  }

  // Slit / Louver
  if (lineId === 'E1' || lineId === 'E2' || lineId === 'E3-1' || lineId === 'E3-2' || lineId === 'E4' || lineId === 'E5') {
    activeStages.push(slitLouverPunch);
    activeStages.push(slitLouverDie);
  }

  // S1 Center Notch (E1)
  if (lineId === 'E1') {
    activeStages.push(s1CenterNotch);
  }

  // Corner Cut (E1, E4, E5)
  if (lineId === 'E1' || lineId === 'E4' || lineId === 'E5') {
    activeStages.push(cornerCut);
  }

  // S5 Center Notch (E1)
  if (lineId === 'E1') {
    activeStages.push(s5CenterNotch);
  }

  // Row Slit Blade (All lines)
  activeStages.push(rowSlitBlade);

  // Cut Off
  activeStages.push(cutoffStage);

  // Side Cut
  activeStages.push(sidecutStage);

  // Hitch Feed (All lines)
  activeStages.push(hitchFeed);

  return activeStages;
};

/**
 * Complete Matrix Configuration for all Fin Press Production Lines (E1 to E6)
 * Based on factory inspection check sheets:
 * - Line E1: Ø7 (60 Cols x 3 Rows = 180 EA / Stage Block)
 * - Line E2: Ø5 (68 Cols x 3 Rows = 204 EA / Stage Block) - Matches physical check list
 * - Line E3-1: Ø7 Slit (60 Cols x 3 Rows = 180 EA)
 * - Line E3-2: Ø7 Louver (60 Cols x 3 Rows = 180 EA)
 * - Line E3-3: Ø7 Wide Lower 4P (56 Cols x 3 Rows = 168 EA)
 * - Line E4: Ø5 Slit (66 Cols x 3 Rows = 198 EA)
 * - Line E5: Ø5 Slit (66 Cols x 3 Rows = 198 EA)
 * - Line E6: Ø7 Slit (46 Cols x 3 Rows = 138 EA)
 */
export const LINE_DIE_MATRIX_CONFIG: Record<ProductionLineId, LineDieMatrixSpec> = {
  // LINE E1: Ø7 Slit, 180 EA (60 Cols x 3 Rows)
  'E1': {
    lineId: 'E1',
    lineName: 'Line E1 (Ø7 Slit)',
    tubeSize: 'Ø7',
    finType: 'Slit (half)',
    totalPinsPerSet: 180,
    stages: createStandardStages('E1', 60, 'Ø7', false, 118, 15)
  },

  // LINE E2: Ø5 Slit, 204 EA (68 Cols x 3 Rows) - Direct from FIN PRESS MOLD/DIE CHECK LIST
  'E2': {
    lineId: 'E2',
    lineName: 'Line E2 (Ø5 Slit 68 Row)',
    tubeSize: 'Ø5',
    finType: 'Slit (half)',
    totalPinsPerSet: 204,
    stages: createStandardStages('E2', 68, 'Ø5', false, 68, 12)
  },

  // LINE E3-1: Ø7 Slit, 180 EA (60 Cols x 3 Rows)
  'E3-1': {
    lineId: 'E3-1',
    lineName: 'Line E3-1 (Ø7 Slit 3P)',
    tubeSize: 'Ø7',
    finType: 'Slit (half)',
    totalPinsPerSet: 180,
    stages: createStandardStages('E3-1', 60, 'Ø7', false, 118, 15)
  },

  // LINE E3-2: Ø7 Louver, 180 EA (60 Cols x 3 Rows)
  'E3-2': {
    lineId: 'E3-2',
    lineName: 'Line E3-2 (Ø7 Louver)',
    tubeSize: 'Ø7',
    finType: 'Louver',
    totalPinsPerSet: 180,
    stages: createStandardStages('E3-2', 60, 'Ø7', true, 118, 15)
  },

  // LINE E3-3: Ø7 Wide Lower 4P, 168 EA (56 Cols x 3 Rows)
  'E3-3': {
    lineId: 'E3-3',
    lineName: 'Line E3-3 (Ø7 Wide Lower 4P)',
    tubeSize: 'Ø7',
    finType: 'Wide Lower 4P',
    totalPinsPerSet: 168,
    stages: createStandardStages('E3-3', 56, 'Ø7', true, 82, 12)
  },

  // LINE E4: Ø5 Slit, 198 EA (66 Cols x 3 Rows)
  'E4': {
    lineId: 'E4',
    lineName: 'Line E4 (Ø5 Slit 66 Row)',
    tubeSize: 'Ø5',
    finType: 'Slit (half)',
    totalPinsPerSet: 198,
    stages: createStandardStages('E4', 66, 'Ø5', false, 66, 12)
  },

  // LINE E5: Ø5 Slit, 198 EA (66 Cols x 3 Rows)
  'E5': {
    lineId: 'E5',
    lineName: 'Line E5 (Ø5 Slit 66 Row)',
    tubeSize: 'Ø5',
    finType: 'Slit (half)',
    totalPinsPerSet: 198,
    stages: createStandardStages('E5', 66, 'Ø5', false, 66, 12)
  }
};
