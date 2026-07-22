# Module 03: Spring Boot Fundamentals

## What You'll Learn

- What Spring Boot is and how it differs from plain Spring
- Auto-configuration: how Spring Boot "guesses" what you need
- The `@SpringBootApplication` annotation in detail
- Creating REST endpoints: `@RestController`, `@GetMapping`, `@PostMapping`, etc.
- Request parameters: `@RequestParam`, `@PathVariable`, `@RequestBody`
- HTTP responses with `ResponseEntity` and status codes
- Input validation with Jakarta Bean Validation
- Exception handling with `@RestControllerAdvice`
- DTOs (Data Transfer Objects) as records
- Pagination and sorting
- Logging with SLF4J
- Spring Boot Actuator

## Prerequisites

- [Module 00: Java Foundations](./00-java-foundations.md) — you understand Java classes, records, exceptions
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a working Spring Boot project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand `@Service`, `@Component`, constructor injection

---

## 1. What Is Spring Boot?

**Spring Boot** is a framework that makes building Java applications faster and easier. It is built on top of the **Spring Framework**, which has been the most popular Java framework since 2003.

### The Problem Spring Boot Solves

Plain Spring requires a lot of manual setup:
- Write XML configuration files
- Manually configure every bean
- Set up a web server (Tomcat, Jetty) separately
- Manage dependency versions by hand
- Configure database connections manually

Spring Boot eliminates all this boilerplate. It uses **convention over configuration** — instead of telling Spring everything, you follow conventions and Spring Boot fills in the details automatically.

### Key Features

| Feature | What It Means |
|---------|---------------|
| **Auto-configuration** | Spring Boot configures beans automatically based on what's on the classpath |
| **Starter dependencies** | One dependency pulls in everything you need (e.g., `spring-boot-starter-web`) |
| **Embedded server** | Tomcat is built in — no need to deploy a WAR file to an external server |
| **Production-ready** | Actuator provides health checks, metrics, and monitoring out of the box |
| **No XML** | Configuration is done in Java code or `application.yml` |

---

## 2. Auto-Configuration

**Auto-configuration** is Spring Boot's magic. When you add a dependency to your `pom.xml`, Spring Boot automatically creates and configures the necessary beans.

### How It Works

1. Spring Boot scans your classpath (all the JAR files in your project)
2. If it finds `spring-boot-starter-web`, it configures an embedded Tomcat server, Spring MVC, and JSON serialization
3. If it finds `spring-boot-starter-data-jpa`, it configures a DataSource, EntityManager, and JPA repositories
4. If it finds `postgresql` driver, it configures a PostgreSQL connection

You don't write any configuration code for this — it just works.

### `@SpringBootApplication`

```java
package com.example.ordermgmt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OrderManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderManagementApplication.class, args);
    }
}
```

`@SpringBootApplication` is a combination of three annotations:

| Annotation | What It Does |
|------------|-------------|
| `@Configuration` | Marks this class as a source of bean definitions |
| `@EnableAutoConfiguration` | Enables Spring Boot's auto-configuration |
| `@ComponentScan` | Tells Spring to scan the `com.example.ordermgmt` package and sub-packages for components (`@Controller`, `@Service`, `@Repository`, etc.) |

When you run `main()`, Spring Boot:
1. Creates the Spring application context (the container that holds all beans)
2. Runs auto-configuration
3. Starts the embedded Tomcat server on port 8080
4. Your application is ready to receive requests

---

## 3. Creating REST Endpoints

A **REST endpoint** is a URL that your application responds to. For example, `GET /api/orders` returns a list of orders.

### `@RestController`

```java
package com.example.ordermgmt.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // This class will handle all requests to /api/orders/*
}
```

- `@RestController` — marks this class as a controller that returns data (JSON) instead of HTML pages. It's shorthand for `@Controller` + `@ResponseBody`.
- `@RequestMapping("/api/orders")` — all URLs in this controller start with `/api/orders`.

### HTTP Method Mappings

| Annotation | HTTP Method | Example URL | Purpose |
|------------|-------------|-------------|---------|
| `@GetMapping` | GET | `GET /api/orders` | Read data |
| `@PostMapping` | POST | `POST /api/orders` | Create new data |
| `@PutMapping` | PUT | `PUT /api/orders/1` | Update existing data |
| `@DeleteMapping` | DELETE | `DELETE /api/orders/1` | Delete data |
| `@PatchMapping` | PATCH | `PATCH /api/orders/1` | Partially update data |

### A Complete CRUD Controller

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.OrderResponse;
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

    // Constructor injection — Spring provides OrderService automatically
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // GET /api/orders — list all orders
    @GetMapping
    public ResponseEntity<List<OrderResponse>> listOrders() {
        log.info("list_orders request received");
        List<OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    // GET /api/orders/{id} — get a specific order
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        log.info("get_order orderId={}", id);
        OrderResponse order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    // POST /api/orders — create a new order
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        log.info("create_order request received");
        OrderResponse created = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // DELETE /api/orders/{id} — delete an order
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        log.info("delete_order orderId={}", id);
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 4. Request Parameters

### `@PathVariable`

Extracts a value from the URL path:

```java
// GET /api/orders/42
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
    // id = 42
}
```

### `@RequestParam`

Extracts a query parameter from the URL:

```java
// GET /api/orders?customerId=7&status=PENDING
@GetMapping
public ResponseEntity<List<OrderResponse>> listOrders(
        @RequestParam(required = false) Long customerId,
        @RequestParam(required = false) String status) {
    // customerId = 7 (or null if not provided)
    // status = "PENDING" (or null if not provided)
}
```

### `@RequestBody`

Extracts the request body (JSON) and converts it to a Java object:

```java
// POST /api/orders with JSON body: {"customerId": 7, "items": [...]}
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
    // request.customerId() = 7
    // request.items() = list of items
}
```

### `@RequestHeader`

Extracts an HTTP header:

```java
@GetMapping
public ResponseEntity<List<OrderResponse>> listOrders(
        @RequestHeader(value = "Authorization", required = false) String authHeader) {
    // authHeader = "Bearer eyJhbGc..." (or null)
}
```

---

## 5. HTTP Responses with `ResponseEntity`

`ResponseEntity<T>` lets you control both the response body and the HTTP status code:

```java
// 200 OK with a body
return ResponseEntity.ok(orderResponse);

// 201 Created with a body
return ResponseEntity.status(HttpStatus.CREATED).body(orderResponse);

// 204 No Content (no body — for deletes)
return ResponseEntity.noContent().build();

// 404 Not Found (no body)
return ResponseEntity.notFound().build();

// 400 Bad Request with a body
return ResponseEntity.badRequest().body(errorResponse);
```

### Common HTTP Status Codes

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST that created a resource |
| 204 | No Content | Successful DELETE, or PUT that returned nothing |
| 400 | Bad Request | Invalid input (validation failed) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Conflict with current state (e.g., insufficient stock) |
| 500 | Internal Server Error | Something went wrong on the server |

---

## 6. Input Validation with Jakarta Bean Validation

**Bean Validation** (JSR 380) is a Java standard for validating input. Spring Boot integrates it with the `@Valid` annotation.

### Important: `jakarta.validation` not `javax.validation`

Spring Boot 3.x uses **Jakarta EE** (the renamed Java EE). All imports use `jakarta.*` instead of `javax.*`:

```java
// CORRECT — Spring Boot 3.x (Jakarta)
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// WRONG — Spring Boot 2.x (Java EE, no longer used)
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
```

### Validation Annotations

| Annotation | What It Checks | Applies To |
|------------|---------------|------------|
| `@NotNull` | Value is not null | Any type |
| `@NotBlank` | String is not null and not empty/whitespace | String |
| `@NotEmpty` | Collection/string is not null and not empty | String, List, Map |
| `@Size(min, max)` | Length is within range | String, Collection |
| `@Min(value)` | Number is at least value | int, long, BigDecimal |
| `@Max(value)` | Number is at most value | int, long, BigDecimal |
| `@Email` | String is a valid email | String |
| `@Pattern(regexp)` | String matches regex | String |
| `@Positive` | Number is greater than 0 | Numbers |
| `@Future` | Date is in the future | Date, Instant |

### DTOs with Validation

```java
package com.example.ordermgmt.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "Customer ID is required")
        Long customerId,

        @NotEmpty(message = "Order must have at least one item")
        List<CreateOrderItemRequest> items
) {}
```

```java
package com.example.ordermgmt.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateOrderItemRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity
) {}
```

### How Validation Works

When you add `@Valid` to a parameter:

```java
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
```

Spring Boot:
1. Deserializes the JSON body into a `CreateOrderRequest` record
2. Runs all validation annotations on the fields
3. If any validation fails, Spring returns a **400 Bad Request** response automatically — the method is never called
4. If all validations pass, the method runs normally

---

## 7. Exception Handling with `@RestControllerAdvice`

Without exception handling, when your service throws an exception, Spring Boot returns an ugly 500 error with a stack trace. We want to return clean, structured error responses instead.

### Custom Error Response

```java
package com.example.ordermgmt.dto;

import java.time.Instant;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message
) {}
```

### Global Exception Handler

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handle validation errors (from @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        ErrorResponse error = new ErrorResponse(
                Instant.now(), 400, "Bad Request", message);
        return ResponseEntity.badRequest().body(error);
    }

    // Handle generic exceptions (catch-all)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(), 500, "Internal Server Error", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### What `@RestControllerAdvice` Does

- `@RestControllerAdvice` is a global exception handler. It catches exceptions thrown by **any** controller method.
- `@ExceptionHandler(X.class)` catches exceptions of type `X`.
- You can have multiple handler methods for different exception types.
- The handler returns a `ResponseEntity` with the appropriate HTTP status code and error body.

### Adding Domain Exception Handling

Later (Module 05), you'll add domain exceptions:

```java
@ExceptionHandler(OrderNotFoundException.class)
public ResponseEntity<ErrorResponse> handleOrderNotFound(OrderNotFoundException ex) {
    ErrorResponse error = new ErrorResponse(
            Instant.now(), 404, "Not Found", ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
}
```

---

## 8. DTOs (Data Transfer Objects)

A **DTO** is a simple object that defines the shape of data sent to or received from the API. We use Java records for DTOs (learned in Module 00).

### Why Use DTOs Instead of Entities?

1. **Security** — entities may have fields the client shouldn't see or set (like `id`, `createdAt`)
2. **Different shapes** — a request needs `customerId` + `items`, but a response needs `id`, `status`, `totalAmount`, `customerName`
3. **Decoupling** — your API stays stable even if your database schema changes

### Request DTO

```java
public record CreateOrderRequest(
        @NotNull Long customerId,
        @NotEmpty List<CreateOrderItemRequest> items
) {}
```

### Response DTO

```java
public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<OrderItemResponse> items
) {
    // Factory method to convert from entity to DTO
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

The `from()` method is a **factory method** — it creates a DTO from an entity. This keeps the conversion logic in one place.

---

## 9. Pagination and Sorting

When a list could contain thousands of items, you don't want to return all of them at once. **Pagination** splits results into pages (e.g., 20 items per page).

### Using `Pageable`

```java
@GetMapping
public ResponseEntity<List<OrderResponse>> listOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String direction) {

    Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
    Pageable pageable = PageRequest.of(page, size, sort);

    List<OrderResponse> orders = orderService.getOrders(pageable);
    return ResponseEntity.ok(orders);
}
```

- `page` — zero-based page number (page 0 is the first page)
- `size` — number of items per page
- `sortBy` — field name to sort by
- `direction` — "asc" or "desc"

### Request Example

```
GET /api/orders?page=0&size=10&sortBy=createdAt&direction=desc
```

Returns the 10 most recent orders.

---

## 10. Logging with SLF4J

**SLF4J** (Simple Logging Facade for Java) is Java's standard logging API. Spring Boot includes it by default.

### Setting Up Logging

Never use `System.out.println()` in production code. Always use a logger:

```java
package com.example.ordermgmt.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        log.info("get_order orderId={}", id);

        try {
            OrderResponse order = orderService.getOrderById(id);
            log.debug("order_found orderId={} status={}", id, order.status());
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("order_lookup_failed orderId={}", id, e);
            throw e;
        }
    }
}
```

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Something failed that affects the user | Database connection lost |
| `warn` | Something unexpected but not fatal | Retrying a failed request |
| `info` | Normal application flow | "Order created: id=42" |
| `debug` | Detailed information for debugging | "Found 5 orders for customer 7" |
| `trace` | Very fine-grained detail | "Entering calculateTotal method" |

### What Not to Log

**Never log sensitive data:** passwords, API keys, credit card numbers, personal data (PII).

```java
// BAD
log.info("user_login password={}", password);

// GOOD
log.info("user_login userId={}", userId);
```

### SLF4J Syntax

```java
// GOOD — use {} placeholders (SLF4J fills them in)
log.info("order_created orderId={} total={}", orderId, total);

// BAD — string concatenation (slower, always evaluated even if logging is off)
log.info("order_created orderId=" + orderId + " total=" + total);
```

The `{}` placeholder approach is preferred because:
1. It's faster — the string is only built if the log level is enabled
2. It's cleaner — no `+` operators and quoting issues

---

## 11. Spring Boot Actuator

**Actuator** is a Spring Boot module that provides production-ready features: health checks, metrics, and monitoring.

### Adding Actuator

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Available Endpoints

| Endpoint | URL | What It Shows |
|----------|-----|---------------|
| Health | `/actuator/health` | Is the application running? `{"status":"UP"}` |
| Info | `/actuator/info` | Application info (name, version) |
| Metrics | `/actuator/metrics` | List of available metrics |
| Env | `/actuator/env` | Environment variables and config |
| Loggers | `/actuator/loggers` | View and change log levels at runtime |

### Exposing Endpoints

By default, only `/actuator/health` is exposed. To expose more endpoints:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,env
```

### Custom Health Check

```java
package com.example.ordermgmt.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // Check if the database is reachable
        try {
            // In a real app, you'd check the database connection
            return Health.up().withDetail("database", "reachable").build();
        } catch (Exception e) {
            return Health.down().withDetail("error", e.getMessage()).build();
        }
    }
}
```

Now `GET /actuator/health` includes `"database": {"status": "UP", "details": {"database": "reachable"}}`.

---

## Exercises

### Exercise 1: Create a ProductController

Create a `ProductController` with endpoints:
- `GET /api/products` — list all products
- `GET /api/products/{id}` — get a product by ID
- `POST /api/products` — create a product
- `DELETE /api/products/{id}` — delete a product

Create the DTOs `CreateProductRequest` and `ProductResponse`.

<details>
<summary>Hint</summary>

Follow the `OrderController` pattern. Create records `CreateProductRequest` (with `@NotBlank name`, `@NotNull price`, `@Positive stock`, `@NotBlank category`) and `ProductResponse` (with a `from()` factory method). Use `@Valid` on the POST method.
</details>

### Exercise 2: Add Pagination

Modify the product list endpoint to accept pagination parameters: `page`, `size`, `sortBy`, `direction`. Use `PageRequest` and `Sort` to create a `Pageable`.

<details>
<summary>Hint</summary>

Use `@RequestParam(defaultValue = "0") int page`, `@RequestParam(defaultValue = "20") int size`, etc. Build the `Pageable` with `PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(direction), sortBy))`.
</details>

### Exercise 3: Add Custom Exception Handling

Create a `ProductNotFoundException`. Add an `@ExceptionHandler` in `GlobalExceptionHandler` that returns a 404 with an `ErrorResponse`.

<details>
<summary>Hint</summary>

Create the exception class extending `RuntimeException` with a constructor taking `Long productId`. In `GlobalExceptionHandler`, add `@ExceptionHandler(ProductNotFoundException.class)` that returns `ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse)`.
</details>

### Exercise 4: Add Validation to CreateProductRequest

Add validation annotations to `CreateProductRequest`:
- `name` must not be blank (`@NotBlank`)
- `price` must be positive (`@Positive`)
- `stock` must be at least 0 (`@Min(0)`)
- `category` must not be blank (`@NotBlank`)

Test that invalid input returns a 400 error.

<details>
<summary>Hint</summary>

Use `jakarta.validation.constraints.*` annotations. Use `@Valid` on the `@RequestBody` parameter. Send a POST with a blank name and verify you get a 400 response with the validation message.
</details>

---

## What You Learned

- **Spring Boot** eliminates boilerplate through auto-configuration, starter dependencies, and an embedded server
- **`@SpringBootApplication`** combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`
- **REST endpoints** are created with `@RestController`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`
- **Request parameters** are extracted with `@PathVariable` (from URL), `@RequestParam` (from query string), `@RequestBody` (from JSON body), `@RequestHeader` (from headers)
- **`ResponseEntity`** controls both the response body and HTTP status code
- **Jakarta Bean Validation** (using `jakarta.validation.*`, not `javax.validation.*`) validates input with `@Valid`, `@NotBlank`, `@NotNull`, `@Min`, `@Max`, etc.
- **`@RestControllerAdvice`** with `@ExceptionHandler` handles exceptions globally across all controllers
- **DTOs** (records) decouple the API shape from the database schema
- **Pagination** uses `Pageable` and `PageRequest` to split results into pages
- **SLF4J** with `LoggerFactory` provides structured logging with `{}` placeholders — never use `System.out.println()` or Lombok's `@Slf4j`
- **Actuator** provides health checks, metrics, and monitoring endpoints

---
## 11. Content Negotiation and Media Types

Spring Boot can serve the same endpoint in multiple formats (JSON, XML, etc.)
based on the `Accept` header sent by the client.

### Producing JSON and XML

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping(value = "/{id}", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
    public ResponseEntity<OrderResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }
}
```

```bash
# Client requests JSON
curl -H "Accept: application/json" http://localhost:8080/api/orders/1
# → {"id":1,"customerName":"Alice",...}

# Same endpoint, client requests XML
curl -H "Accept: application/xml" http://localhost:8080/api/orders/1
# → <OrderResponse><id>1</id><customerName>Alice</customerName>...</OrderResponse>
```

### Adding XML Support

Add the Jackson XML dependency:

```xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
</dependency>
```

---

## 12. Cross-Origin Resource Sharing (CORS)

Browsers block JavaScript from making requests to a different origin than the page
that served it. **CORS** is the mechanism that lets your API explicitly allow
cross-origin requests.

### Per-Controller CORS

```java
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:3000")  // React dev server
public class OrderController { ... }
```

### Global CORS Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "https://myapp.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);  // cache preflight for 1 hour
    }
}
```

### How CORS Works

1. Browser sends a **preflight** `OPTIONS` request before the actual request
2. Server responds with allowed origins, methods, and headers
3. If the actual request's origin is allowed, browser sends it

---

## 13. Spring Boot Configuration Properties

### @ConfigurationProperties — Type-Safe Configuration

```yaml
# application.yml
ordermgmt:
  pagination:
    default-page-size: 20
    max-page-size: 100
  features:
    audit-log: true
    cache-ttl-seconds: 300
```

```java
@ConfigurationProperties(prefix = "ordermgmt")
public record OrderMgmtProperties(
    Pagination pagination,
    Features features
) {
    public record Pagination(int defaultPageSize, int maxPageSize) {}
    public record Features(boolean auditLog, int cacheTtlSeconds) {}
}
```

```java
@Configuration
@EnableConfigurationProperties(OrderMgmtProperties.class)
public class AppConfig { }
```

### Using in Services

```java
@Service
public class OrderService {
    private final OrderMgmtProperties properties;

    public OrderService(OrderRepository repo, OrderMgmtProperties properties) {
        this.repo = repo;
        this.properties = properties;
    }

    public List<Order> findAll(int page) {
        int pageSize = properties.pagination().defaultPageSize();
        return repo.findAll(PageRequest.of(page, pageSize)).getContent();
    }
}
```

### @Value vs @ConfigurationProperties

| `@Value` | `@ConfigurationProperties` |
|-----------|---------------------------|
| One property at a time | Bulk binding to a record/class |
| No type safety | Fully typed |
| SpEL expressions supported | No SpEL |
| Simple values | Nested structures, lists, maps |

```java
// @Value — simple but error-prone
@Value("${ordermgmt.pagination.default-page-size:20}")
private int defaultPageSize;

// @ConfigurationProperties — type-safe and clean
// (as shown above)
```

---

## 14. Understanding Spring Boot Auto-Configuration

Spring Boot's "magic" is **auto-configuration** — it automatically configures
beans based on what's on your classpath.

### How It Works

1. Spring Boot scans the classpath for specific classes
2. If a class is present, the corresponding auto-configuration kicks in
3. If a class is absent, the configuration is skipped

```java
// This is what happens internally (simplified):
@Configuration
@ConditionalOnClass(name = "org.postgresql.ds.PGSimpleDataSource")
@ConditionalOnMissingBean(DataSource.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnProperty(name = "spring.datasource.url")
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        var ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        return ds;
    }
}
```

### Discovering Auto-Configuration

```bash
# See all auto-configuration decisions at startup
java -jar app.jar --debug

# Or in application.yml
debug: true
```

This prints a "CONDITIONS EVALUATION REPORT" showing which auto-configurations
matched and which didn't, with reasons.

### Excluding Auto-Configuration

```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,       // don't auto-configure a datasource
    HibernateJpaAutoConfiguration.class      // don't auto-configure JPA
})
public class OrderManagementApplication { ... }
```

---

## 15. Spring Boot Actuator Deep Dive

Actuator provides **production-ready** endpoints for monitoring and managing
your application.

### Enabling Actuator

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Key Endpoints

| Endpoint | Purpose | HTTP Method |
|----------|---------|-------------|
| `/actuator/health` | Application health status | GET |
| `/actuator/info` | Build info, version, description | GET |
| `/actuator/metrics` | JVM, HTTP, custom metrics | GET |
| `/actuator/metrics/http.server.requests` | HTTP request stats | GET |
| `/actuator/env` | Environment variables and config | GET |
| `/actuator/loggers` | View and change log levels at runtime | GET/POST |
| `/actuator/threaddump` | Thread dump for debugging | GET |
| `/actuator/heapdump` | Heap dump (download as binary) | GET |
| `/actuator/mappings` | All URL mappings (REST + MVC) | GET |
| `/actuator/beans` | All Spring beans and their dependencies | GET |

### Exposing Endpoints

By default, only `health` and `info` are exposed over HTTP. To expose more:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,env,loggers
        exclude: threaddump,heapdump  # don't expose sensitive ones
  endpoint:
    health:
      show-details: always  # show database, disk space, etc. details
```

### Changing Log Level at Runtime (No Restart!)

```bash
# View current log level
curl http://localhost:8080/actuator/loggers/com.example.ordermgmt

# Change to DEBUG without restarting the app
curl -X POST http://localhost:8080/actuator/loggers/com.example.ordermgmt \
     -H "Content-Type: application/json" \
     -d '{"configuredLevel": "DEBUG"}'
```

### Build Info Endpoint

Add the `build-info` goal to expose build metadata:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>build-info</goal></goals>
        </execution>
    </executions>
</plugin>
```

```bash
curl http://localhost:8080/actuator/info
# → {"build":{"version":"1.0.0","artifact":"ordermgmt","name":"Order Management System","time":"2025-01-15T10:00:00Z"}}
```

---

## 16. Spring Boot DevTools

DevTools provides development-time features that speed up your workflow.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

### Automatic Restart

When a file on the classpath changes, DevTools **automatically restarts** the
application. The restart is fast (~1-2 seconds) because only the application
classes are reloaded — the Spring context is not rebuilt from scratch.

### Live Reload

DevTools triggers a **browser refresh** when resources change (HTML, CSS, JS).
Install the [LiveReload browser extension](http://livereload.com/) to use this.

### Disabling DevTools in Production

DevTools is automatically disabled when running as a packaged JAR (`java -jar app.jar`).
It's only active when running from an IDE or with `mvn spring-boot:run`.

---


## Recommended YouTube Videos

- **[Build a Spring Boot 4 REST API in Minutes]** by Dan Vega — Quick REST API walkthrough with controllers, records, and CRUD (25:32, 21K views)
  https://www.youtube.com/watch?v=klnxzL8oQdM

- **[Spring Boot Tutorial for Beginners | Full Course 2025]** by Amigoscode — Full course covering REST APIs, Spring MVC, Docker, and JPA (1:11:19, 251K views)
  https://www.youtube.com/watch?v=Cw0J6jYJtzw

---

← [Previous: Module 02](./02-dependency-injection.md) | [Next: Module 04](./04-repository-pattern.md) →
