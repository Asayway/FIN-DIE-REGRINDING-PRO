import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Play,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  Wrench,
  Zap
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface UserGuideViewProps {
  onNavigate?: (route: string) => void;
}

type GuideTab = 'job-entry' | 'mistakes' | 'workflow' | 'modules';
type MistakeCategory = 'ALL' | 'JOB_ENTRY' | 'DIMENSION' | 'QUEUE_QC' | 'MASTER_RATES';
type PreviewFieldMode = 'unfilled' | 'filled';

interface ConnectorLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  side: 'LEFT' | 'RIGHT' | 'FOOTER';
  tone: 'cyan' | 'amber' | 'emerald' | 'rose';
}

interface ModalZoneSpec {
  id: string;
  stepNo: string;
  column: 'LEFT' | 'RIGHT' | 'FOOTER';
  titleTh: string;
  titleEn: string;
  fieldPreviewTh: string;
  fieldPreviewEn: string;
  ruleTh: string;
  ruleEn: string;
  correctExampleTh: string;
  correctExampleEn: string;
  mistakeExampleTh: string;
  mistakeExampleEn: string;
  autoGuardTh: string;
  autoGuardEn: string;
  tone: 'cyan' | 'amber' | 'emerald' | 'rose';
}

const MODAL_ZONES: ModalZoneSpec[] = [
  {
    id: 'queue-mode',
    stepNo: '01',
    column: 'LEFT',
    titleTh: 'ประเภทคิวงาน (คิวปกติ vs คิวด่วน #1)',
    titleEn: 'Queue Priority Mode (Normal vs Urgent #1)',
    fieldPreviewTh: '🟢 คิวปกติ (Normal Queue) / 🚨 คิวด่วน #1',
    fieldPreviewEn: '🟢 Normal Queue / 🚨 Urgent #1 (Emergency)',
    ruleTh: 'เลือก "คิวปกติ" สำหรับงานซ่อมบำรุงตามรอบ PM หรือคิวประจำวัน และเลือก "คิวด่วน #1" เฉพาะกรณีแม่พิมพ์หยุดไลน์กะทันหัน ต้องแทรกคิวแรกทันที',
    ruleEn: 'Select "Normal Queue" for planned PM or standard daily regrinding. Choose "Urgent #1" only for line-down emergencies requiring immediate top-priority insertion.',
    correctExampleTh: 'ไลน์ E2 มีดตัดบิ่นกลางกะ -> เลือก 🚨 คิวด่วน #1 ระบบจะดันขึ้นลำดับ #1 ของวันทันที',
    correctExampleEn: 'Line E2 blade chipped mid-shift -> Select 🚨 Urgent #1 to jump straight to Queue #1.',
    mistakeExampleTh: 'กด 🚨 คิวด่วน #1 กับงานปกติทุกใบ ทำให้คิวงานจริงซ้อนทับและไม่สามารถจัดลำดับความสำคัญได้',
    mistakeExampleEn: 'Marking routine PM tickets as 🚨 Urgent #1, breaking daily priority scheduling.',
    autoGuardTh: 'ระบบแยกแถบสี Rose/Cyan ชัดเจน พร้อมตัวเลือก "Preempt Active Job" เพื่อหยุดคิวเดิมชั่วคราวเมื่อเลือกโหมดด่วน',
    autoGuardEn: 'Color-coded Rose/Cyan mode indicator with an optional "Preempt Active Job" checkbox for urgent preemption.',
    tone: 'rose'
  },
  {
    id: 'date-line-qty',
    stepNo: '02',
    column: 'LEFT',
    titleTh: 'วันที่ · สายการผลิต · รหัสแม่พิมพ์ · จำนวน',
    titleEn: 'Date · Production Line · Die Code · Qty',
    fieldPreviewTh: '📅 วันที่ * · 🏭 ไลน์ * · 🔧 แม่พิมพ์ · 🔢 จำนวน',
    fieldPreviewEn: '📅 Date * · 🏭 Line * · 🔧 Die Code · 🔢 Qty (Pcs)',
    ruleTh: 'กำหนด "ไลน์ (Line)" ให้ถูกต้องก่อนเลือกชิ้นส่วน เพราะรายการพั้นช์และรหัสแม่พิมพ์ (Die Code) จะกรองอัตโนมัติตามสายการผลิตนั้น และใส่จำนวนชิ้นที่ส่งเจียรจริงในชุดนั้น',
    ruleEn: 'Always confirm the Production Line first before picking the part—the Die Code and compatible tooling list filter automatically by line. Enter exact piece count sent in this batch.',
    correctExampleTh: 'ลงงาน Burring ไลน์ E1 ส่งมา 2 ชิ้น -> เลือก LINE E1, Die Code 151915000446 อัตโนมัติ, Qty = 2',
    correctExampleEn: '2 Burring punches from Line E1 -> Pick LINE E1 (auto-fills Die Code), set Qty = 2.',
    mistakeExampleTh: 'ลืมเปลี่ยนไลน์ (ค้างอยู่ที่ E1) แล้วไปหาพาร์ทของ E2 หรือใส่ Qty = 1 ทั้งที่ส่งเจียรจริง 10 ชิ้น ทำให้ยอดประหยัดต้นทุนคลาดเคลื่อน',
    mistakeExampleEn: 'Leaving Line on E1 while logging an E2 part, or leaving Qty = 1 when 10 pieces were sharpened (understates cost savings).',
    autoGuardTh: 'ห้ามลงวันที่ก่อน Jan 2025 และหากเลือกวันที่ย้อนหลัง ระบบจะแสดงแถบแจ้งเตือน "บันทึกย้อนหลัง Historical Record" ให้ตรวจสอบก่อนบันทึก',
    autoGuardEn: 'Dates prior to Jan 2025 are blocked automatically; backdated records trigger a clear historical-entry warning banner.',
    tone: 'cyan'
  },
  {
    id: 'part-selector',
    stepNo: '03',
    column: 'LEFT',
    titleTh: 'เลือกชิ้นส่วน / อะไหล่ทูลลิ่ง (Part Combobox)',
    titleEn: 'Line-Filtered Tooling Part Selector',
    fieldPreviewTh: '🔍 BURRING (WIDE LOWER) · LINE E1',
    fieldPreviewEn: '🔍 BURRING (WIDE LOWER) · LINE E1',
    ruleTh: 'พิมพ์ค้นหาชื่อพาร์ทหรือรหัสแบบ (Drawing Code) ในช่องค้นหา หรือกรองด้วยแท็บ พั้นช์ขึ้นรูป / ใบมีดตัด / สเตชั่นแม่พิมพ์ เพื่อดึงสเปกมาตรฐานตรงรุ่น 100%',
    ruleEn: 'Search by part name or drawing code, or filter via category tabs (Forming Punch, Cutters, Die Station). Selecting a part loads its official engineering tolerances automatically.',
    correctExampleTh: 'พิมพ์ "BURRING" แล้วเลือก BURRING (WIDE LOWER) ระบบดึง L₀ = 28.00 mm และ Min Spec = 26.50 mm ทันที',
    correctExampleEn: 'Search "BURRING" and pick BURRING (WIDE LOWER) -> loads L₀ = 28.00 mm and Scrap Limit = 26.50 mm.',
    mistakeExampleTh: 'เลือกชื่อพาร์ทใกล้เคียงผิดรุ่น เช่น สลับ BURRING PUNCH (62.50 mm) กับ BURRING (WIDE LOWER) (28.00 mm)',
    mistakeExampleEn: 'Picking a similarly named punch (e.g. BURRING PUNCH 62.50 mm vs BURRING WIDE LOWER 28.00 mm).',
    autoGuardTh: 'เมื่อเปลี่ยนสายการผลิต ระบบจะตรวจเช็กความเข้ากันได้ของขนาดท่อ (Ø5 / Ø7 / Ø9.52) และสลับพาร์ทที่ไม่รองรับให้อัตโนมัติ',
    autoGuardEn: 'Switching lines validates tube-size compatibility (Ø5 / Ø7 / Ø9.52) and auto-adjusts incompatible selections.',
    tone: 'cyan'
  },
  {
    id: 'specs-card',
    stepNo: '04',
    column: 'LEFT',
    titleTh: 'การ์ดสรุปสเปก Part Master & ราคาจัดซื้อใหม่',
    titleEn: 'Part Master & New Purchase Cost Specs Card',
    fieldPreviewTh: 'ราคาซื้อใหม่ ฿12,500 · Scrap Limit 26.50 mm · 15.0M',
    fieldPreviewEn: 'New Price ฿12,500 · Scrap Limit 26.50 mm · 15.0M',
    ruleTh: 'ใช้ตรวจสอบอ้างอิงแบบอ่านอย่างเดียว (Read-only) เพื่อเช็กว่า 1) ราคาซื้อใหม่ตรงตามทะเบียนหรือไม่ 2) ระยะ Scrap Limit และจำนวนรอบเจียรคงเหลือสอดคล้องกับชิ้นงานจริงในมือหรือไม่',
    ruleEn: 'Read-only verification card. Check this before grinding to confirm New Purchase Price, Scrap Limit, Expected Shot Life, and Remaining Cycles match the physical die part.',
    correctExampleTh: 'ตรวจสอบพบ New Spec 28.00 mm -> Scrap Limit 26.50 mm (รวมเจียรได้ 1.50 mm / สูงสุด 9 ครั้ง)',
    correctExampleEn: 'Verify New Spec 28.00 mm -> Scrap Limit 26.50 mm (1.50 mm total allowance / up to 9 cycles).',
    mistakeExampleTh: 'ไม่อ่านการ์ดสเปกก่อนลงงาน ทำให้ส่งพาร์ทแบบ "Dispose after 1 use" (ใช้ครั้งเดียวทิ้ง) เข้าคิวเจียรซ้ำ',
    mistakeExampleEn: 'Skipping this spec card and queueing a "Dispose after 1 use" part for regrinding.',
    autoGuardTh: 'แสดงผลแบบ Realtime ทันทีที่เปลี่ยนพาร์ทหรือจำนวนชิ้น หากสเปกใบงานต่างจาก Master จะมีปุ่ม "อัปเดตตาม Standard" ให้ซิงค์ได้ในคลิกเดียว',
    autoGuardEn: 'Updates live when part or quantity changes; shows a one-click "Sync to Standard" banner if ticket values drift from master specs.',
    tone: 'cyan'
  },
  {
    id: 'defect-reason',
    stepNo: '05',
    column: 'LEFT',
    titleTh: 'สาเหตุการส่งเจียร / สภาพปัญหา',
    titleEn: 'Regrind & Defect Reason Selection',
    fieldPreviewTh: 'สึกหรอปกติ · ครีบสูงเกิน · คมบิ่น · ผิวเป็นรอย · หลุดสเปค Min · แตกหัก',
    fieldPreviewEn: 'Normal Wear · Excessive Burr · Chipped · Galling · Out of Spec · Broken',
    ruleTh: 'เลือกสาเหตุหลักที่ตรงกับอาการหน้างานจริง เพื่อนำข้อมูลไปจัดอันดับ Top 10 Defect Reasons บนแดชบอร์ดผู้บริหาร และสามารถพิมพ์รายละเอียดเพิ่มเติมในช่องอิสระด้านล่างได้',
    ruleEn: 'Select the exact physical failure mode observed on the press line. This feeds directly into the Top 10 Defect Reasons analytics and management PDF reports.',
    correctExampleTh: 'ฟินมีครีบสูง > 0.03 mm จากคมทื่อ -> กด "ครีบสูงเกิน (EXCESSIVE BURR)" พร้อมระบุจุดที่พบบริเวณสลิต',
    correctExampleEn: 'Fin burr exceeds tolerance -> Select "EXCESSIVE BURR" and note the affected slit position.',
    mistakeExampleTh: 'กด "สึกหรอปกติ" ค้างไว้ทุกครั้งแม้พั้นช์จะคมบิ่นหรือแตกหัก ทำให้ข้อมูลวิเคราะห์สาเหตุปัญหา Top 10 คลาดเคลื่อน',
    mistakeExampleEn: 'Always leaving "NORMAL WEAR" selected even when punches are chipped or broken, skewing Top 10 root-cause charts.',
    autoGuardTh: 'บังคับเลือก 1 สาเหตุหลักเสมอ (Required) และรองรับการบันทึกเหตุผลเพิ่มเติมแบบอิสระโดยไม่จำกัดความยาว',
    autoGuardEn: 'Requires at least one primary defect code; supports optional free-text condition notes below the buttons.',
    tone: 'amber'
  },
  {
    id: 'remarks',
    stepNo: '06',
    column: 'LEFT',
    titleTh: 'หมายเหตุ / คำแนะนำช่าง & ข้อความด่วน',
    titleEn: 'Remarks & Quick Instruction Presets',
    fieldPreviewTh: 'ลับคมด้วยหิน CBN #400 · ปาดหน้าขัดเงา · รองชิมชดเชยระยะ',
    fieldPreviewEn: 'Sharpen with CBN #400 · Polish Ra <= 0.1um · Add shim',
    ruleTh: 'ใช้ระบุคำสั่งพิเศษให้ช่างเจียรหรือทีมประกอบแม่พิมพ์ เช่น ขนาดความหนาแผ่นชิม (Shim) ที่ต้องรองชดเชย หรือเบอร์หินเจียรที่ใช้ กดปุ่มข้อความด่วนด้านล่างเพื่อความรวดเร็ว',
    ruleEn: 'Document special surface grinder or die-assembly instructions (such as required shim thickness compensation or CBN wheel grit) using quick presets or custom text.',
    correctExampleTh: 'เจียรลง 0.15 mm -> กด "รองชิมชดเชยระยะเจียร" แล้วพิมพ์เพิ่ม "(+Shim 0.15 mm)"',
    correctExampleEn: 'Ground 0.15 mm -> Tap "Add shim to compensate length" and append "(+Shim 0.15 mm)".',
    mistakeExampleTh: 'ไม่บันทึกข้อมูลการรองชิมหรือเงื่อนไขพิเศษ ทำให้ตอนนำกลับไปประกอบเข้าแม่พิมพ์ความสูงพั้นช์ไม่เท่ากัน',
    mistakeExampleEn: 'Omitting shim compensation notes, causing punch height mismatch during die re-assembly.',
    autoGuardTh: 'สลับชุดข้อความด่วนเป็นภาษาไทย / อังกฤษอัตโนมัติตามการตั้งค่าภาษาของแอป',
    autoGuardEn: 'Preset instruction buttons dynamically switch between Thai and English with the header toggle.',
    tone: 'cyan'
  },
  {
    id: 'dimension-calc',
    stepNo: '07',
    column: 'RIGHT',
    titleTh: 'การคำนวณสเปคมิติ & ระยะเจียร (หัวใจสำคัญ)',
    titleEn: '4-Step Dimension & Grind Depth Calculator (Critical)',
    fieldPreviewTh: '1. ใหม่ (28.00) · 2. ก่อนเจียร (28.00) · 3. จะเจียรลง (0.10) · 4. หลังเจียร (27.90)',
    fieldPreviewEn: '1. New (28.00) · 2. Before (28.00) · 3. Depth (0.10) · 4. After (27.90)',
    ruleTh: 'วัดความยาวจริงด้วยไมโครมิเตอร์แล้วกรอกที่ช่อง "2. ก่อนเจียร" จากนั้นกรอก "ระยะที่ปาดออกต่อครั้ง" ที่ช่อง "3. จะเจียรลง (เช่น 0.10)" ระบบจะลบให้เป็นช่อง "4. หลังเจียร" อัตโนมัติ (หรือกรอกช่อง 4 เพื่อให้คำนวณช่อง 3 ย้อนกลับได้)',
    ruleEn: 'Measure physical length with a micrometer into "2. Before Grind", then enter ONLY the material removed this pass (e.g. 0.10 mm) into "3. Grind Depth". Field "4. After Grind" updates automatically (or edit Field 4 to back-calculate Depth).',
    correctExampleTh: 'BURRING PUNCH (L₀ 62.50, Min 61.00): ก่อนเจียร 62.50 - เจียรลง 0.10 = หลังเจียร 62.40 mm (อยู่ในเกณฑ์ Std 0.10-0.15)',
    correctExampleEn: 'BURRING PUNCH (L₀ 62.50, Min 61.00): Before 62.50 − Depth 0.10 = After 62.40 mm (inside Std 0.10–0.15).',
    mistakeExampleTh: '❌ พลาดบ่อยที่สุด: นำค่าหลังเจียร (เช่น 62.40) ไปกรอกในช่อง "3. จะเจียรลง" ทำให้ระบบคิดว่าปาดออก 62.40 mm จนเหลือ 0.10 mm และแจ้งคัดทิ้งทันที!',
    mistakeExampleEn: '❌ #1 Mistake: Typing the final height (e.g. 62.40) into "3. Grind Depth" instead of 0.10, causing After Grind to drop below Min Spec and trigger false scrap!',
    autoGuardTh: '• แจ้งเตือนสีเหลืองเมื่อระยะเจียรลงอยู่นอกช่วง Std (เช่น 0.10-0.15)\n• แจ้งเตือนสีแดงทันทีเมื่อหลังเจียร < Scrap Limit หรือเป็นพาร์ทห้ามเจียรซ้ำ',
    autoGuardEn: '• Amber alert when Grind Depth falls outside Standard range (e.g. 0.10–0.15 mm)\n• Red SCRAP alert immediately if After Grind < Scrap Limit or part is Non-Regrindable.',
    tone: 'amber'
  },
  {
    id: 'cycle-counter',
    stepNo: '08',
    column: 'RIGHT',
    titleTh: 'ตัวนับรอบเจียร & เปอร์เซ็นต์อายุคงเหลือ',
    titleEn: 'Regrind Cycle Counter & Usable Wear Life Bar',
    fieldPreviewTh: 'รอบเจียร [0] -> รอบที่ 1/9 · เหลือเจียร: 8 ครั้ง · Usable Life 93%',
    fieldPreviewEn: 'Cycle [0] -> Cycle #1/9 · Remaining: 8 cycles · Usable Life 93%',
    ruleTh: 'ระบุจำนวนรอบที่ชิ้นส่วนนี้ "เคยเจียรผ่านมาแล้ว" ในช่องตัวเลข ระบบจะบวก 1 เป็นรอบปัจจุบันให้อัตโนมัติ และคำนวณ % อายุเนื้อวัสดุที่เหลือเทียบกับ Scrap Limit',
    ruleEn: 'Enter how many times this physical part has ALREADY been ground in the numeric box. The system increments +1 for the current job and computes remaining usable material % against Scrap Limit.',
    correctExampleTh: 'พั้นช์เคยเจียรมาแล้ว 3 ครั้ง -> กรอก 3 ระบบจะแสดง "-> รอบที่ 4/9 (เหลือเจียร: 5 ครั้ง)"',
    correctExampleEn: 'Part previously ground 3 times -> Enter 3; displays "-> Cycle #4/9 (Remaining: 5 cycles)".',
    mistakeExampleTh: 'ปล่อยค่าเป็น 0 ตลอดทุกครั้งทั้งที่ชิ้นส่วนผ่านการเจียรมาหลายรอบแล้ว ทำให้ไม่ทราบว่ารอบสะสมเกินโควตาสูงสุดหรือยัง',
    mistakeExampleEn: 'Always leaving prior cycles at 0, hiding when a tool exceeds its maximum allowed regrind count.',
    autoGuardTh: 'หากรอบใหม่เกินโควตา Max Cycles ระบบจะขึ้นแถบแจ้งเตือนสีแดงเพื่อป้องกันความเสี่ยงชิ้นส่วนหักในแม่พิมพ์',
    autoGuardEn: 'Triggers a red limit warning whenever Next Cycle exceeds the engineering Max Allowed Cycles.',
    tone: 'emerald'
  },
  {
    id: 'cost-labor',
    stepNo: '09',
    column: 'RIGHT',
    titleTh: 'ชั่วโมงแรงงาน · ช่างผู้รับผิดชอบ · คำนวณต้นทุนแท้จริง',
    titleEn: 'Labor Time · Technician · 5-Step True Cost Engine',
    fieldPreviewTh: 'NET SAVING ฿12,021.98 (96.18%) · เวลา 15น.–2ชม. · ช่างผู้รับผิดชอบ *',
    fieldPreviewEn: 'NET SAVING ฿12,021.98 (96.18%) · 15m–2h · Technician *',
    ruleTh: 'สลับหน่วย "นาที / ชม." หรือกดปุ่มเลือกด่วน (15 น., 30 น., 45 น., 1 ชม.) ให้ตรงเวลาปฏิบัติงานจริง พร้อมระบุชื่อช่างผู้รับผิดชอบ เพื่อคำนวณ Net Saving และต้นทุน 5 ขั้นตอนอย่างแม่นยำ',
    ruleEn: 'Toggle Min/Hr or use Quick Select presets (15m–2h) matching actual grinder runtime, and enter the Technician name. True cost (Machine, Labor, Consumables, QC/OH) and Net Saving update live.',
    correctExampleTh: 'งานใช้เวลา 30 นาที -> กดปุ่ม "30 น." (= 0.50 ชม.) กดดูตาราง 5 ขั้นตอนเพื่อตรวจความถูกต้องก่อนบันทึก',
    correctExampleEn: '30-minute job -> Click "30m" (= 0.50 hr), verify technician name, and expand 5-Step Breakdown if needed.',
    mistakeExampleTh: 'ต้องการกรอก 30 นาที แต่ลืมสลับหน่วยเป็น "นาที" แล้วกรอกเลข 30 ในโหมด "ชม." ทำให้ระบบคิดค่าแรงและค่าเครื่องจักร 30 ชั่วโมง!',
    mistakeExampleEn: 'Typing 30 while unit is set to "Hr" instead of "Min", inflating machine and labor cost by 30x!',
    autoGuardTh: 'แสดงค่าแปลงเทียบ (= X.XX ชม.) ข้างช่องกรอกตลอดเวลา และอ้างอิงอัตราเครื่องจักรล่าสุดจากเมนู อัตราเครื่องจักร & ค่าแรง',
    autoGuardEn: 'Always displays converted hours (= X.XX hr) beside the input and pulls active rates from Machine & Labor Rates.',
    tone: 'emerald'
  },
  {
    id: 'evidence-photos',
    stepNo: '10',
    column: 'RIGHT',
    titleTh: 'แนบรูปภาพประกอบงานเจียรจริง (Evidence Photos)',
    titleEn: 'Workpiece Evidence Photo Attachment',
    fieldPreviewTh: '📸 แนบรูปงานจริง (รองรับหลายภาพ + ขยายดูได้)',
    fieldPreviewEn: '📸 Attach Photo (Multi-image inspection evidence)',
    ruleTh: 'แนะนำให้แนบภาพถ่ายรอยบิ่น ครีบ หรือสภาพหลังเจียรเป็นหลักฐาน โดยเฉพาะงานที่เข้าข่ายคิวด่วนหรือการคัดทิ้ง (Scrap) เพื่อให้ฝ่ายวิศวกรรมและ QC ตรวจสอบย้อนหลังได้',
    ruleEn: 'Attach photos of chipped edges, galling, or post-grind finish—especially for Urgent #1 or Scrap tickets—to give QC and tooling engineers visual traceability.',
    correctExampleTh: 'ถ่ายภาพพั้นช์ที่บิ่นหรือหลุด Min Spec แนบ 1-2 รูปก่อนกดยืนยันคัดทิ้ง',
    correctExampleEn: 'Attach 1–2 clear photos of damage or micrometer reading before confirming a Scrap ticket.',
    mistakeExampleTh: 'บันทึกคัดทิ้งชิ้นส่วนราคาสูง (เช่น ฿18,000+) โดยไม่มีภาพหลักฐานหรือหมายเหตุประกอบการอนุมัติ',
    mistakeExampleEn: 'Scrapping high-value dies/punches (e.g. ฿18,000+) without photo evidence for engineering review.',
    autoGuardTh: 'รูปภาพแรกจะถูกติดป้าย Primary อัตโนมัติ และสามารถคลิกแว่นขยายเพื่อตรวจซูมหรือลบรูปก่อนบันทึกได้',
    autoGuardEn: 'First image is tagged Primary automatically with instant lightbox zoom and remove controls.',
    tone: 'cyan'
  },
  {
    id: 'footer-actions',
    stepNo: '11',
    column: 'FOOTER',
    titleTh: 'ปุ่มบันทึกท้ายหน้าต่าง (ลงคิวรอ vs เริ่มเจียรทันที vs คัดทิ้ง)',
    titleEn: 'Footer Submission Actions (Queue vs Start Now vs Scrap)',
    fieldPreviewTh: 'ยกเลิก · ⏳ ลงคิวรอ · ⚡ เริ่มเจียรทันที · 🗑️ คัดทิ้ง',
    fieldPreviewEn: 'Cancel · ⏳ Add to Queue · ⚡ Start Now · 🗑️ Scrap',
    ruleTh: 'เลือกปุ่มให้ตรงกับสถานการณ์จริง:\n1) "⏳ ลงคิวรอ" = วางแผนคิวในปฏิทิน ยังไม่ขึ้นแท่นเครื่อง\n2) "⚡ เริ่มเจียรทันที" = กำลังปาดชิ้นงานบนเครื่องตอนนี้\n3) "🗑️ คัดทิ้ง" = ต่ำกว่า Scrap Limit / พาร์ทใช้แล้วทิ้ง',
    ruleEn: 'Pick the button matching real shop-floor status:\n1) "Add to Queue" = schedule into waiting queue\n2) "Start Now" = actively grinding on surface grinder now\n3) "Scrap" = below Scrap Limit or Dispose-after-1-use.',
    correctExampleTh: 'หลังเจียร 60.80 mm < Scrap Limit 61.00 mm -> กด "🗑️ คัดทิ้ง" เพื่อให้บันทึกเป็น Scrap Loss ไม่นับเป็น Saving',
    correctExampleEn: 'After-grind 60.80 mm < 61.00 mm Scrap Limit -> Click "🗑️ Scrap" so it logs accurately as Scrap Loss instead of savings.',
    mistakeExampleTh: 'ชิ้นงานหมดสเปคแล้วแต่ไปกด "⏳ ลงคิวรอ" หรือ "⚡ เริ่มเจียรทันที" ทำให้ระบบนำไปรวมเป็นยอด Net Saving เกินจริง',
    mistakeExampleEn: 'Submitting an out-of-spec or non-regrindable part as Queue/Start Now, falsely inflating Net Saving KPIs.',
    autoGuardTh: 'แถบสรุปด้านซ้ายล่างแสดงค่า "หลังเจียร: XX.XX mm" แบบ Real-time พร้อมป้ายเตือน ⚠️ ต่ำกว่าสเปค ก่อนคุณตัดสินใจกดปุ่ม',
    autoGuardEn: 'Bottom-left live summary pins "After Grind: XX.XX mm" with a ⚠️ Below Min Spec warning right beside the action buttons.',
    tone: 'rose'
  }
];

interface MistakeEntry {
  id: string;
  category: Exclude<MistakeCategory, 'ALL'>;
  titleTh: string;
  titleEn: string;
  mistakeTh: string;
  mistakeEn: string;
  correctTh: string;
  correctEn: string;
  impactTh: string;
  impactEn: string;
}

const MISTAKE_ENTRIES: MistakeEntry[] = [
  {
    id: 'm1',
    category: 'DIMENSION',
    titleTh: 'กรอก "ความสูงหลังเจียร" ลงในช่อง "3. จะเจียรลง (Grind Depth)"',
    titleEn: 'Typing Final Height into "3. Grind Depth" instead of Removal Amount',
    mistakeTh: 'เช่น ก่อนเจียร 62.50 mm แล้วพิมพ์ 62.40 ลงช่อง "3. จะเจียรลง" -> หลังเจียรกลายเป็น 0.10 mm!',
    mistakeEn: 'e.g., Before = 62.50 mm, typing 62.40 into "3. Grind Depth" -> After Grind drops to 0.10 mm!',
    correctTh: 'กรอกเฉพาะระยะที่ปาดออก เช่น 0.10 หรือ 0.15 ในช่อง 3 แล้วตรวจให้ช่อง "4. หลังเจียร" แสดง 62.40 mm',
    correctEn: 'Enter ONLY the removal thickness (e.g. 0.10 or 0.15) in Field 3; verify Field 4 shows 62.40 mm.',
    impactTh: 'ระบบแจ้ง ⚠️ Below Min Spec และอาจบันทึกคัดทิ้งผิดพลาด',
    impactEn: 'Triggers false ⚠️ Below Min Spec alert and distorts scrap history.'
  },
  {
    id: 'm2',
    category: 'JOB_ENTRY',
    titleTh: 'ไม่เปลี่ยน "ไลน์ (Line)" ก่อนเลือกชื่อพาร์ท',
    titleEn: 'Forgetting to Select the Correct Production Line First',
    mistakeTh: 'ปล่อยค่าเริ่มต้นเป็น LINE E1 แต่ความจริงเป็นชิ้นส่วนที่ถอดมาจาก LINE E4 หรือ E3-3',
    mistakeEn: 'Leaving default LINE E1 selected when the punch actually came from LINE E4 or E3-3.',
    correctTh: 'เลือก 🏭 Line (E1–E5) เป็นอันดับแรกเสมอ แล้วสังเกต Die Code และรายการพาร์ทที่กรองตามไลน์นั้น',
    correctEn: 'Select 🏭 Line (E1–E5) first; verify the auto-filled Die Code and line-filtered part list.',
    impactTh: 'ยอดประหยัดแยกตามสายการผลิต (E1–E5) บนแดชบอร์ดและรายงาน PDF คลาดเคลื่อน',
    impactEn: 'Misattributes savings and repair counts across production lines in Dashboard & PDF reports.'
  },
  {
    id: 'm3',
    category: 'DIMENSION',
    titleTh: 'ส่งเจียรซ้ำทั้งที่พาร์ทเป็น "Dispose after 1 use" หรือต่ำกว่า Scrap Limit',
    titleEn: 'Queueing a "Dispose after 1 use" or Sub-Limit Tool for Regrinding',
    mistakeTh: 'พาร์ท IRONING / LOUVER / REFLARE หรือความยาวต่ำกว่า L_min แต่กด "⏳ ลงคิวรอ" หรือ "⚡ เริ่มเจียรทันที"',
    mistakeEn: 'Clicking "Add to Queue" or "Start Now" on IRONING / LOUVER / REFLARE or tools below L_min.',
    correctTh: 'เมื่อเห็นป้ายเตือนสีแดง "Non-Regrindable" หรือ "Below Min Spec" ให้กดปุ่มสีแดง "🗑️ คัดทิ้ง (Scrap)" เท่านั้น',
    correctEn: 'Whenever the red Non-Regrindable or Below Min Spec banner appears, use "🗑️ Scrap" only.',
    impactTh: 'ป้องกันช่างเสียเวลาเจียรงานใช้ไม่ได้ และป้องกันยอด Net Saving บนแดชบอร์ดสูงเกินจริง',
    impactEn: 'Prevents wasted grinding labor and prevents false savings on non-salvageable parts.'
  },
  {
    id: 'm4',
    category: 'JOB_ENTRY',
    titleTh: 'ใส่หน่วยเวลา "นาที" ในขณะที่โหมดยังเป็น "ชั่วโมง (Hr)"',
    titleEn: 'Entering Minutes While the Labor Unit Toggle Is Set to Hours (Hr)',
    mistakeTh: 'ต้องการลง 45 นาที แต่ปุ่มสลับอยู่ที่ "ชม." แล้วพิมพ์ 45 -> ระบบคิดค่าแรง 45 ชั่วโมง!',
    mistakeEn: 'Typing 45 while toggle is on "Hr" instead of "Min" -> calculates 45 hours of machine & labor cost!',
    correctTh: 'กดสลับปุ่ม "นาที / Min" ก่อนพิมพ์ หรือใช้ปุ่มเลือกด่วน (15 น., 30 น., 45 น., 1 ชม.) และเช็กค่า (= X.XX ชม.) ด้านข้าง',
    correctEn: 'Switch toggle to "Min" or click Quick Select presets (15m–2h), and confirm the (= X.XX hr) readout.',
    impactTh: 'ค่าใช้จ่ายงานซ่อมพุ่งสูงผิดปกติ (อาจทำให้ Net Saving ติดลบได้)',
    impactEn: 'Massively inflates job repair cost and can turn Net Saving negative.'
  },
  {
    id: 'm5',
    category: 'JOB_ENTRY',
    titleTh: 'ลืมปรับ "จำนวน (Qty)" เมื่อส่งเจียรเป็นชุดหลายชิ้นพร้อมกัน',
    titleEn: 'Leaving Qty at 1 for Multi-Piece Batch Regrind Jobs',
    mistakeTh: 'ส่งเจียร Pierce Punch (Ø5) จำนวน 10 ชิ้นในใบงานเดียว แต่ปล่อยช่อง Qty เป็น 1',
    mistakeEn: 'Grinding a batch of 10 Pierce Punches in one ticket while leaving Qty at 1.',
    correctTh: 'ระบุจำนวนชิ้นจริงที่ส่งเจียรในช่อง 🔢 จำนวน (Qty) เพื่อให้ระบบคูณราคาซื้อใหม่ทดแทนครบตามจำนวน',
    correctEn: 'Enter the exact piece count in 🔢 Qty so equivalent new-purchase savings scale accurately.',
    impactTh: 'ยอดประหยัดสุทธิและจำนวนชิ้นงานในตาราง Matrix / Top 10 ต่ำกว่าความเป็นจริง',
    impactEn: 'Understates total saved pieces and Net Saving value in Dashboard & Master Logs.'
  },
  {
    id: 'm6',
    category: 'QUEUE_QC',
    titleTh: 'กด "เจียรเสร็จ" แล้วเข้าใจว่าปิดงานสมบูรณ์แล้ว โดยไม่ส่งตรวจ QC',
    titleEn: 'Assuming "Complete Grinding" Closes the Job Without QC Pass',
    mistakeTh: 'ช่างเจียรเสร็จแล้วปล่อยค้างไว้ที่สถานะ 🔵 Ready for QC ไม่มีการตรวจรับ QC ขั้นสุดท้าย',
    mistakeEn: 'Leaving tickets stuck at 🔵 Ready for QC without completing final QC dimensional verification.',
    correctTh: 'เมื่อช่างกด "เจียรเสร็จ" สถานะจะเป็น 🔵 Ready for QC จากนั้นผู้ตรวจรับต้องเปิดใบงานและกด "✅ ตรวจรับ QC (QC Pass)"',
    correctEn: 'After grinding finishes (🔵 Ready for QC), QC Inspector must open the ticket and confirm "✅ QC Pass".',
    impactTh: 'คิวงานจะไม่เปลี่ยนเป็น 🟢 QC Passed และข้อมูลการปิดงาน QC จะยังไม่สมบูรณ์',
    impactEn: 'Ticket remains pending QC sign-off instead of closing as 🟢 QC Passed.'
  },
  {
    id: 'm7',
    category: 'DIMENSION',
    titleTh: 'แก้ตัวเลข New Spec หรือ Scrap Limit ในสเปคหลักโดยไม่ตรวจผลต่าง',
    titleEn: 'Editing Part Master L₀ or Scrap Limit Without Checking Total Allowance',
    mistakeTh: 'เช่น L₀ = 62.50 mm แต่ใส่ Scrap Limit = 60.00 mm ทั้งที่ Total Regrind ระบุไว้ 1.50 mm',
    mistakeEn: 'Setting L₀ = 62.50 mm and Scrap Limit = 60.00 mm while Total Regrind is 1.50 mm.',
    correctTh: 'ยึดสูตร L₀ − Total Regrind = Scrap Limit เสมอ (เช่น 62.50 − 1.50 = 61.00 mm)',
    correctEn: 'Always satisfy L₀ − Total Regrind = Scrap Limit (e.g., 62.50 − 1.50 = 61.00 mm).',
    impactTh: 'หน้าสเปคแม่พิมพ์จะแสดงแถบเตือนสีเหลืองเมื่อ L₀ − L_min ≠ Total Regrind ทันที',
    impactEn: 'Part Master automatically displays an amber mismatch warning whenever L₀ − L_min ≠ Total.'
  },
  {
    id: 'm8',
    category: 'MASTER_RATES',
    titleTh: 'คิดค่าแรงช่างซ้ำซ้อนในหน้าตั้งค่าอัตราเครื่องจักร (Machine & Labor Rates)',
    titleEn: 'Double-Counting Operator Labor in Machine & Labor Rate Config',
    mistakeTh: 'ตั้งค่า Machine Rate แบบรวมค่าแรงคนคุมเครื่องแล้ว แต่ไม่ติ๊กช่อง "Includes Operator Labor"',
    mistakeEn: 'Entering an all-inclusive machine hourly rate without checking "Includes Operator Labor".',
    correctTh: 'หากอัตราเครื่องจักรต่อชั่วโมงรวมค่าแรง Operator แล้ว ให้เปิดสวิตช์ "Includes Operator Labor" เพื่อไม่คิดค่าแรงซ้ำ',
    correctEn: 'Enable "Includes Operator Labor" when machine rate already embeds operator wages; verify in the 5-Step Sandbox.',
    impactTh: 'ต้นทุนซ่อมต่อชั่วโมงถูกคำนวณสูงกว่าจริง 2 เท่าในช่วง Machine Running Hours',
    impactEn: 'Prevents double-charging operator labor during machine running hours.'
  }
];

export const UserGuideView: React.FC<UserGuideViewProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';

  const [activeTab, setActiveTab] = useState<GuideTab>('job-entry');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('dimension-calc');
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [previewFieldMode, setPreviewFieldMode] = useState<PreviewFieldMode>('unfilled');
  const [mistakeCategory, setMistakeCategory] = useState<MistakeCategory>('ALL');
  const [mistakeSearch, setMistakeSearch] = useState<string>('');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const anchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgLines, setSvgLines] = useState<ConnectorLine[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const selectedZoneIndex = useMemo(
    () => Math.max(0, MODAL_ZONES.findIndex(z => z.id === selectedZoneId)),
    [selectedZoneId]
  );
  const selectedZone = MODAL_ZONES[selectedZoneIndex] || MODAL_ZONES[0];

  const handlePrevZone = () => {
    const prevIdx = (selectedZoneIndex - 1 + MODAL_ZONES.length) % MODAL_ZONES.length;
    setSelectedZoneId(MODAL_ZONES[prevIdx].id);
  };

  const handleNextZone = () => {
    const nextIdx = (selectedZoneIndex + 1) % MODAL_ZONES.length;
    setSelectedZoneId(MODAL_ZONES[nextIdx].id);
  };

  const filteredMistakes = useMemo(() => {
    const q = mistakeSearch.trim().toLowerCase();
    return MISTAKE_ENTRIES.filter(m => {
      if (mistakeCategory !== 'ALL' && m.category !== mistakeCategory) return false;
      if (!q) return true;
      return (
        m.titleTh.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.mistakeTh.toLowerCase().includes(q) ||
        m.mistakeEn.toLowerCase().includes(q) ||
        m.correctTh.toLowerCase().includes(q) ||
        m.correctEn.toLowerCase().includes(q)
      );
    });
  }, [mistakeCategory, mistakeSearch]);

  const leftZones = MODAL_ZONES.filter(z => z.column === 'LEFT');
  const rightZones = MODAL_ZONES.filter(z => z.column === 'RIGHT');
  const footerZone = MODAL_ZONES.find(z => z.column === 'FOOTER');

  const recomputeLines = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'job-entry') return;
    const cRect = canvas.getBoundingClientRect();
    if (cRect.width === 0 || cRect.height === 0) return;

    const nextLines: ConnectorLine[] = [];
    for (const zone of MODAL_ZONES) {
      const cardEl = cardRefs.current[zone.id];
      const anchorEl = anchorRefs.current[zone.id];
      if (!cardEl || !anchorEl) continue;

      const cardRect = cardEl.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      if (cardRect.width === 0 || anchorRect.width === 0) continue;

      if (zone.column === 'LEFT') {
        nextLines.push({
          id: zone.id,
          x1: cardRect.right - cRect.left,
          y1: cardRect.top + cardRect.height / 2 - cRect.top,
          x2: anchorRect.left - cRect.left + 4,
          y2: anchorRect.top + anchorRect.height / 2 - cRect.top,
          side: 'LEFT',
          tone: zone.tone
        });
      } else if (zone.column === 'RIGHT') {
        nextLines.push({
          id: zone.id,
          x1: cardRect.left - cRect.left,
          y1: cardRect.top + cardRect.height / 2 - cRect.top,
          x2: anchorRect.right - cRect.left - 4,
          y2: anchorRect.top + anchorRect.height / 2 - cRect.top,
          side: 'RIGHT',
          tone: zone.tone
        });
      } else {
        nextLines.push({
          id: zone.id,
          x1: cardRect.left + cardRect.width / 2 - cRect.left,
          y1: cardRect.top - cRect.top,
          x2: anchorRect.left + anchorRect.width / 2 - cRect.left,
          y2: anchorRect.bottom - cRect.top - 2,
          side: 'FOOTER',
          tone: zone.tone
        });
      }
    }

    setCanvasSize({ width: cRect.width, height: cRect.height });
    setSvgLines(nextLines);
  }, [activeTab]);

  useLayoutEffect(() => {
    if (activeTab !== 'job-entry') return;
    const rafId = window.requestAnimationFrame(recomputeLines);
    const canvas = canvasRef.current;
    let observer: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        window.requestAnimationFrame(recomputeLines);
      });
      observer.observe(canvas);
    }
    const onResize = () => window.requestAnimationFrame(recomputeLines);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [activeTab, language, previewFieldMode, selectedZoneId, recomputeLines]);

  const toneRingClass = (tone: ModalZoneSpec['tone'], active: boolean) => {
    if (!active) {
      return 'bg-[#0b101b] border-white/12 hover:border-white/30 text-slate-300';
    }
    switch (tone) {
      case 'amber':
        return 'bg-amber-950/35 border-amber-400 text-amber-100 ring-1 ring-amber-400/50';
      case 'emerald':
        return 'bg-emerald-950/35 border-emerald-400 text-emerald-100 ring-1 ring-emerald-400/50';
      case 'rose':
        return 'bg-rose-950/35 border-rose-400 text-rose-100 ring-1 ring-rose-400/50';
      default:
        return 'bg-cyan-950/40 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400/50';
    }
  };

  const toneStepColor = (tone: ModalZoneSpec['tone']) => {
    switch (tone) {
      case 'amber':
        return 'text-amber-300';
      case 'emerald':
        return 'text-emerald-300';
      case 'rose':
        return 'text-rose-300';
      default:
        return 'text-cyan-300';
    }
  };

  const toneStrokeHex = (tone: ModalZoneSpec['tone']) => {
    switch (tone) {
      case 'amber':
        return '#fbbf24';
      case 'emerald':
        return '#34d399';
      case 'rose':
        return '#fb7185';
      default:
        return '#22d3ee';
    }
  };

  const lifecycleStages = [
    {
      step: '01',
      status: isEn ? 'Waiting / Normal Queue' : 'รอคิวเจียร (Waiting)',
      badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
      actor: isEn ? 'Line Leader / Maintenance' : 'หัวหน้าไลน์ / ช่างแม่พิมพ์',
      action: isEn
        ? 'Open Regrind Job Queue (+ Add Job), pick Line & Part, verify micrometer height, click "Add to Queue".'
        : 'เปิดหน้าคิวงานเจียร กดเพิ่มงาน เลือกลายน์และพาร์ท กรอกความสูงก่อนเจียรและระยะเจียรลง แล้วกด "⏳ ลงคิวรอ"',
      impact: isEn
        ? 'Adds ticket to Queue Sequence & Calendar; counts as Active Backlog until grinding begins.'
        : 'สร้างใบงานในคิวและปฏิทินทันที พร้อมคำนวณต้นทุนและยอดประหยัดคาดการณ์'
    },
    {
      step: '02',
      status: isEn ? 'Urgent #1 (Emergency)' : 'งานด่วน #1 (Urgent)',
      badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-950/40',
      actor: isEn ? 'Line Leader / Tooling Admin' : 'หัวหน้าไลน์ / ผู้ดูแลแม่พิมพ์',
      actorTag: 'PRIORITY',
      action: isEn
        ? 'Select "Urgent #1" toggle when a die line stops unexpectedly, optionally check Preempt Active Job.'
        : 'เลือกสลับโหมด "🚨 คิวด่วน #1" เมื่อไลน์หยุดฉุกเฉิน ระบบจะดันใบงานขึ้นคิวอันดับ #1 ทันที',
      impact: isEn
        ? 'Reorders daily queue automatically and highlights ticket in red across Queue & Dashboard.'
        : 'จัดเรียงคิวใหม่อัตโนมัติ พร้อมแจ้งเตือนสีแดงเด่นชัดในหน้าคิวงานและแดชบอร์ด'
    },
    {
      step: '03',
      status: isEn ? 'Grinding (In-Process)' : 'กำลังเจียร (In-Process)',
      badgeColor: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
      actor: isEn ? 'Surface Grinder Technician' : 'ช่างเจียรราบ (Okamoto)',
      action: isEn
        ? 'Click "Start Now" at creation, or open a queued ticket and click "Start Grinding" when mounting on grinder.'
        : 'กด "⚡ เริ่มเจียรทันที" ตอนสร้าง หรือเปิดใบงานรอคิวแล้วกด "เริ่มเจียร" เมื่อขึ้นแท่นเครื่อง Okamoto',
      impact: isEn
        ? 'Updates Real-Time Queue status to Grinding and tracks active machine work in progress.'
        : 'อัปเดตสถานะหน้าแดชบอร์ดเป็น "กำลังเจียร" แบบ Real-Time'
    },
    {
      step: '04',
      status: isEn ? 'Ready for QC' : 'เจียรเสร็จแล้ว (รอตรวจ QC)',
      badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
      actor: isEn ? 'Surface Grinder Technician' : 'ช่างเจียรราบ',
      action: isEn
        ? 'Measure finished height with micrometer, enter actual After Grind length, and click "Grinding Done".'
        : 'วัดขนาดหลังเจียรจริงด้วยไมโครมิเตอร์ อัปเดตระยะหลังเจียรให้ตรงจริง แล้วกด "เจียรเสร็จ"',
      impact: isEn
        ? 'Moves job to QC inspection queue; auto-flags Scrapped if final length fell below Scrap Limit.'
        : 'ส่งต่อให้ QC ตรวจรับ (หากความยาวหลังเจียรต่ำกว่า Min Spec ระบบจะตัดเข้ากลุ่ม Scrap อัตโนมัติ)'
    },
    {
      step: '05',
      status: isEn ? 'QC Passed (Completed)' : 'งานเสร็จสมบูรณ์ (QC ผ่าน)',
      badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
      actor: isEn ? 'QC Inspector' : 'เจ้าหน้าที่ตรวจสอบคุณภาพ (QC)',
      action: isEn
        ? 'Open Ready for QC ticket -> click "QC Approve", pick verdict (PASS / MONITOR / REWORK) and sign off.'
        : 'เปิดใบงานรอตรวจ QC -> กดตรวจรับ QC เลือกผลประเมิน (PASS / MONITOR / REWORK) พร้อมลงชื่อผู้ตรวจ',
      impact: isEn
        ? 'Finalizes realized Net Saving in Cost & Saving Dashboard and locks immutable entry in Master Logs.'
        : 'ยืนยันยอด Net Saving จริงบนแดชบอร์ด และบันทึกประวัติถาวรลงหน้า Repair & Regrind Logs'
    },
    {
      step: '06',
      status: isEn ? 'Scrapped / Postponed Auto-Rollover' : 'คัดทิ้ง / เลื่อนวันอัตโนมัติ',
      badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
      actor: isEn ? 'System Auto-Guard / Admin' : 'ระบบอัตโนมัติ / ผู้ดูแลระบบ',
      action: isEn
        ? 'Scrapped tools log replacement value loss; uncompleted past-due jobs automatically roll over to today.'
        : 'งานที่ต่ำกว่า Min Spec บันทึกเป็น Scrap Value Loss; คิวค้างข้ามวันจะถูกเลื่อนมาวันปัจจุบันพร้อมป้าย Postponed',
      impact: isEn
        ? 'Ensures zero lost work orders while separating true savings from scrap replacement losses.'
        : 'ป้องกันใบงานตกหล่นข้ามวัน และแยกมูลค่าคัดทิ้งออกจากยอดประหยัดสุทธิอย่างชัดเจน'
    }
  ];

  const appModules = [
    {
      route: 'cost-saving-management',
      icon: TrendingUp,
      titleTh: 'แดชบอร์ดต้นทุน & ผลประหยัด',
      titleEn: 'Cost & Saving Dashboard',
      purposeTh: 'ดูสรุปสถานะคิวงาน Real-Time, ยอดประหยัดสุทธิ (Net Saving ฿ / %), กราฟแนวโน้มสะสม, Top 10 ซ่อมบ่อย/ทิ้งบ่อย/สาเหตุ และส่งออก PDF / CSV',
      purposeEn: 'Monitor real-time queue & stock health, Net Saving (THB / %), cumulative trend charts, Top 10 repaired/scrapped parts & defect causes, and export Management PDF / CSV.',
      formula: 'Net Saving = (New Price × Qty) − Total 5-Step Regrind Cost',
      tipTh: 'สลับดูแบบ รายวัน / รายสัปดาห์ / รายเดือน / รายปี และกรองรายสายการผลิต (E1–E5) ได้ทันที',
      tipEn: 'Switch between Daily / Weekly / Monthly / Yearly views and filter by production line (E1–E5).'
    },
    {
      route: 'smart-queue-schedule',
      icon: Flame,
      titleTh: 'คิวงานเจียรแม่พิมพ์ & ปฏิทิน',
      titleEn: 'Regrind Job Queue & Calendar',
      purposeTh: 'จัดลำดับคิวเจียรประจำวัน ลากวางสลับคิว ดันคิวด่วน #1 ลงงานใหม่ ย้ายวันที่ในปฏิทิน และกดเริ่ม/จบงาน/ตรวจรับ QC',
      purposeEn: 'Prioritize daily grinding sequence, drag/reorder queues, promote Urgent #1 jobs, schedule via monthly calendar, and run Start → Done → QC Pass transitions.',
      formula: 'After Grind (mm) = Before Grind (mm) − Grind Depth (mm)',
      tipTh: 'คลิกช่องวันที่บนปฏิทินเพื่อกรองคิวเฉพาะวันนั้น หรือกดปุ่ม + เพิ่ม บนหัวช่องวันที่',
      tipEn: 'Click any calendar date to inspect its queue or press + Add inside a day cell to schedule directly.'
    },
    {
      route: 'unified-logs-view',
      icon: FileText,
      titleTh: 'ประวัติงานซ่อมและเจียร',
      titleEn: 'Repair & Regrind Logs',
      purposeTh: 'ตารางประวัติงานเจียรและงานคัดทิ้งครบ 20 คอลัมน์ (มิติก่อน-หลัง, สาเหตุ, เวลา, ค่าแรง, Saving, ช่างผู้รับผิดชอบ) พร้อมค้นหาและส่งออก Excel',
      purposeEn: 'Full 20-column master ledger of completed regrinds and scrap events (dimensions, defect reason, labor min, cost, net saving, operator) with search and Excel export.',
      formula: 'Saving % = (Net Saving ÷ New Part Price) × 100%',
      tipTh: 'กดคลิกที่แถวประวัติเพื่อดูรายละเอียดครบถ้วน หรือแก้ไขใบงานที่ยังไม่ปิด',
      tipEn: 'Click any row to inspect full dimensional measurements and remarks, or export filtered rows to Excel.'
    },
    {
      route: 'tooling-specs',
      icon: Layers,
      titleTh: 'สเปคแม่พิมพ์ & ทะเบียนราคา',
      titleEn: 'Die Specs & Part Pricing',
      purposeTh: 'ฐานข้อมูลหลัก 4 แท็บ: 1) Part Master & ราคา 2) Line & Die Spec 3) Install Qty Matrix และ 4) Stock Part Repair พร้อมตารางรอบเจียร (Grind Ladder)',
      purposeEn: '4-tab tooling governance: Part Master & Pricing, Line & Die Specifications, Install Quantity Matrix, and Repair Stock Pool—including Cycle Ladder verification.',
      formula: 'Total Regrind Allowance = New Spec L₀ − Scrap Limit L_min',
      tipTh: 'กดปุ่ม ตารางรอบเจียร (Grind Ladder) ในแต่ละแถว เพื่อดูความยาวคงเหลือทุกรอบตั้งแต่รอบ 0 จนถึง Scrap Limit',
      tipEn: 'Open the Grind Ladder button on any part row to verify cycle-by-cycle lengths down to Scrap Limit.'
    },
    {
      route: 'cost-rate-master',
      icon: Cpu,
      titleTh: 'อัตราเครื่องจักร & ค่าแรง',
      titleEn: 'Machine & Labor Rates',
      purposeTh: 'กำหนดอัตราค่าเครื่องจักร (Okamoto / Wasino), ค่าไฟฟ้า, ค่าแรงช่าง, OT, ค่าหินเจียร CBN และทดลองคำนวณ Step 1–5 ใน Simulator',
      purposeEn: 'Configure surface grinder hourly rates, electricity kW, operator & OT wages, CBN consumables, QC overhead, and verify formulas in the 5-Step Simulator.',
      formula: 'True Cost = Step 1 (M/C+Power) + Step 2 (Labor) + Step 3 (CBN) + Step 4 (QC/OH)',
      tipTh: 'ตรวจให้แน่ใจว่าตั้งค่า Includes Operator Labor ตรงกับความเป็นจริงของอัตราค่าเครื่องจักรเพื่อไม่คิดค่าแรงซ้ำซ้อน',
      tipEn: 'Verify the Includes Operator Labor flag matches your hourly rate structure to avoid double-counting.'
    }
  ];

  return (
    <div className="space-y-4 w-full text-slate-100 font-sans pb-6">
      {/* Page Header */}
      <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isEn
                  ? 'User Guide & Mistake-Proof Data Entry SOP'
                  : 'คู่มือสอนใช้งาน & แนวทางป้องกันการลงข้อมูลผิดพลาด'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Interactive modal field guide · Dimension & limit rules · Queue-to-QC workflow · Press-die terminology'
                  : 'แผนภาพสอนกรอกข้อมูลทีละช่อง · กฎเช็กสเปคและระยะเจียร · ขั้นตอนคิวงานถึง QC · เปลี่ยนภาษา TH/EN อัตโนมัติ'}
              </p>
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-white/10 rounded-xl overflow-x-auto shrink-0">
          {[
            {
              id: 'job-entry' as GuideTab,
              icon: Ruler,
              labelTh: 'แผนภาพลงงานเจียรทีละช่อง',
              labelEn: 'Visual Job Entry Map'
            },
            {
              id: 'mistakes' as GuideTab,
              icon: ShieldAlert,
              labelTh: 'ป้องกันลงข้อมูลพลาด',
              labelEn: 'Mistake Prevention'
            },
            {
              id: 'workflow' as GuideTab,
              icon: Wrench,
              labelTh: 'ขั้นตอนคิวถึง QC',
              labelEn: 'Queue-to-QC SOP'
            },
            {
              id: 'modules' as GuideTab,
              icon: Layers,
              labelTh: 'เมนูหลัก & สูตรคำนวณ',
              labelEn: 'Modules & Formulas'
            }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{isEn ? tab.labelEn : tab.labelTh}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: VISUAL ANNOTATED POPUP DIAGRAM WITH SVG LEADER LINES         */}
      {/* =================================================================== */}
      {activeTab === 'job-entry' && (
        <div className="space-y-4">
          {/* Diagram Toolbar & Color-State Preview Switch */}
          <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEn
                  ? 'Annotated Regrind Job Popup — Click Any Callout Box or Field (01–11)'
                  : 'แผนภาพสอนใช้งานหน้าต่างลงคิวงาน — กดที่กล่องคำอธิบายหรือช่องกรอกบนรูป (01–11)'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? 'Connector lines link each callout directly to the matching field. Toggle Gray/Green below to preview required-field colors.'
                  : 'เส้นโยงชี้ตรงไปยังช่องจริงในหน้าต่างลงคิวงาน สลับโหมดสีด้านขวาเพื่อดูตัวอย่างสีช่องที่ยังไม่กรอก (เทาจาง) เทียบกับกรอกแล้ว (เขียวสว่าง)'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-[11px] text-slate-400">
                {isEn ? 'Required Field Preview:' : 'ตัวอย่างสีช่องบังคับ:'}
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewFieldMode('unfilled')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    previewFieldMode === 'unfilled'
                      ? 'bg-slate-600/45 text-white border border-slate-400/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-400/55 border border-slate-300/70 inline-block" />
                  <span>{isEn ? 'Unfilled (Soft Gray)' : 'ยังไม่กรอก (สีเทาจาง)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFieldMode('filled')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    previewFieldMode === 'filled'
                      ? 'bg-emerald-400/25 text-emerald-100 border border-emerald-400/70'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/45 border border-emerald-300 inline-block" />
                  <span>{isEn ? 'Filled (Light Green)' : 'กรอกแล้ว (สีเขียวสว่าง)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Column Annotated Diagram Canvas with Dynamic SVG Leader Lines */}
          <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-3 sm:p-4 overflow-x-auto">
            <div ref={canvasRef} className="relative min-w-[300px]">
              {/* Measured SVG Connector Lines Overlay (Desktop lg+) */}
              {svgLines.length > 0 && canvasSize.width > 0 && (
                <svg
                  className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-20"
                  viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                  preserveAspectRatio="none"
                >
                  {svgLines.map(line => {
                    const isFocused = line.id === selectedZoneId || line.id === hoveredZoneId;
                    const color = toneStrokeHex(line.tone);
                    let d = '';
                    if (line.side === 'FOOTER') {
                      const midY = (line.y1 + line.y2) / 2;
                      d = `M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`;
                    } else {
                      const dx = (line.x2 - line.x1) * 0.48;
                      d = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;
                    }
                    return (
                      <g key={line.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke={color}
                          strokeWidth={isFocused ? 2.5 : 1.35}
                          strokeOpacity={isFocused ? 0.95 : 0.42}
                          strokeDasharray={isFocused ? undefined : '4 3'}
                        />
                        <circle
                          cx={line.x1}
                          cy={line.y1}
                          r={isFocused ? 3.5 : 2.5}
                          fill={color}
                          fillOpacity={isFocused ? 1 : 0.55}
                        />
                        <circle
                          cx={line.x2}
                          cy={line.y2}
                          r={isFocused ? 5 : 3.5}
                          fill="#0b101b"
                          stroke={color}
                          strokeWidth={isFocused ? 2.5 : 1.75}
                          strokeOpacity={isFocused ? 1 : 0.75}
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* 3-Column Visual Grid: Left Callouts | Center Interactive Popup Replica | Right Callouts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start relative z-10">
                {/* LEFT CALLOUT CARDS (01 - 06) */}
                <div className="lg:col-span-3 space-y-2.5 order-2 lg:order-1">
                  <div className="text-[11px] font-semibold text-slate-400 px-1">
                    {isEn ? 'Left Panel Fields (01–06)' : 'คำอธิบายฝั่งซ้ายของหน้าต่าง (01–06)'}
                  </div>
                  {leftZones.map(zone => {
                    const active = zone.id === selectedZoneId;
                    return (
                      <button
                        key={zone.id}
                        ref={el => {
                          cardRefs.current[zone.id] = el;
                        }}
                        type="button"
                        onClick={() => setSelectedZoneId(zone.id)}
                        onMouseEnter={() => setHoveredZoneId(zone.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${toneRingClass(
                          zone.tone,
                          active
                        )}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold leading-snug">
                            <span className={`font-mono tabular-nums mr-1.5 ${toneStepColor(zone.tone)}`}>
                              {zone.stepNo}.
                            </span>
                            {isEn ? zone.titleEn : zone.titleTh}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {isEn ? zone.ruleEn : zone.ruleTh}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* CENTER: AUTHENTIC POPUP REPLICA + FOOTER CALLOUT 11 */}
                <div className="lg:col-span-6 space-y-3 order-1 lg:order-2">
                  {/* Mockup Modal Container */}
                  <div className="rounded-2xl bg-[#0b101b] border-2 border-cyan-500/45 shadow-2xl overflow-hidden text-[11px]">
                    {/* Mockup Modal Header */}
                    <div className="px-3 py-2 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border-b border-cyan-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/35 shrink-0">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-white truncate">
                          {isEn ? 'Create Regrind Job & Queue Entry' : 'บันทึกงานเจียระไน & จัดคิวชิ้นงาน'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          · {previewFieldMode === 'filled' ? 'LINE E1' : isEn ? 'LINE —' : 'รอเลือกไลน์'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-500/35 text-[10px] font-bold inline-flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          <span>{isEn ? 'Guide' : 'คู่มือลงข้อมูล'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Mockup Color Legend Bar */}
                    <div className="px-3 py-1 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-slate-500/35 border border-slate-400/60 inline-block" />
                          <span>{isEn ? 'Gray = Unfilled' : 'เทาจาง = ยังไม่กรอก'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/25 border border-emerald-400/70 inline-block" />
                          <span className="text-emerald-200">{isEn ? 'Light Green = Filled' : 'เขียวสว่าง = กรอกแล้ว'}</span>
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-amber-300">
                        {previewFieldMode === 'filled' ? '9 / 9' : '1 / 9'}
                      </span>
                    </div>

                    {/* Mockup Popup Body: 2 Columns */}
                    <div className="p-2.5 grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                      {/* Mockup Left (7 cols) */}
                      <div className="md:col-span-7 space-y-2">
                        {/* Zone 01: Queue Priority Mode */}
                        <div
                          ref={el => {
                            anchorRefs.current['queue-mode'] = el;
                          }}
                          onClick={() => setSelectedZoneId('queue-mode')}
                          onMouseEnter={() => setHoveredZoneId('queue-mode')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-1 rounded-xl border cursor-pointer transition-all ${
                            selectedZoneId === 'queue-mode'
                              ? 'border-rose-400 ring-1 ring-rose-400/50 bg-slate-950'
                              : 'border-white/10 bg-slate-950/70 hover:border-white/25'
                          }`}
                        >
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                            <div className="py-1 rounded-lg bg-cyan-400 text-slate-950 text-center">
                              {isEn ? '01. Normal Queue' : '01. คิวปกติ (Normal)'}
                            </div>
                            <div className="py-1 rounded-lg bg-slate-900 text-slate-300 text-center flex items-center justify-center gap-1">
                              <Zap className="w-3 h-3 text-rose-400" />
                              <span>{isEn ? 'Urgent #1' : 'คิวด่วน #1'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Zone 02 & 03 & 04 Container */}
                        <div className="p-2 rounded-xl bg-slate-950/90 border border-white/10 space-y-2">
                          {/* Zone 02: Date, Line, Die, Qty */}
                          <div
                            ref={el => {
                              anchorRefs.current['date-line-qty'] = el;
                            }}
                            onClick={() => setSelectedZoneId('date-line-qty')}
                            onMouseEnter={() => setHoveredZoneId('date-line-qty')}
                            onMouseLeave={() => setHoveredZoneId(null)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                              selectedZoneId === 'date-line-qty'
                                ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                                : 'border-transparent hover:border-white/20'
                            }`}
                          >
                            <div className="grid grid-cols-4 gap-1.5 text-[9.5px]">
                              <div>
                                <div className="text-slate-300 font-bold mb-0.5 truncate">
                                  {isEn ? '02. Date *' : '02. วันที่ *'}
                                </div>
                                <div className="px-1.5 py-1 rounded border bg-emerald-400/18 border-emerald-400/60 text-white font-mono tabular-nums text-center">
                                  11/26
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-300 font-bold mb-0.5 truncate">
                                  {isEn ? 'Line *' : 'ไลน์ *'}
                                </div>
                                <div
                                  className={`px-1.5 py-1 rounded border font-bold text-center truncate ${
                                    previewFieldMode === 'filled'
                                      ? 'bg-emerald-400/18 border-emerald-400/60 text-white'
                                      : 'bg-slate-500/25 border-slate-400/50 text-slate-200'
                                  }`}
                                >
                                  {previewFieldMode === 'filled' ? 'LINE E1' : isEn ? 'Select' : '-- เลือก --'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 font-semibold mb-0.5 truncate">
                                  {isEn ? 'Die Code' : 'แม่พิมพ์'}
                                </div>
                                <div className="px-1.5 py-1 rounded border border-white/10 bg-slate-900/75 text-slate-400 font-mono text-center truncate">
                                  {previewFieldMode === 'filled' ? '151915...' : '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-300 font-bold mb-0.5 truncate">
                                  {isEn ? 'Qty *' : 'จำนวน *'}
                                </div>
                                <div
                                  className={`px-1.5 py-1 rounded border font-mono tabular-nums font-bold text-center ${
                                    previewFieldMode === 'filled'
                                      ? 'bg-emerald-400/18 border-emerald-400/60 text-white'
                                      : 'bg-slate-500/25 border-slate-400/50 text-slate-300'
                                  }`}
                                >
                                  {previewFieldMode === 'filled' ? '1' : isEn ? 'Qty' : 'ระบุ'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Zone 03: Part Selector */}
                          <div
                            ref={el => {
                              anchorRefs.current['part-selector'] = el;
                            }}
                            onClick={() => setSelectedZoneId('part-selector')}
                            onMouseEnter={() => setHoveredZoneId('part-selector')}
                            onMouseLeave={() => setHoveredZoneId(null)}
                            className={`p-1 rounded-lg border cursor-pointer transition-all ${
                              selectedZoneId === 'part-selector'
                                ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                                : 'border-transparent hover:border-white/20'
                            }`}
                          >
                            <div className="text-[10px] font-bold text-slate-200 mb-1">
                              {isEn ? '03. Tooling Part Name *' : '03. ชื่อรายการชิ้นงาน *'}
                            </div>
                            <div
                              className={`px-2.5 py-1.5 rounded-lg border-2 flex items-center justify-between gap-2 ${
                                previewFieldMode === 'filled'
                                  ? 'bg-emerald-400/18 border-emerald-400/60 text-white'
                                  : 'bg-slate-500/25 border-slate-400/50 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Search className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                <span className="font-bold truncate">
                                  {previewFieldMode === 'filled'
                                    ? 'BURRING (WIDE LOWER)'
                                    : isEn
                                    ? '-- Click to select part --'
                                    : '-- คลิกเลือกชื่อชิ้นงาน --'}
                                </span>
                              </div>
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
                            </div>
                          </div>

                          {/* Zone 04: Read-only Part Master Card */}
                          <div
                            ref={el => {
                              anchorRefs.current['specs-card'] = el;
                            }}
                            onClick={() => setSelectedZoneId('specs-card')}
                            onMouseEnter={() => setHoveredZoneId('specs-card')}
                            onMouseLeave={() => setHoveredZoneId(null)}
                            className={`p-2 rounded-lg bg-slate-900/75 border cursor-pointer transition-all font-mono ${
                              selectedZoneId === 'specs-card'
                                ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                                : 'border-white/10 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1.5">
                              <span>{isEn ? '04. Part Master Specs (Read-Only)' : '04. การ์ดสเปค & ราคาซื้อใหม่ (ดูอ้างอิง)'}</span>
                              <span className="text-slate-400">Read-Only</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-[9.5px] tabular-nums">
                              <div className="p-1.5 rounded bg-slate-950 border border-white/10">
                                <span className="text-slate-400 block">{isEn ? 'New Price' : 'ซื้อใหม่'}</span>
                                <span className="text-emerald-400 font-bold">
                                  {previewFieldMode === 'filled' ? '฿12,500' : '—'}
                                </span>
                              </div>
                              <div className="p-1.5 rounded bg-slate-950 border border-white/10">
                                <span className="text-slate-400 block">Scrap Limit</span>
                                <span className="text-rose-400 font-bold">
                                  {previewFieldMode === 'filled' ? '26.50 mm' : '—'}
                                </span>
                              </div>
                              <div className="p-1.5 rounded bg-slate-950 border border-white/10">
                                <span className="text-slate-400 block">Shot Life</span>
                                <span className="text-slate-200 font-bold">
                                  {previewFieldMode === 'filled' ? '15.0M' : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Zone 05: Defect Reason */}
                        <div
                          ref={el => {
                            anchorRefs.current['defect-reason'] = el;
                          }}
                          onClick={() => setSelectedZoneId('defect-reason')}
                          onMouseEnter={() => setHoveredZoneId('defect-reason')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl border-2 cursor-pointer transition-all ${
                            previewFieldMode === 'filled'
                              ? 'bg-emerald-400/14 border-emerald-400/55'
                              : 'bg-slate-500/22 border-slate-400/50'
                          } ${selectedZoneId === 'defect-reason' ? 'ring-2 ring-amber-400/60' : ''}`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-100 mb-1.5">
                            <span>{isEn ? '05. Regrind & Defect Reason *' : '05. สาเหตุการส่งเจียร *'}</span>
                            <span className={previewFieldMode === 'filled' ? 'text-emerald-300' : 'text-slate-300'}>
                              {previewFieldMode === 'filled'
                                ? isEn ? 'Selected' : 'เลือกแล้ว'
                                : isEn ? 'Pick 1' : 'เลือก 1 สาเหตุ'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                            {(isEn
                              ? ['Normal Wear', 'Excessive Burr', 'Edge Chipped', 'Galling', 'Out of Spec', 'Broken']
                              : ['สึกหรอปกติ', 'ครีบสูงเกิน', 'คมบิ่น/กะเทาะ', 'ผิวเป็นรอย', 'หลุดสเปค Min', 'แตกหักชำรุด']
                            ).map((label, idx) => (
                              <div
                                key={label}
                                className={`py-1 px-1.5 rounded-lg border text-center truncate ${
                                  previewFieldMode === 'filled' && idx === 0
                                    ? 'bg-emerald-400/25 border-emerald-300 text-emerald-100'
                                    : previewFieldMode === 'filled'
                                    ? 'bg-slate-900/70 border-white/10 text-slate-300'
                                    : 'bg-slate-600/30 border-slate-400/40 text-slate-100'
                                }`}
                              >
                                {label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Zone 06: Remarks */}
                        <div
                          ref={el => {
                            anchorRefs.current['remarks'] = el;
                          }}
                          onClick={() => setSelectedZoneId('remarks')}
                          onMouseEnter={() => setHoveredZoneId('remarks')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl bg-slate-950/85 border cursor-pointer transition-all ${
                            selectedZoneId === 'remarks'
                              ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-slate-300 mb-1">
                            {isEn ? '06. Remarks / Work Notes (Optional)' : '06. หมายเหตุ / คำแนะนำช่าง (ไม่บังคับ)'}
                          </div>
                          <div className="px-2 py-1 rounded bg-slate-900/80 border border-white/10 text-[9.5px] text-slate-400 truncate">
                            {isEn ? 'CBN #400 · Polish Ra <= 0.1um · Add shim' : 'ลับคมด้วยหิน CBN #400 · ปาดหน้าขัดเงา · รองชิม'}
                          </div>
                        </div>
                      </div>

                      {/* Mockup Right (5 cols) */}
                      <div className="md:col-span-5 space-y-2">
                        {/* Zone 07: 4-Step Dimension Calculator */}
                        <div
                          ref={el => {
                            anchorRefs.current['dimension-calc'] = el;
                          }}
                          onClick={() => setSelectedZoneId('dimension-calc')}
                          onMouseEnter={() => setHoveredZoneId('dimension-calc')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl bg-slate-950/90 border cursor-pointer transition-all space-y-1.5 ${
                            selectedZoneId === 'dimension-calc'
                              ? 'border-amber-400 ring-1 ring-amber-400/50'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-white">
                            <span>{isEn ? '07. Dimension Spec' : '07. คำนวณระยะเจียร'}</span>
                            <span className="font-mono text-amber-300 tabular-nums">
                              Min: {previewFieldMode === 'filled' ? '26.50' : '—'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono tabular-nums">
                            <div className="p-1.5 rounded-lg bg-slate-900/75 border border-white/10">
                              <span className="text-slate-400 block font-sans">{isEn ? '1. New L₀' : '1. ใหม่'}</span>
                              <span className="text-slate-300 font-bold">
                                {previewFieldMode === 'filled' ? '28.00' : '—'}
                              </span>
                            </div>
                            <div
                              className={`p-1.5 rounded-lg border ${
                                previewFieldMode === 'filled'
                                  ? 'bg-emerald-400/18 border-emerald-400/60 text-white'
                                  : 'bg-slate-500/25 border-slate-400/50 text-slate-200'
                              }`}
                            >
                              <span className="block font-sans font-bold">{isEn ? '2. Before *' : '2. ก่อนเจียร *'}</span>
                              <span className="font-black">
                                {previewFieldMode === 'filled' ? '28.00' : '0.00'}
                              </span>
                            </div>
                            <div
                              className={`p-1.5 rounded-lg border ${
                                previewFieldMode === 'filled'
                                  ? 'bg-emerald-400/18 border-emerald-400/60 text-white'
                                  : 'bg-slate-500/25 border-slate-400/50 text-slate-200'
                              }`}
                            >
                              <span className="block font-sans font-bold">{isEn ? '3. Depth *' : '3. จะเจียรลง *'}</span>
                              <span className="font-black">
                                {previewFieldMode === 'filled' ? '0.10' : '0.10'}
                              </span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-900/75 border border-white/15">
                              <span className="text-slate-400 block font-sans">{isEn ? '4. After' : '4. หลังเจียร'}</span>
                              <span className="text-cyan-300 font-black">
                                {previewFieldMode === 'filled' ? '27.90' : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Zone 08: Cycle Counter */}
                        <div
                          ref={el => {
                            anchorRefs.current['cycle-counter'] = el;
                          }}
                          onClick={() => setSelectedZoneId('cycle-counter')}
                          onMouseEnter={() => setHoveredZoneId('cycle-counter')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl bg-slate-950/90 border cursor-pointer transition-all space-y-1 font-mono tabular-nums ${
                            selectedZoneId === 'cycle-counter'
                              ? 'border-emerald-400 ring-1 ring-emerald-400/50'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-200 font-sans font-bold">
                              {isEn ? '08. Cycle [0] → #1/9' : '08. รอบเจียร [0] → รอบ 1/9'}
                            </span>
                            <span className="text-emerald-300 font-bold">93%</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 w-[93%]" />
                          </div>
                        </div>

                        {/* Zone 09: Cost, Labor Time & Technician */}
                        <div
                          ref={el => {
                            anchorRefs.current['cost-labor'] = el;
                          }}
                          onClick={() => setSelectedZoneId('cost-labor')}
                          onMouseEnter={() => setHoveredZoneId('cost-labor')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl bg-slate-950/90 border cursor-pointer transition-all space-y-1.5 ${
                            selectedZoneId === 'cost-labor'
                              ? 'border-emerald-400 ring-1 ring-emerald-400/50'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-slate-900/75 border border-white/10 font-mono tabular-nums">
                            <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                              <span className="font-sans font-bold text-emerald-300">
                                {isEn ? '09. Net Saving' : '09. ยอดประหยัดสุทธิ'}
                              </span>
                              <span>96.2%</span>
                            </div>
                            <div className="text-sm font-black text-[#00FF7F]">
                              {previewFieldMode === 'filled' ? '฿12,021.98' : '—'}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                            <div>
                              <div className="text-slate-300 font-bold mb-0.5 truncate">
                                {isEn ? 'Labor Time *' : 'เวลาในการซ่อม *'}
                              </div>
                              <div
                                className={`px-1.5 py-1 rounded border font-mono text-center ${
                                  previewFieldMode === 'filled'
                                    ? 'bg-emerald-400/18 border-emerald-400/60 text-white font-bold'
                                    : 'bg-slate-500/25 border-slate-400/50 text-slate-300'
                                }`}
                              >
                                {previewFieldMode === 'filled' ? '1.0 hr' : isEn ? '30m / 1h' : 'กรอกเวลา'}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-300 font-bold mb-0.5 truncate">
                                {isEn ? 'Technician *' : 'ช่างผู้รับผิดชอบ *'}
                              </div>
                              <div className="px-1.5 py-1 rounded border bg-emerald-400/18 border-emerald-400/60 text-white font-semibold truncate">
                                Thanakorn
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Zone 10: Evidence Photos */}
                        <div
                          ref={el => {
                            anchorRefs.current['evidence-photos'] = el;
                          }}
                          onClick={() => setSelectedZoneId('evidence-photos')}
                          onMouseEnter={() => setHoveredZoneId('evidence-photos')}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          className={`p-2 rounded-xl bg-slate-950/85 border cursor-pointer transition-all ${
                            selectedZoneId === 'evidence-photos'
                              ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-1">
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3 text-slate-400" />
                              <span>{isEn ? '10. Evidence Photos' : '10. แนบรูปภาพจริง'}</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[9px] inline-flex items-center gap-1">
                              <Upload className="w-2.5 h-2.5" />
                              <span>{isEn ? 'Optional' : 'ไม่บังคับ'}</span>
                            </span>
                          </div>
                          <div className="py-1.5 px-2 rounded-lg border border-dashed border-slate-800 text-[9.5px] text-slate-500 text-center">
                            {isEn ? 'Upload inspection / scrap photos' : 'อัปโหลดภาพถ่ายรอยบิ่นหรือสภาพหลังเจียร'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mockup Footer Bar: Zone 11 Anchor */}
                    <div
                      ref={el => {
                        anchorRefs.current['footer-actions'] = el;
                      }}
                      onClick={() => setSelectedZoneId('footer-actions')}
                      onMouseEnter={() => setHoveredZoneId('footer-actions')}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      className={`px-3 py-2 border-t bg-slate-950 flex items-center justify-between gap-2 cursor-pointer transition-all flex-wrap ${
                        selectedZoneId === 'footer-actions'
                          ? 'border-rose-400 ring-1 ring-inset ring-rose-400/40'
                          : 'border-white/15 hover:border-white/30'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-slate-300 tabular-nums">
                        {isEn ? 'After:' : 'หลังเจียร:'}{' '}
                        <strong className="text-emerald-300">
                          {previewFieldMode === 'filled' ? '27.90 mm' : '—'}
                        </strong>
                      </span>
                      <div className="flex items-center gap-1.5 text-[9.5px] font-bold">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                          {isEn ? 'Cancel' : 'ยกเลิก'}
                        </span>
                        <span className="px-2 py-1 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300">
                          {isEn ? 'Add to Queue' : 'ลงคิวรอ'}
                        </span>
                        <span className="px-2 py-1 rounded bg-emerald-400 text-slate-950 font-black inline-flex items-center gap-0.5">
                          <Play className="w-2.5 h-2.5 fill-slate-950" />
                          <span>{isEn ? 'Start Now' : 'เริ่มเจียรทันที'}</span>
                        </span>
                        <span className="px-2 py-1 rounded bg-rose-600 text-white">
                          {isEn ? 'Scrap' : 'คัดทิ้ง'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Zone 11 Callout Card Directly Below Footer */}
                  {footerZone && (
                    <button
                      ref={el => {
                        cardRefs.current[footerZone.id] = el;
                      }}
                      type="button"
                      onClick={() => setSelectedZoneId(footerZone.id)}
                      onMouseEnter={() => setHoveredZoneId(footerZone.id)}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${toneRingClass(
                        footerZone.tone,
                        footerZone.id === selectedZoneId
                      )}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold">
                          <span className={`font-mono tabular-nums mr-1.5 ${toneStepColor(footerZone.tone)}`}>
                            {footerZone.stepNo}.
                          </span>
                          {isEn ? footerZone.titleEn : footerZone.titleTh}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isEn ? footerZone.fieldPreviewEn : footerZone.fieldPreviewTh}
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* RIGHT CALLOUT CARDS (07 - 10) */}
                <div className="lg:col-span-3 space-y-2.5 order-3">
                  <div className="text-[11px] font-semibold text-slate-400 px-1">
                    {isEn ? 'Right Panel Fields (07–10)' : 'คำอธิบายฝั่งขวาของหน้าต่าง (07–10)'}
                  </div>
                  {rightZones.map(zone => {
                    const active = zone.id === selectedZoneId;
                    return (
                      <button
                        key={zone.id}
                        ref={el => {
                          cardRefs.current[zone.id] = el;
                        }}
                        type="button"
                        onClick={() => setSelectedZoneId(zone.id)}
                        onMouseEnter={() => setHoveredZoneId(zone.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${toneRingClass(
                          zone.tone,
                          active
                        )}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold leading-snug">
                            <span className={`font-mono tabular-nums mr-1.5 ${toneStepColor(zone.tone)}`}>
                              {zone.stepNo}.
                            </span>
                            {isEn ? zone.titleEn : zone.titleTh}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {isEn ? zone.ruleEn : zone.ruleTh}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SELECTED ZONE INSPECTOR STRIP */}
          <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="space-y-0.5">
                <div className="text-[11px] font-mono tabular-nums text-cyan-300">
                  {isEn
                    ? `SELECTED FIELD ${selectedZone.stepNo} / 11 · ${selectedZone.column} SECTION`
                    : `กำลังดูคำอธิบายช่องที่ ${selectedZone.stepNo} / 11 · ${
                        selectedZone.column === 'LEFT'
                          ? 'ฝั่งซ้าย'
                          : selectedZone.column === 'RIGHT'
                          ? 'ฝั่งขวา'
                          : 'ปุ่มบันทึกด้านล่าง'
                      }`}
                </div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {isEn ? selectedZone.titleEn : selectedZone.titleTh}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevZone}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Prev' : 'ก่อนหน้า'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextZone}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-200 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{isEn ? 'Next' : 'ถัดไป'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('smart-queue-schedule')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{isEn ? 'Try in Job Queue' : 'ไปที่หน้าคิวงานเจียร'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Rule */}
              <div className="p-3 rounded-xl bg-[#0b101b] border border-white/10 space-y-1.5">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{isEn ? 'How to Enter Data Correctly' : 'หลักการกรอกข้อมูลที่ถูกต้อง'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {isEn ? selectedZone.ruleEn : selectedZone.ruleTh}
                </p>
              </div>

              {/* Correct vs Mistake */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/35 space-y-1">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{isEn ? 'Correct Example' : 'ตัวอย่างการลงข้อมูลที่ถูกต้อง'}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono tabular-nums">
                    {isEn ? selectedZone.correctExampleEn : selectedZone.correctExampleTh}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-500/35 space-y-1">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{isEn ? 'Common Mistake (Do Not)' : 'ข้อผิดพลาดที่พบบ่อย (ห้ามทำ)'}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono tabular-nums">
                    {isEn ? selectedZone.mistakeExampleEn : selectedZone.mistakeExampleTh}
                  </p>
                </div>
              </div>

              {/* Auto-Guard */}
              <div className="p-3 rounded-xl bg-[#0b101b] border border-white/10 space-y-1.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{isEn ? 'Built-in System Auto-Guard' : 'ระบบป้องกันอัตโนมัติในแอป'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {isEn ? selectedZone.autoGuardEn : selectedZone.autoGuardTh}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10 text-[11px] font-mono tabular-nums text-slate-400">
                  L₀ − Total Grind = Scrap Limit (e.g. 62.50 − 1.50 = 61.00 mm)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MISTAKE-PROOF VALIDATION MATRIX                              */}
      {/* =================================================================== */}
      {activeTab === 'mistakes' && (
        <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-4 space-y-4">
          {/* Filter & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'ALL', labelTh: 'ทั้งหมด', labelEn: 'All Rules' },
                  { id: 'DIMENSION', labelTh: 'มิติ & สเปคเจียร', labelEn: 'Dimensions & Limits' },
                  { id: 'JOB_ENTRY', labelTh: 'การลงใบงาน', labelEn: 'Job Entry' },
                  { id: 'QUEUE_QC', labelTh: 'คิวงาน & QC', labelEn: 'Queue & QC' },
                  { id: 'MASTER_RATES', labelTh: 'สเปค & อัตราค่าแรง', labelEn: 'Master & Rates' }
                ] as { id: MistakeCategory; labelTh: string; labelEn: string }[]
              ).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMistakeCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 border ${
                    mistakeCategory === cat.id
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold'
                      : 'bg-slate-950 text-slate-300 border-white/10 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {isEn ? cat.labelEn : cat.labelTh}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={mistakeSearch}
                onChange={e => setMistakeSearch(e.target.value)}
                placeholder={isEn ? 'Search rule, mm, QC, labor...' : 'ค้นหาข้อผิดพลาด เช่น ระยะเจียร, นาที, QC...'}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Mistake Table */}
          {filteredMistakes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isEn ? 'No matching validation rules found.' : 'ไม่พบหัวข้อป้องกันข้อผิดพลาดที่ค้นหา'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3 w-12 font-mono">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">
                      {isEn ? 'Rule / Checkpoint' : 'หัวข้อตรวจสอบ'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[230px] text-rose-300">
                      {isEn ? 'Common Mistake (Do Not)' : 'สิ่งที่ไม่ควรทำ (พลาดบ่อย)'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[230px] text-emerald-300">
                      {isEn ? 'Correct Entry (Do This)' : 'วิธีลงข้อมูลที่ถูกต้อง'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[200px] text-amber-300">
                      {isEn ? 'Impact & Auto-Guard' : 'ผลกระทบ & ระบบป้องกัน'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredMistakes.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-white/[0.03] align-top">
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {isEn ? item.titleEn : item.titleTh}
                      </td>
                      <td className="py-3 px-3 text-rose-200/90 leading-relaxed">
                        {isEn ? item.mistakeEn : item.mistakeTh}
                      </td>
                      <td className="py-3 px-3 text-emerald-200/90 leading-relaxed">
                        {isEn ? item.correctEn : item.correctTh}
                      </td>
                      <td className="py-3 px-3 text-slate-300 leading-relaxed">
                        {isEn ? item.impactEn : item.impactTh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: QUEUE-TO-QC WORKFLOW SOP                                     */}
      {/* =================================================================== */}
      {activeTab === 'workflow' && (
        <div className="bg-[#0c1018]/95 border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="pb-2.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEn
                  ? 'Standard Operating Procedure: Queue -> Grind -> QC Pass / Scrap'
                  : 'ขั้นตอนมาตรฐานการทำงานตั้งแต่เปิดคิวงาน -> เจียรจริง -> ตรวจรับ QC / คัดทิ้ง'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn
                  ? 'Follow each canonical status transition so Cost Savings, Stock Pool, and Master Logs stay 100% synchronized.'
                  : 'ปฏิบัติตามลำดับสถานะทั้ง 6 ขั้นตอน เพื่อให้ยอดประหยัดต้นทุน สต็อกอะไหล่ และประวัติงานซ่อมเชื่อมโยงกัน 100%'}
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('smart-queue-schedule')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <span>{isEn ? 'Open Regrind Job Queue' : 'เปิดหน้าคิวงานเจียร'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lifecycleStages.map(stage => (
              <div
                key={stage.step}
                className="p-3.5 rounded-xl bg-[#0b101b] border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-xs font-bold text-slate-400">
                      STEP {stage.step}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${stage.badgeColor}`}>
                      {stage.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isEn ? 'Responsible:' : 'ผู้รับผิดชอบ:'}{' '}
                    <span className="text-slate-200 font-semibold">{stage.actor}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{stage.action}</p>
                </div>

                <div className="pt-2.5 border-t border-white/10 text-[11px] text-cyan-300/90 leading-relaxed">
                  <strong className="text-slate-400 font-semibold">
                    {isEn ? 'System Impact: ' : 'ผลต่อระบบ: '}
                  </strong>
                  {stage.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: APP MODULES & FORMULAS QUICK REFERENCE                       */}
      {/* =================================================================== */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {appModules.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.route}
                className="p-4 rounded-2xl bg-[#0c1018]/95 border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        {isEn ? mod.titleEn : mod.titleTh}
                      </h3>
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate(mod.route)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-cyan-300 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>{isEn ? 'Open' : 'เปิดหน้านี้'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isEn ? mod.purposeEn : mod.purposeTh}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10 font-mono tabular-nums text-[11px] text-emerald-300">
                    {mod.formula}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">
                    {isEn ? 'Tip: ' : 'เคล็ดลับ: '}
                  </strong>
                  {isEn ? mod.tipEn : mod.tipTh}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
