---
title: "Module 01: Spring Initializr"
description: "Spring Initializr"
---

## 5. Spring Initializr

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
