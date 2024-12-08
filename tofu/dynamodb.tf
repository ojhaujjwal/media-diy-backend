resource "aws_dynamodb_table" "media_metadata" {
  name           = "media_metadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "HashKey"
  range_key      = "RangeKey"

  attribute {
    name = "HashKey"
    type = "S"
  }

  attribute {
    name = "RangeKey"
    type = "S"
  }

  attribute {
    name = "originalFileName"
    type = "S"
  }

  attribute {
    name = "deviceId"
    type = "S"
  }

  attribute {
    name = "filePath"
    type = "S"
  }

  # attribute {
  #   name = "md5Hash"
  #   type = "S"
  # }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "capturedAt"
    type = "S"
  }

  attribute {
    name = "uploadedAt"
    type = "S"
  }
}