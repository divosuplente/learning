---
title: "Terraform Infrastructure as Code"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/15-infrastructure-platform/0074-terraform-infrastructure.md
---

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

resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "app-vpc" }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "app-private-subnet" }
}

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

resource "aws_db_instance" "postgres" {
  identifier           = "app-postgres"
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_name              = "appdb"
  username             = "dbadmin"
  password             = "changeme-in-prod"
  skip_final_snapshot  = true
  vpc_security_group_ids = [aws_security_group.rds.id]
}
```

Key patterns:

-   **Implicit dependencies:** `aws_db_instance.postgres` references `aws_security_group.rds.id`. Terraform infers the order and creates the security group first.
-   **Reference syntax:** `aws_vpc.app.id` means "the `id` attribute of the `aws_vpc` resource named `app`."
-   **Tags:** every resource gets a `Name` tag so you can find it in the console.

## The Terraform Workflow

```
terraform init          # download providers, set up backend
terraform plan           # diff: what will change
terraform apply          # execute (prompts for confirmation)
terraform apply -auto-approve  # skip confirmation (CI/CD)
terraform destroy        # tear everything down
```

Always review the plan before applying. "1 to destroy" when you expected zero means a bug in the config.

## Variables and Outputs

Parameterize configs with `variables.tf`:

```
variable "db_password" {
  type      = string
  sensitive = true  // hides value from plan output
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}
```

Provide values at apply time:

```
terraform apply -var="db_password=MyS3cret!99"
export TF_VAR_db_password="MyS3cret!99"
```

Expose results with `outputs.tf`:

```
output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
```

Reference outputs in Spring Boot:

```
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
```

## State Management

Local `terraform.tfstate` is not shared, not backed up, and has no locking. Use S3 + DynamoDB for production:

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

DynamoDB provides distributed locking so concurrent applies fail safely. `encrypt = true` protects sensitive output values. Bootstrap the bucket and table once with local state, then migrate with `terraform init -backend-config="bucket=my-tf-state-bucket"`.

## Terraform Modules

A module is a directory of `.tf` files. Extract repeated infrastructure into a module, then call it from each environment:

```
module "staging_db" {
  source            = "../../modules/postgres-vpc"
  vpc_cidr          = "10.1.0.0/16"
  db_name           = "stagingdb"
  db_password       = var.db_password
  db_instance_class = "db.t3.micro"
  environment       = "staging"
}

module "prod_db" {
  source            = "../../modules/postgres-vpc"
  vpc_cidr          = "10.0.0.0/16"
  db_name           = "proddb"
  db_password       = var.db_password
  db_instance_class = "db.r6g.large"
  environment       = "production"
}
```

Same module, different values. A fix to the module fixes both environments.

Standard layout:

```
infra/
  main.tf           # provider + module call + backend
  variables.tf      # inputs
  outputs.tf        # JDBC endpoint, VPC ID
  terraform.tfvars  # gitignored environment values
```

Changing a module variable then running `terraform plan` shows the increment before you apply.

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
