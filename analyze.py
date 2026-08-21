import re
from collections import Counter

with open('frontend/public/logo.svg', 'r', encoding='utf-8') as f:
    content = f.read()

fills = re.findall(r'fill=\"(#[0-9a-fA-F]{3,6})\"', content)
print(Counter(fills).most_common(20))
