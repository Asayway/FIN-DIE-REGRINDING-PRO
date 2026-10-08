import React, { useState, useEffect } from 'react';
import { Download, Play, Save, X, AlertTriangle, CheckCircle, Search, RefreshCw, Box, Check, HelpCircle } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { PartMaster, PartLifeStandard, LineActiveConfiguration, RegrindMasterStandard } from '../../types';
import { embeddedFinDieStandards } from './migrationData';
import { performValidation, commitMigration } from './migrationLogic';

interface EmbeddedMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrateComplete?: () => void;
}

export const EmbeddedMigrationModal: React.FC<EmbeddedMigrationModalProps> = ({ isOpen, onClose, onMigrateComplete }) => {
  const [loading, setLoading] = useState(false);
  const [analyzedRecords, setAnalyzedRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setTimeout(() => {
        const { records, stats } = performValidation();
        setAnalyzedRecords(records);
        setStats(stats);
        setLoading(false);
      }, 500);
    }
  }, [isOpen]);

  const handleCommit = () => {
    try {
      setLoading(true);
      commitMigration(analyzedRecords, stats);
      alert("Migration Completed Successfully!");
      if (onMigrateComplete) onMigrateComplete();
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert("Migration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-mono">
      <div className="bg-[#0B1528] border-2 border-cyan-700/50 rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-900/40 rounded-lg border border-cyan-800/60">
              <RefreshCw className={`w-5 h-5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Embedded FIN DIE Standard Migration Preview
              </h2>
              <p className="text-xs text-slate-400">FIN_DIE_STD_TH_2025_01_31_ROWS_15_71</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="text-slate-300 text-sm">Loading Migration Preview...</div>
          ) : (
            <>
              {/* Summary Dashboard */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">Total Records Found</div>
                  <div className="text-2xl font-bold text-cyan-400">{stats.totalEmbedded}</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">Exact Matches</div>
                  <div className="text-2xl font-bold text-green-400">{stats.exactMatches}</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">New Part Masters</div>
                  <div className="text-2xl font-bold text-blue-400">{stats.newParts}</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">Validation Errors</div>
                  <div className={`text-2xl font-bold ${stats.validationErrors > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {stats.validationErrors}
                  </div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400">Worksheet Total (EA)</div>
                  <div className={`text-2xl font-bold ${stats.grandTotal === 11281 ? 'text-green-400' : 'text-amber-400'}`}>
                    {stats.grandTotal ? stats.grandTotal.toLocaleString() : 0} 
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="border border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col">
                <div className="bg-slate-800/80 p-2 grid grid-cols-12 gap-2 text-xs font-bold text-slate-300 border-b border-slate-700 sticky top-0">
                  <div className="col-span-1">NO</div>
                  <div className="col-span-4">PART NAME ORIGINAL (TH SOURCE)</div>
                  <div className="col-span-2">MAPPING STATUS</div>
                  <div className="col-span-2 text-center">TOTAL INSTALL</div>
                  <div className="col-span-3">MAINTENANCE POLICY</div>
                </div>
                <div className="overflow-auto flex-1 divide-y divide-slate-800/50 p-1">
                  {analyzedRecords.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 text-xs text-slate-300 p-2 hover:bg-slate-800/30 items-center">
                      <div className="col-span-1 text-slate-500">{r.no}</div>
                      <div className="col-span-4 flex flex-col">
                        <span className="font-bold text-slate-100">{r.partNameOriginal}</span>
                        {r.warning && <span className="text-[10px] text-amber-500">{r.warning}</span>}
                      </div>
                      <div className="col-span-2 flex items-center">
                        {r.matchStatus === 'EXACT_MATCH' && <span className="text-green-400 bg-green-950/50 px-2 py-0.5 rounded border border-green-800/50 flex items-center gap-1"><Check className="w-3 h-3"/> EXACT</span>}
                        {r.matchStatus === 'NEW_PART' && <span className="text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-800/50">NEW PART</span>}
                        {r.matchStatus === 'VALIDATION_FAIL' && <span className="text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> INVALID</span>}
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <span className="font-bold">{r.calculatedTotal}</span>
                        {!r.totalValid && <AlertTriangle className="w-3 h-3 text-red-500" title={`Calculated: ${r.calculatedTotal}, Source: ${r.total}`} />}
                      </div>
                      <div className="col-span-3 text-[10px]">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                          {r.regrindParams.maintenancePolicy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-700/80 bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Migration Key: FIN_DIE_STD_TH_2025_01_31_ROWS_15_71
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleCommit}
              disabled={loading || stats.validationErrors > 0}
              className={`px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors ${
                loading || stats.validationErrors > 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
              }`}
            >
              <Save className="w-4 h-4" />
              COMMIT MIGRATION TO DATABASE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
