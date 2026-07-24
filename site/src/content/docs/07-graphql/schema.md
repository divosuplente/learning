---
title: "Module 07: Schema & Types"
description: "Schema & Types"
---

## 1. Core GraphQL Concepts

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

## 2. Schema Definition Language (SDL)

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

## 3. Custom Scalars

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
                        if (input instanceof graphql.language.StringValue sv) {
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
                        if (input instanceof graphql.language.StringValue sv) {
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
