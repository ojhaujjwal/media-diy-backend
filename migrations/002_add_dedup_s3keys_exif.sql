-- Fast-scan dedup columns (nullable so existing dev rows don't break the migration)
ALTER TABLE media_metadata ADD COLUMN smb_path TEXT;
ALTER TABLE media_metadata ADD COLUMN file_size INTEGER;
ALTER TABLE media_metadata ADD COLUMN file_mtime TEXT;

-- Split single file_path into separate full/thumb S3 keys
ALTER TABLE media_metadata ADD COLUMN s3_key_full TEXT;
ALTER TABLE media_metadata ADD COLUMN s3_key_thumb TEXT;

-- Persist EXIF as a JSON blob
ALTER TABLE media_metadata ADD COLUMN exif TEXT;

-- Drop the old single file_path column
ALTER TABLE media_metadata DROP COLUMN file_path;

-- Index for fast-scan lookup by smb_path
CREATE INDEX IF NOT EXISTS idx_media_smb_path ON media_metadata(smb_path);
