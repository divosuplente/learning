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
          label: 'Lessons',
          collapsed: false,
          items: [
            {
              label: '00 — Java Foundations',
              items: [
                { label: 'Java Records: Boilerplate-Free Data Classes', slug: 'lessons/00-java-foundations/0001-java-records' },
                { label: 'Composing Records and Backend DTOs', slug: 'lessons/00-java-foundations/0002-record-composition-and-dtos' },
                { label: 'Generics', slug: 'lessons/00-java-foundations/0003-generics' },
                { label: 'Pattern Matching with switch', slug: 'lessons/00-java-foundations/0004-pattern-matching' },
                { label: 'Collections & Streams', slug: 'lessons/00-java-foundations/0005-collections-and-streams' },
                { label: 'var & Switch Expressions', slug: 'lessons/00-java-foundations/0006-var-and-switch-expressions' },
                { label: 'Exception Handling', slug: 'lessons/00-java-foundations/0007-exception-handling' },
                { label: 'OOP Fundamentals', slug: 'lessons/00-java-foundations/0008-oop-fundamentals' },
                { label: 'Enums, Sealed Types & Packages', slug: 'lessons/00-java-foundations/0009-enums-sealed-types-and-packages' },
              ],
            },
            {
              label: '01 — Build Tools',
              items: [
                { label: 'Build Tools & Maven Basics', slug: 'lessons/01-build-tools/0010-build-tools-and-maven-basics' },
                { label: 'Spring Initializr & Project Structure', slug: 'lessons/01-build-tools/0011-spring-initializr-and-project-structure' },
                { label: 'Maven POM Deep Dive', slug: 'lessons/01-build-tools/0012-maven-pom-deep-dive' },
                { label: 'Application Config & Spring Profiles', slug: 'lessons/01-build-tools/0013-application-config-and-profiles' },
                { label: 'Running the App & Maven Commands', slug: 'lessons/01-build-tools/0014-running-and-maven-commands' },
              ],
            },
            {
              label: '02 — Dependency Injection',
              items: [
                { label: 'The Problem: Tight Coupling & What DI Solves', slug: 'lessons/02-dependency-injection/0015-tight-coupling-and-di' },
                { label: 'Spring IoC Container & Stereotype Annotations', slug: 'lessons/02-dependency-injection/0016-spring-ioc-and-stereotypes' },
                { label: 'Types of Injection: Why Constructor Is Preferred', slug: 'lessons/02-dependency-injection/0017-types-of-injection' },
                { label: 'Bean Scopes, @Configuration/@Bean, @Qualifier/@Primary', slug: 'lessons/02-dependency-injection/0018-bean-scopes-and-config' },
                { label: 'Circular Dependencies & Lifecycle Hooks', slug: 'lessons/02-dependency-injection/0019-circular-deps-and-lifecycle' },
              ],
            },
            {
              label: '03 — Spring Boot Fundamentals',
              items: [
                { label: 'Auto-configuration & @SpringBootApplication', slug: 'lessons/03-spring-boot-fundamentals/0020-auto-configuration' },
                { label: 'REST Controllers & HTTP Mappings', slug: 'lessons/03-spring-boot-fundamentals/0021-rest-controllers' },
                { label: 'Request Parameters', slug: 'lessons/03-spring-boot-fundamentals/0022-request-parameters' },
                { label: 'HTTP Responses with ResponseEntity & Status Codes', slug: 'lessons/03-spring-boot-fundamentals/0023-http-responses' },
                { label: 'Input Validation & Exception Handling', slug: 'lessons/03-spring-boot-fundamentals/0024-validation-and-exceptions' },
              ],
            },
            {
              label: '04 — Repository Pattern',
              items: [
                { label: 'Databases, SQL Crash Course & the Repository Pattern', slug: 'lessons/04-repository-pattern/0025-databases-and-repository-pattern' },
                { label: 'ORM, JPA, Hibernate — The Stack Explained', slug: 'lessons/04-repository-pattern/0026-orm-jpa-hibernate' },
                { label: 'JPA Entities', slug: 'lessons/04-repository-pattern/0027-jpa-entities' },
                { label: 'Spring Data Repositories: JpaRepository & Derived Queries', slug: 'lessons/04-repository-pattern/0028-spring-data-repositories' },
                { label: 'Custom Queries, Pagination & the N+1 Problem', slug: 'lessons/04-repository-pattern/0029-custom-queries-and-n-plus-1' },
              ],
            },
            {
              label: '05 — Service Oriented Architecture',
              items: [
                { label: 'Architecture Patterns: Monolith vs Microservices vs SOA', slug: 'lessons/05-service-oriented-architecture/0030-architecture-patterns' },
                { label: 'Layered Architecture', slug: 'lessons/05-service-oriented-architecture/0031-layered-architecture' },
                { label: 'The Service Layer & @Transactional', slug: 'lessons/05-service-oriented-architecture/0032-service-layer' },
                { label: 'DTOs, Domain Exceptions & Application Events', slug: 'lessons/05-service-oriented-architecture/0033-dtos-and-events' },
                { label: 'Common Anti-Patterns & Module Review', slug: 'lessons/05-service-oriented-architecture/0034-anti-patterns' },
              ],
            },
            {
              label: '06 — Kafka',
              items: [
                { label: 'Sync vs Async Communication & What Kafka Solves', slug: 'lessons/06-kafka/0035-sync-vs-async' },
                { label: 'Kafka Core Concepts: Topics, Partitions, Offsets, Consumer Groups', slug: 'lessons/06-kafka/0036-kafka-core-concepts' },
                { label: 'Spring Boot Kafka Producers & Consumers', slug: 'lessons/06-kafka/0037-spring-kafka-producers-consumers' },
                { label: 'Serialization, Error Handling & Dead Letter Queues', slug: 'lessons/06-kafka/0038-kafka-serialization-and-error-handling' },
                { label: 'Delivery Semantics, Idempotency & Module Review', slug: 'lessons/06-kafka/0039-kafka-delivery-semantics' },
              ],
            },
            {
              label: '07 — GraphQL',
              items: [
                { label: 'REST Problems: Over-fetching & Under-fetching', slug: 'lessons/07-graphql/0040-rest-problems-over-under-fetching' },
                { label: 'GraphQL Queries, Mutations & Schema Definition', slug: 'lessons/07-graphql/0041-graphql-queries-mutations-schema' },
                { label: 'Spring Boot GraphQL Resolvers', slug: 'lessons/07-graphql/0042-spring-graphql-resolvers' },
                { label: 'N+1 Problem in GraphQL & DataLoader', slug: 'lessons/07-graphql/0043-graphql-n-plus-1-and-dataloader' },
                { label: 'Error Handling, Subscriptions & Module Review', slug: 'lessons/07-graphql/0044-graphql-error-handling-subscriptions' },
              ],
            },
            {
              label: '08 — Reactor Pattern',
              items: [
                { label: 'Reactive Programming Paradigm & the C10K Problem', slug: 'lessons/08-reactor-pattern/0045-reactive-programming-paradigm' },
                { label: 'Reactive Streams Spec: Publisher, Subscriber, Backpressure', slug: 'lessons/08-reactor-pattern/0046-reactive-streams-spec' },
                { label: 'Project Reactor: Mono & Flux Basics', slug: 'lessons/08-reactor-pattern/0047-reactor-mono-flux' },
                { label: 'Error Handling, Hot vs Cold Publishers', slug: 'lessons/08-reactor-pattern/0048-reactor-error-hot-cold' },
                { label: 'Spring WebFlux, Virtual Threads vs Reactive & Module Review', slug: 'lessons/08-reactor-pattern/0049-webflux-virtual-threads' },
              ],
            },
            {
              label: '09 — TDD',
              items: [
                { label: 'What Testing Is & The Test Pyramid', slug: 'lessons/09-tdd/0050-what-testing-is' },
                { label: 'TDD: Red-Green-Refactor Cycle', slug: 'lessons/09-tdd/0051-tdd-red-green-refactor' },
                { label: 'JUnit 5 & AssertJ for Readable Assertions', slug: 'lessons/09-tdd/0052-junit5-and-assertj' },
                { label: 'Mockito for Mocking Dependencies', slug: 'lessons/09-tdd/0053-mockito-for-mocking' },
                { label: 'Spring Boot Tests: @WebMvcTest, @DataJpaTest, Testcontainers & Module Review', slug: 'lessons/09-tdd/0054-spring-boot-tests' },
              ],
            },
            {
              label: '10 — Capstone Project',
              items: [
                { label: 'Capstone Architecture: Assembling All Technologies', slug: 'lessons/10-capstone-project/0055-capstone-architecture' },
                { label: 'Building the Order Management System', slug: 'lessons/10-capstone-project/0056-building-oms' },
                { label: 'Testing, Deployment & Running the Full Application', slug: 'lessons/10-capstone-project/0057-testing-deployment-oms' },
              ],
            },
            {
              label: '11 — Migrating Java to Kotlin',
              items: [
                { label: 'Why Kotlin & Setting Up Kotlin in Spring Boot', slug: 'lessons/11-migrating-java-to-kotlin/0058-why-kotlin' },
                { label: 'Kotlin Syntax: Variables, Null Safety & String Interpolation', slug: 'lessons/11-migrating-java-to-kotlin/0059-kotlin-syntax-basics' },
                { label: 'Kotlin Data Classes, Extension Functions & DSLs', slug: 'lessons/11-migrating-java-to-kotlin/0060-kotlin-classes-extensions' },
                { label: 'Kotlin Coroutines vs Reactor Mono/Flux', slug: 'lessons/11-migrating-java-to-kotlin/0061-kotlin-coroutines' },
                { label: 'Migration Strategy & Module Review', slug: 'lessons/11-migrating-java-to-kotlin/0062-kotlin-migration-strategy' },
              ],
            },
          ],
        },
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
        {
          label: 'Reference',
          items: [
            { label: 'Overview', slug: 'reference' },
            { label: 'Spring Annotations', slug: 'reference/spring-annotations' },
            { label: 'Maven Cheatsheet', slug: 'reference/maven-cheatsheet' },
            { label: 'Kafka API', slug: 'reference/kafka-api' },
            { label: 'Glossary', slug: 'reference/glossary' },
          ],
        },
      ],
      customCss: ['./src/custom.css'],
    }),
  ],
});
