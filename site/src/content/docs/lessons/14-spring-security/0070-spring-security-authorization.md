---
title: "Lesson 70: Spring Security Authorization"
description: "Lesson 70: Spring Security Authorization"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/14-spring-security/0070-spring-security-authorization.md
---

# Spring Security Authorization

Authentication answers "who are you?" Authorization answers "what are you allowed to do?" Spring Security separates the two. This lesson covers URL-based authorization rules, role and authority naming conventions, method-level security annotations, and SpEL expressions for custom access decisions.

## URL-based authorization with `authorizeHttpRequest`

Spring Security 6 introduced `authorizeHttpRequests()` (replacing the deprecated `authorizeRequests()`). It matches requests in declaration order and applies the first rule that matches:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .formLogin(Customizer.withDefaults())
            .build();
    }
}
```

`requestMatchers()` accepts Ant patterns by default. Use `MvcRequestMatchers` for Spring MVC path matching or `RegexRequestMatcher` for regex patterns. The matcher chain is order-dependent: `anyRequest()` must be last because it matches every remaining request.

Common built-in rules:

| Method | Meaning |
| --- | --- |
| `permitAll()` | Anyone, including anonymous |
| `authenticated()` | Any logged-in user |
| `hasRole("ADMIN")` | User has role ADMIN |
| `hasAuthority("document:write")` | User has a specific authority |
| `hasAnyRole("ADMIN", "EDITOR")` | User has at least one of the roles |
| `denyAll()` | Always rejects |

## Roles, authorities, and the `ROLE_` prefix

Spring Security distinguishes **roles** from **authorities** by convention, not by type. Both are strings stored in `GrantedAuthority`. The difference is the `ROLE_` prefix:

```
// These are equivalent:
.hasRole("ADMIN")         // checks for authority "ROLE_ADMIN"
.hasAuthority("ROLE_ADMIN") // checks the same thing

// This is a fine-grained authority (no ROLE_ prefix):
.hasAuthority("document:write")
```

When you call `hasRole("ADMIN")`, Spring Security prepends `ROLE_` and checks for the authority `ROLE_ADMIN`. When you call `hasAuthority("ADMIN")`, it checks for the literal string `ADMIN` with no prefix. This is a common source of bugs: granting authority `"ADMIN"` but checking with `hasRole("ADMIN")` fails because it looks for `ROLE_ADMIN`.

When configuring users in `UserDetailsService` or testing with `UserBuilder`:

```
UserBuilder users = User.withDefaultPasswordEncoder();

UserDetails admin = users
    .username("alice")
    .password("password")
    .roles("ADMIN", "EDITOR")         // stored as ROLE_ADMIN, ROLE_EDITOR
    .build();

UserDetails viewer = users
    .username("bob")
    .password("password")
    .authorities("document:read")     // stored as-is, no prefix
    .build();
```

Do not mix `.roles()` and `.authorities()` on the same `UserBuilder` call. `.roles()` calls `.authorities()` internally with the prefix added. Calling both overwrites one with the other.

## Method-level security

URL rules protect endpoints. Method security protects individual methods on any Spring bean. You can enforce authorization at the service layer regardless of which controller or endpoint calls the method.

Enable it with `@EnableMethodSecurity` on a configuration class:

```
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
}
```

`@EnableMethodSecurity` (introduced in Spring Security 5.6, default in 6.x) replaces the deprecated `@EnableGlobalMethodSecurity`. The old annotation required you to opt in per-feature (`prePostEnabled`, `securedEnabled`, `jsr250Enabled`). The new one enables `@PreAuthorize` and `@PostAuthorize` by default. To enable `@Secured` and `@RolesAllowed`, pass the flags:

```
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true)
```

### The four method security annotations

| Annotation | When evaluated | Source |
| --- | --- | --- |
| `@PreAuthorize` | Before method execution | Spring Security |
| `@PostAuthorize` | After method execution | Spring Security |
| `@Secured` | Before method execution | Spring Security (legacy) |
| `@RolesAllowed` | Before method execution | JSR-250 (jakarta.annotation) |

`@PreAuthorize` is the preferred annotation. It supports SpEL expressions for role checks, authority checks, and custom logic. `@Secured` and `@RolesAllowed` only support role lists with no expressions.

```
// Preferred: SpEL expression
@PreAuthorize("hasRole('ADMIN')")
public void deleteUser(Long id) { ... }

// Legacy: role list only
@Secured("ROLE_ADMIN")
public void deleteUser(Long id) { ... }

// JSR-250: role list only
@RolesAllowed("ADMIN")
public void deleteUser(Long id) { ... }
```

## SpEL expressions in `@PreAuthorize`

`@PreAuthorize` accepts Spring Expression Language (SpEL). Common built-in functions:

| Expression | Checks |
| --- | --- |
| `hasRole('X')` | Authority `ROLE_X` |
| `hasAuthority('X')` | Exact authority string `X` |
| `hasAnyRole('X','Y')` | Any of the roles |
| `hasAnyAuthority('X','Y')` | Any of the authorities |
| `isAuthenticated()` | Not anonymous |
| `permitAll` | Always true |
| `denyAll` | Always false |

You can reference method parameters with `#paramName` and the current authentication with `#authentication`:

```
// Only the user who owns the profile can view it
@PreAuthorize("#email == authentication.principal.username")
public UserProfile getProfile(String email) { ... }

// Or, if your UserDetails stores more fields:
@PreAuthorize("#authentication.principal.email == #email")
public UserProfile getProfile(String email) { ... }

// Combine role check with parameter check
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
public User getUser(Long userId) { ... }
```

`@PostAuthorize` runs after the method returns and can inspect the result with `returnObject`:

```
@PostAuthorize("returnObject.owner == authentication.principal.username")
public Document getDocument(Long id) {
    return documentRepository.findById(id).orElseThrow();
}
```

`@PostAuthorize` has a drawback: the method body already ran by the time the check evaluates. Any side effects (logging, auditing, cache writes) happen regardless of authorization outcome. Use `@PreAuthorize` when you can determine access from the input parameters alone.

## Putting it together: URL rules + method security

In practice, applications use both layers. URL rules provide coarse-grained access at the HTTP boundary. Method security provides fine-grained access at the business logic layer. A request must pass both checks.

```
// SecurityConfig.java — coarse URL rules
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .formLogin(Customizer.withDefaults())
            .build();
    }
}

// DocumentController.java — HTTP layer
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/{id}")
    public Document getDocument(@PathVariable Long id) {
        return documentService.findById(id);
    }

    @DeleteMapping("/{id}")
    public void deleteDocument(@PathVariable Long id) {
        documentService.deleteById(id);
    }
}

// DocumentService.java — method-level rules
@Service
public class DocumentService {

    private final DocumentRepository repo;

    public DocumentService(DocumentRepository repo) {
        this.repo = repo;
    }

    // Only the document owner or an admin can view
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public Document findById(Long id) {
        return repo.findById(id).orElseThrow();
    }

    // Only admins can delete
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteById(Long id) {
        repo.deleteById(id);
    }
}
```

The `SecurityFilterChain` blocks unauthenticated users before they reach the controller. The `@PreAuthorize` checks enforce business rules on who can access specific data. If both layers pass, the method executes. If either fails, Spring Security returns 403 Forbidden.

**Primary sources:** [Spring Security: Authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/index.html) · [Spring Security: Method Security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html) · [Spring Security: Authorize HttpRequest](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)

## Check your understanding

<details>
<summary>1. What does hasRole("ADMIN") actually check for in the user's authorities?</summary>
<p><strong>Correct answer:</strong> The authority string "ROLE_ADMIN"</p>
</details>

<details>
<summary>2. What replaces @EnableGlobalMethodSecurity in Spring Security 6?</summary>
<p><strong>Correct answer:</strong> @EnableMethodSecurity</p>
</details>

<details>
<summary>3. In a SpEL expression inside @PreAuthorize, what does #userId refer to?</summary>
<p><strong>Correct answer:</strong> A method parameter named userId</p>
</details>

<details>
<summary>4. Why should @PostAuthorize be used sparingly compared to @PreAuthorize?</summary>
<p><strong>Correct answer:</strong> The method body already executed; side effects happen even if authorization fails</p>
</details>

<details>
<summary>5. If URL-based rules allow a request through and a method-level @PreAuthorize denies it, what HTTP status does the client receive?</summary>
<p><strong>Correct answer:</strong> 403 Forbidden</p>
</details>
