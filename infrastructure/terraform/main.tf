# ============================================================
# LibraSpace — Terraform Root Module
# AWS Infrastructure: VPC, ALB, ASG, RDS, Secrets Manager
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment to use S3 backend for team/shared state:
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "libraspace/terraform.tfstate"
  #   region         = var.aws_region
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Local values ─────────────────────────────────────────────
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ── Modules ───────────────────────────────────────────────────
module "vpc" {
  source       = "./modules/vpc"
  name_prefix  = local.name_prefix
  vpc_cidr     = var.vpc_cidr
  azs          = var.availability_zones
}

module "security_groups" {
  source      = "./modules/security_groups"
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  app_port    = var.app_port
}

module "rds" {
  source               = "./modules/rds"
  name_prefix          = local.name_prefix
  db_subnet_group_name = module.vpc.db_subnet_group_name
  app_sg_id            = module.security_groups.app_sg_id
  db_instance_class    = var.db_instance_class
  db_storage_gb        = var.db_storage_gb
  db_name              = "libraspace"
}

module "iam" {
  source          = "./modules/iam"
  name_prefix     = local.name_prefix
  db_secret_arn   = module.rds.db_secret_arn
  app_secret_name = "${local.name_prefix}/app-secrets"
}

module "alb" {
  source            = "./modules/alb"
  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security_groups.alb_sg_id
  app_port          = var.app_port
  certificate_arn   = var.certificate_arn
}

module "asg" {
  source              = "./modules/asg"
  name_prefix         = local.name_prefix
  ami_id              = var.ami_id
  instance_type       = var.instance_type
  key_name            = var.key_name
  app_subnet_ids      = module.vpc.app_subnet_ids
  app_sg_id           = module.security_groups.app_sg_id
  target_group_arn    = module.alb.target_group_arn
  iam_instance_profile = module.iam.instance_profile_name
  min_capacity        = var.min_capacity
  desired_capacity    = var.desired_capacity
  max_capacity        = var.max_capacity
  app_port            = var.app_port
  db_secret_arn       = module.rds.db_secret_arn
  aws_region          = var.aws_region
  project_name        = var.project_name
  environment         = var.environment
}

# ── Outputs ───────────────────────────────────────────────────
output "alb_dns_name" {
  description = "ALB DNS name — use this to access the application"
  value       = module.alb.alb_dns_name
}

output "alb_url" {
  description = "Application URL"
  value       = "http://${module.alb.alb_dns_name}"
}

output "rds_endpoint" {
  description = "RDS endpoint (private — not publicly accessible)"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "db_secret_arn" {
  description = "ARN of the DB credentials secret in Secrets Manager"
  value       = module.rds.db_secret_arn
}

output "instance_profile_name" {
  description = "EC2 instance profile name"
  value       = module.iam.instance_profile_name
}
