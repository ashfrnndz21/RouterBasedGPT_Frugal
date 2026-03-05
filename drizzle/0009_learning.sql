-- ─────────────────────────────────────────────────────────────────
--  Frugal AI — Learning Platform Schema
--  Drop into: drizzle/0009_learning.sql
--  Run: npx drizzle-kit push  OR  npx drizzle-kit migrate
-- ─────────────────────────────────────────────────────────────────

-- Learner profiles
CREATE TABLE IF NOT EXISTS learners (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name          TEXT NOT NULL DEFAULT '',
  email         TEXT UNIQUE NOT NULL,
  persona_id    TEXT,                         -- 'builder' | 'analyst' | 'strategist' | 'explorer'
  onboarding    INTEGER NOT NULL DEFAULT 0,   -- 0=false 1=true
  streak        INTEGER NOT NULL DEFAULT 0,
  total_pts     INTEGER NOT NULL DEFAULT 0,
  lang          TEXT NOT NULL DEFAULT 'en',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_active   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Domain scores per learner (upsert on re-assessment)
CREATE TABLE IF NOT EXISTS domain_scores (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  score         INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0 AND score <= 300),
  tier          TEXT NOT NULL DEFAULT 'spark',
  assessed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(learner_id, domain)
);

-- Assessment sessions
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'typed',   -- 'typed' | 'voice'
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'abandoned'
  final_score   INTEGER,
  final_tier    TEXT,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

-- Individual assessment events (one row per question answered)
CREATE TABLE IF NOT EXISTS assessment_events (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id    TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  question_id   TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer        TEXT NOT NULL,
  correct       INTEGER NOT NULL DEFAULT 0,     -- 0 | 1
  score_delta   INTEGER NOT NULL DEFAULT 0,     -- +8 to +25 correct, -5 to -15 wrong
  difficulty    TEXT NOT NULL,                  -- 'easy' | 'medium' | 'hard'
  time_taken_ms INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Learning modules (curated + aggregated content)
CREATE TABLE IF NOT EXISTS modules (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  domain        TEXT NOT NULL,
  subdomain     TEXT,
  tier          TEXT NOT NULL DEFAULT 'spark',
  type          TEXT NOT NULL DEFAULT 'video',   -- 'video' | 'article' | 'lab' | 'quiz' | 'interactive'
  source        TEXT NOT NULL DEFAULT 'internal', -- 'aws' | 'coursera' | 'internal' | 'youtube'
  url           TEXT NOT NULL DEFAULT '',
  duration_m    INTEGER NOT NULL DEFAULT 0,
  tags          TEXT NOT NULL DEFAULT '[]',       -- JSON array
  prerequisites TEXT NOT NULL DEFAULT '[]',       -- JSON array of module IDs
  thumbnail     TEXT,
  rating        REAL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Module progress per learner
CREATE TABLE IF NOT EXISTS module_progress (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  learner_id    TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  module_id     TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'not_started',
  pct           INTEGER NOT NULL DEFAULT 0 CHECK(pct >= 0 AND pct <= 100),
  started_at    TEXT,
  completed_at  TEXT,
  UNIQUE(learner_id, module_id)
);

-- Taxonomy domains (admin-configurable)
CREATE TABLE IF NOT EXISTS taxonomy_domains (
  id            TEXT PRIMARY KEY,               -- e.g. 'ai_essentials'
  name          TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🤖',
  color         TEXT NOT NULL DEFAULT '#4F8EF7',
  description   TEXT NOT NULL DEFAULT '',
  benchmark     INTEGER NOT NULL DEFAULT 201,
  weight        INTEGER NOT NULL DEFAULT 3 CHECK(weight >= 1 AND weight <= 5),
  active        INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- Taxonomy subdomains
CREATE TABLE IF NOT EXISTS taxonomy_subdomains (
  id            TEXT PRIMARY KEY,
  domain_id     TEXT NOT NULL REFERENCES taxonomy_domains(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- Taxonomy skills
CREATE TABLE IF NOT EXISTS taxonomy_skills (
  id            TEXT PRIMARY KEY,
  subdomain_id  TEXT NOT NULL REFERENCES taxonomy_subdomains(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- Agent configurations (admin-editable)
CREATE TABLE IF NOT EXISTS agent_configs (
  id            TEXT PRIMARY KEY,               -- 'scout' | 'sage' | 'curator' | 'coach'
  name          TEXT NOT NULL,
  display_role  TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🤖',
  model         TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  routing_tier  TEXT NOT NULL DEFAULT 'dynamic',
  max_tokens    INTEGER NOT NULL DEFAULT 800,
  system_prompt TEXT NOT NULL DEFAULT '',
  context_injections TEXT NOT NULL DEFAULT '[]', -- JSON array
  active        INTEGER NOT NULL DEFAULT 1,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persona configs (admin-editable)
CREATE TABLE IF NOT EXISTS personas (
  id            TEXT PRIMARY KEY,               -- 'builder' | 'analyst' | 'strategist' | 'explorer'
  label         TEXT NOT NULL,
  emoji         TEXT NOT NULL,
  subtitle      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  color         TEXT NOT NULL DEFAULT '#4F8EF7',
  domain_weights TEXT NOT NULL DEFAULT '{}',    -- JSON object domain→weight
  sage_modifier TEXT NOT NULL DEFAULT '',
  scout_modifier TEXT NOT NULL DEFAULT '',
  primary_domains TEXT NOT NULL DEFAULT '[]',   -- JSON array
  active        INTEGER NOT NULL DEFAULT 1
);

-- Learning pathways
CREATE TABLE IF NOT EXISTS pathways (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  target_persona TEXT,
  active        INTEGER NOT NULL DEFAULT 0,
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pathway stages
CREATE TABLE IF NOT EXISTS pathway_stages (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pathway_id    TEXT NOT NULL REFERENCES pathways(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'learn',   -- 'learn' | 'assess_gate'
  module_ids    TEXT NOT NULL DEFAULT '[]',       -- JSON array
  assess_domain TEXT,
  min_score     INTEGER,
  fail_action   TEXT DEFAULT 'loop'               -- 'loop' | 'remediate'
);

-- Admin users (separate from learner auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'read_only',  -- 'super_admin' | 'content_admin' | 'read_only'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_domain_scores_learner ON domain_scores(learner_id);
CREATE INDEX IF NOT EXISTS idx_domain_scores_domain  ON domain_scores(domain);
CREATE INDEX IF NOT EXISTS idx_sessions_learner       ON assessment_sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_domain        ON assessment_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_events_session         ON assessment_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_learner         ON assessment_events(learner_id);
CREATE INDEX IF NOT EXISTS idx_progress_learner       ON module_progress(learner_id);
CREATE INDEX IF NOT EXISTS idx_modules_domain         ON modules(domain);
CREATE INDEX IF NOT EXISTS idx_modules_tier           ON modules(tier);
CREATE INDEX IF NOT EXISTS idx_learners_email         ON learners(email);
