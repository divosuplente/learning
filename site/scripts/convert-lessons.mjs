#!/usr/bin/env node
/**
 * Convert HTML lessons from teaching/lessons/ to Starlight MDX pages.
 * Reads each .html, strips boilerplate, converts to Markdown via turndown,
 * transforms quiz divs to <details>/<summary> blocks, adds frontmatter,
 * writes to the correct module subdirectory under src/content/docs/lessons/.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, parse } from 'node:path';
import { JSDOM } from 'jsdom'; // turndown needs DOM
import TurndownService from 'turndown';
import gfmPlugin from 'turndown-plugin-gfm';

const LESSONS_DIR = join(import.meta.dirname, '../../teaching/lessons');
const OUT_DIR = join(import.meta.dirname, '../src/content/docs/lessons');

// Lesson number → module slug mapping
const MODULE_MAP = [
  { range: [1, 9], slug: '00-java-foundations' },
  { range: [10, 14], slug: '01-build-tools' },
  { range: [15, 19], slug: '02-dependency-injection' },
  { range: [20, 24], slug: '03-spring-boot-fundamentals' },
  { range: [25, 29], slug: '04-repository-pattern' },
  { range: [30, 34], slug: '05-service-oriented-architecture' },
  { range: [35, 39], slug: '06-kafka' },
  { range: [40, 44], slug: '07-graphql' },
  { range: [45, 49], slug: '08-reactor-pattern' },
  { range: [50, 54], slug: '09-tdd' },
  { range: [55, 57], slug: '10-capstone-project' },
  { range: [58, 62], slug: '11-migrating-java-to-kotlin' },
  { range: [63, 65], slug: '12-r2dbc-reactive-data' },
  { range: [66, 68], slug: '13-postgresql-database' },
  { range: [69, 72], slug: '14-spring-security' },
  { range: [73, 76], slug: '15-infrastructure-platform' },
];

function getModuleSlug(lessonNum) {
  for (const m of MODULE_MAP) {
    if (lessonNum >= m.range[0] && lessonNum <= m.range[1]) return m.slug;
  }
  throw new Error(`No module for lesson ${lessonNum}`);
}

function extractLessonNumber(filename) {
  const match = filename.match(/^(\d{4})-/);
  return match ? parseInt(match[1], 10) : null;
}

// Convert quiz divs to <details>/<summary> blocks
function convertQuizDivs(container) {
  const quizzes = container.querySelectorAll('div.quiz');
  for (const quiz of quizzes) {
    const question = quiz.querySelector('.quiz-question');
    const questionText = question ? question.textContent.trim() : 'Quiz';
    const options = quiz.querySelectorAll('.quiz-option');
    const correctOption = quiz.querySelector('.quiz-option[data-correct="true"]');
    const correctText = correctOption ? correctOption.textContent.trim() : '';

    // Build <details> block as HTML string
    let detailsHtml = `<details><summary>${questionText}</summary>\n`;
    detailsHtml += `<p><strong>Correct answer:</strong> ${correctText}</p>\n`;
    detailsHtml += `</details>`;

    const temp = quiz.ownerDocument.createElement('div');
    temp.innerHTML = detailsHtml;
    const detailsEl = temp.firstElementChild;
    quiz.replaceWith(detailsEl);
  }
}

// Remove lesson-nav, script tags
function stripBoilerplate(container) {
  // Remove <style>, <link>, <script>
  container.querySelectorAll('style, script, link').forEach(el => el.remove());
  // Remove lesson-nav
  container.querySelectorAll('.lesson-nav').forEach(el => el.remove());
  // Remove nav elements
  container.querySelectorAll('nav').forEach(el => el.remove());
}

// Custom turndown rules
function configureTurndown(td) {
  // Enable GFM tables, strikethrough, task list items
  td.use(gfmPlugin.gfm);

  // Keep <details>/<summary> as HTML
  td.addRule('details', {
    filter: 'details',
    replacement: (content, node) => {
      const summary = node.querySelector('summary');
      const summaryText = summary ? summary.textContent.trim() : '';
      // Get content after summary
      const innerHtml = [];
      for (const child of node.childNodes) {
        if (child === summary) continue;
        if (child.nodeType === 1) { // Element
          innerHtml.push(child.outerHTML);
        } else if (child.nodeType === 3 && child.textContent.trim()) {
          innerHtml.push(child.textContent.trim());
        }
      }
      return `\n\n<details>\n<summary>${summaryText}</summary>\n${innerHtml.join('\n')}\n</details>\n\n`;
    }
  });

  // Don't convert <code> inside <pre> — turndown handles this natively with fences
  // But handle inline <code>
  td.addRule('inlineCode', {
    filter: (node) => {
      return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE';
    },
    replacement: (content) => {
      // Strip leading/trailing backticks from content to avoid double-wrapping
      const text = content.replace(/^`+|`+$/g, '');
      return `\`${text}\``;
    }
  });
}

function convertFile(filePath) {
  const filename = parse(filePath).base;
  const lessonNum = extractLessonNumber(filename);
  if (!lessonNum) {
    console.warn(`  Skipping ${filename}: can't extract lesson number`);
    return null;
  }

  const slug = getModuleSlug(lessonNum);
  const html = readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract title from <title> tag and clean it
  const titleEl = doc.querySelector('title');
  let title = titleEl ? titleEl.textContent.trim() : '';
  // Remove "Lesson N — " prefix
  title = title.replace(/^Lesson\s+\d+\s*[-—]\s*/, '');

  // Work on body content
  const body = doc.body;

  // Strip boilerplate
  stripBoilerplate(body);

  // Convert quiz divs BEFORE turndown
  convertQuizDivs(body);

  // Get the body HTML, strip outer <body> tag
  let bodyHtml = body.innerHTML;

  // Turndown conversion
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });
  configureTurndown(td);

  let markdown = td.turndown(bodyHtml);

  // Clean up: remove excessive blank lines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // Build frontmatter — derive slug from filename
  const nameSlug = filename.replace(/\.html$/, '').replace(/^\d{4}-/, '');

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(title)}`,
    `editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/${filename}`,
    '---',
  ].join('\n');

  const mdx = `${frontmatter}\n\n${markdown}\n`;

  // Output path
  const outFileName = filename.replace(/\.html$/, '.md');
  const outPath = join(OUT_DIR, slug, outFileName);

  writeFileSync(outPath, mdx, 'utf-8');
  console.log(`  ✓ ${slug}/${outFileName}`);

  return { lessonNum, slug, outFileName, title };
}

// Main
const files = readdirSync(LESSONS_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

console.log(`Converting ${files.length} lessons...`);

const results = [];
for (const f of files) {
  const r = convertFile(join(LESSONS_DIR, f));
  if (r) results.push(r);
}

console.log(`\nConverted ${results.length} lessons.`);
