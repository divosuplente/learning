---
title: "Module 10: Testing"
description: "Testing"
---

## 18. Test Suite Overview

| Test Class | Purpose |
|------------|---------|
| `OrderServiceTest.java` | Unit tests for `OrderService` — creation, status update, total calculation. Mocks repositories and `OrderEventProducer`. |
| `OrderControllerTest.java` | Integration tests for REST endpoints using `MockMvc`. Tests happy path and error handling. |
| `OrderRepositoryTest.java` | Integration tests for JPA repositories using Testcontainers with real PostgreSQL. |
| `OrderEventProducerTest.java` | Integration test for Kafka producer/consumer using Testcontainers embedded Kafka. |
| `OrderStatusPublisherTest.java` | Unit test for reactive stream using `StepVerifier`. |

All tests live under `src/test/java/com/example/ordermgmt/` and run with
`./mvnw test`.

---

## 19. Unit Test: OrderService

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.kafka.OrderEventProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private OrderEventProducer eventProducer;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_withValidRequest_returnsOrderResponse() {
        // Arrange
        CustomerEntity customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer.setId(1L);

        ProductEntity product = new ProductEntity("Coffee Mug", new BigDecimal("12.99"), 100, "Kitchen");
        product.setId(10L);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(inv -> {
            OrderEntity o = inv.getArgument(0);
            o.setId(100L);
            return o;
        });

        var request = new CreateOrderRequest(1L, List.of(
                new CreateOrderItemRequest(10L, 3)
        ));

        // Act
        OrderResponse response = orderService.createOrder(request);

        // Assert
        assertThat(response.customerName()).isEqualTo("Alice");
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("38.97"));
        assertThat(response.items()).hasSize(1);

        verify(orderRepository).save(any(OrderEntity.class));
        verify(eventProducer).publishOrderCreated(any(OrderCreatedEvent.class));
    }

    @Test
    void findById_withNonExistentId_throwsOrderNotFoundException() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(999L))
                .isInstanceOf(OrderNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void createOrder_withInsufficientStock_throwsIllegalStateException() {
        CustomerEntity customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer.setId(1L);

        ProductEntity product = new ProductEntity("Coffee Mug", new BigDecimal("12.99"), 2, "Kitchen");
        product.setId(10L);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        var request = new CreateOrderRequest(1L, List.of(
                new CreateOrderItemRequest(10L, 5)  // Request 5, stock is 2
        ));

        assertThatThrownBy(() -> orderService.createOrder(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient stock");
    }
}
```

---

## 20. Controller Test (MockMvc)

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockBean
    private OrderService orderService;

    @Test
    void GET_orders_returns200WithJsonArray() throws Exception {
        var order = new OrderResponse(
                1L, 10L, "Alice", OrderStatus.PENDING,
                new BigDecimal("25.98"), Instant.now(), List.of()
        );
        when(orderService.findAll()).thenReturn(List.of(order));

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerName").value("Alice"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void POST_orders_withValidBody_returns201() throws Exception {
        var response = new OrderResponse(
                1L, 10L, "Alice", OrderStatus.PENDING,
                new BigDecimal("25.98"), Instant.now(), List.of()
        );
        when(orderService.createOrder(any(CreateOrderRequest.class))).thenReturn(response);

        var request = new CreateOrderRequest(10L, List.of(
                new CreateOrderItemRequest(1L, 2)
        ));

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void POST_orders_withMissingCustomerId_returns400() throws Exception {
        String invalidJson = """
            {
              "items": [
                {"productId": 1, "quantity": 2}
              ]
            }
            "";

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}
```

---

## 21. Repository Test (Testcontainers)

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private ProductRepository productRepository;

    @Test
    void findByCustomerId_returnsOrdersForThatCustomer() {
        // Arrange
        var customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer = customerRepository.save(customer);

        var product = new ProductEntity("Mug", new BigDecimal("9.99"), 50, "Kitchen");
        product = productRepository.save(product);

        var order = new OrderEntity();
        order.setCustomer(customer);

        var item = new OrderItemEntity();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(2);
        item.setUnitPrice(product.getPrice());
        order.getItems().add(item);

        order.recalculateTotal();
        orderRepository.save(order);

        // Act
        List<OrderEntity> found = orderRepository.findByCustomerId(customer.getId());

        // Assert
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getTotalAmount())
                .isEqualByComparingTo(new BigDecimal("19.98"));
    }

    @Test
    void findByStatus_filtersCorrectly() {
        var customer = new CustomerEntity("Bob", "bob@example.com", "456 Oak");
        customer = customerRepository.save(customer);

        var pending = new OrderEntity();
        pending.setCustomer(customer);
        orderRepository.save(pending);

        var confirmed = new OrderEntity();
        confirmed.setCustomer(customer);
        confirmed.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(confirmed);

        var results = orderRepository.findByStatus(OrderStatus.PENDING);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStatus()).isEqualTo(OrderStatus.PENDING);
    }
}
```

---

## 22. Reactive Stream Test (StepVerifier)

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.domain.OrderStatus;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.time.Instant;

class OrderStatusPublisherTest {

    @Test
    void publish_thenSubscriberReceivesEvent() {
        var publisher = new OrderStatusPublisher();

        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                1L, OrderStatus.PENDING, OrderStatus.CONFIRMED, Instant.now()
        );

        StepVerifier.create(publisher.subscribe())
                .then(() -> publisher.publish(event))
                .expectNextMatches(e ->
                        e.orderId().equals(1L) &&
                        e.oldStatus() == OrderStatus.PENDING &&
                        e.newStatus() == OrderStatus.CONFIRMED)
                .thenCancel()
                .verify();
    }

    @Test
    void multipleSubscribers_eachReceiveEvents() {
        var publisher = new OrderStatusPublisher();

        var event1 = new OrderStatusChangedEvent(
                1L, OrderStatus.PENDING, OrderStatus.CONFIRMED, Instant.now());
        var event2 = new OrderStatusChangedEvent(
                1L, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, Instant.now());

        // Subscribe first, then publish both, then cancel
        StepVerifier.create(publisher.subscribe())
                .then(() -> {
                    publisher.publish(event1);
                    publisher.publish(event2);
                })
                .expectNext(event1)
                .expectNext(event2)
                .thenCancel()
                .verify();
    }
}
```

---
