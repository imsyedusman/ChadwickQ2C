
import re

def check_all_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove self-closing tags
    content = re.sub(r'<[a-zA-Z0-9]+[^>]*/>', '', content)
    
    # Find all opening and closing tags
    tags = re.findall(r'<(/?)([a-zA-Z0-9]+)', content)
    
    stack = []
    for i, (is_close, tag) in enumerate(tags):
        if is_close:
            if not stack:
                print(f"EXTRA CLOSE: </{tag}> at position {i}")
                continue
            last_tag = stack.pop()
            if last_tag != tag:
                print(f"MISMATCH: Expected </{last_tag}>, got </{tag}> at position {i}")
                # Try to recover by searching stack
                if tag in stack:
                    while stack:
                        t = stack.pop()
                        if t == tag:
                            break
        else:
            stack.append(tag)
            
    if stack:
        print(f"UNCLOSED TAGS: {stack}")
    else:
        print("ALL TAGS BALANCED!")

if __name__ == "__main__":
    check_all_tags('app/projects/group/[name]/page.tsx')
