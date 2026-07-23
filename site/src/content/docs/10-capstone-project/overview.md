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
