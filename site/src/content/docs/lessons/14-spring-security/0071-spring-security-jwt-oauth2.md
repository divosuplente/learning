---
title: "Spring Security: JWT and OAuth2"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/14-spring-security/0071-spring-security-jwt-oauth2.md
---

Session-based authentication stores state on the server. Behind a load balancer, multiple instances need shared session storage. **JSON Web Tokens** eliminate that: the signed token carries authentication data, so any server instance validates independently without looking up session state. JWTs cannot be revoked before expiration — use short lifetimes, refresh tokens, or a token blocklist. This lesson covers JWT structure, Spring Security OAuth2 Resource Server configuration, and OAuth2 Client login with external providers.

## JWT structure

A JWT is three Base64URL-encoded segments separated by dots: `header.payload.signature`. Decoded:

```
// Header — algorithm and token type
{ "alg": "HS256", "typ": "JWT" }

// Payload — claims: sub (subject), iat (issued-at), exp (expiration), plus custom claims
{ "sub": "adam", "role": "admin", "iat": 1700000000 }

// Signature — HMAC-SHA256( Base64URL(header) + "." + Base64URL(payload), secret )
```

The **signature** ensures the token has not been tampered with — anyone can decode the header and payload, but only the signing key holder produces a valid signature.

JWTs are **not encrypted**. Never put secrets in the payload.

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

At startup, Spring fetches `https://accounts.google.com/.well-known/openid-configuration`, reads the `jwks_uri`, and loads signing keys. Every incoming `Bearer` token is validated automatically.

To add custom validation (e.g., audience checking), expose a `JwtDecoder` bean:

```
@Bean
JwtDecoder jwtDecoder() {
    NimbusJwtDecoder decoder = JwtDecoders.withIssuerLocation("https://accounts.google.com").build();
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator(
        JwtValidators.createDefaultWithIssuer("https://accounts.google.com"),
        new OAuth2TokenValidator<Jwt>() {
            @Override
            public OAuth2TokenValidatorResult validate(Jwt jwt) {
                return jwt.getAudience().contains("my-api")
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Wrong audience", null));
            }
        }
    ));
    return decoder;
}
```

Default validators check `iss` and `exp`. Chain more via `DelegatingOAuth2TokenValidator`.

## Protected endpoints with @AuthenticationPrincipal

Once validated, Spring populates the authentication object. Inject the decoded token in any controller:

```
@RestController
@RequestMapping("/api")
public class UserController {
    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("subject", jwt.getSubject(), "claims", jwt.getClaims());
    }
    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ROLE_admin')")
    public String admin() {
        return "Admin area";
    }
}
```

Read claims via `jwt.getSubject()`, `jwt.getClaimAsString("role")`, or `jwt.getClaims()`. By default `hasAuthority()` checks the `scope` claim. Map custom claims to roles:

```
@Bean
JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        String role = jwt.getClaimAsString("role");
        return role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
    });
    return converter;
}
```
## OAuth2 Client: login with external providers

The **OAuth2 Client** role redirects users to external providers (Google, GitHub, Okta) for login. Add the dependency:

```
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

Configure provider credentials:

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

This single configuration supports both flows: browser users log in via OAuth2 Client redirect (Google/GitHub), and API clients send `Bearer` JWTs validated by the Resource Server.

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
