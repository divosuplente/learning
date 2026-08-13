# Teach Skill Hybrid Learning System

## Summary

Install Matt Pocock's `/teach` skill philosophy as a local interactive teaching workspace alongside the existing Starlight course, then enrich the published site with its patterns — quiz components, reference pages, and glossary.

## Architecture

Two systems, one repo:

```
learning/
  site/                  # Starlight published course (unchanged content, enriched)
  teaching/              # Teach-skill workspace (new)
    MISSION.md
    RESOURCES.md
    NOTES.md
    GLOSSARY.md
    learning-records/
    lessons/
    reference/
    assets/
      base.css
```

### Phase 1: Local Teaching Workspace

- Teach skill installed as omp managed-skill
- `teaching/` directory with all format files
- MISSION.md: Backend engineering career readiness
- RESOURCES.md: curated external sources per module
- GLOSSARY.md: opinionated terminology, terms added after understanding
- `assets/base.css`: Tufte-inspired shared stylesheet
- First lesson: interactive HTML drawn from course fundamentals
- Lessons are single-concept, skill-focused, with quizzes (equal-length answers), retrieval practice, primary source links

### Phase 2: Starlight Enrichment

- `base.css` styles merged into `site/src/custom.css`
- Quiz React component (`site/src/components/Quiz.jsx`) — authorable in MDX
- Reference pages from course material (`site/src/content/docs/reference/`)
- Glossary page (`site/src/content/docs/reference/glossary.md`)
- Sidebar updated in `astro.config.mjs` with Reference section

### What stays local-only

- `learning-records/` — personal
- `MISSION.md` / `NOTES.md` — personal
- `lessons/` — agent-driven study tool

## Design Decisions

- Teaching workspace at `teaching/` (not repo root) to avoid cluttering site build
- Starlight content is read-only source for the teach skill agent
- Quiz widget uses equal-length answers per teach-skill philosophy
- Reference pages are compressed summaries, not duplicates of course modules
- Phase 2 only adds to the site, does not restructure existing content
