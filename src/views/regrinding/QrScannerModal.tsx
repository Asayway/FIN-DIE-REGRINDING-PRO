import React, { useState } from 'react';
import { RegrindWorkTicket } from '../../types/regrind';
import { QrCode, Search, Camera, CheckCircle2, X } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RegrindWorkTicket[];
  onSelectTicket: (ticket: RegrindWorkTicket) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  tickets,
  onSelectTicket
}) => {
  const [inputCode, setInputCode] = useState<string>('');
  const [isScanningSim, setIsScanningSim] = useState<boolean>(false);
  const [matchedTicket, setMatchedTicket] = useState<RegrindWorkTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSearch = (codeToTest: string) => {
    const trimmed = codeToTest.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg('กรุณากรอกหรือสแกนรหัส QR / Barcode');
      setMatchedTicket(null);
      return;
    }

    const found = tickets.find(
      t =>
        t.qrCode.toLowerCase().includes(trimmed) ||
        t.jobCode.toLowerCase().includes(trimmed) ||
        t.id.toLowerCase().includes(trimmed) ||
        t.partName.toLowerCase().includes(trimmed)
    );

    if (found) {
      setMatchedTicket(found);
      setErrorMsg('');
    } else {
      setMatchedTicket(null);
      setErrorMsg(`ไม่พบข้อมูลทูลลิ่งสำหรับรหัส: "${codeToTest}"`);
    }
  };

  const handleSimulateScan = (sampleQr: string) => {
    setIsScanningSim(true);
    setInputCode(sampleQr);
    setTimeout(() => {
      setIsScanningSim(false);
      handleSearch(sampleQr);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>สแกน QR / บาร์โค้ดทูลลิ่ง (QR Scanner)</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Visual Scanner Viewport */}
        <div className="relative bg-slate-950 rounded-xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center overflow-hidden h-48">
          <div className="w-32 h-32 border-2 border-dashed border-cyan-500/60 rounded-xl flex items-center justify-center relative">
            <Camera className="w-10 h-10 text-cyan-500/40 animate-pulse" />
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce shadow-[0_0_8px_#38bdf8]" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            {isScanningSim ? 'กำลังประมวลผลการสแกน...' : 'จ่อกล้องไปที่ QR Code บนกระบะหรือสติ๊กเกอร์ทูลลิ่ง'}
          </p>
        </div>

        {/* Input Bar */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            หรือพิมพ์รหัส QR / Job Code ด้วยมือ:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(inputCode)}
              placeholder="เช่น QR-E1-BURR-07-018 หรือ JOB-RGD-2026-041"
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="button"
              onClick={() => handleSearch(inputCode)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>ค้นหา</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Buttons for Shop Floor testing */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">
            จำลองการสแกนทูลลิ่งในคิว (Quick Test Barcodes):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tickets.slice(0, 3).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSimulateScan(t.qrCode)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-cyan-100 dark:bg-slate-800 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 transition-all"
              >
                {t.qrCode} ({t.partName})
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Found Ticket Result Card */}
        {matchedTicket && (
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                พบทูลลิ่ง: {matchedTicket.partName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-100 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-200">
                {matchedTicket.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
              <div>ไลน์: <span className="font-semibold">{matchedTicket.lineId}</span> | ตำแหน่ง: <span className="font-semibold">{matchedTicket.positionId || 'Common'}</span></div>
              <div>ความยาวคงเหลือ: <span className="font-mono font-bold">{matchedTicket.previousLengthMm?.toFixed(2)} mm</span> (รอบที่ {matchedTicket.regrindCountBefore}/{matchedTicket.maxRegrindAllowed})</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectTicket(matchedTicket);
                onClose();
              }}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              เปิดหน้าต่างจัดการใบงานนี้ทันที
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
