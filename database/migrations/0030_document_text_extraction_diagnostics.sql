-- 0030: Dokumentextraktion diagnosefähig machen.
-- Die Sucharchitektur benötigt neben Status und Qualitätskennzeichen auch den konkret verwendeten
-- lokalen Extractor sowie eine begrenzte Fehlermeldung, damit Extraktionsfehler nachvollziehbar
-- bleiben, ohne Dokumentinhalte außerhalb des verschlüsselten Vaults abzulegen.

ALTER TABLE case_documents ADD COLUMN text_extractor_id TEXT;
ALTER TABLE case_documents ADD COLUMN text_extraction_error TEXT;

UPDATE case_documents
SET text_extractor_id = CASE
    WHEN COALESCE(text_extraction_status, 'unknown') = 'unsupported' THEN 'unsupported'
    WHEN COALESCE(text_extraction_status, 'unknown') = 'failed' THEN 'failed'
    WHEN COALESCE(mime_type, '') = 'application/pdf' THEN 'pdf-best-effort'
    WHEN COALESCE(mime_type, '') = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 'docx-openxml'
    WHEN COALESCE(mime_type, '') = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' THEN 'xlsx-openxml'
    WHEN COALESCE(mime_type, '') LIKE 'text/%' THEN 'plain-text'
    ELSE 'legacy'
  END
WHERE text_extractor_id IS NULL;
