---
title: "Argo CD & GitOps"
description: "Argo CD & GitOps"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0076-argo-cd-gitops.html
---

# Argo CD & GitOps

You have Kubernetes manifests and Kustomize overlays from the previous lessons. The remaining question: how do you get those manifests onto the cluster, keep them in sync, and know when the cluster has drifted from what you declared? Argo CD does this by making **Git the single source of truth** and continuously reconciling the cluster state against it. This lesson covers the GitOps model, Argo CD's architecture, installation, application setup, sync policies, and a practical walkthrough connecting a repo with Kustomize overlays.

## GitOps Principles

GitOps is a set of operating principles, not a tool. The OpenGitOps project defines four principles:

1.  **Declarative.** The entire desired state of the system is described declaratively: Kubernetes manifests, Kustomize overlays, Helm values. No imperative scripts that mutate cluster state.
2.  **Versioned and immutable.** The desired state lives in Git. Every change produces a commit with an author, a timestamp, and a diff. Rollback is `git revert`.
3.  **Pulled automatically.** An agent running inside the cluster pulls the desired state from Git. There is no CI pipeline pushing manifests with `kubectl apply` from outside.
4.  **Continuously reconciled.** The agent compares actual cluster state against desired state on a loop. If drift is detected (someone edited a Deployment with `kubectl edit`, or a node failure changed replica counts), the agent corrects it.

The key shift: **CI builds images, GitOps delivers them.** Your CI pipeline (GitHub Actions, Jenkins) compiles the Spring Boot JAR, builds the Docker image, pushes it to a registry, and updates the image tag in Git. Argo CD sees the new commit and applies the change to the cluster. No pipeline needs `kubectl` access.

## Argo CD Architecture

Argo CD runs as a set of components inside your Kubernetes cluster:

| Component | Role |
| --- | --- |
| **Application Controller** | The reconciliation loop. Watches Git repos for changes, compares Git state against live cluster state, and detects drift. Runs as a Deployment with configurable sharding for scale. |
| **API Server** | Exposes the gRPC/REST API consumed by the web UI, the `argocd` CLI, and CI integrations. Handles auth (SSO, OIDC, local accounts) and RBAC. |
| **Repo Server** | Clones Git repositories, checks out the target revision, runs `kustomize build`, `helm template`, or other manifest generation, and returns the rendered YAML to the controller. Keeps a local cache of repos. |
| **Redis** | Caches repository and application state to reduce load on the repo server. |

Every managed workload is represented by an **Application** custom resource. The controller watches Application objects, and each Application points to a source (Git repo + path + tool) and a destination (cluster + namespace). The controller reconciles what the source declares against what the destination contains.

## Installing Argo CD

Argo CD installs into its own namespace via a manifest:

```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

This deploys all components: controller, API server, repo server, Redis, Dex (SSO), and the Application CRD. Verify the pods are running:

```
kubectl get pods -n argocd
# NAME                                   READY   STATUS
# argocd-application-controller-0        1/1     Running
# argocd-repo-server-xxxxxxxxxx-xxxxx    1/1     Running
# argocd-server-xxxxxxxxxx-xxxxx         1/1     Running
# argocd-redis-xxxxxxxxxx-xxxxx          1/1     Running
```

The API server is a ClusterIP service by default. Expose it for local access:

```
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Retrieve the initial admin password (stored as a Kubernetes secret):

```
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Log in with the CLI:

```
argocd login localhost:8080 --username admin --password <password>
```

## The Application Resource

An Argo CD Application is a Kubernetes custom resource that binds a Git source to a cluster destination. A minimal Application for a Spring Boot service deployed with Kustomize:

```
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/order-service-deploy.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: order-service
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Breakdown of the fields:

-   `source.repoURL`: the Git repository containing your manifests.
-   `source.targetRevision`: the branch, tag, or commit SHA to track. `main` means every push to main triggers a reconciliation.
-   `source.path`: the directory within the repo containing `kustomization.yaml` or Helm charts. This example uses a Kustomize overlay for production.
-   `destination.server`: the Kubernetes API server URL. `https://kubernetes.default.svc` targets the cluster Argo CD runs in. Argo CD also supports external clusters registered via `argocd cluster add`.
-   `destination.namespace`: the namespace where Argo CD creates resources. It must already exist, or you must add a `namespace.yaml` in your Kustomize base.
-   `syncPolicy`: controls how and when Argo CD applies changes automatically.

Apply it:

```
kubectl apply -f order-service-app.yaml
```

## Source Configuration: Git Repo, Path, and Tool

The `source` section supports three manifest generation tools:

### Kustomize

When `path` contains a `kustomization.yaml`, Argo CD runs `kustomize build` automatically. No additional configuration is needed:

```
source:
  repoURL: https://github.com/example/order-service-deploy.git
  targetRevision: main
  path: overlays/production
```

### Helm

When `path` contains a `Chart.yaml`, Argo CD runs `helm template`. Override values with `helm.parameters` or a separate values file:

```
source:
  repoURL: https://github.com/example/order-service-deploy.git
  targetRevision: main
  path: charts/order-service
  helm:
    valueFiles:
      - values-production.yaml
    parameters:
      - name: image.tag
        value: "1.2.0"
```

### Plain YAML

If `path` contains raw YAML files (no `kustomization.yaml`, no `Chart.yaml`), Argo CD applies them directly. Useful for simple applications with a small number of manifests.

## Sync Policies

By default, Argo CD detects drift but does not correct it; you must click "Sync" in the UI or run `argocd app sync`. Sync policies change this:

### Automated Sync

```
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

-   `automated` (no sub-fields): Argo CD applies the Git state automatically when it detects a new commit. Without `prune` or `selfHeal`, it creates and updates resources but never deletes or overrides.
-   `prune: true`: when a resource is removed from Git, Argo CD deletes it from the cluster. Without this, orphaned resources remain until you manually prune them.
-   `selfHeal: true`: when the live cluster drifts from Git (someone ran `kubectl scale` or `kubectl edit`), Argo CD corrects the cluster to match Git. This enforces the GitOps principle that Git is the only valid source of state.

### Sync Options

Fine-grained control is configured in `syncOptions`:

```
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - ServerSideApply=true
```

-   `CreateNamespace=true`: creates the destination namespace if it does not exist. Without this, the Application fails if the namespace is missing.
-   `PrunePropagationPolicy=foreground`: controls how Argo CD deletes resources that depend on the pruned resource (e.g., a Deployment's ReplicaSets and Pods). `foreground` waits for dependents; `background` deletes the parent immediately.
-   `ServerSideApply=true`: uses Kubernetes server-side apply, which handles shared ownership of fields (e.g., Argo CD owns the replica count, a HorizontalPodAutoscaler owns CPU targets). Without this, Argo CD uses client-side apply, which can conflict with controllers that modify the same resources.

## Health and Sync Status

Argo CD reports two status dimensions for every Application:

### Sync Status

Compares the manifests in Git against the live resources in the cluster:

| Status | Meaning |
| --- | --- |
| `Synced` | Live cluster matches Git exactly. |
| `OutOfSync` | Git has changes not yet applied, or the cluster has drifted from Git. |
| `Unknown` | Argo CD has not yet compared the states (e.g., during initial reconciliation). |

### Health Status

Evaluates whether the live resources are functioning correctly, independent of Git:

| Status | Meaning |
| --- | --- |
| `Healthy` | All resources are running and ready (Pods passing readiness, Deployments fully rolled out). |
| `Progressing` | Resources are transitioning (a Deployment is rolling out new Pods, a Job is running). |
| `Degraded` | A resource is in a failure state (CrashLoopBackOff, failed Job, PVC pending too long). |
| `Suspended` | A resource is paused (scaled to zero, a suspended CronJob). |
| `Missing` | A resource declared in Git does not exist in the cluster. |

An Application can be `Synced` but `Degraded` (the manifests match but Pods are crashing), or `OutOfSync` but `Healthy` (a new commit adds a ConfigMap that has not been applied yet, but existing workloads are fine). The two dimensions are independent.

Check status from the CLI:

```
argocd app get order-service

# Name:               order-service
# Project:            default
# Server:             https://kubernetes.default.svc
# Namespace:          order-service
# URL:                https://localhost:8080/applications/order-service
# Repo:               https://github.com/example/order-service-deploy.git
# Target:             main
# Path:               overlays/production
# Sync Policy:        Automated (Prune, SelfHeal)
# Sync Status:        Synced to main (a1b2c3d)
# Health Status:      Healthy
```

## Practical Example: Kustomize Overlays with Auto-Sync

Consider a Spring Boot Order Service with a deployment repo structure:

```
order-service-deploy/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    staging/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
    production/
      kustomization.yaml
      patch-replicas.yaml
      patch-resources.yaml
      hpa.yaml
```

The base `kustomization.yaml` references the image without a tag override:

```
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
images:
  - name: order-service
    newName: ghcr.io/example/order-service
```

The production overlay sets the tag and replica count:

```
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - hpa.yaml
patches:
  - path: patch-replicas.yaml
  - path: patch-resources.yaml
images:
  - name: order-service
    newName: ghcr.io/example/order-service
    newTag: "1.3.0"
```

Create the Application for production:

```
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service-prod
  namespace: argocd
  labels:
    team: platform
    env: production
spec:
  project: default
  source:
    repoURL: https://github.com/example/order-service-deploy.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: order-service-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply it:

```
kubectl apply -f order-service-prod-app.yaml
```

Now the full release flow becomes:

1.  CI builds a new Docker image: `ghcr.io/example/order-service:1.4.0`.
2.  CI clones the deploy repo, updates `newTag: "1.4.0"` in `overlays/production/kustomization.yaml`, and pushes the commit.
3.  Argo CD detects the new commit within its polling interval (default 3 minutes for HTTPS repos; webhooks make this instant).
4.  The controller runs `kustomize build` on `overlays/production`, compares the output to the live cluster, and applies the updated Deployment.
5.  Kubernetes performs a rolling update. Argo CD marks the Application as `Progressing`, then `Healthy` once the new Pods pass readiness probes.
6.  If anyone runs `kubectl scale deployment order-service --replicas=1`, Argo CD detects the drift and self-heals back to the replica count declared in Git.

No one runs `kubectl apply` manually, and no CI pipeline has cluster credentials. Git is the source of truth; Argo CD enforces it.

## Webhook Configuration

By default, Argo CD polls Git repos every 3 minutes. For faster feedback, configure a webhook so Git pushes events to Argo CD immediately on commit:

```
# In GitHub repo Settings > Webhooks
Payload URL: https://argocd.example.com/api/webhook
Content type: application/json
Events: Just the push event
```

Argo CD does not require secret configuration for GitHub webhooks; it accepts and processes push events from any source. For stricter environments, set `webhook.github.secret` in the Argo CD ConfigMap.

**Primary sources:** [Argo CD Documentation](https://argo-cd.readthedocs.io/en/stable/) · [OpenGitOps Principles](https://opengitops.dev/) · [Kubernetes Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)

## Check your understanding

<details>
<summary>1. Under GitOps principles, why is it important that an agent inside the cluster pulls desired state from Git, rather than a CI pipeline pushing manifests with kubectl apply?</summary>
<p><strong>Correct answer:</strong> Because the pull model ensures the cluster agent has continuous visibility into Git state for drift detection, and does not require granting CI systems direct cluster access</p>
</details>

<details>
<summary>2. What is the role of the Argo CD Repo Server during reconciliation?</summary>
<p><strong>Correct answer:</strong> It clones the Git repository, runs kustomize build or helm template, and returns the rendered manifests to the controller</p>
</details>

<details>
<summary>3. An Application has syncPolicy.automated.prune: true but selfHeal is not set. Someone runs kubectl scale deployment order-service --replicas=1, overriding the replica count in Git (3). What happens?</summary>
<p><strong>Correct answer:</strong> Argo CD marks the Application as OutOfSync but does not correct the replica count; selfHeal is required to override manual cluster changes</p>
</details>

<details>
<summary>4. An Application shows Sync Status: Synced and Health Status: Degraded. What does this combination mean?</summary>
<p><strong>Correct answer:</strong> The live cluster matches the manifests in Git, but the resources are failing (for example, Pods are in CrashLoopBackOff)</p>
</details>

<details>
<summary>5. Why would you set ServerSideApply=true in syncOptions for an Application that also uses a HorizontalPodAutoscaler?</summary>
<p><strong>Correct answer:</strong> Because the HPA controller writes to certain Deployment fields (like spec.replicas) that Argo CD also manages; server-side apply uses field ownership to avoid conflicts between the two controllers</p>
</details>
