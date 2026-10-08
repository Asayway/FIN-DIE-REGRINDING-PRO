sed -i '/import { UnifiedLineSettingView }/d' src/views/UnifiedToolingMasterView.tsx
sed -i '/import { FinDieSpreadsheetGrid }/d' src/views/UnifiedToolingMasterView.tsx
sed -i "s/initialTab?: 'unified-settings' | 'standards' | 'master' | 'install';/initialTab?: 'standards' | 'master' | 'install';/g" src/views/UnifiedToolingMasterView.tsx
sed -i "s/initialTab = 'spreadsheet'/initialTab = 'install'/g" src/views/UnifiedToolingMasterView.tsx
sed -i "s/useState<'spreadsheet' | 'unified-settings' | 'standards' | 'master' | 'install'>(initialTab)/useState<'standards' | 'master' | 'install'>(initialTab)/g" src/views/UnifiedToolingMasterView.tsx
