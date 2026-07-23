---
title: "Module 05: Service-Oriented Architecture"
description: "Service-Oriented Architecture"
---

## What You'll Learn

- What an architecture pattern is and why software needs structure
- The difference between monolithic, microservices, and service-oriented architecture
- Layered architecture: Controller, Service, Repository, Database
- How to build a service layer with Spring Boot
- Transaction management with `@Transactional`
- Data Transfer Objects (DTOs) and why we use them
- Domain exceptions and custom exception hierarchies
- Application events for decoupled communication between services
- Common anti-patterns to avoid

## Prerequisites

- [Module 00: Java for Experienced Developers](../00-java-foundations/) — you understand Java classes, records, interfaces, exceptions
- [Module 01: Build Tools & Project Setup](../01-build-tools-and-project-setup/) — you have a working Spring Boot project
- [Module 02: Dependency Injection](../02-dependency-injection/) — you understand `@Service`, `@Component`, constructor injection
- [Module 03: Spring Boot Fundamentals](../03-spring-boot-fundamentals/) — you can build REST controllers
- [Module 04: Repository Pattern](../04-repository-pattern/) — you understand JPA entities and Spring Data repositories

---

## 1. What Is an Architecture Pattern?

When you build a house, you don't just start placing bricks randomly. You follow a blueprint that says where the foundation goes, where the walls are, where the plumbing runs. The same is true for software.

An **architecture pattern** is a blueprint for how to organize the code in your application. It defines:

- Which parts of the code talk to which other parts
- What responsibilities each part has
- How data flows through the system

Without an architecture pattern, code becomes a tangled mess where everything depends on everything else. Changing one thing breaks five other things. This is called **spaghetti code**, and it is a nightmare to maintain.

---

## 2. Monolithic vs Microservices vs SOA

### Monolithic Architecture

A **monolith** is a single application where all the code lives in one codebase and runs as one process.

```
┌─────────────────────────────────┐
│         Monolithic App           │
│  ┌───────┐ ┌───────┐ ┌───────┐  │
│  │Orders │ │Users  │ │Billing│  │
│  └───────┘ └───────┘ └───────┘  │
│         Single database          │
└─────────────────────────────────┘
```

**Pros:** Simple to develop, deploy, and test. One codebase, one deployment.

**Cons:** As the application grows, it becomes hard to understand and change. One bug can bring down the entire system.

### Microservices Architecture

**Microservices** split the application into many small, independently deployable services, each with its own database.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Order   │  │   User   │  │  Billing │
│ Service  │  │ Service  │  │ Service  │
│  (DB)    │  │  (DB)    │  │  (DB)    │
└──────────┘  └──────────┘  └──────────┘
```

**Pros:** Each service is small and focused. Teams can work independently. Services can be deployed separately.

**Cons:** Complexity. Distributed systems are hard. Network failures, data consistency, and debugging across services are all challenges.

### Service-Oriented Architecture (SOA)

**SOA** is a middle ground. The application is a monolith (single deployment), but the code is organized into **services** — logical groupings of business functionality. Each service has its own layer (controller, service, repository), but they share a database and run in the same process.

```
┌─────────────────────────────────────────┐
│              Spring Boot App              │
│                                           │
│  ┌─────────────────┐  ┌────────────────┐ │
│  │  Order Service   │  │ Customer Service│ │
│  │  ┌────────────┐  │  │  ┌──────────┐ │ │
│  │  │Controller  │  │  │  │Controller │ │ │
│  │  │  Service   │  │  │  │  Service  │ │ │
│  │  │ Repository │  │  │  │Repository │ │ │
│  │  └────────────┘  │  │  └──────────┘ │ │
│  └─────────────────┘  └────────────────┘ │
│                                           │
│           Shared Database                 │
└─────────────────────────────────────────┘
```

This is the approach we use in this course. It gives us clean separation of concerns without the complexity of distributed systems.

---

## 3. Layered Architecture

The most common architecture pattern within a Spring Boot application is **layered architecture**. Each layer has a specific responsibility and can only talk to the layer directly below it.

```
┌──────────────────────────────────────────────┐
│               Client (Browser, Mobile)        │
└──────────────────┬───────────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────────┐
│            Controller Layer                    │
│  Receives HTTP requests, validates input,      │
│  returns HTTP responses                        │
│  Does NOT contain business logic               │
└──────────────────┬───────────────────────────┘
                   │ calls
┌──────────────────▼───────────────────────────┐
│              Service Layer                     │
│  Contains business logic, orchestrates         │
│  repository calls, enforces rules              │
│  This is the "brain" of the application         │
└──────────────────┬───────────────────────────┘
                   │ calls
┌──────────────────▼───────────────────────────┐
│            Repository Layer                    │
│  Talks to the database, executes queries        │
│  No business logic, just data access           │
└──────────────────┬───────────────────────────┘
                   │ SQL
┌──────────────────▼───────────────────────────┐
│              Database                          │
│  PostgreSQL — stores your data                 │
└──────────────────────────────────────────────┘
```

### The Golden Rule

**Each layer may only talk to the layer directly below it.**

- Controllers call Services. Controllers do NOT call Repositories directly.
- Services call Repositories. Services do NOT return HTTP responses.
- Repositories talk to the Database. Repositories do NOT contain business logic.

This rule keeps responsibilities clean and makes the code easy to test and maintain.

### Why Not Skip Layers?

You might think: "The controller just needs to list orders, why not call the repository directly?"

Because someday you'll need to add logic between the request and the database:
- Check if the user is authorized to see these orders
- Filter out cancelled orders
- Cache the results
- Send a notification when an order is viewed

If the controller calls the repository directly, all that logic ends up in the controller. The controller becomes a 500-line mess. The service layer exists to keep the controller thin.

---

## 4. The Service Layer

The service layer is where your business logic lives. In Spring Boot, a service is a class annotated with `@Service` that receives its dependencies through constructor injection.

Let's build the `OrderService` for our Order Management System:

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderItemEntity;
import com.example.ordermgmt.domain.ProductEntity;
import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.dto.CreateOrderItemRequest;
import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.repository.OrderRepository;
import com.example.ordermgmt.repository.ProductRepository;
import com.example.ordermgmt.repository.CustomerRepository;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.example.ordermgmt.service.exception.InsufficientStockException;
import com.example.ordermgmt.service.exception.CustomerNotFoundException;
import com.example.ordermgmt.service.exception.ProductNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    // Constructor injection — Spring wires these automatically
    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        log.info("create_order customerId={}", request.customerId());

        // 1. Find the customer
        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new CustomerNotFoundException(request.customerId()));

        // 2. Create the order entity
        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedAt(Instant.now());
        order.setItems(new ArrayList<>());

        // 3. Process each order item
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreateOrderItemRequest itemRequest : request.items()) {
            ProductEntity product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ProductNotFoundException(itemRequest.productId()));

            // Check stock
            if (product.getStock() < itemRequest.quantity()) {
                throw new InsufficientStockException(
                        product.getId(), product.getStock(), itemRequest.quantity());
            }

            // Reserve stock
            product.setStock(product.getStock() - itemRequest.quantity());
            productRepository.save(product);

            // Create order item
            OrderItemEntity orderItem = new OrderItemEntity();
            orderItem.setProduct(product);
            orderItem.setQuantity(itemRequest.quantity());
            orderItem.setUnitPrice(product.getPrice());
            orderItem.setOrder(order);
            order.getItems().add(orderItem);

            // Add to total
            BigDecimal itemTotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.quantity()));
            totalAmount = totalAmount.add(itemTotal);
        }

        order.setTotalAmount(totalAmount);

        // 4. Save the order
        OrderEntity savedOrder = orderRepository.save(order);
        log.info("order_created orderId={} total={}", savedOrder.getId(), totalAmount);

        // 5. Return the response
        return OrderResponse.from(savedOrder);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        log.info("get_order orderId={}", id);
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));
        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByCustomer(Long customerId) {
        log.info("list_orders customerId={}", customerId);
        return orderRepository.findByCustomerId(customerId).stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        log.info("confirm_order orderId={}", orderId);
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException(
                    "Order must be PENDING to confirm, current status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CONFIRMED);
        OrderEntity saved = orderRepository.save(order);
        log.info("order_confirmed orderId={}", orderId);
        return OrderResponse.from(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        log.info("cancel_order orderId={}", orderId);
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new IllegalStateException("Cannot cancel a delivered order");
        }

        // Restore stock for each item
        for (OrderItemEntity item : order.getItems()) {
            ProductEntity product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.CANCELLED);
        OrderEntity saved = orderRepository.save(order);
        log.info("order_cancelled orderId={}", orderId);
        return OrderResponse.from(saved);
    }
}
```

### What Makes This a Good Service?

1. **Single responsibility:** It handles order-related business logic. Nothing else.
2. **Constructor injection:** Dependencies are explicit and final.
3. **Transactions:** Each method that modifies data is annotated with `@Transactional`. Read methods use `@Transactional(readOnly = true)`.
4. **Logging:** Every method logs what it's doing for debugging.
5. **Domain exceptions:** It throws specific exceptions (`OrderNotFoundException`, `InsufficientStockException`) instead of generic ones.
6. **DTOs:** It returns `OrderResponse` objects, not raw entities.

---

## 5. Transaction Management

A **transaction** is a sequence of operations that either all succeed together or all fail together. Think of a bank transfer: if you transfer $100 from account A to account B, two things must happen:

1. Deduct $100 from account A
2. Add $100 to account B

If step 1 succeeds but step 2 fails, the money is lost. A transaction ensures that both steps either succeed together or fail together. This is called **atomicity** (the "A" in **ACID**).

### ACID Properties

| Property | Meaning | Example |
|----------|---------|---------|
| **Atomicity** | All operations in a transaction succeed or none do | If stock reservation fails for one item, the entire order creation rolls back |
| **Consistency** | The database is always in a valid state | You can't have an order with a negative total |
| **Isolation** | Concurrent transactions don't interfere with each other | Two users ordering the same product don't see each other's changes mid-transaction |
| **Durability** | Once committed, changes survive crashes | After the database confirms the order is saved, it won't disappear even if the server crashes |

### The `@Transactional` Annotation

Spring Boot manages transactions for you with the `@Transactional` annotation:

```java
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    // Everything inside this method is one transaction.
    // If any exception is thrown, all database changes are rolled back.
    // If the method completes normally, all changes are committed.
}
```

### Read-Only Transactions

For methods that only read data (no writes), use `@Transactional(readOnly = true)`:

```java
@Transactional(readOnly = true)
public OrderResponse getOrderById(Long id) {
    // readOnly = true tells the database we won't modify anything.
    // The database can optimize for reads.
}
```

### Transaction Propagation

**Propagation** defines what happens when a transactional method calls another transactional method. The most common options:

| Propagation | Behavior | When to use |
|-------------|----------|-------------|
| `REQUIRED` (default) | Use the existing transaction, or create a new one if none exists | Most cases |
| `REQUIRES_NEW` | Always start a new transaction, suspending the existing one | Logging that must succeed even if the main transaction fails |
| `NESTED` | Create a nested transaction that can roll back independently | Rarely needed |

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void logAuditEvent(String event) {
    // This runs in its own transaction.
    // Even if the calling transaction rolls back, this log entry is saved.
}
```

### Transaction Isolation Levels

Isolation levels control how much one transaction can see of another transaction's uncommitted changes:

| Level | Description | Risk |
|-------|-------------|------|
| `DEFAULT` | Uses the database's default (usually `READ_COMMITTED`) | — |
| `READ_UNCOMMITTED` | Can read uncommitted changes from other transactions | Dirty reads |
| `READ_COMMITTED` | Only reads committed data | Non-repeatable reads |
| `REPEATABLE_READ` | Same query returns the same results within a transaction | Phantom reads |
| `SERIALIZABLE` | Transactions execute as if they were sequential | Slow performance |

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public OrderResponse getOrderById(Long id) {
    // Only sees data that has been committed by other transactions.
}
```

For most applications, the default isolation level is fine. You only need to change it when you have specific concurrency requirements.

---

## 6. Data Transfer Objects (DTOs)

A **DTO (Data Transfer Object)** is a simple object that carries data between layers. In our application, DTOs serve two purposes:

1. **Request DTOs:** Define the shape of data coming from the client
2. **Response DTOs:** Define the shape of data going back to the client

### Why Use DTOs?

You might wonder: "Why not just return the entity directly?" There are several reasons:

**1. Security:** Your entity has fields like `id` and `createdAt` that are set by the server. If you accept the entity directly, a client could set `id` to overwrite an existing order, or set `createdAt` to fake the timestamp.

**2. Decoupling:** Your database entity might have fields the client doesn't need. Sending all fields wastes bandwidth and couples the API to the database schema.

**3. Different shapes:** A create request needs `customerId` and `items`. A response needs `id`, `status`, and `totalAmount`. The shapes are different.

### Request DTO

```java
package com.example.ordermgmt.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "Customer ID is required") Long customerId,

        @NotEmpty(message = "Order must have at least one item")
        List<@NotNull CreateOrderItemRequest> items
) {}
```

```java
package com.example.ordermgmt.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateOrderItemRequest(
        @NotNull(message = "Product ID is required") Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity
) {}
```

These are **Java records** (introduced in Module 00). They are immutable, compact, and perfect for DTOs. Validation annotations (`@NotNull`, `@Min`, `@NotEmpty`) come from the **Jakarta Bean Validation** API (the `jakarta.validation` package — Spring Boot 3.x uses Jakarta EE namespaces, not the older `javax.validation`).

### Response DTO

```java
package com.example.ordermgmt.dto;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<OrderItemResponse> items
) {
    // Factory method to create a DTO from an entity
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
```

```java
package com.example.ordermgmt.dto;

import com.example.ordermgmt.domain.OrderItemEntity;

import java.math.BigDecimal;

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
```

### The `from()` Factory Method

Notice the `from()` method on each response DTO. This is a **factory method** — a static method that creates a DTO from an entity. This pattern:

- Keeps the conversion logic in one place (the DTO itself)
- Is easy to test
- Avoids needing a separate mapper class for simple conversions

For more complex mappings with many fields, you can use a library like **MapStruct** (which generates mapper code at compile time), but for our course, manual `from()` methods are sufficient and clearer for learning.

---

## 7. Domain Exceptions

Exceptions in your service layer should be **specific** and **meaningful**. Throwing `RuntimeException("Not found")` tells the caller nothing. Throwing `OrderNotFoundException(orderId)` tells the caller exactly what went wrong and with what data.

### Custom Exception Hierarchy

```java
package com.example.ordermgmt.service.exception;

// Base exception for all order management errors
public class OrderManagementException extends RuntimeException {
    public OrderManagementException(String message) {
        super(message);
    }

    public OrderManagementException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

```java
package com.example.ordermgmt.service.exception;

public class OrderNotFoundException extends OrderManagementException {
    private final Long orderId;

    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
        this.orderId = orderId;
    }

    public Long getOrderId() {
        return orderId;
    }
}
```

```java
package com.example.ordermgmt.service.exception;

public class CustomerNotFoundException extends OrderManagementException {
    private final Long customerId;

    public CustomerNotFoundException(Long customerId) {
        super("Customer not found: " + customerId);
        this.customerId = customerId;
    }

    public Long getCustomerId() {
        return customerId;
    }
}
```

```java
package com.example.ordermgmt.service.exception;

public class ProductNotFoundException extends OrderManagementException {
    private final Long productId;

    public ProductNotFoundException(Long productId) {
        super("Product not found: " + productId);
        this.productId = productId;
    }

    public Long getProductId() {
        return productId;
    }
}
```

```java
package com.example.ordermgmt.service.exception;

public class InsufficientStockException extends OrderManagementException {
    private final Long productId;
    private final int availableStock;
    private final int requestedQuantity;

    public InsufficientStockException(Long productId, int availableStock, int requestedQuantity) {
        super(String.format(
                "Insufficient stock for product %d: available=%d, requested=%d",
                productId, availableStock, requestedQuantity));
        this.productId = productId;
        this.availableStock = availableStock;
        this.requestedQuantity = requestedQuantity;
    }

    public Long getProductId() {
        return productId;
    }

    public int getAvailableStock() {
        return availableStock;
    }

    public int getRequestedQuantity() {
        return requestedQuantity;
    }
}
```

### Why a Hierarchy?

Having all custom exceptions extend `OrderManagementException` means:

1. You can catch all domain exceptions with one `catch` block if needed
2. You can handle specific exceptions differently in your `@ControllerAdvice` (which you learned about in Module 03)
3. The exception type itself documents what went wrong

### Handling Exceptions in the Controller

Remember from Module 03, we use `@RestControllerAdvice` to translate exceptions into HTTP responses:

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.service.exception.OrderManagementException;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.example.ordermgmt.service.exception.InsufficientStockException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOrderNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage(),
                "orderId", ex.getOrderId()
        ));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 409,
                "error", "Conflict",
                "message", ex.getMessage(),
                "productId", ex.getProductId(),
                "availableStock", ex.getAvailableStock(),
                "requestedQuantity", ex.getRequestedQuantity()
        ));
    }

    @ExceptionHandler(OrderManagementException.class)
    public ResponseEntity<Map<String, Object>> handleDomainException(OrderManagementException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "Bad Request",
                "message", ex.getMessage()
        ));
    }
}
```

---

## 8. The Controller Layer (Recap)

Now that we have the service layer, the controller becomes very thin. It only:

1. Receives the HTTP request
2. Validates input (using `@Valid`)
3. Calls the service
4. Returns the response

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrdersByCustomer(
            @RequestParam Long customerId) {
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<OrderResponse> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmOrder(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancelOrder(id));
    }
}
```

Notice how the controller contains **zero business logic**. It just delegates to the service. If you removed the service, the controller would have no idea how to create an order, check stock, or calculate totals. That is the sign of a well-designed controller.

---

## 9. Service-to-Service Communication

Sometimes one service needs to call another. For example, the `OrderService` might need to call the `CustomerService` to check if a customer is active before allowing them to place an order.

### Option 1: Direct Method Call (Same Application)

When both services run in the same Spring Boot application, one service can simply inject and call the other:

```java
@Service
public class OrderService {

    private final CustomerService customerService;
    private final OrderRepository orderRepository;

    public OrderService(CustomerService customerService, OrderRepository orderRepository) {
        this.customerService = customerService;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // Call the customer service to verify the customer
        CustomerResponse customer = customerService.getCustomerById(request.customerId());

        if (!customer.active()) {
            throw new IllegalStateException("Customer is not active: " + customer.id());
        }

        // Continue with order creation...
    }
}
```

**Warning:** Be careful about circular dependencies. If `OrderService` calls `CustomerService` and `CustomerService` calls `OrderService`, Spring will fail to start. If you need bidirectional communication, use events (see below).

### Option 2: Application Events (Decoupled Communication)

When you want to notify other parts of the system without creating tight coupling, use Spring's **application events**.

First, define an event:

```java
package com.example.ordermgmt.service.event;

import com.example.ordermgmt.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

Then publish the event from the service:

```java
@Service
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;
    private final OrderRepository orderRepository;
    // ... other dependencies

    public OrderService(
            ApplicationEventPublisher eventPublisher,
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository) {
        this.eventPublisher = eventPublisher;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // ... order creation logic ...

        OrderEntity savedOrder = orderRepository.save(order);

        // Publish an event — anyone listening will be notified
        eventPublisher.publishEvent(new OrderCreatedEvent(
                savedOrder.getId(),
                savedOrder.getCustomer().getId(),
                savedOrder.getTotalAmount(),
                savedOrder.getCreatedAt()
        ));

        return OrderResponse.from(savedOrder);
    }
}
```

Then create a listener:

```java
package com.example.ordermgmt.service.event;

import com.example.ordermgmt.service.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class OrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventListener.class);

    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("order_created_event orderId={} customerId={} total={}",
                event.orderId(), event.customerId(), event.totalAmount());

        // Here you could:
        // - Send a confirmation email
        // - Update analytics
        // - Trigger a Kafka message (we'll learn this in Module 06)
        // - Update a recommendation engine
    }
}
```

### Why Events vs Direct Calls?

| Approach | Coupling | When to use |
|----------|----------|-------------|
| Direct method call | Tight — caller depends on the callee | When you need the result immediately |
| Application events | Loose — publisher doesn't know who listens | When you want to notify without waiting for a response |

Events are the foundation of **event-driven architecture**, which we'll explore more in Module 06 when we add Kafka.

---

## 10. Anti-Patterns to Avoid

### Anti-Pattern 1: Fat Controller

**Problem:** Business logic in the controller instead of the service.

```java
// BAD — controller doing too much
@PostMapping("/orders")
public ResponseEntity<OrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
    CustomerEntity customer = customerRepository.findById(request.customerId()).orElseThrow();
    OrderEntity order = new OrderEntity();
    order.setCustomer(customer);
    for (CreateOrderItemRequest item : request.items()) {
        ProductEntity product = productRepository.findById(item.productId()).orElseThrow();
        product.setStock(product.getStock() - item.getQuantity());
        productRepository.save(product);
        // ... 20 more lines of business logic
    }
    orderRepository.save(order);
    return ResponseEntity.ok(OrderResponse.from(order));
}
```

**Fix:** Move all business logic to the service layer. The controller should be 5-10 lines per method.

### Anti-Pattern 2: Anemic Domain Model

**Problem:** Entities are just bags of getters and setters with no behavior. All logic lives in the service.

```java
// BAD — entity with no behavior, logic scattered in services
OrderEntity order = new OrderEntity();
order.setStatus(OrderStatus.CONFIRMED);
order.setTotalAmount(BigDecimal.ZERO);
// Service does everything: calculating totals, changing status, etc.
```

**Fix:** Put domain logic in the entity where it belongs:

```java
// GOOD — entity encapsulates its own rules
OrderEntity order = new OrderEntity(customer);
order.addItem(product, 3);  // Entity calculates the line total
order.confirm();              // Entity enforces state transition rules
```

### Anti-Pattern 3: Business Logic in Repository

**Problem:** Custom queries that contain business rules.

```java
// BAD — repository doing business logic
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @Query("SELECT o FROM OrderEntity o WHERE o.status = 'PENDING' AND o.totalAmount > 1000")
    List<OrderEntity> findHighValuePendingOrders();
    // "high value" is a business rule, not a data access concern
}
```

**Fix:** Keep repositories simple. Put the filtering logic in the service:

```java
// GOOD — repository is generic, service applies the business rule
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status")
    List<OrderEntity> findByStatus(@Param("status") OrderStatus status);
}

// In the service:
List<OrderEntity> pendingOrders = orderRepository.findByStatus(OrderStatus.PENDING);
List<OrderEntity> highValue = pendingOrders.stream()
        .filter(o -> o.getTotalAmount().compareTo(BigDecimal.valueOf(1000)) > 0)
        .toList();
```

### Anti-Pattern 4: Service That Does Everything

**Problem:** One giant `OrderService` that handles orders, payments, shipping, notifications, and inventory.

**Fix:** Split into focused services: `OrderService`, `PaymentService`, `ShippingService`, `NotificationService`, `InventoryService`.

---

## 11. Complete Architecture Summary

Here is the complete picture of how all the pieces fit together:

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Client                    │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (JSON)
┌────────────────────────▼────────────────────────────┐
│                  Controller Layer                      │
│  OrderController                                       │
│  - Receives HTTP requests                              │
│  - Validates input with @Valid                         │
│  - Calls service, wraps result in ResponseEntity       │
│  - Handles NO business logic                           │
└────────────────────────┬────────────────────────────┘
                         │ DTOs (CreateOrderRequest)
┌────────────────────────▼────────────────────────────┐
│                   Service Layer                       │
│  OrderService                                          │
│  - Contains business logic                            │
│  - Manages transactions with @Transactional          │
│  - Calls repositories for data access                 │
│  - Publishes domain events                            │
│  - Returns DTOs (never entities)                      │
└──────────┬─────────────┬──────────────────────────────┘
           │             │ events
┌──────────▼──────┐ ┌───▼──────────────────────────┐
│ Repository Layer │ │  Event Listeners              │
│ OrderRepository  │ │  OrderEventListener           │
│ - Spring Data    │ │  - Reacts to domain events     │
│   JPA interface  │ │  - Decoupled from publisher   │
│ - Executes SQL   │ └───────────────────────────────┘
└──────────┬───────┘
           │ SQL
┌──────────▼──────────────────────────────────────────┐
│                  Database (PostgreSQL)                │
│  Tables: customers, products, orders, order_items   │
└─────────────────────────────────────────────────────┘
```

### Package Structure

```
com.example.ordermgmt
├── config/                     # Configuration classes
├── controller/                  # REST controllers
│   ├── OrderController.java
│   └── GlobalExceptionHandler.java
├── domain/                      # JPA entities and enums
│   ├── OrderEntity.java
│   ├── OrderItemEntity.java
│   ├── CustomerEntity.java
│   ├── ProductEntity.java
│   └── OrderStatus.java
├── dto/                         # Request and Response DTOs
│   ├── CreateOrderRequest.java
│   ├── CreateOrderItemRequest.java
│   ├── OrderResponse.java
│   └── OrderItemResponse.java
├── repository/                  # Spring Data JPA repositories
│   ├── OrderRepository.java
│   ├── ProductRepository.java
│   └── CustomerRepository.java
├── service/                     # Business logic
│   ├── OrderService.java
│   ├── CustomerService.java
│   ├── event/
│   │   ├── OrderCreatedEvent.java
│   │   └── OrderEventListener.java
│   └── exception/
│       ├── OrderManagementException.java
│       ├── OrderNotFoundException.java
│       ├── CustomerNotFoundException.java
│       ├── ProductNotFoundException.java
│       └── InsufficientStockException.java
└── OrderManagementApplication.java
```

---

## What You Learned

- An architecture pattern is a blueprint for organizing code — it keeps responsibilities clean and changes safe
- **SOA** organizes code into logical services within a single deployable application
- **Layered architecture** (Controller → Service → Repository → Database) is the standard Spring Boot pattern, and each layer may only talk to the layer directly below it
- The **service layer** contains business logic, uses `@Transactional` for transaction management, and returns DTOs (never entities)
- **Transactions** (ACID) ensure all operations in a transaction succeed or fail together — use `@Transactional` for writes and `@Transactional(readOnly = true)` for reads
- **DTOs** decouple the API shape from the database schema and prevent security issues
- **Domain exceptions** with a hierarchy give meaningful error messages and are translated to HTTP responses by `@RestControllerAdvice`
- **Application events** enable loose coupling — the publisher doesn't know who listens
- Anti-patterns to avoid: fat controllers, anemic domain models, business logic in repositories, and services that do everything

---
## 12. Transaction Propagation in Depth

When a `@Transactional` method calls another `@Transactional` method, the
**propagation** behavior determines what happens with the transaction.

### The Seven Propagation Types

| Propagation | Behavior | Use Case |
|-------------|----------|----------|
| `REQUIRED` (default) | Join existing transaction, or create new one | Most business logic |
| `REQUIRES_NEW` | Always start a new transaction, suspend existing | Audit logging that must succeed independently |
| `NESTED` | Create a savepoint within existing transaction | Partial rollback without losing parent work |
| `SUPPORTS` | Join if exists, run non-transactional if not | Read-only queries |
| `MANDATORY` | Must run inside existing transaction — error if none | Methods that should only be called from transactional code |
| `NEVER` | Must run without transaction — error if one exists | External API calls that shouldn't be transactional |
| `NOT_SUPPORTED` | Suspend existing transaction, run non-transactional | Long-running operations that don't need a transaction |

### Code Example: REQUIRES_NEW for Audit Logging

```java
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final AuditLogService auditLog;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        OrderEntity order = buildOrder(request);
        orderRepo.save(order);
        auditLog.log("ORDER_CREATED", order.getId());  // should succeed even if order save rolled back
        return OrderResponse.from(order);
    }
}

@Service
public class AuditLogService {

    @Transactional(propagation = Propagation.REQUIRES_NEW)  // independent transaction
    public void log(String action, Long entityId) {
        // This commits independently — even if the caller rolls back,
        // the audit log entry is saved
        auditRepo.save(new AuditEntry(action, entityId, Instant.now()));
    }
}
```

### Common Pitfall: Self-Invocation

```java
@Service
public class OrderService {

    @Transactional
    public void processAll(List<Long> ids) {
        for (Long id : ids) {
            this.processOne(id);  // BAD: bypasses @Transactional proxy!
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processOne(Long id) {
        // This does NOT get REQUIRES_NEW — Spring proxies don't intercept self-calls
        // The method runs in the SAME transaction as processAll
    }
}
```

---

## 13. Domain Events and Application Events

Spring's event system lets components communicate **without direct dependencies**.

### Publishing Events

```java
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepo, ApplicationEventPublisher eventPublisher) {
        this.orderRepo = orderRepo;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        OrderEntity order = buildOrder(request);
        orderRepo.save(order);

        // Publish an event — listeners will react
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId(), order.getStatus(), order.getTotalAmount()));
        return OrderResponse.from(order);
    }
}

public record OrderCreatedEvent(Long orderId, OrderStatus status, BigDecimal totalAmount) {}
```

### Listening to Events

```java
@Component
public class OrderEventListener {

    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("Order created: id={}, total=${}", event.orderId(), event.totalAmount());
        // Send email, update analytics, etc.
    }

    // Runs AFTER the transaction commits (not on rollback)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreatedAfterCommit(OrderCreatedEvent event) {
        // Only fires if the transaction that published the event committed successfully
        notificationService.sendOrderConfirmation(event.orderId());
    }
}
```

### Why Use Events?

- **Decoupling** — the order service doesn't know about email, analytics, or notifications
- **Single Responsibility** — each listener does one thing
- **Extensibility** — add new listeners without modifying the publisher
- **Transaction safety** — `@TransactionalEventListener` only fires after commit

---

## 14. Caching Strategy

### Enabling Caching

```java
@SpringBootApplication
@EnableCaching  // enables @Cacheable, @CacheEvict, @CachePut
public class OrderManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderManagementApplication.class, args);
    }
}
```

### @Cacheable — Skip Method Execution on Cache Hit

```java
@Service
public class ProductService {

    private final ProductRepository productRepo;

    @Cacheable(value = "products", key = "#id")
    public Product findById(Long id) {
        // Only executes if not in cache
        return productRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Not found: " + id));
    }

    @Cacheable(value = "products", key = "#category")
    public List<Product> findByCategory(String category) {
        return productRepo.findByCategory(category);
    }
}
```

### @CacheEvict — Remove from Cache

```java
@CacheEvict(value = "products", key = "#product.id")
public Product update(Product product) {
    return productRepo.save(product);
}

// Clear the entire cache when bulk updates happen
@CacheEvict(value = "products", allEntries = true)
public void bulkUpdatePrices(BigDecimal percentage) {
    productRepo.applyPriceIncrease(percentage);
}
```

### @CachePut — Always Execute, Update Cache

```java
@CachePut(value = "products", key = "#id")
public Product updateStock(Long id, int newStock) {
    Product product = productRepo.findById(id).orElseThrow();
    product.setStock(newStock);
    return productRepo.save(product);  // result puts into cache
}
```

### When to Cache vs. When Not To

| Cache? | Situation |
|--------|-----------|
| Yes | Read-heavy, rarely changing data (product catalog, user profiles) |
| Yes | Expensive computations (reports, aggregations) |
| No | Write-heavy data (order status, stock levels) |
| No | Frequently changing data (real-time metrics) |
| No | Data that must always be fresh (pricing, availability) |

---