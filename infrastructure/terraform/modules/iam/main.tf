# ============================================================
# IAM Module — EC2 Instance Profile with least-privilege access
# ============================================================

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_role" {
  name               = "${var.name_prefix}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

# Allow reading the DB secret (and optionally the app secret)
data "aws_iam_policy_document" "secrets_access" {
  statement {
    sid     = "ReadDBSecret"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      var.db_secret_arn,
      "arn:aws:secretsmanager:*:*:secret:${var.app_secret_name}*",
    ]
  }
}

resource "aws_iam_policy" "secrets_access" {
  name   = "${var.name_prefix}-secrets-access"
  policy = data.aws_iam_policy_document.secrets_access.json
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# SSM Session Manager (replaces SSH for console access)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "main" {
  name = "${var.name_prefix}-instance-profile"
  role = aws_iam_role.ec2_role.name
}
