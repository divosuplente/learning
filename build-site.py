#!/usr/bin/env python3
"""Build a beautiful static HTML site from the course markdown files."""

import json
import re
from pathlib import Path

import markdown

COURSE_DIR = Path(__file__).parent / "java-spring-boot-course"
OUTPUT_DIR = Path(__file__).parent / "docs"

MODULES = [
    ("00-java-foundations", "00", "Java for Experienced Developers"),
    ("01-build-tools-and-project-setup", "01", "Build Tools & Project Setup"),
    ("02-dependency-injection", "02", "Dependency Injection"),
    ("03-spring-boot-fundamentals", "03", "Spring Boot Fundamentals"),
    ("04-repository-pattern", "04", "Repository Pattern"),
    ("05-service-oriented-architecture", "05", "Service-Oriented Architecture"),
    ("06-kafka", "06", "Apache Kafka"),
    ("07-graphql", "07", "GraphQL"),
    ("08-reactor-pattern", "08", "Reactor Pattern"),
    ("09-tdd", "09", "Test-Driven Development"),
    ("10-capstone-project", "10", "Capstone Project"),
    ("11-migrating-java-to-kotlin", "11", "Migrating Java to Kotlin"),
]

# ---- Markdown config ----

md = markdown.Markdown(
    extensions=[
        "fenced_code",
        "codehilite",
        "tables",
        "toc",
        "pymdownx.superfences",
        "pymdownx.details",
        "pymdownx.tasklist",
        "pymdownx.tilde",
        "pymdownx.highlight",
        "pymdownx.magiclink",
        "pymdownx.saneheaders",
        "attr_list",
        "md_in_html",
    ],
    extension_configs={
        "pymdownx.highlight": {
            "use_pygments": False,
            "css_class": "code-block",
        },
        "codehilite": {
            "use_pygments": False,
            "css_class": "code-block",
        },
        "toc": {
            "permalink": "¶",
            "permalink_class": "anchor-link",
        },
    },
)


def slugify(title: str) -> str:
    """Turn a heading into an anchor id."""
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    return re.sub(r"[-\s]+", "-", slug).strip("-")


def plain_text(html: str) -> str:
    """Strip HTML tags for search index content."""
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def fix_links(html: str) -> str:
    """Rewrite .md links to .html within the site."""
    html = re.sub(r'href="([^"]+)\.md"', lambda m: f'href="{m.group(1)}.html"', html)
    # Fix relative links that point to course dir
    html = html.replace('href="./', 'href="')
    return html


def make_submodules_collapsible(html: str) -> str:
    """Wrap H3+ subsections inside <details> blocks for collapsible submodules.

    Each H3 heading becomes a <summary>, and everything until the next H3 or H2
    is the collapsible body. H2 sections stay always-visible (they're the main
    sections), H3 sections become collapsible submodules.
    """
    lines = html.split('\n')
    result = []
    in_details = False
    current_summary = ""

    for i, line in enumerate(lines):
        # Detect H3 heading
        h3_match = re.match(r'^<h3\s+id="([^"]*)"[^>]*>(.+?)</h3>$', line.strip())
        # Detect H2 heading (closes any open details)
        h2_match = re.match(r'^<h2\s+id="([^"]*)"[^>]*>(.+?)</h2>$', line.strip())
        # Detect <hr> (closes any open details)
        hr_match = line.strip() == '<hr />'

        if h2_match or hr_match:
            # Close any open details block
            if in_details:
                result.append('</div>')
                result.append('</details>')
                in_details = False
            result.append(line)
            continue

        if h3_match:
            # Close previous details if open
            if in_details:
                result.append('</div>')
                result.append('</details>')

            heading_id = h3_match.group(1)
            heading_text = h3_match.group(2)
            result.append(f'<details id="{heading_id}" class="submodule">')
            result.append(f'<summary>{heading_text}</summary>')
            result.append('<div class="submodule-body">')
            in_details = True
            continue

        # If we're inside a details block, add the line
        # If not inside details, add normally
        result.append(line)

    # Close any remaining open details
    if in_details:
        result.append('</div>')
        result.append('</details>')

    return '\n'.join(result)


def build_search_index(pages_data: list[dict]) -> str:
    """Build a JSON search index."""
    return json.dumps(pages_data, ensure_ascii=False)


def render_page(
    title: str,
    content_html: str,
    modules: list[tuple[str, str, str]],
    current_module: str | None = None,
    is_index: bool = False,
) -> str:
    """Render a full HTML page with sidebar."""
    nav_items = "\n".join(
        f"""
        <a href="{slug}.html" class="nav-item{' active' if slug == current_module else ''}">
          <span class="nav-num">{num}</span>
          <span class="nav-title">{name}</span>
        </a>"""
        for slug, num, name in modules
    )

    prev_link = ""
    next_link = ""
    if current_module:
        for i, (slug, num, name) in enumerate(modules):
            if slug == current_module:
                if i > 0:
                    p_slug, p_num, p_name = modules[i - 1]
                    prev_link = f'<a href="{p_slug}.html" class="nav-link prev">← {p_name}</a>'
                if i < len(modules) - 1:
                    n_slug, n_num, n_name = modules[i + 1]
                    next_link = f'<a href="{n_slug}.html" class="nav-link next">{n_name} →</a>'
                break

    sidebar_toggle = """
        <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
            <span></span><span></span><span></span>
        </button>"""

    search_box = """
        <div class="search-container">
          <input type="text" id="searchInput" placeholder="Search course..." autocomplete="off" />
          <div id="searchResults" class="search-results"></div>
        </div>"""

    footer_nav = ""
    if prev_link or next_link:
        footer_nav = f'<div class="footer-nav">{prev_link}{next_link}</div>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — Backend Engineering Course</title>
  <meta name="description" content="Java, Spring Boot, Kafka, GraphQL, Reactor, TDD, Kotlin — for active developers" />
  <link rel="stylesheet" href="assets/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <a href="index.html" class="logo">
          <span class="logo-icon">☕</span>
          <span class="logo-text">Backend<br><small>Engineering</small></span>
        </a>
      </div>
      {search_box}
      <nav class="nav-list">
        {nav_items}
      </nav>
    </aside>

    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <main class="main-content">
      <header class="page-header">
        {sidebar_toggle}
        <div class="breadcrumb">
          <a href="index.html">Home</a> {'› <span>' + title + '</span>' if not is_index else ''}
        </div>
      </header>

      <article class="content">
        {content_html}
      </article>

      {footer_nav}
    </main>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
  <script src="assets/search.js"></script>
</body>
</html>"""


def build_index_page(modules: list[tuple[str, str, str]]) -> str:
    """Build the landing page."""
    cards = "\n".join(
        f"""
        <a href="{slug}.html" class="module-card">
          <div class="card-num">{num}</div>
          <div class="card-body">
            <h3>{name}</h3>
          </div>
          <div class="card-arrow">→</div>
        </a>"""
        for slug, num, name in modules
    )

    content = f"""
    <section class="hero">
      <h1>Java • Spring Boot • Kafka • GraphQL • Reactor • TDD • Kotlin</h1>
      <p class="hero-subtitle">A comprehensive course for active developers — Java and the backend ecosystem, from syntax to production.</p>
      <div class="hero-tags">
        <span class="tag">Java 21+</span>
        <span class="tag">Spring Boot</span>
        <span class="tag">Kafka</span>
        <span class="tag">GraphQL</span>
        <span class="tag">Reactor</span>
        <span class="tag">TDD</span>
        <span class="tag">Kotlin</span>
      </div>
      <div class="hero-meta">
        <span>📚 12 Modules</span>
        <span>⏱️ 30–50 hours</span>
        <span>🔧 Capstone project</span>
      </div>
    </section>

    <section class="module-grid">
      <h2>Course Modules</h2>
      <div class="cards">
        {cards}
      </div>
    </section>

    <section class="info-section">
      <h2>How to Use This Course</h2>
      <ol>
        <li><strong>Read each module in order.</strong> Each builds on the previous one.</li>
        <li><strong>Type every code example yourself.</strong> Don't copy-paste. Muscle memory matters.</li>
        <li><strong>Use the table of contents.</strong> Each module has a collapsible TOC at the top for navigation.</li>
        <li><strong>Expand submodules.</strong> Sections marked with ▶ can be expanded for deeper coverage.</li>
        <li><strong>Refer back.</strong> Later modules reference earlier ones — that's normal.</li>
      </ol>
      <h2>Tools You'll Need</h2>
      <table>
        <thead><tr><th>Tool</th><th>Version</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>JDK</td><td>21+</td><td>Java runtime and compiler</td></tr>
          <tr><td>Maven / Gradle</td><td>Latest</td><td>Build tool and dependency management</td></tr>
          <tr><td>IntelliJ IDEA Community</td><td>Latest</td><td>Code editor with Java support</td></tr>
          <tr><td>Docker Desktop</td><td>Latest</td><td>Running Kafka, Postgres locally</td></tr>
          <tr><td>Git</td><td>Latest</td><td>Version control</td></tr>
        </tbody>
      </table>
    </section>"""

    return render_page("Home", content, modules, is_index=True)


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / "assets").mkdir(exist_ok=True)

    search_pages = []

    # Build each module page
    for slug, num, name in MODULES:
        md_file = COURSE_DIR / f"{slug}.md"
        if not md_file.exists():
            print(f"  SKIP {slug}.md (not found)")
            continue

        md_text = md_file.read_text(encoding="utf-8")
        # Convert markdown to HTML
        html_body = md.convert(md_text)
        md.reset()

        # Fix internal links
        html_body = fix_links(html_body)

        # Make H3 subsections collapsible submodules
        html_body = make_submodules_collapsible(html_body)

        page_html = render_page(name, html_body, MODULES, current_module=slug)
        out_path = OUTPUT_DIR / f"{slug}.html"
        out_path.write_text(page_html, encoding="utf-8")
        print(f"  BUILT {slug}.html")

        # Collect search data
        plain = plain_text(html_body)
        # Truncate to avoid huge index
        if len(plain) > 8000:
            plain = plain[:8000]
        search_pages.append({
            "slug": slug,
            "num": num,
            "title": name,
            "content": plain,
        })

    # Build index page
    index_html = build_index_page(MODULES)
    (OUTPUT_DIR / "index.html").write_text(index_html, encoding="utf-8")
    print("  BUILT index.html")

    # Write CSS
    css = build_css()
    (OUTPUT_DIR / "assets" / "styles.css").write_text(css, encoding="utf-8")
    print("  BUILT assets/styles.css")

    # Write search JS
    search_js = build_search_js(search_pages)
    (OUTPUT_DIR / "assets" / "search.js").write_text(search_js, encoding="utf-8")
    print("  BUILT assets/search.js")

    print(f"\n✅ Site built in {OUTPUT_DIR}/")


def build_css() -> str:
    return r"""
:root {
  --accent: #6366f1;
  --accent-light: #818cf8;
  --accent-dark: #4f46e5;
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-elevated: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --border: #334155;
  --code-bg: #0d1117;
  --code-border: #30363d;
  --sidebar-w: 280px;
  --radius: 12px;
  --radius-sm: 8px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

/* ---- Layout ---- */
.layout {
  display: flex;
  min-height: 100vh;
}

/* ---- Sidebar ---- */
.sidebar {
  width: var(--sidebar-w);
  background: #1e293b;
  border-right: 1px solid var(--border);
  position: fixed;
  top: 0; left: 0; bottom: 0;
  overflow-y: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  text-decoration: none;
  color: var(--text);
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.3;
}

.logo-icon { font-size: 1.75rem; }

.logo small {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.search-container {
  padding: 1rem 1.25rem;
  position: relative;
}

#searchInput {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

#searchInput:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

#searchInput::placeholder { color: var(--text-dim); }

.search-results {
  position: absolute;
  top: 100%;
  left: 1.25rem;
  right: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 400px;
  overflow-y: auto;
  display: none;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.search-results.visible { display: block; }

.search-result-item {
  display: block;
  padding: 0.625rem 0.875rem;
  text-decoration: none;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.search-result-item:hover { background: var(--bg-elevated); }

.search-result-item .sr-title {
  font-weight: 600;
  font-size: 0.875rem;
}

.search-result-item .sr-num {
  display: inline-block;
  background: var(--accent);
  color: #fff;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  margin-right: 0.5rem;
}

.search-result-item .sr-snippet {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-no-results {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* ---- Nav list ---- */
.nav-list {
  padding: 0.5rem 0.75rem 2rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-muted);
  font-size: 0.875rem;
  transition: all 0.15s;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text);
}

.nav-item.active {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-light);
  font-weight: 600;
}

.nav-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--bg-elevated);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.nav-item.active .nav-num {
  background: var(--accent);
  color: #fff;
}

/* ---- Main content ---- */
.main-content {
  flex: 1;
  margin-left: var(--sidebar-w);
  padding: 0;
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 50;
  backdrop-filter: blur(12px);
}

.breadcrumb {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.breadcrumb a { color: var(--accent-light); text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }

.sidebar-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.sidebar-toggle span {
  width: 24px; height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: 0.3s;
}

/* ---- Content area ---- */
.content {
  max-width: 880px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
}

.content h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #f1f5f9;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0.75rem;
}

.content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: #f1f5f9;
}

.content h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--text);
}

.content h4 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text);
}

.content p { margin-bottom: 1rem; }

.content ul, .content ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.content li { margin-bottom: 0.4rem; }

.content a {
  color: var(--accent-light);
  text-decoration: none;
}

.content a:hover { text-decoration: underline; }

.content strong { font-weight: 700; color: #f1f5f9; }

.content em { font-style: italic; }

.content blockquote {
  border-left: 4px solid var(--accent);
  background: rgba(99, 102, 241, 0.07);
  padding: 0.75rem 1.25rem;
  margin: 1rem 0;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-muted);
}

.content blockquote p { margin-bottom: 0; }

/* ---- Tables ---- */
.content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9rem;
  overflow-x: auto;
  display: block;
}

.content thead {
  background: var(--bg-card);
}

.content th {
  padding: 0.625rem 0.875rem;
  text-align: left;
  font-weight: 600;
  color: #f1f5f9;
  border-bottom: 2px solid var(--border);
}

.content td {
  padding: 0.5rem 0.875rem;
  border-bottom: 1px solid var(--border);
}

.content tbody tr:hover { background: rgba(99, 102, 241, 0.05); }

/* ---- Code blocks ---- */
.content pre {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  overflow-x: auto;
  margin: 1rem 0;
  font-size: 0.85rem;
  line-height: 1.6;
}

.content code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.content :not(pre) > code {
  background: var(--bg-elevated);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--accent-light);
}

.content pre code {
  background: none;
  padding: 0;
  color: #c9d1d9;
  font-size: 0.85rem;
}

/* Prism overrides */
.content pre[class*="language-"] {
  background: var(--code-bg);
  margin: 1rem 0;
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--code-border);
  overflow-x: auto;
}

/* ---- Details/summary ---- */
.content details {
  margin: 1rem 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  overflow: hidden;
}

.content summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-weight: 600;
  color: var(--accent-light);
  user-select: none;
  list-style: none;
}

.content summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 0.5rem;
  transition: transform 0.2s;
  font-size: 0.7rem;
}

.content details[open] summary::before {
  transform: rotate(90deg);
}

.content details[open] summary {
  border-bottom: 1px solid var(--border);
}

.content details > *:not(summary) {
  padding: 0 1rem;
}

.content details p { padding: 0.75rem 1rem; }

/* ---- Collapsible submodules (H3 sections) ---- */
.content details.submodule {
  margin: 0;
  border: none;
  border-left: 3px solid var(--border);
  border-radius: 0;
  background: transparent;
  margin-bottom: 0.5rem;
}

.content details.submodule > summary {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  padding: 0.625rem 0.75rem;
  border-radius: 0;
  border-bottom: 1px solid transparent;
  transition: all 0.15s;
}

.content details.submodule > summary:hover {
  background: rgba(99, 102, 241, 0.05);
}

.content details.submodule[open] > summary {
  border-bottom-color: var(--border);
  color: var(--accent-light);
}

.content details.submodule .submodule-body {
  padding: 0.75rem 0.75rem 0.75rem 1.25rem;
}

.content details.submodule .submodule-body > *:first-child {
  margin-top: 0;
}

/* ---- Task list ---- */
.content .task-list-item {
  list-style: none;
  margin-left: -1.5rem;
}

.content .task-list-item input[type="checkbox"] {
  margin-right: 0.5rem;
}

/* ---- Anchor links (TOC) ---- */
.anchor-link {
  color: var(--text-dim);
  text-decoration: none;
  margin-left: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 0.85rem;
}

.content h2:hover .anchor-link,
.content h3:hover .anchor-link,
.content h4:hover .anchor-link {
  opacity: 1;
}

/* ---- Hero (index page) ---- */
.hero {
  text-align: center;
  padding: 3rem 0 2rem;
}

.hero h1 {
  font-size: 2.25rem;
  font-weight: 700;
  color: #f1f5f9;
  border: none;
  margin-bottom: 0.75rem;
  padding: 0;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tag {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: var(--accent-light);
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.hero-meta {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* ---- Module cards ---- */
.module-grid h2 {
  text-align: center;
  margin-top: 3rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text);
  transition: all 0.2s;
}

.module-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
}

.card-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.card-body { flex: 1; }
.card-body h3 { margin: 0; font-size: 1rem; font-weight: 600; }

.card-arrow { color: var(--text-dim); font-size: 1.25rem; }

.info-section { margin-top: 3rem; }

/* ---- Footer nav ---- */
.footer-nav {
  display: flex;
  justify-content: space-between;
  max-width: 880px;
  margin: 0 auto;
  padding: 1.5rem 2rem 3rem;
  gap: 1rem;
}

.nav-link {
  display: inline-block;
  padding: 0.625rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.nav-link:hover {
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
  color: var(--accent-light);
}

.nav-link.next { margin-left: auto; }

/* ---- Mobile ---- */
.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 99;
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar.open + .sidebar-overlay { display: block; }
  .sidebar-toggle { display: flex; }
  .main-content { margin-left: 0; }
  .content { padding: 1.5rem 1rem 3rem; }
  .page-header { padding: 0.75rem 1rem; }
  .footer-nav { padding: 1rem; }
  .hero h1 { font-size: 1.6rem; }
  .cards { grid-template-columns: 1fr; }
}

/* ---- Prism dark theme animations ---- */
pre code .token.comment { color: #8b949e; }
pre code .token.keyword { color: #ff7b72; }
pre code .token.string { color: #a5d6ff; }
pre code .token.number { color: #79c0ff; }
pre code .token.function { color: #d2a8ff; }
pre code .token.operator { color: #ff7b72; }
pre code .token.punctuation { color: #c9d1d9; }
pre code .token.class-name { color: #ffa657; }
pre code .token.annotation { color: #d2a8ff; }
pre code .token.boolean { color: #79c0ff; }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
"""


def build_search_js(search_pages: list[dict]) -> str:
    """Build the search JavaScript (client-side, no external deps."""
    index_json = json.dumps(search_pages, ensure_ascii=False)
    return f"""
const SEARCH_INDEX = {index_json};

// Simple full-text search engine
function search(query) {{
  if (!query || query.trim().length < 2) return [];

  const terms = query.toLowerCase().trim().split(/\\s+/);
  const results = [];

  for (const page of SEARCH_INDEX) {{
    const titleLower = page.title.toLowerCase();
    const contentLower = page.content.toLowerCase();

    let score = 0;
    let firstMatch = -1;
    let matchedTerms = 0;

    for (const term of terms) {{
      const titleIdx = titleLower.indexOf(term);
      const contentIdx = contentLower.indexOf(term);

      if (titleIdx >= 0) {{
        score += 10;
        matchedTerms++;
      }}
      if (contentIdx >= 0) {{
        score += 1;
        matchedTerms++;
        if (firstMatch < 0 || contentIdx < firstMatch) {{
          firstMatch = contentIdx;
        }}
      }}
    }}

    if (matchedTerms > 0) {{
      // Boost for matching all terms
      if (matchedTerms >= terms.length) score *= 2;

      // Build snippet
      let snippet = '';
      if (firstMatch >= 0) {{
        const start = Math.max(0, firstMatch - 50);
        const end = Math.min(page.content.length, firstMatch + 80);
        snippet = (start > 0 ? '...' : '') + page.content.substring(start, end) + (end < page.content.length ? '...' : '');
      }}

      results.push({{ ...page, score, snippet }});
    }}
  }}

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10);
}}

// Wire up the UI
document.addEventListener('DOMContentLoaded', () => {{
  const input = document.getElementById('searchInput');
  const resultsDiv = document.getElementById('searchResults');

  if (!input || !resultsDiv) return;

  let debounceTimer;

  input.addEventListener('input', () => {{
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {{
      const query = input.value.trim();
      if (query.length < 2) {{
        resultsDiv.classList.remove('visible');
        resultsDiv.innerHTML = '';
        return;
      }}

      const results = search(query);
      if (results.length === 0) {{
        resultsDiv.innerHTML = '<div class="search-no-results">No results found</div>';
      }} else {{
        resultsDiv.innerHTML = results.map(r => `
          <a href="${{r.slug}}.html" class="search-result-item">
            <div><span class="sr-num">${{r.num}}</span><span class="sr-title">${{r.title}}</span></div>
            <div class="sr-snippet">${{r.snippet}}</div>
          </a>
        `).join('');
      }}
      resultsDiv.classList.add('visible');
    }}, 200);
  }});

  // Close on click outside
  document.addEventListener('click', (e) => {{
    if (!e.target.closest('.search-container')) {{
      resultsDiv.classList.remove('visible');
    }}
  }});

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', (e) => {{
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {{
      e.preventDefault();
      input.focus();
    }}
    if (e.key === 'Escape') {{
      resultsDiv.classList.remove('visible');
      input.blur();
    }}
  }});

  // Sidebar toggle (mobile)
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle && sidebar) {{
    toggle.addEventListener('click', () => {{
      sidebar.classList.toggle('open');
    }});
  }}
  if (overlay) {{
    overlay.addEventListener('click', () => {{
      sidebar.classList.remove('open');
    }});
  }}
}});
"""


if __name__ == "__main__":
    main()