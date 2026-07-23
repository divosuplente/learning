#!/usr/bin/env python3
"""
Transform existing course modules to match the new format:
1. Update module titles (00 -> 'Java for Experienced Developers', 06 -> 'Apache Kafka')
2. Strip 'What is programming?' sections from module 00
3. Add collapsible TOC at the top of each module
4. Remove exercise sections
5. Update prerequisites to be developer-oriented
6. Ensure 'What You Learned' recap exists
7. Update nav links
"""

import re
from pathlib import Path

COURSE_DIR = Path(__file__).parent / "java-spring-boot-course"

MODULE_TITLES = {
    "00-java-foundations": "Java for Experienced Developers",
    "01-build-tools-and-project-setup": "Build Tools & Project Setup",
    "02-dependency-injection": "Dependency Injection",
    "03-spring-boot-fundamentals": "Spring Boot Fundamentals",
    "04-repository-pattern": "Repository Pattern",
    "05-service-oriented-architecture": "Service-Oriented Architecture",
    "06-kafka": "Apache Kafka",
    "07-graphql": "GraphQL",
    "08-reactor-pattern": "Reactor Pattern",
    "09-tdd": "Test-Driven Development",
    "10-capstone-project": "Capstone Project",
    "11-migrating-java-to-kotlin": "Migrating Java to Kotlin",
}

MODULE_ORDER = list(MODULE_TITLES.keys())


def slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", slug).strip("-")


def extract_headings(md_text: str) -> list[tuple[int, str, str]]:
    """Extract headings (level, text, anchor) from markdown."""
    headings = []
    for match in re.finditer(r"^(#{1,4})\s+(.+)$", md_text, re.MULTILINE):
        level = len(match.group(1))
        text = match.group(2).strip()
        # Skip the module title (h1) and TOC section
        if level == 1:
            continue
        # Clean text for display (remove markdown formatting)
        clean = re.sub(r"`([^`]+)`", r'\1', text)
        clean = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean)
        clean = re.sub(r'\*([^*]+)\*', r'\1', clean)
        anchor = slugify(clean)
        headings.append((level, clean, anchor))
    return headings


def build_toc(headings: list[tuple[int, str, str]]) -> str:
    """Build a collapsible TOC from headings."""
    if not headings:
        return ""
    
    lines = ["<details>", "<summary>Table of Contents</summary>", ""]
    for level, text, anchor in headings:
        indent = "  " * (level - 2)  # h2 = 0 indent, h3 = 1, etc.
        lines.append(f"{indent}- [{text}](#{anchor})")
    lines.extend(["", "</details>", ""])
    return "\n".join(lines)


def remove_exercises(md_text: str) -> str:
    """Remove exercise sections from the markdown."""
    # Remove '## Exercises' section and everything after it until the next ## or end
    # But keep '## What You Learned'
    lines = md_text.split("\n")
    result = []
    skip = False
    for i, line in enumerate(lines):
        if re.match(r'^#{1,3}\s*(Exercises?|Exercise\s+\d)', line, re.IGNORECASE):
            skip = True
            continue
        if skip and re.match(r'^#{2}\s+', line):
            # Check if this is "What You Learned" or nav links — stop skipping
            if re.match(r'^#{2}\s*(What You Learned|← )', line, re.IGNORECASE):
                skip = False
            else:
                skip = False  # New H2, stop skipping regardless
        if not skip:
            result.append(line)
    return "\n".join(result)


def update_module_title(md_text: str, slug: str, new_title: str) -> str:
    """Update the H1 title of the module."""
    return re.sub(
        r'^# Module \d+:.*$',
        f'# Module {slug[:2]}: {new_title}',
        md_text,
        count=1,
        flags=re.MULTILINE
    )


def update_prerequisites(md_text: str, slug: str) -> str:
    """Update prerequisites to be developer-oriented."""
    if slug == "00-java-foundations":
        md_text = re.sub(
            r'(## Prerequisites.*?)(?=\n---\n|\n# )',
            "## Prerequisites\n\n- Programming experience in any language (Python, JavaScript, C#, Go, etc.)\n- Basic understanding of HTTP, REST, and databases\n- No prior Java experience required — but we move fast\n",
            md_text,
            count=1,
            flags=re.DOTALL
        )
    return md_text


def strip_beginner_content(md_text: str, slug: str) -> str:
    """Remove beginner-oriented content from specific modules."""
    if slug == "00-java-foundations":
        # Remove "What Is Programming?" section
        md_text = re.sub(
            r'(#\s+\d+\.?\s*What Is Programming\?.*?)(?=#\s+\d+\.?\s*)',
            "",
            md_text,
            flags=re.DOTALL
        )
        # Remove "What Is Java?" section but keep the "Why Java?" part
        # Actually, keep a brief "Why Java" but remove the long explanation
        # Remove lines like "No prior programming experience required"
        md_text = re.sub(
            r'- No prior programming experience[^\n]*',
            "- Programming experience in any language — we move fast through Java syntax",
            md_text
        )
        # Remove "A computer running macOS, Linux, or Windows" from prereqs
        md_text = re.sub(r'- A computer running macOS, Linux, or Windows[^\n]*\n?', '', md_text)
        # Remove "willingness to read, type code, and experiment"
        md_text = re.sub(r'- willingness to read[^\n]*\n?', '', md_text)
    return md_text


def ensure_recap(md_text: str) -> str:
    """Ensure a 'What You Learned' recap exists at the end."""
    if "## What You Learned" in md_text:
        return md_text
    # Add before nav links
    nav_pattern = r'(← .*)'
    recap = """## What You Learned

- See the module content above for key takeaways.

---

"""
    if re.search(nav_pattern, md_text):
        md_text = re.sub(nav_pattern, recap + r'\1', md_text, count=1)
    else:
        md_text = md_text.rstrip() + "\n\n---\n\n" + recap
    return md_text


def update_nav_links(md_text: str, slug: str) -> str:
    """Update navigation links at the bottom."""
    idx = MODULE_ORDER.index(slug)
    prev_slug = MODULE_ORDER[idx - 1] if idx > 0 else None
    next_slug = MODULE_ORDER[idx + 1] if idx < len(MODULE_ORDER) - 1 else None
    prev_title = MODULE_TITLES.get(prev_slug, "") if prev_slug else None
    next_title = MODULE_TITLES.get(next_slug, "") if next_slug else None
    
    nav_parts = []
    if prev_slug and prev_title:
        nav_parts.append(f'← [Previous: Module {prev_slug[:2]} — {prev_title}](./{prev_slug}.md)')
    if next_slug and next_title:
        nav_parts.append(f'[Next: Module {next_slug[:2]} — {next_title}](./{next_slug}.md) →')
    
    if nav_parts:
        nav_line = " | ".join(nav_parts)
        # Replace existing nav line
        md_text = re.sub(
            r'←.*?→.*$',
            nav_line,
            md_text,
            count=1,
            flags=re.MULTILINE | re.DOTALL
        )
        # If no replacement happened, append
        if nav_line not in md_text:
            md_text = md_text.rstrip() + "\n\n---\n\n" + nav_line + "\n"
    
    return md_text


def ensure_toc(md_text: str) -> str:
    """Insert a TOC after the prerequisites section if not present."""
    if "Table of Contents" in md_text:
        return md_text
    
    headings = extract_headings(md_text)
    toc = build_toc(headings)
    
    if not toc:
        return md_text
    
    # Insert after prerequisites section (after the --- that follows Prerequisites)
    # Find the pattern: ## Prerequisites ... ---
    match = re.search(r'(## Prerequisites.*?\n---\n)', md_text, re.DOTALL)
    if match:
        insert_pos = match.end()
        md_text = md_text[:insert_pos] + "\n" + toc + md_text[insert_pos:]
    else:
        # Insert after "What You'll Learn" section + ---
        match = re.search(r'(## What You\'ll Learn.*?\n---\n)', md_text, re.DOTALL)
        if match:
            insert_pos = match.end()
            md_text = md_text[:insert_pos] + "\n" + toc + md_text[insert_pos:]
        else:
            # Insert after the first H2
            match = re.search(r'^(## .+\n)', md_text, re.MULTILINE)
            if match:
                insert_pos = match.end()
                md_text = md_text[:insert_pos] + "\n" + toc + md_text[insert_pos:]
    
    return md_text


def transform_module(slug: str):
    """Transform a single module."""
    filepath = COURSE_DIR / f"{slug}.md"
    if not filepath.exists():
        print(f"  SKIP {slug}.md (not found)")
        return
    
    md_text = filepath.read_text(encoding="utf-8")
    original = md_text
    
    # 1. Update title
    new_title = MODULE_TITLES[slug]
    md_text = update_module_title(md_text, slug, new_title)
    
    # 2. Update prerequisites
    md_text = update_prerequisites(md_text, slug)
    
    # 3. Strip beginner content
    md_text = strip_beginner_content(md_text, slug)
    
    # 4. Remove exercises
    md_text = remove_exercises(md_text)
    
    # 5. Ensure recap
    md_text = ensure_recap(md_text)
    
    # 6. Add TOC
    md_text = ensure_toc(md_text)
    
    # 7. Update nav links
    md_text = update_nav_links(md_text, slug)
    
    # Write if changed
    if md_text != original:
        filepath.write_text(md_text, encoding="utf-8")
        print(f"  TRANSFORMED {slug}.md ({len(md_text)} chars)")
    else:
        print(f"  UNCHANGED {slug}.md")


def main():
    print("Transforming course modules...\n")
    for slug in MODULE_ORDER:
        transform_module(slug)
    print("\n✅ Done")


if __name__ == "__main__":
    main()
