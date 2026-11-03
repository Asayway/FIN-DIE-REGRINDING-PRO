# แผนการพัฒนา: ปรับปรุงหน้าสเปคแม่พิมพ์ไลน์ผลิตแบบ Unified Matrix Table รวมทุกไลน์ในหน้าเดียว

## 1. วัตถุประสงค์ (Objective)
ปรับปรุงหน้า **"1. สเปคแม่พิมพ์ไลน์" (`LineDieSpecificationView.tsx`)** ให้สามารถตั้งค่าสเปกแม่พิมพ์และสถานะการทำงานของทุกไลน์ผลิต (**E1, E2, E3-1, E3-2, E3-3, E4, E5 รวม 7 ไลน์**) ในรูปแบบตาราง **Unified Matrix Table** กะทัดรัด ครบถ้วนในหน้าจอเดียว และลบแถบการสลับแยกแต่ละไลน์เดี่ยวออกตามความต้องการของผู้ใช้

---

## 2. รายละเอียดการปรับปรุง (Implementation Details)

### 2.1 ลบแถบเลือกไลน์แยกเดี่ยว (Remove Individual Line Tabs)
- นำแถบเลือก `LINE: ALL LINES | E1 | E2 | E3-1 | E3-2 | E3-3 | E4 | E5` ออก
- นำการ์ดขนาดใหญ่แบบแยกแสดงทีละไลน์ออกทั้งหมด เพื่อไม่ให้เปลืองพื้นที่หน้าจอ

### 2.2 ออกแบบ Unified All-Lines Matrix Table (ตารางรวม 7 ไลน์ในหน้าเดียว)
สร้างตารางกะทัดรัด (Industrial Compact Dark Table) โดยแต่ละแถวแสดง 1 ไลน์ผลิต ประกอบด้วยคอลัมน์:
1. **Line ID & Tag (ไลน์ผลิต)**: รหัสไลน์ (E1, E2, E3-1, E3-2, E3-3, E4, E5) พร้อม Badge สีระบุประเภท (เช่น Ø7 Slit, Ø5 Slit, WL+ 4P ฯลฯ)
2. **Operational Status (สถานะการผลิต)**: ดรอปดาวน์เลือกสถานะ `🟢 RUNNING`, `🟡 IDLE`, `🔧 MAINTENANCE`, `🔴 STOPPED` พร้อม Badge สีเตือนชัดเจน
3. **Tube Size (ขนาดท่อ)**: ตัวเลือกดรอปดาวน์ (Ø7, Ø5, Ø9.52, Ø8, Ø6.35)
4. **Fin Type (ลายฟิน)**: ตัวเลือกดรอปดาวน์ (Slit Old, Slit (half), New Slit, Louver, Wide Louver, New Corrugate ฯลฯ)
5. **Pitch / Die Spec (ระยะพิตช์)**: ตัวเลือกดรอปดาวน์ (3P, 4P)
6. **Fin Material (ชนิดฟอยล์/วัสดุ)**: ดรอปดาวน์ (PCM 0.1mm, BARE 0.1mm, GOLD 0.1mm)
7. **Die Code & Name (รหัสแม่พิมพ์)**: กล่องป้อนข้อมูลตัวอักษรแบบ Compact Font
8. **Default SPM (ความเร็วรอบ)**: กล่องป้อนตัวเลข SPM
9. **E3 Active Fin Die Selector**: แถบควบคุมสถานะการเปิดใช้งาน Fin Die ของเครื่อง E3 (E3-1, E3-2, E3-3) แบบกะทัดรัดในตัว

### 2.3 การเชื่อมโยงข้อมูลและการบันทึก (Data Sync & Storage)
- เมื่อผู้ใช้เปลี่ยนค่าใน Dropdown หรือแก้ไข Text Input ระบบจะเรียก `handleFieldChange` หรือ `handleStatusChange` อัปเดตข้อมูลลง `storageService` ทันที
- เมื่อเลือกสถานะของ E3 ไลน์ใดเป็น `RUNNING` จะสลับ Active E3 Die ให้อัตโนมัติ พร้อมแจ้งเตือน Toast Message
- รองรับปุ่ม Quick Action เช่น รีเซ็ตค่าเริ่มต้น (Reset Defaults) หรือ บันทึกภาพรวม (Save All)

---

## 3. ขั้นตอนการตรวจสอบและทดสอบ (Verification & Testing)
1. ตรวจสอบว่าหน้าจอแสดงผลทั้ง 7 ไลน์พร้อมกันครบถ้วนในตารางเดียว ไม่ต้องกดแท็บเปลี่ยนไลน์
2. ทดสอบการเปลี่ยนสถานะผ่าน Dropdown แต่ละไลน์ (RUNNING, IDLE, MAINTENANCE, STOPPED) ว่าเปลี่ยนสีและบันทึกถูกต้อง
3. ทดสอบการแก้ไข Tube Size, Fin Type, Pitch, Material, Die Code, SPM
4. รัน `lint_applet` และ `compile_applet` เพื่อยืนยันว่าไม่มีข้อผิดพลาด
