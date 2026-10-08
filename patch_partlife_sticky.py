import sys

with open('src/views/PartLifeStandardSetupView.tsx', 'r') as f:
    content = f.read()

# Revert previous sed
content = content.replace(
    'className="sticky top-[125px] sm:top-[110px] z-20 bg-[#0F172A]',
    'className="bg-[#0F172A]'
)

# For PartLifeStandardSetupView
search_str1 = """      {/* Header Section */}
      <div className="bg-[#0F172A]"""

replace_str1 = """      {/* Sticky Header Container */}
      <div className="sticky top-[130px] sm:top-[115px] z-20 pb-2 bg-slate-900/95 backdrop-blur-sm -mx-2 px-2">
        {/* Header Section */}
        <div className="bg-[#0F172A]"""

content = content.replace(search_str1, replace_str1, 1)

# The end of the first header section is:
#           </button>
#         </div>
#       </div>
# 
#       {feedback && (
end_header1 = """          </button>
        </div>
      </div>"""

replace_end_header1 = """          </button>
        </div>
      </div>
      </div>"""

content = content.replace(end_header1, replace_end_header1, 1)

# For InstallQuantitySetupView
search_str2 = """      {/* Header Section */}
      <div className="bg-[#0F172A]"""

replace_str2 = """      {/* Sticky Header Container */}
      <div className="sticky top-[130px] sm:top-[115px] z-20 pb-2 bg-slate-900/95 backdrop-blur-sm -mx-2 px-2">
        {/* Header Section */}
        <div className="bg-[#0F172A]"""

content = content.replace(search_str2, replace_str2, 1)

end_header2 = """          </button>
        </div>
      </div>"""

replace_end_header2 = """          </button>
        </div>
      </div>
      </div>"""

# Only replace the last occurrence for InstallQuantitySetupView
parts = content.rsplit(end_header2, 1)
content = replace_end_header2.join(parts)

with open('src/views/PartLifeStandardSetupView.tsx', 'w') as f:
    f.write(content)

