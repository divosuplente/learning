---
title: "Build Tools & Maven Basics"
description: "Lesson 10: Build Tools & Maven Basics"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/01-build-tools/0010-build-tools-and-maven-basics.md
---

# Build Tools & Maven Basics

Java source files can't run on their own. Between writing `.java` and seeing output, a chain of steps must fire: compile to bytecode, fetch libraries, bundle everything, run tests, launch the app. A **build tool** automates this chain so you never think about it manually.

## What a build tool does

Every Java build, regardless of tool, performs the same five jobs:

1.  **Compile**: convert `.java` source into `.class` bytecode the JVM can execute
2.  **Resolve dependencies**: download external libraries (Spring Boot, Jackson, etc.) your code imports
3.  **Package**: bundle compiled code and dependencies into a single runnable JAR file
4.  **Test**: compile and run your test suite, fail the build if anything breaks
5.  **Run**: execute the packaged application

You *could* do each step by hand with `javac`, `jar`, and `java` commands. But a project with 30 dependencies and 200 source files would mean typing hundreds of classpaths by rote, and re-typing them every time anything changes. A build tool does it in one command, reproducibly, across every machine.

## Why Maven

The two dominant Java build tools are **Maven** and **Gradle**. This course uses Maven because:

-   Its configuration (`pom.xml`) is declarative XML: easy to read, easy to diagnose
-   Convention over configuration: a standard project layout works out of the box
-   It's the most widely used build tool in enterprise Java

Maven reads a single file, `pom.xml`, to know your project's name, dependencies, plugins, and target Java version. From that, it derives every build step automatically.

## Installing the JDK

Maven needs a JDK (Java Development Kit), version 21 or later. Just the JRE is not enough; Maven runs the compiler, and the compiler lives in the JDK.

### macOS & Linux: SDKMAN

**SDKMAN** is a version manager for JVM tools. It lets you install multiple JDK versions and switch between them, essential when different projects require different Java versions:

```
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install OpenJDK 21
sdk install java 21.0.4-tem

# Verify
java -version
# openjdk version "21.0.4" ...
```

### Windows

```
# Winget (Windows 11+)
winget install EclipseAdoptium.Temurin.21.JDK
```

Alternatively, download the `.msi` installer from [Adoptium](https://adoptium.net/).

### Verifying (all platforms)

```
java -version
# Should show "21.0.x"

javac -version
# Should show "javac 21.0.x"
```

If `javac` is not found, you installed the JRE instead of the JDK.

## Installing Maven

Once the JDK is in place, install Maven:

```
# macOS (SDKMAN — recommended if you already use it)
sdk install maven

# macOS (Homebrew)
brew install maven

# Linux (Debian/Ubuntu)
sudo apt install maven

# Windows (Winget)
winget install Apache.Maven
```

```
mvn -version
# Apache Maven 3.9.x
# Maven home: ...
# Java version: 21.0.x, vendor: ...
```

The `mvn -version` output confirms both Maven *and* the JDK are installed correctly. If it shows a Java version below 21, Maven is picking up the wrong JDK; check your `JAVA_HOME` environment variable.

**Primary sources:** [Apache Maven: Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) · [SDKMAN: Installation](https://sdkman.io/install)

## Check your understanding

<details>
<summary>1. Without a build tool, which of these would you have to manage manually in a project with many dependencies?</summary>
<p><strong>Correct answer:</strong> Compiling, downloading libraries, bundling, and running</p>
</details>

<details>
<summary>2. You run mvn -version and it shows Java 11. Maven works fine. Should you fix this?</summary>
<p><strong>Correct answer:</strong> Yes: this course requires JDK 21 or later</p>
</details>

<details>
<summary>3. What advantage does SDKMAN offer over a package manager like Homebrew or apt?</summary>
<p><strong>Correct answer:</strong> It lets you install and switch between multiple JDK versions</p>
</details>

<details>
<summary>4. java -version works but javac -version gives "command not found". What did you install?</summary>
<p><strong>Correct answer:</strong> The JRE instead of the JDK</p>
</details>

<details>
<summary>5. Maven's pom.xml is described as "declarative." What does that mean in practice?</summary>
<p><strong>Correct answer:</strong> It declares what the project needs, not how to build it</p>
</details>
