import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Activity,
  History,
  Star,
  Download
} from 'lucide-react';
import { ProductionLineId, ConditionInspectionRecord, LINE_INFO_MAP } from '../types';
import { storageService } from '../services/storageService';
import { formatShots } from '../services/calculationService';
import { LineFilterSelector } from '../components/common/LineFilterSelector';
import { exportInspectionLogsExcel } from '../utils/excelExport';

export const ConditionInspectionView: React.FC = () => {
  const [lineId, setLineId] = useState<ProductionLineId>('E1');
  const [stageName, setStageName] = useState<string>('Louver Punch');
  const [burrHeight, setBurrHeight] = useState<number>(0.024);
  const [wearRating, setWearRating] = useState<number>(2);
  const [lubrication, setLubrication] = useState<'GOOD' | 'INSUFFICIENT' | 'EXCESSIVE'>('GOOD');
  const [aluminumSticking, setAluminumSticking] = useState<boolean>(false);
  const [chippingObserved, setChippingObserved] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<'PASS' | 'CONDITIONAL_PASS' | 'FAIL_REPAIR_REQUIRED'>('PASS');
  const [action, setAction] = useState<string>('Continue normal production');
  const [inspections, setInspections] = useState<ConditionInspectionRecord[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reload = () => {
    setInspections(storageService.getInspections());
  };

  useEffect(() => {
    reload();
    const unsub = storageService.subscribe(reload);
    return () => unsub();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = storageService.getCurrentUser();
    const lineData = storageService.getLineMonitoring(lineId);

    storageService.addInspection({
      lineId,
      dieCode: lineData?.activeConfig?.dieCode || `FD-${lineId}-07`,
      stageName,
      inspectorName: user.name,
      inspectorId: user.employeeId,
      burrHeightMm: burrHeight,
      visualWearRating: wearRating,
      lubricationStatus: lubrication,
      aluminumStickingGalling: aluminumSticking,
      chippingObserved,
      inspectionVerdict: verdict,
      recommendedAction: action,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    setSuccessMsg(`Condition inspection logged for ${stageName} on Line ${lineId}. Verdict: ${verdict}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-400" />
            Fin Die Tooling & Burr Condition Inspection
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            บันทึกการตรวจเช็คสภาพความสึกหรอของคมตัดแม่พิมพ์ ความสูงครีบฟิน (Burr Height) และการหล่อลื่น
          </p>
        </div>

        <LineFilterSelector
          selectedLine={lineId}
          onSelectLine={(l) => setLineId(l as ProductionLineId)}
          label="LINE:"
        />
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600 text-emerald-300 rounded text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-slate-100 border-b border-slate-800 pb-3">
            Die Quality & Wear Checklist (แบบฟอร์มตรวจสอบสภาพ)
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Production Line <span className="text-rose-400">*</span>
                </label>
                <select
                  value={lineId}
                  onChange={e => setLineId(e.target.value as ProductionLineId)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'].map(l => {
                    const displayLine = l.startsWith('E3-') ? 'E3' : l;
                    const tag = LINE_INFO_MAP[l as ProductionLineId]?.shortTag || l;
                    return (
                      <option key={l} value={l}>Line {displayLine} ({tag})</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Stage Punch / Die <span className="text-rose-400">*</span>
                </label>
                <select
                  value={stageName}
                  onChange={e => setStageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {[
                    'Bucking Punch',
                    'Ironing Punch',
                    'Ironing Die',
                    'Louver Punch',
                    'Louver Die',
                    'Reflaire Punch',
                    'Reflaire Die',
                    'Row Slit Blade',
                    'Side Cutting Punch',
                    'Side Cutting Die',
                    'Cut Off Punch',
                    'Cut Off Die'
                  ].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Measured Burr Height (mm) (ความสูงครีบฟิน) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={burrHeight}
                  onChange={e => setBurrHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
                  required
                />
                <div className="text-[11px] text-slate-500 mt-1">Spec: Burr ≤ 0.035 mm (Warning: &gt;0.040 mm)</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Visual Wear Rating (1-5)
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setWearRating(star)}
                      className={`p-1.5 rounded text-xs font-bold font-mono transition-all ${
                        wearRating >= star ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    {wearRating === 1 ? '1 - Like New' : wearRating === 2 ? '2 - Minor Polish' : wearRating === 3 ? '3 - Normal Wear' : wearRating === 4 ? '4 - Heavy Wear' : '5 - Severe'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lubrication Status
                </label>
                <select
                  value={lubrication}
                  onChange={e => setLubrication(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="GOOD">GOOD (สม่ำเสมอ)</option>
                  <option value="INSUFFICIENT">INSUFFICIENT (น้ำมันน้อย/แห้ง)</option>
                  <option value="EXCESSIVE">EXCESSIVE (น้ำมันเยิ้มเกินไป)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Aluminum Galling?
                </label>
                <button
                  type="button"
                  onClick={() => setAluminumSticking(!aluminumSticking)}
                  className={`w-full py-2 px-3 rounded text-xs font-bold border transition-colors ${
                    aluminumSticking ? 'bg-rose-950 text-rose-300 border-rose-600' : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  {aluminumSticking ? 'YES (ตรวจพบเศษติด)' : 'NO (ปกติไม่มีติด)'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Edge Chipping?
                </label>
                <button
                  type="button"
                  onClick={() => setChippingObserved(!chippingObserved)}
                  className={`w-full py-2 px-3 rounded text-xs font-bold border transition-colors ${
                    chippingObserved ? 'bg-red-900 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  {chippingObserved ? 'YES (มีรอยบิ่น)' : 'NO (คมสมบูรณ์)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Inspection Verdict <span className="text-rose-400">*</span>
                </label>
                <select
                  value={verdict}
                  onChange={e => setVerdict(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-bold text-emerald-400 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="PASS">PASS (ผ่านเกณฑ์ - ผลิตต่อได้)</option>
                  <option value="CONDITIONAL_PASS">CONDITIONAL_PASS (ผ่านมีเงื่อนไข - ตรวจซ้ำใน 2 ชม.)</option>
                  <option value="FAIL_REPAIR_REQUIRED">FAIL_REPAIR_REQUIRED (ไม่ผ่าน - ต้องหยุดซ่อม/เปลี่ยน)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Recommended Action
                </label>
                <input
                  type="text"
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="ระบุข้อเสนอแนะ/การแก้ไข..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>บันทึกผลการตรวจเช็ค</span>
            </button>
          </form>
        </div>

        {/* Right Quality Standards */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="font-bold text-slate-100 border-b border-slate-800 pb-3">
            Fin Quality Tolerances
          </h3>
          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="text-cyan-400 font-bold mb-1">Burr Height Thresholds:</div>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>≤ 0.035 mm:</span>
                  <span className="text-emerald-400 font-bold">ACCEPTABLE (PASS)</span>
                </div>
                <div className="flex justify-between">
                  <span>0.036 - 0.045 mm:</span>
                  <span className="text-amber-400 font-bold">WARNING (MONITOR)</span>
                </div>
                <div className="flex justify-between">
                  <span>&gt; 0.045 mm:</span>
                  <span className="text-rose-400 font-bold">REJECT (SWAP TOOL)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="text-cyan-400 font-bold mb-1">Die Inspection Frequency:</div>
              <div className="text-slate-400 text-[11px] space-y-0.5">
                <div>• Start of each shift (08:00 and 20:00)</div>
                <div>• After every coil changeover</div>
                <div>• Upon reaching 85% tooling shot life</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Recent Condition Inspection Logs</span>
          </h3>
          <button
            onClick={() => exportInspectionLogsExcel(inspections, lineId)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-2 text-center w-12 font-mono">NO.</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">LINE</th>
                <th className="py-2.5 px-3">STAGE</th>
                <th className="py-2.5 px-3 text-right">BURR (mm)</th>
                <th className="py-2.5 px-3 text-center">WEAR</th>
                <th className="py-2.5 px-3">LUBRICATION</th>
                <th className="py-2.5 px-3">VERDICT</th>
                <th className="py-2.5 px-3">INSPECTOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {inspections.map((i, idx) => (
                <tr key={i.id} className="hover:bg-slate-800/50">
                  <td className="py-2 px-2 text-center font-mono font-bold text-cyan-400/80">{idx + 1}</td>
                  <td className="py-2 px-3 text-slate-400">{i.timestamp}</td>
                  <td className="py-2 px-3 font-bold text-cyan-300">Line {i.lineId}</td>
                  <td className="py-2 px-3 font-medium text-slate-200">{i.stageName}</td>
                  <td className={`py-2 px-3 text-right font-bold ${(i.burrHeightMm || 0) > 0.035 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(i.burrHeightMm !== undefined && i.burrHeightMm !== null ? Number(i.burrHeightMm) : 0).toFixed(3)} mm
                  </td>
                  <td className="py-2 px-3 text-center text-amber-400">{i.visualWearRating}★</td>
                  <td className="py-2 px-3 text-slate-300">{i.lubricationStatus}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      i.inspectionVerdict === 'PASS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      i.inspectionVerdict === 'CONDITIONAL_PASS' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                    }`}>
                      {i.inspectionVerdict}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">{i.inspectorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
