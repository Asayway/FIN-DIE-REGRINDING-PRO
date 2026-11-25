import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  Copy, 
  Check, 
  Hash, 
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { toPng, toBlob } from 'html-to-image';
import { UnifiedPartMasterRow } from '../../views/PartMasterView';
import { useLanguage } from '../../i18n/LanguageContext';

interface PartQrLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  partRow: UnifiedPartMasterRow | null;
}

// 100% Real Scannable Standard ISO QR Code
const RealQrCode: React.FC<{ payload: string; size?: number }> = ({ payload, size = 135 }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: size * 3, // High-DPI resolution for crisp scanning
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [payload, size]);

  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono"
      >
        {isEn ? 'Generating QR...' : 'กำลังสร้าง QR...'}
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      alt="Scannable Tooling QR Code" 
      style={{ width: size, height: size }} 
      className="bg-white p-1 border border-slate-200 shadow-xs"
    />
  );
};

// 100% Real Scannable Code-128 1D Barcode
const RealBarcode: React.FC<{ code: string; height?: number }> = ({ 
  code, 
  height = 42 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 2.0,
          height: height,
          displayValue: true,
          font: 'monospace',
          fontSize: 13,
          fontOptions: 'bold',
          text: `*${code}*`,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [code, height]);

  return (
    <svg 
      ref={svgRef} 
      className="w-full h-auto max-h-[72px] mx-auto block" 
      preserveAspectRatio="xMidYMid meet"
    />
  );
};

export const PartQrLabelModal: React.FC<PartQrLabelModalProps> = ({
  isOpen,
  onClose,
  partRow
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedSerialNo, setSelectedSerialNo] = useState<string>('SN-01');

  if (!isOpen || !partRow) return null;

  const isDisposable = partRow.maintenanceType === 'DISPOSE' || 
    partRow.regrindStandard?.perGrindMm?.toLowerCase().includes('dispose');

  const partCode = partRow.partCode || partRow.drawingNo;
  const drawingCode = partRow.drawingNo || partCode;
  const serialCode = `${partCode}-${selectedSerialNo}`;

  const applicableLines: string[] = (partRow as any).applicableLines || [];
  if (applicableLines.length === 0) {
    if ((partRow.installQty?.e1 || 0) > 0) applicableLines.push('E1');
    if ((partRow.installQty?.e2 || 0) > 0) applicableLines.push('E2');
    if ((partRow.installQty?.e3_1 || 0) > 0) applicableLines.push('E3-1');
    if ((partRow.installQty?.e3_2 || 0) > 0) applicableLines.push('E3-2');
    if ((partRow.installQty?.e3_3 || 0) > 0) applicableLines.push('E3-3');
    if ((partRow.installQty?.e4 || 0) > 0) applicableLines.push('E4');
    if ((partRow.installQty?.e5 || 0) > 0) applicableLines.push('E5');
  }

  // Plain text payload containing ONLY Part Name and Applicable Lines (e.g. PIERCE PUNCH (Ø5) E2 E4 E5)
  const linesString = applicableLines.length > 0 ? applicableLines.join(' ') : 'ALL';
  const qrPayload = `${partRow.partName} ${linesString}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(serialCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPng = async () => {
    const labelElem = document.getElementById('printable-part-label');
    if (!labelElem) return;

    try {
      setIsDownloading(true);
      const dataUrl = await toPng(labelElem, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: '#ffffff' 
      });

      const link = document.createElement('a');
      link.download = `Tooling_Label_${drawingCode}_${selectedSerialNo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download PNG label image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    const labelElem = document.getElementById('printable-part-label');
    if (!labelElem) return;

    try {
      const blob = await toBlob(labelElem, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: '#ffffff' 
      });
      if (blob) {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        } else {
          handleDownloadPng();
        }
      }
    } catch (err) {
      console.error('Failed to copy label image to clipboard:', err);
      handleDownloadPng();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono animate-fadeIn">
      {/* Inject Print-Specific Media Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-part-label, #printable-part-label * {
            visibility: visible !important;
          }
          #printable-part-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: 2px solid black !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      <div className="bg-[#181818] border border-[#555555] shadow-2xl rounded-none w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-[#242424] border-b border-[#444444] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#00FF00]" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>QR CODE & BARCODE TOOLING LABEL</span>
                <span className="text-[10px] bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/40 px-1.5 py-0.2 font-bold">
                  SCANNABLE HIGH-RES
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? '100% scannable tooling sticker label with PNG download & clipboard copy support.'
                  : 'ฉลากบาร์โค้ดติดชิ้นส่วนแม่พิมพ์ สแกนใช้งานจริงได้ 100% และดาวน์โหลด/คัดลอกไฟล์รูปภาพได้'}
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
          {/* Action & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e1e1e] p-3 border border-[#333333]">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span>Serial / Lot:</span>
              </label>
              <select
                value={selectedSerialNo}
                onChange={e => setSelectedSerialNo(e.target.value)}
                className="bg-[#111111] text-[#00FF00] border border-[#555555] px-2 py-1 text-xs font-bold focus:outline-none"
              >
                <option value="SN-01">SN-01 (Active Tool)</option>
                <option value="SN-02">SN-02 (Backup 1)</option>
                <option value="SN-03">SN-03 (Backup 2)</option>
                <option value="SN-04">SN-04 (In Regrind)</option>
                <option value="LOT-202501">LOT-202501 (Batch Stock)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isDownloading}
                className="px-3 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs whitespace-nowrap"
                title={isEn ? 'Download high-res PNG image for sticker printing' : 'ดาวน์โหลดไฟล์ภาพ PNG ความละเอียดสูง สำหรับพิมพ์สติ๊กเกอร์ติดกล่อง'}
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>{isDownloading ? (isEn ? 'Downloading...' : 'กำลังดาวน์โหลด...') : (isEn ? 'Download PNG' : 'ดาวน์โหลดภาพ PNG')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="px-3 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs whitespace-nowrap"
                title={isEn ? 'Copy sticker image to clipboard (Ctrl+V into label printer app)' : 'คัดลอกรูปภาพป้ายสติ๊กเกอร์เข้า Clipboard เพื่อกด Ctrl+V วางในโปรแกรมพิมพ์สติ๊กเกอร์'}
              >
                {copiedImage ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <ImageIcon className="w-3.5 h-3.5 text-purple-400" />}
                <span>{copiedImage ? (isEn ? 'Image Copied!' : 'คัดลอกภาพแล้ว!') : (isEn ? 'Copy Image' : 'คัดลอกรูปภาพ')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-slate-200 border border-[#555555] text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00FF00]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedCode ? (isEn ? 'Code Copied' : 'คัดลอกรหัสแล้ว') : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1 bg-[#00FF00] hover:bg-[#00dd00] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isEn ? 'Print Label' : 'พิมพ์สติ๊กเกอร์ (Print Label)'}</span>
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
                    <span>DRAWING: {drawingCode}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-slate-600">
                    TOOLING ID
                  </div>
                  <div className="text-sm font-black text-black">
                    {serialCode}
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                    RACK: TOOLROOM-STOCK
                  </div>
                </div>
              </div>

              {/* Label Middle: 100% Real Scannable QR + Code-128 Barcode + Specs Grid */}
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* 100% Real ISO QR Code Container */}
                <div className="col-span-4 flex flex-col items-center justify-center p-1 border border-slate-300 bg-slate-50">
                  <RealQrCode payload={qrPayload} size={135} />
                  <div className="text-[9px] font-bold text-slate-600 mt-1 tracking-tight flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                    <span>SCAN TO VERIFY</span>
                  </div>
                </div>

                {/* Specs and Code-128 Barcode Container */}
                <div className="col-span-8 flex flex-col justify-between h-full space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 p-2 bg-slate-50">
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">{isEn ? 'New Spec (L₀):' : 'New Spec (มาตรฐานใหม่):'}</div>
                      <div className="text-sm font-black text-black">
                        {partRow.newSpecMm ? `${partRow.newSpecMm.toFixed(2)} mm` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">{isEn ? 'Scrap Limit (L_min):' : 'Scrap Limit (ขีดจำกัดทิ้ง):'}</div>
                      <div className="text-sm font-black text-red-700">
                        {partRow.scrapLimitMm ? `${partRow.scrapLimitMm.toFixed(2)} mm` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">{isEn ? '1-Time Grind (Δl):' : '1-Time Grind (เจียรครั้งละ):'}</div>
                      <div className="text-xs font-bold text-black">
                        {partRow.regrindStandard?.perGrindMm || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">{isEn ? 'Max Regrind Cycles:' : 'Max Regrind (รอบสูงสุด):'}</div>
                      <div className="text-xs font-bold text-black">
                        {partRow.regrindStandard?.regrindCycles ?? '-'} {isEn ? 'cycles' : 'รอบ'}
                      </div>
                    </div>
                  </div>

                  {/* 100% Real Code-128 Barcode - Barcode displays Drawing Code only */}
                  <div className="border border-slate-300 p-1 bg-white text-center">
                    <RealBarcode code={drawingCode} height={42} />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#1e1e1e] border border-[#333333]">
              <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                LINE LIFETIME STANDARDS
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Fin Press E1 (Ø7):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle?.e1_pcm !== undefined ? `${partRow.shotLifeCycle.e1_pcm}M Shots` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fin Press E2 (Ø5):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle?.e2_gold !== undefined ? `${partRow.shotLifeCycle.e2_gold}M Shots` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fin Press E3 (1-3):</span>
                  <span className="text-[#00FF00] font-bold">
                    {partRow.shotLifeCycle?.e3_1_pcm !== undefined ? `${partRow.shotLifeCycle.e3_1_pcm}M` : '-'} / {partRow.shotLifeCycle?.e3_2_gold !== undefined ? `${partRow.shotLifeCycle.e3_2_gold}M` : '-'}
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
                  <span className="text-[#FFCC00] font-bold">{partRow.installQty?.totalQty || 0} EA</span>
                </div>
                <div className="flex justify-between">
                  <span>Recommended Safety Stock:</span>
                  <span className="text-cyan-400 font-bold">
                    {Math.max(2, Math.ceil((partRow.installQty?.totalQty || 0) * 0.2))} EA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Strategy:</span>
                  <span className={isDisposable ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isDisposable ? (isEn ? 'One-time use (Dispose)' : 'One-time use (ทิ้ง)') : 'Regrind & Sharpen'}
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
                  ? (isEn
                      ? (partRow.regrindStandard.note.replace(/\s*\([^)]*[\u0E00-\u0E7F][^)]*\)/g, '').trim() || 'Grinding standard per factory engineering drawing.')
                      : partRow.regrindStandard.note)
                  : (isEn ? 'Grinding standard per factory engineering drawing.' : 'มาตรฐานการเจียรตามแบบ Drawing มาตรฐานประจำโรงงาน')}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#242424] border-t border-[#444444] px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            <span>Label Format: Industrial 100mm x 60mm Thermal Sticker / Barcode Code-128 Standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#333333] hover:bg-[#444444] text-white font-bold cursor-pointer"
          >
            {isEn ? 'Close' : 'ปิดหน้าต่าง'}
          </button>
        </div>

      </div>
    </div>
  );
};
