---
title: "Module 10: Overview"
description: "Overview"
---

## What You'll Learn

- How to assemble a complete Order Management System using **all technologies from every module**
- How to use **sealed classes** (Module 00) for exhaustive domain modeling
- How **layered architecture** (Module 05) organizes the codebase
- How to configure **JPA, GraphQL, Kafka, WebFlux, Docker, and Testcontainers**
- How REST and GraphQL APIs coexist in one Spring Boot application
- How to publish Kafka events from domain services and consume them
- How to stream order-status updates with **Spring WebFlux** (Module 08)
- How to use **Java 21 virtual threads** as an alternative to reactive in blocking endpoint
- How to test all layers (unit, integration, Kafka, reactive) — Module 09
- How to prepare for **Kotlin migration** (Module 11) with Kotlin-friendly patterns
- How to run and test the application with curl and GraphQL queries

## Prerequisites

- All prior modules (00-09) must be completed
- Java 21+, Maven, Docker Desktop installed
- Understanding of: Java syntax, Spring Boot DI, REST controllers, JPA entities,
  service layer, Kafka, GraphQL, Reactor (Mono/Flux), TDD

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. Project Overview](#1-project-overview)
  - [Architecture Diagram](#architecture-diagram)
- [2. Complete Project Structure](#2-complete-project-structure)
- [3. pom.xml](#3-pomxml)
- [4. application.yml](#4-applicationyml)
- [5. docker-compose.yml](#5-docker-composeyml)
- [6. Domain Layer — JPA Entities](#6-domain-layer-jpa-entities)
- [7. DTOs — Java Records](#7-dtos-java-records)
- [8. Repository Layer](#8-repository-layer)
- [9. Kafka Event Records](#9-kafka-event-records)
- [10. Kafka Producer](#10-kafka-producer)
- [11. Kafka Consumer](#11-kafka-consumer)
- [12. Service Layer](#12-service-layer)
- [13. REST Controller](#13-rest-controller)
- [14. Global Exception Handler](#14-global-exception-handler)
- [15. GraphQL Schema](#15-graphql-schema)
- [16. GraphQL Resolvers](#16-graphql-resolvers)
- [17. Reactive Order Status Stream](#17-reactive-order-status-stream)
- [18. Test Suite Overview](#18-test-suite-overview)
- [19. Unit Test: OrderService](#19-unit-test-orderservice)
- [20. Controller Test (MockMvc)](#20-controller-test-mockmvc)
- [21. Repository Test (Testcontainers)](#21-repository-test-testcontainers)
- [22. Reactive Stream Test (StepVerifier)](#22-reactive-stream-test-stepverifier)
- [23. What You Learned](#23-what-you-learned)
- [24. Extension Ideas (for future modules)](#24-extension-ideas-for-future-modules)
- [25. Step-by-Step Guide to Run the Application](#25-step-by-step-guide-to-run-the-application)
- [26. Example Curl Commands (REST)](#26-example-curl-commands-rest)
- [27. Example GraphQL Queries](#27-example-graphql-queries)
- [24. API Versioning Strategy](#24-api-versioning-strategy)
  - [URL-Based Versioning](#url-based-versioning)
  - [Header-Based Versioning](#header-based-versioning)
  - [Content Negotiation Versioning](#content-negotiation-versioning)
  - [Comparison](#comparison)
- [25. Docker Production Best Practices](#25-docker-production-best-practices)
  - [Multi-Stage Build](#multi-stage-build)
  - [Key Production Practices](#key-production-practices)
- [26. Observability and Monitoring](#26-observability-and-monitoring)
  - [Structured JSON Logging](#structured-json-logging)
  - [Micrometer Metrics](#micrometer-metrics)
  - [Custom Health Indicator](#custom-health-indicator)
- [What You Learned](#what-you-learned)

</details>

## 1. Project Overview

The **Order Management System (OMS)** is a backend service for an e-commerce
platform. It manages:

- **Customers** who place orders
- **Products** with stock levels
- **Orders** containing multiple order items
- **Kafka events** when orders are created or status changes
- **REST + GraphQL** APIs for clients
- **Reactive streaming** for real-time order status updates

### Architecture Diagram

```
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  REST Client   │   │  GraphQL       │   │  Reactive     │
│  (curl, browser)│   │  Client       │   │  Subscriber   │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                     │                     │
        │ HTTP                │ /graphql            │ WebSocket
        │                     │                     │ /graphql
┌───────▼─────────────────────▼─────────────────────▼────────┐
│                    Spring Boot Application                 │
│                                                            │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ OrderController│  │OrderResolver │  │OrderFlux       │ │
│  │ (REST)         │  │(GraphQL)     │  │(WebFlux)       │ │
│  └───────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│          │                  │                   │          │
│  ┌───────▼──────────────────▼───────────────────▼────────┐│
│  │                   OrderService                         ││
│  │  (business logic, transactions, event publishing)      ││
│  └───────┬──────────────┬─────────────────────────────────┘│
│          │              │                                    │
│  ┌───────▼───────┐  ┌───▼──────────────────┐               │
│  │ Repositories   │  │ OrderEventProducer   │               │
│  │ (JPA)          │  │ (Kafka)              │               │
│  └───────┬───────┘  └───────┬──────────────┘               │
│          │                   │                               │
└──────────┼───────────────────┼───────────────────────────────┘
           │                   │
   ┌───────▼───────┐   ┌───────▼───────┐
   │  PostgreSQL   │   │    Kafka      │
   │  (database)   │   │  (broker)     │
   └───────────────┘   └───────┬───────┘
                               │
                       ┌───────▼───────┐
                       │OrderEvent      │
                       │Consumer         │
                       │(notifications) │
                       └───────────────┘
```

---

## 2. Complete Project Structure

```
ordermgmt/
├── src/
│   ├── main/
│   │   ├── java/com/example/ordermgmt/
│   │   │   ├── OrderManagementApplication.java
│   │   │   ├── config/
│   │   │   │   └── KafkaConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── OrderController.java
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   ├── domain/
│   │   │   │   ├── CustomerEntity.java
│   │   │   │   ├── ProductEntity.java
│   │   │   │   ├── OrderEntity.java
│   │   │   │   ├── OrderItemEntity.java
│   │   │   │   └── OrderStatus.java
│   │   │   ├── dto/
│   │   │   │   ├── CreateOrderRequest.java
│   │   │   │   └── OrderResponse.java
│   │   │   ├── graphql/
│   │   │   │   ├── OrderQueryResolver.java
│   │   │   │   └── OrderMutationResolver.java
│   │   │   ├── kafka/
│   │   │   │   ├── OrderEventProducer.java
│   │   │   │   ├── OrderEventConsumer.java
│   │   │   │   └── event/
│   │   │   │       ├── OrderCreatedEvent.java
│   │   │   │       └── OrderStatusChangedEvent.java
│   │   │   ├── repository/
│   │   │   │   ├── CustomerRepository.java
│   │   │   │   ├── ProductRepository.java
│   │   │   │   └── OrderRepository.java
│   │   │   └── service/
│   │   │       ├── OrderService.java
│   │   │       └── exception/
│   │   │           └── OrderNotFoundException.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── graphql/
│   │           └── schema.graphqls
│   └── test/java/com/example/ordermgmt/
│       ├── service/OrderServiceTest.java
│       ├── controller/OrderControllerTest.java
│       └── repository/OrderRepositoryTest.java
├── pom.xml
└── docker-compose.yml
```

---
