---
title: "JPA Entities"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/04-repository-pattern/0027-jpa-entities.md
---

A JPA entity is a Java class that maps to a database table. Each instance of the class represents one row. JPA uses annotations to describe exactly how objects become rows and back again, closing the gap between your object model and your relational schema.

## Anatomy of an Entity

Here is a `CustomerEntity` that maps to a `customers` table:

```
@Entity
@Table(name = "customers")
public class CustomerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "address")
    private String address;

    // Required by JPA — no-argument constructor
    protected CustomerEntity() {}

    public CustomerEntity(String name, String email, String address) {
        this.name = name;
        this.email = email;
        this.address = address;
    }

    // getters and setters ...
}
```

Every entity needs three things: `@Entity` on the class, `@Id` on the primary-key field, and a **no-argument constructor** (which can be `protected`). Hibernate uses the no-arg constructor to instantiate a proxy, then populates fields via reflection or setters. Without it, persistence fails at runtime.

## Core Annotations

| Annotation | Purpose |
| --- | --- |
| `@Entity` | Marks the class as a JPA entity (maps to a table) |
| `@Table(name = "x")` | Explicit table name; defaults to the class name |
| `@Id` | Marks a field as the primary key |
| `@GeneratedValue` | Auto-generates primary key values |
| `@Column` | Maps a field to a column; controls nullability, length, uniqueness |

### `@GeneratedValue` strategies

| Strategy | Behavior |
| --- | --- |
| `GenerationType.IDENTITY` | Database auto-increment: the DB assigns the id |
| `GenerationType.SEQUENCE` | Uses a database sequence; portable and efficient for batch inserts |
| `GenerationType.TABLE` | Uses a separate table as a sequence; rarely needed |
| `GenerationType.AUTO` | JPA provider picks a strategy; varies by dialect, avoid for production |

`IDENTITY` is simplest for PostgreSQL auto-increment columns. `SEQUENCE` is better for batch inserts because IDENTITY forces Hibernate to insert one row at a time to retrieve each generated id.

### `@Column` attributes

```
@Column(name = "email", nullable = false, unique = true, length = 200)
private String email;
```

`name` overrides the column name (defaults to the field name). `nullable = false` adds a NOT NULL constraint. `unique = true` adds a UNIQUE constraint. `length` sets the VARCHAR size. `updatable = false` prevents the column from being changed after insert, useful for timestamps and created-by fields.

## Why Not Records?

Java records are immutable and `final`. JPA needs to create instances with no-argument constructors, mutate fields after instantiation, and generate lazy-loading proxies by subclassing. None of this is possible with records. Use traditional classes for entities; keep records for DTOs.

## Relationships

Entities don't live in isolation. A customer has many orders; an order has many items. JPA models these with relationship annotations.

### OrderEntity with relationships

```
@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL,
               orphanRemoval = true)
    private List<OrderItemEntity> items = new ArrayList<>();

    protected OrderEntity() {}

    // getters and setters ...
}
```

### The four relationship types

| Annotation | Example | Foreign key lives on |
| --- | --- | --- |
| `@OneToOne` | User → UserProfile | Either side (owner defines it) |
| `@OneToMany` | Customer → Orders | The "many" side (orders table has `customer_id`) |
| `@ManyToOne` | Order → Customer | This side (the owning side) |
| `@ManyToMany` | Student ↔ Course | A join table (e.g. `student_courses`) |

### Owning side and `@JoinColumn`

In every bidirectional relationship, one side **owns** the foreign key. The owning side declares `@JoinColumn`. The other side uses `mappedBy` to point back:

```
// Owning side — has the foreign key column
@ManyToOne
@JoinColumn(name = "customer_id")
private CustomerEntity customer;

// Inverse side — no foreign key, just a mirror
@OneToMany(mappedBy = "customer")
private List<OrderEntity> orders;
```

`@JoinColumn` goes on the side that *has* the foreign key column in its table. If you put it on both sides, you get two foreign key columns, almost certainly a bug.

### Fetch types

`FetchType.EAGER` loads the related entity immediately. `FetchType.LAZY` loads it only when you access the field. `@ManyToOne` defaults to `EAGER`; `@OneToMany` defaults to `LAZY`. Prefer `LAZY` everywhere: eager fetching is the root cause of N+1 disasters and bloated responses.

### Cascade and orphan removal

`cascade = CascadeType.ALL` means `save`, `merge`, `remove`, `refresh`, and `detach` all propagate from the parent to the children. `orphanRemoval = true` goes one step further: removing an item from the list deletes it from the database. Without it, the item stays in the DB with a null foreign key.

### Many-to-many with a join table

```
@ManyToMany
@JoinTable(
    name = "student_courses",
    joinColumns = @JoinColumn(name = "student_id"),
    inverseJoinColumns = @JoinColumn(name = "course_id")
)
private Set<CourseEntity> courses = new HashSet<>();
```

The join table has two foreign key columns. Prefer `Set` over `List` for many-to-many to avoid duplicate entries and simplify `equals`/`hashCode`.

**Primary sources:** [Jakarta Persistence API](https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/package-summary.html) · [Hibernate: Mapping Annotations](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#annotations)

## Check your understanding

<details>
<summary>1. Why does every JPA entity require a no-argument constructor?</summary>
<p><strong>Correct answer:</strong> Hibernate instantiates proxy objects using it, then populates fields</p>
</details>

<details>
<summary>2. Where should @JoinColumn(name = "customer_id") be placed in a bidirectional Customer/Order relationship?</summary>
<p><strong>Correct answer:</strong> On the @ManyToOne side (Order entity), which owns the foreign key</p>
</details>

<details>
<summary>3. What happens if orphanRemoval = true and you remove an OrderItem from an Order's items list?</summary>
<p><strong>Correct answer:</strong> The item row is deleted from the database</p>
</details>

<details>
<summary>4. Why is GenerationType.SEQUENCE preferred over IDENTITY for batch inserts?</summary>
<p><strong>Correct answer:</strong> IDENTITY forces Hibernate to insert rows one at a time to retrieve each id</p>
</details>

<details>
<summary>5. What is the default fetch type for @ManyToOne, and what risk does it carry?</summary>
<p><strong>Correct answer:</strong> EAGER: risk of loading the entire object graph in a single query</p>
</details>
