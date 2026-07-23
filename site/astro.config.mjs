// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://divosuplente.github.io',
  base: '/learning',
  integrations: [
    starlight({
      title: 'Backend Engineering',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/divosuplente/learning' },
      ],
      sidebar: [
        {
          label: 'Course Modules',
          items: [
            { label: '00 — Java for Experienced Developers', slug: '00-java-foundations' },
          ],
        },
        {
          label: '01 — Build Tools & Project Setup',
          items: [{ autogenerate: { directory: '01-build-tools' } }],
        },
        {
          label: '02 — Dependency Injection',
          items: [{ label: 'Dependency Injection', slug: '02-dependency-injection' }],
        },
        {
          label: '03 — Spring Boot Fundamentals',
          items: [{ label: 'Spring Boot Fundamentals', slug: '03-spring-boot-fundamentals' }],
        },
        {
          label: '04 — Repository Pattern',
          items: [{ label: 'Repository Pattern', slug: '04-repository-pattern' }],
        },
        {
          label: '05 — Service Oriented Architecture',
          items: [{ label: 'Service Oriented Architecture', slug: '05-service-oriented-architecture' }],
        },
        {
          label: '06 — Kafka',
          items: [{ label: 'Kafka', slug: '06-kafka' }],
        },
        {
          label: '07 — GraphQL',
          items: [{ autogenerate: { directory: '07-graphql' } }],
        },
        {
          label: '08 — Reactor Pattern',
          items: [{ label: 'Reactor Pattern', slug: '08-reactor-pattern' }],
        },
        {
          label: '09 — TDD',
          items: [{ autogenerate: { directory: '09-tdd' } }],
        },
        {
          label: '10 — Capstone Project',
          items: [{ autogenerate: { directory: '10-capstone-project' } }],
        },
        {
          label: '11 — Migrating Java to Kotlin',
          items: [{ label: 'Migrating Java to Kotlin', slug: '11-migrating-java-to-kotlin' }],
        },
      ],
      customCss: ['./src/custom.css'],
    }),
  ],
});
