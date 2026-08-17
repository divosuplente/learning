---
title: "N+1 Problem in GraphQL & DataLoader"
description: "N+1 Problem in GraphQL & DataLoader"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0043-graphql-n-plus-1-and-dataloader.html
---

# N+1 Problem in GraphQL & DataLoader

GraphQL lets clients request nested data in a single query — but on the server, each nested field can trigger its own database call. A query for 50 orders, each requesting its customer, fires **51 SQL statements** instead of 2. This lesson explains why, and how DataLoader turns an N+1 avalanche into a pair of batched queries.

## The N+1 Problem in GraphQL

The N+1 problem in GraphQL is identical in cause to the JPA version you saw in Lesson 29, but it hides more effectively. Consider this query:

```
{
  orders {
    id
    customer {
      id
      name
    }
  }
}
```

Without batching, the resolver chain works like this:

1.  **1 query** — the `orders()` resolver fetches all orders (say, 50).
2.  **50 queries** — for *each* order, the `customer` resolver calls `customerRepository.findById(order.getCustomerId())`.

**1 + 50 = 51 queries.** With 500 orders, it's 501. The client sends one GraphQL request and has no idea the server is hammering the database.

Why does this happen? Each resolver is invoked independently. The `customer` resolver for order #1 doesn't know that order #2 is about to ask for the same customer table. Every resolver does its own lookup.

## Why JPA Fixes Don't Work Here

In Lesson 29 you solved N+1 in JPA with `JOIN FETCH` or `@EntityGraph` — both produce a single SQL `JOIN`. In GraphQL those fixes don't apply because:

-   The client decides which fields to request — the server can't assume `customer` will always be needed.
-   A `JOIN FETCH` in the orders query eagerly loads customers even when the client only asked for `orders { id }`.
-   Multiple nested levels (order → customer → address → country) would require increasingly complex joins or multiple entity graphs.

GraphQL needs a **per-request batching strategy** — one that collects all the IDs for a given field, fetches them in one batch, and distributes the results. That's DataLoader.

## How DataLoader Works

DataLoader is a batching utility originally from the JavaScript GraphQL reference implementation. The Java port (`org.dataloader`) works the same way:

1.  **Collect.** During a single GraphQL request, each resolver that needs a customer doesn't fetch it immediately. Instead, it calls `dataLoader.load(customerId)`, which queues the ID.
2.  **Batch.** After all resolvers for the current execution level have queued their IDs, DataLoader calls the `BatchLoader` function once with the complete set of IDs — e.g., `[1, 3, 7, 12, 45]`.
3.  **Distribute.** The `BatchLoader` returns all results. DataLoader maps each result back to the resolver that requested it.

```
Without DataLoader:              With DataLoader:
[fetch orders]                   [fetch orders]
  [fetch customer 1]               [collect IDs: 1, 3, 7, 12, 45]
  [fetch customer 3]               [batch: SELECT * FROM customers
  [fetch customer 7]                WHERE id IN (1, 3, 7, 12, 45)]
  [fetch customer 12]              [distribute results to resolvers]
  [fetch customer 45]             Total: 2 queries
Total: 6 queries
```

The key insight: DataLoader batches **within a single GraphQL request**. It is not a cross-request cache. Each request gets its own DataLoader instance (or its own `DataLoaderRegistry`), so batches are scoped correctly.

## Implementing DataLoader in Spring Boot

Spring Boot for GraphQL offers two approaches: the low-level `DataLoader` API and the simpler `@BatchMapping` annotation. For most cases, `@BatchMapping` is sufficient.

### Approach 1: @BatchMapping (Recommended)

`@BatchMapping` is Spring's convenience wrapper. Instead of resolving the `customer` field one order at a time, Spring calls your method once with *all* orders being resolved in the current request:

```
@Controller
public class OrderBatchResolver {

    private final CustomerRepository customerRepository;

    public OrderBatchResolver(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @BatchMapping(typeName = "Order", field = "customer")
    public Map<OrderEntity, CustomerEntity> loadCustomers(List<OrderEntity> orders) {
        // 1. Collect all customer IDs
        Set<Long> customerIds = orders.stream()
                .map(order -> order.getCustomer().getId())
                .collect(Collectors.toSet());

        // 2. Fetch all customers in one query
        List<CustomerEntity> customers = customerRepository.findAllById(customerIds);

        // 3. Map customer ID → customer
        Map<Long, CustomerEntity> customerById = customers.stream()
                .collect(Collectors.toMap(CustomerEntity::getId, Function.identity()));

        // 4. Return order → customer mapping
        return orders.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        order -> customerById.get(order.getCustomer().getId())
                ));
    }
}
```

What happens step by step:

1.  The query asks for `orders { customer { name } }`.
2.  Spring resolves `orders()` — one query — getting 50 `OrderEntity` objects.
3.  Instead of calling a resolver 50 times for `customer`, Spring calls `loadCustomers()` once with all 50 orders.
4.  The method collects 50 customer IDs, fetches them in **one** `findAllById` call, and returns a map from each order to its customer.
5.  Spring assigns the right customer to each order. **Total: 2 queries.**

### Approach 2: Manual DataLoader

When you need more control — custom caching, per-request scoping, or batch sizes — use the `DataLoader` API directly:

```
// Define a BatchLoader
BatchLoader<Long, CustomerEntity> customerBatchLoader = ids -> {
    List<CustomerEntity> customers = customerRepository.findAllById(ids);
    // Must return in the same order as the input IDs
    return CompletableFuture.completedFuture(
        ids.stream()
            .map(id -> customers.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst().orElse(null))
            .collect(Collectors.toList())
    );
};

// Create the DataLoader
DataLoader<Long, CustomerEntity> customerLoader = DataLoaderFactory
    .newDataLoader(customerBatchLoader);

// In a resolver, use load() instead of a direct repository call
@QueryMapping
public List<OrderDto> orders(DataLoaderRegistry registry) {
    DataLoader<Long, CustomerEntity> loader = registry.getDataLoader("customers");
    // Queue customer lookups — they batch automatically
    CompletableFuture<CustomerEntity> c1 = loader.load(1L);
    CompletableFuture<CustomerEntity> c2 = loader.load(3L);
    // ... dispatched as one batch after all loads are queued
}
```

The manual approach requires you to register the DataLoader in a `DataLoaderRegistry` per request and ensure result ordering matches the input ID ordering. Prefer `@BatchMapping` unless you need this level of control.

## DataLoader vs. JPA JOIN FETCH

|  | JPA JOIN FETCH | GraphQL DataLoader |
| --- | --- | --- |
| Where it works | Inside repository queries | Inside GraphQL resolvers |
| Who controls fetching | Server — always fetches | Client — only when field is requested |
| Scope | One JPQL query | One GraphQL request |
| Multiple nested levels | Complex joins or multiple queries | One DataLoader per level, each auto-batched |
| Query count | 1 (single JOIN) | 2 (parent + batched children) |

Use JPA `JOIN FETCH` for fixed server-side queries where you always need the joined data. Use DataLoader for GraphQL resolvers where the client decides the shape.

## Common Pitfalls

**Duplicate customer IDs.** If 50 orders belong to only 5 customers, DataLoader still batches correctly — `findAllById` with a `Set` fetches 5 rows, and the result map handles duplicates. Don't deduplicate manually inside the resolver; let the batch loader handle it.

**Result ordering.** The manual `BatchLoader` must return results in the *same order* as the input IDs. `@BatchMapping` avoids this pitfall because you return a `Map` — Spring does the lookup for you.

**Shared DataLoader instances.** Never share a DataLoader across requests. DataLoaders buffer per-request — a shared instance would mix IDs from different users' queries. Use `@BatchMapping` (Spring handles scoping) or register a fresh `DataLoaderRegistry` per request.

**Multiple batch levels.** A query like `orders { customer { address { country } } }` needs a `@BatchMapping` for each nested field: one for `customer`, one for `address`, one for `country`. Each level batches independently — 3 levels produce at most 4 queries (1 for orders + 1 batch per level), not 1 + N + N×M + N×M×K.

**Primary sources:** [Spring GraphQL: DataLoader](https://docs.spring.io/spring-graphql/reference/reactive.html#dataloader) · [Java DataLoader on GitHub](https://github.com/graphql-java/java-dataloader) · [GraphQL.org: Execution & Batching](https://graphql.org/learn/execution/#batching)

## Check your understanding

<details>
<summary>1. A GraphQL query fetches 30 orders, each resolving customer via a separate findById call. How many database queries execute without DataLoader?</summary>
<p><strong>Correct answer:</strong> 31 — one for orders plus one per order for the customer</p>
</details>

<details>
<summary>2. With @BatchMapping applied to the customer field on 30 orders, how many database queries run?</summary>
<p><strong>Correct answer:</strong> 2 — one for orders, one batched findAllById for all customers</p>
</details>

<details>
<summary>3. Why can't you simply use JOIN FETCH to solve GraphQL's N+1 problem the way you do in JPA?</summary>
<p><strong>Correct answer:</strong> The client decides which fields to request — eagerly joining would fetch data the client didn't ask for</p>
</details>

<details>
<summary>4. What happens if you share a single DataLoader instance across multiple GraphQL requests?</summary>
<p><strong>Correct answer:</strong> IDs from different requests get mixed into the same batch, leaking data between users</p>
</details>

<details>
<summary>5. A query asks for orders { customer { address { country } } } with @BatchMapping on each nested field. If there are 20 orders, 8 customers, and 4 addresses, what is the maximum number of database queries?</summary>
<p><strong>Correct answer:</strong> 4 — one for orders, one batch per nested level (customers, addresses, countries)</p>
</details>
