-- Gremia.SBV 0.9.5-a: fallaktenunabhängige Stellenbesetzungs- und Vorstellungsgesprächsnachhaltung
CREATE TABLE IF NOT EXISTS recruiting_participations (
  id TEXT PRIMARY KEY,
  vacancy_title TEXT NOT NULL,
  vacancy_reference TEXT,
  department TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','notice_received','interviews_scheduled','interviews_completed','hearing_pending','statement_submitted','decision_known','closed')),
  employer_notice_date TEXT,
  documents_received_date TEXT,
  documents_complete INTEGER NOT NULL DEFAULT 0 CHECK (documents_complete IN (0,1)),
  has_severely_disabled_applicants INTEGER NOT NULL DEFAULT 0 CHECK (has_severely_disabled_applicants IN (0,1)),
  severely_disabled_applicant_count INTEGER,
  interview_count INTEGER NOT NULL DEFAULT 0,
  sbv_invited_to_all_known_interviews INTEGER CHECK (sbv_invited_to_all_known_interviews IN (0,1)),
  sbv_participated INTEGER CHECK (sbv_participated IN (0,1)),
  hearing_requested_date TEXT,
  hearing_due_date TEXT,
  statement_submitted_date TEXT,
  decision_known_date TEXT,
  decision_before_hearing INTEGER NOT NULL DEFAULT 0 CHECK (decision_before_hearing IN (0,1)),
  br_procedure_date TEXT,
  flagged_for_violation_review INTEGER NOT NULL DEFAULT 0 CHECK (flagged_for_violation_review IN (0,1)),
  violation_review_reason TEXT CHECK (violation_review_reason IS NULL OR violation_review_reason IN ('decision_before_hearing','missing_hearing_after_interview','incomplete_information','sbv_not_invited','execution_without_remedy','manual_review')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recruiting_interview_events (
  id TEXT PRIMARY KEY,
  recruiting_participation_id TEXT NOT NULL REFERENCES recruiting_participations(id) ON DELETE CASCADE,
  interview_date TEXT NOT NULL,
  applicant_ref TEXT NOT NULL,
  applicant_reference_mode TEXT NOT NULL DEFAULT 'anonymous_reference' CHECK (applicant_reference_mode IN ('anonymous_reference','pseudonymized_reference','clear_name')),
  applicant_status TEXT NOT NULL DEFAULT 'unknown_or_not_relevant' CHECK (applicant_status IN ('severely_disabled','equal_status','unknown_or_not_relevant')),
  sbv_invited INTEGER NOT NULL DEFAULT 0 CHECK (sbv_invited IN (0,1)),
  sbv_invitation_date TEXT,
  sbv_attended INTEGER NOT NULL DEFAULT 0 CHECK (sbv_attended IN (0,1)),
  accessibility_check_status TEXT NOT NULL DEFAULT 'not_checked' CHECK (accessibility_check_status IN ('not_checked','not_relevant','contact_offered','format_checked','follow_up_needed')),
  follow_up_needed INTEGER NOT NULL DEFAULT 0 CHECK (follow_up_needed IN (0,1)),
  procedural_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recruiting_participations_status ON recruiting_participations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruiting_participations_notice ON recruiting_participations(employer_notice_date DESC);
CREATE INDEX IF NOT EXISTS idx_recruiting_participations_hearing ON recruiting_participations(hearing_due_date, status);
CREATE INDEX IF NOT EXISTS idx_recruiting_participations_violation_flag ON recruiting_participations(flagged_for_violation_review, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruiting_participations_reference ON recruiting_participations(vacancy_reference);
CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_participation ON recruiting_interview_events(recruiting_participation_id, interview_date);
CREATE INDEX IF NOT EXISTS idx_recruiting_interviews_accessibility ON recruiting_interview_events(accessibility_check_status, follow_up_needed);
