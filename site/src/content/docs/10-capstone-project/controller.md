---
title: "Module 10: REST Controller"
description: "REST Controller"
---

## 13. REST Controller

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.service.OrderService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<OrderResponse> findAll() {
        log.info("GET /api/orders");
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable Long id) {
        log.info("GET /api/orders/{}", id);
        return ResponseEntity.ok(orderService.findById(id));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<OrderResponse>> findByStatus(
            @PathVariable OrderStatus status) {
        log.info("GET /api/orders/status/{}", status);
        return ResponseEntity.ok(orderService.findByStatus(status));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        log.info("POST /api/orders - customer {}", request.customerId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        log.info("PUT /api/orders/{}/status - {}", id, request.status());
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.status()));
    }
}
```

---

## 14. Global Exception Handler

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.service.exception.OrderNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorBody(
                HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(
                HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody(
                HttpStatus.CONFLICT, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(
                HttpStatus.BAD_REQUEST, "Validation failed", details));
    }

    private Map<String, Object> errorBody(HttpStatus status, String message) {
        return errorBody(status, message, null);
    }

    private Map<String, Object> errorBody(HttpStatus status, String message, String details) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message,
                "details", details != null ? details : ""
        );
    }
}
```

---
