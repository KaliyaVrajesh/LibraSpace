output "asg_name"             { value = aws_autoscaling_group.main.name }
output "launch_template_id"  { value = aws_launch_template.app.id }
output "log_group_name"      { value = aws_cloudwatch_log_group.app.name }
