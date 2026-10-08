import sys

with open('src/views/UnifiedToolingMasterView.tsx', 'r') as f:
    content = f.read()

# Fix sticky padding issue
content = content.replace(
    'className={`sticky top-0 z-30 backdrop-blur-md rounded-xl p-3 sm:p-4 shadow-2xl space-y-3 border',
    'className={`sticky top-[-1rem] lg:top-[-1.5rem] z-30 backdrop-blur-md rounded-xl p-3 sm:p-4 shadow-2xl space-y-3 border'
)

with open('src/views/UnifiedToolingMasterView.tsx', 'w') as f:
    f.write(content)

