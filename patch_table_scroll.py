import sys

with open('src/components/common/ResizableReorderableTable.tsx', 'r') as f:
    content = f.read()

# Add useRef import
content = content.replace("import React, { useState }", "import React, { useState, useRef }")
content = content.replace("import {\n  ArrowLeft,", "import {\n  ArrowLeft,\n  ArrowRight,\n  ChevronLeft,\n  ChevronRight,")

# Add ref inside component
content = content.replace("const [showColSettings, setShowColSettings] = useState(false);", "const [showColSettings, setShowColSettings] = useState(false);\n  const tableContainerRef = useRef<HTMLDivElement>(null);\n\n  const scrollTable = (direction: 'left' | 'right') => {\n    if (tableContainerRef.current) {\n      const scrollAmount = 300;\n      tableContainerRef.current.scrollBy({\n        left: direction === 'left' ? -scrollAmount : scrollAmount,\n        behavior: 'smooth'\n      });\n    }\n  };")

# Add buttons to toolbar
buttons_str = """        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded mr-2">
            <button
              type="button"
              onClick={() => scrollTable('left')}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-l transition-colors"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-700"></div>
            <button
              type="button"
              onClick={() => scrollTable('right')}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-r transition-colors"
              title="เลื่อนขวา"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
"""

content = content.replace('<div className="flex items-center gap-2">', buttons_str, 1)

# Attach ref to container
content = content.replace('<div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070F1E] shadow-inner custom-scrollbar">', '<div ref={tableContainerRef} className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070F1E] shadow-inner custom-scrollbar">')

with open('src/components/common/ResizableReorderableTable.tsx', 'w') as f:
    f.write(content)

