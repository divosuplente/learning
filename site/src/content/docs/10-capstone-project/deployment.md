---
title: "Module 10: Deployment"
description: "Deployment"
---

## 25. Step-by-Step Guide to Run the Application

1. **Create the project** (or clone the repo).

2. **Start PostgreSQL and Kafka**:

```bash
docker compose up -d
```

3. **Verify connectivity**:

```bash
docker exec -it oms-postgres psql -U postgres -c "SELECT 1;"
```

4. **Build and run the application**:

```bash
./mvnw clean package
java -jar target/ordermgmt-1.0.0.jar
```

   The REST API is at `http://localhost:8080/api/orders` and
   GraphQL at `http://localhost:8080/graphql`.
   GraphiQL UI at `http://localhost:8080/graphiql`.

5. **Run the test suite**:

```bash
./mvnw test
```

6. **Explore the API** — see the curl commands and GraphQL queries below.

---

## 26. Example Curl Commands (REST)

```bash

## 29. Docker Production Best Practices

### Multi-Stage Build

```dockerfile

## 30. Observability and Monitoring

### Structured JSON Logging

```java
// In application.yml — use Logback's JSON encoder
