---
title: "Module 10: GraphQL"
description: "GraphQL"
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
