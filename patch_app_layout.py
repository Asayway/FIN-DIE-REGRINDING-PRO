import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import
import_str = "import { InteractiveDieLayoutView } from './views/InteractiveDieLayoutView';\n"
content = content.replace("import { LockPositionView } from './views/LockPositionView';", "import { LockPositionView } from './views/LockPositionView';\n" + import_str)

# Add case to renderActiveView()
case_str = """      case 'die-layout':
        return <InteractiveDieLayoutView />;"""

content = content.replace("case 'lock-position':\n        return <LockPositionView initialLineId={targetLineId} />;", "case 'lock-position':\n        return <LockPositionView initialLineId={targetLineId} />;\n" + case_str)

with open('src/App.tsx', 'w') as f:
    f.write(content)
