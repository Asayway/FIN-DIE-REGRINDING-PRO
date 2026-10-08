const fs = require('fs');
const file = 'src/components/tv/TvTableRow.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Determine low stock \/ order require logic matching industrial monitor criteria[\s\S]*?const needsOrder = [^;]+;/;
const replacement = `// Use calculated metrics for Order Require
  const isLowStock = item.stockStatus === 'OUT_OF_STOCK' || item.stockStatus === 'LOW_STOCK' || (availableSpareVal !== undefined && availableSpareVal <= 0);
  const isOrderFlagged = item.orderStatus === 'PO OPEN' || item.orderStatus === 'PR PREPARING' || item.orderStatus === 'ORDERED';
  const isCriticalWear = item.lifeStatus === 'CRITICAL' || item.lifeStatus === 'OVER_LIFE';

  const needsOrder = isLowStock || isOrderFlagged || isCriticalWear;`;

if(regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Patched needsOrder");
} else {
    console.log("Could not find regex");
}
