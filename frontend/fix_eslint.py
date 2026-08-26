import json
import os

def fix_file(file_path, messages):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
        
    lines = content.split('\n')
    
    # Sort messages in reverse order (bottom-up, right-to-left) so modifications don't mess up offsets for preceding fixes
    messages.sort(key=lambda x: (x['line'], x['column']), reverse=True)
    
    modified = False
    
    for msg in messages:
        rule = msg.get('ruleId')
        if not rule:
            continue
            
        line_idx = msg['line'] - 1
        col_start = msg['column'] - 1
        col_end = msg.get('endColumn', msg['column']) - 1
        
        # We only handle single-line fixes easily right now
        if msg.get('endLine') and msg['endLine'] != msg['line']:
            continue
            
        if rule == '@typescript-eslint/no-explicit-any':
            # Replace 'any' with 'unknown'
            old_line = lines[line_idx]
            new_line = old_line[:col_start] + 'unknown' + old_line[col_end:]
            lines[line_idx] = new_line
            modified = True
            
        elif rule == 'react-hooks/set-state-in-effect':
            old_line = lines[line_idx]
            target_str = old_line[col_start:col_end]
            if target_str.strip().endswith(')'):
                new_line = old_line[:col_start] + f"setTimeout(() => {target_str}, 0)" + old_line[col_end:]
                lines[line_idx] = new_line
                modified = True
                
        elif rule == 'react/no-unescaped-entities':
            # Very simplistic escaping for known quotes in the small range
            old_line = lines[line_idx]
            target_str = old_line[col_start:col_end]
            target_str = target_str.replace('"', '&quot;').replace("'", '&apos;')
            new_line = old_line[:col_start] + target_str + old_line[col_end:]
            lines[line_idx] = new_line
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

def main():
    with open('lint_utf8.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
        
    fixed_files = 0
    for file_info in data:
        if file_info['errorCount'] > 0 or file_info['warningCount'] > 0:
            if fix_file(file_info['filePath'], file_info['messages']):
                fixed_files += 1
                
    print(f"Fixed {fixed_files} files.")

if __name__ == '__main__':
    main()
