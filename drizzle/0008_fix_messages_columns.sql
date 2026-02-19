-- Fix messages table: add missing createdAt and sources columns
-- These were defined in the Drizzle schema but never applied via migration.
ALTER TABLE messages ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE messages ADD COLUMN sources TEXT DEFAULT '[]';
