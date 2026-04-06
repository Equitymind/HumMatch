-- Squad Leader Discount Code System
-- Run this migration to add discount code tracking

CREATE TABLE IF NOT EXISTS discount_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  squad_leader_id INTEGER NOT NULL,
  discount_percent INTEGER DEFAULT 20,
  max_uses INTEGER DEFAULT 999,
  uses_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  deactivated_at TEXT,
  FOREIGN KEY(squad_leader_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS discount_code_uses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER NOT NULL,
  user_id INTEGER,
  stripe_session_id TEXT,
  amount_cents INTEGER,
  used_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(code_id) REFERENCES discount_codes(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_squad_leader ON discount_codes(squad_leader_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code ON discount_code_uses(code_id);

-- Track which Squad Leaders have generated their monthly codes
CREATE TABLE IF NOT EXISTS squad_leader_code_quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month_key TEXT NOT NULL,
  codes_generated INTEGER DEFAULT 0,
  max_codes INTEGER DEFAULT 5,
  UNIQUE(user_id, month_key),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
