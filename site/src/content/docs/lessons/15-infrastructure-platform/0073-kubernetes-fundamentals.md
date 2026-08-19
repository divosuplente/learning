---
title: "Lesson 73: Kubernetes Fundamentals: Pods, Deployments, Services, ConfigMaps"
description: "Lesson 73: Kubernetes Fundamentals: Pods, Deployments, Services, ConfigMaps"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0073-kubernetes-fundamentals.html
---

# Kubernetes Fundamentals: Pods, Deployments, Services, ConfigMaps

Spring Boot apps have run on bare metal, VMs, and Docker containers. Kubernetes adds orchestration on top: it decides *where* containers run, restarts them when they fail, and routes traffic to them. This lesson covers the five abstractions you work with daily (Pod, Deployment, Service, ConfigMap, and Secret) and walks through deploying a Spring Boot app from jar to running cluster.

## Why Kubernetes for Spring Boot

A single Spring Boot jar in a Docker container is easy. Problems start at scale:

-   A container crashes at 2 AM. Who restarts it?
-   You need three copies for traffic. Who spreads them across machines?
-   You deploy a new version. How do you swap containers without dropping requests?
-   Your app needs a database URL and an API key. Where do they live outside the image?

Kubernetes answers all four. You declare the desired state in YAML; the cluster reconciles toward it continuously.

## Pod

A **Pod** is the smallest deployable unit in Kubernetes. It wraps one or more containers that share the same network namespace (same IP, same port space) and storage volumes. A Spring Boot Pod typically holds one container running your jar.

```
# A minimal Pod (you'll almost never write this directly)
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  containers:
    - name: order-service
      image: myregistry/order-service:1.0.0
      ports:
        - containerPort: 8080
```

Pods are ephemeral. When a Pod dies, it stays dead: a replacement gets a new IP. You never rely on a Pod's IP directly; that is what Services are for.

## Deployment

A **Deployment** manages a set of replica Pods. You tell it "run 3 copies of order-service," and it creates 3 Pods, monitors them, and replaces any that fail. When you update the container image tag, the Deployment performs a *rolling update*: it replaces old Pods with new ones gradually, keeping some old ones alive until new ones pass health checks.

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

The `selector` links the Deployment to its Pods by label. The `readinessProbe` tells Kubernetes when a Pod is ready to receive traffic. During a rollout, new Pods must pass this probe before old Pods are terminated.

Rollback a broken deploy:

```
kubectl rollout undo deployment/order-service
```

## Service

Pods come and go with changing IPs. A **Service** gives them a fixed address. It selects Pods by label and load-balances traffic across them.

```
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

Three Service types matter in practice:

-   **ClusterIP** (default): reachable only inside the cluster. Other microservices call `http://order-service:80` and DNS resolves it.
-   **NodePort**: exposes the Service on a static port (30000-32767) on every cluster node. Useful for local dev or when you need a quick external endpoint.
-   **LoadBalancer**: provisions an external load balancer (cloud provider LB). The Service gets an external IP. Use this for user-facing APIs.

## ConfigMap

Spring Boot reads `application.properties` or `application.yml`. In Kubernetes, you externalize that config with a **ConfigMap**. This lets you change configuration without rebuilding the image.

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-config
data:
  SPRING_DATASOURCE_URL: "jdbc:postgresql://db:5432/orders"
  SERVER_PORT: "8080"
  LOGGING_LEVEL_ORG_SPRINGFRAMEWORK: "INFO"
```

Mount it as environment variables in the Deployment:

```
# inside spec.template.spec.containers[0]:
envFrom:
  - configMapRef:
      name: order-service-config
```

Spring Boot's relaxed binding resolves `SPRING_DATASOURCE_URL` to `spring.datasource.url`. Any property you would put in `application.properties` can live in a ConfigMap instead.

## Secret

A **Secret** works like a ConfigMap but is meant for sensitive data: database passwords, API keys, TLS certificates. Kubernetes stores Secrets base64-encoded and can restrict which Pods can read them via RBAC.

```
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secret
type: Opaque
data:
  SPRING_DATASOURCE_PASSWORD: c2VjcmV0LXBhc3N3b3Jk   # base64
```

Reference it alongside the ConfigMap:

```
envFrom:
  - configMapRef:
      name: order-service-config
  - secretRef:
      name: order-service-secret
```

Where ConfigMap holds public config (URLs, log levels, feature flags), Secret holds anything you would not commit to Git.

## kubectl Basics

`kubectl` is the CLI you use to talk to the Kubernetes API. A handful of commands covers daily work:

```
# See what is running
kubectl get pods
kubectl get deployments
kubectl get services

# Inspect a specific resource
kubectl describe pod order-service-6f8b9c4d-x2k1j

# Read application logs
kubectl logs order-service-6f8b9c4d-x2k1j
kubectl logs deployment/order-service    # aggregate across replicas

# Apply or update resources from YAML
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check rollout status and history
kubectl rollout status deployment/order-service
kubectl rollout history deployment/order-service
kubectl rollout undo deployment/order-service   # rollback
```

## Deploying a Spring Boot App End to End

The full path from source to running cluster:

1.  **Dockerfile**: package the jar into a container image.
2.  **Push** the image to a registry.
3.  **Apply** Deployment + Service (and ConfigMap/Secret) to the cluster.

Dockerfile for a Spring Boot app:

```
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/order-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and push:

```
docker build -t myregistry/order-service:1.0.0 .
docker push myregistry/order-service:1.0.0
```

Apply all resources:

```
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

Verify:

```
kubectl get pods -l app=order-service
kubectl port-forward service/order-service 8080:80
# Then curl http://localhost:8080/actuator/health
```

**Primary sources:** [Kubernetes: Concepts](https://kubernetes.io/docs/concepts/) · [Kubernetes: Learn Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/)

## Check your understanding

<details>
<summary>1. A Pod's IP address changes every time the Pod is recreated. How do other services reach it reliably?</summary>
<p><strong>Correct answer:</strong> A Service selects Pods by label and provides a stable DNS name and IP</p>
</details>

<details>
<summary>2. You update a Deployment's container image tag from :1.0.0 to :2.0.0. What happens to the running Pods?</summary>
<p><strong>Correct answer:</strong> New Pods with the updated image are created gradually; old Pods are terminated only after new ones pass readiness probes</p>
</details>

<details>
<summary>3. You need to expose a Spring Boot API to external internet traffic. Which Service type should you use?</summary>
<p><strong>Correct answer:</strong> LoadBalancer, because it provisions a cloud-managed external load balancer with a public IP</p>
</details>

<details>
<summary>4. What is the difference between a ConfigMap and a Secret in Kubernetes?</summary>
<p><strong>Correct answer:</strong> Both work the same way mechanically, but Secrets are intended for sensitive data and support RBAC access control</p>
</details>

<details>
<summary>5. You applied a broken Deployment and 0 of 3 Pods are passing their readiness probe. How do you get back to the working version?</summary>
<p><strong>Correct answer:</strong> Run kubectl rollout undo deployment/order-service to revert to the previous working revision</p>
</details>
