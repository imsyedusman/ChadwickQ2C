
import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple count
    opens = len(re.findall(r'<div', content))
    closes = len(re.findall(r'</div', content))
    self_closing = len(re.findall(r'<div[^>]*/>', content))
    
    print(f"Total <div: {opens}")
    print(f"Total </div: {closes}")
    print(f"Self-closing: {self_closing}")
    print(f"Expected closes: {opens - self_closing}")
    
    if (opens - self_closing) != closes:
        print("IMBALANCE DETECTED!")
        
    # Stack trace
    lines = content.splitlines()
    stack = []
    for i, line in enumerate(lines):
        # This is very naive but helps find the line where things go wrong
        # Find all tags in line
        tags = re.findall(r'<(div)|</(div)>', line)
        for open_tag, close_tag in tags:
            if open_tag:
                # Check if self-closing
                if not re.search(r'<div[^>]*/>', line):
                    stack.append((i+1, line.strip()))
            if close_tag:
                if stack:
                    stack.pop()
                else:
                    print(f"EXTRA CLOSE at line {i+1}: {line.strip()}")
    
    for line_num, text in stack:
        print(f"STILL OPEN from line {line_num}: {text}")

if __name__ == "__main__":
    check_tags('app/projects/group/[name]/page.tsx')
