# resource "aws_s3_bucket" "media" {
#   bucket = "media"
 
#   lifecycle {
#     # Prevent accidental deletion of this S3 bucket
#     prevent_destroy = true
#   }
# }

# resource "aws_s3_bucket_public_access_block" "media_diy_no_public_access" {
#   bucket                  = aws_s3_bucket.media.id
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }
