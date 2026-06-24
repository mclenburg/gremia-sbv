-- 0043: Generated documents use encrypted .gsbvdoc containers like case documents.
ALTER TABLE generated_documents ADD COLUMN filename TEXT;
ALTER TABLE generated_documents ADD COLUMN mime_type TEXT;
ALTER TABLE generated_documents ADD COLUMN sha256 TEXT;
ALTER TABLE generated_documents ADD COLUMN document_key TEXT;
ALTER TABLE generated_documents ADD COLUMN iv TEXT;
ALTER TABLE generated_documents ADD COLUMN auth_tag TEXT;
ALTER TABLE generated_documents ADD COLUMN size_bytes INTEGER;
