CREATE TABLE IF NOT EXISTS media_metadata (
  id                TEXT PRIMARY KEY,
  sha256_hash       TEXT NOT NULL,
  type              TEXT NOT NULL,
  device_id         TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  owner_user_id     TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  captured_at       TEXT NOT NULL,
  uploaded_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_sha256 ON media_metadata(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_metadata(owner_user_id);
