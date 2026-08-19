---
title: "Terraform Infrastructure as Code"
description: "Terraform Infrastructure as Code"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0074-terraform-infrastructure.html
---

# Terraform Infrastructure as Code

Every Spring Boot service you deploy needs compute, networking, and a database. Clicking through the AWS Console to create a VPC, subnet, and RDS instance works for a demo. It fails for production: no audit trail, no repeatability, no way to reproduce the same setup across staging and production. Terraform lets you write infrastructure as declarative code that you version, review, and apply like any other source file.

## Why Terraform, Not the Cloud Console

Manual infrastructure creates concrete problems:

-   **Drift:** someone changes a security group in the console. Two weeks later, nobody remembers why. The running state no longer matches any documented configuration.
-   **Non-reproducible:** you built a VPC in us-east-1 last month. Now you need the same one in eu-west-1. You cannot replay console clicks.
-   **No review:** console changes bypass pull requests. A misconfigured CIDR block opens a private subnet to the internet, and nobody catches it before it ships.
-   **No rollback:** something broke. You undo by clicking, hoping you remember the previous values. You will not.

Terraform turns all of this into code you commit, review, and apply through a predictable workflow. The state file tracks what exists. The plan shows what will change before anything reaches the cloud.

## Terraform Architecture

Terraform has four core concepts:

| Concept | Role |
| --- | --- |
| **HCL configuration** | Declarative files (`.tf`) describing desired infrastructure state |
| **Providers** | Plugins that translate HCL resources into API calls (AWS, GCP, Azure, etc.) |
| **Resources** | Individual infrastructure objects: a VPC, a subnet, an RDS instance |
| **State file** | Mapping between your declared resources and real cloud objects; enables drift detection and incremental updates |

HCL is declarative: you write *what* you want, not *how* to create it. Terraform works out the API calls. If you change a CIDR block, Terraform updates only that resource. If you remove a resource block, Terraform destroys the corresponding cloud object.

## Writing Your First `main.tf`

Create a directory for your infrastructure and open `main.tf`:

```
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC — isolated network for the application
resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "app-vpc"
  }
}

# Public subnet — for load balancers and bastion hosts
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.app.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "app-public-subnet"
  }
}

# Private subnet — for RDS and application instances
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "app-private-subnet"
  }
}

# Security group for PostgreSQL — allow inbound from VPC only
resource "aws_security_group" "rds" {
  name        = "rds-postgres-sg"
  description = "Allow PostgreSQL access from VPC"
  vpc_id      = aws_vpc.app.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.app.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "postgres" {
  identifier           = "app-postgres"
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_type         = "gp3"
  db_name              = "appdb"
  username             = "dbadmin"
  password             = "changeme-in-prod"   // use variables for real deployments
  skip_final_snapshot  = true                 // for dev only; set false in production

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.app.name
}

# DB subnet group — RDS requires at least two subnets in different AZs
resource "aws_db_subnet_group" "app" {
  name       = "app-db-subnet-group"
  subnet_ids = [aws_subnet.private.id, aws_subnet.private_b.id]

  tags = {
    Name = "app-db-subnet-group"
  }
}

# Second private subnet in a different AZ (RDS requirement)
resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "app-private-subnet-b"
  }
}
```

Key patterns:

-   **Implicit dependencies:** `aws_db_instance.postgres` references `aws_security_group.rds.id` and `aws_db_subnet_group.app.name`. Terraform infers the dependency order and creates the security group and subnet group before the instance.
-   **Reference syntax:** `aws_vpc.app.id` means "the `id` attribute of the `aws_vpc` resource named `app`." Terraform resolves these at plan time.
-   **Tags:** every resource gets a `Name` tag. This is how you find things in the console later.

## The Terraform Workflow

Four commands cover the entire lifecycle:

```
# 1. Initialize — download providers and modules
terraform init

# 2. Plan — show what will change without applying anything
terraform plan

# 3. Apply — create or update real infrastructure
terraform apply        # prompts for confirmation
terraform apply -auto-approve   # skip confirmation (CI/CD)

# 4. Destroy — tear everything down
terraform destroy      # prompts for confirmation
```

`terraform init` reads the `required_providers` block, downloads the AWS provider plugin, and sets up the backend for state storage. Run it once per working directory, and again after changing providers or backend config.

`terraform plan` compares your HCL files against the state file and produces a diff: resources to create, change, or destroy. Always read the plan before applying. A plan that says "1 to destroy" when you expected zero forces you to find the bug before it reaches production.

`terraform apply` executes the plan. It creates real cloud resources. On success, Terraform writes the current state to `terraform.tfstate`.

`terraform destroy` removes every resource tracked in state. Use it in dev. Be careful in production.

## Variables and Outputs

Hardcoding region and database passwords in `main.tf` works for a tutorial. It does not work for real deployments. Terraform variables let you parameterize configs; outputs expose values that other configurations or CI pipelines need.

Create `variables.tf`:

```
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "db_username" {
  description = "Master username for RDS PostgreSQL"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true   // hides value from plan output
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}
```

Update `main.tf` to use them:

```
provider "aws" {
  region = var.aws_region
}

resource "aws_db_instance" "postgres" {
  instance_class = var.db_instance_class
  username       = var.db_username
  password       = var.db_password
  # ... other arguments unchanged
}
```

Provide values at apply time:

```
# Via command-line flags
terraform apply -var="db_password=MyS3cret!99" -var="aws_region=eu-west-1"

# Via environment variables (TF_VAR_ prefix)
export TF_VAR_db_password="MyS3cret!99"
terraform apply

# Via a terraform.tfvars file
# db_password = "MyS3cret!99"
# aws_region  = "eu-west-1"
```

Create `outputs.tf`:

```
output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "vpc_id" {
  description = "ID of the application VPC"
  value       = aws_vpc.app.id
}
```

After `terraform apply`, the outputs print to the terminal. Your Spring Boot `application.yml` can reference the RDS endpoint directly:

```
spring:
  datasource:
    url: jdbc:postgresql://${RDS_ENDPOINT}:5432/appdb
```

## State Management

By default, Terraform stores state in a local file called `terraform.tfstate`. This file is the source of truth: it maps every `resource` block to a real cloud object by its ID. Lose the state file and Terraform thinks nothing exists. It will try to create everything again, producing duplicate resources.

**Problems with local state:**

-   Not shared between team members. Two people running `apply` simultaneously will corrupt state.
-   Not backed up. A deleted `.tfstate` is a production incident.
-   No locking. Concurrent applies can conflict.

**Remote state with S3 and DynamoDB** solves all three:

```
terraform {
  backend "s3" {
    bucket         = "my-tf-state-bucket"
    key            = "app-infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-lock"
    encrypt        = true
  }
}
```

How it works:

-   **S3 bucket** stores the state file. The `key` is the object path within the bucket. Different projects use different keys.
-   **DynamoDB table** provides distributed locking. When one person runs `terraform apply`, Terraform writes a lock entry. Another person running `apply` at the same time gets an error instead of corrupting state.
-   **encrypt = true** enables S3 server-side encryption. State contains resource IDs and output values, some of which may be sensitive.

Before using the S3 backend, the bucket and DynamoDB table must exist. Bootstrap them once with local state:

```
# One-time bootstrap (can also be done via console)
resource "aws_s3_bucket" "tf_state" {
  bucket = "my-tf-state-bucket"
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = "tf-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Apply once with local state, then migrate: `terraform init -backend-config="bucket=my-tf-state-bucket"`. Terraform copies the local state to S3 and switches the backend.

## Terraform Modules

A module is a directory of Terraform files. The root directory where you run `terraform apply` is the *root module*. Any directory you reference from it is a *child module*. Modules let you package and reuse infrastructure patterns.

Suppose every service in your organization needs a VPC, subnets, and an RDS instance. Instead of copying 80 lines of HCL per service, extract a module:

```
# modules/postgres-vpc/main.tf

variable "vpc_cidr"   { type = string }
variable "db_name"    { type = string }
variable "db_username" { type = string }
variable "db_password" { type = string }
variable "db_instance_class" { type = string }
variable "aws_region" { type = string }
variable "environment" { type = string }

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.environment}-vpc" }
}

# ... subnets, security group, subnet group, RDS instance ...

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "vpc_id" {
  value = aws_vpc.this.id
}
```

Use the module from the root module:

```
# environments/staging/main.tf

module "staging_db" {
  source            = "../../modules/postgres-vpc"
  vpc_cidr          = "10.1.0.0/16"
  db_name           = "stagingdb"
  db_username       = "dbadmin"
  db_password       = var.db_password
  db_instance_class = "db.t3.micro"
  aws_region        = "us-east-1"
  environment       = "staging"
}

# environments/production/main.tf

module "prod_db" {
  source            = "../../modules/postgres-vpc"
  vpc_cidr          = "10.0.0.0/16"
  db_name           = "proddb"
  db_username       = "dbadmin"
  db_password       = var.db_password
  db_instance_class = "db.r6g.large"
  aws_region        = "us-east-1"
  environment       = "production"
}
```

Staging and production use the same module with different variable values. A fix to the module fixes both environments. No copy-paste drift.

## Practical Example: Provision RDS PostgreSQL with Terraform

Here is the complete file layout for a Spring Boot project's database infrastructure:

```
infra/
  main.tf           # provider config and module call
  variables.tf      # input variables
  outputs.tf        # values exposed after apply
  terraform.tfvars  # environment-specific values (gitignored)
```

`main.tf`:

```
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-tf-state-bucket"
    key            = "springboot-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "database" {
  source            = "../../modules/postgres-vpc"
  vpc_cidr          = var.vpc_cidr
  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  db_instance_class = var.db_instance_class
  aws_region        = var.aws_region
  environment       = var.environment
}
```

`outputs.tf`:

```
output "rds_endpoint" {
  description = "JDBC connection hostname"
  value       = module.database.rds_endpoint
}

output "vpc_id" {
  description = "Application VPC ID"
  value       = module.database.vpc_id
}
```

Deploy it:

```
cd infra
terraform init          # downloads provider, configures S3 backend
terraform plan          # shows 5 resources to create: VPC, 3 subnets, security group, RDS
terraform apply         # creates everything (~10 minutes for RDS provisioning)

# Use the output in your Spring Boot container
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
java -jar app.jar
```

When you need to upgrade the database engine version, change `engine_version` in the module and run `terraform plan`. The plan shows "1 to change." Review it. Apply it.

**Primary sources:** [Terraform Language Documentation](https://developer.hashicorp.com/terraform/language) · [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) · [Terraform Variables](https://developer.hashicorp.com/terraform/language/values/variables) · [Terraform Modules](https://developer.hashicorp.com/terraform/language/modules) · [S3 Backend](https://developer.hashicorp.com/terraform/language/backend/s3)

## Check your understanding

<details>
<summary>1. What is the primary purpose of the Terraform state file?</summary>
<p><strong>Correct answer:</strong> It maps declared resources to real cloud objects, enabling drift detection and incremental updates</p>
</details>

<details>
<summary>2. You run terraform plan and it outputs "1 to destroy." What should you do next?</summary>
<p><strong>Correct answer:</strong> Review the plan details to understand which resource will be destroyed and why before proceeding</p>
</details>

<details>
<summary>3. Why does the S3 backend configuration include a DynamoDB table?</summary>
<p><strong>Correct answer:</strong> DynamoDB provides distributed locking to prevent concurrent state corruption when multiple team members run apply simultaneously</p>
</details>

<details>
<summary>4. When you reference aws_vpc.app.id inside an aws_subnet resource block, what does Terraform do?</summary>
<p><strong>Correct answer:</strong> It infers a dependency: the VPC must be created before the subnet, and the subnet's vpc_id is set to the VPC's actual ID</p>
</details>

<details>
<summary>5. What happens if you delete the local terraform.tfstate file and then run terraform apply?</summary>
<p><strong>Correct answer:</strong> Terraform treats the configuration as a fresh deployment and attempts to create all resources again, producing duplicates</p>
</details>
