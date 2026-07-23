---
title: "Module 01: Application Configuration"
description: "Application Configuration"
---

## 8. application.yml

Spring Boot reads its configuration from a file in `src/main/resources/`. You can use either `.properties` or `.yml` format. We use **YAML** because it's more readable and supports nested properties.

### Rename `application.properties` to `application.yml`

Delete the auto-generated `application.properties` file and create `application.yml`:

```yaml

##  # DevTools: enables hot reload
  devtools:
    restart:
      enabled: true

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
