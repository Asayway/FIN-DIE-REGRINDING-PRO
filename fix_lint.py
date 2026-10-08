import sys

with open('src/components/common/ResizableReorderableTable.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'import {\n  ArrowLeft,\n  ArrowRight,\n  ChevronLeft,\n  ChevronRight,\n  Eye,',
    'import {\n  ArrowLeft,\n  ArrowRight,\n  ChevronLeft,\n  ChevronRight,\n  Eye,'
)
if 'ChevronLeft' not in content[:500]:
    content = content.replace('ArrowRight,', 'ArrowRight,\n  ChevronLeft,\n  ChevronRight,')

with open('src/components/common/ResizableReorderableTable.tsx', 'w') as f:
    f.write(content)

with open('src/views/PartLifeStandardSetupView.tsx', 'r') as f:
    content2 = f.read()

content2 = content2.replace(
    '(s.regrindDepthPerTime ?? parseFloat(s.regrindStandard?.oneTimeRegrindMm || \'0.20\') || 0.20).toFixed(2)',
    '(s.regrindDepthPerTime ?? (parseFloat(s.regrindStandard?.oneTimeRegrindMm || \'0.20\') || 0.20)).toFixed(2)'
)

with open('src/views/PartLifeStandardSetupView.tsx', 'w') as f:
    f.write(content2)

