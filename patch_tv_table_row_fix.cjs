const fs = require('fs');
const file = 'src/components/tv/TvTableRow.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/  \}\n  \}\n\n  \/\/ Life Time \(Days\)/, `  }\n\n  // Life Time (Days)`);
fs.writeFileSync(file, code);
