---
title: Maven Cheatsheet
description: Quick reference for Maven lifecycle, phases, plugins, and POM structure.
---

## Build Lifecycles

| Lifecycle | Purpose |
|---|---|
| `default` | Build and deploy the project |
| `clean` | Remove build output |
| `site` | Generate project documentation |

## Default Lifecycle — Key Phases

| Phase | What happens |
|---|---|
| `validate` | Verify project is correct |
| `compile` | Compile source code |
| `test` | Run unit tests |
| `package` | Bundle compiled code (JAR/WAR) |
| `verify` | Run integration checks |
| `install` | Install artifact to local repo |
| `deploy` | Copy artifact to remote repo |

## Common Commands

| Command | What it does |
|---|---|
| `mvn clean install` | Clean build, run tests, install locally |
| `mvn compile` | Compile source only |
| `mvn test` | Compile + run tests |
| `mvn package -DskipTests` | Package without running tests |
| `mvn dependency:tree` | Print full dependency tree |
| `mvn versions:display-dependency-updates` | Check for newer dependency versions |

## POM Essentials

```xml
<project>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
  </parent>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

## Multi-Module

```xml
<packaging>pom</packaging>
<modules>
  <module>api</module>
  <module>service</module>
  <module>data</module>
</modules>
```

- Parent POM declares shared dependencies and plugin management.
- Each module inherits and can override.
- Build from root: `mvn clean install` builds all modules in reactor order.
