---
title: "Kustomize: Managing Kubernetes Environments"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/15-infrastructure-platform/0075-kustomize-environments.md
---

Every Spring Boot service you deploy to Kubernetes needs different settings per environment: fewer replicas in dev, more in prod; a `latest` tag in dev but a pinned SHA in prod; smaller resource limits locally, larger ones under load. Maintaining separate YAML files for each environment leads to drift and copy-paste errors. Kustomize solves this by layering environment-specific patches on top of a shared base, with no templating engine required.

## The Problem with Raw YAML

A typical Spring Boot deployment starts with a single `deployment.yaml`. The moment you need dev, staging, and prod variants, you face three bad options:

-   **Copy the whole file** per environment. Changes to the base must be replicated three times. You will forget one.
-   **Sed/substitute at deploy time**. Shell scripts that replace values are fragile, hard to audit, and invisible in git history.
-   **Parameterize with Helm**. This works, but brings a templating engine and a dependency you may not need just to vary two fields.

Kustomize takes a different approach: declare what makes each environment different as a **patch** over the same base resources. No templates, no variables, no rendering step beyond `kubectl kustomize`.

## How Kustomize Works

Kustomize organizes Kubernetes manifests into a **base** (shared resources) and **overlays** (environment-specific modifications). The base contains real, valid Kubernetes YAML. Overlays contain only what changes. At build time, Kustomize merges overlays onto the base and emits complete YAML you can pipe directly to `kubectl apply`.

Directory layout:

```
k8s/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
  overlays/
    dev/
      kustomization.yaml
      patch-replicas.yaml
    staging/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
    prod/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
      patch-image.yaml
```

Every directory has a `kustomization.yaml`. That file tells Kustomize what resources to include and what transformations to apply.

## kustomization.yaml: The Core File

The `kustomization.yaml` in a base directory lists the resources and any cross-cutting transformations:

```
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

namePrefix: orderservice-          # every resource name gets this prefix
commonLabels:
  app.kubernetes.io/part-of: order-service   # added to every resource

configMapGenerator:
  - name: app-config
    literals:
      - SPRING_PROFILES_ACTIVE=default
      - LOGGING_LEVEL_ROOT=INFO

secretGenerator:
  - name: db-credentials
    literals:
      - SPRING_DATASOURCE_PASSWORD=changeme
```

### Key directives

-   **`resources`**: the Kubernetes YAML files to include. These are standard, valid manifests.
-   **`namePrefix`**: prepended to every resource name. Useful when multiple services share a cluster and you need to avoid name collisions.
-   **`commonLabels`**: labels added to every resource and selector. Replaces manual label editing.
-   **`configMapGenerator`**: creates a ConfigMap from literals, files, or env files. The generated name includes a hash suffix, so changes to the data trigger a rolling update because the pod template reference changes.
-   **`secretGenerator`**: same as configMapGenerator but for Secrets. The hash suffix ensures rotated credentials trigger redeployment.

**Hash suffixes matter.** When `configMapGenerator` or `secretGenerator` produces a ConfigMap named `app-config-7b8c9d2f`, the hash changes when the data changes. If your Deployment references this ConfigMap as a volume or env source, the new hash causes the Deployment's pod template to change, which triggers a rolling update. This is Kustomize's built-in answer to "how do I restart pods when config changes?"

## Overlays: Environment-Specific Patches

An overlay references a base and applies patches. The `kustomization.yaml` in an overlay looks like this:

```
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - path: patch-replicas.yaml
```

The `resources` field pulls in the base. The `patches` field lists files that modify specific fields of the base resources.

### Strategic merge patch

A strategic merge patch is a partial Kubernetes manifest. You include only the fields you want to change, plus enough metadata for Kustomize to identify which resource to patch:

```
# overlays/dev/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orderservice-app   # must match the base Deployment name (after namePrefix)
spec:
  replicas: 1
```

Only the `replicas` field is overwritten. The rest of the base deployment passes through unchanged.

### Image patch

For most Kubernetes resources, Kustomize uses strategic merge patches:

```
# overlays/prod/patch-image.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orderservice-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/order-service:v2.3.1-sha.a9b3c7
```

This replaces the container image for prod while leaving the dev overlay on the default tag from the base.

## A Full Working Example

Start with a base deployment for a Spring Boot service:

```
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: app
          image: registry.example.com/order-service:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: default
```

Dev overlay: single replica, dev profile, lower resource limits:

```
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namePrefix: dev-

commonLabels:
  environment: dev

patches:
  - path: patch-replicas.yaml
  - path: patch-resources.yaml

configMapGenerator:
  - name: app-config
    behavior: replace
    literals:
      - SPRING_PROFILES_ACTIVE=dev
```

```
# overlays/dev/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-app
spec:
  replicas: 1
```

```
# overlays/dev/patch-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-app
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
```

Prod overlay: five replicas, pinned image tag, higher resource limits:

```
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namePrefix: prod-

commonLabels:
  environment: prod

patches:
  - path: patch-replicas.yaml
  - path: patch-image.yaml
  - path: patch-resources.yaml

configMapGenerator:
  - name: app-config
    behavior: replace
    literals:
      - SPRING_PROFILES_ACTIVE=prod
```

```
# overlays/prod/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-app
spec:
  replicas: 5
```

```
# overlays/prod/patch-image.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/order-service:v2.3.1
```

```
# overlays/prod/patch-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-app
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

## Building and Applying

Kustomize has been built into `kubectl` since version 1.14. No separate installation required.

Preview the rendered YAML for dev:

```
kubectl kustomize overlays/dev/
```

Apply it directly:

```
kubectl apply -k overlays/dev/
```

Same for prod:

```
kubectl apply -k overlays/prod/
```

The `-k` flag tells kubectl to read the `kustomization.yaml` in the given directory, build the resources, and apply the result. You can also use `kubectl kustomize .` inside an overlay directory to print the final YAML to stdout for inspection or piping.

**GitOps tip:** If you use Argo CD (covered in the next lesson), point the application source at an overlay directory. Argo CD runs `kubectl kustomize` internally and applies the result. The overlay directory in git becomes your source of truth for what is deployed.

## Kustomize vs Helm

Both tools manage Kubernetes manifests, but they take different approaches:

| Aspect | Kustomize | Helm |
| --- | --- | --- |
| Core mechanism | Patch layering over plain YAML | Go templating over YAML skeletons |
| Learning curve | Low: Kubernetes YAML plus patch syntax | Higher: template language, values files, chart structure |
| Input validity | Base files are valid Kubernetes YAML | Templates are not valid YAML until rendered |
| Diff visibility | Overlay patches show exactly what changes | Values files drive generation; diff requires `helm template` |
| Toolchain dependency | None: built into kubectl | Requires Helm CLI installed |
| Best fit | Same app, multiple environments, small per-env diffs | Packaging and distributing reusable charts with many configurable options |

Use Kustomize when you own the manifests and the main problem is environment variation. Use Helm when you need to package a chart for external consumers who configure it via `values.yaml`. They can be combined: Kustomize can consume a Helm chart as a resource via `helmChart` or `helmCharts`, then patch the output.

## Common Pitfalls

-   **Name mismatches in patches.** The `metadata.name` in your patch must match the resource name *after* Kustomize transforms it (including `namePrefix`). A patch targeting `app` when the base has `namePrefix: dev-` will not match `dev-app`.
-   **Patching the wrong level.** To change a container field, you must patch `spec.template.spec.containers`, not `spec.containers`. The Deployment's own spec does not have containers directly.
-   **Overlapping patches.** Two patches modifying the same array field (like `containers`) can conflict. Use `strategicMergePatch` for known K8s fields or fall back to JSON 6902 merge for explicit array indexing.
-   **Forgetting to reference ConfigMaps by generated name.** If your Deployment mounts a ConfigMap created by `configMapGenerator`, the reference must include the hash suffix. Kustomize updates these references automatically only if you use the `configMapGenerator` name without the suffix in your Deployment; Kustomize rewrites it at build time.

**Primary sources:** [Kustomize Documentation](https://kustomize.io/) · [Kubernetes: Declarative Management with Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/) · [kubectl kustomize Reference](https://kubectl.docs.kubernetes.io/references/kustomize/) · [Strategic Merge Patch](https://kubectl.docs.kubernetes.io/references/kustomize/glossary/strategic-merge-patch/)

## Check your understanding

<details>
<summary>1. You have three environments (dev, staging, prod) that differ only in replica count and image tag. What is the most Kustomize-native way to manage this?</summary>
<p><strong>Correct answer:</strong> Keep one base deployment YAML and write small patches in each overlay that change only replicas and image</p>
</details>

<details>
<summary>2. In a kustomization.yaml, what does configMapGenerator do that simply listing a ConfigMap YAML in resources does not?</summary>
<p><strong>Correct answer:</strong> It appends a hash suffix to the ConfigMap name so that data changes trigger pod restarts</p>
</details>

<details>
<summary>3. Your base uses namePrefix: dev- and your Deployment is named app in the base YAML. Your patch file must target which metadata name?</summary>
<p><strong>Correct answer:</strong> dev-app (the name after Kustomize applies the prefix)</p>
</details>

<details>
<summary>4. Which command builds and applies the prod overlay in a single step?</summary>
<p><strong>Correct answer:</strong> kubectl apply -k overlays/prod/</p>
</details>

<details>
<summary>5. When is Helm a better choice than Kustomize?</summary>
<p><strong>Correct answer:</strong> When you are packaging a reusable chart for external consumers who configure it via values files</p>
</details>
