# Module 07: GraphQL

## What You'll Learn

- What an API is and a recap of REST concepts from Module 03
- The problems REST has: over-fetching and under-fetching
- What GraphQL is and how it solves REST's problems
- GraphQL vs REST: a side-by-side comparison
- Core GraphQL concepts: schema, types, queries, mutations, subscriptions
- The Schema Definition Language (SDL)
- How to model the Order Management domain with GraphQL
- Writing queries and mutations for orders, customers, and products
- Implementing resolvers in Spring Boot with `@QueryMapping`, `@MutationMapping`, and `@SchemaMapping`
- The N+1 problem in GraphQL and how to solve it with DataLoader
- Error handling in GraphQL
- GraphQL subscriptions with WebSockets
- Testing GraphQL endpoints with GraphiQL

## Prerequisites

- [Module 00: Java Foundations](./00-java-foundations.md) — you understand Java classes, records, interfaces
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a Spring Boot project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand Spring beans and constructor injection
- [Module 03: Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) — you understand REST controllers and DTOs
- [Module 04: Repository Pattern](./04-repository-pattern.md) — you understand JPA entities and repositories
- [Module 05: Service-Oriented Architecture](./05-service-oriented-architecture.md) — you understand the service layer

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. What Is an API? (REST Recap)](#1-what-is-an-api-rest-recap)
- [2. Problems with REST](#2-problems-with-rest)
  - [Over-Fetching](#over-fetching)
  - [Under-Fetching](#under-fetching)
  - [The Root Cause](#the-root-cause)
- [3. What Is GraphQL?](#3-what-is-graphql)
  - [A GraphQL Query Example](#a-graphql-query-example)
  - [A More Complex Query](#a-more-complex-query)
- [4. GraphQL vs REST: Comparison](#4-graphql-vs-rest-comparison)
  - [When to Use GraphQL?](#when-to-use-graphql)
  - [When to Stay with REST?](#when-to-stay-with-rest)
- [5. Core GraphQL Concepts](#5-core-graphql-concepts)
  - [Schema](#schema)
  - [Types](#types)
  - [Queries](#queries)
  - [Mutations](#mutations)
  - [Subscriptions](#subscriptions)
- [6. Schema Definition Language (SDL)](#6-schema-definition-language-sdl)
  - [Key Points About the Schema](#key-points-about-the-schema)
- [7. Adding the GraphQL Dependency](#7-adding-the-graphql-dependency)
- [8. Custom Scalars](#8-custom-scalars)
  - [What Is a Coercing?](#what-is-a-coercing)
- [9. Resolvers in Spring Boot](#9-resolvers-in-spring-boot)
  - [Query Resolvers](#query-resolvers)
  - [What's Happening Here?](#whats-happening-here)
  - [Mutation Resolvers](#mutation-resolvers)
  - [Input Records](#input-records)
  - [Field Resolvers with @SchemaMapping](#field-resolvers-with-schemamapping)
- [10. Error Handling in GraphQL](#10-error-handling-in-graphql)
  - [Error Response Format](#error-response-format)
  - [Partial Results](#partial-results)
  - [Custom Exceptions in Spring Boot GraphQL](#custom-exceptions-in-spring-boot-graphql)
- [11. The N+1 Problem and DataLoader](#11-the-n1-problem-and-dataloader)
  - [What Is the N+1 Problem?](#what-is-the-n1-problem)
  - [How DataLoader Solves It](#how-dataloader-solves-it)
  - [Implementing DataLoader in Spring Boot](#implementing-dataloader-in-spring-boot)
  - [What @BatchMapping Does](#what-batchmapping-does)
- [12. GraphQL Subscriptions](#12-graphql-subscriptions)
  - [Setting Up Subscriptions](#setting-up-subscriptions)
- [13. Testing GraphQL with GraphiQL](#13-testing-graphql-with-graphiql)
  - [Example Queries to Try](#example-queries-to-try)
- [14. Security Overview (Brief)](#14-security-overview-brief)
  - [Authentication](#authentication)
  - [Authorization](#authorization)
  - [Query Depth Limiting](#query-depth-limiting)
  - [Rate Limiting](#rate-limiting)
- [What You Learned](#what-you-learned)
- [13. GraphQL Schema Design Best Practices](#13-graphql-schema-design-best-practices)
  - [Connection / Relay Pagination](#connection-relay-pagination)
  - [Input Types vs Arguments](#input-types-vs-arguments)
  - [Deprecation](#deprecation)
- [14. GraphQL Error Handling](#14-graphql-error-handling)
  - [Custom Error Extensions](#custom-error-extensions)
  - [Error Taxonomy](#error-taxonomy)
- [15. GraphQL Security](#15-graphql-security)
  - [Query Depth Limiting](#query-depth-limiting)
  - [Query Complexity Analysis](#query-complexity-analysis)
  - [Authentication in Resolvers](#authentication-in-resolvers)
- [Recommended YouTube Videos](#recommended-youtube-videos)

</details>

## 1. What Is an API? (REST Recap)

An **API (Application Programming Interface)** is a contract that defines how software components communicate. In Module 03, you learned about **REST APIs**, where:

- Each resource has a URL: `/api/orders`, `/api/customers`, `/api/products`
- You use HTTP methods to act on them: `GET` to read, `POST` to create, `PUT` to update, `DELETE` to remove
- Data is exchanged as JSON

For example, to get order #42 in REST:

```
GET /api/orders/42

Response:
{
  "id": 42,
  "customerId": 7,
  "customerName": "Alice",
  "status": "CONFIRMED",
  "totalAmount": 129.99,
  "createdAt": "2025-01-15T10:30:00Z",
  "items": [
    { "id": 1, "productId": 100, "productName": "Widget", "quantity": 2, "unitPrice": 49.99 }
  ]
}
```

REST works well and is widely used. But it has limitations.

---

## 2. Problems with REST

### Over-Fetching

**Over-fetching** happens when the API returns more data than the client needs.

Imagine a mobile app that shows a list of orders. It only needs the order ID and status — but the REST endpoint returns the entire order object including all items, the customer details, timestamps, and more. That's wasted bandwidth and slower response times.

```
Client needs:  { "id": 42, "status": "CONFIRMED" }
REST returns:  { "id": 42, "customerId": 7, "customerName": "Alice", "status": "CONFIRMED",
                 "totalAmount": 129.99, "createdAt": "...", "items": [...] }
                                                          ↑ wasted data
```

### Under-Fetching

**Under-fetching** happens when the client needs to make multiple API calls to gather all the data it needs.

Imagine a dashboard that shows orders with customer names and product images. With REST, you might need:

1. `GET /api/orders` — get the orders (returns customer IDs, not names)
2. `GET /api/customers/7` — get customer details for order 1
3. `GET /api/customers/12` — get customer details for order 2
4. `GET /api/products/100` — get product details for the first item

That's 4+ network round trips. Each one adds latency.

### The Root Cause

The problem is that REST endpoints return a **fixed shape**. The server decides what data to return, regardless of what the client actually needs. Different clients (web app, mobile app, analytics dashboard) have different needs, but they all get the same response.

---

## 3. What Is GraphQL?

**GraphQL** is a query language for your API. Instead of the server deciding what data to return, the **client** specifies exactly what it wants, and the server returns exactly that — nothing more, nothing less.

Think of it like a restaurant:

- **REST** is like a set menu: you get whatever the chef decided to put on the plate. You might not want the salad, but it's there.
- **GraphQL** is like ordering a la carte: you pick exactly the dishes you want. Want just the steak? You get just the steak.

### A GraphQL Query Example

Instead of `GET /api/orders/42`, the client sends a **query** to a single GraphQL endpoint:

```
POST /graphql

{
  "query": "{ order(id: 42) { id status } }"
}
```

The server responds with exactly those fields:

```json
{
  "data": {
    "order": {
      "id": 42,
      "status": "CONFIRMED"
    }
  }
}
```

No over-fetching. The client asked for `id` and `status`, and that's all it got.

### A More Complex Query

The client can also ask for related data in a single request — no under-fetching:

```graphql
{
  order(id: 42) {
    id
    status
    customer {
      id
      name
    }
    items {
      quantity
      unitPrice
      product {
        id
        name
      }
    }
  }
}
```

This single query replaces what would have taken 3+ REST calls. The server resolves all the relationships and returns the complete data in one response.

---

## 4. GraphQL vs REST: Comparison

| Dimension | REST | GraphQL |
|-----------|------|---------|
| **Endpoints** | Many (`/api/orders`, `/api/customers`, etc.) | One (`/graphql`) |
| **Data shape** | Fixed by the server | Chosen by the client |
| **Over-fetching** | Common | Eliminated — client asks for only what it needs |
| **Under-fetching** | Common — multiple calls needed for related data | Eliminated — related data in one query |
| **Versioning** | URL versioning (`/v1/`, `/v2/`) or headers | Schema evolution — add fields without breaking old clients |
| **HTTP methods** | `GET`, `POST`, `PUT`, `DELETE` for different operations | `POST` for everything (queries and mutations) |
| **Caching** | HTTP caching (browser, CDN) | Needs custom caching (Apollo Client, etc.) |
| **Learning curve** | Lower — maps to HTTP concepts | Higher — new query language, schema concepts |
| **Best for** | Simple CRUD APIs, resource-oriented services | Complex data relationships, multiple client types |
| **File uploads** | Simple with `multipart/form-data` | Requires custom handling |

### When to Use GraphQL?

- You have multiple clients (web, iOS, Android) with different data needs
- Your data has complex relationships that require multiple REST calls to assemble
- You want to avoid versioning your API
- You want a single endpoint for the frontend to interact with

### When to Stay with REST?

- Your API is consumed by other servers (machine-to-machine) where over-fetching doesn't matter
- You need HTTP-level caching
- Your API is simple CRUD with few relationships
- Your team is not familiar with GraphQL

You can also use **both** — Spring Boot supports having REST and GraphQL endpoints in the same application.

---

## 5. Core GraphQL Concepts

### Schema

A **schema** is the contract of your GraphQL API. It defines what types exist, what queries are available, and what mutations you can perform. The schema is written in the **Schema Definition Language (SDL)** and lives in a `.graphqls` file.

### Types

A **type** defines the shape of an object in your API. It's like a Java class definition:

```graphql
type Order {
    id: ID!
    status: OrderStatus!
    totalAmount: BigDecimal!
    customer: Customer!
    items: [OrderItem!]!
}
```

- `ID`, `String`, `Int`, `Float`, `Boolean` are built-in **scalar types**
- `ID!` — the `!` means this field is **non-nullable** (required)
- `[OrderItem!]!` — a non-nullable list of non-nullable items
- `BigDecimal` — we can register custom scalars for types Java has but GraphQL doesn't (like `BigDecimal`, `Instant`)
- `Customer` is a custom type we define ourselves

### Queries

A **query** reads data. It's the GraphQL equivalent of a `GET` request:

```graphql
type Query {
    order(id: ID!): Order
    orders(customerId: ID): [Order!]!
    customer(id: ID!): Customer
    products(category: String): [Product!]!
}
```

### Mutations

A **mutation** modifies data. It's the GraphQL equivalent of `POST`, `PUT`, or `DELETE`:

```graphql
type Mutation {
    createOrder(input: CreateOrderInput!): Order!
    confirmOrder(id: ID!): Order!
    cancelOrder(id: ID!): Order!
    createProduct(input: CreateProductInput!): Product!
}
```

### Subscriptions

A **subscription** is a real-time stream of data pushed from the server to the client over WebSockets. It's used for live updates like order status changes:

```graphql
type Subscription {
    orderStatusChanged(orderId: ID): OrderStatusChangedEvent!
}
```

We'll cover subscriptions briefly at the end of this module.

---

## 6. Schema Definition Language (SDL)

Let's write the complete GraphQL schema for our Order Management System. Create a file at `src/main/resources/graphql/schema.graphqls`:

```graphql
# Custom scalars for types Java has but GraphQL doesn't
scalar BigDecimal
scalar Instant

# --- Enums ---

enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
}

# --- Types ---

type Customer {
    id: ID!
    name: String!
    email: String!
    address: String
    createdAt: Instant!
    orders: [Order!]!
}

type Product {
    id: ID!
    name: String!
    price: BigDecimal!
    stock: Int!
    category: String!
    createdAt: Instant!
}

type Order {
    id: ID!
    customer: Customer!
    status: OrderStatus!
    totalAmount: BigDecimal!
    createdAt: Instant!
    items: [OrderItem!]!
}

type OrderItem {
    id: ID!
    product: Product!
    quantity: Int!
    unitPrice: BigDecimal!
}

# --- Input Types (for mutations) ---

input CreateOrderInput {
    customerId: ID!
    items: [CreateOrderItemInput!]!
}

input CreateOrderItemInput {
    productId: ID!
    quantity: Int!
}

input CreateCustomerInput {
    name: String!
    email: String!
    address: String
}

input CreateProductInput {
    name: String!
    price: BigDecimal!
    stock: Int!
    category: String!
}

# --- Response type for status change ---

type OrderStatusChangedEvent {
    orderId: ID!
    oldStatus: OrderStatus!
    newStatus: OrderStatus!
    changedAt: Instant!
}

# --- Queries (read operations) ---

type Query {
    # Get a single order by ID
    order(id: ID!): Order
    
    # Get all orders, optionally filtered by customer
    orders(customerId: ID): [Order!]!
    
    # Get a single customer by ID
    customer(id: ID!): Customer
    
    # Get all customers
    customers: [Customer!]!
    
    # Get a single product by ID
    product(id: ID!): Product
    
    # Get all products, optionally filtered by category
    products(category: String): [Product!]!
}

# --- Mutations (write operations) ---

type Mutation {
    # Create a new order
    createOrder(input: CreateOrderInput!): Order!
    
    # Confirm a pending order
    confirmOrder(id: ID!): Order!
    
    # Cancel an order
    cancelOrder(id: ID!): Order!
    
    # Create a new customer
    createCustomer(input: CreateCustomerInput!): Customer!
    
    # Create a new product
    createProduct(input: CreateProductInput!): Product!
}

# --- Subscriptions (real-time updates) ---

type Subscription {
    # Subscribe to order status changes, optionally for a specific order
    orderStatusChanged(orderId: ID): OrderStatusChangedEvent!
}
```

### Key Points About the Schema

1. **`scalar BigDecimal` and `scalar Instant`** — these tell GraphQL that we have custom types. We'll register Java implementations for them in our Spring Boot configuration
2. **Input types** — mutations use `input` types instead of regular types. Inputs are for data going **in** to the API
3. **`ID!`** — the `ID` type is a string-serialized unique identifier. The `!` makes it non-nullable
4. **Relationships** — `Order` has a `customer` field of type `Customer`, and `Customer` has an `orders` field of type `[Order!]!`. This allows bidirectional traversal
5. **The `Query` type is required** — it defines all read operations
6. **The `Mutation` type is optional but common** — it defines all write operations
7. **Arguments** — queries can accept arguments: `order(id: ID!)`, `products(category: String)`

---

## 7. Adding the GraphQL Dependency

Add the Spring Boot GraphQL starter to your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-graphql</artifactId>
</dependency>
```

This gives you everything you need: the GraphQL Java engine, Spring integration, and the GraphiQL IDE (a browser-based tool for testing GraphQL queries).

Enable GraphiQL in `application.yml`:

```yaml
spring:
  graphql:
    graphiql:
      enabled: true
      path: /graphiql
```

Now you can open `http://localhost:8080/graphiql` in your browser to test queries interactively.

---

## 8. Custom Scalars

GraphQL has built-in scalars (`Int`, `Float`, `String`, `Boolean`, `ID`), but Java has types that GraphQL doesn't know about — `BigDecimal` and `Instant`. We need to register **custom scalar adapters** that tell GraphQL how to serialize and deserialize them.

```java
package com.example.ordermgmt.config;

import graphql.schema.Coercing;
import graphql.schema.GraphQLScalarType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.data.value.SelectedValueReplacer;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeParseException;

@Configuration
public class GraphQLConfig {

    // Define the BigDecimal scalar — tells GraphQL how to handle BigDecimal values
    @Bean
    public GraphQLScalarType bigDecimalScalar() {
        return GraphQLScalarType.newScalar()
                .name("BigDecimal")
                .description("Java BigDecimal as a string")
                .coercing(new Coercing<>() {
                    @Override
                    public String serialize(Object dataFetcherResult) {
                        if (dataFetcherResult instanceof BigDecimal bd) {
                            return bd.toPlainString();
                        }
                        return null;
                    }

                    @Override
                    public BigDecimal parseValue(Object input) {
                        if (input instanceof String s) {
                            return new BigDecimal(s);
                        }
                        if (input instanceof Number n) {
                            return BigDecimal.valueOf(n.doubleValue());
                        }
                        return null;
                    }

                    @Override
                    public BigDecimal parseLiteral(Object input) {
                        if (input instanceof org.springframework.graphql.java21runtime.value.Value.StringValue sv) {
                            return new BigDecimal(sv.getValue());
                        }
                        return null;
                    }
                })
                .build();
    }

    // Define the Instant scalar — tells GraphQL how to handle Instant values
    @Bean
    public GraphQLScalarType instantScalar() {
        return GraphQLScalarType.newScalar()
                .name("Instant")
                .description("Java Instant as ISO-8601 string")
                .coercing(new Coercing<>() {
                    @Override
                    public String serialize(Object dataFetcherResult) {
                        if (dataFetcherResult instanceof Instant instant) {
                            return instant.toString();
                        }
                        return null;
                    }

                    @Override
                    public Instant parseValue(Object input) {
                        if (input instanceof String s) {
                            return Instant.parse(s);
                        }
                        return null;
                    }

                    @Override
                    public Instant parseLiteral(Object input) {
                        if (input instanceof org.springframework.graphql.java21runtime.value.Value.StringValue sv) {
                            try {
                                return Instant.parse(sv.getValue());
                            } catch (DateTimeParseException e) {
                                return null;
                            }
                        }
                        return null;
                    }
                })
                .build();
    }

    // Register the scalars with the GraphQL runtime
    @Bean
    public RuntimeWiringConfigurer runtimeWiringConfigurer(
            GraphQLScalarType bigDecimalScalar,
            GraphQLScalarType instantScalar) {
        return wiringBuilder -> wiringBuilder
                .scalar(bigDecimalScalar)
                .scalar(instantScalar);
    }
}
```

### What Is a Coercing?

A **Coercing** object tells GraphQL three things:
1. **`serialize`** — how to convert a Java object (e.g., `BigDecimal`) to something the client can read (e.g., a `String`)
2. **`parseValue`** — how to convert a variable value from the client (e.g., `"129.99"`) to a Java object (e.g., `BigDecimal`)
3. **`parseLiteral`** — how to convert a literal value from the query text (e.g., the `"129.99"` in the query itself) to a Java object

---

## 9. Resolvers in Spring Boot

A **resolver** is a Java method that provides the data for a GraphQL field. When a client queries `order(id: 42)`, a resolver method is called to fetch that order.

Spring Boot for GraphQL uses annotations to map resolver methods to schema fields:

| Annotation | Maps To | Purpose |
|------------|--------|---------|
| `@QueryMapping` | Fields in the `Query` type | Read data |
| `@MutationMapping` | Fields in the `Mutation` type | Modify data |
| `@SchemaMapping` | Fields on any type | Resolve a specific field on a type |

### Query Resolvers

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.dto.CustomerResponse;
import com.example.ordermgmt.dto.ProductResponse;
import com.example.ordermgmt.service.OrderService;
import com.example.ordermgmt.service.CustomerService;
import com.example.ordermgmt.service.ProductService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class OrderQueryResolver {

    private final OrderService orderService;
    private final CustomerService customerService;
    private final ProductService productService;

    public OrderQueryResolver(
            OrderService orderService,
            CustomerService customerService,
            ProductService productService) {
        this.orderService = orderService;
        this.customerService = customerService;
        this.productService = productService;
    }

    // Maps to: order(id: ID!): Order
    @QueryMapping
    public OrderResponse order(@Argument Long id) {
        return orderService.getOrderById(id);
    }

    // Maps to: orders(customerId: ID): [Order!]!
    @QueryMapping
    public List<OrderResponse> orders(@Argument(required = false) Long customerId) {
        if (customerId != null) {
            return orderService.getOrdersByCustomer(customerId);
        }
        return orderService.getAllOrders();
    }

    // Maps to: customer(id: ID!): Customer
    @QueryMapping
    public CustomerResponse customer(@Argument Long id) {
        return customerService.getCustomerById(id);
    }

    // Maps to: customers: [Customer!]!
    @QueryMapping
    public List<CustomerResponse> customers() {
        return customerService.getAllCustomers();
    }

    // Maps to: product(id: ID!): Product
    @QueryMapping
    public ProductResponse product(@Argument Long id) {
        return productService.getProductById(id);
    }

    // Maps to: products(category: String): [Product!]!
    @QueryMapping
    public List<ProductResponse> products(@Argument(required = false) String category) {
        if (category != null) {
            return productService.getProductsByCategory(category);
        }
        return productService.getAllProducts();
    }
}
```

### What's Happening Here?

1. `@Controller` — marks this class as a Spring component (like `@RestController` but for GraphQL)
2. `@QueryMapping` — tells Spring that this method resolves a field in the `Query` type. The method name must match the field name in the schema (e.g., `order()` maps to `order(id: ID!): Order`)
3. `@Argument` — extracts an argument from the GraphQL query. The parameter name must match the argument name in the schema
4. `@Argument(required = false)` — for optional arguments (the schema says `customerId: ID` without `!`, meaning it's nullable)
5. The return type (`OrderResponse`, `List<OrderResponse>`, etc.) is serialized to JSON and returned to the client — but only the fields the client asked for

### Mutation Resolvers

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.CreateOrderItemRequest;
import com.example.ordermgmt.dto.CreateCustomerRequest;
import com.example.ordermgmt.dto.CreateProductRequest;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.dto.CustomerResponse;
import com.example.ordermgmt.dto.ProductResponse;
import com.example.ordermgmt.service.OrderService;
import com.example.ordermgmt.service.CustomerService;
import com.example.ordermgmt.service.ProductService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class OrderMutationResolver {

    private final OrderService orderService;
    private final CustomerService customerService;
    private final ProductService productService;

    public OrderMutationResolver(
            OrderService orderService,
            CustomerService customerService,
            ProductService productService) {
        this.orderService = orderService;
        this.customerService = customerService;
        this.productService = productService;
    }

    // Maps to: createOrder(input: CreateOrderInput!): Order!
    @MutationMapping
    public OrderResponse createOrder(@Argument CreateOrderInput input) {
        CreateOrderRequest request = new CreateOrderRequest(
                input.customerId(),
                input.items().stream()
                        .map(item -> new CreateOrderItemRequest(item.productId(), item.quantity()))
                        .toList()
        );
        return orderService.createOrder(request);
    }

    // Maps to: confirmOrder(id: ID!): Order!
    @MutationMapping
    public OrderResponse confirmOrder(@Argument Long id) {
        return orderService.confirmOrder(id);
    }

    // Maps to: cancelOrder(id: ID!): Order!
    @MutationMapping
    public OrderResponse cancelOrder(@Argument Long id) {
        return orderService.cancelOrder(id);
    }

    // Maps to: createCustomer(input: CreateCustomerInput!): Customer!
    @MutationMapping
    public CustomerResponse createCustomer(@Argument CreateCustomerInput input) {
        CreateCustomerRequest request = new CreateCustomerRequest(
                input.name(), input.email(), input.address()
        );
        return customerService.createCustomer(request);
    }

    // Maps to: createProduct(input: CreateProductInput!): Product!
    @MutationMapping
    public ProductResponse createProduct(@Argument CreateProductInput input) {
        CreateProductRequest request = new CreateProductRequest(
                input.name(), input.price(), input.stock(), input.category()
        );
        return productService.createProduct(request);
    }
}
```

### Input Records

The `@Argument` annotation can deserialize complex input types. We need Java records that match the input types in the schema:

```java
package com.example.ordermgmt.graphql;

import java.math.BigDecimal;
import java.util.List;

// Matches: input CreateOrderInput { customerId: ID!, items: [CreateOrderItemInput!]! }
public record CreateOrderInput(
        Long customerId,
        List<CreateOrderItemInput> items
) {}

// Matches: input CreateOrderItemInput { productId: ID!, quantity: Int! }
public record CreateOrderItemInput(
        Long productId,
        Integer quantity
) {}

// Matches: input CreateCustomerInput { name: String!, email: String!, address: String }
public record CreateCustomerInput(
        String name,
        String email,
        String address
) {}

// Matches: input CreateProductInput { name: String!, price: BigDecimal!, stock: Int!, category: String! }
public record CreateProductInput(
        String name,
        BigDecimal price,
        Integer stock,
        String category
) {}
```

### Field Resolvers with @SchemaMapping

Sometimes a field on a type needs custom resolution logic. For example, what if `OrderResponse` doesn't have a `customer` field — the client can query for it but the service doesn't return it directly?

Use `@SchemaMapping` to resolve individual fields:

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.dto.CustomerResponse;
import com.example.ordermgmt.service.CustomerService;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

@Controller
public class OrderFieldResolver {

    private final CustomerService customerService;

    public OrderFieldResolver(CustomerService customerService) {
        this.customerService = customerService;
    }

    // When a client queries the "customer" field on an Order,
    // this method is called to resolve it
    @SchemaMapping(typeName = "Order", field = "customer")
    public CustomerResponse resolveCustomer(OrderResponse order) {
        // If the order already has a customer name, we might have it cached
        // Otherwise, fetch from the customer service
        return customerService.getCustomerById(order.customerId());
    }
}
```

This is called a **field resolver** — it resolves a single field on a type. Spring only calls this method if the client actually queries the `customer` field. If the client doesn't ask for `customer`, this method is never called — that's the power of GraphQL's selective fetching.

---

## 10. Error Handling in GraphQL

Unlike REST, where each request returns a single HTTP status code, GraphQL uses HTTP 200 for most responses (even errors) and includes an `errors` array in the response body.

### Error Response Format

```json
{
  "errors": [
    {
      "message": "Order not found: 999",
      "path": ["order"],
      "extensions": {
        "classification": "NOT_FOUND"
      }
    }
  ],
  "data": null
}
```

### Partial Results

One of GraphQL's strengths is **partial results**. If a client queries for two things and one fails, the successful one is still returned:

```json
{
  "data": {
    "product": { "id": "1", "name": "Widget" }
  },
  "errors": [
    {
      "message": "Order not found: 999",
      "path": ["order"]
    }
  ]
}
```

The `product` query succeeded, the `order` query failed. The client gets both.

### Custom Exceptions in Spring Boot GraphQL

Spring Boot for GraphQL automatically translates exceptions into GraphQL errors. For better error classification, create a custom exception handler:

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.example.ordermgmt.service.exception.InsufficientStockException;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Controller;

@Controller
public class GraphQlExceptionHandler {

    @GraphQlExceptionHandler
    public GraphQlError handleOrderNotFound(OrderNotFoundException ex) {
        return GraphQlError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .build();
    }

    @GraphQlExceptionHandler
    public GraphQlError handleInsufficientStock(InsufficientStockException ex) {
        return GraphQlError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }
}
```

This maps domain exceptions to appropriate GraphQL error types:
- `NOT_FOUND` — for "entity not found" errors (HTTP 404 equivalent)
- `BAD_REQUEST` — for validation errors (HTTP 400 equivalent)
- `FORBIDDEN` — for authorization errors (HTTP 403 equivalent)
- `INTERNAL_ERROR` — for unexpected errors (HTTP 500 equivalent)

---

## 11. The N+1 Problem and DataLoader

### What Is the N+1 Problem?

The N+1 problem is a performance issue that appears when resolving related data. Consider this query:

```graphql
{
  orders {
    id
    customer {
      id
      name
    }
  }
}
```

This asks for all orders, and for each order, the customer. Without optimization:

1. **1 query** to fetch all orders (e.g., 10 orders)
2. **N queries** (one per order) to fetch each customer by ID

That's **1 + N = 11 queries** for 10 orders. If there are 100 orders, it's 101 queries. This is extremely slow.

### How DataLoader Solves It

**DataLoader** is a batching utility. Instead of fetching each customer individually, DataLoader collects all the customer IDs from all the orders, fetches them in a **single batch query**, and distributes the results back.

```
Without DataLoader:         With DataLoader:
[fetch orders]              [fetch orders]
  [fetch customer 1]         [collect all customer IDs: 1, 3, 7]
  [fetch customer 3]         [batch fetch customers WHERE id IN (1, 3, 7)]
  [fetch customer 7]         [distribute results]
  ...                        Total: 2 queries
Total: 11+ queries
```

### Implementing DataLoader in Spring Boot

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.repository.CustomerRepository;
import org.dataloader.BatchLoader;
import org.dataloader.DataLoader;
import org.dataloader.DataLoaderRegistry;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Controller
public class OrderBatchResolver {

    private final CustomerRepository customerRepository;

    public OrderBatchResolver(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // @BatchMapping automatically batches requests for the "customer" field
    // on all Order entities being resolved in a single query
    @BatchMapping(typeName = "Order", field = "customer")
    public Map<OrderEntity, CustomerEntity> loadCustomers(List<OrderEntity> orders) {
        // Collect all customer IDs from all orders
        Set<Long> customerIds = orders.stream()
                .map(order -> order.getCustomer().getId())
                .collect(Collectors.toSet());

        // Fetch all customers in a single query
        List<CustomerEntity> customers = customerRepository.findAllById(customerIds);

        // Create a map: CustomerEntity by ID
        Map<Long, CustomerEntity> customerById = customers.stream()
                .collect(Collectors.toMap(CustomerEntity::getId, Function.identity()));

        // Return a map: OrderEntity -> CustomerEntity
        return orders.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        order -> customerById.get(order.getCustomer().getId())
                ));
    }
}
```

### What `@BatchMapping` Does

1. When a query asks for `orders { customer { name } }`, Spring collects all the `OrderEntity` objects being resolved
2. Instead of calling the resolver once per order, it calls `loadCustomers()` once with **all** orders
3. The method fetches all customers in a single database query
4. It returns a `Map<OrderEntity, CustomerEntity>` — Spring uses this to assign the right customer to each order

This turns 101 queries into 2 queries.

---

## 12. GraphQL Subscriptions

Subscriptions enable **real-time updates**. Instead of the client repeatedly polling for changes, the server pushes updates when they happen.

For our Order Management System, the client can subscribe to order status changes:

```graphql
subscription {
  orderStatusChanged {
    orderId
    oldStatus
    newStatus
    changedAt
  }
}
```

Subscriptions use **WebSockets** — a persistent connection between client and server. When an order's status changes (and the `OrderEventProducer` publishes an event from Module 06), the subscription pushes the update to all connected clients.

### Setting Up Subscriptions

Subscriptions require WebSocket support. Add the WebSocket starter dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

Then create a subscription resolver. Spring Boot for GraphQL integrates with **Reactor** (which you'll learn about in Module 08) for subscriptions:

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.SubscriptionMapping;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Sinks;

import java.time.Instant;

@Controller
public class OrderSubscriptionResolver {

    private static final Logger log = LoggerFactory.getLogger(OrderSubscriptionResolver.class);

    // A Sinks.Many is a reactive publisher that can emit items to multiple subscribers
    // We'll cover this in detail in Module 08 (Reactor)
    private final Sinks.Many<OrderStatusChangedEvent> statusChangedSink =
            Sinks.many().multicast().onBackpressureBuffer();

    @SubscriptionMapping
    public reactor.core.publisher.Flux<OrderStatusChangedEvent> orderStatusChanged(
            @Argument(required = false) Long orderId) {

        if (orderId != null) {
            // Filter to only events for the specified order
            return statusChangedSink.asFlux()
                    .filter(event -> event.orderId().equals(orderId));
        }

        // No filter — send all status changes
        return statusChangedSink.asFlux();
    }

    // Called by the Kafka consumer (Module 06) when a status change is received
    public void publishStatusChange(Long orderId, String oldStatus, String newStatus) {
        log.info("subscription_publish orderId={} {} -> {}", orderId, oldStatus, newStatus);
        statusChangedSink.tryEmitNext(new OrderStatusChangedEvent(
                orderId, oldStatus, newStatus, Instant.now()
        ));
    }
}
```

We'll dive deeper into `Flux`, `Sinks`, and reactive streams in Module 08. For now, understand that:
- `Sinks.Many` is like a broadcaster — you push events into it and all subscribers receive them
- `Flux` is a stream of data — the subscription returns a `Flux` that the client reads from in real-time

---

## 13. Testing GraphQL with GraphiQL

Spring Boot includes **GraphiQL** — a browser-based IDE for writing and testing GraphQL queries.

1. Start your application: `mvn spring-boot:run`
2. Open `http://localhost:8080/graphiql` in your browser
3. Write queries and see results immediately

### Example Queries to Try

**Get an order with its customer and items:**

```graphql
query {
  order(id: 1) {
    id
    status
    totalAmount
    customer {
      id
      name
      email
    }
    items {
      quantity
      unitPrice
      product {
        id
        name
        category
      }
    }
  }
}
```

**List all pending orders:**

```graphql
query {
  orders {
    id
    status
    totalAmount
    createdAt
  }
}
```

**Create a new order:**

```graphql
mutation {
  createOrder(input: {
    customerId: 1
    items: [
      { productId: 1, quantity: 2 }
      { productId: 3, quantity: 1 }
    ]
  }) {
    id
    status
    totalAmount
    customer {
      name
    }
  }
}
```

**Confirm an order:**

```graphql
mutation {
  confirmOrder(id: 1) {
    id
    status
  }
}
```

**Subscribe to order status changes:**

```graphql
subscription {
  orderStatusChanged {
    orderId
    oldStatus
    newStatus
  }
}
```

---

## 14. Security Overview (Brief)

GraphQL APIs need the same security measures as REST APIs:

### Authentication

Verify who the user is. Typically done with JWT tokens or session cookies — the same approach as REST. In Spring Boot, you can use Spring Security to protect the `/graphql` endpoint.

### Authorization

Verify what the user is allowed to do. In GraphQL, this means checking permissions at the resolver level:

```java
@MutationMapping
public OrderResponse createOrder(@Argument CreateOrderInput input, Authentication auth) {
    // Spring Security can inject the authenticated user
    if (auth == null || !auth.isAuthenticated()) {
        throw new AccessDeniedException("You must be logged in to create an order");
    }
    // ... proceed with creating the order
}
```

### Query Depth Limiting

A malicious client could send a deeply nested query that exhausts server resources:

```graphql
# This is a denial-of-service attack
{ customer { orders { customer { orders { customer { orders { ... } } } } } } }
```

Configure a maximum query depth to prevent this:

```yaml
spring:
  graphql:
    schema:
      inspection:
        enabled: true
```

Add depth limiting through a custom `GraphQLInterceptor` or use libraries like `graphql-java-query-complexity`.

### Rate Limiting

GraphQL operates on a single endpoint, so traditional HTTP rate limiting (X requests per second) applies. However, a single GraphQL request can be much more expensive than a single REST request (querying all orders with all items with all products). Consider **query complexity analysis** — assigning a "cost" to each field and limiting the total cost per query.

---

## What You Learned

- **GraphQL** is a query language for APIs where the client specifies exactly what data it wants — eliminating over-fetching and under-fetching
- Unlike REST with multiple endpoints, GraphQL has a **single endpoint** (`/graphql`) and the client chooses which fields to return
- The **Schema Definition Language (SDL)** defines the API contract in a `.graphqls` file with types, inputs, enums, queries, mutations, and subscriptions
- **Queries** read data (`@QueryMapping`), **mutations** modify data (`@MutationMapping`), and **field resolvers** (`@SchemaMapping`) resolve individual fields on types
- **Input types** define the shape of mutation arguments; they're records in Java and `input` types in the schema
- **Custom scalars** (`BigDecimal`, `Instant`) need a `Coercing` implementation to tell GraphQL how to serialize and deserialize them
- GraphQL returns **partial results** — one failed field doesn't block other fields; errors are in an `errors` array with data alongside
- The **N+1 problem** occurs when resolving related data (fetching customers for each order individually) — **DataLoader** (`@BatchMapping`) solves it by batching requests into a single database query
- **Subscriptions** enable real-time updates over WebSockets, returning a `Flux` (reactive stream)
- **Security** in GraphQL includes authentication, authorization at the resolver level, query depth limiting, and query complexity analysis
- **GraphiQL** is a built-in browser IDE for testing GraphQL queries at `/graphiql`

---

## 13. GraphQL Schema Design Best Practices

### Connection / Relay Pagination

Instead of returning a flat list, use the **Connection pattern** for paginated
results:

```graphql
type Query {
    orders(first: Int = 10, after: String): OrderConnection!
}

type OrderConnection {
    edges: [OrderEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
}

type OrderEdge {
    node: Order!
    cursor: String!
}

type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
}
```

```java
@QueryMapping
public OrderConnection orders(@Argument Integer first, @Argument String after) {
    List<Order> orders = orderService.findAll(first + 1, after);
    boolean hasNextPage = orders.size() > first;
    if (hasNextPage) {
        orders = orders.subList(0, first);
    }
    List<OrderEdge> edges = orders.stream()
            .map(o -> new OrderEdge(o, Base64.encode(o.getId().toString())))
            .toList();
    var pageInfo = new PageInfo(hasNextPage, false,
            edges.isEmpty() ? null : edges.get(0).cursor(),
            edges.isEmpty() ? null : edges.get(edges.size() - 1).cursor());
    return new OrderConnection(edges, pageInfo, orderService.count());
}
```

### Input Types vs Arguments

```graphql
# GOOD — structured input type
mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input): Order!
}

input CreateOrderInput {
    customerId: ID!
    items: [OrderItemInput!]!
    shippingAddress: AddressInput
}

# BAD — too many flat arguments
mutation CreateOrder(
    customerId: ID!
    itemIds: [ID!]!
    quantities: [Int!]!
    street: String
    city: String
    zipCode: String
): Order
```

### Deprecation

```graphql
type Order {
    id: ID!
    customerName: String! @deprecated(reason: "Use customer { name } instead")
    customer: Customer!
    amount: BigDecimal! @deprecated(reason: "Use totalAmount instead")
    totalAmount: BigDecimal!
}
```

---

## 14. GraphQL Error Handling

GraphQL returns 200 OK even when there are errors. Errors are included in the
response body, alongside any partial data.

### Custom Error Extensions

```java
@ControllerAdvice
public class GraphQLExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public GraphQLError handleNotFound(OrderNotFoundException ex) {
        return GraphQLError.newError()
                .message(ex.getMessage())
                .path(List.of("order"))
                .extensions(Map.of(
                        "code", "ORDER_NOT_FOUND",
                        "orderId", ex.getOrderId()
                ))
                .build();
    }

    @ExceptionHandler(InsufficientStockException.class)
    public GraphQLError handleStock(InsufficientStockException ex) {
        return GraphQLError.newError()
                .message(ex.getMessage())
                .extensions(Map.of(
                        "code", "INSUFFICIENT_STOCK",
                        "productName", ex.getProductName(),
                        "requested", ex.getRequested(),
                        "available", ex.getAvailable()
                ))
                .build();
    }
}
```

### Error Taxonomy

| Code | Meaning | HTTP-agnostic? |
|------|---------|----------------|
| `NOT_FOUND` | Resource doesn't exist | Yes |
| `VALIDATION_ERROR` | Invalid input | Yes |
| `UNAUTHORIZED` | Authentication required | Yes |
| `FORBIDDEN` | Not enough permissions | Yes |
| `CONFLICT` | State conflict (e.g., duplicate) | Yes |
| `INTERNAL_ERROR` | Unexpected server error | Yes |

---

## 15. GraphQL Security

### Query Depth Limiting

Malicious clients can send deeply nested queries to overload the server:

```graphql
# Attack: infinitely nested query
query { orders { items { product { category { parent { products { items { product { ... }}}}}}}}}
```

Prevent with a depth limit:

```yaml
spring:
  graphql:
    schema:
      inspection:
        enabled: true
    # Max query depth
    max-query-depth: 7
```

### Query Complexity Analysis

Assign a cost to each field and reject queries exceeding a budget:

```java
@Bean
public GraphQLSchemaFactoryBean schemaFactory(GraphQLSchema schema) {
    // Spring for GraphQL doesn't have built-in complexity analysis,
    // but you can add it via a GraphQLInvocationInterceptor or use
    // graphql-java-extended-scalars
    return null;  // configure in custom instrumentations
}
```

### Authentication in Resolvers

GraphQL doesn't have built-in auth. Implement it at the resolver level:

```java
@QueryMapping
public OrderResponse order(@Argument Long id, GraphQLServletContext context) {
    var user = context.getRequest().getHeader("Authorization");
    if (user == null) {
        throw new UnauthorizedException("Authentication required");
    }
    var order = orderService.findById(id);
    if (!order.customerId().equals(extractUserId(user))) {
        throw new ForbiddenException("Not your order");
    }
    return order;
}
```

---

## Recommended YouTube Videos

- **[GraphQL for Java Developers: 01 - Why GraphQL]** by Dan Vega — First video in a complete GraphQL for Java playlist covering schema, resolvers, and N+1
  https://www.youtube.com/watch?v=xZSv67a9OYA

- **[Spring Boot and GraphQL Tutorial]** by Amigoscode — Building a GraphQL API with Spring Boot from scratch
  https://www.youtube.com/watch?v=uNB2N_w_ypo

---

← [Previous: Module 06 — Apache Kafka](./06-kafka.md) | [Next: Module 08 — Reactor Pattern](./08-reactor-pattern.md) →