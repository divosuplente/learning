---
title: "Module 10: Service Layer"
description: "Service Layer"
---

## 12. Service Layer

```java
package com.example.ordermgmt.service.exception;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
    }
}
```

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.kafka.OrderEventProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.repository.*;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderEventProducer eventProducer;

    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            OrderEventProducer eventProducer) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        log.info("Creating order for customer {}", request.customerId());

        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Customer not found: " + request.customerId()));

        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);

        for (CreateOrderItemRequest itemRequest : request.items()) {
            ProductEntity product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Product not found: " + itemRequest.productId()));

            if (product.getStock() < itemRequest.quantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for product " + product.getName()
                                + ": requested " + itemRequest.quantity()
                                + ", available " + product.getStock());
            }

            OrderItemEntity item = new OrderItemEntity();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(product.getPrice());

            order.getItems().add(item);

            product.setStock(product.getStock() - itemRequest.quantity());
        }

        order.recalculateTotal();
        order = orderRepository.save(order);

        eventProducer.publishOrderCreated(OrderCreatedEvent.from(order));

        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        log.info("Updating order {} status to {}", orderId, newStatus);

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        order = orderRepository.save(order);

        eventProducer.publishOrderStatusChanged(
                OrderStatusChangedEvent.from(order, oldStatus));

        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(Long orderId) {
        return orderRepository.findById(orderId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status).stream()
                .map(OrderResponse::from)
                .toList();
    }
}
```

---
