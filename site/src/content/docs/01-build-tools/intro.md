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

## 2. Installing the JDK

Before we can build anything, we need the JDK (Java Development Kit) — version 21 or later.
Choose your platform below.

### macOS

The easiest way is **SDKMAN** — a version manager for JVM tools:

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# List available Java versions
sdk list java

# Install OpenJDK 21
sdk install java 21.0.4-tem

# Verify
java -version
# openjdk version "21.0.4" ...

# Set as default
sdk use java 21.0.4-tem
```

Alternatively, use **Homebrew**:
```bash
brew install openjdk@21
sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

Or download a `.pkg` installer from [Adoptium](https://adoptium.net/).

### Linux

**SDKMAN** (any distro):
```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.4-tem
```

**Debian/Ubuntu** (apt):
```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

**Fedora/RHEL** (dnf):
```bash
sudo dnf install java-21-openjdk-devel
```

**Arch Linux** (pacman):
```bash
sudo pacman -S jdk21-openjdk
```

### Windows

**Option 1 — Winget** (built into Windows 11):
```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

**Option 2 — Scoop:**
```powershell
scoop install java/temurin21-jdk
```

**Option 3 — Chocolatey:**
```powershell
choco install temurin21
```

**Option 4 — Manual:** Download the `.msi` installer from [Adoptium](https://adoptium.net/).

### Verifying the JDK (all platforms)

```bash
java -version
# Should show "21.0.x"

javac -version
# Should show "javac 21.0.x"
```

SDKMAN (macOS/Linux) lets you install multiple JDK versions and switch between them — useful when working on different projects that require different Java versions.

---

## 3. Choosing an IDE

You need an IDE for writing Java. All of these work on macOS, Linux, and Windows:

| IDE | Price | Spring Boot Support | Kotlin Support | Best For |
|-----|-------|---------------------|----------------|----------|
| **IntelliJ IDEA Community** | Free | Good (no Spring dashboard) | Good | Most developers — the industry standard for Java |
| **IntelliJ IDEA Ultimate** | Paid | Excellent (full Spring tooling) | Excellent | Teams wanting first-class Spring and database tooling |
| **VS Code** | Free | Via extensions | Via extensions | Developers already in the VS Code ecosystem |
| **Eclipse** | Free | Via Spring Tools 4 plugin | Via plugin | Legacy teams already on Eclipse |

### VS Code Setup (Alternative to IntelliJ)

If you prefer VS Code, install these extensions:

1. **Extension Pack for Java** (`vscjava.vscode-java-pack`) — compiler, debugger, Maven, Test Runner
2. **Spring Boot Extension Pack** (`vmware.vscode-spring-boot`) — Spring-specific navigation and wizard

```bash
# From the command palette (Cmd/Ctrl+Shift+P):
# "Install Extensions" → search for "Extension Pack for Java"
```

VS Code handles Maven projects natively once the Java extension pack is installed. You can create Spring Boot projects with the Spring Initializr wizard (`Cmd/Ctrl+Shift+P` → "Spring Initializr: Generate a Maven Project").

### Eclipse Setup (Alternative to IntelliJ)

Install **Spring Tools 4** (formerly Spring IDE):

1. Open Eclipse → Help → Eclipse Marketplace
2. Search for "Spring Tools 4"
3. Click Install

This adds Spring Boot project wizards, bean navigation, and application.properties autocomplete.

> This course uses IntelliJ IDEA Community in examples, but every step works identically in VS Code or Eclipse. The build commands (`mvn` in terminal) are the same regardless of IDE.

---

## 4. What Is Maven?

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

**macOS (SDKMAN):**
```bash
sdk install maven
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install maven
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install maven
```

**Linux (Arch):**
```bash
sudo pacman -S maven
```

**Windows (Winget):**
```powershell
winget install Apache.Maven
```

**Windows (Chocolatey):**
```powershell
choco install maven
```

**Windows (Manual):** Download the ZIP from [https://maven.apache.org/download.cgi](https://maven.apache.org/download.cgi), extract it, and add the `bin` folder to your `PATH` environment variable.

### Verifying Maven

```bash
mvn -version
# Apache Maven 3.9.x
```

---
