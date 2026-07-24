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
        { label: '00 — Java Foundations', slug: '00-java-foundations' },
        {
          label: '01 — Build Tools',
          items: [
            { label: 'Introduction', slug: '01-build-tools/intro' },
            { label: 'Spring Initializr', slug: '01-build-tools/spring-initializr' },
            { label: 'Maven & POM', slug: '01-build-tools/maven-pom' },
            { label: 'Application Configuration', slug: '01-build-tools/application-config' },
            { label: 'Running & Maven Commands', slug: '01-build-tools/running' },
            { label: 'Gradle & Multi-Module', slug: '01-build-tools/gradle' },
          ],
        },
        { label: '02 — Dependency Injection', slug: '02-dependency-injection' },
        { label: '03 — Spring Boot Fundamentals', slug: '03-spring-boot-fundamentals' },
        { label: '04 — Repository Pattern', slug: '04-repository-pattern' },
        { label: '05 — Service Oriented Architecture', slug: '05-service-oriented-architecture' },
        { label: '06 — Kafka', slug: '06-kafka' },
        {
          label: '07 — GraphQL',
          items: [
            { label: 'Introduction', slug: '07-graphql/intro' },
            { label: 'Schema & Types', slug: '07-graphql/schema' },
            { label: 'Resolvers', slug: '07-graphql/resolvers' },
            { label: 'Error Handling', slug: '07-graphql/errors' },
            { label: 'Advanced Topics', slug: '07-graphql/advanced' },
            { label: 'Testing, Design & Security', slug: '07-graphql/design' },
          ],
        },
        { label: '08 — Reactor Pattern', slug: '08-reactor-pattern' },
        {
          label: '09 — TDD',
          items: [
            { label: 'Introduction', slug: '09-tdd/intro' },
            { label: 'JUnit 5 & AssertJ', slug: '09-tdd/junit-assertj' },
            { label: 'Mockito', slug: '09-tdd/mockito' },
            { label: 'TDD Walkthrough', slug: '09-tdd/tdd-walkthrough' },
            { label: 'Spring Boot Tests', slug: '09-tdd/spring-test' },
            { label: 'Integration Testing', slug: '09-tdd/integration' },
            { label: 'Best Practices', slug: '09-tdd/practices' },
          ],
        },
        {
          label: '10 — Capstone Project',
          items: [
            { label: 'Overview', slug: '10-capstone-project/overview' },
            { label: 'Configuration', slug: '10-capstone-project/config' },
            { label: 'Domain Layer', slug: '10-capstone-project/domain' },
            { label: 'Repository Layer', slug: '10-capstone-project/repository' },
            { label: 'Kafka Integration', slug: '10-capstone-project/kafka' },
            { label: 'Service Layer', slug: '10-capstone-project/service' },
            { label: 'REST Controller', slug: '10-capstone-project/controller' },
            { label: 'GraphQL', slug: '10-capstone-project/graphql' },
            { label: 'Reactive Stream', slug: '10-capstone-project/reactive' },
            { label: 'Testing', slug: '10-capstone-project/testing' },
            { label: 'Deployment', slug: '10-capstone-project/deployment' },
            { label: 'Extensions', slug: '10-capstone-project/extensions' },
          ],
        },
        { label: '11 — Migrating Java to Kotlin', slug: '11-migrating-java-to-kotlin' },
      ],
      customCss: ['./src/custom.css'],
    }),
  ],
});
