import sys

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# I want to add it to OPERATIONAL & MONITORING
# right after 'lock-position'

insert_str = """        {
          id: 'die-layout',
          label: 'Interactive Fin Die Layout',
          labelTh: 'แผนผังแม่พิมพ์ 2 มิติ',
          icon: Map,
          badge: 'MAP',
          badgeColor: 'bg-purple-950 text-purple-300 border-purple-500'
        },"""

content = content.replace("icon: Lock,\n          badge: 'Lock',\n          badgeColor: 'bg-red-950 text-red-300 border-red-500'\n        }\n      ]", "icon: Lock,\n          badge: 'Lock',\n          badgeColor: 'bg-red-950 text-red-300 border-red-500'\n        },\n" + insert_str + "\n      ]")

# Make sure Map is imported
content = content.replace("import {\n  Tv,", "import {\n  Tv,\n  Map,")

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)

