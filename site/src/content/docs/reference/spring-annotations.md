---
title: Spring Annotations
description: Quick reference for the most common Spring annotations.
---

## Stereotype Annotations

| Annotation | Purpose | Typical Layer |
|---|---|---|
| `@Component` | Generic Spring-managed bean | Any |
| `@Service` | Business logic component | Service |
| `@Repository` | Data-access component with exception translation | Persistence |
| `@Controller` | Web MVC controller returning views | Web |
| `@RestController` | `@Controller` + `@ResponseBody` for REST APIs | Web |
| `@Configuration` | Class that declares `@Bean` methods | Config |

## Dependency Injection

| Annotation | Purpose | Recommended? |
|---|---|---|
| `@Autowired` | Field / setter / constructor injection | Constructor preferred |
| `@Qualifier` | Disambiguate bean by name | When multiple candidates |
| `@Primary` | Default bean when multiple candidates | For common default |
| `@Value` | Inject property or SpEL expression | For simple values |

## Web & REST

| Annotation | Purpose |
|---|---|
| `@GetMapping` | Handle HTTP GET |
| `@PostMapping` | Handle HTTP POST |
| `@PutMapping` | Handle HTTP PUT |
| `@DeleteMapping` | Handle HTTP DELETE |
| `@PatchMapping` | Handle HTTP PATCH |
| `@RequestMapping` | Base mapping (method, path, headers) |
| `@PathVariable` | Bind URI template variable |
| `@RequestParam` | Bind query parameter |
| `@RequestBody` | Bind request body to object |
| `@ResponseBody` | Serialize return value as response body |

## Data & JPA

| Annotation | Purpose |
|---|---|
| `@Entity` | Mark class as JPA entity |
| `@Id` | Primary key field |
| `@GeneratedValue` | Auto-generate primary key value |
| `@Column` | Customize column mapping |
| `@OneToMany` / `@ManyToOne` | Define relationship mapping |
| `@Transactional` | Wrap method in a DB transaction |

## Configuration & Lifecycle

| Annotation | Purpose |
|---|---|
| `@Value` | Inject property value or SpEL |
| `@ConfigurationProperties` | Bind prefix-based properties to a POJO |
| `@Profile` | Activate bean only for given profiles |
| `@PostConstruct` | Run after dependency injection |
| `@PreDestroy` | Run before bean destruction |
| `@Bean` | Declare a bean in `@Configuration` class |
| `@Scope` | Set bean scope (singleton, prototype, etc.) |
