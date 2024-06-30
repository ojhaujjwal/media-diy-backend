resource "aws_s3_bucket" "media" {
  bucket = var.s3_bucket_name
 
  lifecycle {
    # Prevent accidental deletion of this S3 bucket
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "move_to_glacier_ir" {
  rule {
    id      = "move_to_glacier_ir"
    status  = "Enabled"

    transition {
      days          = 0
      storage_class = "GLACIER_IR"
    }
  }

  bucket = aws_s3_bucket.media.id
}

resource "aws_s3_bucket_public_access_block" "media_diy_no_public_access" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
