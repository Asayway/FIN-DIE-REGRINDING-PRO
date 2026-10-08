const fs = require('fs');
let code = fs.readFileSync('src/views/ShotEntryView.tsx', 'utf8');

const instructionsBox = `
            {/* Operator Instructions / Help Guide */}
            <div className={\`p-4 rounded-lg border \${
              isHmi ? 'bg-zinc-950 border-green-800 text-green-300' : 'bg-slate-900 border-slate-700 text-slate-300'
            }\`}>
              <div className="flex items-start gap-3">
                <Info className={\`w-5 h-5 mt-0.5 flex-shrink-0 \${isHmi ? 'text-green-500' : 'text-cyan-400'}\`} />
                <div>
                  <h3 className={\`text-sm font-bold uppercase tracking-wider mb-1 \${isHmi ? 'text-green-400' : 'text-white'}\`}>
                    คู่มือการใช้งานหน้านี้ (User Guide)
                  </h3>
                  <ul className="text-xs space-y-1 list-disc pl-4 font-thai">
                    <li><strong className="text-emerald-400">Mode 1: Manual Meter Reading:</strong> ใช้เมื่อคุณต้องการจดเลขจากมิเตอร์เครื่อง (Counter) โดยตรง ระบบจะคำนวณจำนวนช็อตที่เพิ่มขึ้นให้อัตโนมัติ</li>
                    <li><strong className="text-cyan-400">Mode 2: Direct PLC Increment:</strong> ใช้เมื่อคุณทราบจำนวนช็อตที่ผลิตได้ในกะนี้ และต้องการกรอกจำนวนที่บวกเพิ่มเข้าไปตรงๆ</li>
                    <li><strong>ขั้นตอนการกรอก:</strong> 1. เลือกสายการผลิต (Line) 2. เลือกกะทำงาน (Shift) 3. เลือกโหมด (Mode) 4. กรอกตัวเลขช็อต</li>
                  </ul>
                </div>
              </div>
            </div>
`;

code = code.replace("{/* Mode Selector: Method A (Manual Meter Reading) vs Method B (Direct PLC Increment) */}", instructionsBox + "\n            {/* Mode Selector: Method A (Manual Meter Reading) vs Method B (Direct PLC Increment) */}");

fs.writeFileSync('src/views/ShotEntryView.tsx', code);
