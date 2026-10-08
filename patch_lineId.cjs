const fs = require('fs');
let code = fs.readFileSync('src/views/LineConfigurationView.tsx', 'utf8');
code = code.replace(/if \(config.lineId === 'E3'\)/g, "if (config.lineId.startsWith('E3'))");
fs.writeFileSync('src/views/LineConfigurationView.tsx', code);
