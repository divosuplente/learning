---
title: "Module 01: Introduction"
description: "Introduction"
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

- [Module 00: Java for Experienced Developers](/00-java-foundations/) — you understand basic Java syntax, classes, records, and packages
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
# List available Java versions
sdk list java

# Install OpenJDK 21
sdk install java 21.0.4-tem

# Verify installation
java -version
# openjdk version "21.0.4" ...

# Set it as the default
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
# Apache Maven 3.9.x
```

---
