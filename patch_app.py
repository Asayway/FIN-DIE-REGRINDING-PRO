import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

# Remove LineConfigurationView import
content = re.sub(r'import { LineConfigurationView } from \'./views/LineConfigurationView\';\n?', '', content)

# Replace 'unified-settings' with 'install' where initialTab="unified-settings"
content = content.replace('initialTab="unified-settings"', 'initialTab="install"')

# Replace 'spreadsheet' with 'install' where initialTab="spreadsheet"
content = content.replace('initialTab="spreadsheet"', 'initialTab="install"')

with open('src/App.tsx', 'w') as f:
    f.write(content)
