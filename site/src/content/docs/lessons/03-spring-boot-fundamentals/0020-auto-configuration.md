---
title: "Auto-configuration & @SpringBootApplication"
description: "Auto-configuration & @SpringBootApplication"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/03-spring-boot-fundamentals/0020-auto-configuration.md
---

# Auto-configuration & `@SpringBootApplication`

Plain Spring works, but it makes you earn every bean. You write XML, you hand-configure a DataSource, you deploy a WAR to Tomcat, and somewhere around the fiftieth `<bean>` tag you wonder if there's a better way. There is. Spring Boot doesn't replace Spring; it *automates* the setup so you can focus on business code.

## Spring Boot vs plain Spring

Spring Boot is built *on top of* the Spring Framework. It adds three things the original framework never had:

| Feature | Plain Spring | Spring Boot |
| --- | --- | --- |
| Bean wiring | You write every `<bean>` or `@Bean` | Auto-configured from classpath |
| Web server | Build WAR, deploy to external Tomcat | Embedded Tomcat inside the JAR |
| Dependency versions | You pick and test each one | Starters bundle compatible versions |
| Configuration | XML or manual Java config | Convention over configuration |
| Production monitoring | Add it yourself | Actuator endpoints out of the box |

The principle is **convention over configuration**: follow the defaults and Spring Boot fills in the details. Override only when you need to.

## Auto-configuration: how it actually works

When you add a dependency to your `pom.xml`, Spring Boot detects it on the classpath and wires the corresponding beans automatically. No XML, no `@Bean` methods. It just works.

Some concrete triggers:

-   `spring-boot-starter-web` on classpath → embedded Tomcat, Spring MVC, Jackson JSON serialization, and a `DispatcherServlet` all get configured.
-   `spring-boot-starter-data-jpa` on classpath → `DataSource`, `EntityManagerFactory`, and JPA repository support are created.
-   PostgreSQL JDBC driver on classpath → a connection pool targeting PostgreSQL is set up (once you provide URL/credentials in `application.yml`).

Behind the scenes, each auto-configuration class is guarded by a **condition**, typically `@ConditionalOnClass` (a specific class exists on the classpath) or `@ConditionalOnMissingBean` (the user hasn't already defined one). If the condition fails, the configuration is skipped entirely. This is why auto-configuration never overrides your own beans. Yours always win.

## `@SpringBootApplication`: the three-in-one annotation

Every Spring Boot application has an entry point that looks like this:

```
@SpringBootApplication
public class OrderManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderManagementApplication.class, args);
    }
}
```

`@SpringBootApplication` is a convenience annotation that combines three others:

| Annotation | What it enables |
| --- | --- |
| `@Configuration` | Marks this class as a source of bean definitions (you can add `@Bean` methods right here) |
| `@EnableAutoConfiguration` | Activates Spring Boot's classpath-scanning auto-configuration |
| `@ComponentScan` | Scans the same package and all sub-packages for `@Component`, `@Service`, `@Repository`, `@Controller`, etc. |

When `main()` runs, Spring Boot:

1.  Creates the application context (the IoC container holding all beans).
2.  Runs component scanning: finds your `@Service`, `@Repository`, and `@Controller` classes under the application package.
3.  Runs auto-configuration: inspects the classpath and registers infrastructure beans.
4.  Starts the embedded Tomcat server on port 8080 (if a web starter is present).

**Package placement matters.** `@ComponentScan` scans the package of the annotated class and everything below it. If you put your `@SpringBootApplication` class in `com.example` but your controllers live in `org.myapp.controller`, they *will not be found*. Keep the main class at the root of your package hierarchy.

## Embedded Tomcat

In the old model, you built a WAR file and deployed it to a standalone Tomcat instance. Spring Boot flips this: Tomcat runs *inside* your application. The fat JAR you produce with `mvn package` contains your code, your dependencies, *and* the web server. You run it with `java -jar app.jar`, and it starts on port 8080.

All it takes is this dependency:

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Spring Boot auto-configures Tomcat at startup. You didn't write a single line of server configuration, but you *can* override any default in `application.yml`:

**Virtual threads by default.** As of Spring Boot 4, embedded Tomcat uses a virtual thread pool instead of the traditional platform thread pool. This means Spring MVC requests are handled on virtual threads out of the box, no configuration changes needed. Each incoming request still follows the familiar blocking MVC model, but the lightweight virtual threads make it far cheaper to handle many concurrent connections without resorting to reactive WebFlux.

```
server:
  port: 9090          # change the port
  servlet:
    context-path: /api  # prefix all URLs with /api
```

**Primary sources:** [Spring Boot: Auto-configuration](https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html) · [Javadoc: @SpringBootApplication](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/SpringBootApplication.html) · [Spring Boot: Embedded Web Servers](https://docs.spring.io/spring-boot/reference/web/embedded-server.html)

## Check your understanding

<details>
<summary>1. What happens when you add spring-boot-starter-web to your POM and run the application?</summary>
<p><strong>Correct answer:</strong> An embedded Tomcat starts on port 8080 with Spring MVC configured</p>
</details>

<details>
<summary>2. @SpringBootApplication is equivalent to which three annotations combined?</summary>
<p><strong>Correct answer:</strong> @Configuration, @EnableAutoConfiguration, @ComponentScan</p>
</details>

<details>
<summary>3. You define a @Bean method for DataSource in a @Configuration class. Spring Boot's auto-configuration also defines a DataSource bean. Which one wins?</summary>
<p><strong>Correct answer:</strong> Your bean wins; auto-configuration steps aside when a bean already exists</p>
</details>

<details>
<summary>4. Your @SpringBootApplication class is in com.example.app. A @Service class lives in com.example.util. Will Spring discover it?</summary>
<p><strong>Correct answer:</strong> No, component scanning starts from `com.example.app` and only scans its sub-packages; `com.example.util` is a sibling package, not a sub-package</p>
</details>

<details>
<summary>5. What does @ConditionalOnClass do in an auto-configuration class?</summary>
<p><strong>Correct answer:</strong> It activates the auto-configuration only if the named class exists on the classpath</p>
</details>
