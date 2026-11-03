# Implementation Plan: Concise Localized Headers & 100% Synchronized Queue Ticket Modal

We will refine the Unified Master Logs view to make column headers concise and clean in both Thai and English, and connect the "จัดการ" (Actions) eye button directly to the editable `UnifiedRegrindJobModal` (ใบลงคิวงาน) for 100% synchronized data updates.

---

## 1. Objectives & Scope

### A. Concise Localized Column Headers (TH / EN)
- Condense the 20 table column headers into short, clean, crisp labels.
- Support dual-language toggling based on active system language (`TH` / `EN` / `DUAL`):
  1. `#`
  2. `สถานะ` / `Status`
  3. `Job Code`
  4. `วันที่` / `Date`
  5. `ไลน์` / `Line`
  6. `แม่พิมพ์` / `Die Code`
  7. `ชื่อชิ้นงาน` / `Part Name`
  8. `Drawing` / `Drawing Code`
  9. `จำนวน` / `Qty`
  10. `สเปคซื้อใหม่` / `New Spec`
  11. `ก่อนเจียร` / `Current Height`
  12. `หลังเจียร` / `Height After`
  13. `ระยะ Min` / `Scrap Limit`
  14. `สาเหตุ` / `Defect Reason`
  15. `เวลาเจียร (นาที)` / `Labor Time (Min)`
  16. `ค่าแรง` / `Labor Cost`
  17. `ราคาซื้อใหม่` / `New Price`
  18. `ประหยัดสุทธิ` / `Net Saving`
  19. `Saving %`
  20. `ช่างเจียร` / `Operator`
  21. `หมายเหตุ` / `Remarks`
  22. `จัดการ` / `Actions`

### B. 100% Synchronized Queue Ticket Modal (`UnifiedRegrindJobModal`)
- When the user clicks the action button (`Eye` icon) in any table row:
  - Find or reconstruct the corresponding `RegrindWorkTicket` (ใบลงคิวงาน) linked by `jobCode` or `id`.
  - Open `UnifiedRegrindJobModal` in edit mode populated with all exact ticket parameters.
  - Upon saving in `UnifiedRegrindJobModal`, update both:
    1. The queue ticket in `regrindService`
    2. The master log record in `storageService`
  - Re-render table and update stats instantly with 100% data consistency.

---

## 2. Target Files & Changes

1. **`src/views/regrinding/UnifiedMasterLogsView.tsx`**:
   - Add current system language state (`language` from `storageService.getSettings().language`).
   - Replace table header text with concise localized dictionaries (TH vs EN).
   - In row action handler, look up matching `RegrindWorkTicket` via `regrindService.getQueueTickets()` (or derive ticket if legacy) and set `editingTicket` + open `UnifiedRegrindJobModal`.
   - Re-subscribe to storage/regrind service updates.

2. **`src/services/regrindService.ts`**:
   - Ensure `updateQueueTicket` and `recordRegrind` keep master log entries and queue tickets synchronized 100%.

3. **`src/utils/excelExport.ts`**:
   - Update `exportRegrindingHistoryExcel` column headers to match the localized concise names according to the selected language.

---

## 3. Verification Plan

1. **Build & Type Checking**:
   - Run `compile_applet` and `lint_applet` to verify 0 errors.
2. **Interactive Testing**:
   - Open Unified Master Logs table, test language toggle between TH and EN.
   - Click "จัดการ" (Actions) button on a row to verify the `UnifiedRegrindJobModal` opens as an editable ticket.
   - Modify dimensions, technician, or remarks, then save. Confirm table row and modal data update 100% synchronously.
