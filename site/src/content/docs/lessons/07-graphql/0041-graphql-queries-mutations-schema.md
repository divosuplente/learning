---
title: "GraphQL Queries, Mutations & Schema Definition"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/07-graphql/0041-graphql-queries-mutations-schema.md
---

In Lesson 40 you saw why REST's fixed-shape responses cause over-fetching and under-fetching. GraphQL solves this by letting the **client** declare exactly what it needs. But before you can write queries, you need a schema: the contract that tells both sides what data exists and what operations are available. This lesson covers the query language, the difference between queries and mutations, and the Schema Definition Language (SDL) that ties it all together.

## Queries: Reading Data

A **query** reads data, the GraphQL equivalent of a `GET` request. The client sends a query document to a single endpoint:

```
POST /graphql

{
  "query": "{ order(id: 42) { id status } }"
}
```

The response contains exactly the fields requested, nothing more:

```
{
  "data": {
    "order": {
      "id": "42",
      "status": "CONFIRMED"
    }
  }
}
```

No over-fetching. The client asked for `id` and `status`, and that is all it received.

### Nested Fields

Related data lives in the same query, so no under-fetching either. A single request fetches the order, its customer, and every item's product:

```
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

This one query replaces the 3+ REST calls you would have needed in Lesson 40.

### Query Arguments

Fields can accept arguments: like path parameters and query parameters combined, but typed:

```
{
  orders(customerId: 7) {
    id
    status
    totalAmount
  }
}
```

The `customerId` argument filters the list. The field's return type and arguments are defined in the schema.

## Mutations: Writing Data

A **mutation** modifies data, the GraphQL equivalent of `POST`, `PUT`, or `DELETE`. The key difference from a query is intent: mutations change state, queries do not. The server can batch and optimize queries however it likes; mutations execute sequentially.

```
mutation {
  confirmOrder(id: 42) {
    id
    status
  }
}
```

Mutations also return data: the client specifies which fields of the result it wants, just like a query. This avoids a second round trip to fetch the updated object.

### Input Types

Mutations that create or update objects use **input types** instead of passing raw fields as separate arguments:

```
mutation {
  createOrder(input: {
    customerId: "7"
    items: [
      { productId: "100", quantity: 2 }
    ]
  }) {
    id
    status
    totalAmount
  }
}
```

Input types group related fields and keep the mutation signature clean. They are defined with the `input` keyword in the schema.

## Queries vs Mutations at a Glance

|  | Query | Mutation |
| --- | --- | --- |
| Purpose | Read data | Write / modify data |
| HTTP method | POST (yes, really) | POST |
| Execution | May be parallelized by the server | Executed sequentially |
| Caching | Safe to cache | Must not be cached |
| Returns | Requested fields | Requested fields of the result |

A common trap: **GraphQL uses POST for both queries and mutations.** There is no GET. The operation type (`query` or `mutation`) in the document tells the server what to do, not the HTTP method.

## Schema Definition Language (SDL)

The schema is the contract of your API. It defines what types exist, what queries and mutations are available, and what each returns. It lives in a `.graphqls` file and is written in the **Schema Definition Language**.

### Scalar Types

GraphQL has five built-in scalar types:

| Type | Maps to (Java) | Description |
| --- | --- | --- |
| `Int` | `int` / `Integer` | Signed 32-bit integer |
| `Float` | `double` / `Double` | IEEE 754 double |
| `String` | `String` | UTF-8 string |
| `Boolean` | `boolean` / `Boolean` | true / false |
| `ID` | `String` | Unique identifier, serialized as string |

Java types without a built-in GraphQL equivalent, like `BigDecimal` and `Instant`, require **custom scalars** registered in your Spring configuration.

### Object Types

An object type defines the shape of a domain entity. It looks like a Java class declaration:

```
type Order {
    id: ID!
    status: OrderStatus!
    totalAmount: BigDecimal!
    customer: Customer!
    items: [OrderItem!]!
}
```

The `!` suffix means **non-nullable**. `[OrderItem!]!` reads right to left: a non-nullable list of non-nullable items. Without the outer `!` the list itself could be `null`; without the inner `!` a list element could be `null`.

### Enums

Enums work just like Java enums: a closed set of values:

```
enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
}
```

### Input Types

Input types define the shape of data **going in** to a mutation. They differ from object types: they cannot have relationships (no `customer: Customer` field), and their purpose is purely structural, grouping arguments:

```
input CreateOrderInput {
    customerId: ID!
    items: [CreateOrderItemInput!]!
}

input CreateOrderItemInput {
    productId: ID!
    quantity: Int!
}
```

### The Query and Mutation Root Types

Every GraphQL schema must have a `Query` type. It is the entry point for all read operations. The `Mutation` type is optional but nearly always present:

```
type Query {
    order(id: ID!): Order
    orders(customerId: ID): [Order!]!
    customer(id: ID!): Customer
    products(category: String): [Product!]!
}

type Mutation {
    createOrder(input: CreateOrderInput!): Order!
    confirmOrder(id: ID!): Order!
    cancelOrder(id: ID!): Order!
}
```

Notice that `order(id: ID!): Order` returns a nullable `Order`: the order might not exist. Meanwhile `orders(customerId: ID): [Order!]!` returns a non-null list that *can be empty* (the `!` outside the brackets guarantees the list itself is never null, but there may be zero items), and `customerId` is optional. Omit it to get all orders.

## GraphQL vs REST: The Structural Difference

| Dimension | REST | GraphQL |
| --- | --- | --- |
| Endpoints | Many resource URLs | One (`/graphql`) |
| Data shape | Fixed by the server | Chosen by the client |
| Relationships | Extra calls or embedded (chose one) | Nested in a single query |
| Versioning | URL versioning (`/v1/`) | Add fields; old clients unaffected |
| HTTP methods | GET, POST, PUT, DELETE | POST for everything |
| Caching | Browser / CDN (HTTP-level) | Custom (Apollo Client, etc.) |

You can run **both** in the same Spring Boot application. REST for simple resources or server-to-server calls, GraphQL for complex client-facing data.

**Primary sources:** [GraphQL: Learn](https://graphql.org/learn/) · [GraphQL: Schemas & Types](https://graphql.org/learn/schema/) · [Spring for GraphQL Reference](https://docs.spring.io/spring-graphql/reference/)

## Check your understanding

<details>
<summary>1. What HTTP method does a GraphQL query use?</summary>
<p><strong>Correct answer:</strong> POST: GraphQL uses POST for both queries and mutations</p>
</details>

<details>
<summary>2. In the type declaration items: [OrderItem!]!, what does the inner ! (inside the brackets) guarantee?</summary>
<p><strong>Correct answer:</strong> Each element in the list cannot be null</p>
</details>

<details>
<summary>3. Why do mutations use input types instead of regular object types for their arguments?</summary>
<p><strong>Correct answer:</strong> Input types cannot contain relationships and are purely structural groupings</p>
</details>

<details>
<summary>4. A query field is declared as order(id: ID!): Order, without a ! on the return type. What does this mean?</summary>
<p><strong>Correct answer:</strong> The order might not exist: the result can be null</p>
</details>

<details>
<summary>5. Your team adds a new discountCode field to the Order type in the GraphQL schema. What happens to existing clients that don't request this field?</summary>
<p><strong>Correct answer:</strong> Nothing: they didn't request the field, so it doesn't appear in their response</p>
</details>
