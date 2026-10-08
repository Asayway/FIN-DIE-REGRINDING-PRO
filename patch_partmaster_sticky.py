import sys

with open('src/views/PartMasterView.tsx', 'r') as f:
    content = f.read()

# Revert the previous sed change first
content = content.replace(
    'className="sticky top-[125px] sm:top-[110px] z-20 bg-[#0F172A]',
    'className="bg-[#0F172A]'
)

# Now wrap Header and Category Tabs in a sticky container
search_str = """      {/* Header */}
      <div className="bg-[#0F172A]"""

replace_str = """      {/* Sticky Header & Tabs Container */}
      <div className="sticky top-[130px] sm:top-[115px] z-20 space-y-4 pb-2 bg-slate-900/95 backdrop-blur-sm -mx-2 px-2">
        {/* Header */}
        <div className="bg-[#0F172A]"""

content = content.replace(search_str, replace_str)

# Find the end of category tabs
category_tabs_end = """          OTHER ({stats.other})
        </button>
      </div>"""

replace_tabs_end = """          OTHER ({stats.other})
        </button>
      </div>
      </div>"""

content = content.replace(category_tabs_end, replace_tabs_end)

with open('src/views/PartMasterView.tsx', 'w') as f:
    f.write(content)

