const fs = require('fs');
const file = 'src/components/tv/TvTableRow.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace progress fill color logic
code = code.replace(/let progressFillColor = '#00ff00'; \/\/ Normal green[\s\S]*?\}[\s\S]*?\}/, `let progressFillColor = '#00ff00'; // Normal green
  if (item.lifeLimit > 0) {
    if (item.lifeStatus === 'OVER_LIFE' || item.lifeStatus === 'CRITICAL' || isCriticalWear || percentVal >= 100) {
      progressFillColor = '#ff0000'; // Over life red
    } else if (item.lifeStatus === 'PREPARE') {
      progressFillColor = '#f97316'; // Prepare orange
    } else if (item.lifeStatus === 'WARNING') {
      progressFillColor = '#ffff00'; // Warning yellow
    }
  }`);

// Replace shotBgClass logic
code = code.replace(/let shotBgClass = 'bg-\[#000000\] text-white';[\s\S]*?\}[\s\S]*?\}/, `let shotBgClass = 'bg-[#000000] text-white';
  if (item.lifeLimit > 0) {
    if (item.lifeStatus === 'OVER_LIFE' || item.lifeStatus === 'CRITICAL' || percentVal >= 100) {
      shotBgClass = 'bg-[#ff0000] text-white';
    } else if (item.lifeStatus === 'PREPARE') {
      shotBgClass = 'bg-[#f97316] text-white';
    } else if (item.lifeStatus === 'WARNING') {
      shotBgClass = 'bg-[#ffff00] text-black';
    } else {
      shotBgClass = 'bg-[#00ff00] text-black';
    }
  }`);

fs.writeFileSync(file, code);
