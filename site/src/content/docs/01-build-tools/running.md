---
title: "Module 01: Running & Maven Commands"
description: "Running & Maven Commands"
---

## 1. Running the Application

### From the Command Line (Maven)

```bash
# In the project root directory:
mvn spring-boot:run
```

This compiles the code, starts the Spring Boot application, and watches for changes. When you modify a file, DevTools automatically restarts the application.

### Building a JAR

```bash
# Compile, test, and package into a JAR:
mvn clean package

# The JAR is created in the target/ directory:
# target/ordermgmt-0.0.1-SNAPSHOT.jar

# Run the JAR:
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

## 2. Maven Commands Cheatsheet

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
