---
title: "R2DBC: Reactive Relational Database Connectivity"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/12-r2dbc-reactive-data/0063-r2dbc-introduction.md
---

JDBC blocks a thread for every database call: the calling thread sits idle until the database responds. On a server handling thousands of concurrent requests, those blocked threads waste memory and cap throughput. **R2DBC** (Reactive Relational Database Connectivity) is a specification for non-blocking, reactive access to relational databases. Where JDBC ties up a thread per query, R2DBC streams results over the same event loop your reactive web server already uses.

## Why R2DBC Exists

Spring WebFlux runs on a small number of event-loop threads (typically one per CPU core). If even one of those threads blocks on a JDBC call, the entire event loop stalls and every request queued on it waits. R2DBC solves this directly: it gives reactive applications a database driver that never blocks a thread.

The R2DBC specification was created independently of Spring. It defines a **Service Provider Interface (SPI)** that vendors implement for each database, the same way JDBC defines an interface that database vendors ship drivers for. Spring Data R2DBC builds on top of that SPI the same way Spring Data JPA builds on top of JDBC.

## JDBC vs R2DBC

The two APIs solve the same problem with different concurrency models:

| Aspect | JDBC | R2DBC |
| --- | --- | --- |
| Threading model | Blocking: calling thread waits | Non-blocking: returns a `Publisher` |
| Result delivery | Synchronous `ResultSet` | Reactive `Publisher<T>` / `Flux<T>` |
| Connection pooling | `HikariCP` (thread-bound) | `r2dbc-pool` (reactive checkout) |
| Typical stack | Spring MVC + Tomcat | Spring WebFlux + Netty |
| Thread requirement per query | One thread blocks until done | Zero blocking threads; notified via callback |

A JDBC connection pool like HikariCP ties each checkout to a thread. If you have 200 concurrent queries, you need 200 pooled connections and at least 200 threads to use them. R2DBC decouples connections from threads: the same connection can serve multiple sequential requests on the same event loop because no thread is held while the database processes the query.

## The R2DBC Driver Architecture

R2DBC is built on the **Reactive Streams** specification, which defines four core interfaces: `Publisher`, `Subscriber`, `Subscription`, and `Processor`. Every R2DBC operation returns a `Publisher` that the subscriber consumes at its own pace, governed by backpressure.

The flow for a single query looks like this:

```
Application code
       |
       v
ConnectionFactory.create()   --> Publisher<Connection>
       |
       v
Connection.createStatement() --> Statement
       |
       v
Statement.execute()          --> Publisher<Result>
       |
       v
Result.map((row, metadata) -> ...) --> Publisher<T>
```

At each step, nothing happens until a subscriber requests data. The database driver pushes rows downstream only when the subscriber signals demand via `Subscription.request(n)`. This is backpressure: the subscriber controls the flow rather than being overwhelmed by the producer.

Key interfaces in `io.r2dbc.spi`:

-   **`ConnectionFactory`**: the entry point; creates `Connection` objects
-   **`Connection`**: represents an active database session
-   **`Statement`**: a parameterized SQL statement to execute
-   **`Result`**: the query result; you map rows from it
-   **`Row`**: a single result row; read columns by name or index

## When to Use R2DBC vs JDBC

Reach for R2DBC when your application already runs on the reactive stack (Spring WebFlux, Netty). Mixing blocking JDBC into a WebFlux application negates the throughput benefits of the event-loop model. Conversely, if you are on Spring MVC with Tomcat, JDBC and JPA remain the natural choice; adding R2DBC there gains nothing and loses JPA's mature feature set.

Trade-offs to consider:

-   **R2DBC lacks JPA features.** No lazy loading, no second-level cache, no dirty checking, no automatic schema generation. You write queries and map rows yourself (or let Spring Data R2DBC do it).
-   **Driver maturity.** PostgreSQL and MySQL have solid R2DBC drivers. Support for niche databases varies.
-   **Debugging is harder.** Stack traces in reactive pipelines are less readable than synchronous call chains.
-   **Throughput vs latency.** R2DBC improves throughput under concurrent load but does not make individual queries faster.

## Maven Dependencies

R2DBC uses a Bill of Materials (BOM) to align driver versions. In your `pom.xml`:

```
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.r2dbc</groupId>
            <artifactId>r2dbc-bom</artifactId>
            <version>1.0.0.RELEASE</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- Spring Data R2DBC starter (includes SPI + Spring integration) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-r2dbc</artifactId>
    </dependency>

    <!-- PostgreSQL R2DBC driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>r2dbc-postgresql</artifactId>
    </dependency>
</dependencies>
```

The BOM manages driver versions so you omit `<version>` from individual R2DBC dependencies. Spring Boot's starter auto-configures a `ConnectionFactory` from properties in `application.yml`.

## A Basic R2DBC Connection Example

Before Spring Data abstracts it away, it helps to see the raw SPI in action. This standalone example uses the R2DBC PostgreSQL driver directly:

```
import io.r2dbc.spi.ConnectionFactories;
import io.r2dbc.spi.ConnectionFactory;
import io.r2dbc.spi.ConnectionFactoryOptions;
import reactor.core.publisher.Mono;

import static io.r2dbc.spi.ConnectionFactoryOptions.*;

public class RawR2dbcExample {

    public static void main(String[] args) {
        ConnectionFactory factory = ConnectionFactories.get(
            ConnectionFactoryOptions.builder()
                .option(DRIVER, "postgresql")
                .option(HOST, "localhost")
                .option(PORT, 5432)
                .option(USER, "postgres")
                .option(PASSWORD, "secret")
                .option(DATABASE, "mydb")
                .build()
        );

        Mono.from(factory.create())
            .flatMap(conn ->
                Mono.from(conn.createStatement(
                        "SELECT name FROM customers WHERE id = $1"
                    )
                    .bind("$1", 1)
                    .execute())
                .flatMap(result ->
                    Mono.from(result.map((row, metadata) ->
                        row.get("name", String.class)
                    ))
                )
                .doFinally(signalType -> conn.close().subscribe())
            )
            .subscribe(name -> System.out.println("Found: " + name));
    }
}
```

Key observations:

-   `ConnectionFactory` is created from options, not a URL string (though R2DBC also supports `r2dbc:postgresql://user:pass@host:5432/db` URL syntax).
-   PostgreSQL R2DBC uses `$1`, `$2` parameter placeholders rather than JDBC's `?`.
-   Everything returns a `Publisher`; nothing executes until you `subscribe()`.
-   The connection must be closed explicitly. In a real application, Spring handles this.

With Spring Data R2DBC, you rarely write this boilerplate. You define a `ReactiveCrudRepository` interface and Spring generates the implementation. The raw SPI is shown here so you understand what happens underneath.

**Primary sources:** [R2DBC Specification 1.0.0](https://r2dbc.io/spec/1.0.0.RELEASE/spec/html/) · [Spring Data R2DBC Reference](https://docs.spring.io/spring-data/r2dbc/docs/current/reference/html/) · [Reactive Streams Specification](https://www.reactive-streams.org/)

## Check your understanding

<details>
<summary>1. What is the primary reason R2DBC was created?</summary>
<p><strong>Correct answer:</strong> To provide non-blocking database access for reactive applications</p>
</details>

<details>
<summary>2. In R2DBC, what happens when you call Statement.execute()?</summary>
<p><strong>Correct answer:</strong> It returns a Publisher<result> that executes only when subscribed to</result></p>
</details>

<details>
<summary>3. Which combination is the natural fit for R2DBC?</summary>
<p><strong>Correct answer:</strong> Spring WebFlux with Netty and reactive repositories</p>
</details>

<details>
<summary>4. What role does r2dbc-bom play in a Maven project?</summary>
<p><strong>Correct answer:</strong> It aligns versions across all R2DBC dependencies so you omit version tags</p>
</details>

<details>
<summary>5. How does backpressure work in the R2DBC driver model?</summary>
<p><strong>Correct answer:</strong> The subscriber signals demand via Subscription.request(n), and the publisher only sends that many items</p>
</details>
