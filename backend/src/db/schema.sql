-- Habilite a extensão PostGIS no banco antes de rodar este script:
-- CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',          -- free | basico | pro
  plan_status TEXT NOT NULL DEFAULT 'active', -- active | past_due | canceled
  mp_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Mapa sem título',
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom_type TEXT NOT NULL,         -- point | line | polygon | mixed
  style JSONB NOT NULL DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada feição como geometria PostGIS real (permite consultas espaciais no futuro)
CREATE TABLE IF NOT EXISTS map_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES map_layers(id) ON DELETE CASCADE,
  geom GEOMETRY(Geometry, 4326) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_features_geom_idx ON map_features USING GIST (geom);
CREATE INDEX IF NOT EXISTS maps_owner_idx ON maps (owner_id);

-- Limites por plano (camada de aplicação consulta esta tabela para validar uploads)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  max_maps INT NOT NULL,
  max_features_per_map INT NOT NULL,
  max_storage_mb INT NOT NULL
);

INSERT INTO plan_limits (plan, max_maps, max_features_per_map, max_storage_mb) VALUES
  ('free', 2, 200, 10),
  ('basico', 15, 2000, 200),
  ('pro', 100, 20000, 2000)
ON CONFLICT (plan) DO NOTHING;
