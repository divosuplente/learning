// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://divosuplente.github.io',
  base: '/learning',
  integrations: [
    starlight({
      title: 'Your Learning Paths',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/divosuplente/learning' },
      ],
      sidebar: [
        {
          label: 'Backend Engineering in Java',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'backend-engineering' },
            {
              label: '00 — Java Foundations',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/00-java-foundations' } }],
            },
            {
              label: '01 — Build Tools',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/01-build-tools' } }],
            },
            {
              label: '02 — Dependency Injection',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/02-dependency-injection' } }],
            },
            {
              label: '03 — Spring Boot Fundamentals',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/03-spring-boot-fundamentals' } }],
            },
            {
              label: '04 — Repository Pattern',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/04-repository-pattern' } }],
            },
            {
              label: '05 — Service Oriented Architecture',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/05-service-oriented-architecture' } }],
            },
            {
              label: '06 — Kafka',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/06-kafka' } }],
            },
            {
              label: '07 — GraphQL',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/07-graphql' } }],
            },
            {
              label: '08 — Reactor Pattern',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/08-reactor-pattern' } }],
            },
            {
              label: '09 — TDD',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/09-tdd' } }],
            },
            {
              label: '10 — Capstone Project',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/10-capstone-project' } }],
            },
            {
              label: '11 — Migrating Java to Kotlin',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/11-migrating-java-to-kotlin' } }],
            },
            {
              label: '12 — R2DBC & Reactive Data Access',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/12-r2dbc-reactive-data' } }],
            },
            {
              label: '13 — PostgreSQL & Advanced Database Concepts',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/13-postgresql-database' } }],
            },
            {
              label: '14 — Spring Security',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/14-spring-security' } }],
            },
            {
              label: '15 — Infrastructure & Platform Engineering',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/15-infrastructure-platform' } }],
            },
            {
              label: '16 — Docker Fundamentals',
              collapsed: true,
              items: [{ autogenerate: { directory: 'lessons/16-docker' } }],
            },
            {
              label: 'Reference',
              collapsed: true,
              items: [
                { label: 'Spring Annotations', slug: 'reference/spring-annotations' },
                { label: 'Maven Cheatsheet', slug: 'reference/maven-cheatsheet' },
                { label: 'Kafka API', slug: 'reference/kafka-api' },
                { label: 'Glossary', slug: 'reference/glossary' },
              ],
            },
          ],
        },
        {
          label: 'AI Graphics Software Engineer',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'graphics-ai' },
            { autogenerate: { directory: 'graphics-ai/lessons' } },
          ],
        },
        {
          label: 'Python for Frontend Devs',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'python-for-frontend' },
            { autogenerate: { directory: 'python-for-frontend/lessons' } },
          ],
        },
      ],
      customCss: ['./src/custom.css'],
    }),
  ],
});
