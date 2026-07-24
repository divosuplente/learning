---
title: "Module 01: Spring Initializr"
description: "Spring Initializr"
---

## 1. Spring Initializr

**Spring Initializr** (pronounced "init-ee-al-izer") is a web tool that generates a Spring Boot project skeleton for you. Instead of creating all the files manually, you fill in a form and download a ready-to-use project.

### Using Spring Initializr

1. Go to [https://start.spring.io](https://start.spring.io)
2. Fill in the form:
   - **Project:** Maven
   - **Language:** Java
   - **Spring Boot:** 3.x.x (latest stable)
   - **Group:** `com.example`
   - **Artifact:** `ordermgmt`
   - **Name:** `ordermgmt`
   - **Package name:** `com.example.ordermgmt`
   - **Java:** 21
3. Add dependencies (click "Add Dependencies"):
   - **Spring Web** — for building REST APIs
   - **Spring Data JPA** — for database access
   - **PostgreSQL Driver** — for connecting to PostgreSQL
   - **Spring for GraphQL** — for GraphQL API support
   - **Spring for Apache Kafka** — for Kafka messaging
   - **Spring Boot DevTools** — for hot reload during development
   - **Lombok** — NOT needed, skip it (we use Java records instead)
4. Click **Generate**
5. Download and unzip the project

### What Spring Initializr Creates

When you unzip the downloaded file, you get:

```
ordermgmt/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── ordermgmt/
│   │   │               └── OrdermgmtApplication.java
│   │   └── resources/
│   │       ├── application.properties     (we'll change this to .yml)
│   │       └── static/                      (for static web files)
│   └── test/
│       └── java/
│           └── com/
│               └── example/
│                   └── ordermgmt/
│                       └── OrdermgmtApplicationTests.java
├── pom.xml
├── mvnw                       (Maven wrapper script — lets you run Maven without installing it)
├── mvnw.cmd                   (Maven wrapper for Windows)
└── .gitignore
```

### The Main Application Class

```java
package com.example.ordermgmt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OrdermgmtApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrdermgmtApplication.class, args);
    }
}
```

Let's rename it to something clearer:

```java
package com.example.ordermgmt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OrderManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderManagementApplication.class, args);
    }
}
```

### What Does `@SpringBootApplication` Do?

This single annotation does three things (you'll learn about each in later modules):

1. **`@Configuration`** — marks this class as a configuration class (Module 02)
2. **`@EnableAutoConfiguration`** — tells Spring Boot to automatically configure beans based on the dependencies on the classpath (Module 03)
3. **`@ComponentScan`** — tells Spring to scan the `com.example.ordermgmt` package and sub-packages for Spring components (Module 02)

For now, just know that this annotation is the starting point of every Spring Boot application.

---

## 2. Project Structure

Spring Boot follows a convention for project layout:

```
ordermgmt/
├── src/
│   ├── main/
│   │   ├── java/                          # ALL Java source files
│   │   │   └── com/example/ordermgmt/
│   │   │       ├── config/                # Configuration classes
│   │   │       ├── controller/            # REST controllers (Module 03)
│   │   │       ├── domain/                # JPA entities and enums (Module 04)
│   │   │       ├── dto/                   # Data Transfer Objects (Module 05)
│   │   │       ├── graphql/                # GraphQL resolvers (Module 07)
│   │   │       ├── kafka/                 # Kafka producers and consumers (Module 06)
│   │   │       ├── repository/            # Spring Data JPA repositories (Module 04)
│   │   │       ├── service/               # Business logic (Module 05)
│   │   │       └── OrderManagementApplication.java
│   │   └── resources/                     # Non-Java files
│   │       ├── application.yml            # Main configuration file
│   │       ├── application-dev.yml        # Dev profile config
│   │       ├── application-prod.yml       # Production profile config
│   │       └── graphql/                    # GraphQL schema files (Module 07)
│   │           └── schema.graphqls
│   └── test/                               # ALL test files
│       └── java/
│           └── com/example/ordermgmt/     # Mirrors main structure
│               ├── controller/
│               ├── service/
│               └── repository/
├── pom.xml                                  # Maven build file
└── docker-compose.yml                      # Docker setup for local dev (Module 06)
```

### Key Rules

1. **`src/main/java`** — all production Java code goes here
2. **`src/main/resources`** — all non-code files go here (config, schemas, static files)
3. **`src/test/java`** — all test code goes here, mirroring the main structure
4. **Package naming** — always use `com.example.ordermgmt.*` as the base package
5. **One public class per file** — Java requires the file name to match the public class name

---
