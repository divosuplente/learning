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
            { label: '01 — Build Tools & Project Setup', slug: '01-build-tools-and-project-setup' },
            { label: '02 — Dependency Injection', slug: '02-dependency-injection' },
            { label: '03 — Spring Boot Fundamentals', slug: '03-spring-boot-fundamentals' },
            { label: '04 — Repository Pattern', slug: '04-repository-pattern' },
            { label: '05 — Service Oriented Architecture', slug: '05-service-oriented-architecture' },
            { label: '06 — Kafka', slug: '06-kafka' },
            { label: '07 — GraphQL', slug: '07-graphql' },
            { label: '08 — Reactor Pattern', slug: '08-reactor-pattern' },
            { label: '09 — TDD', slug: '09-tdd' },
            { label: '10 — Capstone Project', slug: '10-capstone-project' },
            { label: '11 — Migrating Java to Kotlin', slug: '11-migrating-java-to-kotlin' },
          ],
        },
      ],
      customCss: ['./src/custom.css'],
    }),
  ],
});
