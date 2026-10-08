import fs from 'fs';

const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('LineConfigurationView')) {
  code = code.replace(
    /import \{ PartMasterView \}/,
    "import { LineConfigurationView } from './views/LineConfigurationView';\nimport { PartMasterView }"
  );
  code = code.replace(
    /case 'part-master':/,
    "case 'line-configuration':\n        return <LineConfigurationView />;\n      case 'part-master':"
  );
  fs.writeFileSync(file, code);
  console.log('App.tsx patched');
}
