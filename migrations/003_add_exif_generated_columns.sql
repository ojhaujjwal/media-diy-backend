ALTER TABLE media_metadata
  ADD COLUMN camera_make TEXT GENERATED ALWAYS AS (json_extract(exif, '$.make')) VIRTUAL;
ALTER TABLE media_metadata
  ADD COLUMN camera_model TEXT GENERATED ALWAYS AS (json_extract(exif, '$.model')) VIRTUAL;
ALTER TABLE media_metadata
  ADD COLUMN gps_lat REAL GENERATED ALWAYS AS (json_extract(exif, '$.gps.latitude')) VIRTUAL;
ALTER TABLE media_metadata
  ADD COLUMN gps_lon REAL GENERATED ALWAYS AS (json_extract(exif, '$.gps.longitude')) VIRTUAL;

CREATE INDEX IF NOT EXISTS idx_media_camera_make  ON media_metadata(camera_make);
CREATE INDEX IF NOT EXISTS idx_media_camera_model ON media_metadata(camera_model);
CREATE INDEX IF NOT EXISTS idx_media_gps_lat      ON media_metadata(gps_lat);
CREATE INDEX IF NOT EXISTS idx_media_gps_lon      ON media_metadata(gps_lon);
