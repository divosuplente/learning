---
title: "Module 07: Advanced Topics"
description: "Advanced Topics"
---

## 1. The N+1 Problem and DataLoader

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

## 2. GraphQL Subscriptions

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
