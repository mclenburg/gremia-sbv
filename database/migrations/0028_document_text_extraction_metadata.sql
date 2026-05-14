-- 0028: Metadaten zur lokalen Dokumenttext-Extraktion für den zentralen Suchindex.
-- Die Inhalte bleiben im SQLCipher-Vault. Es werden keine externen OCR- oder Cloud-Dienste verwendet.

ALTER TABLE case_documents ADD COLUMN extraction_quality TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE case_documents ADD COLUMN text_extraction_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE case_documents ADD COLUMN text_extracted_at TEXT;

UPDATE case_documents
SET extraction_quality = CASE
    WHEN COALESCE(extracted_text, '') <> '' THEN 'native_text'
    ELSE 'unknown'
  END,
  text_extraction_status = CASE
    WHEN COALESCE(extracted_text, '') <> '' THEN 'extracted'
    ELSE 'empty'
  END,
  text_extracted_at = COALESCE(imported_at, created_at, CURRENT_TIMESTAMP)
WHERE extraction_quality = 'unknown'
  AND text_extraction_status = 'unknown';
