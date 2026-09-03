-- 0053: Gremia.BR 2.0 als optionale Gremiumsanbindung vorbereiten.
-- Es werden nur Konfigurationsmetadaten abgelegt. Dokumentübertragungen
-- bleiben separate, explizite Nutzeraktionen in einem eigenen Gremia.BR-Bereich.

ALTER TABLE gremia_br_settings ADD COLUMN api_mode TEXT NOT NULL DEFAULT 'legacy_read_bridge';
ALTER TABLE gremia_br_settings ADD COLUMN selected_body_id TEXT;
ALTER TABLE gremia_br_settings ADD COLUMN selected_body_name TEXT;
ALTER TABLE gremia_br_settings ADD COLUMN selected_organization_id TEXT;
ALTER TABLE gremia_br_settings ADD COLUMN selected_security_domain TEXT;
