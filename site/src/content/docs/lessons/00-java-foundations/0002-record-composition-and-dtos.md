---
title: "Composing Records and Backend DTOs"
description: "Composing Records and Backend DTOs"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0002-record-composition-and-dtos.md
---

Lesson 1 covered single records. Real backend systems model relationships: an order contains a buyer and line items. Records **compose** naturally: one record can contain another.

## Nested records

```
public record Product(String sku, String name, int stock, java.math.BigDecimal price) {}

public record OrderItem(Product product, int quantity, java.math.BigDecimal lineTotal) {}

public record Order(String id, Customer buyer, List<OrderItem> items, java.math.BigDecimal grandTotal) {}
```

`Order` contains a `Customer` and a list of `OrderItem`. Each `OrderItem` contains a `Product`. This is how domain models look in production: flat at each level, composed across levels.

## Why composition matters

REST APIs return JSON. Records map directly to JSON structure:

```
{
  "id": "ORD-1",
  "buyer": { "id": "CUST-1", "name": "Alice" },
  "items": [
    { "product": { "sku": "WIDGET", "name": "Widget" }, "quantity": 2 }
  ]
}
```

Spring Boot serializes records to JSON automatically. No extra configuration. This is why records are the default choice for **DTOs** (Data Transfer Objects): objects that carry data between layers.

**Primary source:** [Oracle: Records (Java 21)](https://docs.oracle.com/en/java/javase/21/language/records.html)

## Check your understanding

<details>
<summary>1. Can a record contain another record as a field?</summary>
<p><strong>Correct answer:</strong> Yes, records compose naturally by nesting</p>
</details>

<details>
<summary>2. What does Spring Boot do with records in REST responses?</summary>
<p><strong>Correct answer:</strong> Serializes them to JSON automatically</p>
</details>

<details>
<summary>3. What is a DTO (Data Transfer Object)?</summary>
<p><strong>Correct answer:</strong> An object that carries data between layers</p>
</details>

<details>
<summary>4. When Spring Boot serializes an Order record (containing a Customer record) to JSON, what happens to the nested Customer?</summary>
<p><strong>Correct answer:</strong> It appears as a nested JSON object inside the parent</p>
</details>

<details>
<summary>5. A record field is null when serialized to JSON by Spring Boot's default Jackson config. What appears in the JSON output?</summary>
<p><strong>Correct answer:</strong> The key is present with the JSON literal null</p>
</details>
