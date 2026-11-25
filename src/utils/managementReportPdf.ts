import { jsPDF } from 'jspdf';

export interface ManagementPdfKpiSummary {
  periodLabel: string;
  lineLabel: string;
  generatedAt: string;
  totalNetSaving: number;
  savingPct: number;
  realizedNetSaving: number;
  totalNewPurchaseAvoided: number;
  totalRepairCost: number;
  repairCostPct: number;
  validJobs: number;
  validPieces: number;
  totalLogs: number;
  scrapJobs: number;
  scrapPieces: number;
  scrapRatePct: number;
  scrapNewValueLoss: number;
}

export interface ManagementPdfStatusSummary {
  queueTotalJobs: number;
  queueCounts: Array<{ label: string; jobs: number; pieces: number }>;
  stockReady: number;
  stockInProcess: number;
  stockAwaiting: number;
  stockLowCount: number;
}

export interface ManagementPdfTrendPoint {
  label: string;
  saving: number;
  cumulativeSaving: number;
  repair: number;
}

export interface ManagementPdfLineRow {
  lineId: string;
  jobs: number;
  saving: number;
  savingPct: number;
}

export interface ManagementPdfReportPayload {
  lang?: 'EN' | 'TH' | 'DUAL';
  kpi: ManagementPdfKpiSummary;
  status: ManagementPdfStatusSummary;
  trend: ManagementPdfTrendPoint[];
  lines: ManagementPdfLineRow[];
  topRepaired: Array<{ partName: string; partCode: string; jobs: number; pieces: number; totalSaving: number }>;
  topScrapped: Array<{ partName: string; scrapJobs: number; scrapPieces: number; lostValueThb: number }>;
  topReasons: Array<{ label: string; count: number; pct: number; repairCost: number }>;
}

const FONT_SANS = '"Plus Jakarta Sans", "Noto Sans Thai", "Tahoma", "Segoe UI", sans-serif';
const FONT_MONO = '"JetBrains Mono", "Consolas", "Noto Sans Thai", monospace';

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1.5
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function exportManagementReportPDF(payload: ManagementPdfReportPayload): string {
  // High-resolution A4 canvas (1588 x 2246 px = 192 DPI)
  const W = 1588;
  const H = 2246;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize canvas context for PDF report.');
  }

  const isEn = payload.lang === 'EN' || payload.lang === 'DUAL';

  // White A4 background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const M = 56; // Outer margin
  const CW = W - M * 2;
  let y = 52;

  // ------------------------------------------------------------------
  // 1. EXECUTIVE HEADER BANNER
  // ------------------------------------------------------------------
  drawRoundedRect(ctx, M, y, CW, 128, 14, '#0f172a', '#1e293b', 2);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 18px ${FONT_MONO}`;
  ctx.fillText('FIN DIE REGRIND PRO · MANAGEMENT REVIEW REPORT', M + 28, y + 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 32px ${FONT_SANS}`;
  ctx.fillText(
    isEn
      ? 'Tooling Regrinding Cost Savings & Operations Summary'
      : 'รายงานสรุปผลประหยัดต้นทุนและสถานะงานเจียรแม่พิมพ์',
    M + 28,
    y + 78
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 18px ${FONT_SANS}`;
  ctx.fillText(
    isEn
      ? `Period: ${payload.kpi.periodLabel}   |   Line: ${payload.kpi.lineLabel}   |   Generated: ${payload.kpi.generatedAt}`
      : `ช่วงเวลา: ${payload.kpi.periodLabel}   |   สายการผลิต: ${payload.kpi.lineLabel}   |   ออกรายงาน: ${payload.kpi.generatedAt}`,
    M + 28,
    y + 108
  );

  y += 150;

  // ------------------------------------------------------------------
  // 2. KPI SUMMARY CARDS (4 COLUMNS)
  // ------------------------------------------------------------------
  const kpiGap = 18;
  const kpiW = (CW - kpiGap * 3) / 4;
  const kpiH = 148;

  const kpiCards = [
    {
      title: isEn ? 'Net Cost Saving' : 'ยอดเงินที่ Saving ได้สุทธิ',
      value: `฿${Math.round(payload.kpi.totalNetSaving).toLocaleString()}`,
      badge: `${payload.kpi.savingPct.toFixed(1)}%`,
      sub: isEn
        ? `Done / Ready for QC: ฿${Math.round(payload.kpi.realizedNetSaving).toLocaleString()}`
        : `ซ่อมเสร็จ/รอ QC: ฿${Math.round(payload.kpi.realizedNetSaving).toLocaleString()}`,
      border: '#10b981',
      valueColor: '#047857',
      bg: '#f0fdf4'
    },
    {
      title: isEn ? 'New Purchase Cost Avoided' : 'มูลค่าซื้อใหม่ที่ทดแทนได้',
      value: `฿${Math.round(payload.kpi.totalNewPurchaseAvoided).toLocaleString()}`,
      badge: isEn ? `${payload.kpi.validJobs} Jobs` : `${payload.kpi.validJobs} ใบงาน`,
      sub: isEn
        ? `${payload.kpi.validPieces.toLocaleString()} Regrind Pcs Reused`
        : `ซ่อมใช้ต่อ ${payload.kpi.validPieces.toLocaleString()} ชิ้น`,
      border: '#0284c7',
      valueColor: '#0369a1',
      bg: '#f0f9ff'
    },
    {
      title: isEn ? 'Actual Regrind Repair Cost' : 'ต้นทุนงานซ่อมเจียรจริง',
      value: `฿${Math.round(payload.kpi.totalRepairCost).toLocaleString()}`,
      badge: `${payload.kpi.repairCostPct.toFixed(1)}%`,
      sub: isEn ? 'Labor + Consumables / Machine Rate' : 'ค่าแรง + อะไหล่/ต้นทุนเครื่องจริง',
      border: '#d97706',
      valueColor: '#b45309',
      bg: '#fffbeb'
    },
    {
      title: isEn ? 'Job Volume & Scrap Rate' : 'ปริมาณงาน & การคัดทิ้ง (Scrap)',
      value: isEn ? `${payload.kpi.totalLogs} Jobs` : `${payload.kpi.totalLogs} ใบงาน`,
      badge: isEn
        ? `Scrap ${payload.kpi.scrapJobs} (${payload.kpi.scrapRatePct.toFixed(1)}%)`
        : `คัดทิ้ง ${payload.kpi.scrapJobs} (${payload.kpi.scrapRatePct.toFixed(1)}%)`,
      sub: isEn
        ? `Scrap Value Loss: ฿${Math.round(payload.kpi.scrapNewValueLoss).toLocaleString()}`
        : `มูลค่าคัดทิ้ง ฿${Math.round(payload.kpi.scrapNewValueLoss).toLocaleString()}`,
      border: '#e11d48',
      valueColor: '#be123c',
      bg: '#fff1f2'
    }
  ];

  kpiCards.forEach((c, idx) => {
    const cx = M + idx * (kpiW + kpiGap);
    drawRoundedRect(ctx, cx, y, kpiW, kpiH, 12, c.bg, c.border, 2);

    ctx.fillStyle = '#334155';
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText(truncateText(ctx, c.title, kpiW - 28), cx + 16, y + 32);

    ctx.fillStyle = c.valueColor;
    ctx.font = `700 32px ${FONT_MONO}`;
    ctx.fillText(truncateText(ctx, c.value, kpiW - 28), cx + 16, y + 78);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 18px ${FONT_MONO}`;
    ctx.fillText(c.badge, cx + 16, y + 106);

    ctx.fillStyle = '#475569';
    ctx.font = `500 16px ${FONT_SANS}`;
    ctx.fillText(truncateText(ctx, c.sub, kpiW - 28), cx + 16, y + 132);
  });

  y += kpiH + 24;

  // ------------------------------------------------------------------
  // 3. REAL-TIME QUEUE STATUS & STOCK POOL SUMMARY BAR
  // ------------------------------------------------------------------
  drawRoundedRect(ctx, M, y, CW, 118, 12, '#f8fafc', '#cbd5e1', 1.5);

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 19px ${FONT_SANS}`;
  ctx.fillText(
    isEn
      ? `Real-Time Grinding Queue (${payload.status.queueTotalJobs} Jobs) & Spare Part Repair Pool`
      : `สถานะคิวงานเจียร Real-Time (${payload.status.queueTotalJobs} คิว) และสต็อกอะไหล่หมุนเวียน (Stock Part Repair)`,
    M + 20,
    y + 30
  );

  // Queue status items on row 1 inside box
  const qItemW = (CW - 40) / 7;
  payload.status.queueCounts.slice(0, 7).forEach((st, idx) => {
    const sx = M + 20 + idx * qItemW;
    ctx.fillStyle = '#475569';
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillText(truncateText(ctx, st.label, qItemW - 10), sx, y + 58);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillText(isEn ? `${st.jobs} (${st.pieces} EA)` : `${st.jobs} คิว (${st.pieces} EA)`, sx, y + 84);
  });

  // Stock summary on bottom strip
  ctx.fillStyle = '#0369a1';
  ctx.font = `600 16px ${FONT_SANS}`;
  ctx.fillText(
    isEn
      ? `Ready to Issue: ${payload.status.stockReady.toLocaleString()} EA   ·   Grinding: ${payload.status.stockInProcess.toLocaleString()} EA   ·   Awaiting Repair: ${payload.status.stockAwaiting.toLocaleString()} EA   ·   Below Safety Stock: ${payload.status.stockLowCount} Parts`
      : `สต็อกพร้อมเบิก: ${payload.status.stockReady.toLocaleString()} EA   ·   กำลังเจียรบนเครื่อง: ${payload.status.stockInProcess.toLocaleString()} EA   ·   รอส่งซ่อม: ${payload.status.stockAwaiting.toLocaleString()} EA   ·   ต่ำกว่าเกณฑ์สำรอง: ${payload.status.stockLowCount} พาร์ท`,
    M + 20,
    y + 108
  );

  y += 140;

  // ------------------------------------------------------------------
  // 4. CUMULATIVE SAVINGS TREND LINE CHART (LEFT) & LINE E1-E5 TABLE (RIGHT)
  // ------------------------------------------------------------------
  const chartBoxW = Math.round(CW * 0.62);
  const lineBoxW = CW - chartBoxW - 20;
  const secH = 420;

  // Left: Cumulative Savings Line Chart Box
  drawRoundedRect(ctx, M, y, chartBoxW, secH, 12, '#ffffff', '#cbd5e1', 1.5);
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 21px ${FONT_SANS}`;
  ctx.fillText(
    isEn ? 'Cumulative Cost Savings Trend' : 'แนวโน้มยอดประหยัดสะสม (Cumulative Savings Trend)',
    M + 22,
    y + 34
  );

  const lastCum = payload.trend.length > 0 ? payload.trend[payload.trend.length - 1].cumulativeSaving : 0;
  ctx.fillStyle = '#047857';
  ctx.font = `700 18px ${FONT_MONO}`;
  ctx.fillText(
    isEn
      ? `Period-End Cumulative: ฿${Math.round(lastCum).toLocaleString()}`
      : `ยอดสะสมปลายงวด: ฿${Math.round(lastCum).toLocaleString()}`,
    M + 22,
    y + 60
  );

  // Plot Area
  const px = M + 84;
  const py = y + 84;
  const pw = chartBoxW - 112;
  const ph = secH - 142;

  const maxCum = Math.max(1000, ...payload.trend.map(t => t.cumulativeSaving));
  // Grid lines (4 steps)
  for (let g = 0; g <= 4; g++) {
    const gy = py + ph - (g / 4) * ph;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px + pw, gy);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    const val = Math.round((maxCum * g) / 4);
    ctx.fillStyle = '#64748b';
    ctx.font = `500 14px ${FONT_MONO}`;
    const labelStr = val >= 1000 ? `${Math.round(val / 1000)}k` : String(val);
    ctx.fillText(labelStr, M + 20, gy + 5);
  }

  if (payload.trend.length > 0) {
    const stepX = payload.trend.length > 1 ? pw / (payload.trend.length - 1) : pw / 2;

    // Area fill under cumulative line
    ctx.beginPath();
    payload.trend.forEach((pt, idx) => {
      const cx = payload.trend.length === 1 ? px + pw / 2 : px + idx * stepX;
      const cy = py + ph - (pt.cumulativeSaving / maxCum) * ph;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    const lastX = payload.trend.length === 1 ? px + pw / 2 : px + (payload.trend.length - 1) * stepX;
    ctx.lineTo(lastX, py + ph);
    ctx.lineTo(payload.trend.length === 1 ? px + pw / 2 : px, py + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.fill();

    // Cumulative Line
    ctx.beginPath();
    payload.trend.forEach((pt, idx) => {
      const cx = payload.trend.length === 1 ? px + pw / 2 : px + idx * stepX;
      const cy = py + ph - (pt.cumulativeSaving / maxCum) * ph;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Points & X-axis labels (thin labels if > 15 points)
    const labelEvery = payload.trend.length > 16 ? 3 : payload.trend.length > 10 ? 2 : 1;
    payload.trend.forEach((pt, idx) => {
      const cx = payload.trend.length === 1 ? px + pw / 2 : px + idx * stepX;
      const cy = py + ph - (pt.cumulativeSaving / maxCum) * ph;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#059669';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (idx % labelEvery === 0 || idx === payload.trend.length - 1) {
        ctx.fillStyle = '#475569';
        ctx.font = `500 13px ${FONT_MONO}`;
        ctx.fillText(pt.label, cx - 12, py + ph + 24);
      }
    });
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 18px ${FONT_SANS}`;
    ctx.fillText(
      isEn ? 'No repair data recorded for selected period' : 'ยังไม่มีข้อมูลในช่วงเวลาที่เลือก',
      px + pw / 2 - 140,
      py + ph / 2
    );
  }

  // Right: Line E1-E5 Breakdown Box
  const lx = M + chartBoxW + 20;
  drawRoundedRect(ctx, lx, y, lineBoxW, secH, 12, '#ffffff', '#cbd5e1', 1.5);
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 21px ${FONT_SANS}`;
  ctx.fillText(isEn ? 'Cost Savings by Production Line' : 'สรุปยอด Saving แยกตามไลน์ผลิต', lx + 20, y + 34);

  // Table header
  const thY = y + 66;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(lx + 16, thY, lineBoxW - 32, 34);
  ctx.fillStyle = '#334155';
  ctx.font = `700 15px ${FONT_MONO}`;
  ctx.fillText('Line', lx + 26, thY + 23);
  ctx.fillText(isEn ? 'Jobs' : 'งาน', lx + 130, thY + 23);
  ctx.fillText(isEn ? 'Net Saving (฿)' : 'ยอด Saving (฿)', lx + 210, thY + 23);
  ctx.fillText('%', lx + lineBoxW - 74, thY + 23);

  payload.lines.forEach((ln, idx) => {
    const ry = thY + 42 + idx * 42;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(lx + 16, ry - 4, lineBoxW - 32, 38);
    }
    ctx.fillStyle = '#0369a1';
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText(`LINE ${ln.lineId}`, lx + 26, ry + 22);

    ctx.fillStyle = '#334155';
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillText(String(ln.jobs), lx + 130, ry + 22);

    ctx.fillStyle = '#047857';
    ctx.font = `700 16px ${FONT_MONO}`;
    ctx.fillText(`฿${Math.round(ln.saving).toLocaleString()}`, lx + 210, ry + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillText(ln.savingPct > 0 ? `${ln.savingPct.toFixed(1)}%` : '-', lx + lineBoxW - 80, ry + 22);
  });

  y += secH + 24;

  // ------------------------------------------------------------------
  // 5. TOP 10 RANKINGS (3 COLUMNS — SHOWS UP TO 10 ROWS CLEANLY)
  // ------------------------------------------------------------------
  const topColGap = 18;
  const topColW = (CW - topColGap * 2) / 3;
  const topBoxH = H - y - 92;

  const renderTopColumn = (
    colIndex: number,
    title: string,
    accent: string,
    rows: Array<{ col1: string; col2: string; col3: string }>,
    emptyText: string
  ) => {
    const tx = M + colIndex * (topColW + topColGap);
    drawRoundedRect(ctx, tx, y, topColW, topBoxH, 12, '#ffffff', '#cbd5e1', 1.5);

    ctx.fillStyle = accent;
    ctx.font = `700 19px ${FONT_SANS}`;
    ctx.fillText(truncateText(ctx, title, topColW - 32), tx + 18, y + 34);

    ctx.beginPath();
    ctx.moveTo(tx + 16, y + 48);
    ctx.lineTo(tx + topColW - 16, y + 48);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (rows.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 16px ${FONT_SANS}`;
      ctx.fillText(emptyText, tx + 24, y + 96);
      return;
    }

    const maxRows = Math.min(10, rows.length);
    const rowH = Math.min(82, Math.floor((topBoxH - 64) / 10));

    for (let i = 0; i < maxRows; i++) {
      const r = rows[i];
      const ry = y + 60 + i * rowH;
      if (i % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(tx + 12, ry, topColW - 24, rowH - 4);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = `700 16px ${FONT_MONO}`;
      ctx.fillText(`#${i + 1}`, tx + 18, ry + 24);

      ctx.fillStyle = '#0f172a';
      ctx.font = `700 16px ${FONT_SANS}`;
      ctx.fillText(truncateText(ctx, r.col1, topColW - 70), tx + 54, ry + 24);

      ctx.fillStyle = accent;
      ctx.font = `600 15px ${FONT_MONO}`;
      ctx.fillText(r.col2, tx + 54, ry + 48);

      ctx.fillStyle = '#475569';
      ctx.font = `500 15px ${FONT_MONO}`;
      ctx.fillText(r.col3, tx + topColW - ctx.measureText(r.col3).width - 20, ry + 48);
    }
  };

  renderTopColumn(
    0,
    isEn ? 'Top 10 Most Repaired Parts' : 'Top 10 ชิ้นงานที่ซ่อมบ่อยที่สุด',
    '#0369a1',
    payload.topRepaired.map(p => ({
      col1: p.partName,
      col2: isEn ? `${p.jobs} jobs (${p.pieces} pcs)` : `${p.jobs} ครั้ง (${p.pieces} ชิ้น)`,
      col3: `฿${Math.round(p.totalSaving).toLocaleString()}`
    })),
    isEn ? 'No regrind repairs in this period' : 'ไม่มีประวัติงานซ่อมในช่วงเวลานี้'
  );

  renderTopColumn(
    1,
    isEn ? 'Top 10 Most Scrapped Parts' : 'Top 10 ชิ้นงานที่ทิ้งบ่อยที่สุด (Scrap)',
    '#be123c',
    payload.topScrapped.map(p => ({
      col1: p.partName,
      col2: isEn ? `${p.scrapJobs} jobs (${p.scrapPieces} pcs)` : `${p.scrapJobs} ครั้ง (${p.scrapPieces} ชิ้น)`,
      col3: `฿${Math.round(p.lostValueThb).toLocaleString()}`
    })),
    isEn ? 'No scrapped tooling in this period' : 'ไม่มีรายการคัดทิ้งในช่วงเวลานี้'
  );

  renderTopColumn(
    2,
    isEn ? 'Top 10 Common Defect Reasons' : 'Top 10 สาเหตุการซ่อมที่พบบ่อย',
    '#b45309',
    payload.topReasons.map(r => ({
      col1: r.label,
      col2: isEn ? `${r.count} jobs (${r.pct.toFixed(1)}%)` : `${r.count} ครั้ง (${r.pct.toFixed(1)}%)`,
      col3: `฿${Math.round(r.repairCost).toLocaleString()}`
    })),
    isEn ? 'No defect data in this period' : 'ไม่มีข้อมูลสาเหตุในช่วงเวลานี้'
  );

  // ------------------------------------------------------------------
  // 6. FOOTER
  // ------------------------------------------------------------------
  ctx.fillStyle = '#64748b';
  ctx.font = `500 15px ${FONT_SANS}`;
  ctx.fillText(
    isEn
      ? 'FinDie Regrind Pro — Executive Management Summary (Calculated from Live Regrinding Logs & Queue Data)'
      : 'FinDie Regrind Pro — Executive Management Summary (คำนวณจากประวัติงานซ่อมและคิวงานจริงในระบบ)',
    M,
    H - 36
  );

  const pageLabel = 'Page 1 / 1';
  ctx.fillText(pageLabel, W - M - ctx.measureText(pageLabel).width, H - 36);

  const imgData = canvas.toDataURL('image/png', 1.0);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  const filename = `FinDie_Management_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
