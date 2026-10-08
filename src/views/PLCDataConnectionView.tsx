import React, { useState } from 'react';
import {
  Network,
  Cpu,
  Radio,
  Server,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Download,
  Plus,
  Trash2,
  Copy,
  Zap,
  ShieldCheck,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { usePLCConnection } from '../hooks/usePLCConnection';
import { GatewayConnectionMode, PLCProtocol, PLCLineRegisterMap } from '../types';
import { useTranslation } from '../i18n';

export const PLCDataConnectionView: React.FC = () => {
  const { t } = useTranslation();

  const {
    config: plcConfig,
    status: plcStatus,
    pingLatency,
    logs: diagnosticLogs,
    updateConfig,
    toggleAutoPolling,
    handleTestConnection,
    handleManualPulse,
    updateLineRegisterAddress,
    toggleLineRegisterActive,
    addLineRegisterMapping,
    deleteLineRegisterMapping,
    clearLogs
  } = usePLCConnection();

  const [activeSubTab, setActiveSubTab] = useState<'config' | 'registers' | 'terminal' | 'security'>('config');
  const [showAddLineForm, setShowAddLineForm] = useState(false);
  const [newLineId, setNewLineId] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newLineAddress, setNewLineAddress] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const lineRegistersList: PLCLineRegisterMap[] = Object.values(plcConfig?.lineRegisters || {});

  const handleCreateLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineId.trim()) return;
    addLineRegisterMapping(newLineId.toUpperCase(), newLineName, newLineAddress || '%MW100');
    setNewLineId('');
    setNewLineName('');
    setNewLineAddress('');
    setShowAddLineForm(false);
    triggerNotification(`เพิ่มการแมป Register สำหรับไลน์ ${newLineId.toUpperCase()} เรียบร้อยแล้ว`);
  };

  const handleExportRegisterMapJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plcConfig?.lineRegisters || {}, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PLC_Register_Map_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerNotification('ส่งออกไฟล์การตั้งค่า Register JSON เรียบร้อยแล้ว');
  };

  const handleCopyTerminalLogs = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(diagnosticLogs.join('\n')).catch(() => {});
      }
    } catch (_) {}
    triggerNotification('คัดลอกบันทึก Diagnostic Terminal ไปยัง Clipboard แล้ว');
  };

  const isConnected = plcStatus === 'CONNECTED' || plcStatus === 'GATEWAY_ONLINE';
  const isSimulation = plcConfig?.connectionMode === 'SIMULATION' || plcStatus === 'TEST_SIMULATION_ACTIVE';
  const isAutoPolling = !!plcConfig?.isAutoPolling;

  return (
    <div className="space-y-5 animate-fadeIn font-sans text-white pb-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B172E] to-slate-900 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                INDUSTRY 4.0 / OT-IT GATEWAY
              </span>
              {isSimulation ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                  SIMULATION ACTIVE
                </span>
              ) : isConnected ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  PLC CONNECTED ({pingLatency || 8}ms)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                  {plcStatus}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2.5">
              <Network className="w-6 h-6 text-cyan-400" />
              <span>การเชื่อมต่อส่งข้อมูลอัตโนมัติจาก PLC (PLC & Data Gateway)</span>
            </h2>
            <p className="text-xs text-slate-300 font-thai max-w-3xl leading-relaxed">
              กำหนดค่าการสื่อสารกับเครื่องปั๊มฟิน (Fin Press PLC) ผ่าน Modbus TCP/IP, OPC UA หรือ Mitsubishi MC Protocol เพื่ออ่านยอดสโตรก (Stroke Counter) แบบอัตโนมัติและแม่นยำ
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>ทดสอบ PING</span>
            </button>
            <button
              type="button"
              onClick={toggleAutoPolling}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow active:scale-95 ${
                isAutoPolling
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isAutoPolling ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>หยุดอ่านค่า AUTO</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>เริ่มอ่านค่า AUTO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Sub-Tabs Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-md font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>1. พารามิเตอร์การเชื่อมต่อ (CONNECTION CONFIG)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('registers')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'registers'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-300" />
          <span>2. การแมปตำแหน่งรีจิสเตอร์ (REGISTER MAPPING)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('terminal')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'terminal'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>3. เทอร์มินัลวินิจฉัยสัญญาณ (PACKET TERMINAL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'security'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>4. คู่มือความปลอดภัยเครือข่าย IT (IT & OT GUIDE)</span>
        </button>
      </div>

      {/* SUB-TAB 1: CONNECTION CONFIG */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Driver Settings Card */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <span>การตั้งค่าโปรโตคอลและโหมดการทำงาน (Protocol & Port)</span>
              </h3>
              <span className="text-xs text-slate-400">Layer 4 / 7 Industrial Protocol</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              {/* Connection Mode */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">โหมดการทำงาน (OPERATION MODE)</label>
                <select
                  value={plcConfig?.connectionMode || 'SIMULATION'}
                  onChange={e => updateConfig({ connectionMode: e.target.value as GatewayConnectionMode })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-bold focus:border-cyan-400 focus:outline-none"
                >
                  <option value="SIMULATION">SIMULATION (จำลองสโตรกผลิตภายในแอป)</option>
                  <option value="MODBUS_TCP">DIRECT MODBUS TCP/IP (เครื่องต่อตรงแลน)</option>
                  <option value="EDGE_MQTT">OPC UA / MQTT INDUSTRIAL GATEWAY</option>
                  <option value="WEBSOCKET_MQTT">WEBSOCKET EDGE STREAM</option>
                  <option value="REST_API_GATEWAY">REST API / WEBHOOK (IoT Edge Box)</option>
                  <option value="LOCAL_BRIDGE">LOCAL GATEWAY BRIDGE</option>
                </select>
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">โปรโตคอลสื่อสาร (COMMUNICATION PROTOCOL)</label>
                <select
                  value={plcConfig?.protocol || 'MODBUS_TCP'}
                  onChange={e => updateConfig({ protocol: e.target.value as PLCProtocol })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-bold focus:border-cyan-400 focus:outline-none"
                >
                  <option value="MODBUS_TCP">MODBUS TCP / ETHERNET IP</option>
                  <option value="OPC_UA">OPC UA (BINARY / TCP)</option>
                  <option value="MITSUBISHI_MC">MITSUBISHI MC PROTOCOL (3E/4E FRAME)</option>
                  <option value="OMRON_FINS">OMRON FINS / UDP PROTOCOL</option>
                  <option value="SIEMENS_S7">SIEMENS S7 INDUSTRIAL PROTOCOL</option>
                  <option value="MQTT_SPARKPLUG">MQTT SPARKPLUG B</option>
                  <option value="REST_API_GATEWAY">HTTP REST / JSON WEBHOOK</option>
                </select>
              </div>

              {/* IP Address */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">IP ADDRESS หรือ HOSTNAME</label>
                <input
                  type="text"
                  value={plcConfig?.ip || '192.168.10.50'}
                  onChange={e => updateConfig({ ip: e.target.value })}
                  placeholder="เช่น 192.168.1.150"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">PORT NUMBER</label>
                <input
                  type="number"
                  value={plcConfig?.port || 502}
                  onChange={e => updateConfig({ port: parseInt(e.target.value) || 502 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Slave Unit ID */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">SLAVE / STATION ID (UNIT ID)</label>
                <input
                  type="number"
                  value={plcConfig?.slaveId || 1}
                  onChange={e => updateConfig({ slaveId: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Polling Interval */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">ความถี่ในการดึงข้อมูล (POLL INTERVAL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={plcConfig?.pollingIntervalMs || 1000}
                    onChange={e => updateConfig({ pollingIntervalMs: parseInt(e.target.value) || 1000 })}
                    step={100}
                    min={100}
                    max={10000}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono shrink-0">ms</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-thai">
                💡 คำแนะนำ: ไดรเวอร์ทำงานในโหมด READ-ONLY เพื่อความปลอดภัยสูงสุดของเครื่องปั๊มฟิน
              </div>
              <button
                type="button"
                onClick={() => triggerNotification('บันทึกการตั้งค่าพารามิเตอร์เรียบร้อยแล้ว')}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>

          {/* Real-time Health Monitor Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>สถานะการเชื่อมต่อสด (Live Link)</span>
                </h4>
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected || isSimulation ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
              </div>

              <div className="space-y-3 mt-4 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">สถานะ DRIVER:</span>
                  <span className={`font-bold ${isConnected ? 'text-emerald-400' : isSimulation ? 'text-amber-400' : 'text-slate-400'}`}>
                    {isConnected ? '🟢 CONNECTED & POLLING' : isSimulation ? '🟡 SIMULATOR ACTIVE' : '⚪ STANDBY / DISCONNECTED'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">PING LATENCY:</span>
                  <span className="text-cyan-300 font-bold">{pingLatency || (isConnected ? 8 : '--')} ms</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">STATUS CODE:</span>
                  <span className="text-emerald-400 font-bold">{plcStatus}</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">อัปเดตล่าสุด:</span>
                  <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Manual Pulse Injection Button */}
            <div className="p-3.5 bg-cyan-950/40 border border-cyan-700/50 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>จำลองการส่งสัญญาณ Stroke Pulse (Test)</span>
              </div>
              <p className="text-[10px] text-slate-400 font-thai">
                ยิงสัญญาณสโตรกจำลองเพื่อทดสอบการตอบสนองของระบบ Dashboard
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleManualPulse('E1', 500);
                    triggerNotification('ยิงสัญญาณทดสอบ +500 Shots เข้า Line E1 สำเร็จ');
                  }}
                  className="py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-[11px] transition-colors cursor-pointer"
                >
                  +500 SHOTS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleManualPulse('E1', 2500);
                    triggerNotification('ยิงสัญญาณทดสอบ +2,500 Shots เข้า Line E1 สำเร็จ');
                  }}
                  className="py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono text-[11px] transition-colors cursor-pointer"
                >
                  +2,500 SHOTS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REGISTER MAPPING TABLE */}
      {activeSubTab === 'registers' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 font-mono">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span>ตารางการแมป Address รีจิสเตอร์ของแต่ละสายการผลิต (Line Register Address Mapping)</span>
              </h3>
              <p className="text-xs text-slate-400 font-thai mt-0.5">
                กำหนดตำแหน่งที่อยู่ (Address เช่น %MW100, D1000, DB100.DBD0) ที่ใช้สำหรับอ่านยอดนับสโตรกจาก PLC ประจำเครื่องแต่ละไลน์
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportRegisterMapJson}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>EXPORT MAP (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddLineForm(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มไลน์ใหม่</span>
              </button>
            </div>
          </div>

          {/* Add Line Mapping Inline Modal / Form */}
          {showAddLineForm && (
            <form onSubmit={handleCreateLine} className="bg-slate-950 border border-cyan-500/50 rounded-xl p-4 space-y-3 font-mono text-xs animate-fadeIn">
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>➕ เพิ่มการจับคู่รีจิสเตอร์ใหม่ (Add Register Mapping)</span>
                <button type="button" onClick={() => setShowAddLineForm(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">LINE ID *</label>
                  <input
                    type="text"
                    value={newLineId}
                    onChange={e => setNewLineId(e.target.value)}
                    placeholder="เช่น E6, E7"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">MACHINE NAME</label>
                  <input
                    type="text"
                    value={newLineName}
                    onChange={e => setNewLineName(e.target.value)}
                    placeholder="เช่น Fin Press Line #6"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SHOT REGISTER ADDRESS *</label>
                  <input
                    type="text"
                    value={newLineAddress}
                    onChange={e => setNewLineAddress(e.target.value)}
                    placeholder="เช่น %MW100 หรือ D1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLineForm(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold"
                >
                  บันทึกการแมป
                </button>
              </div>
            </form>
          )}

          {/* Register Mapping Table */}
          <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-cyan-300 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <th className="p-3">LINE ID</th>
                  <th className="p-3">ชื่อสายการผลิต / เครื่องจักร</th>
                  <th className="p-3">REGISTER ADDRESS (สโตรก)</th>
                  <th className="p-3">DATA TYPE</th>
                  <th className="p-3 text-center">SCALE</th>
                  <th className="p-3 text-right">ค่าที่อ่านได้ล่าสุด</th>
                  <th className="p-3 text-center">สถานะอ่านค่า</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-bold">
                {lineRegistersList.length > 0 ? (
                  lineRegistersList.map((map) => (
                    <tr key={map.lineId} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 whitespace-nowrap text-cyan-400 font-black">
                        LINE {map.lineId}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-200">
                        {map.lineName || `Fin Press Line ${map.lineId}`}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={map.address || ''}
                          onChange={e => updateLineRegisterAddress(map.lineId, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-emerald-400 font-bold text-xs focus:border-cyan-400 focus:outline-none w-28"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-400">
                        DINT (32-bit UINT)
                      </td>
                      <td className="p-3 whitespace-nowrap text-center text-slate-300">
                        1.0
                      </td>
                      <td className="p-3 whitespace-nowrap text-right text-emerald-300 font-black">
                        {map.currentVal ? map.currentVal.toLocaleString() : '0'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => toggleLineRegisterActive(map.lineId)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            map.active !== false
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {map.active !== false ? '● ACTIVE' : '○ DISABLED'}
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`ต้องการลบการแมปสำหรับไลน์ ${map.lineId} หรือไม่?`)) {
                              deleteLineRegisterMapping(map.lineId);
                              triggerNotification(`ลบการแมปไลน์ ${map.lineId} แล้ว`);
                            }
                          }}
                          className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      ไม่พบการแมป Register สำหรับสายการผลิต
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DIAGNOSTIC PACKET TERMINAL */}
      {activeSubTab === 'terminal' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 font-mono">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">เทอร์มินัลวินิจฉัยสัญญาณข้อมูลแบบเรียลไทม์ (Live Packet Sniffer)</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTerminalLogs}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>COPY LOGS</span>
              </button>
              <button
                type="button"
                onClick={clearLogs}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>CLEAR LOGS</span>
              </button>
            </div>
          </div>

          {/* Terminal Console Box */}
          <div className="bg-black/90 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1.5 h-80 overflow-y-auto custom-scrollbar shadow-inner">
            <div className="text-slate-500">// Industrial Ethernet Gateway Sniffer Console - Ready</div>
            <div className="text-cyan-400">[INFO] Driver Protocol: {plcConfig?.protocol || 'MODBUS_TCP'} (Target: {plcConfig?.ip || '192.168.10.50'}:{plcConfig?.port || 502})</div>
            {diagnosticLogs.length > 0 ? (
              diagnosticLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:bg-slate-900/50 px-1 rounded">
                  <span className="text-slate-500 select-none">&gt; </span>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-600 italic">กำลังรอแพ็กเกจสัญญาณจาก PLC...</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: IT & OT SECURITY CHECKLIST */}
      {activeSubTab === 'security' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl font-mono text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span>แนวทางปฏิบัติและความปลอดภัยในการเชื่อมต่อระดับโรงงาน (Factory Rollout & Security Guidelines)</span>
            </h3>
            <p className="text-xs text-slate-400 font-thai mt-1">
              คำแนะนำสำหรับฝ่าย IT และ Automation ในการเตรียมโครงสร้างระบบเครือข่ายก่อนใช้งานจริง
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 font-thai">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-cyan-300 font-bold font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                1. การแยก Network Segment (OT vs IT VLAN)
              </div>
              <p className="text-slate-400 leading-relaxed text-[11.5px]">
                แนะนำให้วางเครื่อง PLC ของ Fin Press อยู่ใน VLAN ฝั่งสายการผลิต (OT Network) และใช้ Edge Gateway (เช่น Raspberry Pi Industrial หรือ Advantech Box) เป็นตัวกลางอ่านค่าส่งเข้ามายังเซิร์ฟเวอร์ระบบ
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-emerald-300 font-bold font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                2. นโยบายอ่านอย่างเดียว (Read-Only Safety)
              </div>
              <p className="text-slate-400 leading-relaxed text-[11.5px]">
                ไดรเวอร์ของระบบจะใช้คำสั่ง Function Code 03 (Read Holding Registers) หรือ Read Coils เท่านั้น จะไม่มีการส่งคำสั่ง Write (เขียนทับ) เข้าไปในหน่วยความจำของเครื่องปั๊ม เพื่อความปลอดภัยสูงสุดของเครื่องจักร
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-amber-300 font-bold font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                3. การจัดการความต่อเนื่อง (Fault Tolerance & Buffer)
              </div>
              <p className="text-slate-400 leading-relaxed text-[11.5px]">
                ในกรณีที่สาย LAN หลุดหรือเครือข่ายขัดข้อง ตัวแอปจะเก็บค่าสโตรกล่าสุดไว้ใน Local Storage ทันทีที่เชื่อมต่อติดใหม่ ระบบจะทำการซิงค์สโตรกต่ออย่างราบรื่นโดยไม่มียอดหล่นหาย
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-purple-300 font-bold font-mono text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                4. พอร์ตไฟร์วอลล์ที่ต้องเปิด (Firewall Rules)
              </div>
              <p className="text-slate-400 leading-relaxed text-[11.5px]">
                • Port 502 (TCP) สำหรับ Modbus TCP<br />
                • Port 4840 (TCP) สำหรับ OPC UA Gateway<br />
                • Port 3000 สำหรับ Web Monitor Service
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
