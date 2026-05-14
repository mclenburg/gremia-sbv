-- 0031: OCR optional, lokal und nicht blockierend vorbereiten.

ALTER TABLE case_documents ADD COLUMN ocr_status TEXT NOT NULL DEFAULT 'not_required' CHECK (ocr_status IN ('not_required','queued','processing','completed','unsupported','failed'));
ALTER TABLE case_documents ADD COLUMN ocr_text TEXT;
ALTER TABLE case_documents ADD COLUMN ocr_engine TEXT;
ALTER TABLE case_documents ADD COLUMN ocr_started_at TEXT;
ALTER TABLE case_documents ADD COLUMN ocr_completed_at TEXT;
ALTER TABLE case_documents ADD COLUMN ocr_error TEXT;

CREATE INDEX IF NOT EXISTS idx_case_documents_ocr_status ON case_documents(ocr_status, imported_at);

CREATE TABLE IF NOT EXISTS case_document_ocr_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','unsupported','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_document ON case_document_ocr_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_case_document_ocr_jobs_status ON case_document_ocr_jobs(status, updated_at);

UPDATE case_documents
SET ocr_status = CASE
  WHEN COALESCE(extracted_text, '') = '' AND (mime_type LIKE 'image/%' OR mime_type = 'application/pdf') THEN 'queued'
  ELSE 'not_required'
END
WHERE ocr_status = 'not_required';


INSERT OR IGNORE INTO case_document_ocr_jobs (id, document_id, case_id, status, attempts, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, case_id, 'queued', 0, COALESCE(imported_at, created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM case_documents
WHERE ocr_status = 'queued';
