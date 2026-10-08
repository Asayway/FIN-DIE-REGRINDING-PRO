const fs = require('fs');
let code = fs.readFileSync('src/views/LineConfigurationView.tsx', 'utf8');
code = code.replace(/\\`\\\${editForm\.pathsCount}P\\`/g, "`${editForm.pathsCount}P`");
code = code.replace(/^`/gm, '');
fs.writeFileSync('src/views/LineConfigurationView.tsx', code);
