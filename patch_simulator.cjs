const fs = require('fs');
let code = fs.readFileSync('src/views/ShotEntryView.tsx', 'utf8');
code = code.replace(/<div className="flex items-center justify-between mt-8 p-3 rounded-xl border border-dashed[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
fs.writeFileSync('src/views/ShotEntryView.tsx', code);
