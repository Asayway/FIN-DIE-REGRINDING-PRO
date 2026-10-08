import sys

with open('src/components/common/ResizableReorderableTable.tsx', 'r') as f:
    content = f.read()

# Add topScrollRef
content = content.replace(
    'const tableContainerRef = useRef<HTMLDivElement>(null);',
    'const tableContainerRef = useRef<HTMLDivElement>(null);\n  const topScrollRef = useRef<HTMLDivElement>(null);'
)

# Sync functions
sync_funcs = """
  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  const totalTableWidth = orderedColumns.reduce((sum, col) => sum + (colWidths[col.id] || col.width || 140), 0);
"""

content = content.replace('const handleResizeStart =', sync_funcs + '\n  const handleResizeStart =')

# Top scrollbar UI
top_scroll_ui = """
      {/* Top Scrollbar (Synced) */}
      <div 
        ref={topScrollRef} 
        onScroll={handleTopScroll}
        className="overflow-x-auto overflow-y-hidden custom-scrollbar"
        style={{ marginBottom: '-8px' }}
      >
        <div style={{ width: `${totalTableWidth}px`, height: '1px' }}></div>
      </div>

      {/* Main Resizable & Scrollable Table */}
      <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070F1E] shadow-inner custom-scrollbar">
"""

content = content.replace(
    '{/* Main Resizable & Scrollable Table */}\n      <div ref={tableContainerRef} className="overflow-x-auto border border-slate-800 rounded-xl bg-[#070F1E] shadow-inner custom-scrollbar">',
    top_scroll_ui
)

with open('src/components/common/ResizableReorderableTable.tsx', 'w') as f:
    f.write(content)

