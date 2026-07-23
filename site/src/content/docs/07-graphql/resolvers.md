---
title: "Module 07: Resolvers & Mutations"
description: "Resolvers & Mutations"
---

## --- Queries (read operations) ---

type Query {

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
