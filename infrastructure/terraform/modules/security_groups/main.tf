# ============================================================
# Security Groups — ALB, Application, RDS
# Least-privilege rules
# ============================================================

# ── ALB Security Group ───────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb-sg"
  description = "Allow HTTP/HTTPS inbound to the Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }

  # Uncomment when HTTPS is enabled
  # ingress {
  #   from_port   = 443
  #   to_port     = 443
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  #   description = "HTTPS from internet"
  # }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${var.name_prefix}-alb-sg" }
}

# ── Application Security Group ────────────────────────────────
resource "aws_security_group" "app" {
  name        = "${var.name_prefix}-app-sg"
  description = "Allow application traffic only from ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "App port from ALB only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound (needed for Secrets Manager VPC endpoint, RDS)"
  }

  tags = { Name = "${var.name_prefix}-app-sg" }
}

# ── RDS Security Group ────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Allow PostgreSQL only from application security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app servers only"
  }

  # No egress rules needed for RDS

  tags = { Name = "${var.name_prefix}-rds-sg" }
}
