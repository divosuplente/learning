---
title: "Running the App & Maven Commands"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/01-build-tools/0014-running-and-maven-commands.md
---

Writing code is half the job. The other half is **building, running, and shipping** it. Maven gives you a small, well-defined set of commands that take you from source to a running application or a deployable JAR. This lesson covers the commands you'll use every day, the Maven Wrapper that keeps your team consistent, and when Gradle might be the better choice.

## Running with Maven

The fastest way to start a Spring Boot app during development:

```
mvn spring-boot:run
```

This compiles your code, resolves dependencies, starts the embedded server, and (with DevTools enabled) watches for file changes. Save a file and the app restarts automatically.

To verify it's running, hit the health endpoint:

```
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

(Requires `spring-boot-starter-actuator` in your `pom.xml`.)

## Building a JAR

For deployment, you want a self-contained **fat JAR**: your code plus every dependency bundled into one file:

```
# Clean old artifacts, then compile + test + package
mvn clean package

# The fat JAR lands in target/:
# target/myapp-0.0.1-SNAPSHOT.jar

# Run it anywhere with a JDK:
java -jar target/myapp-0.0.1-SNAPSHOT.jar
```

`mvn clean package` is the command you run before every deploy. The `clean` deletes stale files from `target/`; `package` compiles, runs tests, and produces the JAR. Skipping `clean` can leave old class files lying around, which causes subtle bugs in production.

## Maven commands cheatsheet

| Command | What it does |
| --- | --- |
| `mvn clean` | Deletes the `target/` directory |
| `mvn compile` | Compiles source code only |
| `mvn test` | Compiles and runs all tests |
| `mvn package` | Compiles, tests, and packages into a JAR |
| `mvn clean package` | Clean slate, then build the JAR |
| `mvn install` | Package + copy JAR into local `~/.m2/repository` |
| `mvn verify` | Runs all checks, including integration tests |
| `mvn spring-boot:run` | Starts the Spring Boot application |

Each command triggers all preceding phases in Maven's lifecycle. `mvn package` already runs `compile` and `test`, so you never need to type `mvn compile test package`.

The difference between `package` and `install`: `install` copies the JAR into your local Maven repository (`~/.m2/repository`), making it available as a dependency for other projects on the same machine. Use `package` for deployment; `install` when multi-module projects need each other's artifacts.

## Maven Wrapper: `./mvnw`

Not everyone on your team has Maven installed. Not everyone has the *same* version. The Maven Wrapper solves both problems:

```
# Generate the wrapper once:
mvn wrapper:wrapper

# Now use ./mvnw instead of mvn:
./mvnw clean package
./mvnw spring-boot:run
```

The wrapper downloads the correct Maven version automatically. The `mvnw` script, `mvnw.cmd`, and `.mvn/` directory **should be committed to git**. This guarantees every contributor and every CI runner uses the same Maven version, eliminating "works on my machine" build differences.

## Gradle: when to choose it over Maven

Gradle is the other major build tool in the JVM ecosystem. It uses a **Groovy or Kotlin DSL** instead of XML:

```
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "4.1.0"
}
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

| Feature | Maven | Gradle |
| --- | --- | --- |
| Config format | XML (`pom.xml`) | Groovy/Kotlin DSL |
| Build speed | Slower (no incremental compilation) | Faster (incremental, build cache) |
| Flexibility | Convention-based, harder to customize | Full programming language |
| Android | Not used | Official build tool |
| Spring Boot | Fully supported | Fully supported |

Choose Gradle when you need **build performance** (incremental compilation, caching), you're building **Android apps**, or you prefer **code over XML** for build logic. Stick with Maven when your team already knows it, you need maximum reproducibility, or your CI/CD pipelines are built around Maven.

**Primary sources:** [Maven: Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) · [Maven Wrapper](https://maven.apache.org/wrapper/) · [Gradle: What Is Gradle](https://docs.gradle.org/current/userguide/what_is_gradle.html)

## Check your understanding

<details>
<summary>1. What does mvn clean package do that mvn package alone does not?</summary>
<p><strong>Correct answer:</strong> Deletes the target/ directory before building</p>
</details>

<details>
<summary>2. What is the key difference between mvn package and mvn install?</summary>
<p><strong>Correct answer:</strong> install copies the JAR into ~/.m2/repository</p>
</details>

<details>
<summary>3. Why should mvnw and .mvn/ be committed to version control?</summary>
<p><strong>Correct answer:</strong> They ensure all contributors use the same Maven version</p>
</details>

<details>
<summary>4. Which mvn command runs integration tests in addition to unit tests?</summary>
<p><strong>Correct answer:</strong> mvn verify</p>
</details>

<details>
<summary>5. Which is a valid reason to choose Gradle over Maven for a new project?</summary>
<p><strong>Correct answer:</strong> You need incremental compilation and build caching</p>
</details>
