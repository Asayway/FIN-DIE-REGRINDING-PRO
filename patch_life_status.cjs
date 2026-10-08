const fs = require('fs');
const file = 'src/services/calculationService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/export function determineLifeStatus\([\s\S]*?\): LifeStatus {[\s\S]*?return 'NORMAL';\n}/, `export function determineLifeStatus(
  usagePercent: number | null | undefined,
  isStandardMissing: boolean = false,
  isDataError: boolean = false
): LifeStatus {
  if (isDataError) return 'DATA_ERROR';
  
  if (isStandardMissing || usagePercent === null || usagePercent === undefined || isNaN(usagePercent)) {
    return 'STANDARD_MISSING';
  }

  const settings = storageService.getSettings();
  const warningTh = settings?.warningThresholdPercent ?? 70;
  const prepareTh = settings?.prepareThresholdPercent ?? 85;
  const criticalTh = settings?.criticalThresholdPercent ?? 95;

  if (usagePercent >= 100) return 'OVER_LIFE';
  if (usagePercent >= criticalTh) return 'CRITICAL';
  if (usagePercent >= prepareTh) return 'PREPARE';
  if (usagePercent >= warningTh) return 'WARNING';
  
  return 'NORMAL';
}`);

fs.writeFileSync(file, code);
