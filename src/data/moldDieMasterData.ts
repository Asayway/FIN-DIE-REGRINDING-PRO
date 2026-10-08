import { MoldDieMasterItem } from '../types';

/**
 * List Spare Parts Mold & Die Heat Exchanger
 * Standard Engineering Master: Exactly 79 Canonical Items from Reference Specification
 * Total System Installed Quantity = 13,343 EA
 */
export const MOLD_DIE_MASTER_ITEMS_2025: MoldDieMasterItem[] = [
  // 1. PIERCE & BURRING (1-5)
  {
    "no": 1,
    "stage": "PIERCE & BURRING",
    "partName": "PIERCE PUNCH (Ø5)",
    "drawingNo": "DWG-PB-001",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 1.5, "e2_gold": 15, "e3_1_pcm": 1.5, "e3_2_gold": 15, "e3_3_gold": 15, "e4_bare": 15, "e5_bare": 15, "e6_pcm": 1.5 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.40", "regrindCycles": "12-13 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 2,
    "stage": "PIERCE & BURRING",
    "partName": "PIERCE PUNCH (Ø7)",
    "drawingNo": "DWG-PB-002",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 1.5, "e2_gold": 15, "e3_1_pcm": 1.5, "e3_2_gold": 15, "e3_3_gold": 15, "e4_bare": 15, "e5_bare": 15, "e6_pcm": 1.5 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.40", "regrindCycles": "12-13 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 3,
    "stage": "PIERCE & BURRING",
    "partName": "BURRING PUNCH (Ø5)",
    "drawingNo": "DWG-PB-003",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 1.5, "e2_gold": 15, "e3_1_pcm": 1.5, "e3_2_gold": 15, "e3_3_gold": 15, "e4_bare": 15, "e5_bare": 15, "e6_pcm": 1.5 },
    "regrindStandard": { "perGrindMm": "0.10 -0.15", "totalGrindMm": "1.50", "regrindCycles": "7-9 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 4,
    "stage": "PIERCE & BURRING",
    "partName": "BURRING PUNCH (Ø7)",
    "drawingNo": "DWG-PB-004",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 1.5, "e2_gold": 15, "e3_1_pcm": 1.5, "e3_2_gold": 15, "e3_3_gold": 15, "e4_bare": 15, "e5_bare": 15, "e6_pcm": 1.5 },
    "regrindStandard": { "perGrindMm": "0.10 -0.15", "totalGrindMm": "1.50", "regrindCycles": "7-9 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 5,
    "stage": "PIERCE & BURRING",
    "partName": "BURRING (WIDE LOWER)",
    "drawingNo": "DWG-PB-005",
    "installQty": { "e3_2": 168, "e3_3": 168, "totalQty": 336 },
    "shotLifeCycle": { "e1_pcm": 1.5, "e2_gold": 15, "e3_1_pcm": 1.5, "e3_2_gold": 15, "e3_3_gold": 15, "e4_bare": 15, "e5_bare": 15, "e6_pcm": 1.5 },
    "regrindStandard": { "perGrindMm": "0.10 -0.15", "totalGrindMm": "1.50", "regrindCycles": "7-9 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },

  // 2. IRONING (6-9)
  {
    "no": 6,
    "stage": "IRONING",
    "partName": "IRONING PUNCH (Ø5)",
    "drawingNo": "DWG-IR-001",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 7,
    "stage": "IRONING",
    "partName": "IRONING DIE (Ø5)",
    "drawingNo": "DWG-IR-002",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 8,
    "stage": "IRONING",
    "partName": "IRONING PUNCH (Ø7)",
    "drawingNo": "DWG-IR-003",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 9,
    "stage": "IRONING",
    "partName": "IRONING DIE (Ø7)",
    "drawingNo": "DWG-IR-004",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },

  // 3. LOUVER (10-11)
  {
    "no": 10,
    "stage": "LOUVER",
    "partName": "LOUVER PUNCH (U)",
    "drawingNo": "DWG-LV-001",
    "installQty": { "e3_2": 180, "totalQty": 180 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 11,
    "stage": "LOUVER",
    "partName": "LOUVER PUNCH (L)",
    "drawingNo": "DWG-LV-002",
    "installQty": { "e3_2": 180, "totalQty": 180 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 100, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 100, "e5_bare": 100, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },

  // 4. REFLARE (12-15)
  {
    "no": 12,
    "stage": "REFLARE",
    "partName": "REFLARE PUNCH 5mm",
    "drawingNo": "DWG-RF-001",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 13,
    "stage": "REFLARE",
    "partName": "REFLARE PUNCH 7mm",
    "drawingNo": "DWG-RF-002",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 14,
    "stage": "REFLARE",
    "partName": "REFLARE DIE (Ø5)",
    "drawingNo": "DWG-RF-003",
    "installQty": { "e1": 180, "e2": 204, "e3_1": 180, "e4": 198, "e5": 198, "totalQty": 1098 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },
  {
    "no": 15,
    "stage": "REFLARE",
    "partName": "REFLARE DIE (Ø7)",
    "drawingNo": "DWG-RF-004",
    "installQty": { "e1": 180, "e2": 204, "e3_1": 180, "e4": 198, "e5": 198, "totalQty": 1098 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "Dispose of after 1 use" }
  },

  // 5. SLIT (16-26)
  {
    "no": 16,
    "stage": "SLIT",
    "partName": "SLIT PUNCH (Ø5)",
    "drawingNo": "DWG-SL-001",
    "installQty": { "e2": 204, "e4": 198, "e5": 198, "totalQty": 600 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 17,
    "stage": "SLIT",
    "partName": "SLIT DIE A (Ø5) 3Row",
    "drawingNo": "DWG-SL-002",
    "installQty": { "e2": 10, "e4": 10, "e5": 10, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 18,
    "stage": "SLIT",
    "partName": "SLIT DIE A (Ø5) 4Row",
    "drawingNo": "DWG-SL-003",
    "installQty": { "e2": 1, "e4": 1, "e5": 1, "totalQty": 3 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 19,
    "stage": "SLIT",
    "partName": "SLIT DIE B (Ø5) 3Row",
    "drawingNo": "DWG-SL-004",
    "installQty": { "e2": 10, "e4": 10, "e5": 10, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 20,
    "stage": "SLIT",
    "partName": "SLIT DIE B (Ø5) 4Row",
    "drawingNo": "DWG-SL-005",
    "installQty": { "e2": 1, "e4": 1, "e5": 1, "totalQty": 3 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 21,
    "stage": "SLIT",
    "partName": "SLIT PUNCH A (Ø7) (Old)",
    "drawingNo": "DWG-SL-006",
    "installQty": { "e3_1": 90, "totalQty": 159 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 22,
    "stage": "SLIT",
    "partName": "SLIT PUNCH B (Ø7) (Old)",
    "drawingNo": "DWG-SL-007",
    "installQty": { "e3_1": 90, "totalQty": 159 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 23,
    "stage": "SLIT",
    "partName": "SLIT DIE UPPER (Ø7) (Old)",
    "drawingNo": "DWG-SL-008",
    "installQty": { "e3_1": 15, "totalQty": 27 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 24,
    "stage": "SLIT",
    "partName": "SLIT DIE DOWN (Ø7) (Old)",
    "drawingNo": "DWG-SL-009",
    "installQty": { "e3_1": 15, "totalQty": 27 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 25,
    "stage": "SLIT",
    "partName": "SLIT PUNCE NEW SLIT (Ø7)",
    "drawingNo": "DWG-SL-010",
    "installQty": { "e1": 180, "e3_1": 180, "totalQty": 498 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },
  {
    "no": 26,
    "stage": "SLIT",
    "partName": "SLIT DIE NEW SLIT (Ø7)",
    "drawingNo": "DWG-SL-011",
    "installQty": { "e1": 15, "e3_1": 15, "totalQty": 42 },
    "shotLifeCycle": { "e1_pcm": 18, "e2_gold": 40, "e3_1_pcm": 18, "e3_2_gold": 40, "e3_3_gold": 40, "e4_bare": 40, "e5_bare": 40, "e6_pcm": 18 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.00", "regrindCycles": "3-4 time", "note": "-" }
  },

  // 6. WIDE LOWER (27-28)
  {
    "no": 27,
    "stage": "WIDE LOWER",
    "partName": "LOUVER PUNCH (WIDE LOWER) UP",
    "drawingNo": "DWG-WL-001",
    "installQty": { "e3_2": 168, "e3_3": 168, "totalQty": 336 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "-" }
  },
  {
    "no": 28,
    "stage": "WIDE LOWER",
    "partName": "LOUVER PUNCH (WIDE LOWER) DOWN",
    "drawingNo": "DWG-WL-002",
    "installQty": { "e3_2": 168, "e3_3": 168, "totalQty": 336 },
    "shotLifeCycle": { "e1_pcm": 50, "e2_gold": 80, "e3_1_pcm": 50, "e3_2_gold": 100, "e3_3_gold": 100, "e4_bare": 80, "e5_bare": 80, "e6_pcm": 50 },
    "regrindStandard": { "perGrindMm": "Dispose of after 1 use", "totalGrindMm": "-", "regrindCycles": "-", "note": "-" }
  },

  // 7. ROW SLIT (29-32)
  {
    "no": 29,
    "stage": "ROW SLIT",
    "partName": "ROW SLIT BLADE (Ø7)",
    "drawingNo": "DWG-RS-001",
    "installQty": { "e1": 118, "e3_1": 118, "totalQty": 326 },
    "shotLifeCycle": { "e1_pcm": 1, "e2_gold": 2, "e3_1_pcm": 1, "e3_2_gold": 2, "e3_3_gold": 2, "e4_bare": 2, "e5_bare": 2, "e6_pcm": 1 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "15 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 30,
    "stage": "ROW SLIT",
    "partName": "ROW SLIT BLADE (Ø5) A",
    "drawingNo": "DWG-RS-002",
    "installQty": { "e2": 34, "e3_3": 33, "e4": 33, "totalQty": 100 },
    "shotLifeCycle": { "e1_pcm": 1, "e2_gold": 2, "e3_1_pcm": 1, "e3_2_gold": 2, "e3_3_gold": 2, "e4_bare": 2, "e5_bare": 2, "e6_pcm": 1 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "15 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 31,
    "stage": "ROW SLIT",
    "partName": "ROW SLIT BLADE (Ø5) B",
    "drawingNo": "DWG-RS-003",
    "installQty": { "e2": 33, "e3_3": 32, "e4": 32, "totalQty": 97 },
    "shotLifeCycle": { "e1_pcm": 1, "e2_gold": 2, "e3_1_pcm": 1, "e3_2_gold": 2, "e3_3_gold": 2, "e4_bare": 2, "e5_bare": 2, "e6_pcm": 1 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "15 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },
  {
    "no": 32,
    "stage": "ROW SLIT",
    "partName": "ROW SLID BLADE (WIDE LOWER) 4P",
    "drawingNo": "DWG-RS-004",
    "installQty": { "e3_2": 82, "e3_3": 82, "totalQty": 164 },
    "shotLifeCycle": { "e1_pcm": 1, "e2_gold": 2, "e3_1_pcm": 1, "e3_2_gold": 2, "e3_3_gold": 2, "e4_bare": 2, "e5_bare": 2, "e6_pcm": 1 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "15 time", "note": "Change every 10 -15 Day (เปลี่ยนทุกๆ 10-15 วัน)" }
  },

  // 8. CUT OFF (33-38)
  {
    "no": 33,
    "stage": "CUT OFF",
    "partName": "CUT OFF PUNCH (WIDE LOWER)",
    "drawingNo": "DWG-CO-001",
    "installQty": { "e3_2": 4, "e3_3": 4, "totalQty": 8 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 34,
    "stage": "CUT OFF",
    "partName": "CUT OFF DIE (WIDE LOWER)",
    "drawingNo": "DWG-CO-002",
    "installQty": { "e3_2": 4, "e3_3": 4, "totalQty": 8 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 35,
    "stage": "CUT OFF",
    "partName": "CUT OFF PUNCH (Ø5)",
    "drawingNo": "DWG-CO-003",
    "installQty": { "e2": 4, "e4": 4, "e5": 4, "totalQty": 12 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 36,
    "stage": "CUT OFF",
    "partName": "CUT OFF PUNCH (Ø7)",
    "drawingNo": "DWG-CO-004",
    "installQty": { "e1": 4, "e3_1": 4, "totalQty": 15 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 37,
    "stage": "CUT OFF",
    "partName": "CUT OFF DIE (Ø5)",
    "drawingNo": "DWG-CO-005",
    "installQty": { "e2": 4, "e4": 4, "e5": 4, "totalQty": 12 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 38,
    "stage": "CUT OFF",
    "partName": "CUT OFF DIE (Ø7)",
    "drawingNo": "DWG-CO-006",
    "installQty": { "e1": 4, "e3_1": 4, "totalQty": 11 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },

  // 9. SIDE CUT (39-44)
  {
    "no": 39,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT PUNCH (3P) (Ø5)",
    "drawingNo": "DWG-SC-001",
    "installQty": { "e2": 2, "e4": 2, "e5": 2, "totalQty": 6 },
    "shotLifeCycle": { "e1_pcm": 10, "e2_gold": 23, "e3_1_pcm": 10, "e3_2_gold": 23, "e3_3_gold": 23, "e4_bare": 23, "e5_bare": 23, "e6_pcm": 10 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.40", "regrindCycles": "7-9 time", "note": "-" }
  },
  {
    "no": 40,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT PUNCH (3P) (Ø7)",
    "drawingNo": "DWG-SC-002",
    "installQty": { "e1": 2, "e3_1": 2, "totalQty": 6 },
    "shotLifeCycle": { "e1_pcm": 10, "e2_gold": 23, "e3_1_pcm": 10, "e3_2_gold": 23, "e3_3_gold": 23, "e4_bare": 23, "e5_bare": 23, "e6_pcm": 10 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.40", "regrindCycles": "7-9 time", "note": "-" }
  },
  {
    "no": 41,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT DIE (3P) (Ø5)",
    "drawingNo": "DWG-SC-003",
    "installQty": { "e2": 2, "e4": 2, "e5": 2, "totalQty": 6 },
    "shotLifeCycle": { "e1_pcm": 10, "e2_gold": 23, "e3_1_pcm": 10, "e3_2_gold": 23, "e3_3_gold": 23, "e4_bare": 23, "e5_bare": 23, "e6_pcm": 10 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "8-10 time", "note": "-" }
  },
  {
    "no": 42,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT DIE (3P) (Ø7)",
    "drawingNo": "DWG-SC-004",
    "installQty": { "e1": 2, "e3_1": 2, "totalQty": 6 },
    "shotLifeCycle": { "e1_pcm": 10, "e2_gold": 23, "e3_1_pcm": 10, "e3_2_gold": 23, "e3_3_gold": 23, "e4_bare": 23, "e5_bare": 23, "e6_pcm": 10 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "8-10 time", "note": "-" }
  },
  {
    "no": 43,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT PUNCH (WIDE LOWER) 4P",
    "drawingNo": "DWG-SC-005",
    "installQty": { "e3_2": 2, "e3_3": 2, "totalQty": 4 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },
  {
    "no": 44,
    "stage": "SIDE CUT",
    "partName": "SIDE CUT DIE (WIDE LOWER) 4P",
    "drawingNo": "DWG-SC-006",
    "installQty": { "e3_2": 2, "e3_3": 2, "totalQty": 4 },
    "shotLifeCycle": { "e1_pcm": 25, "e2_gold": 25, "e3_1_pcm": 25, "e3_2_gold": 25, "e3_3_gold": 25, "e4_bare": 25, "e5_bare": 25, "e6_pcm": 25 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "14-15 time", "note": "-" }
  },

  // 10. S1 CENTER NOTCH (45-58)
  {
    "no": 45,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH A",
    "drawingNo": "DWG-S1-001",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 46,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH B",
    "drawingNo": "DWG-S1-002",
    "installQty": { "e1": 30, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 47,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH C",
    "drawingNo": "DWG-S1-003",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 48,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH D",
    "drawingNo": "DWG-S1-004",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 49,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH E",
    "drawingNo": "DWG-S1-005",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 50,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH F",
    "drawingNo": "DWG-S1-006",
    "installQty": { "e1": 30, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 51,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH G",
    "drawingNo": "DWG-S1-007",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 52,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER NOTCH PUNCH H",
    "drawingNo": "DWG-S1-008",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 53,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH A",
    "drawingNo": "DWG-S1-009",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 54,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH B",
    "drawingNo": "DWG-S1-010",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 55,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH C",
    "drawingNo": "DWG-S1-011",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 56,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH D",
    "drawingNo": "DWG-S1-012",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 57,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH E",
    "drawingNo": "DWG-S1-013",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 58,
    "stage": "S1 CENTER NOTCH",
    "partName": "S1 CENTER DIE PUNCH F",
    "drawingNo": "DWG-S1-014",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },

  // 11. CORNER CUT (59-70)
  {
    "no": 59,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH A (Ø7)",
    "drawingNo": "DWG-CC-001",
    "installQty": { "e1": 1, "e4": 23, "totalQty": 23 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 60,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH B (Ø7)",
    "drawingNo": "DWG-CC-002",
    "installQty": { "e1": 29, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 61,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH C (Ø7)",
    "drawingNo": "DWG-CC-003",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 62,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH D (Ø7)",
    "drawingNo": "DWG-CC-004",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 63,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH E (Ø7)",
    "drawingNo": "DWG-CC-005",
    "installQty": { "e1": 29, "totalQty": 51 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 64,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT PUNCH F (Ø7)",
    "drawingNo": "DWG-CC-006",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 65,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE A (Ø7)",
    "drawingNo": "DWG-CC-007",
    "installQty": { "e1": 1, "totalQty": 23 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 66,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE B (Ø7)",
    "drawingNo": "DWG-CC-008",
    "installQty": { "e1": 29, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 67,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE C (Ø7)",
    "drawingNo": "DWG-CC-009",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 68,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE D (Ø7)",
    "drawingNo": "DWG-CC-010",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 69,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE E (Ø7)",
    "drawingNo": "DWG-CC-011",
    "installQty": { "e1": 29, "totalQty": 51 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 70,
    "stage": "CORNER CUT",
    "partName": "CORNER CUT DIE F (Ø7)",
    "drawingNo": "DWG-CC-012",
    "installQty": { "e1": 1, "totalQty": 2 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },

  // 12. S5 CENTER NOTCH (71-77)
  {
    "no": 71,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 PUNCH A (Ø7)",
    "drawingNo": "DWG-S5-001",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 72,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 PUNCH B (Ø7)",
    "drawingNo": "DWG-S5-002",
    "installQty": { "e1": 30, "totalQty": 30 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 73,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 PUNCH C (Ø7)",
    "drawingNo": "DWG-S5-003",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 74,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 PUNCH D (Ø7)",
    "drawingNo": "DWG-S5-004",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 75,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 DIE A (Ø7)",
    "drawingNo": "DWG-S5-005",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 76,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 DIE B (Ø7)",
    "drawingNo": "DWG-S5-006",
    "installQty": { "e1": 29, "totalQty": 29 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },
  {
    "no": 77,
    "stage": "S5 CENTER NOTCH",
    "partName": "CORNER CUT S1/S0 DIE C (Ø7)",
    "drawingNo": "DWG-S5-007",
    "installQty": { "e1": 1, "totalQty": 1 },
    "shotLifeCycle": { "e1_pcm": 27, "e2_gold": 70, "e3_1_pcm": 27, "e3_2_gold": 70, "e3_3_gold": 70, "e4_bare": 70, "e5_bare": 70, "e6_pcm": 27 },
    "regrindStandard": { "perGrindMm": "0.10", "totalGrindMm": "1.50", "regrindCycles": "4-5 time", "note": "-" }
  },

  // 13. HITCH FEED (78-79)
  {
    "no": 78,
    "stage": "HITCH FEED",
    "partName": "HITCH FEED PIN (Ø5)",
    "drawingNo": "DWG-HF-001",
    "installQty": { "e2": 204, "e4": 204, "e5": 204, "totalQty": 612 },
    "shotLifeCycle": {},
    "regrindStandard": { "perGrindMm": "-", "totalGrindMm": "-", "regrindCycles": "-", "note": "-" }
  },
  {
    "no": 79,
    "stage": "HITCH FEED",
    "partName": "HITCH FEED PIN (Ø7)",
    "drawingNo": "DWG-HF-002",
    "installQty": { "e1": 180, "e3_1": 180, "e3_2": 168, "e3_3": 168, "totalQty": 1002 },
    "shotLifeCycle": {},
    "regrindStandard": { "perGrindMm": "-", "totalGrindMm": "-", "regrindCycles": "-", "note": "-" }
  }
];
