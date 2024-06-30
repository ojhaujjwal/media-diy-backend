variable aws_region {
  type        = string
  description = "AWS Region"
  default = "ap-southeast-2"
}

variable project {
  type        = string
  default = "media-diy"
  description = "Project name"
}

variable s3_bucket_name {
  type    = string
  default = "media-diy-ujjwal"
  description = "S3 bucket name"
}
