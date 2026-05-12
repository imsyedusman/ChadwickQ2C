
import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comments to avoid false positives
    content = re.sub(r'{\s*/\*.*?\*/\s*}', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    
    lines = content.splitlines()
    stack = []
    
    # Simple regex for <div and </div
    # Note: this is a heuristic, won't handle all JSX edge cases but good for divs
    for i, line in enumerate(lines):
        # Find all <div (not followed by /)
        opens = re.findall(r'<div(?![^>]*/>)', line)
        for _ in opens:
            stack.append((i + 1, line.strip()))
            
        closes = re.findall(r'</div', line)
        for _ in closes:
            if stack:
                stack.pop()
            else:
                print(f"EXTRA CLOSE at line {i+1}: {line.strip()}")
                
    for line_num, text in stack:
        print(f"UNCLOSED DIV from line {line_num}: {text}")

if __name__ == "__main__":
    check_tags('app/projects/group/[name]/page.tsx')
