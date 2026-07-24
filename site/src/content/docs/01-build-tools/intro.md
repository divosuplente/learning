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

- [Module 00: Java for Experienced Developers](./00-java-foundations.md) — you understand basic Java syntax, classes, records, and packages
- No prior experience with Maven or Spring Boot (build tool concepts from any ecosystem transfer)

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. What Is a Build Tool?](#1-what-is-a-build-tool)
  - [Analogy](#analogy)
- [2. Installing the JDK with SDKMAN](#2-installing-the-jdk-with-sdkman)
  - [Installing SDKMAN](#installing-sdkman)
  - [Installing Java 21 with SDKMAN](#installing-java-21-with-sdkman)
- [3. What Is Maven?](#3-what-is-maven)
  - [Installing Maven](#installing-maven)
  - [Verifying Maven](#verifying-maven)
- [4. Maven Coordinates](#4-maven-coordinates)
- [5. Spring Initializr](#5-spring-initializr)
  - [Using Spring Initializr](#using-spring-initializr)
  - [What Spring Initializr Creates](#what-spring-initializr-creates)
  - [The Main Application Class](#the-main-application-class)
  - [What Does @SpringBootApplication Do?](#what-does-springbootapplication-do)
- [6. The pom.xml — Complete File](#6-the-pomxml-complete-file)
  - [pom.xml Anatomy](#pomxml-anatomy)
    - [Parent](#parent)
    - [Properties](#properties)
    - [Dependencies](#dependencies)
    - [What Is a "Fat JAR"?](#what-is-a-fat-jar)
- [7. Project Structure](#7-project-structure)
  - [Key Rules](#key-rules)
- [8. application.yml](#8-applicationyml)
  - [Rename application.properties to application.yml](#rename-applicationproperties-to-applicationyml)
  - [YAML vs Properties](#yaml-vs-properties)
- [9. Running the Application](#9-running-the-application)
  - [From the Command Line (Maven)](#from-the-command-line-maven)
  - [Building a JAR](#building-a-jar)
  - [From IntelliJ IDEA](#from-intellij-idea)
  - [Verifying It Works](#verifying-it-works)
- [10. Spring Boot DevTools](#10-spring-boot-devtools)
  - [Hot Reload](#hot-reload)
  - [Automatic Restart in IntelliJ](#automatic-restart-in-intellij)
- [11. Spring Profiles](#11-spring-profiles)
  - [Creating Profile Files](#creating-profile-files)
  - [Activating a Profile](#activating-a-profile)
  - [How Profiles Work](#how-profiles-work)
  - [Environment Variables in YAML](#environment-variables-in-yaml)
- [12. Maven Commands Cheatsheet](#12-maven-commands-cheatsheet)
- [What You Learned](#what-you-learned)
- [13. Maven Dependency Scope Deep Dive](#13-maven-dependency-scope-deep-dive)
  - [The Five Scopes](#the-five-scopes)
  - [Transitive Dependencies](#transitive-dependencies)
  - [Excluding Transitive Dependencies](#excluding-transitive-dependencies)
- [14. Maven Plugin Configuration](#14-maven-plugin-configuration)
  - [Compiler Plugin](#compiler-plugin)
  - [Surefire Plugin (Test Execution)](#surefire-plugin-test-execution)
  - [Spring Boot Maven Plugin](#spring-boot-maven-plugin)
- [15. Spring Boot Profiles in Practice](#15-spring-boot-profiles-in-practice)
  - [Profile-Specific Configuration Files](#profile-specific-configuration-files)
  - [Activating Profiles](#activating-profiles)
  - [@Profile on Beans](#profile-on-beans)
- [16. Gradle — An Alternative to Maven](#16-gradle-an-alternative-to-maven)
  - [Gradle vs Maven](#gradle-vs-maven)
  - [build.gradle.kts (Kotlin DSL)](#buildgradlekts-kotlin-dsl)
  - [When to Choose Gradle](#when-to-choose-gradle)
- [17. Multi-Module Maven Projects](#17-multi-module-maven-projects)
  - [Project Structure](#project-structure)
  - [Parent POM](#parent-pom)
  - [Child Module POM](#child-module-pom)
  - [Building Multi-Module Projects](#building-multi-module-projects)
- [18. Maven Wrapper (mvnw)](#18-maven-wrapper-mvnw)

</details>

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
