-- Custom domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(is_active);

