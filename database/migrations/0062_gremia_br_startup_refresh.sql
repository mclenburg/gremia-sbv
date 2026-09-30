ALTER TABLE gremia_br_settings ADD COLUMN auto_refresh_on_startup INTEGER NOT NULL DEFAULT 0 CHECK (auto_refresh_on_startup IN (0, 1));
