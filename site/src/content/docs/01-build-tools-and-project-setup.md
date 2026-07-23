---
title: "Module 01: Build Tools & Project Setup"
description: "Build Tools & Project Setup"
---

## What You'll Learn

- What a build tool is and why every Java project needs one
- How to install Maven and understand the `pom.xml` file
- How to use Spring Initializr to generate a project
- The exact project structure Spring Boot expects
- How to write a complete `pom.xml` with all dependencies for the Order Management System
- How to configure your application with `application.yml`
- How to run the application and enable hot-reload during development
- How to use Spring profiles for different environments
- How to install the JDK using SDKMAN

## Prerequisites

- [Module 00: Java for Experienced Developers](../00-java-foundations/) — you understand basic Java syntax, classes, records, and packages
- No prior experience with Maven or Spring Boot (build tool concepts from any ecosystem transfer)

---

## 1. What Is a Build Tool?

When you write Java code, you create `.java` files. But to run them, several things need to happen:

1. **Compile** — convert `.java` files into `.class` files (bytecode the JVM can execute)
2. **Resolve dependencies** — download external libraries (like Spring Boot) your code uses
3. **Package** — bundle your compiled code and dependencies into a single runnable file
4. **Run** — execute the packaged application
5. **Test** — compile and run your test code

You could do all this manually with terminal commands, but it would be tedious and error-prone. A **build tool** automates these steps.

### Analogy

Think of a build tool as a kitchen assistant. You write the recipe (your code), and the assistant:
- Goes to the store to buy ingredients (downloads dependencies)
- Prepares them (compiles the code)
- Packs them into containers (packages into a JAR)
- Follows your recipe (runs the application)
- Tastes the dish (runs tests)

The two most popular build tools for Java are **Maven** and **Gradle**. This course uses **Maven** because it's simpler to start with and widely used in enterprise environments.

---

## 2. Installing the JDK with SDKMAN

Before we can build anything, we need the JDK (Java Development Kit) installed. In Module 00, you installed it directly. Now let's do it the professional way using **SDKMAN** — a tool for managing Java versions.

### Installing SDKMAN

**macOS / Linux:**
```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

**Windows:** Use [Scoop](https://scoop.sh/) or [Chocolatey](https://chocolatey.org/) instead, or install the JDK manually from [Adoptium](https://adoptium.net/).

### Installing Java 21 with SDKMAN

```bash
## List available Java versions
sdk list java

## Install OpenJDK 21
sdk install java 21.0.4-tem

## Verify installation
java -version
## openjdk version "21.0.4" ...

## Set it as the default
sdk use java 21.0.4-tem
```

SDKMAN lets you install multiple JDK versions and switch between them — useful when working on different projects that require different Java versions.

---

## 3. What Is Maven?

**Maven** is a build automation tool for Java projects. It uses an XML file called `pom.xml` (Project Object Model) to describe:
- Your project's name, group, and version
- What external libraries (dependencies) your project needs
- What plugins to use (for compiling, testing, packaging)
- What Java version to target

### Installing Maven

**macOS (Homebrew):**
```bash
brew install maven
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install maven
```

**Windows:** Download from [https://maven.apache.org/download.cgi](https://maven.apache.org/download.cgi) and add to PATH.

### Verifying Maven

```bash
mvn -version
## Apache Maven 3.9.x
```

---

## 4. Maven Coordinates

Every Maven project is identified by three coordinates:

| Coordinate | Description | Example |
|------------|-------------|---------|
| **groupId** | Your organization or project group | `com.example` |
| **artifactId** | The project name | `ordermgmt` |
| **version** | The project version | `0.0.1-SNAPSHOT` |

Think of it like an address:
- **groupId** = the street name (your organization)
- **artifactId** = the house number (your specific project)
- **version** = which renovation of the house (which release)

Together, these three coordinates uniquely identify any library in the Maven ecosystem. When you declare a dependency, you specify these three coordinates, and Maven downloads the library automatically.

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

## 7. Project Structure

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

## 8. application.yml

Spring Boot reads its configuration from a file in `src/main/resources/`. You can use either `.properties` or `.yml` format. We use **YAML** because it's more readable and supports nested properties.

### Rename `application.properties` to `application.yml`

Delete the auto-generated `application.properties` file and create `application.yml`:

```yaml
## Server configuration
server:
  port: 8080

## Spring configuration
spring:
##  # Application name — shown in logs and actuator
  application:
    name: Order Management System

##  # Database configuration
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver

##  # JPA / Hibernate configuration
  jpa:
##    # Show SQL in the console (helpful during development)
    show-sql: true

##    # Format SQL nicely in the console
    properties:
      hibernate:
        format_sql: true

##    # What Hibernate should do with the database schema on startup
##    # update: create tables that don't exist and modify existing ones
##    # none: do nothing (use in production with Flyway or Liquibase)
    hibernate:
      ddl-auto: update

##  # GraphQL configuration (Module 07)
  graphql:
    graphiql:
      enabled: true              # Enable GraphiQL IDE at /graphiql
      path: /graphiql

##  # Kafka configuration (Module 06)
  kafka:
    bootstrap-servers: localhost:9092

    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

    consumer:
      group-id: ordermgmt-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      properties:
        spring.json.trusted.packages: "com.example.ordermgmt.kafka.event"

##  # DevTools: enables hot reload
  devtools:
    restart:
      enabled: true

## Logging configuration
logging:
  level:
    com.example.ordermgmt: DEBUG    # Debug-level logging for our code
    org.hibernate.SQL: DEBUG        # Show SQL queries
```

### YAML vs Properties

The same configuration in `.properties` format looks like this:

```properties
server.port=8080
spring.application.name=Order Management System
spring.datasource.url=jdbc:postgresql://localhost:5432/ordermgmt
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
```

YAML is more readable and supports nesting, so we use it throughout the course.

---

## 9. Running the Application

### From the Command Line (Maven)

```bash
## In the project root directory:
mvn spring-boot:run
```

This compiles the code, starts the Spring Boot application, and watches for changes. When you modify a file, DevTools automatically restarts the application.

### Building a JAR

```bash
## Compile, test, and package into a JAR:
mvn clean package

## The JAR is created in the target/ directory:
## target/ordermgmt-0.0.1-SNAPSHOT.jar

## Run the JAR:
java -jar target/ordermgmt-0.0.1-SNAPSHOT.jar
```

### From IntelliJ IDEA

1. Open the project in IntelliJ (File → Open → select the project folder)
2. Find `OrderManagementApplication.java`
3. Click the green play button next to the class name or the `main` method
4. IntelliJ runs the application

### Verifying It Works

Once the application starts, open your browser and go to:

```
http://localhost:8080/actuator/health
```

You should see:
```json
{ "status": "UP" }
```

(Spring Boot Actuator provides health checks built-in.)

If you see a 404, add the Actuator dependency to your `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

---

## 10. Spring Boot DevTools

**Spring Boot DevTools** is a development-time tool that makes coding faster:

### Hot Reload

When you change a Java file and save it, DevTools automatically restarts the application. This is called a **hot restart** — it's much faster than a full restart because Spring Boot only reloades changed classes.

DevTools is already included in our `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

- `<scope>runtime</scope>` — only needed when running, not when packaging the final JAR
- `<optional>true</optional>` — not passed to other projects that depend on this one
- DevTools is automatically disabled in production builds

### Automatic Restart in IntelliJ

For DevTools to detect changes, IntelliJ must "build" the project. To enable automatic building:

1. Settings → Build, Execution, Deployment → Compiler
2. Check "Build project automatically"
3. Settings → Advanced Settings
4. Check "Allow auto-make to start even if developed application is currently running"

Now, every time you save a file (`Cmd+S` / `Ctrl+S`), the application restarts within seconds.

---

## 11. Spring Profiles

**Profiles** let you have different configuration for different environments (development, testing, production). For example:
- **Dev:** use a local PostgreSQL, enable SQL logging, enable DevTools
- **Test:** use a Testcontainers PostgreSQL, disable SQL logging
- **Prod:** use a remote PostgreSQL, disable SQL logging, disable DevTools

### Creating Profile Files

Create separate files for each profile:

**`application.yml`** (default — loaded for all profiles):
```yaml
server:
  port: 8080

spring:
  application:
    name: Order Management System
```

**`application-dev.yml`** (development profile):
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt_dev
    username: postgres
    password: postgres

  jpa:
    show-sql: true
    hibernate:
      ddl-auto: update

logging:
  level:
    com.example.ordermgmt: DEBUG
```

**`application-prod.yml`** (production profile):
```yaml
spring:
  datasource:
    url: ${DATABASE_URL}           # Read from environment variable
    username: ${DATABASE_USERNAME}  # Read from environment variable
    password: ${DATABASE_PASSWORD} # Read from environment variable

  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate            # Don't modify schema in production

  devtools:
    restart:
      enabled: false                # Disable hot restart in production

logging:
  level:
    com.example.ordermgmt: INFO
```

### Activating a Profile

**Command line:**
```bash
java -jar ordermgmt.jar --spring.profiles.active=prod
```

**Environment variable:**
```bash
export SPRING_PROFILES_ACTIVE=prod
java -jar ordermgmt.jar
```

**In `application.yml` (default for development):**
```yaml
spring:
  profiles:
    active: dev    # Use the dev profile by default
```

**In tests:**
```java
@SpringBootTest
@ActiveProfiles("test")
class OrderManagementApplicationTests {
    // Tests run with the test profile
}
```

### How Profiles Work

1. Spring Boot loads `application.yml` first (always)
2. Then it loads `application-{profile}.yml`, which overrides any matching properties
3. The result is a merged configuration

For example, if `application.yml` has `server.port=8080` and `application-prod.yml` has `server.port=9090`, the production environment uses port 9090.

### Environment Variables in YAML

In production, you should never put passwords in files. Use environment variables:

```yaml
spring:
  datasource:
    password: ${DATABASE_PASSWORD}
```

The `${DATABASE_PASSWORD}` syntax reads the value from the environment variable `DATABASE_PASSWORD`. If it's not set, Spring Boot will fail to start (which is better than falling back to a default password).

---

## 12. Maven Commands Cheatsheet

| Command | What It Does |
|---------|-------------|
| `mvn clean` | Deletes the `target/` directory (removes old build files) |
| `mvn compile` | Compiles all Java source files |
| `mvn test` | Runs all tests |
| `mvn package` | Compiles, tests, and packages into a JAR |
| `mvn clean package` | Clean + package (most common before deploying) |
| `mvn spring-boot:run` | Runs the Spring Boot application |
| `mvn install` | Package + install into local Maven repository |
| `mvn verify` | Runs all checks including integration tests |

---

## What You Learned

- A **build tool** automates compilation, dependency management, packaging, and testing
- **Maven** uses an XML file (`pom.xml`) to describe the project, its dependencies, and build configuration
- **Maven coordinates** (`groupId`, `artifactId`, `version`) uniquely identify a project or library
- **Spring Initializr** (start.spring.io) generates a ready-to-use Spring Boot project skeleton
- The `@SpringBootApplication` annotation marks the main class — it enables auto-configuration and component scanning
- The `pom.xml` declares dependencies using real Maven coordinates (like `spring-boot-starter-graphql`, not fake names)
- A **fat JAR** bundles your application code and all dependencies into a single runnable file
- **`application.yml`** is the main configuration file — YAML format is more readable than `.properties`
- **Spring profiles** (`dev`, `prod`, `test`) let you have different settings for different environments
- **DevTools** provides hot restart during development — changes are picked up automatically when you save
- Production credentials should come from **environment variables** (`${DATABASE_PASSWORD}`), not config files
- **SDKMAN** manages multiple Java versions on your machine

---

## 13. Maven Dependency Scope Deep Dive

Maven dependencies have **scopes** that control when they're available during the
build lifecycle and whether they're included in the final JAR.

### The Five Scopes

| Scope | Available at Compile? | Available at Test? | Available at Runtime? | Included in JAR? |
|-------|----------------------|--------------------|-----------------------|-------------------|
| `compile` (default) | Yes | Yes | Yes | Yes |
| `test` | No | Yes | No | No |
| `provided` | Yes | Yes | No | No (container provides) |
| `runtime` | No | Yes | Yes | Yes |
| `system` | Yes | Yes | No | No (must provide path) |

```xml
<!-- compile: needed at build time AND runtime -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- no scope = compile (default) -->
</dependency>

<!-- test: only for testing, not shipped -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>

<!-- runtime: not needed at compile time, needed at runtime -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- provided: the container (Tomcat) provides this at runtime -->
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <scope>provided</scope>
</dependency>
```

### Transitive Dependencies

When you depend on library A, and A depends on library B, Maven automatically
includes B (transitive dependency). But conflicts arise when different dependencies
pull in different versions of the same library:

```xml
<!-- If spring-boot-starter-web pulls in Jackson 2.17
     and your custom library pulls in Jackson 2.15,
     Maven uses "nearest wins" — the closer declaration wins -->

<!-- To force a specific version, use <dependencyManagement> -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.17.2</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### Excluding Transitive Dependencies

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>custom-library</artifactId>
    <version>1.0.0</version>
    <exclusions>
        <exclusion>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-log4j12</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

---

## 14. Maven Plugin Configuration

Plugins extend Maven's build lifecycle. The two most important are the **compiler
plugin** and the **surefire plugin** (for tests).

### Compiler Plugin

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <source>21</source>
        <target>21</target>
        <compilerArgs>
            <arg>-parameters</arg>  <!-- enables parameter name reflection -->
            <arg>-Xlint:all</arg>    <!-- all warnings -->
            <arg>-Werror</arg>       <!-- treat warnings as errors -->
        </compilerArgs>
    </configuration>
</plugin>
```

The `-parameters` flag is essential for Spring Boot — it lets Spring resolve
constructor parameter names without `@Param` annotations.

### Surefire Plugin (Test Execution)

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <includes>
            <include>**/*Test.java</include>
        </includes>
        <argLine>
            -XX:+EnableDynamicAgentLoading
            -Xshare:off
            -javaagent:${settings.localRepository}/org/jacoco/org.jacoco.agent/0.8.12/org.jacoco.agent-0.8.12-runtime.jar=destfile=${project.build.directory}/jacoco.exec
        </argLine>
    </configuration>
</plugin>
```

### Spring Boot Maven Plugin

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <excludes>
            <exclude>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </exclude>
        </excludes>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>build-info</goal>  <!-- generates build-info.properties -->
            </goals>
        </execution>
    </executions>
</plugin>
```

---

## 15. Spring Boot Profiles in Practice

Profiles let you have different configuration for different environments
(development, staging, production).

### Profile-Specific Configuration Files

```
src/main/resources/
├── application.yml            # shared config (all profiles)
├── application-dev.yml        # dev profile overrides
├── application-staging.yml    # staging profile overrides
└── application-prod.yml       # production profile overrides
```

**`application.yml` (shared):**
```yaml
spring:
  application:
    name: Order Management System
  jpa:
    open-in-view: false
```

**`application-dev.yml`:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt_dev
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: create-drop  # recreate schema on startup (dev only)
    show-sql: true
logging:
  level:
    org.hibernate.SQL: DEBUG
    com.example.ordermgmt: TRACE
```

**`application-prod.yml`:**
```yaml
spring:
  datasource:
    url: ${DATABASE_URL}      # from environment variable
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate      # never auto-modify schema in prod
    show-sql: false
logging:
  level:
    com.example.ordermgmt: INFO
    org.hibernate.SQL: WARN
```

### Activating Profiles

```bash
## Command line
java -jar app.jar --spring.profiles.active=dev

## Environment variable
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar

## In application.yml
spring:
  profiles:
    active: dev
```

### @Profile on Beans

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder()
                .setType(EmbeddedDatabaseType.H2)
                .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        var ds = new HikariDataSource();
        ds.setJdbcUrl(System.getenv("DATABASE_URL"));
        ds.setUsername(System.getenv("DB_USERNAME"));
        ds.setPassword(System.getenv("DB_PASSWORD"));
        return ds;
    }
}
```

---

## 16. Gradle — An Alternative to Maven

**Gradle** is the other major build tool in the Java ecosystem. It uses a
**Groovy or Kotlin DSL** instead of XML, making it more concise and programmatic.

### Gradle vs Maven

| Feature | Maven | Gradle |
|---------|-------|--------|
| Configuration | XML (`pom.xml`) | Groovy/Kotlin DSL (`build.gradle.kts`) |
| Build speed | Slower (no incremental compilation by default) | Faster (incremental, build cache) |
| Flexibility | Conventions-based, harder to customize | Full programming language |
| Learning curve | Simpler (declarative XML) | Steeper (DSL to learn) |
| Android | Not used | Official build tool |
| Spring Boot | Both fully supported | Both fully supported |

### build.gradle.kts (Kotlin DSL)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.example"
version = "1.0.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### When to Choose Gradle

- You need **build performance** (incremental compilation, build cache)
- You're building **Android** apps
- You prefer **code over XML** for build configuration
- You have **multi-module projects** with complex dependency graphs

When to stick with Maven:
- Your team already knows Maven (switching has a cost)
- You need maximum **reproducibility** (Maven builds are more deterministic)
- You're working in a **corporate environment** with Maven CI/CD pipelines

---

## 17. Multi-Module Maven Projects

For larger applications, splitting code into multiple Maven modules improves
organization and reusability.

### Project Structure

```
ordermgmt-parent/
├── pom.xml                      (parent POM — packaging: pom)
├── ordermgmt-domain/
│   ├── pom.xml                  (inherits from parent)
│   └── src/main/java/           (entities, enums, domain logic)
├── ordermgmt-repository/
│   ├── pom.xml
│   └── src/main/java/           (Spring Data repositories)
├── ordermgmt-service/
│   ├── pom.xml
│   └── src/main/java/           (business logic, services)
├── ordermgmt-web/
│   ├── pom.xml
│   └── src/main/java/           (controllers, GraphQL resolvers)
└── ordermgmt-app/
    ├── pom.xml
    └── src/main/java/           (main application class, config)
```

### Parent POM

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>ordermgmt-parent</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <modules>
        <module>ordermgmt-domain</module>
        <module>ordermgmt-repository</module>
        <module>ordermgmt-service</module>
        <module>ordermgmt-web</module>
        <module>ordermgmt-app</module>
    </modules>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>ordermgmt-domain</artifactId>
                <version>${project.version}</version>
            </dependency>
            <!-- ... other internal modules -->
        </dependencies>
    </dependencyManagement>
</project>
```

### Child Module POM

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.example</groupId>
        <artifactId>ordermgmt-parent</artifactId>
        <version>1.0.0</version>
    </parent>

    <artifactId>ordermgmt-service</artifactId>

    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>ordermgmt-domain</artifactId>
        </dependency>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>ordermgmt-repository</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
    </dependencies>
</project>
```

### Building Multi-Module Projects

```bash
## Build all modules from the parent
mvn clean package

## Build only one module (plus its dependencies)
mvn clean package -pl ordermgmt-service -am

## Skip tests across all modules
mvn clean install -DskipTests
```

---

## 18. Maven Wrapper (mvnw)

The Maven Wrapper lets you run Maven without installing it globally — the
correct version is downloaded automatically.

```bash
## Generate the wrapper in your project
mvn wrapper:wrapper

## Now you can use ./mvnw instead of mvn
./mvnw clean package
./mvnw spring-boot:run
./mvnw test
```

The wrapper ensures **everyone on the team uses the same Maven version**,
eliminating "works on my machine" build issues. The `mvnw` script and
`.mvn/` directory should be committed to version control.

---
← 
(../02-dependency-injection/) →
