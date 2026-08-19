---
title: "Spring Security: CSRF, CORS & Security Headers"
description: "Spring Security: CSRF, CORS & Security Headers"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0072-spring-security-csrf-cors.html
---

# Spring Security: CSRF, CORS & Security Headers

A web application involves more than your server and your users. Browsers enforce rules about who can call whom and how. **CSRF** attacks work because browsers send cookies automatically; **CORS** controls which origins a browser will let your JavaScript call; **security headers** instruct the browser to apply stricter defaults. Spring Security supports all three. This lesson covers what each mechanism does and how to configure it.

## Cross-Site Request Forgery (CSRF)

A **CSRF attack** tricks a logged-in user's browser into sending a request to your application without the user's knowledge. The browser attaches the user's session cookie automatically, so the server treats the request as legitimate.

### How the attack works

1.  Alice is logged into her bank at `bank.example`. Her browser holds a session cookie.
2.  Alice visits `evil.example`, which contains a hidden form that POSTs to `bank.example/transfer`.
3.  The browser sends the POST with Alice's session cookie. The bank cannot distinguish this request from one Alice made intentionally.
4.  Money is transferred.

The problem: cookies are sent automatically. The browser does not know whether the form submission came from the bank's own page or from a malicious site.

### CSRF tokens

The defense is a **synchronizer token**: the server generates a random token, embeds it in every form as a hidden field, and rejects any POST/PUT/DELETE that does not include the correct token. A malicious site cannot read the token because of the same-origin policy, so it cannot forge a valid request.

```
<!-- Thymeleaf auto-includes the CSRF token -->
<form method="post" th:action="@{/transfer}">
  <input type="hidden" th:name="${_csrf.parameterName}"
         th:value="${_csrf.token}" />
  <!-- or just use th:action, which adds it automatically -->
  <button type="submit">Transfer</button>
</form>
```

Spring Security generates a CSRF token per session (stored in the `HttpSession`) and validates it on every state-changing request. This is enabled by default in Spring Boot.

### When CSRF protection does not apply

CSRF is a risk for **session-based** authentication where the browser sends cookies automatically. For **stateless JWT APIs**, the client sends the token in an `Authorization` header explicitly. A malicious page cannot read or attach that header, so CSRF is not a threat. In that case, you disable it:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

Do not disable CSRF for applications that use session cookies. The convenience is not worth the vulnerability.

## Cross-Origin Resource Sharing (CORS)

The **same-origin policy** is a browser rule: JavaScript running on `https://app.example` cannot make AJAX requests to `https://api.example` unless the server at `api.example` explicitly permits it. "Origin" is the combination of scheme, host, and port.

**CORS** is the mechanism by which a server tells the browser, "I accept requests from this origin." Without the correct headers, the browser blocks the response and your JavaScript sees a network error.

### Preflight requests

For non-simple requests (anything with custom headers, non-GET/POST methods, or `Content-Type: application/json`), the browser sends an `OPTIONS` preflight before the actual request. The server must respond with headers that grant permission. If the preflight fails, the browser never sends the real request.

```
// Browser sends:
OPTIONS /api/orders HTTP/1.1
Origin: https://app.example
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization

// Server must respond:
HTTP/1.1 200
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

### Configuring CORS in Spring Security

Spring Security provides a `CorsConfigurationSource` bean. Once you define it, add `.cors(Customizer.withDefaults())` to your filter chain:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

### Key CORS settings

| Setting | What it controls | Typical value |
| --- | --- | --- |
| `allowedOrigins` | Which origins may call the API | The frontend domain(s), never `*` with credentials |
| `allowedMethods` | Which HTTP methods are permitted | `GET, POST, PUT, DELETE` |
| `allowedHeaders` | Which request headers the client may send | `Authorization, Content-Type` |
| `allowCredentials` | Whether cookies/Authorization headers are sent | `true` for session auth; can be `true` with JWT too |
| `maxAge` | How long the browser caches the preflight result (seconds) | `3600` (1 hour) |

**Rule:** When `allowCredentials` is `true`, `allowedOrigins` must list specific origins. Using `*` is rejected by the browser. This prevents any site on the internet from reading authenticated responses.

### WebMvcConfigurer alternative

For non-Security CORS (e.g. a public API with no authentication), you can configure CORS at the MVC layer instead:

```
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("Authorization", "Content-Type")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

If Spring Security is on the classpath, the MVC-level CORS config alone is not enough: Spring Security intercepts the request before it reaches MVC. You must still add `.cors()` in your `SecurityFilterChain`. Using both at the same time creates ambiguity, so pick one. Prefer the `CorsConfigurationSource` bean approach when Spring Security is in use.

## Security Headers

Spring Security adds several HTTP response headers by default that instruct the browser to protect against common attacks. These headers do not stop attacks on the server; they tell the browser to refuse dangerous behavior.

| Header | What it does | Default in Spring Security |
| --- | --- | --- |
| `Strict-Transport-Security` | Tells the browser to only use HTTPS for this domain (HSTS). Prevents SSL stripping. | Yes, 1 year, include subdomains |
| `X-Content-Type-Options` | Set to `nosniff`. Prevents the browser from guessing MIME types (MIME sniffing attacks). | Yes |
| `X-Frame-Options` | Set to `DENY`. Prevents your pages from being embedded in iframes (clickjacking). | Yes |
| `X-XSS-Protection` | Legacy XSS filter. Deprecated in modern browsers; Spring Security no longer adds it by default. | No (removed in Spring Security 6) |
| `Content-Security-Policy` | Controls which sources the browser may load scripts, styles, images from. Prevents XSS. | No (opt-in, requires policy design) |

You can customize headers through the `headers()` DSL:

```
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self' https://cdn.example.com")
            )
            .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
            .httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .maxAgeInSeconds(31536000)
            )
        );
    return http.build();
}
```

Do not disable the default headers unless you have a specific reason. The built-in defaults protect against real attacks.

## Putting it together: REST API with JWT and CORS

A common production configuration: stateless JWT authentication, CSRF disabled, CORS configured for the frontend, and default security headers.

```
@Configuration
@EnableWebSecurity
public class ApiSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Stateless JWT: no session cookie, CSRF not applicable
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // CORS for the frontend
            .cors(Customizer.withDefaults())
            // JWT authentication
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        // Security headers are still on by default
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("https://app.example.com"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

**Primary sources:** [Spring Security CSRF Reference](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html) · [Spring Security CORS Reference](https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html) · [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) · [Spring Security Headers Reference](https://docs.spring.io/spring-security/reference/features/exploits/headers.html)

## Check your understanding

<details>
<summary>1. Why does a CSRF attack work against a session-based application but not against a stateless JWT API?</summary>
<p><strong>Correct answer:</strong> Session cookies are sent automatically by the browser, while JWT tokens are sent explicitly in a header the malicious site cannot attach</p>
</details>

<details>
<summary>2. You set allowCredentials(true) and allowedOrigins("*") in your CORS configuration. What happens?</summary>
<p><strong>Correct answer:</strong> The browser rejects the CORS response; credentials with wildcard origin is not allowed</p>
</details>

<details>
<summary>3. What is a CORS preflight request?</summary>
<p><strong>Correct answer:</strong> An OPTIONS request the browser sends before a cross-origin request to check whether the server allows it</p>
</details>

<details>
<summary>4. What does the X-Frame-Options: DENY header prevent?</summary>
<p><strong>Correct answer:</strong> Clickjacking, where your page is embedded in an invisible iframe on a malicious site</p>
</details>

<details>
<summary>5. You configure CORS using WebMvcConfigurer.addCorsMappings() but Spring Security is also on the classpath. Requests still fail with CORS errors. Why?</summary>
<p><strong>Correct answer:</strong> Spring Security intercepts requests before they reach MVC; you must also add .cors() in the SecurityFilterChain</p>
</details>
