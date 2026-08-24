---
title: "Spring Data Repositories: JpaRepository & Derived Queries"
description: "Spring Data Repositories: JpaRepository & Derived Queries"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/04-repository-pattern/0028-spring-data-repositories.md
---

# Spring Data Repositories: JpaRepository & Derived Queries

You defined your entities in the last lesson. Now comes the surprising part: **you write almost no data-access code**. Spring Data JPA's `JpaRepository` interface gives you a full CRUD repository just by extending it, and when the built-in methods aren't enough, you name a method and Spring *generates the SQL*.

## JpaRepository: the interface that replaces your DAO

Declare a repository by extending `JpaRepository<Entity, Id>`:

```
@Repository
public interface CustomerRepository
    extends JpaRepository<CustomerEntity, Long> {
}
```

That's it. No class, no implementation. At startup, Spring Data **generates a proxy class** that implements every method. You inject `CustomerRepository` wherever you need data access and call methods on it like any other bean.

The two type parameters tell Spring everything: `CustomerEntity` is the domain type, `Long` is the primary-key type.

## The free CRUD methods

`JpaRepository` inherits from three parent interfaces (`CrudRepository`, `ListCrudRepository`, `PagingAndSortingRepository`), giving you these methods **without writing a single line**:

| Method | What it does |
| --- | --- |
| `save(entity)` | INSERT if new, UPDATE if the entity has an ID |
| `findById(id)` | Returns `Optional<T>`, empty if not found |
| `findAll()` | Returns `List<T>` of every row |
| `findAllById(ids)` | All entities matching the given IDs |
| `deleteById(id)` | Delete by primary key |
| `delete(entity)` | Delete a managed entity |
| `count()` | Number of rows |
| `existsById(id)` | `true` if a row with that key exists |
| `findAll(Pageable)` | Paginated result (covered in lesson 29) |

Using them is straightforward:

```
// Create
CustomerEntity alice = new CustomerEntity("Alice", "alice@ex.com", "1 Main St");
customerRepository.save(alice);

// Read
Optional<CustomerEntity> found = customerRepository.findById(1L);
CustomerEntity c = found.orElseThrow(() ->
    new NoSuchElementException("customer not found"));

// Delete
customerRepository.deleteById(1L);

// Check
boolean exists = customerRepository.existsById(1L); // false
```

## Derived query methods: name it, Spring writes it

The free methods handle lookups by ID. For everything else (find by email, find by category, find by status), you add a **derived query method** to your interface. Spring parses the method name at startup and generates the SQL:

```
@Repository
public interface CustomerRepository
    extends JpaRepository<CustomerEntity, Long> {

    // SELECT * FROM customers WHERE email = ?
    Optional<CustomerEntity> findByEmail(String email);
}
```

```
@Repository
public interface ProductRepository
    extends JpaRepository<ProductEntity, Long> {

    // SELECT * FROM products WHERE category = ?
    List<ProductEntity> findByCategory(String category);

    // SELECT * FROM products WHERE stock < ?
    List<ProductEntity> findByStockLessThan(int threshold);

    // SELECT * FROM products WHERE LOWER(name) LIKE LOWER(?)
    List<ProductEntity> findByNameContainingIgnoreCase(String name);
}
```

```
@Repository
public interface OrderRepository
    extends JpaRepository<OrderEntity, Long> {

    // SELECT * FROM orders WHERE customer_id = ?
    List<OrderEntity> findByCustomerId(Long customerId);

    // SELECT * FROM orders WHERE customer_id = ? AND status = ?
    List<OrderEntity> findByCustomerIdAndStatus(
        Long customerId, OrderStatus status);
}
```

**No implementation. No SQL. No `@Query`.** The method name *is* the query.

## How Spring parses the method name

The parser splits the name into subject, predicate, and order clauses:

```
find  By  Category  And  StockLessThan  OrderByNameAsc
───── ──  ────────  ───  ──────────────  ──────────────
subj  By  property  And  property+op     sort clause
```

The subject prefix determines the return shape:

| Prefix | Typical return type | Example |
| --- | --- | --- |
| `findBy` | `List<T>` or `Optional<T>` | `findByEmail` |
| `existsBy` | `boolean` | `existsByEmail` |
| `countBy` | `long` | `countByCategory` |
| `deleteBy` | `long` (count deleted) | `deleteByStatus` |

## Keyword reference

Between property names you connect with `And` / `Or`. After a property name you can append a keyword:

| Keyword | SQL equivalent | Example method |
| --- | --- | --- |
| `Containing` | `LIKE '%val%'` | `findByNameContaining` |
| `StartingWith` | `LIKE 'val%'` | `findByNameStartingWith` |
| `EndingWith` | `LIKE '%val'` | `findByEmailEndingWith` |
| `IgnoreCase` | case-insensitive comparison | `findByEmailIgnoreCase` |
| `LessThan` | `<` | `findByStockLessThan` |
| `GreaterThan` | `>` | `findByPriceGreaterThan` |
| `Between` | `BETWEEN ? AND ?` | `findByPriceBetween` |
| `After` | `>` (dates) | `findByCreatedAtAfter` |
| `Before` | `<` (dates) | `findByCreatedAtBefore` |
| `In` | `IN (?)` | `findByStatusIn` |
| `IsNull` | `IS NULL` | `findByAddressIsNull` |
| `OrderBy…Asc/Desc` | `ORDER BY` | `findByCategoryOrderByPriceDesc` |

**Limit:** Derived queries work for straightforward lookups. When you need `JOIN`s, subqueries, `GROUP BY`, or projections, switch to `@Query` (covered in lesson 29).

## Nested property traversal

You can traverse relationships in the method name. Given `OrderEntity` has a `customer` field of type `CustomerEntity`:

```
// SELECT * FROM orders o
//   JOIN customers c ON o.customer_id = c.id
//   WHERE c.name = ?
List<OrderEntity> findByCustomerName(String name);
```

Spring resolves `CustomerName` as `customer.name`: it walks the object graph. This is convenient but generates a JOIN, so be aware of the query cost.

## Using repositories in a service

Repositories are Spring beans. Inject them via constructor injection:

```
@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public Optional<CustomerEntity> findByEmail(String email) {
        return customerRepository.findByEmail(email);
    }

    public CustomerEntity create(String name, String email, String addr) {
        CustomerEntity customer = new CustomerEntity(name, email, addr);
        return customerRepository.save(customer);
    }
}
```

Note that `findByEmail` is our derived method. The service never writes SQL.

**Primary source:** [Spring Data JPA: JpaRepository](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html) · [Query Method Details](https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html) · [Repository Definition](https://docs.spring.io/spring-data/jpa/reference/repositories/definition.html)

## Check your understanding

<details>
<summary>1. What do you have to implement when you extend JpaRepository?</summary>
<p><strong>Correct answer:</strong> Nothing; Spring generates the implementation at runtime</p>
</details>

<details>
<summary>2. What SQL does findByEmailIgnoreCase(String email) generate?</summary>
<p><strong>Correct answer:</strong> SELECT * FROM customers WHERE LOWER(email) = LOWER(?)</p>
</details>

<details>
<summary>3. What does save(entity) do if the entity already has a non-null ID?</summary>
<p><strong>Correct answer:</strong> Performs an UPDATE on the existing row</p>
</details>

<details>
<summary>4. What is a limitation of derived query methods that should push you toward @Query?</summary>
<p><strong>Correct answer:</strong> They cannot express JOINs, subqueries, or GROUP BY</p>
</details>

<details>
<summary>5. Given OrderEntity has a customer field, what does findByCustomerName(String n) do?</summary>
<p><strong>Correct answer:</strong> Traverses the relationship and generates a JOIN on the customers table</p>
</details>
