# Backend Engineering Glossary

Terms used across this course. One-line definitions, no fluff.

## Java Core

- **record** — Immutable data carrier class with auto-generated `equals`, `hashCode`, `toString`, and accessor methods
- **compact constructor** — Canonical constructor in a record used for validation; cannot reassign fields
- **generics** — Parameterized types (`List<T>`) that enable compile-time type safety and code reuse
- **bounded type parameter** — Generic constraint (`<T extends Comparable<T>>`) limiting what types a generic accepts
- **wildcard** — `?` in generics; `? extends T` (upper-bounded), `? super T` (lower-bounded), `?` (unbounded)
- **PECS** — Producer Extends, Consumer Super: use `? extends T` when reading, `? super T` when writing
- **type erasure** — Runtime removal of generic type information; `List<String>` becomes raw `List` at runtime
- **pattern matching (switch)** — Matching a value against type patterns and destructuring in switch expressions
- **type pattern** — `String s` in a switch case: simultaneously tests type and binds a variable
- **record destructuring** — Extracting record components in a switch via `Point(int x, int y)`
- **guard clause (when)** — Additional condition on a switch case: `case String s when s.length() > 5`
- **sealed type** — Class or interface that restricts which other classes may extend it; enables exhaustive switches
- **exhaustive switch** — Compiler-enforced coverage of all possible cases, guaranteed when switching on sealed types
- **Stream API** — Declarative pipeline for collection processing: `stream().filter().map().collect()`
- **intermediate operation** — Lazy Stream operation (`filter`, `map`) that returns a new Stream
- **terminal operation** — Eager Stream operation (`collect`, `forEach`, `count`) that triggers execution
- **short-circuiting operation** — Operation (`findFirst`, `anyMatch`) that can terminate early without processing all elements
- **var keyword** — Local variable type inference; compiler infers the type from the initializer
- **switch expression** — Switch that returns a value; uses arrow labels (`->`) and must be exhaustive
- **yield** — Keyword to return a value from a switch expression block (`case X: yield value;`)
- **arrow label** — `case X ->` syntax in switch; no fall-through, returns value directly
- **checked exception** — Exception that must be declared or caught at compile time (`IOException`)
- **unchecked exception** — Runtime exception (`RuntimeException`) not enforced by the compiler
- **try-with-resources** — `try (Resource r = ...) {}` — auto-closes any `AutoCloseable` resource
- **AutoCloseable** — Interface with `close()` method; required for try-with-resources
- **suppressed exception** — Exception from `close()` that is attached to the primary exception when both occur
- **polymorphism** — Same interface, different implementations; runtime dispatch via overridden methods
- **encapsulation** — Bundling data with methods that operate on it; hiding internal state behind access control
- **enum** — Type-safe constant set with fields, constructors, and methods
- **visibility modifiers** — `public`, `protected`, package-private (default), `private` — control access scope
- **composition** — Building complex behavior by combining simpler objects ("has-a") rather than inheritance ("is-a")

## Build Tools

- **Maven** — Build automation and dependency management tool using a POM file
- **POM** — Project Object Model (`pom.xml`): declares dependencies, plugins, and build configuration
- **Spring Initializr** — Web tool (start.spring.io) for bootstrapping Spring Boot projects with chosen dependencies
- **application.yml** — Spring Boot's YAML configuration file, replaces `application.properties` for structured config
- **profiles** — Spring mechanism to activate different configurations per environment (`dev`, `prod`, `test`)
- **starter dependencies** — Curated `spring-boot-starter-*` POMs that pull in all needed transitive dependencies
- **convention over configuration** — Spring Boot's philosophy: sensible defaults work out of the box, override when needed

## Spring Core

- **IoC container** — Spring's runtime that creates, wires, and manages the lifecycle of beans
- **dependency injection (DI)** — Pattern where dependencies are provided rather than created by the dependent class
- **bean** — Object managed by the Spring IoC container
- **Application Context** — The Spring IoC container interface; provides bean lookup, event publishing, and resource loading
- **wiring** — Connecting beans together through dependency injection
- **stereotype annotations** — `@Component`, `@Service`, `@Repository`, `@Controller` — declare a class as a Spring bean
- **component scanning** — Spring auto-detects `@Component`-annotated classes in specified base packages
- **@Autowired** — Marks a dependency for automatic injection by type (prefer constructor injection instead)
- **constructor injection** — Providing dependencies via constructor parameters; recommended approach in Spring
- **setter injection** — Providing dependencies via setter methods; optional dependencies only
- **field injection** — Injecting directly on fields via `@Autowired`; discouraged — hides dependencies and prevents immutability
- **@Primary / @Qualifier** — Disambiguate between multiple beans of the same type: default vs explicit name
- **bean scope** — Singleton (default: one instance), prototype (new each request), request, session
- **@Configuration / @Bean** — Class-level and method-level annotations for declaring beans in Java config
- **circular dependency** — Two beans that depend on each other; Spring detects and throws `BeanCurrentlyInCreationException`
- **@PostConstruct / @PreDestroy** — Lifecycle callbacks: `@PostConstruct` runs after injection, `@PreDestroy` before shutdown
- **Jakarta namespace** — Jakarta EE 9+ package prefix (`jakarta.*`) replacing `javax.*` in Spring Boot 3.x

## Spring Boot Fundamentals

- **@SpringBootApplication** — Combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`
- **auto-configuration** — Spring Boot automatically configures beans based on classpath contents and properties
- **@ConditionalOnClass / @ConditionalOnMissingBean** — Conditions that determine whether a configuration applies
- **embedded server** — Tomcat (default), Jetty, or Undertow running inside the application JAR
- **@RestController** — Combines `@Controller` and `@ResponseBody`; marks a class as a REST endpoint provider
- **@RequestMapping** — Maps HTTP requests to handler methods at the class or method level
- **@GetMapping / @PostMapping / @PutMapping / @PatchMapping / @DeleteMapping** — Shorthand `@RequestMapping` for specific HTTP methods
- **@PathVariable** — Binds a URL template variable (`/orders/{id}`) to a method parameter
- **@RequestParam** — Binds a query parameter (`?page=2`) to a method parameter
- **@RequestBody** — Deserializes the HTTP request body into a Java object
- **@RequestHeader** — Binds an HTTP header value to a method parameter
- **ResponseEntity** — Full HTTP response wrapper: status code, headers, and body
- **ProblemDetail (RFC 7807)** — Standardized error response format with `type`, `title`, `status`, and `detail` fields
- **@Valid** — Triggers Jakarta Bean Validation on a method parameter or field
- **Jakarta Bean Validation** — `@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`, `@Email`, `@Pattern`, `@Positive` — declarative constraints
- **@RestControllerAdvice** — Global exception handler for all `@RestController` classes
- **@ExceptionHandler** — Method-level annotation to handle a specific exception type and return a custom response
- **MethodArgumentNotValidException** — Thrown when `@Valid` fails; carries all field-level constraint violations

## Data & Persistence

- **RDBMS** — Relational Database Management System: data in tables with rows and columns, queried via SQL
- **primary key** — Column (or columns) uniquely identifying each row; indexed automatically
- **foreign key** — Column referencing another table's primary key; enforces referential integrity
- **SQL** — Structured Query Language: SELECT, INSERT, UPDATE, DELETE, JOIN for data manipulation
- **Repository Pattern** — Mediates between domain and data mapping layers; encapsulates data access logic
- **ORM** — Object-Relational Mapping: bridges between object models and relational schemas
- **JPA (Jakarta Persistence API)** — Standard specification for ORM in Java; defines entity lifecycle and query APIs
- **Hibernate** — Most common JPA implementation; provides ORM, caching, and query translation
- **impedance mismatch** — Structural differences between object graphs and relational tables (inheritance, associations)
- **@Entity** — Marks a class as a JPA-managed persistent entity
- **@Table / @Column** — Override default table and column names generated from entity/field names
- **@Id / @GeneratedValue** — Declare the primary key field and its generation strategy (IDENTITY, SEQUENCE)
- **@ManyToOne / @OneToMany / @OneToOne / @ManyToMany** — JPA association annotations between entities
- **@JoinColumn** — Specifies the foreign key column for an association
- **mappedBy** — Declares the inverse (non-owning) side of a bidirectional association
- **owning side** — The entity that owns the foreign key column; only this side's changes persist the relationship
- **FetchType (LAZY / EAGER)** — LAZY loads associated data on first access; EAGER loads it immediately with the owner
- **cascade** — Propagates entity state transitions (PERSIST, MERGE, REMOVE) to associated entities
- **orphanRemoval** — Automatically deletes a child entity when removed from its parent's collection
- **Spring Data JPA** — Spring Data module providing repository abstractions over JPA
- **JpaRepository** — Interface providing CRUD, pagination, and sorting operations for a JPA entity
- **derived query methods** — `findByCustomerNameAndStatus` — Spring Data generates the query from the method name
- **@Query** — Declares a custom JPQL or native SQL query on a repository method
- **JPQL** — Java Persistence Query Language: entity-based query language, translated to SQL by the JPA provider
- **Pageable / PageRequest** — Interface and factory for paginated query results
- **N+1 problem** — One query for the parent plus N additional queries for each child; solved with JOIN FETCH or `@EntityGraph`
- **JOIN FETCH** — JPQL clause that eagerly loads an association in a single query, avoiding the N+1 problem
- **@EntityGraph** — Declares which associations to fetch eagerly for a specific repository method
- **@Transactional** — Defines transaction boundaries; readOnly flag optimizes for read-only operations
- **proxy-based AOP** — Spring creates CGLIB proxies around beans for `@Transactional` and other cross-cutting concerns
- **rollback rules** — `@Transactional(rollbackFor = Exception.class)` controls which exceptions trigger rollback

## Messaging & Events

- **synchronous vs asynchronous communication** — Sync: caller waits for response; async: caller sends and moves on
- **message broker** — Middleware that decouples producers from consumers via topics/queues (e.g., Kafka, RabbitMQ)
- **Apache Kafka** — Distributed event streaming platform using topics, partitions, and consumer groups
- **topic** — Named category where messages are published; the fundamental Kafka addressing unit
- **partition** — Ordered, append-only log within a topic; enables parallel consumption and ordering guarantees
- **offset** — Unique sequential ID of a record within a partition; used for consumer position tracking
- **consumer group** — Set of consumers that cooperatively read a topic; each partition assigned to one member
- **KRaft mode** — Kafka's consensus protocol replacing ZooKeeper for metadata management
- **KafkaTemplate** — Spring Kafka's producer wrapper for sending messages to topics
- **@KafkaListener** — Annotation marking a method as a Kafka consumer for a specified topic
- **key-based partitioning** — Messages with the same key go to the same partition, preserving per-key order
- **serialization / deserialization** — Converting objects to/from byte format for Kafka transport
- **JsonSerializer / JsonDeserializer** — Spring Kafka components for JSON-based message serialization
- **__TypeId__ header** — Kafka message header storing the fully-qualified class name for deserialization routing
- **trusted packages** — Security setting limiting which Java packages the JsonDeserializer will instantiate
- **poison pill** — Message that cannot be deserialized or processed, blocking the consumer
- **@RetryableTopic** — Spring Kafka annotation for automatic retry with configurable backoff and DLQ routing
- **exponential backoff** — Retry strategy with increasing delays between attempts (1s, 2s, 4s, ...)
- **dead letter queue (DLQ)** — Topic where failed messages are sent after retries are exhausted
- **delivery semantics** — At-most-once (fire and forget), at-least-once (retry until ack), exactly-once (idempotent + transactional)
- **idempotent consumer** — Consumer that safely handles duplicate messages by checking for prior processing
- **ApplicationEventPublisher** — Spring's mechanism for publishing domain events within an application
- **@EventListener** — Subscribes a method to a specific application event type
- **@TransactionalEventListener (AFTER_COMMIT)** — Event listener that fires only after the publishing transaction commits

## Architecture

- **monolithic architecture** — Single deployable unit containing all application logic
- **microservices** — Independently deployable services, each owning its data and communicating via APIs or events
- **service-oriented architecture (SOA)** — Coarse-grained services sharing infrastructure; predecessor to microservices
- **modular monolith** — Single deployment with strict module boundaries; migration path to microservices
- **layered architecture** — Separation into controller, service, repository, and database layers
- **golden rule** — A layer may only depend on the layer directly below it, never upward
- **service layer** — Encapsulates business logic and orchestrates repository calls; sits between controller and persistence
- **fat controller (anti-pattern)** — Controller containing business logic that belongs in the service layer
- **anemic domain model (anti-pattern)** — Domain entities with only data, no behavior; logic pushed to services
- **transaction manager anti-pattern** — Service that only opens/closes transactions without adding domain logic
- **god object (anti-pattern)** — Class that knows and does too much; violates single responsibility
- **DTO (Data Transfer Object)** — Object carrying data between layers, decoupling internal models from API contracts
- **request DTO / response DTO** — Separate objects for incoming and outgoing data, preventing over-exposure
- **from() factory method** — Static method on a DTO converting a domain entity into its response representation
- **MapStruct** — Compile-time code generator that maps between entity and DTO types
- **domain exception** — Exception expressing a business rule violation (e.g., `InsufficientStockException`)
- **exception hierarchy** — Structured exception tree with base domain exceptions and specific subclasses
- **application event** — Domain event published within the application to decouple side effects
- **coupling vs cohesion** — Coupling: degree of interdependence between modules; cohesion: degree of relatedness within a module

## GraphQL

- **over-fetching** — REST endpoint returning more data than the client needs
- **under-fetching** — REST endpoint requiring multiple calls to gather related data
- **GraphQL** — Query language for APIs where the client specifies exactly the data shape it needs
- **query** — GraphQL operation for reading data
- **mutation** — GraphQL operation for writing data
- **subscription** — GraphQL operation for receiving real-time updates via WebSocket
- **Schema Definition Language (SDL)** — GraphQL's type definition syntax for schemas
- **scalar types** — Built-in leaf types: `String`, `Int`, `Float`, `Boolean`, `ID`
- **object type** — Named collection of fields in a GraphQL schema
- **input type** — Special type used for mutation arguments; only fields, no resolvers
- **non-nullable (!)** — Type modifier requiring a value; `String!` means the field must not return null
- **@QueryMapping / @MutationMapping** — Spring GraphQL annotations mapping methods to query/mutation operations
- **@SchemaMapping** — Maps a method as a field resolver for a specific type
- **@Argument** — Binds a GraphQL argument to a method parameter
- **field resolver** — Function that resolves the value of a single field in a GraphQL type
- **DataLoader** — Batches and caches field resolutions to solve the N+1 problem in GraphQL
- **@BatchMapping** — Spring GraphQL annotation for batch-loading related entities
- **N+1 in GraphQL** — Sequential fetch per item; solved with DataLoader batch loading
- **partial results** — GraphQL returns data for successful fields and errors for failed ones, never all-or-nothing
- **@GraphQlExceptionHandler** — Spring GraphQL annotation for global error handling in resolvers
- **ErrorType** — Categorized GraphQL error types (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST)
- **GraphiQL** — In-browser IDE for exploring GraphQL schemas and running queries

## Reactive Programming

- **reactive programming** — Async, non-blocking paradigm where code reacts to data as it arrives
- **blocking vs non-blocking** — Blocking: thread waits for I/O; non-blocking: thread moves on, notified on completion
- **C10K problem** — Challenge of handling 10,000+ concurrent connections on a single server
- **thread-per-request** — Traditional model: one OS thread per request; fails at scale due to memory overhead
- **Reactive Streams specification** — Contract defining `Publisher`, `Subscriber`, `Subscription`, `Processor` interfaces
- **Publisher** — Source of async data; emits items to subscribers respecting demand
- **Subscriber** — Consumer of async data; receives `onNext`, `onComplete`, and `onError` signals
- **Subscription** — Control channel between Publisher and Subscriber; carries `request(n)` and `cancel()`
- **Processor** — Transformation stage acting as both Subscriber and Publisher
- **backpressure** — Mechanism where the Subscriber signals how many items it can handle (`request(n)`)
- **backpressure strategies** — Buffer (queue excess), Drop (discard), Latest (keep newest), Error (fail when overwhelmed)
- **Project Reactor** — Reactive Streams implementation powering Spring WebFlux
- **Mono** — Publisher emitting zero or one item; reactive equivalent of `Optional<T>`
- **Flux** — Publisher emitting zero to N items; can be finite or infinite
- **cold publisher** — Lazy: generates data fresh per subscriber; nothing runs until `.subscribe()`
- **hot publisher** — Eager: emits data regardless of subscribers; late arrivals miss earlier items
- **Sinks** — Reactor API for manually pushing data into a Flux from imperative code
- **nothing happens until subscribe** — Core Reactor rule: pipeline is a declaration, not execution
- **onErrorReturn** — Replaces an error with a static fallback value; stream completes normally
- **onErrorResume** — Replaces an error with a fallback Publisher; enables dynamic recovery
- **retry / retryWhen** — Re-subscribes to the source on error; `retryWhen` supports exponential backoff
- **Retry.backoff** — Reactor retry strategy with increasing delays and configurable max backoff
- **doOnError** — Side-effect operator for logging; error still propagates downstream
- **onErrorMap** — Transforms one exception type into another; used to translate infrastructure errors to domain errors
- **.share()** — Converts a cold Flux into a hot one: single execution shared by all subscribers
- **.replay()** — Hot Flux that replays the last N items to late subscribers before streaming live
- **Spring WebFlux** — Reactive web framework using Netty event loop; returns Mono/Flux from controllers
- **virtual threads** — Java 21 lightweight threads (Project Loom); make blocking I/O scale without reactive code

## R2DBC

- **R2DBC** — Reactive Relational Database Connectivity: non-blocking spec for relational database access
- **R2DBC SPI** — Service Provider Interface that database vendors implement for R2DBC drivers
- **r2dbc-pool** — Reactive connection pool for R2DBC; decouples connections from threads
- **Spring Data R2DBC** — Spring Data module providing reactive repository abstractions over R2DBC
- **ReactiveCrudRepository** — Reactive counterpart to `CrudRepository`; returns `Mono`/`Flux` from all operations

## Testing

- **testing** — Deliberate execution of code to verify it behaves as intended
- **unit test** — Tests a single method or class in isolation with mocked dependencies
- **integration test** — Tests multiple components working together (e.g., controller + service + real DB)
- **test pyramid** — Many fast unit tests at the base, fewer integration tests, very few end-to-end tests
- **TDD (Test-Driven Development)** — Write a failing test first, then the minimum code to pass, then refactor
- **red-green-refactor** — TDD cycle: red (failing test), green (make it pass), refactor (clean up)
- **JUnit 5** — Standard Java testing framework; provides `@Test`, lifecycle annotations, and test discovery
- **@Test / @BeforeEach / @AfterEach** — Core JUnit 5 annotations for test methods and setup/teardown
- **@ParameterizedTest** — Runs the same test method multiple times with different input values
- **@Nested** — Groups related test methods in an inner class for organization
- **@DisplayName** — Human-readable test name shown in reports instead of method name
- **AssertJ** — Fluent assertion library: `assertThat(result).isEqualTo(expected)`
- **mock** — Fake implementation of a dependency returning controlled values for testing
- **Mockito** — Java mocking framework for creating and stubbing mock objects
- **@Mock / @InjectMocks / @ExtendWith(MockitoExtension.class)** — Mockito annotations for creating and injecting mocks
- **when().thenReturn()** — Mockito stub syntax defining what a mock method should return
- **verify()** — Mockito method asserting a mock method was called with specific arguments
- **test slice** — Spring Boot annotation loading only one application layer for focused integration tests
- **@WebMvcTest** — Loads one controller + MVC infrastructure; all services mocked
- **@DataJpaTest** — Loads JPA entities, repositories, and an embedded test database
- **@SpringBootTest** — Loads the entire application context for full integration tests
- **@JsonTest** — Loads Jackson `ObjectMapper` only; tests serialization/deserialization
- **MockMvc** — Simulates HTTP requests against a controller without starting a real server
- **@MockBean** — Replaces a Spring bean with a Mockito mock inside the application context
- **Testcontainers** — Library providing lightweight, disposable Docker containers for integration testing
- **@Transactional test** — Test wrapped in a transaction that rolls back after execution, leaving no data

## Security

- **authentication** — Verifying identity: confirming the user is who they claim to be
- **authorization** — Determining what an authenticated user is allowed to access
- **Spring Security** — Spring's authentication and authorization framework
- **SecurityFilterChain** — Bean-based configuration replacing deprecated `WebSecurityConfigurerAdapter`
- **UserDetailsService** — Spring Security interface for loading user-specific authentication data
- **BCryptPasswordEncoder** — Password encoder using the BCrypt hashing algorithm
- **authorizeHttpRequests** — Spring Security 6 API for URL-based authorization rules
- **hasRole / hasAuthority** — Authorization checks for role or permission granted to the authenticated user
- **method security (@PreAuthorize / @PostAuthorize)** — Annotation-based authorization at the method level using SpEL
- **JWT (JSON Web Token)** — Self-contained, signed token carrying claims (sub, role, exp) for stateless authentication
- **JWT structure** — Three Base64URL segments: header (algorithm), payload (claims), signature (integrity proof)
- **stateless authentication** — Server validates the token on each request without session storage
- **OAuth2 Resource Server** — Spring Security module that validates JWTs from an external authorization server
- **OAuth2 Client** — Spring Security module for login via external providers (Google, GitHub)
- **CSRF (Cross-Site Request Forgery)** — Attack where a malicious site sends authenticated requests using the user's session cookie
- **CSRF token** — Synchronizer token that must be included in state-changing requests; unforgeable by third-party sites
- **CORS (Cross-Origin Resource Sharing)** — Browser-enforced policy controlling which origins can access your API
- **@CrossOrigin** — Spring annotation enabling CORS for specific controllers or endpoints
- **security headers** — HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`) enforced by browsers

## PostgreSQL

- **JSONB** — PostgreSQL binary JSON type that can be queried and indexed (GIN indexes)
- **CTE (Common Table Expression)** — Named subquery using `WITH`; supports recursive and writable forms
- **window function** — Aggregate computed across rows related to the current row (`ROW_NUMBER`, `RANK`, `SUM() OVER`)
- **B-tree index** — PostgreSQL's default index type; sorted balanced tree for equality and range queries
- **GIN index** — Generalized Inverted Index for composite values like JSONB and arrays
- **partial index** — Index on a subset of rows matching a `WHERE` condition; reduces size for selective queries
- **covering index** — Index including all columns needed by a query via `INCLUDE`; avoids table lookups
- **EXPLAIN / EXPLAIN ANALYZE** — Commands showing the query plan and actual execution statistics
- **query planner** — PostgreSQL component that estimates costs of execution strategies and picks the cheapest
- **sequential scan** — Reading every row in a table; used when no suitable index exists or the table is small
- **index scan** — Using an index to locate specific rows; efficient for selective queries
- **bitmap heap scan** — Using an index to collect row locations, then fetching them in physical order
- **cost-based optimization** — Planner estimates cost using table statistics, not by executing the query
- **SERIAL / IDENTITY** — PostgreSQL auto-incrementing integer column types for primary keys

## Infrastructure

- **Kubernetes** — Container orchestration platform that automates deployment, scaling, and recovery
- **Pod** — Smallest deployable unit in Kubernetes; wraps one or more containers sharing network and storage
- **Deployment** — Kubernetes resource managing Pod replicas, rollout strategy, and rollback
- **Service** — Stable network endpoint for a set of Pods; provides discovery and load balancing
- **ConfigMap** — Kubernetes resource for injecting non-sensitive configuration into containers
- **Secret** — Kubernetes resource for injecting sensitive data (passwords, API keys) into containers
- **Ingress** — Kubernetes HTTP routing rule exposing services to external traffic with host/path matching
- **Terraform** — Infrastructure-as-Code tool using declarative HCL files to provision cloud resources
- **HCL** — HashiCorp Configuration Language: declarative syntax for Terraform resource definitions
- **provider** — Terraform plugin translating HCL resources into API calls for a specific cloud (AWS, GCP, Azure)
- **state file** — Terraform mapping between declared resources and real cloud objects; enables drift detection
- **terraform plan / apply** — `plan` previews changes; `apply` executes them against the cloud provider
- **Kustomize** — Kubernetes manifest management tool using base + overlay patches, no templating
- **base / overlay** — Kustomize pattern: base contains shared YAML, overlays contain environment-specific patches
- **Argo CD** — GitOps controller running in-cluster; continuously reconciles Kubernetes state with Git
- **GitOps** — Operating model where Git is the single source of truth for desired infrastructure state
- **Application (Argo CD)** — Custom resource mapping a Git source to a cluster destination; Argo CD's unit of management
- **sync policy** — Argo CD setting controlling whether syncs are manual or automatic, with optional self-heal
