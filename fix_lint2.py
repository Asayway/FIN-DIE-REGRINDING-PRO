import sys

with open('src/components/common/ResizableReorderableTable.tsx', 'r') as f:
    content = f.read()

# Fix orderedColumns
content = content.replace(
    'const totalTableWidth = orderedColumns.reduce',
    '// moving this down'
)
content = content.replace(
    'const orderedColumns = colOrder\n    .map(id => initialColumns.find(c => c.id === id))\n    .filter((c): c is ColumnDef<T> => c !== undefined && colVisibility[c.id] !== false);',
    'const orderedColumns = colOrder\n    .map(id => initialColumns.find(c => c.id === id))\n    .filter((c): c is ColumnDef<T> => c !== undefined && colVisibility[c.id] !== false);\n\n  const totalTableWidth = orderedColumns.reduce((sum, col) => sum + (colWidths[col.id] || col.width || 140), 0);'
)

with open('src/components/common/ResizableReorderableTable.tsx', 'w') as f:
    f.write(content)

with open('src/views/PartMasterView.tsx', 'r') as f:
    content2 = f.read()

content2 = content2.replace('PartCategory, TubeSizeCompat', 'TubeSizeCompat')
content2 = content2.replace('PartCategory | \'ALL\'', '\'PUNCH\' | \'DIE\' | \'BLADE\' | \'PIN\' | \'CORNER_CUT\' | \'CENTER_PUNCH\' | \'OTHER\' | \'ALL\'')
content2 = content2.replace("import { PartMaster, TubeSizeCompat }", "import { PartMaster, TubeSizeCompat }")

with open('src/views/PartMasterView.tsx', 'w') as f:
    f.write(content2)

