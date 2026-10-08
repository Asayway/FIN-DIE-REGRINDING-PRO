import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  CheckCircle2, 
  Cpu, 
  Activity, 
  Database, 
  Lock, 
  UserCheck, 
  Network, 
  ExternalLink,
  Server,
  Zap
} from 'lucide-react';
import { SystemSettings, User, PLCLineRegisterMap } from '../types';
import { storageService } from '../services/storageService';
import { SEED_DATA_VERSION, SEED_SOURCE_LABEL, DEFAULT_FACTORY_PLC_METERS } from '../data/seedData';
import { ProductionLineId } from '../types';
import { usePLCConnection } from '../hooks/usePLCConnection';

interface SystemSettingsViewProps {
  onNavigate?: (route: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<SystemSettings>(storageService.getSettings());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Hook for PLC Driver Connection Status Summary
  const {
    config: plcConfig,
    status: plcStatus,
    pingLatency
  } = usePLCConnection();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.updateSettings(settings);
    if (settings.stageDisplayMode) {
      localStorage.setItem('findie_tv_layout_mode', settings.stageDisplayMode);
    }
    setSuccessMsg('บันทึกการตั้งค่าเกณฑ์และรูปแบบระบบเรียบร้อยแล้ว!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleResetSeed = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นจากไฟล์ Excel (31.01.2025)? ข้อมูลการแก้ไขและการป้อนสโตรกล่าสุดจะถูกกู้คืนเป็นค่าเริ่มต้นของโรงงาน')) {
      storageService.resetToSeedData();
      setSettings(storageService.getSettings());
      setSuccessMsg('รีเซ็ตข้อมูลระบบกลับสู่ชุดข้อมูล Excel (31.01.2025) สำเร็จแล้ว!');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [lineMeterInputs, setLineMeterInputs] = useState<Record<ProductionLineId, number>>({ ...DEFAULT_FACTORY_PLC_METERS });

  const handleApplyGoLiveReset = (metersOption: 'PLC_FACTORY' | 'ZERO' | 'CUSTOM') => {
    let targetMeters: Record<ProductionLineId, number> = { ...DEFAULT_FACTORY_PLC_METERS };

    if (metersOption === 'ZERO') {
      targetMeters = {
        'E1': 0, 'E2': 0, 'E3-1': 0, 'E3-2': 0, 'E3-3': 0, 'E4': 0, 'E5': 0
      };
    } else if (metersOption === 'CUSTOM') {
      targetMeters = { ...lineMeterInputs };
    }

    storageService.resetToCleanGoLive(targetMeters);
    setSettings(storageService.getSettings());
    setIsGoLiveModalOpen(false);
    setSuccessMsg('⚡ เซ็ตระบบเป็นค่า 0 (Factory Go-Live Set 0) สำเร็จแล้ว! เลขมิเตอร์ PLC LAN แต่ละไลน์ถูกกำหนดตรงตามหน้างาน พาร์ททุกชิ้นเริ่มต้นที่ 0 ช็อต พร้อมสตรีมข้อมูลสด');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const activeRegistersCount = Object.values(plcConfig?.lineRegisters || {}).filter(
    (r: PLCLineRegisterMap) => r.active
  ).length;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="liquid-glass-card border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
            <span>ตั้งค่าระบบและเกณฑ์แจ้งเตือน (System Settings & Thresholds)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-thai">
            กำหนดค่าเกณฑ์แจ้งเตือนอายุแม่พิมพ์ (Life Thresholds) โหมดการแสดงผลหน้าจอ TV และกู้คืนชุดข้อมูลระบบ
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSeed}
          className="liquid-pill flex items-center gap-2 px-5 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 font-bold rounded-full text-xs transition-all shadow font-mono cursor-pointer active:scale-95 shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RESET TO SEED DATA</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 rounded-2xl text-sm flex items-center gap-2.5 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Settings Form: Life Percentage Thresholds */}
          <div className="liquid-glass-card border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <h3 className="font-bold text-slate-100 border-b border-white/10 pb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              <span>Life Percentage Thresholds (เกณฑ์ขีดจำกัดการแจ้งเตือนช็อตสะสม)</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-5 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-yellow-500/30 space-y-1.5">
                  <label className="block text-yellow-300 font-bold text-xs">
                    WARNING Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.warningThresholdPercent}
                    onChange={e => setSettings({ ...settings, warningThresholdPercent: parseInt(e.target.value, 10) || 70 })}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-yellow-300 font-bold text-lg"
                  />
                  <div className="text-[10px] text-slate-400 font-thai">เตือนเริ่มต้น: ค่ามาตรฐาน 70% (เน้นแถบสีเหลือง)</div>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/30 space-y-1.5">
                  <label className="block text-amber-400 font-bold text-xs">
                    PREPARE Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.prepareThresholdPercent}
                    onChange={e => setSettings({ ...settings, prepareThresholdPercent: parseInt(e.target.value, 10) || 85 })}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-amber-400 font-bold text-lg"
                  />
                  <div className="text-[10px] text-slate-400 font-thai">เตรียมอะไหล่: ค่ามาตรฐาน 85% (เน้นแถบสีส้ม)</div>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-rose-500/30 space-y-1.5">
                  <label className="block text-rose-400 font-bold text-xs">
                    CRITICAL Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.criticalThresholdPercent}
                    onChange={e => setSettings({ ...settings, criticalThresholdPercent: parseInt(e.target.value, 10) || 95 })}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-rose-400 font-bold text-lg"
                  />
                  <div className="text-[10px] text-slate-400 font-thai">วิกฤต/ต้องเจียร: ค่ามาตรฐาน 95% (แจ้งเตือนแดง+เสียง)</div>
                </div>
              </div>

              {/* Stage Layout Mode Setting */}
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-2.5">
                <label className="block text-cyan-300 font-bold text-sm">
                  Default Stage Monitor Display Mode (โหมดการแสดงผลของ Stage บนหน้าจอ)
                </label>
                <p className="text-xs text-slate-400 font-thai">
                  เลือกระดับความหนาแน่นในการแสดงผลแถวข้อมูลแม่พิมพ์บนหน้าจอ TV Dashboard
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    (settings.stageDisplayMode || 'DETAILED') === 'DETAILED'
                      ? 'bg-cyan-950/40 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="stageDisplayMode"
                      value="DETAILED"
                      checked={(settings.stageDisplayMode || 'DETAILED') === 'DETAILED'}
                      onChange={() => setSettings({ ...settings, stageDisplayMode: 'DETAILED' })}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">Detailed Mode (มาตรฐาน)</div>
                      <div className="text-[11px] text-slate-400 font-thai mt-0.5">
                        ตัวเลขขนาดใหญ่พิเศษ เหมาะสำหรับหน้าจอ TV ขนาดใหญ่ 55"+ และมองจากระยะไกล
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    settings.stageDisplayMode === 'COMPACT'
                      ? 'bg-cyan-950/40 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                  }`}>
                    <input
                      type="radio"
                      name="stageDisplayMode"
                      value="COMPACT"
                      checked={settings.stageDisplayMode === 'COMPACT'}
                      onChange={() => setSettings({ ...settings, stageDisplayMode: 'COMPACT' })}
                      className="mt-0.5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">Compact Mode (กะทัดรัด)</div>
                      <div className="text-[11px] text-slate-400 font-thai mt-0.5">
                        ปรับลดความสูงแถวและขนาดตัวอักษร พอดีกับหน้าจอแล็ปท็อป/แท็บเล็ต เห็นครบทุก Stage
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="liquid-pill w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-full text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer active:scale-98 border-none"
              >
                บันทึกค่าการตั้งค่าระบบ (SAVE SYSTEM CONFIGURATION)
              </button>
            </form>
          </div>

          {/* Clean Compact PLC Summary Widget */}
          <div className="liquid-glass-card border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>สถานะการเชื่อมต่อ PLC & Data Gateway (PLC Connection Status)</span>
                </h3>
                <p className="text-xs text-slate-400 font-thai mt-0.5">
                  ระบบเชื่อมต่ออัตโนมัติย้ายไปรวมศูนย์ควบคุมที่หน้าเมนู <strong>PLC & Data Gateway</strong> โดยเฉพาะแล้ว
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 self-start sm:self-auto ${
                plcStatus === 'GATEWAY_ONLINE' || plcStatus === 'CONNECTED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                  : plcStatus === 'TEST_SIMULATION_ACTIVE' || plcConfig.connectionMode === 'SIMULATION'
                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                  : 'bg-rose-950 text-rose-300 border-rose-600'
              }`}>
                <Activity className="w-3.5 h-3.5" />
                <span>{plcStatus.replace(/_/g, ' ')}</span>
                {pingLatency && <span className="text-slate-400">({pingLatency}ms)</span>}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400">CONNECTION PROTOCOL</span>
                <div className="font-bold text-cyan-300">{plcConfig.protocol}</div>
                <div className="text-[10px] text-slate-500">Target IP: {plcConfig.ip}:{plcConfig.port}</div>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400">POLLING INTERVAL</span>
                <div className="font-bold text-emerald-400">{plcConfig.pollingIntervalMs} ms</div>
                <div className="text-[10px] text-slate-500">Auto Polling: {plcConfig.isAutoPolling ? 'ACTIVE' : 'PAUSED'}</div>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400">MONITORED LINE REGISTERS</span>
                <div className="font-bold text-amber-300">{activeRegistersCount} Lines Active</div>
                <div className="text-[10px] text-slate-500">Total Mapped: {Object.keys(plcConfig?.lineRegisters || {}).length} Lines</div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/20 p-3.5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-thai">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>ต้องการปรับแต่ง IP, Address Register หรือทดสอบ PING?</span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('plc-config')}
                className="liquid-pill px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full text-xs font-mono flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 border-none"
              >
                <Network className="w-3.5 h-3.5 text-cyan-200" />
                <span>จัดการ PLC & DATA GATEWAY ทั้งหมด ➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="liquid-glass-card border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 font-mono text-xs text-slate-300 shadow-xl">
            <h3 className="font-bold text-slate-100 border-b border-white/10 pb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Seed Data Lineage & Database Status</span>
            </h3>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-3">
              <div>
                <div className="text-slate-500 text-[10px]">DATA SOURCE</div>
                <div className="font-bold text-emerald-400 text-xs">{SEED_SOURCE_LABEL}</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px]">VERSION RELEASE</div>
                <div className="text-slate-200">{SEED_DATA_VERSION}</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px]">ACTIVE DRIVER ENGINE</div>
                <div className="text-cyan-300 font-bold flex items-center gap-1.5 mt-0.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{plcConfig.protocol} Gateway</span>
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px]">UI REFRESH RATE</div>
                <div className="text-amber-300 font-bold">
                  {plcConfig.uiThrottleMs}ms Batch Throttle
                </div>
              </div>
            </div>
          </div>

          {/* Go-Live Readiness / Set 0 Reset Card */}
          <div className="liquid-glass-card border border-emerald-500/30 bg-emerald-950/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-emerald-300 border-b border-emerald-500/20 pb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Factory Go-Live Readiness (เตรียมใช้งานจริง)</span>
            </h3>

            <p className="text-xs text-slate-300 font-thai leading-relaxed">
              ฟังก์ชั่นสำหรับ IT & ฝ่ายแม่พิมพ์ เพื่อเซ็ตค่าช็อตสะสม ช็อตการเจียร และประวัติทั้งหมดเป็น <strong>0</strong> เพื่อเริ่มนับการใช้งานจริงของโรงงาน โดยยังคงเก็บฐานข้อมูลแม่พิมพ์และมาสเตอร์พาร์ทครบถ้วน
            </p>

            <button
              type="button"
              onClick={() => setIsGoLiveModalOpen(true)}
              className="liquid-pill w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95 border-none font-mono"
            >
              <RotateCcw className="w-4 h-4 text-emerald-200" />
              <span>CONFIGURE GO-LIVE (SET 0 & PLC LAN METERS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Factory Go-Live Set 0 & PLC LAN Meter Modal */}
      {isGoLiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fadeIn">
          <div className="liquid-glass-card border border-emerald-500/40 bg-slate-950/95 max-w-2xl w-full rounded-3xl p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-thai">ตั้งค่าระบบสำหรับวันใช้งานจริง (Factory Go-Live Set 0)</h3>
                  <p className="text-xs text-slate-400 font-thai">กำหนดเลขมิเตอร์ PLC LAN เริ่มต้น + เซ็ตประวัติและช็อตพาร์ทสะสมทั้งหมดเป็น 0</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoLiveModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 space-y-2 font-thai leading-relaxed">
              <div className="font-bold flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>หลักการทำงานของช็อตพาร์ท เมื่อเชื่อมต่อ PLC LAN โรงงาน:</span>
              </div>
              <p>
                1. เลขมิเตอร์รวมของเครื่อง (Machine Total Counter) จะตรงกับมิเตอร์จริงบนหน้าจอ PLC (เช่น Line E1 = 153,474,176)
              </p>
              <p>
                2. <strong>ช็อตสะสมของพาร์ททุกชิ้นจะเริ่มต้นนับจาก 0 (0% Progress)</strong> โดยระบบบันทึกจุดอ้างอิง Last Change Shot เท่ากับเลขมิเตอร์ปัจจุบันของ PLC
              </p>
              <p>
                3. เมื่อ PLC LAN ส่งสัญญาณสตรีมช็อตเข้ามา ช็อตพาร์ทจะนับเพิ่มขึ้นเรื่อยๆ อย่างแม่นยำ 100%
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-3 font-mono">
              <div className="text-xs font-bold text-slate-300 font-thai">1. เลือกรูปแบบเลขมิเตอร์เครื่องเริ่มต้น (Select Machine Meter Option):</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleApplyGoLiveReset('PLC_FACTORY')}
                  className="p-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-900/50 text-left cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="font-bold text-emerald-300 text-xs flex items-center justify-between">
                    <span>⚡ PLC LAN Factory Standard</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">แนะนำ</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-thai">
                    ใช้เลขมิเตอร์ PLC โรงงานจริงตามคู่มือ (E1=153.4M, E2=142.8M...) พาร์ทเริ่มต้น 0 ช็อต
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyGoLiveReset('ZERO')}
                  className="p-4 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 text-left cursor-pointer transition-all space-y-1.5"
                >
                  <div className="font-bold text-slate-200 text-xs">
                    ⚪ Clear All Line Meters to 0
                  </div>
                  <div className="text-[11px] text-slate-400 font-thai">
                    ตั้งเลขมิเตอร์เครื่องทุกไลน์เป็น 0 และช็อตพาร์ทเริ่มต้น 0 เหมาะสำหรับเครื่องใหม่
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Per-Line Inputs */}
            <div className="space-y-3 pt-2 border-t border-white/10 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-thai">2. หรือป้อนเลขมิเตอร์หน้าเครื่องจริงแยกรายไลน์ (Custom Line PLC Meters):</span>
                <button
                  type="button"
                  onClick={() => setLineMeterInputs({ ...DEFAULT_FACTORY_PLC_METERS })}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  [ดึงจาก Standard PLC]
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['E1', 'E2', 'E3-1', 'E3-2', 'E3-3', 'E4', 'E5'] as ProductionLineId[]).map(lineId => (
                  <div key={lineId} className="bg-black/50 p-3 rounded-2xl border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300">{lineId} PLC Meter</span>
                      <span className="text-[10px] text-slate-400 font-thai">เลขมิเตอร์จริง</span>
                    </div>
                    <input
                      type="number"
                      value={lineMeterInputs[lineId] || 0}
                      onChange={e => setLineMeterInputs({
                        ...lineMeterInputs,
                        [lineId]: parseInt(e.target.value, 10) || 0
                      })}
                      className="liquid-input w-full px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleApplyGoLiveReset('CUSTOM')}
                className="liquid-pill w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer font-mono"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันตามเลขมิเตอร์ที่ป้อนแยกรายไลน์ (EXECUTE CUSTOM SET 0)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoginView: React.FC<{ onLoginSuccess: (user: User) => void }> = ({ onLoginSuccess }) => {
  const users = storageService.getUsers();
  const defaultUser = users[0] || storageService.getCurrentUser();
  const [selectedUser, setSelectedUser] = useState<User>(defaultUser);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      storageService.setCurrentUser(selectedUser);
      onLoginSuccess(selectedUser);
    }
  };

  const activeUser = selectedUser || defaultUser;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full liquid-glass-card border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 mx-auto flex items-center justify-center font-bold shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Factory System Sign-in
          </h2>
          <p className="text-xs text-slate-400 font-thai">
            เข้าสู่ระบบควบคุมช็อตแม่พิมพ์ Fin Press & Fin Die
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
              Select Operator / Role (เลือกรหัสพนักงาน)
            </label>
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs font-mono active:scale-98 ${
                    activeUser?.id === u.id
                      ? 'bg-cyan-950/60 border-cyan-400/60 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-100">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-thai">{u.nameTh}</div>
                    <div className="text-[10px] text-slate-500">{u.department} • ID: {u.employeeId}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.08] text-cyan-300 border border-white/10 font-bold text-[11px]">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="liquid-pill w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-full text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-98 border-none"
          >
            <UserCheck className="w-4 h-4" />
            <span>ENTER APPLICATION AS {(activeUser?.name || 'USER').toUpperCase()}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
