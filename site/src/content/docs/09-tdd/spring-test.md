---
title: "Module 09: Spring Boot Tests"
description: "Spring Boot Tests"
---

## 1. Spring Boot Test Slices

Spring Boot provides **test slices** — specialized test configurations that load only the parts of the application you need for each test type. This makes tests faster than loading the entire application.

| Annotation | What It Loads | What It Mocks | Use For |
|------------|---------------|---------------|---------|
| `@WebMvcTest(MyController.class)` | Only the web layer (one controller + Spring MVC) | All services | Controller tests |
| `@DataJpaTest` | Only JPA (repositories + entity manager + test database) | Controllers, services | Repository tests |
| `@SpringBootTest` | The entire application | Nothing (or mock specific beans) | Integration tests |
| `@JsonTest` | Only Jackson serialization | Everything else | DTO serialization tests |

### Web Layer Tests with MockMvc

`@WebMvcTest` loads a controller and its MVC infrastructure without starting a full server:

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.service.OrderService;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void shouldReturnOrderWhenIdExists() throws Exception {
        // Arrange
        OrderResponse response = new OrderResponse(
                1L, 7L, "Alice", OrderStatus.CONFIRMED,
                new BigDecimal("149.97"), Instant.now(), List.of()
        );
        when(orderService.getOrderById(1L)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        when(orderService.getOrderById(999L)).thenThrow(new OrderNotFoundException(999L));

        mockMvc.perform(get("/api/orders/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found: 999"));
    }

    @Test
    void shouldCreateOrderWhenInputIsValid() throws Exception {
        String requestBody = """
                {
                    "customerId": 1,
                    "items": [
                        {"productId": 10, "quantity": 2}
                    ]
                }
                """;

        OrderResponse response = new OrderResponse(
                1L, 1L, "Alice", OrderStatus.PENDING,
                new BigDecimal("39.98"), Instant.now(), List.of()
        );
        when(orderService.createOrder(any())).thenReturn(response);

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void shouldReturn400WhenCustomerIdIsNull() throws Exception {
        String requestBody = """
                {
                    "customerId": null,
                    "items": [{"productId": 10, "quantity": 2}]
                }
                """;

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }
}
```

### What's Happening Here?

1. `@WebMvcTest(OrderController.class)` — loads only `OrderController` and its MVC dependencies
2. `@MockBean` — replaces the real `OrderService` with a Mockito mock
3. `MockMvc` — simulates HTTP requests without a real server. You can send GET/POST requests and check the response
4. `jsonPath("$.id").value(1)` — checks a JSON field in the response using JSONPath expressions
5. The validation test (`shouldReturn400WhenCustomerIdIsNull`) tests that `@Valid` on the controller correctly rejects invalid input — no service is involved

### Repository Tests with @DataJpaTest

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;

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

    @Test
    void shouldSaveAndFindOrderById() {
        // Arrange
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Alice");
        customer.setEmail("alice@example.com");
        customer.setAddress("123 Main St");
        CustomerEntity savedCustomer = customerRepository.save(customer);

        OrderEntity order = new OrderEntity();
        order.setCustomer(savedCustomer);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("99.99"));
        order.setCreatedAt(Instant.now());

        // Act
        OrderEntity saved = orderRepository.save(order);
        var found = orderRepository.findById(saved.getId());

        // Assert
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(found.get().getCustomer().getName()).isEqualTo("Alice");
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Bob");
        customer.setEmail("bob@example.com");
        CustomerEntity savedCustomer = customerRepository.save(customer);

        OrderEntity order1 = new OrderEntity();
        order1.setCustomer(savedCustomer);
        order1.setStatus(OrderStatus.PENDING);
        order1.setTotalAmount(new BigDecimal("50.00"));
        order1.setCreatedAt(Instant.now());
        orderRepository.save(order1);

        OrderEntity order2 = new OrderEntity();
        order2.setCustomer(savedCustomer);
        order2.setStatus(OrderStatus.CONFIRMED);
        order2.setTotalAmount(new BigDecimal("75.00"));
        order2.setCreatedAt(Instant.now());
        orderRepository.save(order2);

        var orders = orderRepository.findByCustomerId(savedCustomer.getId());

        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(OrderEntity::getStatus)
                .containsExactlyInAnyOrder(OrderStatus.PENDING, OrderStatus.CONFIRMED);
    }
}
```

### What's Happening Here?

1. `@DataJpaTest` — loads only JPA infrastructure (Hibernate, entity manager, repositories)
2. `@Testcontainers` — starts a real PostgreSQL Docker container
3. `@ServiceConnection` — Spring Boot auto-configures the database connection from the container
4. `@AutoConfigureTestDatabase(replace = Replace.NONE)` — tells Spring NOT to replace our PostgreSQL with an in-memory database (we want to test against real PostgreSQL)
5. The test saves an entity, finds it again, and verifies the data

**Why Testcontainers?** An in-memory database (like H2) behaves differently from PostgreSQL. SQL that works in H2 might fail in PostgreSQL. Testcontainers gives you a **real** PostgreSQL in Docker, so your tests match production behavior.

---

## 2. JaCoCo: Measuring Test Coverage

**JaCoCo** (Java Code Coverage) measures how much of your code is exercised by tests. It reports the percentage of lines, branches, and methods covered.

### Adding JaCoCo to Maven

Add to your `pom.xml`:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>verify</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Running Coverage

```bash
mvn verify
```

This runs all tests and generates a coverage report at `target/site/jacoco/index.html`. Open it in your browser to see:
- Line coverage: percentage of code lines executed by tests
- Branch coverage: percentage of `if`/`else` branches taken
- Method coverage: percentage of methods called

The `check` goal **fails the build** if coverage drops below 80% — ensuring the team maintains quality.

---
