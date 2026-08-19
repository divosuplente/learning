---
title: "Spring Security: JWT and OAuth2"
description: "Spring Security: JWT and OAuth2"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0071-spring-security-jwt-oauth2.html
---

# Spring Security: JWT and OAuth2

Session-based authentication stores state on the server: a session ID in a cookie maps to server-side session data. This works for a single server, but fails when you have multiple instances behind a load balancer, because no shared store tracks which instance holds the session. **JSON Web Tokens** solve this by carrying authentication data inside the token itself, so the server never needs to look up session state. Below: how JWT works, how Spring Security validates JWTs as an OAuth2 Resource Server, and how to configure OAuth2 Client login with external providers like Google and GitHub.

## JWT structure: header, payload, signature

A JWT is three Base64URL-encoded segments separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZGFtIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAwMDAwMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Decoded, those three segments are:

```
// Header — algorithm and token type
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload — claims about the subject
{
  "sub": "adam",
  "role": "admin",
  "iat": 1700000000
}

// Signature — HMAC-SHA256( Base64URL(header) + "." + Base64URL(payload), secret )
```

The **header** identifies the signing algorithm. The **payload** holds *claims*: key-value pairs like `sub` (subject), `iat` (issued-at), `exp` (expiration), and any custom claims your application needs. The **signature** ensures the token has not been tampered with. Anyone can decode the first two segments, but only the holder of the signing key can produce a valid signature.

JWTS are **not encrypted**. Never put secrets in the payload. The signature guarantees integrity, not confidentiality.

## Stateless authentication vs sessions

In a session-based flow, the server creates a session after login, stores it in memory (or a database, or Redis), and sends a session cookie to the browser. Every request carries the cookie; the server looks up the session. If you run three instances behind a load balancer, they must share session storage, or the user gets logged out when the balancer routes them to a different instance.

With JWT, the server issues a signed token after login. The client includes it in the `Authorization` header on every request:

```
Authorization: Bearer eyJhbGciOi...
```

The server validates the signature and reads the claims directly from the token. No session lookup. Any instance can validate the token independently, using only the signing key. This is **stateless authentication**.

Tradeoff: you cannot revoke a JWT before it expires. The server has no list of valid tokens to remove one from. Short expiration times and refresh tokens mitigate this. If you need immediate revocation, you need a token blocklist, which reintroduces server state.

## Spring Security OAuth2 Resource Server

Spring Security's **Resource Server** role validates incoming JWTs and populates the security context with the token's claims. Add the dependency:

```
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

Configure the issuer URI so Spring can fetch the authorization server's JWKS (JSON Web Key Set) and validate signatures automatically:

```
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.google.com
```

At startup, Spring fetches `https://accounts.google.com/.well-known/openid-configuration`, reads the `jwks_uri` from that document, and loads the signing keys. Every incoming `Bearer` token is validated against those keys. No local secret configuration needed; the authorization server's public keys do all the work.

## JWT decoder and validator setup

When `spring.security.oauth2.resourceserver.jwt.issuer-uri` is set, Spring Boot auto-configures a `JwtDecoder`. You can customize validation by exposing your own bean:

```
@Bean
JwtDecoder jwtDecoder() {
    NimbusJwtDecoder decoder = JwtDecoders
        .withIssuerLocation("https://accounts.google.com")
        .build();

    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator(
        JwtValidators.createDefaultWithIssuer("https://accounts.google.com"),
        new JwtTimestampValidator()
    ));

    return decoder;
}
```

`DelegatingOAuth2TokenValidator` runs multiple validators in sequence. The default validators check the `iss` (issuer) and `exp` (expiration) claims. You can add custom validators, for example checking that a specific `aud` (audience) claim is present:

```
new OAuth2TokenValidator<Jwt>() {
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Set<String> audiences = jwt.getAudience();
        if (audiences != null && audiences.contains("my-api")) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Wrong audience", null)
        );
    }
}
```

## Protected endpoints with @AuthenticationPrincipal

Once the JWT is validated, Spring Security populates the authentication object. You can access the authenticated user's claims in a controller:

```
@RestController
@RequestMapping("/api")
public class UserController {

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
            "subject", jwt.getSubject(),
            "claims", jwt.getClaims()
        );
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public String admin() {
        return "Admin area";
    }
}
```

`@AuthenticationPrincipal Jwt jwt` injects the decoded JWT. You can read any claim: `jwt.getSubject()`, `jwt.getClaimAsString("role")`, `jwt.getClaims()` for all of them. `hasAuthority()` checks granted authorities derived from the token's `scope` claim by default. To map custom claims to roles, configure a `JwtAuthenticationConverter`:

```
@Bean
JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        String role = jwt.getClaimAsString("role");
        if (role == null) return List.of();
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    });
    return converter;
}
```

## OAuth2 Client: login with external providers

The **OAuth2 Client** role lets your application redirect users to an external provider (Google, GitHub, Okta) for login. Add the dependency:

```
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

Configure the provider credentials in `application.yml`:

```
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - openid
              - profile
              - email
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
            scope:
              - read:user
              - user:email
        provider:
          google:
            issuer-uri: https://accounts.google.com
          github:
            authorization-uri: https://github.com/login/oauth/authorize
            token-uri: https://github.com/login/oauth/access_token
            user-info-uri: https://api.github.com/user
            user-name-attribute: login
```

Spring auto-generates the OAuth2 login flow: `/oauth2/authorization/google` redirects to Google, Google redirects back with an authorization code, Spring exchanges it for tokens, and the user is authenticated. You get a default login page at `/login` listing all configured providers.

To require login for all endpoints, configure the security filter chain:

```
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(Customizer.withDefaults())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

This single configuration supports two flows: browser users log in via the OAuth2 Client redirect flow (Google/GitHub login page), and API clients send `Bearer` JWTs validated by the Resource Server.

## Practical: configure a resource server to validate JWT tokens

Given an API that accepts JWTs issued by an external authorization server at `https://auth.example.com`, here is the minimal setup:

**1\. Add the dependency**

```
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

**2\. Configure the issuer**

```
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com
```

**3\. Secure the endpoints**

```
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

**4\. Use the claims in your controller**

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping
    public List<Order> list(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return orderService.findByOwner(userId);
    }
}
```

Send a request with a valid JWT:

```
curl -H "Authorization: Bearer eyJhbGciOi..." https://localhost:8080/api/orders
```

If the token is valid, `jwt.getSubject()` returns the user ID from the token's `sub` claim. If the token is expired, has the wrong issuer, or an invalid signature, Spring returns `401 Unauthorized` before your controller is reached.

**Primary sources:** [Spring Security: OAuth2 Resource Server JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html) · [JWT.io: Introduction to JSON Web Tokens](https://jwt.io/introduction) · [Spring Security: OAuth2 Client](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/index.html) · [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)

## Check your understanding

<details>
<summary>1. What does the signature in a JWT guarantee?</summary>
<p><strong>Correct answer:</strong> The token has not been modified since it was signed</p>
</details>

<details>
<summary>2. What does Spring Boot do when you set spring.security.oauth2.resourceserver.jwt.issuer-uri?</summary>
<p><strong>Correct answer:</strong> It fetches the provider's JWKS and auto-configures a JwtDecoder to validate incoming tokens</p>
</details>

<details>
<summary>3. Why is JWT authentication called "stateless"?</summary>
<p><strong>Correct answer:</strong> The server validates the token from its contents alone without looking up session state</p>
</details>

<details>
<summary>4. Which starter do you add to configure Spring Security as an OAuth2 Client that redirects users to Google for login?</summary>
<p><strong>Correct answer:</strong> spring-boot-starter-oauth2-client</p>
</details>

<details>
<summary>5. What happens when a request arrives with a JWT whose iss claim does not match the configured issuer-uri?</summary>
<p><strong>Correct answer:</strong> Spring Security rejects the token and returns 401 Unauthorized</p>
</details>
