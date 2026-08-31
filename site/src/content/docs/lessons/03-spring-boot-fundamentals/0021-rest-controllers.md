---
title: "REST Controllers & HTTP Mappings"
description: "Lesson 21: REST Controllers & HTTP Mappings"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/03-spring-boot-fundamentals/0021-rest-controllers.md
---

# REST Controllers & HTTP Mappings

A REST API maps HTTP requests to Java method calls. Spring MVC makes this nearly declarative: annotate a class, annotate its methods, and the framework wires everything together. This lesson covers `@RestController`, the five HTTP method annotations, and a complete CRUD controller you can use as a starting template.

## `@RestController`: the foundation

Spring has two kinds of controllers. `@Controller` returns **view names** (HTML templates via Thymeleaf or JSP). `@RestController` returns **data**. Spring serializes the return value to JSON by default.

`@RestController` is not a separate mechanism. It is `@Controller` + `@ResponseBody` applied together. `@ResponseBody` tells Spring: "skip view resolution; write the return object directly to the HTTP response body." Every method in a `@RestController` behaves as though it carries `@ResponseBody`.

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    // Every method returns data (JSON), not a view name
}
```

`@RequestMapping("/api/orders")` sets a **base path**. Every method mapping inside this controller is relative to `/api/orders`. Without it, each method would need the full path.

## The five HTTP method annotations

Spring provides shorthand annotations for each HTTP verb. Each is a specialized `@RequestMapping`:

| Annotation | Verb | Purpose | Equivalent |
| --- | --- | --- | --- |
| `@GetMapping` | GET | Read / retrieve | `@RequestMapping(method = GET)` |
| `@PostMapping` | POST | Create new resource | `@RequestMapping(method = POST)` |
| `@PutMapping` | PUT | Full replacement | `@RequestMapping(method = PUT)` |
| `@PatchMapping` | PATCH | Partial update | `@RequestMapping(method = PATCH)` |
| `@DeleteMapping` | DELETE | Remove resource | `@RequestMapping(method = DELETE)` |

Prefer the specific annotations over `@RequestMapping`. They are shorter, they document intent, and they prevent accidental multi-method matching. Use bare `@RequestMapping` only at the class level to set the base path.

## A complete CRUD controller

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // GET /api/orders
    @GetMapping
    public List<OrderResponse> listOrders() {
        return orderService.findAll();
    }

    // GET /api/orders/{id}
    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable Long id) {
        return orderService.findById(id);
    }

    // POST /api/orders
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {  // validation covered in Lesson 24
        OrderResponse created = orderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // PUT /api/orders/{id}
    @PutMapping("/{id}")
    public OrderResponse replaceOrder(@PathVariable Long id,
            @Valid @RequestBody CreateOrderRequest request) {
        return orderService.replace(id, request);
    }

    // DELETE /api/orders/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

Key patterns to notice:

-   **Constructor injection**: `OrderService` is injected by Spring. No `@Autowired` needed on the constructor (Spring 4.3+).
-   **`@PathVariable`** extracts a value from the URL: `/{id}` becomes method parameter `id`.
-   **`@RequestBody`** tells Spring to deserialize the JSON request body into a Java object.
-   **`ResponseEntity`** gives you full control over status codes. `201 Created` for POST, `204 No Content` for DELETE.
-   GET and PUT return the object directly. Spring auto-wraps it with `200 OK`.

## PUT vs PATCH

`@PutMapping` replaces the *entire* resource. The client must send every field. `@PatchMapping` updates only the fields the client sends:

```
// PUT /api/orders/{id} — full replacement (all fields required)
@PutMapping("/{id}")
public OrderResponse replaceOrder(@PathVariable Long id,
        @Valid @RequestBody CreateOrderRequest request) {
    return orderService.replace(id, request);
}

// PATCH /api/orders/{id} — partial update (only sent fields change)
@PatchMapping("/{id}")
public OrderResponse patchOrder(@PathVariable Long id,
        @RequestBody Map<String, Object> updates) {
    return orderService.partialUpdate(id, updates);
}
```

In practice, many APIs skip PATCH and use PUT for all updates. But if your resource has optional fields that callers should not be forced to resend, PATCH is the correct semantic.

## Content negotiation: why it's JSON by default

When `spring-boot-starter-web` is on the classpath, Spring Boot auto-configures Jackson. Every `@RestController` method that returns an object is serialized to JSON. If the client sends `Accept: application/xml` and Jackson XML is on the classpath, Spring will produce XML instead. Without explicit configuration, JSON is the default.

**Primary sources:** [Spring: Annotated Controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html) · [Spring Boot: Spring MVC](https://docs.spring.io/spring-boot/reference/web/spring-mvc.html) · [Jakarta RESTful Web Services](https://jakarta.ee/specifications/restful-ws/)

## Check your understanding

<details>
<summary>1. What does @RestController provide that @Controller alone does not?</summary>
<p><strong>Correct answer:</strong> @ResponseBody on every handler method</p>
</details>

<details>
<summary>2. A class has @Controller and every method has @ResponseBody. Is this equivalent to @RestController?</summary>
<p><strong>Correct answer:</strong> Yes, @RestController is literally @Controller + @ResponseBody</p>
</details>

<details>
<summary>3. Which annotation should handle a request like DELETE /api/orders/42?</summary>
<p><strong>Correct answer:</strong> @DeleteMapping("/{id}") on a class with @RequestMapping("/api/orders")</p>
</details>

<details>
<summary>4. What HTTP status does a @PostMapping method return by default if it returns an object directly (no ResponseEntity)?</summary>
<p><strong>Correct answer:</strong> 200 OK</p>
</details>

<details>
<summary>5. What is the semantic difference between @PutMapping and @PatchMapping?</summary>
<p><strong>Correct answer:</strong> PUT replaces the entire resource; PATCH updates only sent fields</p>
</details>
