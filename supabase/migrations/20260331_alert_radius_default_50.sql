-- Default alert radius for new profiles: 50 mi (was 25).
ALTER TABLE profiles
  ALTER COLUMN alert_radius_miles SET DEFAULT 50;
