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
            {
              label: '12 — R2DBC & Reactive Data Access',
              items: [
                { label: 'R2DBC: Reactive Relational Database Connectivity', slug: 'lessons/12-r2dbc-reactive-data/0063-r2dbc-introduction' },
                { label: 'Spring Data R2DBC Repositories', slug: 'lessons/12-r2dbc-reactive-data/0064-spring-data-r2dbc' },
                { label: 'Reactive Patterns with R2DBC', slug: 'lessons/12-r2dbc-reactive-data/0065-r2dbc-reactive-patterns' },
              ],
            },
            {
              label: '13 — PostgreSQL & Advanced Database Concepts',
              items: [
                { label: 'PostgreSQL Deep Dive', slug: 'lessons/13-postgresql-database/0066-postgresql-deep-dive' },
                { label: 'Database Indexes', slug: 'lessons/13-postgresql-database/0067-database-indexes' },
                { label: 'The PostgreSQL Query Planner', slug: 'lessons/13-postgresql-database/0068-query-planner' },
              ],
            },
            {
              label: '14 — Spring Security',
              items: [
                { label: 'Spring Security: Authentication', slug: 'lessons/14-spring-security/0069-spring-security-authentication' },
                { label: 'Spring Security Authorization', slug: 'lessons/14-spring-security/0070-spring-security-authorization' },
                { label: 'Spring Security: JWT and OAuth2', slug: 'lessons/14-spring-security/0071-spring-security-jwt-oauth2' },
                { label: 'Spring Security: CSRF, CORS & Security Headers', slug: 'lessons/14-spring-security/0072-spring-security-csrf-cors' },
              ],
            },
            {
              label: '15 — Infrastructure & Platform Engineering',
              items: [
                { label: 'Kubernetes Fundamentals: Pods, Deployments, Services, ConfigMaps', slug: 'lessons/15-infrastructure-platform/0073-kubernetes-fundamentals' },
                { label: 'Terraform Infrastructure as Code', slug: 'lessons/15-infrastructure-platform/0074-terraform-infrastructure' },
                { label: 'Kustomize: Managing Kubernetes Environments', slug: 'lessons/15-infrastructure-platform/0075-kustomize-environments' },
                { label: 'Argo CD & GitOps', slug: 'lessons/15-infrastructure-platform/0076-argo-cd-gitops' },
              ],
            },
            {
              label: '16 — Docker Fundamentals',
              items: [
                { label: 'Docker Fundamentals: Images, Containers, and Dockerfile Basics', slug: 'lessons/16-docker/0077-docker-fundamentals' },
                { label: 'Docker Multi-Stage Builds for Java & Spring Boot', slug: 'lessons/16-docker/0078-docker-multi-stage-builds' },
                { label: 'Docker Compose for Local Development', slug: 'lessons/16-docker/0079-docker-compose-local-dev' },
              ],
            },
          ],
        },
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
