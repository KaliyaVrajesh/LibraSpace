# ============================================================
# RDS Module — PostgreSQL on Amazon RDS
# ============================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "random_id" "db_suffix" {
  byte_length = 4
}

# ── Secrets Manager — DB Credentials ────────────────────────
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.name_prefix}/rds/credentials-${random_id.db_suffix.hex}"
  description = "LibraSpace RDS PostgreSQL credentials"

  # Prevent accidental deletion
  recovery_window_in_days = 7

  tags = { Name = "${var.name_prefix}-rds-credentials" }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "libraspace"
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = var.db_name
    engine   = "postgres"
  })

  # Wait for RDS to be available
  depends_on = [aws_db_instance.main]
}

# ── Parameter Group ──────────────────────────────────────────
resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-pg16"
  family = "postgres16"
  description = "LibraSpace PostgreSQL 16 parameters"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }
}

# ── RDS Instance ─────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier             = "${var.name_prefix}-postgres"
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_storage_gb
  max_allocated_storage  = var.db_storage_gb * 3

  db_name  = var.db_name
  username = "libraspace"
  password = random_password.db_password.result

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  # Security
  publicly_accessible    = false
  storage_encrypted      = true

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Protection
  deletion_protection = false  # Set to true for real production
  skip_final_snapshot = true   # Set to false for real production

  apply_immediately = true

  tags = { Name = "${var.name_prefix}-rds" }
}

# RDS security group is created within this module for self-reference
resource "aws_security_group" "rds_sg" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Allow PostgreSQL from app security group"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_sg_id]
    description     = "PostgreSQL from app servers"
  }

  tags = { Name = "${var.name_prefix}-rds-sg" }
}

data "aws_vpc" "selected" {
  filter {
    name   = "tag:Name"
    values = ["${var.name_prefix}-vpc"]
  }
}
