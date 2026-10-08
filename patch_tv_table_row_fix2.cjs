const fs = require('fs');
const file = 'src/components/tv/TvTableRow.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/  \} else \{\n      shotBgClass = 'bg-\[#00ff00\] text-black';\n    \}\n  \}/, `  }`);
fs.writeFileSync(file, code);
