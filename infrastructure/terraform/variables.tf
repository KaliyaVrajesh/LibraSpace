# ============================================================
# LibraSpace — Terraform Variables
# ============================================================

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "libraspace"
}

variable "environment" {
  description = "Deployment environment name (e.g. dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.10.0.0/16"
}

variable "availability_zones" {
  description = "List of AWS Availability Zones (minimum 2 for HA)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "instance_type" {
  description = "EC2 instance type for application servers"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Amazon Machine Image ID for EC2 (Amazon Linux 2023 recommended)"
  type        = string
  # Get latest AL2023 AMI: aws ec2 describe-images --owners amazon \
  #   --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" \
  #   --query 'sort_by(Images,&CreationDate)[-1].ImageId'
}

variable "key_name" {
  description = "EC2 key pair name for SSH access (optional — prefer SSM Session Manager)"
  type        = string
  default     = null
}

variable "min_capacity" {
  description = "Minimum number of EC2 instances in the ASG"
  type        = number
  default     = 1
}

variable "desired_capacity" {
  description = "Desired number of EC2 instances in the ASG"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of EC2 instances in the ASG"
  type        = number
  default     = 4
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_storage_gb" {
  description = "RDS allocated storage in gigabytes"
  type        = number
  default     = 20
}

variable "app_port" {
  description = "Port the Flask application listens on"
  type        = number
  default     = 5000
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (leave empty for HTTP-only)"
  type        = string
  default     = ""
}
