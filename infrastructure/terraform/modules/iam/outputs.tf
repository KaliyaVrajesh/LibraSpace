output "instance_profile_name" { value = aws_iam_instance_profile.main.name }
output "instance_profile_arn"  { value = aws_iam_instance_profile.main.arn }
output "role_arn"               { value = aws_iam_role.ec2_role.arn }
