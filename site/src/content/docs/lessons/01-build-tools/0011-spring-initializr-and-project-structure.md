---
title: "Spring Initializr & Project Structure"
description: "Spring Initializr & Project Structure"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0011-spring-initializr-and-project-structure.html
---

# Spring Initializr & Project Structure

Instead of creating every file by hand, **Spring Initializr** generates a complete Spring Boot project skeleton from a web form. Fill it in, download the zip, and open it in your IDE — you have a running project in under a minute.

## Using Spring Initializr

Go to [start.spring.io](https://start.spring.io) and fill the form:

-   **Project:** Maven
-   **Language:** Java
-   **Spring Boot:** 4.1 (latest stable)
-   **Group:** `com.example`
-   **Artifact:** `ordermgmt`
-   **Package name:** `com.example.ordermgmt`
-   **Java:** 21

Then click **Add Dependencies** and select:

-   **Spring Web** — REST APIs
-   **Spring Data JPA** — database access
-   **PostgreSQL Driver** — PostgreSQL connectivity
-   **Spring for GraphQL** — GraphQL API support
-   **Spring for Apache Kafka** — Kafka messaging
-   **Spring Boot DevTools** — hot reload during development

Skip **Lombok**. We use Java records instead — no annotation processor, no IDE plugin, no hidden getters.

Click **Generate**, download the zip, and unzip it. That's your project.

## The main class — `@SpringBootApplication`

Initializr creates one Java class with a `main` method:

```
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

`@SpringBootApplication` is a **compound annotation** that combines three:

1.  **`@Configuration`** — marks this class as a source of bean definitions
2.  **`@EnableAutoConfiguration`** — tells Spring Boot to auto-configure beans based on the classpath (e.g., if Spring Web is present, set up an embedded server)
3.  **`@ComponentScan`** — scans the package `com.example.ordermgmt` and all sub-packages for `@Component`, `@Service`, `@Repository`, `@Controller` classes

That's why the main class must live in the **root package** — `@ComponentScan` starts from there and scans downward.

## Project directory layout

```
ordermgmt/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/ordermgmt/
│   │   │       ├── config/
│   │   │       ├── controller/
│   │   │       ├── domain/
│   │   │       ├── dto/
│   │   │       ├── repository/
│   │   │       ├── service/
│   │   │       └── OrderManagementApplication.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── graphql/
│   └── test/
│       └── java/
│           └── com/example/ordermgmt/
│               ├── controller/
│               ├── service/
│               └── repository/
├── pom.xml
├── mvnw
└── mvnw.cmd
```

Three directories matter:

| Path | Purpose |
| --- | --- |
| `src/main/java` | All production Java source code |
| `src/main/resources` | Configuration files, schemas, static assets |
| `src/test/java` | Test code — mirrors the main structure |

## Key rules

-   **One public class per file.** The file name must match the public class name — `OrderController.java` contains `public class OrderController`.
-   **Non-code files go in resources.** YAML configs, GraphQL schemas, static web files — never in `src/main/java`.
-   **Package naming follows the group + artifact.** Group `com.example` + artifact `ordermgmt` = base package `com.example.ordermgmt`.
-   **Test packages mirror production packages.** A test for `com.example.ordermgmt.service.OrderService` lives in `com.example.ordermgmt.service.OrderServiceTest`.
-   **The main class sits in the root package.** This ensures `@ComponentScan` picks up every sub-package.

**Primary source:** [Spring Boot Reference — Developing Your First Application](https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html#getting-started.first-application)

## Check your understanding

<details>
<summary>1. What does @SpringBootApplication combine?</summary>
<p><strong>Correct answer:</strong> @Configuration, @EnableAutoConfiguration, @ComponentScan</p>
</details>

<details>
<summary>2. Why skip Lombok in the course project?</summary>
<p><strong>Correct answer:</strong> Java records replace what Lombok provides</p>
</details>

<details>
<summary>3. Where does application.yml belong?</summary>
<p><strong>Correct answer:</strong> src/main/resources</p>
</details>

<details>
<summary>4. Why must the main application class live in the root package?</summary>
<p><strong>Correct answer:</strong> @ComponentScan starts from the main class package and scans downward</p>
</details>

<details>
<summary>5. You place OrderController.java in src/main/java/com/example/ordermgmt/controller/. What must be true about the class inside?</summary>
<p><strong>Correct answer:</strong> Its public class name must match the file name</p>
</details>
