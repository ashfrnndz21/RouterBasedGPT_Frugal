-- drizzle/0010_auth.sql
-- Run AFTER 0009_learning.sql

-- Add auth columns to learners
ALTER TABLE learners ADD COLUMN password_hash TEXT;
ALTER TABLE learners ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'credentials';

-- Admin passwords (for studio login)
ALTER TABLE admin_users ADD COLUMN password_hash TEXT;
ALTER TABLE admin_users ADD COLUMN last_login TEXT;

-- Question bank table (replaces in-memory questionBank.ts for admin editing)
CREATE TABLE IF NOT EXISTS questions (
  id            TEXT PRIMARY KEY,
  domain        TEXT NOT NULL,
  subdomain     TEXT NOT NULL DEFAULT '',
  skill         TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'mcq',
  difficulty    TEXT NOT NULL DEFAULT 'medium',
  weight        INTEGER NOT NULL DEFAULT 2,
  text          TEXT NOT NULL,
  options       TEXT,             -- JSON: [{letter,text,correct}]
  pairs         TEXT,             -- JSON: [{left,right}]
  items         TEXT,             -- JSON: string[]
  statement     INTEGER,          -- boolean for true/false
  rubric        TEXT,             -- JSON: {maxScore, concepts}
  correct_answer TEXT,
  explanation   TEXT NOT NULL DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '[]',
  acceptance_rate REAL NOT NULL DEFAULT 0.5,
  times_used    INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Streak tracking table
CREATE TABLE IF NOT EXISTS streak_events (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  event_date    TEXT NOT NULL,   -- YYYY-MM-DD
  event_type    TEXT NOT NULL,   -- 'assessment' | 'module' | 'login'
  UNIQUE(learner_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_streak_learner ON streak_events(learner_id);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
