provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project = var.project
    }
  }
  profile = "media-diy"
}

terraform {
  backend "s3" {
    bucket = "ujjwal-tf-state"
    key    = "media-diy/terraform.tfstate"
    region = "ap-southeast-2"
    profile = "media-diy"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}