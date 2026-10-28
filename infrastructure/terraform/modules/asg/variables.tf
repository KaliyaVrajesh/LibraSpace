variable "name_prefix"           { type = string }
variable "ami_id"                { type = string }
variable "instance_type"         { type = string }
variable "key_name"              { type = string; default = null }
variable "app_subnet_ids"        { type = list(string) }
variable "app_sg_id"             { type = string }
variable "target_group_arn"      { type = string }
variable "iam_instance_profile"  { type = string }
variable "min_capacity"          { type = number }
variable "desired_capacity"      { type = number }
variable "max_capacity"          { type = number }
variable "app_port"              { type = number }
variable "db_secret_arn"         { type = string }
variable "aws_region"            { type = string }
variable "project_name"          { type = string }
variable "environment"           { type = string }
