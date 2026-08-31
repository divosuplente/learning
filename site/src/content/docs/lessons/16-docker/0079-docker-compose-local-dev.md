---
title: "Docker Compose for Local Development"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/16-docker/0079-docker-compose-local-dev.md
---

A Spring Boot application rarely runs alone. It needs PostgreSQL, Kafka, Redis, or other infrastructure. Docker Compose defines multi-service stacks in a single YAML file and starts them with one command. This lesson covers the Compose file structure, service networking, health checks, and the common pattern of running infrastructure in Docker while the Spring Boot app runs on the host for fast reloads.

## Why Docker Compose

Without Compose, you install PostgreSQL, Kafka, and Redis on your laptop, manage versions, and keep their configs separate per project. With Compose, every developer on the team runs the same stack defined in one file checked into the repo. No local installs, no version drift.

## A Minimal Compose File

```
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ordermgmt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

- `image`: pull a pre-built image from Docker Hub.
- `environment`: set container environment variables (PostgreSQL uses these on first init).
- `ports`: `HOST:CONTAINER` — maps port 5432 on your laptop to port 5432 in the container.
- `volumes`: named volume `pgdata` persists data across `docker compose down`. Without it, the database resets every time.
- `healthcheck`: tells Docker how to check if the service is ready. Other services and your app can wait on this.

Start it:

```
docker compose up -d
```

Stop and remove containers (data survives in the named volume):

```
docker compose down
```

Remove containers AND data:

```
docker compose down -v
```

## Multi-Service Stack with Networking

Compose creates a default network. Every service joins it and can reach other services by their service name. This is how Kafka reaches ZooKeeper:

```
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ordermgmt
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    healthcheck:
      test: ["CMD-SHELL", "kafka-topics --bootstrap-server localhost:9092 --list"]
      interval: 10s
      retries: 5

volumes:
  pgdata:
```

Key networking detail: `KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181` uses the **service name** because Kafka and ZooKeeper are both inside the Docker network. But `KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092` uses `localhost` because your Spring Boot app runs **outside** Docker and connects through the published port. This is the #1 Docker Compose + Kafka gotcha.

## Depends-On and Startup Order

`depends_on` waits for the container to start, but not for the service inside it to be ready. For real readiness, add a health check and use the long-form `depends_on`:

```
services:
  kafka:
    # ... same as above ...

  order-service:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ordermgmt
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
```

With `condition: service_healthy`, Compose waits until the health check passes before starting the dependent service. Without it, your app might start before the database is accepting connections.

## App-on-Host, Infra-in-Docker

The most productive local dev pattern: run infrastructure (PostgreSQL, Kafka, Redis) in Docker Compose and the Spring Boot app on the host with `./mvnw spring-boot:run`. This gives you fast hot-reload, debugger attachment, and quick restarts without rebuilding a Docker image on every code change.

Your `application.yml` connects to `localhost`:

```
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: postgres
    password: secret
  kafka:
    bootstrap-servers: localhost:9092
```

Compose exposes the ports you need via the `ports` mapping. The host sees them on `localhost`.

If you later add the app to Compose (for integration testing or CI), switch from `localhost` to the **service name** in environment variables:

```
# When the app runs inside Compose
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ordermgmt
SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
```

## Useful Commands

```
# Start everything in the background
docker compose up -d

# Follow logs for one service
docker compose logs -f kafka

# Restart a single service (picks up image changes)
docker compose up -d --force-recreate kafka

# Check which services are running
docker compose ps

# Shell into a running container
docker compose exec postgres psql -U postgres -d ordermgmt

# Stop everything, keep data
docker compose down

# Stop everything, wipe data
docker compose down -v
```

**Primary sources:** [Docker Compose overview](https://docs.docker.com/compose/) · [Docker Compose file reference](https://docs.docker.com/compose/compose-file/) · [Compose networking](https://docs.docker.com/compose/networking/)

## Check your understanding

<details>
<summary>1. Why does KAFKA_ADVERTISED_LISTENERS use localhost while KAFKA_ZOOKEEPER_CONNECT uses the service name zookeeper?</summary>
<p><strong>Correct answer:</strong> ZooKeeper runs inside the Docker network and is reached by service name; Kafka advertises localhost because Spring Boot runs outside Docker and connects through the published port</p>
</details>

<details>
<summary>2. What is the difference between depends_on and depends_on with condition: service_healthy?</summary>
<p><strong>Correct answer:</strong> Plain depends_on waits only for the container to start; service_healthy waits until the container's health check passes, meaning the service inside is actually ready</p>
</details>

<details>
<summary>3. You run docker compose down. Where does the PostgreSQL data go?</summary>
<p><strong>Correct answer:</strong> The data survives in the named volume (pgdata). Only docker compose down -v removes the volumes</p>
</details>

<details>
<summary>4. Why is the app-on-host, infra-in-Docker pattern preferred for local development over running everything in Compose?</summary>
<p><strong>Correct answer:</strong> Running the app on the host enables hot-reload, debugger attachment, and fast restarts without rebuilding a Docker image on every code change</p>
</details>

<details>
<summary>5. Your Spring Boot app runs inside Compose and connects to postgres:5432. You move it to the host. What must change?</summary>
<p><strong>Correct answer:</strong> Change the datasource URL from postgres:5432 to localhost:5432, because the host cannot resolve Docker service names</p>
</details>
