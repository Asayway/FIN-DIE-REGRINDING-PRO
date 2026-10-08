import sys

with open('src/views/UnifiedToolingMasterView.tsx', 'r') as f:
    content = f.read()

import re

# Remove the button for spreadsheet
content = re.sub(r'<\s*button[^>]*onClick={\(\)\s*=>\s*setActiveTab\(\'spreadsheet\'\)}[\s\S]*?<\s*/\s*button\s*>', '', content)

# Remove the button for unified-settings
content = re.sub(r'<\s*button[^>]*onClick={\(\)\s*=>\s*setActiveTab\(\'unified-settings\'\)}[\s\S]*?<\s*/\s*button\s*>', '', content)

# Remove spreadsheet tab content
content = re.sub(r'{\s*activeTab\s*===\s*\'spreadsheet\'\s*&&\s*\([\s\S]*?\)\s*}', '', content)

# Remove unified-settings tab content
content = re.sub(r'{\s*activeTab\s*===\s*\'unified-settings\'\s*&&\s*\([\s\S]*?\)\s*}', '', content)


with open('src/views/UnifiedToolingMasterView.tsx', 'w') as f:
    f.write(content)

