-- Verified capability statements are optional; legacy profiles remain unknown.
ALTER TABLE transfer_recipient_profiles ADD COLUMN capabilities_json TEXT;
ALTER TABLE transfer_recipient_profiles ADD COLUMN capability_revision INTEGER;
ALTER TABLE transfer_recipient_profiles ADD COLUMN capability_confirmed_at TEXT;
