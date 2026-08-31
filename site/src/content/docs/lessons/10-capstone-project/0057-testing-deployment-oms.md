---
title: "Testing, Deployment & Running the Full Application"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/10-capstone-project/0057-testing-deployment-oms.md
---

You have an Order Management System with REST endpoints, GraphQL queries, Kafka events, and JPA repositories. The final question: how do you **prove it works** at every level and ship it? This lesson walks through the full test suite, Docker Compose for local infrastructure, and hands-on verification with curl and GraphQL.

## Test Suite Overview

Each test class targets one layer of the application, using the lightest test strategy that proves real behavior:

| Test Class | Strategy | What It Proves |
| --- | --- | --- |
| `OrderServiceTest` | Unit (Mockito) | Business logic: totals, stock checks, event publishing |
| `OrderControllerTest` | Integration (`@WebMvcTest`) | HTTP contract: status codes, JSON shapes, validation |
| `OrderRepositoryTest` | Integration (Testcontainers) | Real SQL: queries, constraints, JPA mappings |
| `OrderEventProducerTest` | Integration (Testcontainers Kafka) | Kafka round-trip: produce → consume → verify payload |
| `OrderStatusPublisherTest` | Unit (StepVerifier) | Reactive stream: subscribers receive published events |

All tests live under `src/test/java/com/example/ordermgmt/` and run with `./mvnw test`.

## Unit Test — OrderService

The service test mocks every dependency with Mockito. It verifies business rules without touching a database or a broker:

```
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private OrderEventProducer eventProducer;

    @InjectMocks private OrderService orderService;

    @Test
    void createOrder_withValidRequest_returnsOrderResponse() {
        // Arrange — stub collaborators
        CustomerEntity customer = new CustomerEntity("Alice", "alice@example.com", "123 Main");
        customer.setId(1L);
        ProductEntity product = new ProductEntity("Coffee Mug", new BigDecimal("12.99"), 100, "Kitchen");
        product.setId(10L);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(orderRepository.save(any())).thenAnswer(inv -> {
            OrderEntity o = inv.getArgument(0);
            o.setId(100L);
            return o;
        });

        var request = new CreateOrderRequest(1L, List.of(
            new CreateOrderItemRequest(10L, 3)));

        // Act
        OrderResponse response = orderService.createOrder(request);

        // Assert — business rules, not infrastructure
        assertThat(response.totalAmount())
            .isEqualByComparingTo(new BigDecimal("38.97"));
        verify(eventProducer).publishOrderCreated(any());
    }

    @Test
    void createOrder_withInsufficientStock_throwsIllegalStateException() {
        ProductEntity product = new ProductEntity("Mug", new BigDecimal("9.99"), 2, "Kitchen");
        product.setId(10L);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(new CustomerEntity("A", "a@b.c", "x")));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> orderService.createOrder(
            new CreateOrderRequest(1L, List.of(new CreateOrderItemRequest(10L, 5)))))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Insufficient stock");
    }
}
```

The pattern: **stub the happy path, then assert business outcomes and side effects.** The `verify(eventProducer)` call proves the Kafka event is published without running a broker.

## Controller Integration Test — `@WebMvcTest`

`@WebMvcTest` loads only the web layer: controllers, filters, Jackson configuration. The service is replaced with a `@MockBean`, so you test HTTP behavior in isolation:

```
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean OrderService orderService;

    @Test
    void POST_orders_withValidBody_returns201() throws Exception {
        var response = new OrderResponse(1L, 10L, "Alice",
            OrderStatus.PENDING, new BigDecimal("25.98"), Instant.now(), List.of());
        when(orderService.createOrder(any())).thenReturn(response);

        var request = new CreateOrderRequest(10L,
            List.of(new CreateOrderItemRequest(1L, 2)));

        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void POST_orders_withMissingCustomerId_returns400() throws Exception {
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"items":[{"productId":1,"quantity":2}]}"""))
            .andExpect(status().isBadRequest());
    }
}
```

The second test catches a subtle real bug: missing required fields must produce 400, not 500. `@WebMvcTest` validates the full deserialization + validation pipeline, something a unit test alone cannot verify.

## Repository Integration Test — Testcontainers + PostgreSQL

H2 cannot faithfully reproduce PostgreSQL behavior (column types, constraints, JSON operators). Testcontainers starts a **real PostgreSQL** container, and Spring connects to it automatically via `@ServiceConnection`:

```
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository orderRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired ProductRepository productRepository;

    @Test
    void findByStatus_filtersCorrectly() {
        var customer = customerRepository.save(
            new CustomerEntity("Bob", "bob@example.com", "456 Oak"));

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

`@AutoConfigureTestDatabase(replace = NONE)` prevents Spring from substituting H2. `@ServiceConnection` reads the container's host/port and injects it into `spring.datasource.url` with no manual configuration.

## Kafka Integration Test — Testcontainers with Embedded Kafka

Testing Kafka producers and consumers against a real broker proves serialization, partition routing, and consumer group rebalancing. Testcontainers provides a Kafka module that starts a single-node broker with its ZooKeeper:

```
@Testcontainers
@SpringBootTest
class OrderEventProducerTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers",
            kafka::getBootstrapServers);
    }

    @Autowired KafkaTemplate<String, Object> kafkaTemplate;
    List<OrderCreatedEvent> capturedEvents = new ArrayList<>();

    @KafkaListener(topics = "order-events", groupId = "test-group")
    public void onEvent(OrderCreatedEvent event) {
        capturedEvents.add(event);
    }

    @Test
    void publishOrderCreated_isConsumedByListener() {
        var event = new OrderCreatedEvent(1L, 10L,
            OrderStatus.PENDING, new BigDecimal("25.98"), Instant.now());

        kafkaTemplate.send("order-events", event.orderId().toString(), event);

        await().atMost(Duration.ofSeconds(10))
            .untilAsserted(() ->
                assertThat(capturedEvents).hasSize(1));
    }
}
```

The test is asynchronous: the listener runs on a background thread. `Awaitility` polls until the assertion passes or the timeout expires. This is the standard pattern for testing any message-driven system.

## Reactive Stream Test — StepVerifier

The `OrderStatusPublisher` exposes a `Flux` of status change events. `StepVerifier` lets you assert the timing and content of emissions without manual countdown latches:

```
@Test
void publish_thenSubscriberReceivesEvent() {
    var publisher = new OrderStatusPublisher();
    var event = new OrderStatusChangedEvent(
        1L, OrderStatus.PENDING, OrderStatus.CONFIRMED, Instant.now());

    StepVerifier.create(publisher.subscribe())
        .then(() -> publisher.publish(event))
        .expectNextMatches(e ->
            e.orderId().equals(1L) &&
            e.newStatus() == OrderStatus.CONFIRMED)
        .thenCancel()
        .verify();
}
```

The `.then(() -> publish)` step fires *after* subscription is active but *before* the verifier checks for emissions, guaranteeing the event is not missed.

## Docker Compose — Kafka + PostgreSQL

The application needs Kafka (which needs ZooKeeper) and PostgreSQL. Docker Compose defines the full stack in a single `docker-compose.yml`:

```
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ordermgmt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    healthcheck:
      test: ["CMD-SHELL", "kafka-topics --bootstrap-server localhost:9092 --list"]
      interval: 10s
      retries: 5

volumes:
  pgdata:
```

Start everything: `docker compose up -d`. Verify PostgreSQL is ready:

```
docker exec -it oms-postgres psql -U postgres -c "SELECT 1;"
```

Key detail: `KAFKA_ADVERTISED_LISTENERS` must use `localhost` (not the container name) because the Spring Boot application runs *outside* Docker and connects through the published port. Getting this wrong is the #1 Docker Compose + Kafka gotcha.

## Build, Run, and Verify

With infrastructure running, build and start the application:

```
./mvnw clean package
java -jar target/ordermgmt-1.0.0.jar
```

The REST API is at `http://localhost:8080/api/orders` and GraphQL at `http://localhost:8080/graphql`. The GraphiQL UI is available at `http://localhost:8080/graphiql`.

### REST Verification with curl

```
# Create a customer
curl -X POST http://localhost:8080/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","address":"123 Main St"}'

# Create a product
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Coffee Mug","price":"12.99","stock":100,"category":"Kitchen"}'

# Create an order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"items":[{"productId":1,"quantity":2}]}'

# List all orders
curl http://localhost:8080/api/orders

# Update order status
curl -X PUT http://localhost:8080/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'
```

### GraphQL Verification

```
# Query all orders
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ orders { id customerName status totalAmount items { productName quantity unitPrice } } }"}'

# Create an order via mutation
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createOrder(input: { customerId: 1, items: [{ productId: 1, quantity: 2 }] }) { id status totalAmount } }"}'
```

Or open the GraphiQL UI at `http://localhost:8080/graphiql` for an interactive query editor with autocomplete.

## Production Docker — Multi-Stage Build

For production, use a multi-stage Dockerfile that separates the build environment (Maven + JDK) from the runtime (JRE only):

```
# Stage 1: Build
FROM maven:3-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline          # cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime (~200MB vs ~800MB)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=builder /app/target/ordermgmt-1.0.0.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"'
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Production practices: **non-root user** prevents privilege escalation; `MaxRAMPercentage` makes the JVM respect container memory limits; `HEALTHCHECK` lets Kubernetes know when the app is ready; and the multi-stage build keeps the image small.

**Primary sources:** [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing) · [Testcontainers](https://java.testcontainers.org/) · [Docker Compose Reference](https://docs.docker.com/compose/) · [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)

## Check your understanding

<details>
<summary>1. In the OrderServiceTest, why does the test use verify(eventProducer).publishOrderCreated(any()) instead of asserting the event's contents directly?</summary>
<p><strong>Correct answer:</strong> Because the unit test verifies the interaction (the method was called), not the event's serialized form — that belongs in an integration test</p>
</details>

<details>
<summary>2. Your docker-compose.yml sets KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092 (the container name). The Spring Boot app runs on the host. What happens?</summary>
<p><strong>Correct answer:</strong> The Spring Boot app cannot resolve kafka:9092 from the host — the advertised listener must use localhost when the client runs outside Docker</p>
</details>

<details>
<summary>3. Why does the OrderRepositoryTest use @AutoConfigureTestDatabase(replace = NONE) instead of letting Spring auto-configure an in-memory database?</summary>
<p><strong>Correct answer:</strong> Because H2 does not faithfully reproduce PostgreSQL behavior — queries, types, and constraints may differ, hiding bugs that appear in production</p>
</details>

<details>
<summary>4. The Kafka integration test uses Awaitility.await() instead of Thread.sleep(5000). What is the main advantage?</summary>
<p><strong>Correct answer:</strong> Awaitility polls the assertion and passes as soon as it succeeds — faster on success, reliable on slow CI, no arbitrary sleep duration</p>
</details>

<details>
<summary>5. In the multi-stage Dockerfile, why is pom.xml copied and mvn dependency:go-offline run before copying src/?</summary>
<p><strong>Correct answer:</strong> Docker layer caching — if only source code changes, the dependency download layer is reused, drastically reducing rebuild time</p>
</details>
