---
title: "Module 01: Gradle & Multi-Module"
description: "Gradle & Multi-Module"
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

## Command line
java -jar app.jar --spring.profiles.active=dev

## Environment variable
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar

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
