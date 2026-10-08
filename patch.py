import sys

with open('src/views/UnifiedToolingMasterView.tsx', 'r') as f:
    content = f.read()

btn_code = """
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 border ${
              activeTab === 'spreadsheet'
                ? isHmi 
                  ? 'bg-green-500 text-black border-green-400 shadow-md font-extrabold'
                  : 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md font-bold'
                : isHmi
                  ? 'bg-zinc-950 text-green-400 border-green-900 hover:bg-zinc-900'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <DatabaseZap className="w-4 h-4" />
            <span>★ MASTER SPREADSHEET (Excel View)</span>
          </button>
"""

content = content.replace("          <button\n            onClick={() => setActiveTab('unified-settings')}", btn_code + "\n          <button\n            onClick={() => setActiveTab('unified-settings')}")

tab_content = """
      {activeTab === 'spreadsheet' && (
        <div className="pt-2">
          <FinDieSpreadsheetGrid />
        </div>
      )}
"""

content = content.replace("{/* TAB CONTENTS */}", "{/* TAB CONTENTS */}" + tab_content)

with open('src/views/UnifiedToolingMasterView.tsx', 'w') as f:
    f.write(content)

