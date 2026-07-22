# Module 10: Capstone Project

## What You'll Learn

- How to assemble a complete Order Management System using all technologies from the course
- How REST and GraphQL APIs coexist in one Spring Boot application
- How to publish Kafka events from domain services and consume them
- How to stream order-status updates with Spring WebFlux (reactive programming)
- How to structure a project with layered architecture (Controller, Service, Repository, Domain)
- How to configure JPA, GraphQL, Kafka, WebFlux, Docker, and Testcontainers
- How to test all layers (unit, integration, Kafka, reactive)
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

## 3. pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>ordermgmt</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    <name>Order Management System</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-graphql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>io.projectreactor</groupId>
            <artifactId>reactor-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>kafka</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## 4. application.yml

```yaml
server:
  port: 8080

spring:
  application:
    name: Order Management System

  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true

  graphql:
    graphiql:
      enabled: true
      path: /graphiql

  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: ordermgmt-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      properties:
        spring.json.trusted.packages: "com.example.ordermgmt.kafka.event"

logging:
  level:
    com.example.ordermgmt: DEBUG
    org.hibernate.SQL: DEBUG
```

---

## 5. docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: oms-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ordermgmt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  kafka:
    image: apache/kafka:3.7.1
    container_name: oms-kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENERS: PLAINTEXT://0.0.0.0:9093
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
    depends_on:
      - postgres
```

Start everything with:

```bash
docker compose up -d
```

---
## 6. Domain Layer — JPA Entities

All entities use **explicit getters and setters** (no Lombok). JPA entities cannot
be Java records because JPA requires a no-arg constructor and mutable fields.

```java
package com.example.ordermgmt.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}

@Entity
@Table(name = "customers")
public class CustomerEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true)
    private String email;
    private String address;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected CustomerEntity() {}

    public CustomerEntity(String name, String email, String address) {
        this.name = name;
        this.email = email;
        this.address = address;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    @Column(nullable = false)
    private int stock;
    @Column(nullable = false, length = 100)
    private String category;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected ProductEntity() {}

    public ProductEntity(String name, BigDecimal price, int stock, String category) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.category = category;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

@Entity
@Table(name = "orders")
public class OrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItemEntity> items = new ArrayList<>();

    protected OrderEntity() {}

    public OrderEntity() {
        this.status = OrderStatus.PENDING;
        this.totalAmount = BigDecimal.ZERO;
        this.createdAt = Instant.now();
    }

    public void recalculateTotal() {
        totalAmount = items.stream()
                .map(item -> item.getUnitPrice()
                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CustomerEntity getCustomer() { return customer; }
    public void setCustomer(CustomerEntity customer) { this.customer = customer; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<OrderItemEntity> getItems() { return items; }
    public void setItems(List<OrderItemEntity> items) { this.items = items; }
}

@Entity
@Table(name = "order_items")
public class OrderItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;
    @Column(nullable = false)
    private int quantity;
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    protected OrderItemEntity() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OrderEntity getOrder() { return order; }
    public void setOrder(OrderEntity order) { this.order = order; }
    public ProductEntity getProduct() { return product; }
    public void setProduct(ProductEntity product) { this.product = product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
}
```

---

## 7. DTOs — Java Records

DTOs are Java **records** — immutable, concise, and perfect for API payloads.

```java
package com.example.ordermgmt.dto;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderItemEntity;
import com.example.ordermgmt.domain.OrderStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "Customer ID is required") Long customerId,
        @NotEmpty(message = "Order must have at least one item")
        List<CreateOrderItemRequest> items
) {}

public record CreateOrderItemRequest(
        @NotNull(message = "Product ID is required") Long productId,
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity
) {}

public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<OrderItemResponse> items
) {
    public static OrderResponse from(OrderEntity entity) {
        return new OrderResponse(
                entity.getId(),
                entity.getCustomer().getId(),
                entity.getCustomer().getName(),
                entity.getStatus(),
                entity.getTotalAmount(),
                entity.getCreatedAt(),
                entity.getItems().stream()
                        .map(OrderItemResponse::from)
                        .toList()
        );
    }
}

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        Integer quantity,
        BigDecimal unitPrice
) {
    public static OrderItemResponse from(OrderItemEntity entity) {
        return new OrderItemResponse(
                entity.getId(),
                entity.getProduct().getId(),
                entity.getProduct().getName(),
                entity.getQuantity(),
                entity.getUnitPrice()
        );
    }
}

public record UpdateOrderStatusRequest(
        @NotNull(message = "Status is required") OrderStatus status
) {}
```

---

## 8. Repository Layer

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.domain.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {}

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    List<ProductEntity> findByCategory(String category);
}

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findByCustomerId(Long customerId);
    List<OrderEntity> findByStatus(OrderStatus status);
}
```

---

## 9. Kafka Event Records

Events are Java records — immutable message payloads.

```java
package com.example.ordermgmt.kafka.event;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt
) {
    public static OrderCreatedEvent from(OrderEntity order) {
        return new OrderCreatedEvent(
                order.getId(),
                order.getCustomer().getId(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt()
        );
    }
}

public record OrderStatusChangedEvent(
        Long orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        Instant changedAt
) {
    public static OrderStatusChangedEvent from(OrderEntity order, OrderStatus oldStatus) {
        return new OrderStatusChangedEvent(
                order.getId(),
                oldStatus,
                order.getStatus(),
                Instant.now()
        );
    }
}
```

---

## 10. Kafka Producer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class OrderEventProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String orderCreatedTopic;
    private final String orderStatusTopic;

    public OrderEventProducer(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kafka.topic.order-created:order-created}") String orderCreatedTopic,
            @Value("${kafka.topic.order-status:order-status}") String orderStatusTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.orderCreatedTopic = orderCreatedTopic;
        this.orderStatusTopic = orderStatusTopic;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(orderCreatedTopic, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderCreatedEvent for order {}", event.orderId(), ex);
            } else {
                log.info("Published OrderCreatedEvent for order {} to partition {}",
                        event.orderId(), result.getRecordMetadata().partition());
            }
        });
    }

    public void publishOrderStatusChanged(OrderStatusChangedEvent event) {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(orderStatusTopic, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderStatusChangedEvent for order {}",
                        event.orderId(), ex);
            } else {
                log.info("Published OrderStatusChangedEvent for order {} to partition {}",
                        event.orderId(), result.getRecordMetadata().partition());
            }
        });
    }
}
```

---

## 11. Kafka Consumer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    @KafkaListener(topics = "${kafka.topic.order-created:order-created}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderCreated(ConsumerRecord<String, OrderCreatedEvent> record) {
        log.info("Received OrderCreatedEvent: orderId={}, partition={}, offset={}",
                record.value().orderId(), record.partition(), record.offset());
        // In a real app: send notification email, update analytics dashboard, etc.
    }

    @KafkaListener(topics = "${kafka.topic.order-status:order-status}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderStatusChanged(ConsumerRecord<String, OrderStatusChangedEvent> record) {
        log.info("Received OrderStatusChangedEvent: orderId={}, {} -> {}",
                record.value().orderId(),
                record.value().oldStatus(),
                record.value().newStatus());
        // In a real app: push real-time update via WebSocket/SSE, trigger shipping, etc.
    }
}
```

---

## 12. Service Layer

```java
package com.example.ordermgmt.service.exception;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
    }
}
```

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.kafka.OrderEventProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.repository.*;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderEventProducer eventProducer;

    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            OrderEventProducer eventProducer) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        log.info("Creating order for customer {}", request.customerId());

        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Customer not found: " + request.customerId()));

        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);

        for (CreateOrderItemRequest itemRequest : request.items()) {
            ProductEntity product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Product not found: " + itemRequest.productId()));

            if (product.getStock() < itemRequest.quantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for product " + product.getName()
                                + ": requested " + itemRequest.quantity()
                                + ", available " + product.getStock());
            }

            OrderItemEntity item = new OrderItemEntity();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(product.getPrice());

            order.getItems().add(item);

            product.setStock(product.getStock() - itemRequest.quantity());
        }

        order.recalculateTotal();
        order = orderRepository.save(order);

        eventProducer.publishOrderCreated(OrderCreatedEvent.from(order));

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        log.info("Updating order {} status to {}", orderId, newStatus);

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        order = orderRepository.save(order);

        eventProducer.publishOrderStatusChanged(
                OrderStatusChangedEvent.from(order, oldStatus));

        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(Long orderId) {
        return orderRepository.findById(orderId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status).stream()
                .map(OrderResponse::from)
                .toList();
    }
}
```

---

## 13. REST Controller

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.service.OrderService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderResponse> findAll() {
        log.info("GET /api/orders");
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable Long id) {
        log.info("GET /api/orders/{}", id);
        return ResponseEntity.ok(orderService.findById(id));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<OrderResponse>> findByStatus(
            @PathVariable OrderStatus status) {
        log.info("GET /api/orders/status/{}", status);
        return ResponseEntity.ok(orderService.findByStatus(status));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        log.info("POST /api/orders - customer {}", request.customerId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        log.info("PUT /api/orders/{}/status - {}", id, request.status());
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.status()));
    }
}
```

---

## 14. Global Exception Handler

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.service.exception.OrderNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(
                HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(
                HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody(
                HttpStatus.CONFLICT, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(
                HttpStatus.BAD_REQUEST, "Validation failed", details));
    }

    private Map<String, Object> errorBody(HttpStatus status, String message) {
        return errorBody(status, message, null);
    }

    private Map<String, Object> errorBody(HttpStatus status, String message, String details) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message,
                "details", details != null ? details : ""
        );
    }
}
```

---

## 15. GraphQL Schema

**`src/main/resources/graphql/schema.graphqls`**

```graphql
type Query {
    orders: [Order!]!
    order(id: ID!): Order
    ordersByStatus(status: OrderStatus!): [Order!]!
}

type Mutation {
    createOrder(input: OrderInput!): Order!
    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!
}

type Order {
    id: ID!
    customerId: ID!
    customerName: String!
    status: OrderStatus!
    totalAmount: BigDecimal!
    createdAt: String!
    items: [OrderItem!]!
}

type OrderItem {
    id: ID!
    productId: ID!
    productName: String!
    quantity: Int!
    unitPrice: BigDecimal!
}

enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
}

input OrderInput {
    customerId: ID!
    items: [OrderItemInput!]!
}

input OrderItemInput {
    productId: ID!
    quantity: Int!
}
```

---

## 16. GraphQL Resolvers

Uses Spring for GraphQL annotations (`@QueryMapping`, `@MutationMapping`).
Spring Boot auto-registers these via `spring-boot-starter-graphql`.

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.CreateOrderItemRequest;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class OrderResolver {

    private static final Logger log = LoggerFactory.getLogger(OrderResolver.class);
    private final OrderService orderService;

    public OrderResolver(OrderService orderService) {
        this.orderService = orderService;
    }

    @QueryMapping
    public List<OrderResponse> orders() {
        log.info("GraphQL query: orders");
        return orderService.findAll();
    }

    @QueryMapping
    public OrderResponse order(@Argument Long id) {
        log.info("GraphQL query: order({})", id);
        return orderService.findById(id);
    }

    @QueryMapping
    public List<OrderResponse> ordersByStatus(@Argument OrderStatus status) {
        log.info("GraphQL query: ordersByStatus({})", status);
        return orderService.findByStatus(status);
    }

    @MutationMapping
    public OrderResponse createOrder(@Argument CreateOrderInput input) {
        log.info("GraphQL mutation: createOrder(customerId={})", input.customerId());
        var request = new CreateOrderRequest(
                input.customerId(),
                input.items().stream()
                        .map(i -> new CreateOrderItemRequest(i.productId(), i.quantity()))
                        .toList()
        );
        return orderService.createOrder(request);
    }

    @MutationMapping
    public OrderResponse updateOrderStatus(@Argument Long orderId,
                                            @Argument OrderStatus status) {
        log.info("GraphQL mutation: updateOrderStatus({}, {})", orderId, status);
        return orderService.updateOrderStatus(orderId, status);
    }

    // GraphQL input types — records matching the schema input objects
    public record CreateOrderInput(Long customerId, List<CreateOrderItemInput> items) {}
    public record CreateOrderItemInput(Long productId, Integer quantity) {}
}
```

---

## 17. Reactive Order Status Stream

This component exposes order status changes as a reactive `Flux` that clients can
subscribe to via GraphQL subscriptions or SSE endpoints. The `Sinks.Many` is a
thread-safe multicast publisher — multiple subscribers each receive every signal.

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class OrderStatusPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusPublisher.class);

    private final Sinks.Many<OrderStatusChangedEvent> sink =
            Sinks.many().multicast().onBackpressureBuffer();

    public void publish(OrderStatusChangedEvent event) {
        log.info("Publishing status change to reactive stream: order {} {} -> {}",
                event.orderId(), event.oldStatus(), event.newStatus());
        sink.tryEmitNext(event);
    }

    public Flux<OrderStatusChangedEvent> subscribe() {
        return sink.asFlux();
    }
}
```

Update `OrderEventConsumer` to also push events to the reactive stream:

```java
@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);
    private final OrderStatusPublisher statusPublisher;

    public OrderEventConsumer(OrderStatusPublisher statusPublisher) {
        this.statusPublisher = statusPublisher;
    }

    @KafkaListener(topics = "${kafka.topic.order-created:order-created}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderCreated(ConsumerRecord<String, OrderCreatedEvent> record) {
        log.info("Received OrderCreatedEvent: orderId={}", record.value().orderId());
    }

    @KafkaListener(topics = "${kafka.topic.order-status:order-status}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderStatusChanged(ConsumerRecord<String, OrderStatusChangedEvent> record) {
        log.info("Received OrderStatusChangedEvent: {} -> {}",
                record.value().oldStatus(), record.value().newStatus());
        statusPublisher.publish(record.value());
    }
}
```

---

## 18. Test Suite Overview

| Test Class | Purpose |
|------------|---------|
| `OrderServiceTest.java` | Unit tests for `OrderService` — creation, status update, total calculation. Mocks repositories and `OrderEventProducer`. |
| `OrderControllerTest.java` | Integration tests for REST endpoints using `MockMvc`. Tests happy path and error handling. |
| `OrderRepositoryTest.java` | Integration tests for JPA repositories using Testcontainers with real PostgreSQL. |
| `OrderEventProducerTest.java` | Integration test for Kafka producer/consumer using Testcontainers embedded Kafka. |
| `OrderStatusPublisherTest.java` | Unit test for reactive stream using `StepVerifier`. |

All tests live under `src/test/java/com/example/ordermgmt/` and run with
`./mvnw test`.

---

## 19. Unit Test: OrderService

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.kafka.OrderEventProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private OrderEventProducer eventProducer;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_withValidRequest_returnsOrderResponse() {
        // Arrange
        CustomerEntity customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer.setId(1L);

        ProductEntity product = new ProductEntity("Coffee Mug", new BigDecimal("12.99"), 100, "Kitchen");
        product.setId(10L);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(inv -> {
            OrderEntity o = inv.getArgument(0);
            o.setId(100L);
            return o;
        });

        var request = new CreateOrderRequest(1L, List.of(
                new CreateOrderItemRequest(10L, 3)
        ));

        // Act
        OrderResponse response = orderService.createOrder(request);

        // Assert
        assertThat(response.customerName()).isEqualTo("Alice");
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("38.97"));
        assertThat(response.items()).hasSize(1);

        verify(orderRepository).save(any(OrderEntity.class));
        verify(eventProducer).publishOrderCreated(any(OrderCreatedEvent.class));
    }

    @Test
    void findById_withNonExistentId_throwsOrderNotFoundException() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(999L))
                .isInstanceOf(OrderNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void createOrder_withInsufficientStock_throwsIllegalStateException() {
        CustomerEntity customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer.setId(1L);

        ProductEntity product = new ProductEntity("Coffee Mug", new BigDecimal("12.99"), 2, "Kitchen");
        product.setId(10L);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        var request = new CreateOrderRequest(1L, List.of(
                new CreateOrderItemRequest(10L, 5)  // Request 5, stock is 2
        ));

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient stock");
    }
}
```

---

## 20. Controller Test (MockMvc)

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockBean
    private OrderService orderService;

    @Test
    void GET_orders_returns200WithJsonArray() throws Exception {
        var order = new OrderResponse(
                1L, 10L, "Alice", OrderStatus.PENDING,
                new BigDecimal("25.98"), Instant.now(), List.of()
        );
        when(orderService.findAll()).thenReturn(List.of(order));

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerName").value("Alice"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void POST_orders_withValidBody_returns201() throws Exception {
        var response = new OrderResponse(
                1L, 10L, "Alice", OrderStatus.PENDING,
                new BigDecimal("25.98"), Instant.now(), List.of()
        );
        when(orderService.createOrder(any(CreateOrderRequest.class))).thenReturn(response);

        var request = new CreateOrderRequest(10L, List.of(
                new CreateOrderItemRequest(1L, 2)
        ));

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void POST_orders_withMissingCustomerId_returns400() throws Exception {
        String invalidJson = """
            {
              "items": [
                {"productId": 1, "quantity": 2}
              ]
            }
            "";

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}
```

---

## 21. Repository Test (Testcontainers)

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private ProductRepository productRepository;

    @Test
    void findByCustomerId_returnsOrdersForThatCustomer() {
        // Arrange
        var customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer = customerRepository.save(customer);

        var product = new ProductEntity("Mug", new BigDecimal("9.99"), 50, "Kitchen");
        product = productRepository.save(product);

        var order = new OrderEntity();
        order.setCustomer(customer);

        var item = new OrderItemEntity();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(2);
        item.setUnitPrice(product.getPrice());
        order.getItems().add(item);

        order.recalculateTotal();
        orderRepository.save(order);

        // Act
        List<OrderEntity> found = orderRepository.findByCustomerId(customer.getId());

        // Assert
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getTotalAmount())
                .isEqualByComparingTo(new BigDecimal("19.98"));
    }

    @Test
    void findByStatus_filtersCorrectly() {
        var customer = new CustomerEntity("Bob", "bob@example.com", "456 Oak");
        customer = customerRepository.save(customer);

        var pending = new OrderEntity();
        pending.setCustomer(customer);
        orderRepository.save(pending);

        var confirmed = new OrderEntity();
        confirmed.setCustomer(customer);
        confirmed.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(confirmed);

        var results = orderRepository.findByStatus(OrderStatus.PENDING);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStatus()).isEqualTo(OrderStatus.PENDING);
    }
}
```

---

## 22. Reactive Stream Test (StepVerifier)

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.domain.OrderStatus;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.time.Instant;

class OrderStatusPublisherTest {

    @Test
    void publish_thenSubscriberReceivesEvent() {
        var publisher = new OrderStatusPublisher();

        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                1L, OrderStatus.PENDING, OrderStatus.CONFIRMED, Instant.now()
        );

        StepVerifier.create(publisher.subscribe())
                .then(() -> publisher.publish(event))
                .expectNextMatches(e ->
                        e.orderId().equals(1L) &&
                        e.oldStatus() == OrderStatus.PENDING &&
                        e.newStatus() == OrderStatus.CONFIRMED)
                .thenCancel()
                .verify();
    }

    @Test
    void multipleSubscribers_eachReceiveEvents() {
        var publisher = new OrderStatusPublisher();

        var event1 = new OrderStatusChangedEvent(
                1L, OrderStatus.PENDING, OrderStatus.CONFIRMED, Instant.now());
        var event2 = new OrderStatusChangedEvent(
                1L, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, Instant.now());

        // Subscribe first, then publish both, then cancel
        StepVerifier.create(publisher.subscribe())
                .then(() -> {
                    publisher.publish(event1);
                    publisher.publish(event2);
                })
                .expectNext(event1)
                .expectNext(event2)
                .thenCancel()
                .verify();
    }
}
```

---

## 23. What You Learned

- How to combine **REST controllers**, **GraphQL resolvers**, **Kafka events**,
  and **WebFlux reactive streams** in a single Spring Boot application
- How to structure a fully layered application: domain entities, repositories,
  services, DTOs, controllers, GraphQL resolvers, and Kafka producer/consumer
- How to use **records** for DTOs and events, and **explicit classes** for JPA entities
- How to write **unit tests** (Mockito), **controller tests** (MockMvc),
  **repository tests** (Testcontainers), and **reactive tests** (StepVerifier)
- How to handle **stock validation**, **transactions**, **exception mapping**,
  and **Kafka event publishing with async callbacks**
- How to expose a **reactive Flux** for real-time status updates using `Sinks.Many`

### Exercises

<details>
<summary>Exercise 1: Add a Product REST Controller</summary>

Create a `ProductController` with `GET /api/products`,
`GET /api/products/{category}`, and `POST /api/products`.
Add a `ProductService` with stock management (increase/decrease).

**Hint**: Follow the same pattern as `OrderController` — constructor injection,
`ResponseEntity` return types, `@Valid` on request body. Add a
`CreateProductRequest` record with validation annotations.
</details>

<details>
<summary>Exercise 2: Add a Kafka DLQ (Dead Letter Queue)</summary>

Modify `OrderEventConsumer` to catch deserialization errors and publish
the failed record to a `order-created-dlq` topic. Add a logging listener
for the DLQ topic.

**Hint**: Use `DefaultErrorHandler` with a `DeadLetterPublishingRecoverer`.
Register it in a `ConcurrentKafkaListenerContainerFactory` bean. See Module 06
for the full pattern.
</details>

<details>
<summary>Exercise 3: Add GraphQL Subscriptions</summary>

Add a `subscription OrderStatusChanged { orderStatusChanged: OrderStatusChangedEvent! }`
to the GraphQL schema and an `@SubscriptionMapping` resolver method that
returns `Flux<OrderStatusChangedEvent>` from `OrderStatusPublisher.subscribe()`.

**Hint**: Spring for GraphQL supports subscriptions over WebSocket out of the box.
Use `org.springframework.graphql.data.method.annotation.SubscriptionMapping`.
</details>

<details>
<summary>Exercise 4: Add Integration Test for Kafka</summary>

Write a test using `@Testcontainers` with the Kafka container that publishes
an `OrderCreatedEvent` and verifies the consumer receives it.

**Hint**: Use `@EmbeddedKafka` or `@Container static KafkaContainer` with
`@ServiceConnection`. Autowire `KafkaTemplate`, send a record, and use
`Awaitility` or `ConcurrentMessageListenerContainer` to verify receipt.
</details>

---

## 24. Extension Ideas (for future modules)

- **Security** — Add Spring Security with JWT authentication, role-based access,
  and audit logging.
- **Micro-services** — Split the domain into separate services (Customer, Product,
  Order) communicating via REST or gRPC.
- **Caching** — Introduce Caffeine or Redis for product look-ups and order status queries.
- **Analytics** — Stream order events to Apache Flink or ksqlDB for real-time dashboards.
- **UI** — Build a React or Thymeleaf front-end that consumes the GraphQL API and
  subscribes to real-time status changes.
- **Deployment** — Containerize the whole stack with Helm charts for Kubernetes.
- **CI/CD** — Add GitHub Actions that runs tests, builds Docker images, and pushes
  to a registry.

---

## 25. Step-by-Step Guide to Run the Application

1. **Create the project** (or clone the repo).

2. **Start PostgreSQL and Kafka**:

```bash
docker compose up -d
```

3. **Verify connectivity**:

```bash
docker exec -it oms-postgres psql -U postgres -c "SELECT 1;"
```

4. **Build and run the application**:

```bash
./mvnw clean package
java -jar target/ordermgmt-1.0.0.jar
```

   The REST API is at `http://localhost:8080/api/orders` and
   GraphQL at `http://localhost:8080/graphql`.
   GraphiQL UI at `http://localhost:8080/graphiql`.

5. **Run the test suite**:

```bash
./mvnw test
```

6. **Explore the API** — see the curl commands and GraphQL queries below.

---

## 26. Example Curl Commands (REST)

```bash
# --- Create a customer ---
curl -X POST http://localhost:8080/api/customers \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice","email":"alice@example.com","address":"123 Main St"}'

# --- Create a product ---
curl -X POST http://localhost:8080/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Coffee Mug","price":"12.99","stock":100,"category":"Kitchen"}'

# --- Create an order ---
curl -X POST http://localhost:8080/api/orders \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": 1,
       "items": [
         {"productId": 1, "quantity": 2},
         {"productId": 2, "quantity": 1}
       ]
     }'

# --- List all orders ---
curl http://localhost:8080/api/orders

# --- Update order status ---
curl -X PUT http://localhost:8080/api/orders/1/status \
     -H "Content-Type: application/json" \
     -d '{"status":"CONFIRMED"}'
```

---

## 27. Example GraphQL Queries

**Query all orders**
```graphql
query GetAllOrders {
  orders {
    id
    customerName
    status
    totalAmount
    items {
      productName
      quantity
      unitPrice
    }
  }
}
```

**Query orders by status**
```graphql
query GetPendingOrders {
  ordersByStatus(status: PENDING) {
    id
    customerName
    totalAmount
  }
}
```

**Create an order (mutation)**
```graphql
mutation CreateOrder {
  createOrder(input: {
    customerId: 1,
    items: [
      {productId: 1, quantity: 2},
      {productId: 2, quantity: 1}
    ]
  }) {
    id
    status
    totalAmount
  }
}
```

**Update order status**
```graphql
mutation UpdateStatus {
  updateOrderStatus(orderId: 1, status: CONFIRMED) {
    id
    status
  }
}
```

---

## 24. API Versioning Strategy

API versioning lets you evolve your API without breaking existing clients.

### URL-Based Versioning

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderControllerV1 {
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseV1> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findByIdV1(id));
    }
}

@RestController
@RequestMapping("/api/v2/orders")
public class OrderControllerV2 {
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseV2> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findByIdV2(id));
    }
}
```

```bash
# V1 client
curl http://localhost:8080/api/v1/orders/1

# V2 client (new fields, different shape)
curl http://localhost:8080/api/v2/orders/1
```

### Header-Based Versioning

```java
@GetMapping(value = "/api/orders/{id}", headers = "X-API-Version=1")
public ResponseEntity<OrderResponseV1> findByIdV1(@PathVariable Long id) { ... }

@GetMapping(value = "/api/orders/{id}", headers = "X-API-Version=2")
public ResponseEntity<OrderResponseV2> findByIdV2(@PathVariable Long id) { ... }
```

```bash
curl -H "X-API-Version: 2" http://localhost:8080/api/orders/1
```

### Content Negotiation Versioning

```java
@GetMapping(value = "/api/orders/{id}", produces = "application/vnd.ordermgmt.v1+json")
public ResponseEntity<OrderResponseV1> findByIdV1(@PathVariable Long id) { ... }

@GetMapping(value = "/api/orders/{id}", produces = "application/vnd.ordermgmt.v2+json")
public ResponseEntity<OrderResponseV2> findByIdV2(@PathVariable Long id) { ... }
```

```bash
curl -H "Accept: application/vnd.ordermgmt.v2+json" http://localhost:8080/api/orders/1
```

### Comparison

| Approach | Pros | Cons |
|----------|------|------|
| URL path (`/v1/`) | Simple, cacheable, visible | URL changes with versions |
| Header (`X-API-Version`) | URL stays clean | Not visible in URL, harder to debug |
| Content negotiation | RESTful, uses standard headers | Complex Accept header |

---

## 25. Docker Production Best Practices

### Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM maven:3-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline  # cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime (small image)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/target/ordermgmt-1.0.0.jar app.jar

# JVM container-aware settings
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"'

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### Key Production Practices

| Practice | Why |
|----------|-----|
| Multi-stage build | Final image only contains the JRE + JAR (~200MB vs ~800MB) |
| Non-root user | Prevents privilege escalation if container is compromised |
| `MaxRAMPercentage` | JVM auto-tunes heap to container memory limits |
| Health check | Orchestrator (Kubernetes) knows when app is ready |
| Layer caching | `pom.xml` copied before `src/` — dependency download cached |
| Alpine base | Smaller attack surface, fewer vulnerabilities |

---

## 26. Observability and Monitoring

### Structured JSON Logging

```java
// In application.yml — use Logback's JSON encoder
# Add dependency: net.logstash.logback:logstash-logback-encoder
```

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <customFields>{"service":"ordermgmt","version":"1.0.0"}</customFields>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

Output:
```json
{"@timestamp":"2025-01-15T10:30:00Z","level":"INFO","logger":"c.e.o.service.OrderService","message":"Creating order","service":"ordermgmt","version":"1.0.0"}
```

### Micrometer Metrics

Spring Boot Actuator + Micrometer exposes metrics at `/actuator/metrics`:

```java
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final Counter ordersCreated;
    private final Timer orderProcessingTime;

    public OrderService(OrderRepository repo, MeterRegistry meterRegistry) {
        this.repo = repo;
        this.meterRegistry = meterRegistry;
        this.ordersCreated = meterRegistry.counter("orders.created.total");
        this.orderProcessingTime = meterRegistry.timer("orders.processing.time");
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        return orderProcessingTime.record(() -> {
            ordersCreated.increment();
            // ... business logic
        });
    }
}
```

### Custom Health Indicator

```java
@Component
public class KafkaHealthIndicator implements HealthIndicator {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaHealthIndicator(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public Health health() {
        try {
            kafkaTemplate.getDefaultTopic();  // check connectivity
            return Health.up()
                    .withDetail("broker", "connected")
                    .build();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
```

Access at: `GET /actuator/health` → includes `kafka` health indicator.

---

## Recommended YouTube Videos

- **[Spring Boot Tutorial for Beginners - Crash Course using Spring Boot 3]** by Dan Vega — Full crash course that ties together all concepts used in this capstone (3:43:52, 840K views)
  https://www.youtube.com/watch?v=UgX5lgv4uVM

- **[Spring Boot Tutorial for Beginners | Full Course 2025]** by Amigoscode — Modern full course with Java 21, Docker, PostgreSQL, and JPA (1:11:19, 251K views)
  https://www.youtube.com/watch?v=Cw0J6jYJtzw

- **[Test Driven Development (TDD) in Spring]** by Dan Vega — TDD approach for testing REST controllers, essential for the capstone test section (51:09, 39K views)
  https://www.youtube.com/watch?v=-H5sud1-K5A

---


← [Previous: Module 09](./09-tdd.md) | [Next: Module 11](./11-migrating-java-to-kotlin.md) →
