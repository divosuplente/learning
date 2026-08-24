---
title: "Spring Security: Authentication"
description: "Spring Security: Authentication"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/14-spring-security/0069-spring-security-authentication.md
---

# Spring Security: Authentication

Every secured application answers two questions: **who are you?** and **what are you allowed to do?** The first question is authentication; the second is authorization. This lesson covers authentication: how Spring Security verifies identity, from its default auto-configuration to a custom `SecurityFilterChain` with form login, a `UserDetailsService`, and `BCryptPasswordEncoder`.

## Authentication vs. authorization

**Authentication** proves identity. You present credentials (username and password, a token, a certificate) and the system confirms you are who you claim to be.

**Authorization** decides what an authenticated user can access. It checks roles, permissions, or access control lists against the requested resource.

The two are separate concerns. A user can authenticate successfully but be unauthorized for a specific endpoint. Spring Security treats them as distinct pipeline stages: authentication runs first (in the `UsernamePasswordAuthenticationFilter`), authorization runs second (in the `FilterSecurityInterceptor`). You configure them independently.

## What Spring Boot auto-configures

Add the starter to your POM:

```
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

With zero configuration, Spring Boot does three things:

1.  Secures every endpoint with HTTP Basic authentication.
2.  Generates a random password printed to the console at startup: `Using generated security password: <uuid>`.
3.  Creates a single user named `user` with that password.

Hit any endpoint and the browser prompts for credentials. Log in as `user` with the generated password and you get access. This is useful for verifying the dependency is on the classpath, but it is not a production configuration.

To override the defaults, define your own `SecurityFilterChain` bean.

## SecurityFilterChain: replacing WebSecurityConfigurerAdapter

In Spring Security 5, you extended `WebSecurityConfigurerAdapter` and overrode `configure(HttpSecurity)`. That class was deprecated in 5.7 and removed in 6.0. The replacement is a bean of type `SecurityFilterChain`:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .permitAll()
            )
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
```

Key points:

-   The lambda DSL was introduced in Spring Security 5.2 and is the only supported style in 6.x. The old chained method style (`http.authorizeRequests().anyRequest().authenticated()`) is removed.
-   `authorizeHttpRequests` replaces `authorizeRequests` (also removed in 6.0). It uses the newer `AuthorizationManager` API.
-   Call `http.build()` at the end. Before Spring Security 6, the bean returned `void` and the filter chain was built implicitly.
-   `.formLogin()` without arguments enables Spring Security's built-in login page. `.permitAll()` on the form login allows unauthenticated users to reach the login page itself.
-   `.httpBasic(Customizer.withDefaults())` adds Basic auth alongside form login.

## Form login and HTTP Basic

**Form login** serves an HTML login page (defaults to `/login`), accepts a POST with `username` and `password` parameters, and sets a session cookie on success. It is the right choice for browser-based applications.

**HTTP Basic** sends credentials in an `Authorization: Basic <base64>` header on every request. No session state. It is simple but sends passwords on every request, so it requires HTTPS. Good for internal APIs or simple scripting.

You can enable both. A browser session uses form login; a `curl` call uses Basic auth. Spring Security picks the right mechanism based on the request.

```
// Custom login page
http.formLogin(form -> form
    .loginPage("/login")        // your controller serves this page
    .loginProcessingUrl("/auth") // POST URL Spring handles
    .defaultSuccessUrl("/dashboard", true)
    .failureUrl("/login?error")
    .permitAll()
);
```

When you set `.loginPage("/login")`, you must also add a controller mapping for `GET /login` that renders your custom form.

## UserDetailsService: loading users

Spring Security needs to look up user details during authentication. The `UserDetailsService` interface is the contract:

```
public interface UserDetailsService {
    UserDetails loadUserByUsername(String username)
        throws UsernameNotFoundException;
}
```

It returns a `UserDetails` object containing the username, password, authorities (roles/permissions), and account status flags (enabled, locked, expired).

Spring Security provides a mutable implementation: `org.springframework.security.core.userdetails.User`. You can use its builder:

```
UserDetails user = User.builder()
    .username("alice")
    .password("{bcrypt}$2a$10$...")   // encoded password
    .roles("USER")
    .build();
```

When no custom `UserDetailsService` bean exists, Spring Boot creates an in-memory one with the single `user` account and the random password you see at startup.

## PasswordEncoder: never store plain text

Passwords must be hashed before storage. Spring Security's `PasswordEncoder` contract handles this:

```
public interface PasswordEncoder {
    String encode(CharSequence rawPassword);
    boolean matches(CharSequence rawPassword, String encodedPassword);
}
```

The standard choice is `BCryptPasswordEncoder`. BCrypt is an adaptive hash: it salts the password automatically and has a configurable cost factor that slows brute-force attacks as hardware improves.

```
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

When you declare this bean, Spring Security uses it for all password verification. Without it, you get a runtime error: `There is no PasswordEncoder mapped for the id "null"`.

Spring Security also ships `DelegatingPasswordEncoder`, which prefixes stored hashes with an encoder id (`{bcrypt}`, `{argon2}`, etc.) so you can migrate between algorithms without rehashing every password. Spring Boot auto-configures `DelegatingPasswordEncoder` when you use `User.withDefaultPasswordEncoder()` in tests, but for production, declare `BCryptPasswordEncoder` explicitly.

Never store plain-text passwords. Never use MD5 or SHA-1 for password hashing; they are too fast and lack salting.

## In-memory user store

For demos and testing, you can define users in memory:

```
@Bean
public UserDetailsService userDetailsService(PasswordEncoder encoder) {
    UserDetails alice = User.builder()
        .username("alice")
        .password(encoder.encode("secret123"))
        .roles("USER")
        .build();

    UserDetails admin = User.builder()
        .username("admin")
        .password(encoder.encode("adminpass"))
        .roles("USER", "ADMIN")
        .build();

    return new InMemoryUserDetailsManager(alice, admin);
}
```

`InMemoryUserDetailsManager` implements both `UserDetailsService` and `UserDetailsManager` (for creating, updating, deleting users at runtime). Users are lost on restart. Do not use this in production.

## Database-backed UserDetailsService

For real applications, you load users from a database. Implement `UserDetailsService` yourself:

```
@Service
public class JpaUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;

    public JpaUserDetailsService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        Account account = accountRepository.findByUsername(username)
            .orElseThrow(() ->
                new UsernameNotFoundException("User not found: " + username));

        return User.builder()
            .username(account.getUsername())
            .password(account.getPassword()) // already BCrypt-hashed
            .roles(account.getRoles().toArray(new String[0]))
            .accountLocked(!account.isEnabled())
            .build();
    }
}
```

Notes on this implementation:

-   The password stored in the database is the *hashed* version. You never decode it; `BCryptPasswordEncoder.matches()` compares the raw input against the stored hash.
-   When you register a new user, you hash the password before persisting: `account.setPassword(encoder.encode(rawPassword))`.
-   Throw `UsernameNotFoundException` when the user does not exist. Spring Security translates this into a generic authentication failure to avoid leaking which usernames exist.

## Putting it together: form login with BCrypt and in-memory users

Full configuration with form login, Basic auth, and two in-memory users backed by BCrypt:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/login").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .defaultSuccessUrl("/dashboard", true)
                .permitAll()
            )
            .httpBasic(Customizer.withDefaults())
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        UserDetails user = User.builder()
            .username("alice")
            .password(encoder.encode("alice-pass"))
            .roles("USER")
            .build();

        UserDetails admin = User.builder()
            .username("admin")
            .password(encoder.encode("admin-pass"))
            .roles("USER", "ADMIN")
            .build();

        return new InMemoryUserDetailsManager(user, admin);
    }
}
```

When the application starts, you will no longer see the random password in the console. Spring Security uses your `UserDetailsService` bean instead of the auto-configured one. Navigate to any protected page, get redirected to the built-in login form, and authenticate with `alice`/`alice-pass` or `admin`/`admin-pass`.

**Primary sources:** [Spring Security Reference: Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/index.html) · [Spring Security 6 Migration Guide](https://docs.spring.io/spring-security/reference/migration/index.html) · [Username/Password Authentication](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords.html)

## Check your understanding

<details>
<summary>1. What is the difference between authentication and authorization?</summary>
<p><strong>Correct answer:</strong> Authentication proves who you are; authorization decides what you can access</p>
</details>

<details>
<summary>2. What happens when you add spring-boot-starter-security with no custom configuration?</summary>
<p><strong>Correct answer:</strong> Every endpoint requires HTTP Basic auth with a randomly generated password printed at startup</p>
</details>

<details>
<summary>3. Why was WebSecurityConfigurerAdapter removed in Spring Security 6?</summary>
<p><strong>Correct answer:</strong> It relied on method overriding and mutable state; the replacement uses a SecurityFilterChain bean with the lambda DSL</p>
</details>

<details>
<summary>4. What error do you get if you store plain-text passwords and have no PasswordEncoder bean?</summary>
<p><strong>Correct answer:</strong> There is no PasswordEncoder mapped for the id "null" at runtime when authentication is attempted</p>
</details>

<details>
<summary>5. When implementing a database-backed UserDetailsService, what should the loadUserByUsername method do when the user is not found?</summary>
<p><strong>Correct answer:</strong> Throw UsernameNotFoundException, which Spring Security translates into a generic authentication failure</p>
</details>
