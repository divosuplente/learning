---
title: "Maven POM Deep Dive"
description: "Maven POM Deep Dive"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0012-maven-pom-deep-dive.html
---

# Maven POM Deep Dive

The `pom.xml` is your project's contract with Maven. Three coordinates identify your artifact, a parent POM eliminates version sprawl, scopes control when dependencies are available, and the fat JAR packages everything into one deployable file. Understanding these pieces means understanding how your build actually works.

## Maven coordinates — the address of every artifact

Every library in the Maven ecosystem is identified by three coordinates:

| Coordinate | Purpose | Example |
| --- | --- | --- |
| `groupId` | Organization or project group | `com.example` |
| `artifactId` | Specific project name | `ordermgmt` |
| `version` | Which release | `0.0.1-SNAPSHOT` |

Think of it as a postal address: **groupId** is the street, **artifactId** is the house number, **version** is which renovation. Together they uniquely identify any JAR on Maven Central — no two artifacts share all three.

The `SNAPSHOT` suffix marks a development version. Maven treats snapshot dependencies as mutable: it checks for updates on every build. Release versions (no suffix) are immutable once published.

## Parent POM — why you rarely write versions yourself

```
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.0</version>
    <relativePath/>
</parent>
```

The parent POM provides **dependency management**: it pre-selects compatible versions for 200+ common libraries. When you declare a starter without a `<version>` tag, Maven inherits the version from the parent. This prevents the most insidious Maven bug — mismatched library versions that compile but fail at runtime.

The parent also configures default plugin versions, encoding, and compiler settings. The `<relativePath/>` empty tag tells Maven to look in the repository, not the local filesystem.

## Dependency scopes — when is a library available?

Every `<dependency>` can specify a `<scope>` that controls which classpaths it joins:

| Scope | Compile? | Test? | Runtime? | In JAR? |
| --- | --- | --- | --- | --- |
| `compile` (default) | Yes | Yes | Yes | Yes |
| `test` | No | Yes | No | No |
| `runtime` | No | Yes | Yes | Yes |
| `provided` | Yes | Yes | No | No |

Common patterns:

-   **Database drivers** use `runtime` — your code calls JDBC interfaces (compile-time), the driver implements them at runtime.
-   **JUnit / Mockito** use `test` — never shipped in production.
-   **Servlet API** uses `provided` — the app server already has it; bundling it would cause classpath conflicts.

Omitting `<scope>` means `compile` — the dependency is available everywhere and packaged in the final JAR.

## Transitive dependencies — the graph Maven walks for you

When your project depends on `spring-boot-starter-web`, that starter depends on Spring MVC, which depends on Jackson, which depends on `jackson-core`. Maven pulls in **the entire chain** automatically — that's transitive resolution.

Version conflicts arise when two paths request different versions of the same artifact. Maven uses **nearest-wins**: the dependency closer to the root of your POM wins. If `spring-boot-starter-web` pulls in Jackson 2.17 and a custom library pulls in Jackson 2.15, the version declared directly in your POM (or the nearer one in the tree) takes precedence.

To force a specific version regardless of distance, use `<dependencyManagement>` — it overrides nearest-wins for the declared artifact.

To cut an unwanted transitive dependency entirely, use `<exclusions>` on the declaring dependency.

## Fat JAR — one file, zero classpath headaches

```
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

The `spring-boot-maven-plugin` repackages your compiled code and all `compile`\-scope and `runtime`\-scope dependencies into a single **fat JAR** (also called an uber JAR). Running `mvn package` produces a file you can execute directly:

```
java -jar ordermgmt-0.0.1-SNAPSHOT.jar
```

No Maven on the server. No classpath to configure. No missing JAR errors at midnight. The plugin also writes a classpath index and layers the JAR so container runtimes like Docker can cache unchanged dependency layers.

**Primary source:** [Maven: Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) · [Maven: Dependency Mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)

## Check your understanding

<details>
<summary>1. Two artifacts on Maven Central share the same groupId and artifactId but differ in version. Are they the same artifact?</summary>
<p><strong>Correct answer:</strong> No — all three coordinates must match for identity</p>
</details>

<details>
<summary>2. You declare spring-boot-starter-web with no tag. Where does Maven find the version number?</summary>
<p><strong>Correct answer:</strong> The parent POM's dependency management supplies it</p>
</details>

<details>
<summary>3. A PostgreSQL driver has runtime. Your Java code calls DriverManager.getConnection(). Why is runtime correct here?</summary>
<p><strong>Correct answer:</strong> Your code uses JDBC interfaces; the driver implements them at runtime</p>
</details>

<details>
<summary>4. Your POM depends on library A (which pulls in Jackson 2.17 transitively) and library B (which pulls in Jackson 2.15). Both paths are depth 2. Which version does Maven use?</summary>
<p><strong>Correct answer:</strong> The first one encountered in the dependency tree wins</p>
</details>

<details>
<summary>5. Which dependencies are included inside a Spring Boot fat JAR?</summary>
<p><strong>Correct answer:</strong> Only compile-scope and runtime-scope dependencies</p>
</details>
