import React from 'react';
import { AlertSeverity, OrderStatus, MachineStatus } from '../../types';
import { Play, Pause, Wrench, AlertOctagon, RefreshCw } from 'lucide-react';

interface BadgeProps {
  severity?: AlertSeverity;
  orderStatus?: OrderStatus;
  machineStatus?: MachineStatus | string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ 
  severity, 
  orderStatus, 
  machineStatus, 
  label, 
  className = '', 
  showIcon = true 
}) => {
  if (machineStatus) {
    const statusNormalized = (machineStatus || '').toUpperCase();
    const isMaintenance = statusNormalized.includes('MAINT') || statusNormalized.includes('MAINTENANCE') || statusNormalized.includes('UNDER MAINTENANCE');
    const isDown = statusNormalized.includes('STOP') || statusNormalized.includes('DOWN') || statusNormalized.includes('EMERGENCY');
    const isRunning = statusNormalized === 'RUNNING';
    const isIdle = statusNormalized === 'IDLE';
    const isChangeover = statusNormalized.includes('CHANGE');
    const isWaiting = statusNormalized.includes('WAITING') || statusNormalized.includes('GATEWAY');

    if (isWaiting) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-500/80 animate-pulse ${className}`}>
          {showIcon && <RefreshCw className="w-3 h-3 text-blue-300 animate-spin-slow" />}
          <span>{label || 'WAITING FOR GATEWAY'}</span>
        </span>
      );
    }

    if (isMaintenance) {
      return (
        <span 
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/80 animate-pulse shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/40 ${className}`}
          title="Line is Under Maintenance"
        >
          {showIcon && <Wrench className="w-3 h-3 text-amber-300 animate-spin-slow" />}
          <span>{label || 'UNDER MAINTENANCE'}</span>
        </span>
      );
    }

    if (isDown) {
      return (
        <span 
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-rose-950/90 text-rose-200 border border-rose-500 animate-pulse shadow-sm shadow-rose-500/30 ring-1 ring-rose-500/50 ${className}`}
          title="Line is Stopped / Down"
        >
          {showIcon && <AlertOctagon className="w-3 h-3 text-rose-300 animate-pulse" />}
          <span>{label || 'DOWN (STOPPED)'}</span>
        </span>
      );
    }

    if (isRunning) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-700/80 ${className}`}>
          {showIcon && <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />}
          <span>{label || 'RUNNING'}</span>
        </span>
      );
    }

    if (isIdle) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-yellow-950/60 text-yellow-300 border border-yellow-700/70 ${className}`}>
          {showIcon && <Pause className="w-2.5 h-2.5 text-yellow-300" />}
          <span>{label || 'พักไลน์ / ไม่มีแผน'}</span>
        </span>
      );
    }

    if (isChangeover) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-purple-950/70 text-purple-300 border border-purple-700/70 ${className}`}>
          {showIcon && <RefreshCw className="w-2.5 h-2.5 text-purple-300" />}
          <span>{label || 'CHANGEOVER'}</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 ${className}`}>
        <span>{label || machineStatus}</span>
      </span>
    );
  }

  if (orderStatus) {
    let colorClass = 'bg-slate-800 text-slate-400 border-slate-700';
    if (orderStatus === 'NOT REQUIRED') colorClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
    if (orderStatus === 'PR PREPARING') colorClass = 'bg-amber-950/60 text-amber-300 border-amber-800/60 animate-pulse';
    if (orderStatus === 'PO OPEN') colorClass = 'bg-rose-950/60 text-rose-400 border-rose-800/60 font-bold';
    if (orderStatus === 'ORDERED') colorClass = 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
    if (orderStatus === 'ARRIVED') colorClass = 'bg-blue-950/60 text-blue-300 border-blue-800/60';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${colorClass} ${className}`}>
        {orderStatus}
      </span>
    );
  }

  if (severity) {
    let colorClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
    let text = label || severity;

    if (severity === 'NORMAL') {
      colorClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
      text = label || 'NORMAL (0-69%)';
    } else if (severity === 'WARNING') {
      colorClass = 'bg-amber-950/80 text-amber-300 border-amber-700';
      text = label || 'WARNING (70-84%)';
    } else if (severity === 'PREPARE') {
      colorClass = 'bg-orange-950/80 text-orange-400 border-orange-700';
      text = label || 'PREPARE (85-94%)';
    } else if (severity === 'CRITICAL') {
      colorClass = 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse font-bold';
      text = label || 'CRITICAL (95-99%)';
    } else if (severity === 'OVER_LIFE') {
      colorClass = 'bg-red-900 text-white border-red-500 font-extrabold animate-bounce';
      text = label || 'OVER LIFE (≥100%)';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wider border ${colorClass} ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 ${className}`}>
      {label}
    </span>
  );
};

