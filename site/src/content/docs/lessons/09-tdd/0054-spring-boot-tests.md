---
title: "Spring Boot Tests: @WebMvcTest, @DataJpaTest, Testcontainers & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/09-tdd/0054-spring-boot-tests.md
---

Unit tests verify isolated methods. But bugs often hide in the wiring: between controllers and services, between repositories and the database, between JSON payloads and object fields. Spring Boot provides **test slices** that load exactly one layer of your application, making integration-focused tests fast and targeted.

## Test Slices: Load Only What You Need

A full `@SpringBootTest` starts the entire application context, every bean, every auto-configuration. That is slow and tests too many things at once. Spring Boot's test slices load **only the layer you care about** and mock everything else:

| Annotation | Loads | Mocks Automatically | Use For |
| --- | --- | --- | --- |
| `@WebMvcTest(MyController.class)` | One controller + Spring MVC infrastructure | All `@Service` and `@Repository` beans | Controller HTTP behavior |
| `@DataJpaTest` | JPA entities, repositories, entity manager, test DB | Controllers and services | Repository queries and constraints |
| `@SpringBootTest` | The entire application context | Nothing (or mock specific beans) | Full integration tests |
| `@JsonTest` | Jackson `ObjectMapper` only | Everything else | DTO serialization and deserialization |

The key point: **narrower slices run faster and fail closer to the bug.** A `@WebMvcTest` runs in ~2 seconds. A `@SpringBootTest` often takes 10 to 30 seconds. Reach for the narrowest slice that proves what you need.

## Controller Tests with @WebMvcTest and MockMvc

`@WebMvcTest` loads your controller and Spring MVC's request-handling pipeline, but **not** your services, repositories, or any other beans. You must supply mocks for the controller's dependencies.

```
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;       // simulates HTTP requests

    @Autowired
    private ObjectMapper objectMapper;  // auto-configured by @WebMvcTest

    @MockBean
    private OrderService orderService;  // replaced with a Mockito mock

    @Test
    void shouldReturnOrderWhenIdExists() throws Exception {
        OrderResponse response = new OrderResponse(
            1L, 7L, "Alice", OrderStatus.CONFIRMED,
            new BigDecimal("149.97"), Instant.now(), List.of()
        );
        when(orderService.getOrderById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        when(orderService.getOrderById(999L))
            .thenThrow(new OrderNotFoundException(999L));

        mockMvc.perform(get("/api/orders/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Order not found: 999"));
    }

    @Test
    void shouldCreateOrderWhenInputIsValid() throws Exception {
        String requestBody = """
            {
                "customerId": 1,
                "items": [{"productId": 10, "quantity": 2}]
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

What happened here:

-   **`MockMvc`** sends HTTP requests to your controller without starting a real server: no Tomcat, no network socket.
-   **`@MockBean`** replaces the real `OrderService` with a Mockito mock. The controller runs real code; the service returns stubbed data.
-   **`jsonPath("$.id")`** inspects the JSON response body using JSONPath, like CSS selectors for JSON.
-   **The 400 test** proves `@Valid` rejects bad input at the controller boundary. No service is involved at all.

## Repository Tests with @DataJpaTest

`@DataJpaTest` loads JPA infrastructure (Hibernate, the entity manager, and your repositories), then gives you a throwaway test database. By default, it uses an in-memory H2 database, even if your production app uses PostgreSQL. That is fast but **misleading**: H2 accepts SQL that PostgreSQL rejects, and vice versa.

```
@DataJpaTest
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void shouldSaveAndFindOrderById() {
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Alice");
        customer.setEmail("alice@example.com");
        CustomerEntity savedCustomer = customerRepository.save(customer);

        OrderEntity order = new OrderEntity();
        order.setCustomer(savedCustomer);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("99.99"));
        order.setCreatedAt(Instant.now());

        OrderEntity saved = orderRepository.save(order);
        var found = orderRepository.findById(saved.getId());

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

Each test method runs inside a transaction that is **rolled back** after the test, so tests do not pollute each other's data.

## Testcontainers: Real Databases in Docker

In-memory H2 does not behave like PostgreSQL. Native array types, JSON columns, and complex queries can pass on H2 and fail in production. **Testcontainers** solves this by starting a real database in a Docker container for your tests:

```
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTestcontainersTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldPersistOrderWithRealPostgres() {
        // ...same test code, but now running against real PostgreSQL
    }
}
```

Four annotations make this work:

-   **`@Testcontainers`**: enables the Testcontainers JUnit extension.
-   **`@Container`**: marks the container field; Testcontainers starts it before tests and stops it after.
-   **`@ServiceConnection`**: Spring Boot reads the container's host/port and auto-configures the `DataSource`. No manual URL, username, or password needed.
-   **`@AutoConfigureTestDatabase(replace = NONE)`**: tells Spring *not* to replace our PostgreSQL with H2. Without this, Spring Boot would ignore the container and use in-memory H2 anyway.

The container starts once per test class. For faster suites, use [container reuse](https://java.testcontainers.org/features/reuse/) to keep the database running across test runs.

## Full Integration Tests with @SpringBootTest

When you need the entire application wired together (controller, service, repository, database), use `@SpringBootTest`. It starts the full context. Combined with `@AutoConfigureMockMvc`, you can send real HTTP requests through every layer:

```
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class OrderIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void shouldCreateAndRetrieveOrderEndToEnd() throws Exception {
        // Seed the database with a customer
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Alice");
        customer.setEmail("alice@example.com");
        customerRepository.save(customer);

        // Create order via HTTP
        String requestBody = """
            {
                "customerId": 1,
                "items": [{"productId": 10, "quantity": 2}]
            }
            """;

        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated());

        // Retrieve it back
        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.customerName").value("Alice"));
    }
}
```

Use `@SpringBootTest` sparingly. It is slow. A handful of integration tests at the top of the pyramid are enough to prove the wiring works. The bulk of your tests should be unit tests and slice tests.

## Module 09 Review

Module 09 covered testing from principles to practice:

| Lesson | Core Idea |
| --- | --- |
| 50: What Testing Is & The Test Pyramid | Why we test; the pyramid: many unit tests, fewer integration, few end-to-end |
| 51: TDD: Red-Green-Refactor | Write a failing test first, make it pass, then clean up: the cycle that drives design |
| 52: JUnit 5 & AssertJ | JUnit 5 lifecycle and annotations; AssertJ's fluent, readable assertions |
| 53: Mockito for Mocking Dependencies | Isolate the class under test by replacing collaborators with stubs and mocks |
| 54: Spring Boot Tests & Module Review | Test slices (`@WebMvcTest`, `@DataJpaTest`), MockMvc, Testcontainers, and the full integration test |

The through-line: **test at the right level of abstraction.** Use unit tests for logic, slice tests for one layer at a time, and `@SpringBootTest` only to prove the wiring. Testcontainers ensures your repository tests match production.

**Primary sources:** [Spring Boot Testing Reference](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html) · [Test Auto-Configuration (Slices)](https://docs.spring.io/spring-boot/reference/test-auto-configuration.html) · [Testcontainers Documentation](https://java.testcontainers.org/) · [MockMvc Reference](https://docs.spring.io/spring-framework/reference/testing/servlet.html)

## Check your understanding

<details>
<summary>1. A test uses @WebMvcTest(OrderController.class). The controller calls OrderService, which calls OrderRepository. Which beans exist in the test context?</summary>
<p><strong>Correct answer:</strong> OrderController and a Mockito mock for OrderService; no OrderRepository at all</p>
</details>

<details>
<summary>2. You write a @DataJpaTest that uses @AutoConfigureTestDatabase(replace = NONE) and @Container + @ServiceConnection on a PostgreSQLContainer. What happens if you remove the replace = NONE setting?</summary>
<p><strong>Correct answer:</strong> Spring Boot replaces the DataSource with an in-memory H2 database, ignoring your PostgreSQL container</p>
</details>

<details>
<summary>3. In a @WebMvcTest, you want to test that a POST endpoint returns 400 when the request body has an invalid field. The controller method has @Valid on its @RequestBody parameter. Do you need to mock the service for this test?</summary>
<p><strong>Correct answer:</strong> No: @Valid rejects the input before the controller method body executes, so the service is never called</p>
</details>

<details>
<summary>4. Your @DataJpaTest passes against H2 but the same query fails in production PostgreSQL. What is the most reliable fix?</summary>
<p><strong>Correct answer:</strong> Use Testcontainers with a real PostgreSQL container so your test database matches production</p>
</details>

<details>
<summary>5. A team has 200 unit tests, 15 @WebMvcTest slice tests, 10 @DataJpaTest slice tests, and 3 @SpringBootTest integration tests. This distribution best matches which principle?</summary>
<p><strong>Correct answer:</strong> The Test Pyramid: many fast unit tests at the base, fewer slice tests, few integration tests at the top</p>
</details>
