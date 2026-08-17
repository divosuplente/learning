---
title: "Why Kotlin & Setting Up Kotlin in Spring Boot"
description: "Why Kotlin & Setting Up Kotlin in Spring Boot"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0058-why-kotlin.html
---

# Why Kotlin & Setting Up Kotlin in Spring Boot

Every Java Spring Boot project can run Kotlin instead — same JVM, same libraries, same deployment pipeline. This lesson explains what Kotlin fixes in Java, when a migration makes sense, and how to wire the Kotlin compiler into an existing Maven project so both languages coexist during the transition.

## What Is Kotlin?

**Kotlin** is a statically-typed language for the JVM, created by JetBrains and first released in 2011. It is fully **interoperable** with Java: call Java from Kotlin, call Kotlin from Java — no wrappers, no adapters, no IDL. Google made it the preferred Android language in 2019; Spring Framework has had first-class Kotlin support since 5.0 (2017).

The key promise: **write less code with fewer bugs**. Kotlin's type system catches null-pointer errors at compile time, its data classes eliminate getter/setter boilerplate, and its coroutine model replaces callback chains with sequential-looking code.

## Java vs Kotlin — Comparison

| Feature | Java 21 | Kotlin |
| --- | --- | --- |
| Null safety | Optional API (runtime) | Built-in type system (compile-time) |
| Data classes | Records (Java 16+) | `data class` (since 1.0) |
| String interpolation | `String.format()` or concatenation | `"Hello $name"` |
| Smart casting | `instanceof` + cast | `is` check, automatic cast |
| Extension functions | Not available | Built-in |
| Coroutines | Virtual threads (blocking I/O scaling) | `suspend` functions, structured concurrency |
| Pattern matching | Switch expressions (Java 21) | `when` expression |
| Properties | Getters/setters boilerplate | `val`/`var` — auto-generated |
| Default arguments | Not available | Built-in |
| Named arguments | Not available | Built-in |
| Sealed classes | Sealed interfaces (Java 17+) | `sealed class` (since 1.0) |
| Class mutability | Open by default | Final by default |

The last row matters most for Spring Boot. Kotlin classes are `final` by default — the opposite of Java. Spring's CGLIB proxies need open classes, so Kotlin requires compiler plugins to opt in. More on that below.

## When to Migrate — and When Not To

**Migrate when:**

-   Starting a **new microservice** in an existing Java/Spring ecosystem
-   Adding features to a project where the team wants to **gradually adopt** Kotlin
-   You need **concise code** with fewer bugs (null safety, immutability by default)
-   Your team values **expressiveness** (DSLs, extension functions, coroutines)

**Do NOT migrate when:**

-   Your team has **no Kotlin experience** and ramp-up time is not acceptable
-   You rely heavily on **annotation processing tools** that don't support Kotlin well
-   Your codebase is **stable and low-churn** — migration effort outweighs benefits

Kotlin and Java can coexist in the same Maven module. The safest migration is **file-by-file**: convert one class at a time using IntelliJ's Java-to-Kotlin converter, run the tests, commit. You never need a "big bang" rewrite.

## Setting Up Kotlin in Maven

The fastest path is Spring Initializr: pick **Kotlin** as the language, and everything below is configured for you. But most teams add Kotlin to an **existing** Java project. Here's what you add to `pom.xml`:

### Dependencies

```
<properties>
    <java.version>21</java.version>
    <kotlin.version>2.0.21</kotlin.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.jetbrains.kotlin</groupId>
        <artifactId>kotlin-stdlib</artifactId>
        <version>${kotlin.version}</version>
    </dependency>
    <dependency>
        <groupId>org.jetbrains.kotlin</groupId>
        <artifactId>kotlin-reflect</artifactId>
        <version>${kotlin.version}</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.module</groupId>
        <artifactId>jackson-module-kotlin</artifactId>
    </dependency>
</dependencies>
```

Three libraries:

-   **`kotlin-stdlib`** — the runtime (collections, built-in functions, coroutines primitives)
-   **`kotlin-reflect`** — reflection support (required by Spring's classpath scanning)
-   **`jackson-module-kotlin`** — serializes/deserializes Kotlin data classes without a no-arg constructor

### The kotlin-maven-plugin

```
<plugin>
    <groupId>org.jetbrains.kotlin</groupId>
    <artifactId>kotlin-maven-plugin</artifactId>
    <version>${kotlin.version}</version>
    <configuration>
        <compilerPlugins>
            <plugin>spring</plugin>
            <plugin>jpa</plugin>
            <plugin>all-open</plugin>
        </compilerPlugins>
        <jvmTarget>21</jvmTarget>
    </configuration>
    <executions>
        <execution>
            <id>compile</id>
            <goals><goal>compile</goal></goals>
            <configuration>
                <sourceDirs>
                    <sourceDir>src/main/kotlin</sourceDir>
                    <sourceDir>src/main/java</sourceDir>
                </sourceDirs>
            </configuration>
        </execution>
        <execution>
            <id>test-compile</id>
            <goals><goal>test-compile</goal></goals>
            <configuration>
                <sourceDirs>
                    <sourceDir>src/test/kotlin</sourceDir>
                    <sourceDir>src/test/java</sourceDir>
                </sourceDirs>
            </configuration>
        </execution>
    </executions>
    <dependencies>
        <dependency>
            <groupId>org.jetbrains.kotlin</groupId>
            <artifactId>kotlin-maven-allopen</artifactId>
            <version>${kotlin.version}</version>
        </dependency>
        <dependency>
            <groupId>org.jetbrains.kotlin</groupId>
            <artifactId>kotlin-maven-noarg</artifactId>
            <version>${kotlin.version}</version>
        </dependency>
    </dependencies>
</plugin>
```

The Kotlin compiler must run **before** `maven-compiler-plugin` because Kotlin can see Java sources, but `javac` cannot see Kotlin sources. The `sourceDirs` include both `src/main/kotlin` and `src/main/java` so the Kotlin compiler processes both. Then you disable javac's default compile phase and let it run only for remaining Java files:

```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <executions>
        <execution>
            <id>default-compile</id>
            <phase>none</phase>
        </execution>
        <execution>
            <id>default-testCompile</id>
            <phase>none</phase>
        </execution>
        <execution>
            <id>java-compile</id>
            <phase>compile</phase>
            <goals><goal>compile</goal></goals>
        </execution>
        <execution>
            <id>java-test-compile</id>
            <phase>test-compile</phase>
            <goals><goal>testCompile</goal></goals>
        </execution>
    </executions>
</plugin>
```

Setting `<phase>none</phase>` on the default compilations prevents javac from running before Kotlin has finished. The renamed executions pick up whatever Java files the Kotlin compiler did not consume.

## The Three Compiler Plugins

These are not optional — without them, Spring Boot **fails to start** with Kotlin:

1.  **`spring`** (allopen) — Kotlin classes are `final` by default. Spring's CGLIB creates subclass proxies for `@Service`, `@Configuration`, `@RestController` — but it cannot subclass a `final` class. The `spring` plugin opens any class annotated with Spring stereotypes.
2.  **`jpa`** (noarg) — JPA requires a no-argument constructor on `@Entity` classes. Kotlin data classes have only the all-args constructor. The `jpa` plugin synthesizes a no-arg constructor at compile time.
3.  **`all-open`** — A general escape hatch. Opens classes annotated with any annotation you specify (e.g., a custom `@MyOpen`), used alongside `spring` for non-Spring frameworks that also need proxying.

The `kotlin-maven-allopen` artifact provides the runtime for the `spring` and `all-open` plugins. The `kotlin-maven-noarg` artifact provides the runtime for the `jpa` plugin. Both are declared as **dependencies of the kotlin-maven-plugin**, not of the project itself.

**Primary sources:** [Kotlin Official Documentation](https://kotlinlang.org/docs/home.html) · [Spring Boot Kotlin Support](https://docs.spring.io/spring-boot/reference/kotlin.html) · [Kotlin all-open Plugin](https://kotlinlang.org/docs/all-open-plugin.html) · [Kotlin no-arg Plugin](https://kotlinlang.org/docs/no-arg-plugin.html)

## Check your understanding

<details>
<summary>1. You write a Kotlin @Service class but forget to include the spring compiler plugin. What happens at startup?</summary>
<p><strong>Correct answer:</strong> Spring fails because CGLIB cannot subclass a final class to create the proxy</p>
</details>

<details>
<summary>2. Why is kotlin-maven-allopen declared as a dependency of the kotlin-maven-plugin rather than as a project dependency?</summary>
<p><strong>Correct answer:</strong> The allopen artifact is a compiler plugin resolved at build time, not a runtime library needed by the application</p>
</details>

<details>
<summary>3. In a mixed Java/Kotlin Maven project, why does the Kotlin compiler's sourceDirs include src/main/java?</summary>
<p><strong>Correct answer:</strong> Kotlin can parse Java sources to resolve types, but javac cannot parse Kotlin — so Kotlin must compile first</p>
</details>

<details>
<summary>4. A Kotlin @Entity class has no explicit no-argument constructor. What makes JPA instantiation work?</summary>
<p><strong>Correct answer:</strong> The jpa compiler plugin synthesizes a no-arg constructor at compile time</p>
</details>

<details>
<summary>5. Your team has a stable, low-churn Java Spring Boot service with heavy use of Lombok and MapStruct annotation processors. Should you migrate it to Kotlin?</summary>
<p><strong>Correct answer:</strong> No — annotation processor compatibility is uncertain and the stable codebase doesn't benefit enough to justify the risk</p>
</details>
