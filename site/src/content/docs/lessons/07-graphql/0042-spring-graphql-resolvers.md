---
title: "Spring Boot GraphQL Resolvers"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/07-graphql/0042-spring-graphql-resolvers.md
---

A **resolver** is a Java method that provides the data for a GraphQL field. When a client queries `order(id: 42)`, Spring finds the resolver method annotated with `@QueryMapping` whose name matches `order` and calls it. Three annotations cover every case:

| Annotation | Maps To | Purpose |
| --- | --- | --- |
| `@QueryMapping` | Fields in the `Query` type | Read data |
| `@MutationMapping` | Fields in the `Mutation` type | Modify data |
| `@SchemaMapping` | Fields on *any* type | Resolve a specific field on a type |

## Adding the Dependency

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-graphql</artifactId>
</dependency>
```

Enable GraphiQL (the browser-based query tester) in `application.yml`:

```
spring:
  graphql:
    graphiql:
      enabled: true
      path: /graphiql
```

## Query Resolvers

A `@QueryMapping` method resolves a field in the `Query` type. The method name **must match** the field name in the schema.

```
@Controller
public class OrderQueryResolver {

    private final OrderService orderService;
    private final CustomerService customerService;

    public OrderQueryResolver(OrderService orderService,
                              CustomerService customerService) {
        this.orderService = orderService;
        this.customerService = customerService;
    }

    // Maps to: order(id: ID!): Order
    @QueryMapping
    public OrderResponse order(@Argument Long id) {
        return orderService.getOrderById(id);
    }

    // Maps to: orders(customerId: ID): [Order!]!
    @QueryMapping
    public List<OrderResponse> orders(
            @Argument(required = false) Long customerId) {
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
}
```

Key points:

-   `@Controller` marks the class, like `@RestController` but for GraphQL (no `@ResponseBody` needed).
-   `@Argument` extracts a query argument. The parameter name must match the schema argument name.
-   `@Argument(required = false)` marks nullable arguments. The schema says `customerId: ID` (no `!`), so the Java parameter is optional.
-   The return type is serialized to JSON, but **only the fields the client asked for** are returned.

## Mutation Resolvers

A `@MutationMapping` method resolves a field in the `Mutation` type, for creating, updating, or deleting data.

```
@Controller
public class OrderMutationResolver {

    private final OrderService orderService;

    public OrderMutationResolver(OrderService orderService) {
        this.orderService = orderService;
    }

    // Maps to: createOrder(input: CreateOrderInput!): Order!
    @MutationMapping
    public OrderResponse createOrder(@Argument CreateOrderInput input) {
        CreateOrderRequest request = new CreateOrderRequest(
                input.customerId(),
                input.items().stream()
                    .map(item -> new CreateOrderItemRequest(
                            item.productId(), item.quantity()))
                    .toList()
        );
        return orderService.createOrder(request);
    }

    // Maps to: confirmOrder(id: ID!): Order!
    @MutationMapping
    public OrderResponse confirmOrder(@Argument Long id) {
        return orderService.confirmOrder(id);
    }
}
```

### Input Records

Complex mutation arguments are deserialized into Java **records** that mirror the schema's `input` types:

```
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
```

Spring auto-maps the GraphQL input object to the record, with no manual parsing needed.

## Field Resolvers with @SchemaMapping

Sometimes a field on an existing type needs custom logic. Suppose `OrderResponse` has a `customerId` but no `customer` field. The schema declares `customer: Customer!` on `Order`, so you need a resolver that fetches it on demand:

```
@Controller
public class OrderFieldResolver {

    private final CustomerService customerService;

    public OrderFieldResolver(CustomerService customerService) {
        this.customerService = customerService;
    }

    @SchemaMapping(typeName = "Order", field = "customer")
    public CustomerResponse resolveCustomer(OrderResponse order) {
        return customerService.getCustomerById(order.customerId());
    }
}
```

`@SchemaMapping` tells Spring: "when a client queries the `customer` field on an `Order`, call this method." Spring passes the parent object (`OrderResponse`) as the first argument automatically. The method is **only called if the client actually requests the `customer` field**. If the query omits it, this resolver never runs.

This is what makes GraphQL's selective fetching work at the server level: you don't pay the cost of resolving fields nobody asked for.

## How the Annotations Wire Together

Given this schema:

```
type Query {
    order(id: ID!): Order
    orders(customerId: ID): [Order!]!
}

type Mutation {
    createOrder(input: CreateOrderInput!): Order!
}

type Order {
    id: ID!
    status: String!
    customer: Customer!
}
```

Spring wires resolvers by matching method names to field names:

```
@QueryMapping  order(id)       → Query.order
@QueryMapping  orders(id?)     → Query.orders
@MutationMapping createOrder(input) → Mutation.createOrder
@SchemaMapping Order.customer  → Order.customer (field resolver)
```

The resolver method name is the default mapping. You can override it with `@QueryMapping("fetchOrder")`, but matching names to schema fields is the convention.

## Resolver → Service Wiring

Resolvers should **delegate to services**, not contain business logic: the same thin-controller pattern from REST. The resolver receives input, converts it, calls the service, and returns the result:

```
@Controller
public class OrderQueryResolver {
    private final OrderService orderService;

    public OrderQueryResolver(OrderService orderService) {
        this.orderService = orderService;
    }

    @QueryMapping
    public OrderResponse order(@Argument Long id) {
        return orderService.getOrderById(id);  // delegate
    }
}
```

This keeps resolvers stateless, testable, and focused on input/output mapping. Transaction boundaries, validation, and business rules all live in the service layer.

**Primary sources:** [Spring GraphQL: Annotated Controllers](https://docs.spring.io/spring-graphql/reference/controllers.html) · [Spring GraphQL: Schema](https://docs.spring.io/spring-graphql/reference/schema.html)

## Check your understanding

<details>
<summary>1. A resolver method is annotated @QueryMapping and named products. Which GraphQL field does it resolve?</summary>
<p><strong>Correct answer:</strong> The products field on the Query type</p>
</details>

<details>
<summary>2. The GraphQL schema declares customer: Customer! on the Order type, but the Java OrderResponse DTO has no customer field. Which annotation resolves this?</summary>
<p><strong>Correct answer:</strong> @SchemaMapping(typeName = "Order", field = "customer")</p>
</details>

<details>
<summary>3. A mutation input type in the schema is input CreateOrderInput { customerId: ID!, items: [CreateOrderItemInput!]! }. What does Spring expect on the Java side?</summary>
<p><strong>Correct answer:</strong> A Java record with fields matching the input type's fields</p>
</details>

<details>
<summary>4. A client queries { order(id: 1) { id status } }, omitting the customer field. A @SchemaMapping method for Order.customer exists. What happens?</summary>
<p><strong>Correct answer:</strong> The method is never called: Spring only invokes it when the field is requested</p>
</details>

<details>
<summary>5. Your @MutationMapping method for createOrder contains 40 lines of stock validation, price calculation, and order persistence. What should you do?</summary>
<p><strong>Correct answer:</strong> Move the logic into OrderService: resolvers should delegate, not implement</p>
</details>
