-- Tabela KV dla Edge Function make-server-0afb8820 (W&G DOM)
-- Uruchom w Supabase Dashboard → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS kv_store_0afb8820 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Edge Function używa SERVICE_ROLE_KEY (omija RLS). Blokujemy bezpośredni dostęp anon/authenticated.
ALTER TABLE kv_store_0afb8820 ENABLE ROW LEVEL SECURITY;
