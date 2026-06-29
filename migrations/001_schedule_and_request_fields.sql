-- Run once in the Neon SQL editor (https://console.neon.tech) for the sbm-subfinder database.
-- Adds the columns the app already collects but the API was not persisting,
-- plus the new request fields (reason / notify list). Safe to re-run.

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS break_time_start text,
  ADD COLUMN IF NOT EXISTS break_time_end   text,
  ADD COLUMN IF NOT EXISTS monday_start     text,
  ADD COLUMN IF NOT EXISTS monday_end       text,
  ADD COLUMN IF NOT EXISTS tuesday_start    text,
  ADD COLUMN IF NOT EXISTS tuesday_end      text,
  ADD COLUMN IF NOT EXISTS wednesday_start  text,
  ADD COLUMN IF NOT EXISTS wednesday_end    text,
  ADD COLUMN IF NOT EXISTS thursday_start   text,
  ADD COLUMN IF NOT EXISTS thursday_end     text,
  ADD COLUMN IF NOT EXISTS friday_start     text,
  ADD COLUMN IF NOT EXISTS friday_end       text;

ALTER TABLE substitutes
  ADD COLUMN IF NOT EXISTS available_days jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS reason        text,
  ADD COLUMN IF NOT EXISTS reason_detail text,
  ADD COLUMN IF NOT EXISTS notify_subs   jsonb NOT NULL DEFAULT '[]'::jsonb;
