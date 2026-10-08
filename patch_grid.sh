sed -i 's/regrind?.isDisposable/regrind?.disposeAfterOneUse/g' src/components/spreadsheet/FinDieSpreadsheetGrid.tsx
sed -i 's/regrind.isDisposable = true/regrind.disposeAfterOneUse = true/g' src/components/spreadsheet/FinDieSpreadsheetGrid.tsx
sed -i 's/regrind.isDisposable = false/regrind.disposeAfterOneUse = false/g' src/components/spreadsheet/FinDieSpreadsheetGrid.tsx
sed -i 's/const modifications = Object.values(dirtyRows);/const modifications = Object.values(dirtyRows) as any[];/g' src/components/spreadsheet/FinDieSpreadsheetGrid.tsx
