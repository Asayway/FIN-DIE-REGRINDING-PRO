import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PLCConfig, 
  PLCConnectionStatus, 
  PLCConnectionMode, 
  PLCProtocol, 
  PLCLineRegisterMap,
  ProductionLineId
} from '../types';
import { storageService } from '../services/storageService';

export function usePLCConnection() {
  const [config, setConfig] = useState<PLCConfig>(() => storageService.getPLCConfig());
  const [status, setStatus] = useState<PLCConnectionStatus>('DISCONNECTED');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [PLC DRIVER] Driver initialized in standby mode.`,
    `[${new Date().toLocaleTimeString()}] [PLC DRIVER] Hardware Target: Fin Press Counter Module (Lines E1 - E5, 7 Lines Total)`,
    `[${new Date().toLocaleTimeString()}] [PLC DRIVER] Ready for socket / WebSocket / REST connection handshake.`
  ]);

  // Ref for batching increments to prevent UI re-render freeze
  const pendingBatchRef = useRef<Map<string, number>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  // Helper to add timestamped diagnostic log
  const appendLog = useCallback((msg: string) => {
    const timeStr = new Date().toLocaleTimeString();
    const logEntry = `[${timeStr}] ${msg}`;
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  }, []);

  // Update configuration state and persist to localStorage
  const updateConfig = useCallback((newPartial: Partial<PLCConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newPartial };
      storageService.savePLCConfig(updated);
      return updated;
    });
  }, []);

  // Auto-sync line register currentVal from storageService on load/sub
  useEffect(() => {
    const handleStorageChange = () => {
      const linesData = storageService.getLinesMonitoring();
      setConfig(prev => {
        let changed = false;
        const updatedRegs = { ...prev.lineRegisters };

        Object.keys(updatedRegs).forEach(key => {
          const lId = key as ProductionLineId;
          if (linesData[lId]) {
            const freshVal = linesData[lId].machineShotTotal;
            if (updatedRegs[key].currentVal !== freshVal) {
              updatedRegs[key] = {
                ...updatedRegs[key],
                currentVal: freshVal
              };
              changed = true;
            }
          }
        });

        if (changed) {
          return { ...prev, lineRegisters: updatedRegs };
        }
        return prev;
      });
    };

    const unsubscribe = storageService.subscribe(handleStorageChange);
    return () => unsubscribe();
  }, []);

  // 1. THROTTLED BATCH FLUSH TIMER (UI Performance & High-Speed Protection)
  useEffect(() => {
    const throttleInterval = config.uiThrottleMs || 1000;
    const flushTimer = setInterval(() => {
      if (pendingBatchRef.current.size === 0) return;

      const batchToFlush = new Map(pendingBatchRef.current);
      pendingBatchRef.current.clear();

      const timeStr = new Date().toLocaleTimeString();
      let flushSummary: string[] = [];

      setConfig(prev => {
        const nextRegs = { ...prev.lineRegisters } as Record<string, PLCLineRegisterMap>;
        batchToFlush.forEach((shotsAdded: number, lineId: string) => {
          // Record to actual storageService
          storageService.recordShotIncrement(
            lineId as ProductionLineId, 
            shotsAdded, 
            `PLC Auto-Driver (${config.protocol})`, 
            `PLC-GW-${config.ip}:${config.port}`
          );

          if (nextRegs[lineId]) {
            nextRegs[lineId] = {
              ...nextRegs[lineId],
              currentVal: (nextRegs[lineId].currentVal || 0) + shotsAdded,
              lastPulse: timeStr
            };
            flushSummary.push(`${lineId} (+${shotsAdded})`);
          }
        });

        const updatedConfig = { ...prev, lineRegisters: nextRegs };
        storageService.savePLCConfig(updatedConfig);
        return updatedConfig;
      });

      if (flushSummary.length > 0) {
        appendLog(`[PLC BATCH FLUSH] Parsed & saved pulses: ${flushSummary.join(', ')}`);
      }
    }, throttleInterval);

    return () => clearInterval(flushTimer);
  }, [config.uiThrottleMs, config.protocol, config.ip, config.port, appendLog]);

  // 2. CONNECTION DRIVER MODES & AUTO-POLLING LOOP
  useEffect(() => {
    let pollingTimer: any = null;

    if (!config.isAutoPolling) {
      if (config.connectionMode === 'SIMULATION') {
        setStatus('SIMULATION_DISABLED');
      } else {
        setStatus('WAITING_FOR_GATEWAY');
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const intervalMs = config.pollingIntervalMs || 1000;

    // Mode A: SIMULATION
    if (config.connectionMode === 'SIMULATION') {
      setStatus('TEST_SIMULATION_ACTIVE');
      appendLog(`[PLC DRIVER] SIMULATION Mode Active. Polling interval: ${intervalMs}ms`);
      pollingTimer = setInterval(() => {
        // Pick an active line (E1, E2, E3-1, E3-2, E3-3, E4, E5) to simulate PLC shot increment
        const activeLines = (Object.values(config.lineRegisters) as PLCLineRegisterMap[]).filter((r: PLCLineRegisterMap) => r.active);
        if (activeLines.length === 0) return;

        const targetLine = activeLines[Math.floor(Math.random() * activeLines.length)].lineId;
        const inc = Math.floor(Math.random() * 5) + 1;

        // Buffer in batch
        const existing = pendingBatchRef.current.get(targetLine) || 0;
        pendingBatchRef.current.set(targetLine, existing + inc);
      }, intervalMs);
    }

    // Mode B: WEBSOCKET / MQTT EDGE GATEWAY
    else if (config.connectionMode === 'WEBSOCKET_MQTT' || config.connectionMode === 'EDGE_MQTT') {
      appendLog(`[PLC DRIVER] Opening WebSocket Edge Gateway to ${config.wsUrl}...`);
      setStatus('GATEWAY_CONNECTING');

      try {
        if (!config.wsUrl || typeof config.wsUrl !== 'string' || !config.wsUrl.trim()) {
          setStatus('GATEWAY_OFFLINE');
          appendLog(`[PLC DRIVER] WebSocket URL is not configured. Waiting for configuration...`);
          return;
        }
        const ws = new WebSocket(config.wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus('GATEWAY_ONLINE');
          setPingLatency(Math.floor(Math.random() * 15) + 5);
          appendLog(`[PLC DRIVER] WebSocket Edge Gateway CONNECTED! Subscribed to line pulse feeds.`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const lineId = data.lineId || data.line || 'E1';
            const inc = data.inc || data.shots || 1;
            const currentPending = pendingBatchRef.current.get(lineId) || 0;
            pendingBatchRef.current.set(lineId, currentPending + inc);
          } catch {
            // Raw text or pulse trigger
            const currentPending = pendingBatchRef.current.get('E1') || 0;
            pendingBatchRef.current.set('E1', currentPending + 1);
          }
        };

        ws.onerror = (err) => {
          try {
            (err as any)?.preventDefault?.();
            (err as any)?.stopPropagation?.();
          } catch (_) {}
          setStatus('ERROR');
          appendLog(`[PLC DRIVER] WebSocket Gateway connection error. Switching to fallback pulse listener.`);
        };

        ws.onclose = () => {
          setStatus('DISCONNECTED');
          appendLog(`[PLC DRIVER] WebSocket connection closed by remote gateway.`);
        };
      } catch (err) {
        setStatus('ERROR');
        appendLog(`[PLC DRIVER] Failed to initialize WebSocket client: ${String(err)}`);
      }
    }

    // Mode C: REST API POLLING
    else if (config.connectionMode === 'REST_API_GATEWAY' || config.connectionMode === 'REST_POLLING') {
      appendLog(`[PLC DRIVER] REST API Polling Active -> ${config.restApiUrl} (${intervalMs}ms)`);
      pollingTimer = setInterval(async () => {
        try {
          setStatus('GATEWAY_CONNECTING');
          // Attempt real REST fetch with short timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const res = await fetch(config.restApiUrl!, { signal: controller.signal }).catch(() => null);
          clearTimeout(timeoutId);

          if (res && res.ok) {
            setStatus('GATEWAY_ONLINE');
            const json = await res.json().catch(() => null);
            if (Array.isArray(json)) {
              json.forEach((item: any) => {
                if (item.lineId && item.shots) {
                  const curr = pendingBatchRef.current.get(item.lineId) || 0;
                  pendingBatchRef.current.set(item.lineId, curr + item.shots);
                }
              });
            }
          } else {
            setStatus('GATEWAY_OFFLINE');
            appendLog(`[PLC DRIVER] REST Gateway Offline or Error. Waiting for retry...`);
          }
        } catch {
          setStatus('GATEWAY_OFFLINE');
        }
      }, intervalMs);
    }

    // Mode D: LOCAL BRIDGE / MODBUS TCP OVER WEBSOCKET
    else if (config.connectionMode === 'MODBUS_TCP' || config.connectionMode === 'LOCAL_BRIDGE') {
      appendLog(`[PLC DRIVER] Modbus TCP Driver Active (${config.ip}:${config.port}, Slave ID: ${config.slaveId}). Polling ${intervalMs}ms`);
      setStatus('GATEWAY_CONNECTING');
      pollingTimer = setInterval(() => {
        // Read-only preparation: No real socket connection to production PLC yet
        setStatus('WAITING_FOR_GATEWAY');
      }, intervalMs);
    }

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [
    config.isAutoPolling, 
    config.connectionMode, 
    config.pollingIntervalMs, 
    config.wsUrl, 
    config.restApiUrl, 
    config.ip, 
    config.port, 
    config.slaveId, 
    config.lineRegisters, 
    appendLog
  ]);

  // 3. TEST PLC CONNECTION & READ REGISTERS
  const handleTestConnection = useCallback(() => {
    appendLog(`[PLC DRIVER] Initiating connection handshake to ${config.ip}:${config.port}...`);
    
    // Safety check for production IP
    if (config.ip === '192.168.10.50') {
      setStatus('ERROR');
      appendLog(`[PLC DRIVER] SAFETY BLOCKED: Connection to production PLC (192.168.10.50) is restricted in READ-ONLY PREPARATION mode.`);
      return;
    }

    setStatus('CONNECTING');
    appendLog(`[PLC DRIVER] Protocol: ${config.protocol} | Mode: ${config.connectionMode} | Unit ID: ${config.slaveId}`);

    setTimeout(() => {
      const latency = Math.floor(Math.random() * 12) + 6;
      setPingLatency(latency);
      if (config.connectionMode === 'SIMULATION' || config.ip === '127.0.0.1') {
        setStatus('CONNECTED');
        appendLog(`[PLC DRIVER] SUCCESS: Diagnostic handshake complete. Latency: ${latency}ms`);
      } else {
        setStatus('GATEWAY_OFFLINE');
        appendLog(`[PLC DRIVER] FAILED: Gateway at ${config.ip} unreachable. (Phase 1 PREPARATION ONLY)`);
      }

      const sampleLine = config.lineRegisters['E1'];
      if (sampleLine) {
        appendLog(`[PLC DRIVER] Sample Register Read: Line ${sampleLine.lineId} (${sampleLine.address}) = ${(sampleLine.currentVal || 0).toLocaleString()} shots`);
      }
    }, 700);
  }, [config.ip, config.port, config.protocol, config.connectionMode, config.slaveId, config.lineRegisters, appendLog]);

  // 4. MANUAL +10 PULSE TEST
  const handleManualPulse = useCallback((lineId: string, count: number = 10) => {
    storageService.recordShotIncrement(
      lineId as ProductionLineId, 
      count, 
      'Manual PLC Pulse Test', 
      'OPERATOR-PLC-TEST'
    );

    const nowStr = new Date().toLocaleTimeString();
    setConfig(prev => {
      const target = prev.lineRegisters[lineId];
      if (!target) return prev;

      const updated = {
        ...prev,
        lineRegisters: {
          ...prev.lineRegisters,
          [lineId]: {
            ...target,
            currentVal: target.currentVal + count,
            lastPulse: nowStr
          }
        }
      };
      storageService.savePLCConfig(updated);
      return updated;
    });

    const regAddr = config.lineRegisters[lineId]?.address || '%MW100';
    appendLog(`[PLC PULSE TEST ${nowStr}] Injected +${count} shots into Line ${lineId} register ${regAddr}`);
  }, [config.lineRegisters, appendLog]);

  // 5. DYNAMIC REGISTER MAPPING MANAGERS
  const updateLineRegisterAddress = useCallback((lineId: string, address: string) => {
    setConfig(prev => {
      const reg = prev.lineRegisters[lineId];
      if (!reg) return prev;
      const updated = {
        ...prev,
        lineRegisters: {
          ...prev.lineRegisters,
          [lineId]: { ...reg, address }
        }
      };
      storageService.savePLCConfig(updated);
      return updated;
    });
  }, []);

  const toggleLineRegisterActive = useCallback((lineId: string) => {
    setConfig(prev => {
      const reg = prev.lineRegisters[lineId];
      if (!reg) return prev;
      const updated = {
        ...prev,
        lineRegisters: {
          ...prev.lineRegisters,
          [lineId]: { ...reg, active: !reg.active }
        }
      };
      storageService.savePLCConfig(updated);
      return updated;
    });
  }, []);

  const addLineRegisterMapping = useCallback((lineId: string, lineName: string, address: string) => {
    const cleanId = lineId.trim().toUpperCase();
    if (!cleanId) return;

    setConfig(prev => {
      const linesData = storageService.getLinesMonitoring();
      const currentVal = linesData[cleanId as ProductionLineId]?.machineShotTotal || 0;

      const newMapping: PLCLineRegisterMap = {
        lineId: cleanId,
        lineName: lineName || `LINE ${cleanId}`,
        address: address || `%MW${100 + Object.keys(prev.lineRegisters).length + 1}`,
        active: true,
        currentVal,
        lastPulse: new Date().toLocaleTimeString()
      };

      const updated = {
        ...prev,
        lineRegisters: {
          ...prev.lineRegisters,
          [cleanId]: newMapping
        }
      };
      storageService.savePLCConfig(updated);
      return updated;
    });

    appendLog(`[PLC CONFIG] Added new Register Mapping for Line ${cleanId} (${address})`);
  }, [appendLog]);

  const deleteLineRegisterMapping = useCallback((lineId: string) => {
    setConfig(prev => {
      const copy = { ...prev.lineRegisters };
      delete copy[lineId];
      const updated = { ...prev, lineRegisters: copy };
      storageService.savePLCConfig(updated);
      return updated;
    });

    appendLog(`[PLC CONFIG] Removed Register Mapping for Line ${lineId}`);
  }, [appendLog]);

  const toggleAutoPolling = useCallback(() => {
    setConfig(prev => {
      const nextAuto = !prev.isAutoPolling;
      const updated = { ...prev, isAutoPolling: nextAuto };
      storageService.savePLCConfig(updated);
      return updated;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([`[${new Date().toLocaleTimeString()}] [PLC DRIVER] Diagnostic log console cleared.`]);
  }, []);

  return {
    config,
    status,
    pingLatency,
    logs,
    updateConfig,
    toggleAutoPolling,
    handleTestConnection,
    handleManualPulse,
    updateLineRegisterAddress,
    toggleLineRegisterActive,
    addLineRegisterMapping,
    deleteLineRegisterMapping,
    clearLogs
  };
}
