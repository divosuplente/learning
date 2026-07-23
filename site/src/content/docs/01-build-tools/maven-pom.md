---
title: "Module 01: Maven & POM"
description: "Maven & POM"
---

## 6. The `pom.xml` — Complete File

The `pom.xml` (Project Object Model) is the heart of a Maven project. Here's the complete, correct `pom.xml` for our Order Management System:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Parent: Spring Boot provides sensible defaults for everything -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <!-- Our project coordinates -->
    <groupId>com.example</groupId>
    <artifactId>ordermgmt</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>Order Management System</name>

    <!-- Java version -->
    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <!-- Spring Web: for building REST APIs (controllers, endpoints) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Data JPA: for database access (entities, repositories) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- PostgreSQL Driver: for connecting to PostgreSQL database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Spring for GraphQL: for building GraphQL APIs -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-graphql</artifactId>
        </dependency>

        <!-- Spring for Apache Kafka: for Kafka messaging (producers, consumers) -->
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
        </dependency>

        <!-- Spring WebFlux: for reactive programming (Mono, Flux) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>

        <!-- Spring Boot DevTools: hot reload during development -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>

        <!-- Spring Boot Starter Test: JUnit 5, AssertJ, Mockito, MockMvc -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Spring Kafka Test: for testing Kafka with embedded broker -->
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Reactor Test: for testing reactive streams (StepVerifier) -->
        <dependency>
            <groupId>io.projectreactor</groupId>
            <artifactId>reactor-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Testcontainers: for running real PostgreSQL/Kafka in tests -->
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Spring Boot Maven Plugin: for building fat JARs -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### pom.xml Anatomy

Let's break down each section:

#### Parent

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>
</parent>
```

The **parent POM** provides sensible defaults: Java version, plugin versions, encoding, and dependency management. Instead of specifying a version for every dependency, the parent manages them for you. You just declare the dependency and Maven knows which version to use (compatible with your Spring Boot version).

#### Properties

```xml
<properties>
    <java.version>21</java.version>
</properties>
```

Properties are reusable values. Setting `java.version` tells Maven to compile with Java 21.

#### Dependencies

Each `<dependency>` declares an external library:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

- **`groupId:artifactId`** — identifies the library (like Maven coordinates)
- No `<version>` needed — the parent POM manages it
- **`<scope>`** — when this dependency is needed:
  - `compile` (default) — needed at all times
  - `runtime` — only needed at runtime, not compile time (like database drivers)
  - `test` — only needed during testing
  - `provided` — provided by the runtime environment

#### What Is a "Fat JAR"?

A **fat JAR** (also called an uber JAR) is a single JAR file that contains:
- Your compiled application code
- All dependency libraries (Spring Boot, PostgreSQL driver, etc.)
- All configuration files

This means you can distribute your entire application as one file and run it with:

```bash
java -jar ordermgmt-0.0.1-SNAPSHOT.jar
```

No need to install Maven, download dependencies, or set up a classpath. The `spring-boot-maven-plugin` creates this fat JAR when you run `mvn package`.

---
