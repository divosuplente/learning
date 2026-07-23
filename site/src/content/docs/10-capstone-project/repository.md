---
title: "Module 10: Repository Layer"
description: "Repository Layer"
---

## 8. Repository Layer

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.domain.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {}

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    List<ProductEntity> findByCategory(String category);
}

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findByCustomerId(Long customerId);
    List<OrderEntity> findByStatus(OrderStatus status);
}
```

---
