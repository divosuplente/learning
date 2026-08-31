---
title: "Multi-Stage Builds for Java/Spring Boot"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/16-docker/0078-docker-multi-stage-builds.md
---

The single-stage Dockerfile from the previous lesson works, but the image includes only the JAR — the Maven build runs on your host machine first. Multi-stage builds move the entire build into Docker, produce dramatically smaller images by splitting build dependencies from runtime, and exploit Docker layer caching for fast rebuilds. This lesson shows the production-ready pattern for Spring Boot.

## The Problem with Single-Stage

Building on the host means every developer needs Maven, the right JDK, and the same version. If you add a `FROM maven:21` stage and copy everything, the final image includes the full JDK, Maven's local repository, and source code — hundreds of megabytes of build tooling that never runs in production.

## Multi-Stage Build

A multi-stage Dockerfile has named stages. Only the final stage becomes the image:

```
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/target/order-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

The `AS build` names the first stage. `COPY --from=build` pulls only the JAR from that stage. The final image contains Alpine + JRE + JAR (~100 MB) instead of Alpine + JDK + Maven + source + JAR (~500 MB).

## Layer Caching with Mount

The `--mount=type=cache` directive persists the Maven local repository across builds. Without it, every `docker build` re-downloads every dependency:

```
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B package -DskipTests
```

The cache mount survives between builds on the same machine. Changing `src/` re-runs the Maven package step, but dependencies are already cached. Changing only `pom.xml` invalidates the dependency cache and re-downloads.

## Exploded JAR Layer Optimization

Spring Boot fat JARs bundle all dependencies inside a single file. Docker sees the JAR as one layer: any change to application code re-uploads the entire layer, including unchanged dependencies. The fix is to **explode the JAR** and copy dependency and application layers separately:

```
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B package -DskipTests

# Stage 2: Extract layers
FROM eclipse-temurin:21-jdk-alpine AS extract
WORKDIR /workspace
COPY --from=build /workspace/target/order-service-1.0.0.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Stage 3: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=extract /workspace/dependencies/ ./
COPY --from=extract /workspace/spring-boot-loader/ ./
COPY --from=extract /workspace/snapshot-dependencies/ ./
COPY --from=extract /workspace/application/ ./
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Spring Boot's layertools mode splits the JAR into four directories, ordered by change frequency: dependencies (rarely change), then spring-boot-loader, then snapshot-dependencies, then application (changes every build). Docker caches each as a separate layer. Rebuilding after a code change only re-pushes the tiny application layer.

## Choosing a Base Image

| Base | Size | When to Use |
| --- | --- | --- |
| `eclipse-temurin:21-jre-alpine` | ~85 MB | Production. JRE only, Alpine Linux. Most Spring Boot apps. |
| `eclipse-temurin:21-jdk-alpine` | ~170 MB | Build stage only. JDK needed for compilation. |
| `eclipse-temurin:21-jre` | ~220 MB | When you need glibc (native libraries, some JDBC drivers). |

Alpine uses musl libc instead of glibc. Most Java apps work fine. If a library requires glibc (some PostgreSQL drivers with native code, Apache Arrow), use the non-Alpine JRE image.

## Build and Verify

```
# Build with the multi-stage Dockerfile
docker build -t order-service:1.0.0 .

# Check image size
docker images order-service:1.0.0
# REPOSITORY      TAG       SIZE
# order-service   1.0.0     ~100MB

# Run and test
docker run -d -p 8080:8080 --name order-service order-service:1.0.0
curl http://localhost:8080/actuator/health
```

**Primary sources:** [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) · [Docker: Build cache](https://docs.docker.com/build/cache/) · [Spring Boot: Efficient Docker Images](https://spring.io/guides/topicals/spring-boot-docker/)

## Check your understanding

<details>
<summary>1. Why is the Maven cache mount (--mount=type=cache) important in a multi-stage build?</summary>
<p><strong>Correct answer:</strong> It persists the .m2 repository across builds so dependencies are not re-downloaded every time; without it, each build downloads the full dependency tree</p>
</details>

<details>
<summary>2. A single-stage build copies a 50 MB fat JAR. An exploded multi-stage build copies the same 50 MB in four layers. Why is the exploded version faster to rebuild and push?</summary>
<p><strong>Correct answer:</strong> Docker caches each layer independently; changing application code only invalidates the application layer, while the large dependency layers are reused from cache</p>
</details>

<details>
<summary>3. You use Alpine-based images but a JDBC driver fails with a musl libc error. What should you change?</summary>
<p><strong>Correct answer:</strong> Switch from eclipse-temurin:21-jre-alpine to eclipse-temurin:21-jre (the glibc-based image)</p>
</details>

<details>
<summary>4. In the three-stage Dockerfile (build → extract → run), what does the second stage produce?</summary>
<p><strong>Correct answer:</strong> It runs java -Djarmode=layertools -jar app.jar extract to split the fat JAR into separate directories for dependencies, loader, snapshots, and application</p>
</details>

<details>
<summary>5. What is the practical size difference between a JDK and JRE Alpine image, and why does it matter for production?</summary>
<p><strong>Correct answer:</strong> JDK-Alpine is ~170 MB vs JRE-Alpine at ~85 MB; production images should use the JRE because the compiler and development tools in the JDK are never needed at runtime and increase the attack surface</p>
</details>
