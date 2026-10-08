import React from 'react';

export const ViewSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[500px] flex flex-col gap-4 animate-pulse p-2 sm:p-4">
      {/* Top Header/Filter Bar Skeleton */}
      <div className="h-12 w-full bg-slate-800/60 dark:bg-slate-800/80 rounded-xl flex items-center justify-between px-4 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-slate-700/80 rounded-lg"></div>
          <div className="h-8 w-32 bg-slate-700/80 rounded-lg"></div>
          <div className="h-8 w-32 bg-slate-700/80 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-slate-700/80 rounded-lg"></div>
          <div className="h-8 w-20 bg-slate-700/80 rounded-lg"></div>
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-800/50 dark:bg-slate-800/70 border border-slate-700/40 rounded-xl p-3 flex flex-col justify-between">
            <div className="h-3 w-16 bg-slate-700/80 rounded"></div>
            <div className="h-6 w-24 bg-cyan-500/20 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Layout Skeleton */}
      <div className="flex-1 min-h-[360px] bg-slate-800/40 dark:bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3">
        <div className="h-8 w-full bg-slate-800/80 rounded-lg"></div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-11 w-full bg-slate-800/40 dark:bg-slate-800/60 rounded-lg flex items-center justify-between px-4 gap-4">
            <div className="h-4 w-8 bg-slate-700/80 rounded"></div>
            <div className="h-4 w-40 bg-slate-700/80 rounded"></div>
            <div className="h-4 w-20 bg-slate-700/80 rounded"></div>
            <div className="h-4 w-20 bg-slate-700/80 rounded"></div>
            <div className="h-4 w-16 bg-slate-700/80 rounded"></div>
            <div className="h-6 w-28 bg-emerald-500/20 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
