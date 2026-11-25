import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { TrendingUp, Layers, Zap, Cpu, HardHat, Wrench, ShieldCheck, DollarSign } from 'lucide-react';
import { TrueJobCostSimulationResult } from '../../types/costSaving';
import { useLanguage } from '../../i18n';

interface CostStepLadderChartProps {
  results: TrueJobCostSimulationResult;
  quantityPieces?: number;
}

interface StepLadderDatum {
  stageKey: string;
  stageName: string;
  stageTh: string;
  displayLabel: string;
  iconName: string;
  previousBase: number;
  stageCost: number;
  accumulated: number;
  color: string;
  percent: number;
  isTotal?: boolean;
}

export const CostStepLadderChart: React.FC<CostStepLadderChartProps> = ({
  results,
  quantityPieces = 1
}) => {
  const { language } = useLanguage();
  const isEn = language === 'EN' || language === 'DUAL';

  const machineDepAndMaint = Number(
    ((results.step1MachineDepreciationCost || 0) + (results.step1MaintenanceCost || 0)).toFixed(2)
  );
  const electricity = Number(results.step1ElectricityCost || 0);
  const labor = Number(results.step2TotalLaborCost || 0);
  const consumables = Number(results.step3TotalConsumables || 0);
  const others = Number(results.step4TotalQcAndOverhead || 0);
  const grandTotal = Number(results.step5GrandTotalJobCost || 0);

  // Running accumulation calculations (sums identically to grandTotal)
  const acc1 = machineDepAndMaint;
  const acc2 = Number((acc1 + electricity).toFixed(2));
  const acc3 = Number((acc2 + labor).toFixed(2));
  const acc4 = Number((acc3 + consumables).toFixed(2));
  const acc5 = Number((acc4 + others).toFixed(2));

  const data: StepLadderDatum[] = [
    {
      stageKey: 'depreciation',
      stageName: 'Machine Depreciation & Maintenance',
      stageTh: '1. ค่าเสื่อม & ซ่อมบำรุงเครื่อง',
      displayLabel: isEn ? '1. Depr. & Maint.' : '1. ค่าเสื่อม & บำรุงเครื่อง',
      iconName: 'Cpu',
      previousBase: 0,
      stageCost: machineDepAndMaint,
      accumulated: acc1,
      color: '#06b6d4', // Cyan
      percent: grandTotal > 0 ? Number(((machineDepAndMaint / grandTotal) * 100).toFixed(1)) : 0
    },
    {
      stageKey: 'electricity',
      stageName: 'Electricity Power',
      stageTh: '2. ค่าพลังงานไฟฟ้า',
      displayLabel: isEn ? '2. Electricity' : '2. ค่าพลังงานไฟฟ้า',
      iconName: 'Zap',
      previousBase: acc1,
      stageCost: electricity,
      accumulated: acc2,
      color: '#eab308', // Amber/Yellow
      percent: grandTotal > 0 ? Number(((electricity / grandTotal) * 100).toFixed(1)) : 0
    },
    {
      stageKey: 'labor',
      stageName: 'Labor, OT & Skill',
      stageTh: '3. ค่าแรงช่าง & OT',
      displayLabel: isEn ? '3. Labor & OT' : '3. ค่าแรงช่าง & OT',
      iconName: 'HardHat',
      previousBase: acc2,
      stageCost: labor,
      accumulated: acc3,
      color: '#a855f7', // Purple
      percent: grandTotal > 0 ? Number(((labor / grandTotal) * 100).toFixed(1)) : 0
    },
    {
      stageKey: 'consumables',
      stageName: 'Consumables & Wear',
      stageTh: '4. หินเจียร & สิ้นเปลือง',
      displayLabel: isEn ? '4. Consumables' : '4. หินเจียร & สิ้นเปลือง',
      iconName: 'Wrench',
      previousBase: acc3,
      stageCost: consumables,
      accumulated: acc4,
      color: '#f97316', // Orange
      percent: grandTotal > 0 ? Number(((consumables / grandTotal) * 100).toFixed(1)) : 0
    },
    {
      stageKey: 'others',
      stageName: 'QC & Workshop Utilities',
      stageTh: '5. ตรวจ QC & ส่วนกลาง',
      displayLabel: isEn ? '5. QC & Utilities' : '5. ตรวจ QC & ส่วนกลาง',
      iconName: 'ShieldCheck',
      previousBase: acc4,
      stageCost: others,
      accumulated: acc5,
      color: '#3b82f6', // Blue
      percent: grandTotal > 0 ? Number(((others / grandTotal) * 100).toFixed(1)) : 0
    },
    {
      stageKey: 'total',
      stageName: 'Total True Cost',
      stageTh: '★ สรุปต้นทุนแท้จริงรวม',
      displayLabel: isEn ? '★ Total True Cost' : '★ สรุปต้นทุนแท้จริงรวม',
      iconName: 'DollarSign',
      previousBase: 0,
      stageCost: grandTotal,
      accumulated: grandTotal,
      color: '#10b981', // Emerald
      percent: 100,
      isTotal: true
    }
  ];

  // Find dominant stage
  const stagesOnly = data.filter(d => !d.isTotal);
  const dominantStage = [...stagesOnly].sort((a, b) => b.stageCost - a.stageCost)[0] || stagesOnly[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: StepLadderDatum = payload[0]?.payload;
    if (!item) return null;

    return (
      <div className="bg-[#0b101b] border-2 border-white/20 p-3 rounded-2xl shadow-2xl font-mono text-xs text-white space-y-1.5 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="font-bold text-slate-200">{item.displayLabel}</span>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
        </div>
        <div className="text-[11px] text-slate-400">
          {item.stageName}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-400">{isEn ? 'Stage Cost:' : 'ต้นทุนในขั้นนี้:'}</span>
          <span className="font-black text-sm" style={{ color: item.color }}>
            ฿{item.stageCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        {!item.isTotal && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-1">
            <span>{isEn ? 'Cumulative Cost:' : 'สะสมจนถึงขั้นนี้:'}</span>
            <span className="font-bold text-white">
              ฿{item.accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{isEn ? 'Share of Job Cost:' : 'สัดส่วนในงานทั้งหมด:'}</span>
          <span className="font-bold text-emerald-400">{item.percent}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0d1424] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 font-sans text-white">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-mono">
              <span>
                {isEn
                  ? 'Cost Accumulation Step-Ladder Chart'
                  : 'กราฟขั้นบันไดการสะสมต้นทุน (Cost Accumulation Step-Ladder)'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                5 STAGES
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? 'Step-by-step cost buildup across Step 1 to Step 5: Depreciation & Maintenance, Power, Labor, Consumables, and QC & Utilities.'
                : 'ติดตามเส้นทางการสะสมต้นทุนทีละขั้นจนถึงต้นทุนรวมแท้จริง: ค่าเสื่อมและบำรุงเครื่อง + ค่าไฟ + ค่าแรง + สิ้นเปลือง + ค่าตรวจ QC และส่วนกลาง'}
            </p>
          </div>
        </div>

        {/* Top Dominant Stage KPI Badge */}
        {dominantStage && (
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs">
            <span className="text-[10.5px] text-slate-400">{isEn ? 'Highest Share:' : 'สัดส่วนสูงสุด:'}</span>
            <span className="font-bold text-amber-300">{dominantStage.displayLabel}</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
              ฿{dominantStage.stageCost.toLocaleString()} ({dominantStage.percent}%)
            </span>
          </div>
        )}
      </div>

      {/* Recharts Step-Ladder Chart Container */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 10, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
            <XAxis
              dataKey="displayLabel"
              stroke="#94a3b8"
              tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
              angle={-15}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickFormatter={(v) => `฿${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              domain={[0, (dataMax: number) => Math.ceil((dataMax * 1.15) / 50) * 50]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Stepped Transparent Base Bar: lifts each stage to previous accumulation level */}
            <Bar
              dataKey="previousBase"
              stackId="stepLadder"
              fill="transparent"
              isAnimationActive={false}
            />

            {/* Incremental Cost Bar: colored step brick */}
            <Bar
              dataKey="stageCost"
              stackId="stepLadder"
              radius={[6, 6, 0, 0]}
              isAnimationActive={true}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`step-brick-${index}`}
                  fill={entry.color}
                  fillOpacity={entry.isTotal ? 1 : 0.88}
                  stroke={entry.color}
                  strokeWidth={entry.isTotal ? 2 : 1}
                />
              ))}
            </Bar>

            {/* Progressive Accumulation Line across steps */}
            <Line
              type="stepAfter"
              dataKey="accumulated"
              stroke="#00FF7F"
              strokeWidth={2.5}
              dot={{ fill: '#00FF7F', stroke: '#0e1626', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#ffffff', stroke: '#00FF7F', strokeWidth: 3 }}
              isAnimationActive={true}
              name="Cumulative Total"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Stage Legend & Proportion Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono">
        {data.map((item) => (
          <div
            key={item.stageKey}
            className={`p-2 rounded-xl border flex flex-col justify-between ${
              item.isTotal 
                ? 'bg-emerald-950/40 border-emerald-500/50' 
                : 'bg-slate-950/60 border-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-300 font-semibold">{item.displayLabel}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-black text-xs" style={{ color: item.color }}>
                ฿{item.stageCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {item.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
