import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  Barcode as BarcodeIcon, 
  Copy, 
  Check, 
  Tag, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Hash, 
  MapPin, 
  Calendar,
  RotateCcw,
  Trash2,
  Box
} from 'lucide-react';
import { UnifiedPartMasterRow } from '../../views/PartMasterView';

interface PartQrLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  partRow: UnifiedPartMasterRow | null;
}

// Generate realistic SVG Barcode (Code-128 pattern simulation)
const SvgBarcode: React.FC<{ code: string; width?: number; height?: number }> = ({ 
  code, 
  width = 240, 
  height = 55 
}) => {
  // Deterministic bar widths based on char codes
  const bars: { x: number; w: number }[] = [];
  let currentX = 10;
  
  // Guard bars start
  bars.push({ x: currentX, w: 2 }); currentX += 4;
  bars.push({ x: currentX, w: 2 }); currentX += 4;

  for (let i = 0; i < code.length; i++) {
    const val = code.charCodeAt(i);
    const b1 = (val % 3) + 1;
    const b2 = ((val >> 2) % 3) + 1;
    const b3 = ((val >> 4) % 2) + 1;
    
    bars.push({ x: currentX, w: b1 }); currentX += b1 + 2;
    bars.push({ x: currentX, w: b2 }); currentX += b2 + 2;
    bars.push({ x: currentX, w: b3 }); currentX += b3 + 2;
  }

  // Guard bars end
  bars.push({ x: currentX, w: 3 }); currentX += 5;
  bars.push({ x: currentX, w: 2 }); currentX += 4;

  const totalWidth = Math.max(width, currentX + 10);

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height + 20}`} className="w-full h-auto max-h-[75px]" preserveAspectRatio="xMidYMid meet">
      <rect width={totalWidth} height={height + 20} fill="#ffffff" />
      {bars.map((b, idx) => (
        <rect key={idx} x={b.x} y={5} width={b.w} height={height} fill="#000000" />
      ))}
      <text 
        x={totalWidth / 2} 
        y={height + 16} 
        textAnchor="middle" 
        fontSize="11" 
        fontFamily="monospace" 
        fontWeight="bold" 
        fill="#000000"
      >
        *{code}*
      </text>
    </svg>
  );
};

// Generate realistic SVG 2D QR Matrix
const SvgQrCode: React.FC<{ payload: string; size?: number }> = ({ payload, size = 160 }) => {
  const matrixSize = 25;
  const cellSize = size / matrixSize;

  // Simple pseudo-random but deterministic matrix generator from string hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }

  const cells: { r: number; c: number }[] = [];

  // Corner Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  const isCorner = (r: number, c: number) => {
    // Top-left
    if (r < 7 && c < 7) return (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
    // Top-right
    if (r < 7 && c >= matrixSize - 7) {
      const cc = c - (matrixSize - 7);
      return (r === 0 || r === 6 || cc === 0 || cc === 6 || (r >= 2 && r <= 4 && cc >= 2 && cc <= 4));
    }
    // Bottom-left
    if (r >= matrixSize - 7 && c < 7) {
      const rr = r - (matrixSize - 7);
      return (rr === 0 || rr === 6 || c === 0 || c === 6 || (rr >= 2 && rr <= 4 && c >= 2 && c <= 4));
    }
    return false;
  };

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isCorner(r, c)) {
        cells.push({ r, c });
      } else {
        // Alignment pattern at bottom right
        if (r >= 16 && r <= 20 && c >= 16 && c <= 20) {
          const ar = r - 16;
          const ac = c - 16;
          if (ar === 0 || ar === 4 || ac === 0 || ac === 4 || (ar === 2 && ac === 2)) {
            cells.push({ r, c });
            continue;
          }
        }
        // Timing tracks
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) cells.push({ r, c });
          continue;
        }
        // Data pseudo cells
        const seed = Math.sin(hash * 0.01 + r * 13 + c * 37) * 10000;
        if ((seed - Math.floor(seed)) > 0.48) {
          cells.push({ r, c });
        }
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-2 rounded shadow-xs">
      <rect width={size} height={size} fill="#ffffff" />
      {cells.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.c * cellSize}
          y={cell.r * cellSize}
          width={cellSize + 0.2}
          height={cellSize + 0.2}
          fill="#000000"
        />
      ))}
    </svg>
  );
};

export const PartQrLabelModal: React.FC<PartQrLabelModalProps> = ({
  isOpen,
  onClose,
  partRow
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedSerialNo, setSelectedSerialNo] = useState<string>('SN-01');
  const [labelSize, setLabelSize] = useState<'STANDARD' | 'COMPACT'>('STANDARD');

  if (!isOpen || !partRow) return null;

  const isDisposable = partRow.maintenanceType === 'DISPOSE' || 
    partRow.regrindStandard?.perGrindMm?.toLowerCase().includes('dispose');

  const partCode = partRow.partCode || partRow.drawingNo;
  const serialCode = `${partCode}-${selectedSerialNo}`;
  const qrPayload = JSON.stringify({
    code: partCode,
    name: partRow.partName,
    stage: partRow.stage,
    lines: (partRow as any).applicableLines || ['E1'],
    type: isDisposable ? 'DISPOSE' : 'REGRIND',
    spec: `${partRow.newSpecMm || 28.0}mm`,
    scrap: `${partRow.scrapLimitMm || 27.0}mm`,
    serial: serialCode
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(serialCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const applicableLines: string[] = (partRow as any).applicableLines || [];
  if (applicableLines.length === 0) {
    if ((partRow.installQty.e1 || 0) > 0) applicableLines.push('E1');
    if ((partRow.installQty.e2 || 0) > 0) applicableLines.push('E2');
    if ((partRow.installQty.e3_1 || 0) > 0) applicableLines.push('E3-1');
    if ((partRow.installQty.e3_2 || 0) > 0) applicableLines.push('E3-2');
    if ((partRow.installQty.e3_3 || 0) > 0) applicableLines.push('E3-3');
    if ((partRow.installQty.e4 || 0) > 0) applicableLines.push('E4');
    if ((partRow.installQty.e5 || 0) > 0) applicableLines.push('E5');
  }

  const getLineBadgeColor = (line: string) => {
    if (line === 'E1') return 'bg-sky-950 text-sky-300 border-sky-600';
    if (line === 'E2') return 'bg-amber-950 text-amber-300 border-amber-600';
    if (line.startsWith('E3')) return 'bg-purple-950 text-purple-300 border-purple-600';
    if (line === 'E4') return 'bg-emerald-950 text-emerald-300 border-emerald-600';
    return 'bg-teal-950 text-teal-300 border-teal-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono animate-fadeIn">
      <div className="bg-[#181818] border border-[#555555] shadow-2xl rounded-none w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-[#242424] border-b border-[#444444] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#00FF00]" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>QR CODE & BARCODE TOOLING LABEL</span>
                <span className="text-[10px] bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/40 px-1.5 py-0.2">
                  IDEA 5 & 7
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                ฉลากบาร์โค้ดติดชิ้นส่วนแม่พิมพ์และระบบติดตาม Serial Number
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#333333] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e1e1e] p-3 border border-[#333333]">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span>Serial / Lot:</span>
              </label>
              <select
                value={selectedSerialNo}
                onChange={e => setSelectedSerialNo(e.target.value)}
                className="bg-[#111111] text-[#00FF00] border border-[#555555] px-2 py-1 text-xs font-bold"
              >
                <option value="SN-01">SN-01 (Active Tool)</option>
                <option value="SN-02">SN-02 (Backup 1)</option>
                <option value="SN-03">SN-03 (Backup 2)</option>
                <option value="SN-04">SN-04 (In Regrind)</option>
                <option value="LOT-202501">LOT-202501 (Batch Stock)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-slate-200 border border-[#555555] text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00FF00]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1 bg-[#00FF00] hover:bg-[#00dd00] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์สติ๊กเกอร์ (Print Label)</span>
              </button>
            </div>
          </div>

          {/* Printable Industrial Label Canvas */}
          <div className="p-4 bg-[#0a0a0a] border border-[#444444] flex justify-center">
            <div 
              id="printable-part-label"
              className="w-full max-w-[620px] bg-white text-black p-4 border-2 border-black shadow-lg font-mono relative select-all"
            >
              {/* Label Top Bar */}
              <div className="border-b-2 border-black pb-2 mb-3 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                    AIR CONDITIONER FIN PRESS DIE TOOLING
                  </div>
                  <div className="text-lg font-black leading-tight text-black mt-0.5">
                    {partRow.partName}
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-2 mt-1">
                    <span>STAGE: {partRow.stage}</span>
                    <span>•</span>
                    <span>DRAWING: {partRow.drawingNo}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-xs font-black border ${
                    isDisposable ? 'border-red-600 bg-red-100 text-red-700' : 'border-emerald-600 bg-emerald-100 text-emerald-800'
                  }`}>
                    {isDisposable ? 'DISPOSABLE (1 USE)' : 'REGRINDABLE (เจียรได้)'}
                  </span>
                  <div className="text-[11px] font-bold text-slate-800 mt-1">
                    ID: {serialCode}
                  </div>
                </div>
              </div>

              {/* Label Middle: QR + Barcode + Specs Grid */}
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* QR Code Container */}
                <div className="col-span-4 flex flex-col items-center justify-center p-1 border border-slate-300 bg-slate-50">
                  <SvgQrCode payload={qrPayload} size={135} />
                  <div className="text-[9px] font-bold text-slate-600 mt-1 tracking-tight">
                    SCAN TO VERIFY
                  </div>
                </div>

                {/* Specs and Barcode Container */}
                <div className="col-span-8 flex flex-col justify-between h-full space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 p-2 bg-slate-50">
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">New Spec (มาตรฐานใหม่):</div>
                      <div className="text-sm font-black text-black">
                        {partRow.newSpecMm ? `${partRow.newSpecMm.toFixed(2)} mm` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">Scrap Limit (ขีดจำกัดทิ้ง):</div>
                      <div className="text-sm font-black text-red-700">
                        {partRow.scrapLimitMm ? `${partRow.scrapLimitMm.toFixed(2)} mm` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">1-Time Grind (เจียรครั้งละ):</div>
                      <div className="text-xs font-bold text-black">
                        {partRow.regrindStandard?.perGrindMm || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">Max Regrind (รอบสูงสุด):</div>
                      <div className="text-xs font-bold text-black">
                        {partRow.regrindStandard?.regrindCycles ?? '-'} รอบ
                      </div>
                    </div>
                  </div>

                  {/* 1D Barcode */}
                  <div className="border border-slate-300 p-1.5 bg-white text-center">
                    <SvgBarcode code={serialCode} width={340} height={42} />
                  </div>
                </div>
              </div>

              {/* Label Bottom: Lines Installed & Rack Info */}
              <div className="border-t-2 border-black pt-2 mt-3 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-700">APPLICABLE LINES:</span>
                  {applicableLines.length > 0 ? (
                    applicableLines.map(line => (
                      <span key={line} className="px-1.5 py-0.2 bg-black text-white text-[10px] font-black">
                        {line}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">ALL</span>
                  )}
                </div>

                <div className="text-right text-[10px] text-slate-800">
                  <span>STORAGE: RACK-TOOLROOM | LOT: 2025-CANONICAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Technical Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#1e1e1e] border border-[#333333]">
              <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                LINE LIFETIME STANDARDS
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Fin Press E1 (Ø7):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle.e1_pcm !== undefined ? `${partRow.shotLifeCycle.e1_pcm}M Shots` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fin Press E2 (Ø5):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle.e2_gold !== undefined ? `${partRow.shotLifeCycle.e2_gold}M Shots` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fin Press E3 (1-3):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle.e3_1_pcm !== undefined ? `${partRow.shotLifeCycle.e3_1_pcm}M` : '-'} / {partRow.shotLifeCycle.e3_2_gold !== undefined ? `${partRow.shotLifeCycle.e3_2_gold}M` : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#1e1e1e] border border-[#333333]">
              <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                INSTALLATION & SPARE MATRIX
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Total Active In Lines:</span>
                  <span className="text-[#FFCC00] font-bold">{partRow.installQty.totalQty} EA</span>
                </div>
                <div className="flex justify-between">
                  <span>Recommended Safety Stock:</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.max(2, Math.ceil(partRow.installQty.totalQty * 0.2))} EA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Strategy:</span>
                  <span className={isDisposable ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isDisposable ? 'One-time use (ทิ้ง)' : 'Regrind & Sharpen'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#1e1e1e] border border-[#333333]">
              <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                SPECIAL TOOLING NOTE
              </div>
              <div className="text-slate-300 text-[11px] leading-relaxed italic">
                {partRow.regrindStandard?.note && partRow.regrindStandard.note !== '-' 
                  ? partRow.regrindStandard.note 
                  : 'มาตรฐานการเจียรตามแบบ Drawing มาตรฐานประจำโรงงาน'}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#242424] border-t border-[#444444] px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>Label Format: Industrial 100mm x 60mm Thermal Sticker / Barcode Standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#333333] hover:bg-[#444444] text-white font-bold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
