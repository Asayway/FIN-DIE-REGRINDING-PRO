const fs = require('fs');
let code = fs.readFileSync('src/views/ShotEntryView.tsx', 'utf8');

const regex = /\{\/\*\s*Quick Optical PLC Pulse Simulator\s*\*\/\}.*?<\/div>\s*<\/div>/s;
code = code.replace(regex, '');

fs.writeFileSync('src/views/ShotEntryView.tsx', code);
