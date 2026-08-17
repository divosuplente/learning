---
title: "Application Config & Spring Profiles"
description: "Application Config & Spring Profiles"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0013-application-config-and-profiles.html
---

# Application Config & Spring Profiles

Hardcoded values are fragile. Spring Boot reads configuration from external files — change the database, the port, or the log level without recompiling. The mechanism: `application.yml`, profile-specific overrides, and environment variables for secrets.

## application.yml

Spring Boot loads config from `src/main/resources/application.yml`. YAML supports nesting, so related properties stay grouped instead of flattened into long dotted keys:

```
# Server configuration
server:
  port: 8080

# Spring configuration
spring:
  application:
    name: Order Management System

  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver

  jpa:
    show-sql: true
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        format_sql: true
```

Every property is a plain key-value pair. Comments start with `#`. Indentation is meaning — two spaces per level, not tabs.

## YAML vs .properties

The same config in `.properties` format:

```
server.port=8080
spring.application.name=Order Management System
spring.datasource.url=jdbc:postgresql://localhost:5432/ordermgmt
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
```

YAML nests related keys together — easier to read, easier to maintain. We use it throughout. Pick one format per project; mixing causes confusing precedence issues.

## Spring Profiles

Different environments need different settings: a local dev database vs a production one, verbose logging vs quiet. **Profiles** solve this with per-environment files that override the base config.

Create one file per profile following the naming convention `application-{profile}.yml`:

```
src/main/resources/
├── application.yml            # shared base (all profiles)
├── application-dev.yml        # overrides for development
├── application-test.yml       # overrides for testing
└── application-prod.yml       # overrides for production
```

**application.yml** (shared base):

```
server:
  port: 8080

spring:
  application:
    name: Order Management System
```

**application-dev.yml** (development):

```
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

**application-prod.yml** (production):

```
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate
  devtools:
    restart:
      enabled: false

logging:
  level:
    com.example.ordermgmt: INFO
```

## How profiles merge

Spring Boot loads config in a specific order:

1.  **base first** — `application.yml` is always loaded
2.  **profile overrides** — `application-{profile}.yml` overrides any matching keys
3.  The result is a single merged configuration

If `application.yml` sets `server.port: 8080` and `application-prod.yml` sets `server.port: 9090`, production uses 9090. Properties *not* overridden carry forward from the base.

**Activating a profile:**

```
# Command line
java -jar app.jar --spring.profiles.active=prod

# Environment variable
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar

# In application.yml (default for development)
spring:
  profiles:
    active: dev
```

## Environment variables — never hardcode secrets

In production, passwords must not live in files that get committed to source control. Use the `${VARIABLE_NAME}` syntax to read from the environment:

```
spring:
  datasource:
    password: ${DATABASE_PASSWORD}
```

If `DATABASE_PASSWORD` is not set, Spring Boot fails to start — which is correct. A missing secret is a deployment error, not a silent fallback to a default password. You can supply a default with `${DATABASE_PASSWORD:changeme}`, but for real secrets, omit the default and let it fail fast.

## DevTools hot reload

Spring Boot DevTools provides a **hot restart**: when you save a Java file, the app restarts in seconds by reloading only changed classes — much faster than a full restart.

DevTools is declared in `pom.xml` with two important attributes:

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

-   **`<scope>runtime</scope>`** — only needed while running the app, not at compile time
-   **`<optional>true</optional>`** — not transitively pulled into other projects
-   **Auto-disabled in production** — DevTools is automatically excluded from packaged JARs, so it never runs in prod

DevTools is a development convenience, not a production feature. The runtime scope ensures it never ships.

**Primary source:** [Spring Boot: Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)

## Check your understanding

<details>
<summary>1. When both application.yml and application-prod.yml define server.port, which value does production use?</summary>
<p><strong>Correct answer:</strong> The profile file overrides the base value</p>
</details>

<details>
<summary>2. What does ${DATABASE_PASSWORD} do in application-prod.yml?</summary>
<p><strong>Correct answer:</strong> Reads the value from the environment variable</p>
</details>

<details>
<summary>3. Why is spring-boot-devtools declared with runtime?</summary>
<p><strong>Correct answer:</strong> It is only needed when running, not when compiling</p>
</details>

<details>
<summary>4. If ${DATABASE_PASSWORD} is used and the variable is not set, what happens?</summary>
<p><strong>Correct answer:</strong> Spring Boot fails to start with an error</p>
</details>

<details>
<summary>5. What is the correct filename for a YAML config that applies only when the dev profile is active?</summary>
<p><strong>Correct answer:</strong> application-dev.yml in src/main/resources/</p>
</details>
