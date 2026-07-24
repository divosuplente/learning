---
title: "Module 07: Testing, Design & Security"
description: "Testing, Design & Security"
---

## 1. Testing GraphQL with GraphiQL

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

## 2. Security Overview (Brief)

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

## 3. GraphQL Schema Design Best Practices

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

## 4. GraphQL Error Handling

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

## 5. GraphQL Security

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

---
