---
title: "Module 01: Gradle & Multi-Module"
description: "Gradle & Multi-Module"
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

## 1. Gradle — An Alternative to Maven

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

## 2. Multi-Module Maven Projects

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
# Build all modules from the parent
mvn clean package

# Build only one module (plus its dependencies)
mvn clean package -pl ordermgmt-service -am

# Skip tests across all modules
mvn clean install -DskipTests
```

---

## 3. Maven Wrapper (mvnw)

The Maven Wrapper lets you run Maven without installing it globally — the
correct version is downloaded automatically.

```bash
# Generate the wrapper in your project
mvn wrapper:wrapper

# Now you can use ./mvnw instead of mvn
./mvnw clean package
./mvnw spring-boot:run
./mvnw test
```

The wrapper ensures **everyone on the team uses the same Maven version**,
eliminating "works on my machine" build issues. The `mvnw` script and
`.mvn/` directory should be committed to version control.

---



---

← [Previous: Module 00 — Java for Experienced Developers](./00-java-foundations.md) | [Next: Module 02 — Dependency Injection](./02-dependency-injection.md) →
