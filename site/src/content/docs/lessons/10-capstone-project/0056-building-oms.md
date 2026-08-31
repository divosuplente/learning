---
title: "Building the Order Management System"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/10-capstone-project/0056-building-oms.md
---

The capstone project brings together every technology from this course: REST controllers, a service layer with transactional boundaries, Kafka event publishing, GraphQL resolvers, and Spring Data repositories. This lesson walks through the full implementation as a working system where every layer cooperates, not as isolated snippets.

## REST Controller

The controller is thin by design. It receives HTTP requests, delegates to the service, and wraps the result in a `ResponseEntity`. No business logic lives here.

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderResponse> findAll() {
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<OrderResponse>> findByStatus(
            @PathVariable OrderStatus status) {
        return ResponseEntity.ok(orderService.findByStatus(status));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        return ResponseEntity.ok(
                orderService.updateOrderStatus(id, request.status()));
    }
}
```

The `@Valid` annotation triggers Bean Validation before the method body runs, so invalid requests never reach the service. The `201 CREATED` status on `create` follows REST convention for resource creation.

## Global Exception Handler

Instead of try-catch in every controller method, a single `@RestControllerAdvice` translates domain exceptions into HTTP responses:

```
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorBody(HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(
            IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorBody(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(
            IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(errorBody(HttpStatus.CONFLICT, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorBody(HttpStatus.BAD_REQUEST, "Validation failed", details));
    }
}
```

Each domain exception maps to a specific HTTP status: not-found → 404, illegal argument → 400, illegal state (e.g., insufficient stock) → 409 Conflict. Validation errors return 400 with field-level details.

## Service Layer — Where the Work Happens

The service layer owns business logic, transaction boundaries, **and event publishing**. This is the most important class in the system:

```
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderEventProducer eventProducer;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Customer not found: " + request.customerId()));

        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);

        for (CreateOrderItemRequest itemRequest : request.items()) {
            ProductEntity product = productRepository
                    .findById(itemRequest.productId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Product not found: " + itemRequest.productId()));

            if (product.getStock() < itemRequest.quantity()) {
                throw new IllegalStateException(
                        "Insufficient stock for " + product.getName());
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
                .map(OrderResponse::from).toList();
    }
}
```

Two details:

-   **Event publishing happens inside the transaction.** The producer calls `.get()` on the `CompletableFuture` returned by `kafkaTemplate.send()`, blocking until the broker acknowledges or a timeout expires. If the send fails or times out, the exception propagates and the transaction rolls back. You never get a committed order without its event. If you need the opposite guarantee (committed order *even if* the event fails), publish after commit using `TransactionSynchronizationManager.registerSynchronization()` or the `@TransactionalEventListener` pattern.
-   **Stock is decremented in the same transaction.** The product's stock is reduced before the order is saved. If two concurrent orders exceed stock, one transaction will fail, either through an optimistic-lock conflict or a database constraint.

## Kafka Events & Producer

Events are Java records: lightweight, immutable message payloads. Each event has a static factory method that extracts data from the domain entity:

```
public record OrderCreatedEvent(
        Long orderId, Long customerId,
        OrderStatus status, BigDecimal totalAmount,
        Instant createdAt) {

    public static OrderCreatedEvent from(OrderEntity order) {
        return new OrderCreatedEvent(
                order.getId(), order.getCustomer().getId(),
                order.getStatus(), order.getTotalAmount(),
                order.getCreatedAt());
    }
}

public record OrderStatusChangedEvent(
        Long orderId, OrderStatus oldStatus,
        OrderStatus newStatus, Instant changedAt) {

    public static OrderStatusChangedEvent from(
            OrderEntity order, OrderStatus oldStatus) {
        return new OrderStatusChangedEvent(
                order.getId(), oldStatus,
                order.getStatus(), Instant.now());
    }
}
```

The producer wraps Spring's `KafkaTemplate` with topic names injected from configuration:

```
@Component
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String orderCreatedTopic;
    private final String orderStatusTopic;

    public OrderEventProducer(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kafka.topic.order-created:order-created}")
                    String orderCreatedTopic,
            @Value("${kafka.topic.order-status:order-status}")
                    String orderStatusTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.orderCreatedTopic = orderCreatedTopic;
        this.orderStatusTopic = orderStatusTopic;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
            kafkaTemplate.send(orderCreatedTopic, event)
                    .get(10, TimeUnit.SECONDS);
            log.info("Published OrderCreatedEvent for order {}",
                    event.orderId());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                    "Interrupted while publishing OrderCreatedEvent", e);
        } catch (ExecutionException e) {
            log.error("Failed to publish OrderCreatedEvent for order {}",
                    event.orderId(), e.getCause());
            throw new RuntimeException(
                    "Failed to publish OrderCreatedEvent", e.getCause());
        } catch (TimeoutException e) {
            log.error("Timed out publishing OrderCreatedEvent for order {}",
                    event.orderId(), e);
            throw new RuntimeException(
                    "Timed out publishing OrderCreatedEvent", e);
        }
    }
}
```

The `send()` call returns a `CompletableFuture`, but the producer blocks on it with `.get(10, TimeUnit.SECONDS)` to ensure the broker acknowledges the message before the method returns. This is necessary for transactional integrity: if the publish were async, a send failure could go unnoticed after the transaction has already committed, leaving the database and Kafka out of sync. The trade-off is that response latency now depends on broker availability. If the broker is down, the request blocks for up to 10 seconds before timing out.

## Kafka Consumer

Consumers listen to topics and react. In the capstone, they log events. In production they would trigger emails, update dashboards, or push WebSocket notifications:

```
@Component
public class OrderEventConsumer {

    @KafkaListener(
            topics = "${kafka.topic.order-created:order-created}",
            groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderCreated(
            ConsumerRecord<String, OrderCreatedEvent> record) {
        log.info("Received OrderCreatedEvent: orderId={}, partition={}, offset={}",
                record.value().orderId(), record.partition(), record.offset());
    }

    @KafkaListener(
            topics = "${kafka.topic.order-status:order-status}",
            groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderStatusChanged(
            ConsumerRecord<String, OrderStatusChangedEvent> record) {
        log.info("Received OrderStatusChangedEvent: orderId={}, {} -> {}",
                record.value().orderId(),
                record.value().oldStatus(),
                record.value().newStatus());
    }
}
```

The `groupId` ensures that each event is delivered to exactly one consumer instance within the group, which is necessary for horizontal scaling.

## GraphQL Resolvers

The same `OrderService` powers both REST and GraphQL. Spring for GraphQL auto-registers annotated controllers:

```
@Controller
public class OrderResolver {

    private final OrderService orderService;

    public OrderResolver(OrderService orderService) {
        this.orderService = orderService;
    }

    @QueryMapping
    public List<OrderResponse> orders() {
        return orderService.findAll();
    }

    @QueryMapping
    public OrderResponse order(@Argument Long id) {
        return orderService.findById(id);
    }

    @QueryMapping
    public List<OrderResponse> ordersByStatus(
            @Argument OrderStatus status) {
        return orderService.findByStatus(status);
    }

    @MutationMapping
    public OrderResponse createOrder(@Argument CreateOrderInput input) {
        var request = new CreateOrderRequest(
                input.customerId(),
                input.items().stream()
                        .map(i -> new CreateOrderItemRequest(
                                i.productId(), i.quantity()))
                        .toList());
        return orderService.createOrder(request);
    }

    @MutationMapping
    public OrderResponse updateOrderStatus(
            @Argument Long orderId, @Argument OrderStatus status) {
        return orderService.updateOrderStatus(orderId, status);
    }

    public record CreateOrderInput(
            Long customerId, List<CreateOrderItemInput> items) {}
    public record CreateOrderItemInput(
            Long productId, Integer quantity) {}
}
```

The `createOrder` mutation converts the GraphQL input record into the same `CreateOrderRequest` DTO that the REST controller uses. The service layer, validation, and event publishing are all shared. The mutation triggers the same Kafka events because it calls the same `orderService.createOrder()`.

## The Complete Request Flow

Whether the request arrives via REST or GraphQL, the execution path is identical:

```
HTTP/GraphQL request
  → Controller/Resolver (thin, delegates to service)
    → OrderService (@Transactional boundary)
      → Repositories (JPA + Spring Data)
      → OrderEventProducer (KafkaTemplate.send)
        → Kafka broker
    → OrderResponse DTO returned
```

The controller is a routing layer. The service is the transactional boundary. The repository is the persistence layer. Events flow out from the service to Kafka. This separation means you can add a new API surface (e.g., gRPC) without duplicating business logic. You just inject `OrderService`.

**Primary sources:** [Spring Web Reference](https://docs.spring.io/spring-boot/reference/web/spring-web.html) · [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/html/) · [Spring for GraphQL Reference](https://docs.spring.io/spring-graphql/reference/) · [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/reference/)

## Check your understanding

<details>
<summary>1. In the capstone's OrderService.createOrder(), the Kafka event is published after orderRepository.save() but still inside the @Transactional method. What happens if the Kafka send fails?</summary>
<p><strong>Correct answer:</strong> The exception propagates, the transaction rolls back, and no order is persisted</p>
</details>

<details>
<summary>2. The GraphQL createOrder mutation and the REST POST /api/orders endpoint both call orderService.createOrder(). Does the GraphQL mutation also publish Kafka events?</summary>
<p><strong>Correct answer:</strong> Yes — both call the same service method, which publishes events</p>
</details>

<details>
<summary>3. The GlobalExceptionHandler maps IllegalStateException to HTTP 409 Conflict. In the order system, what business scenario triggers this?</summary>
<p><strong>Correct answer:</strong> Insufficient stock for a product in the order</p>
</details>

<details>
<summary>4. The OrderEventProducer.publishOrderCreated() method calls kafkaTemplate.send() and blocks on the result with .get(10, TimeUnit.SECONDS). Why must the publish be blocking inside a @Transactional method?</summary>
<p><strong>Correct answer:</strong> If the publish were async, a Kafka failure could go unnoticed after the transaction commits, leaving the database and Kafka out of sync</p>
</details>

<details>
<summary>5. Two Kafka consumers in the same consumer group both subscribe to order-created. How are messages distributed between them?</summary>
<p><strong>Correct answer:</strong> Each partition is consumed by exactly one consumer in the group</p>
</details>
