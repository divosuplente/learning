#!/usr/bin/env python3
import os
import re

source_dir = os.path.expanduser('~/ws/learning/java-spring-boot-course')
target_dir = os.path.expanduser('~/ws/learning/site/src/content/docs')

filenames = [
    '00-java-foundations.md',
    '01-build-tools-and-project-setup.md',
    '02-dependency-injection.md',
    '03-spring-boot-fundamentals.md',
    '04-repository-pattern.md',
    '05-service-architecture.md',
    '06-kafka.md',
    '07-graphql.md',
    '08-reactor-pattern.md',
    '09-tdd.md',
    '10-capstone-project.md',
    '11-migrating-to-kotlin.md',
]

def process(content):
    # Remove TOC <details> blocks (without class="submodule")
    content = re.sub(r'<details(?![^>]*class="submodule")[^>]*>.*?</details>', '', content, flags=re.DOTALL)

    # Remove markdown TOC block: consecutive lines at top that look like list items
    lines = content.splitlines()
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == '':
            i += 1
            continue
        # Detect TOC line: starts with optional spaces then '-', '*', or digit+.
        if re.match(r'^\s*[-*]\s+\[.*\]\(.*\)', line) or re.match(r'^\s*\d+\.\s+\[.*\]\(.*\)', line):
            i += 1
            continue
        else:
            # First non-TOC line
            new_lines.append(line)
            i += 1
            # Append the rest of the file unchanged
            new_lines.extend(lines[i:])
            break
    content = '\n'.join(new_lines)

    # Remove any horizontal rule (---) that follows the removed TOC block
    content = re.sub(r'\n---\n', '\n', content)

    # Extract title from first H1 line
    m = re.search(r'^[#]{1}\s*(.+)', content, flags=re.MULTILINE)
    if m:
        title = m.group(1).strip()
        # Remove the H1 line
        content = re.sub(r'^[#]{1}\s*.+\n', '', content, flags=re.MULTILINE)
    else:
        title = 'Module'

    # Unwrap submodule details
    def replace_submodule(m):
        inner_heading = m.group(1).strip()
        inner_body = m.group(2).strip()
        return f'### {inner_heading}\n{inner_body}'
    content = re.sub(r'<details[^>]*class="submodule"[^>]*>\s*<summary>\s*(.*?)\s*</summary>\s*<div[^>]*class="submodule-body"[^>]*>\s*(.*?)\s*</div>\s*</details>', replace_submodule, content, flags=re.DOTALL)

    # Extract description: first non-empty line after title removal
    description = ''
    for line in content.splitlines():
        line = line.strip()
        if line == '':
            continue
        if line.startswith('- ') or line.startswith('* ') or re.match(r'^\d+\.\s+', line):
            description = line.lstrip('-*0123456789. ').strip()
            break
        else:
            description = line
            break

    # Build frontmatter
    front = f'---\ntitle: "{title}"\ndescription: "{description}"\n---\n\n'
    return front + content

def main():
    os.makedirs(target_dir, exist_ok=True)
    for fname in filenames:
        src_path = os.path.join(source_dir, fname)
        if not os.path.isfile(src_path):
            continue
        with open(src_path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = process(content)
        dst_path = os.path.join(target_dir, fname)
        with open(dst_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    main()
