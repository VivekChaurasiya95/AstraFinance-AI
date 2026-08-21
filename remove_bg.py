import re

with open('frontend/public/logo.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# The checkered pattern is likely #f2f3f3 and #d6d6d6.
# Let's remove the <path> elements that have these fills.
# Since the paths could be huge, we'll use a regex that matches <path ... />

def replacer(match):
    # If the path has fill="#f2f3f3" or fill="#d6d6d6", remove it
    tag = match.group(0)
    if 'fill="#f2f3f3"' in tag or 'fill="#d6d6d6"' in tag:
        return ""
    return tag

new_content = re.sub(r'<path[^>]*>', replacer, content)

with open('frontend/public/logo.svg', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Removed background paths.")
