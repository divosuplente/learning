---
title: "Docker Fundamentals: Images, Containers, and Dockerfile Basics"
description: "Docker Fundamentals: Images, Containers, and Dockerfile Basics"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/16-docker/0077-docker-fundamentals.md
---

# Docker Fundamentals: Images, Containers, and Dockerfile Basics

Spring Boot produces a single executable JAR. Docker wraps that JAR in a lightweight, reproducible, and portable container that runs the same way on every machine. This lesson covers the three core concepts (images, containers, Dockerfiles), shows how to build and run a Spring Boot container, and explains the lifecycle you use daily.

## Images, Containers, and Layers

An **image** is a read-only template with an OS, a runtime, and your application. A **container** is a running instance of an image. Containers are isolated from each other and from the host, sharing only the kernel.

Images are built in **layers**. Each instruction in a Dockerfile creates one layer. Layers are cached and reused: if nothing changed in steps 1-4, step 5 starts from the cached layer. This makes rebuilds fast.

```
# Pull and run a base image
docker run -it eclipse-temurin:21-jre-alpine java -version
# openjdk version "21.0.2" ...
```

The `eclipse-temurin:21-jre-alpine` image is an Alpine Linux image with Adoptium's JDK 21 JRE. Alpine is ~5 MB; the JRE adds ~80 MB. This is the standard base for Java containers.

## Dockerfile Basics

A **Dockerfile** is a sequence of instructions that build an image. For a Spring Boot JAR built with Maven:

```
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/order-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Instruction breakdown:

| Instruction | Purpose |
| --- | --- |
| `FROM` | Base image. Everything else stacks on top. |
| `WORKDIR` | Sets the working directory inside the container. |
| `COPY` | Copies files from the host into the image. |
| `EXPOSE` | Documents which port the container listens on (informational, does not publish). |
| `ENTRYPOINT` | The command that runs when the container starts. |

## Build and Run

```
# Build the JAR first
./mvnw clean package -DskipTests

# Build the Docker image
docker build -t order-service:1.0.0 .

# Run the container
docker run -d -p 8080:8080 --name order-service order-service:1.0.0
```

Flags:

- `-t order-service:1.0.0` — tag the image with a name and version.
- `-d` — run in the background (detached).
- `-p 8080:8080` — map host port 8080 to container port 8080.
- `--name order-service` — give the container a readable name.

Verify it is running:

```
docker ps
# CONTAINER ID  IMAGE                  STATUS         PORTS
# a1b2c3d4e5f6  order-service:1.0.0    Up 10 seconds  0.0.0.0:8080->8080/tcp

curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

## Container Lifecycle

```
# Stop the container
docker stop order-service

# Start it again (keeps the same container)
docker start order-service

# Remove the container permanently
docker rm -f order-service

# View logs
docker logs order-service
docker logs -f order-service     # follow (tail)
```

Containers are ephemeral. When you remove a container, its filesystem is gone. Persistent data must live in **volumes** or be externalized to a database.

## Passing Configuration

Spring Boot reads `application.properties`. Inside a container, override properties with environment variables using Spring's relaxed binding (`spring.datasource.url` → `SPRING_DATASOURCE_URL`):

```
docker run -d -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/orders \
  -e SPRING_PROFILES_ACTIVE=prod \
  order-service:1.0.0
```

## Image Management

```
# List local images
docker images

# Remove an image
docker rmi order-service:1.0.0

# Tag for a registry
docker tag order-service:1.0.0 ghcr.io/example/order-service:1.0.0

# Push to a registry
docker push ghcr.io/example/order-service:1.0.0
```

**Primary sources:** [Docker: Build](https://docs.docker.com/build/) · [Docker: Run](https://docs.docker.com/engine/reference/run/) · [Docker: Dockerfile reference](https://docs.docker.com/engine/reference/builder/)

## Check your understanding

<details>
<summary>1. What is the difference between a Docker image and a Docker container?</summary>
<p><strong>Correct answer:</strong> An image is a read-only template with layers; a container is a running instance of that image with a writable layer on top</p>
</details>

<details>
<summary>2. You rebuild an image after changing only application code. Why do earlier layers (FROM, WORKDIR) rebuild instantly?</summary>
<p><strong>Correct answer:</strong> Docker caches each layer; unchanged instructions reuse the cached layer instead of rebuilding</p>
</details>

<details>
<summary>3. The Dockerfile has EXPOSE 8080, but your container is unreachable from the host. Why?</summary>
<p><strong>Correct answer:</strong> EXPOSE is informational only; you must publish the port with -p 8080:8080 on docker run</p>
</details>

<details>
<summary>4. You run a container, write data to the filesystem, then remove the container. Where is the data?</summary>
<p><strong>Correct answer:</strong> It is gone. Container filesystems are ephemeral; persistent data must use volumes or external storage</p>
</details>

<details>
<summary>5. How do you override spring.datasource.url inside a container without modifying the JAR?</summary>
<p><strong>Correct answer:</strong> Pass -e SPRING_DATASOURCE_URL=jdbc:... as an environment variable; Spring's relaxed binding maps it to the property</p>
</details>
