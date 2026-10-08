import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary Guard] Caught component error:', error?.message || error, errorInfo);
  }

  public render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="bg-slate-900 border border-rose-500/50 rounded-xl p-6 text-center space-y-4 my-6 shadow-2xl">
          <div className="w-12 h-12 bg-rose-950/80 border border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              {props.fallbackTitle || 'เกิดข้อผิดพลาดในการแสดงผลคอมโพเนนต์ (Component Error)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto font-thai">
              ระบบตรวจพบข้อผิดพลาดขณะเรนเดอร์คอมโพเนนต์นี้ คุณสามารถกดปุ่มรีเฟรชเพื่อโหลดข้อมูลและสถานะใหม่อีกครั้ง
            </p>
            {state.error && (
              <div className="mt-3 p-2.5 bg-black/60 border border-slate-800 rounded text-xs font-mono text-rose-300 max-w-lg mx-auto overflow-x-auto text-left">
                {state.error.message}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              (this as any).setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 mx-auto transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรชระบบใหม่ (Reload Application)</span>
          </button>
        </div>
      );
    }

    return props.children;
  }
}
