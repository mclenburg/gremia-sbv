CREATE TABLE IF NOT EXISTS legal_norms (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  paragraph TEXT NOT NULL,
  title TEXT NOT NULL,
  short_text TEXT NOT NULL,
  full_text TEXT,
  sbv_meaning TEXT,
  practice_note TEXT,
  typical_cases TEXT,
  deadline_relevance TEXT,
  template_relevance TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, paragraph)
);

CREATE INDEX IF NOT EXISTS idx_legal_norms_source ON legal_norms(source);
CREATE INDEX IF NOT EXISTS idx_legal_norms_paragraph ON legal_norms(paragraph);
CREATE INDEX IF NOT EXISTS idx_legal_norms_title ON legal_norms(title);

CREATE TABLE IF NOT EXISTS case_legal_references (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  legal_norm_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(case_id, legal_norm_id),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_legal_references_case_id ON case_legal_references(case_id);
CREATE INDEX IF NOT EXISTS idx_case_legal_references_norm_id ON case_legal_references(legal_norm_id);

CREATE TABLE IF NOT EXISTS norm_comments (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_norm_comments_norm_id ON norm_comments(legal_norm_id);

CREATE TABLE IF NOT EXISTS norm_case_law (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  court TEXT NOT NULL,
  decision_date TEXT,
  file_number TEXT NOT NULL,
  short_holding TEXT NOT NULL,
  relevance TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_norm_case_law_norm_id ON norm_case_law(legal_norm_id);

CREATE TABLE IF NOT EXISTS norm_checklist_items (
  id TEXT PRIMARY KEY,
  legal_norm_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (legal_norm_id) REFERENCES legal_norms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_norm_checklist_items_norm_id ON norm_checklist_items(legal_norm_id);
