import fs from 'fs';

const file = 'src/components/layout/Sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('line-configuration')) {
  code = code.replace(
    /id: 'part-master'/,
    "id: 'line-configuration',\n          label: 'Line Configuration',\n          labelTh: 'กำหนดสเปกแม่พิมพ์/วัสดุ',\n          icon: Settings2\n        },\n        {\n          id: 'part-master'"
  );
  fs.writeFileSync(file, code);
  console.log('Sidebar patched');
}
