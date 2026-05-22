-- 0034: Lokaler Relevanzfilter für manuell abgerufene Gremia.BR-Daten.
-- Die Stichwörter werden ausschließlich lokal in Gremia.SBV ausgewertet und nicht an Gremia.BR übertragen.

ALTER TABLE gremia_br_settings ADD COLUMN relevance_keywords_json TEXT;
