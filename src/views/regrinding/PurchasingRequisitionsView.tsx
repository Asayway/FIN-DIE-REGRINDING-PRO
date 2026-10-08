import React from 'react';
import { PurchasingRequisitionItem } from '../../types/regrind';
import { ShoppingCart, CheckCircle2, Clock, AlertTriangle, FileText, Download, Building2 } from 'lucide-react';

interface PurchasingRequisitionsViewProps {
  requisitions: PurchasingRequisitionItem[];
  onApprove?: (id: string) => void;
}

export const PurchasingRequisitionsView: React.FC<PurchasingRequisitionsViewProps> = ({
  requisitions,
  onApprove
}) => {
  const totalSpendThb = requisitions.reduce((sum, item) => sum + item.estimatedCostThb, 0);
  const pendingCount = requisitions.filter(r => r.status === 'PENDING_APPROVAL').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>ใบขอสั่งซื้อทดแทนอะไหล่ที่หมดสเปค (Purchasing Requisitions)</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Auto-Generated PR
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              สร้างอัตโนมัติเมื่อทูลลิ่งถูกตัดทิ้ง (Scrap) หรือความยาวต่ำกว่าเกณฑ์ความปลอดภัย
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-semibold">มูลค่ารวมที่เสนอสั่งซื้อ</div>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white">
              ฿{totalSpendThb.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3">เลขที่ใบขอสั่งซื้อ (PR No.)</th>
              <th className="p-3">ชื่อรายการทูลลิ่ง (Tooling Item)</th>
              <th className="p-3">สายการผลิต</th>
              <th className="p-3 text-center">จำนวนที่เสนอซื้อ</th>
              <th className="p-3">ประมาณการราคา</th>
              <th className="p-3">สาเหตุการเสนอซื้อ</th>
              <th className="p-3">สถานะ (Status)</th>
              <th className="p-3 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {requisitions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  ไม่มีใบขอสั่งซื้อที่รอดำเนินการ
                </td>
              </tr>
            ) : (
              requisitions.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {item.prNumber}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-white">{item.partName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.partCode}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                    Line {item.lineId}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {item.quantityRequested} ชิ้น
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-900 dark:text-white">
                    ฿{item.estimatedCostThb.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      ชิ้นงานหมดสเปค / ทิ้ง (Scrapped)
                    </span>
                  </td>
                  <td className="p-3">
                    {item.status === 'PENDING_APPROVAL' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> รออนุมัติ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="ส่งออกเอกสาร PR ไปยังฝ่ายจัดซื้อ"
                    >
                      Export PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
