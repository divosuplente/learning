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

- [Module 00: Java for Experienced Developers](../00-java-foundations/) — you understand basic Java syntax, classes, records, and packages


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
