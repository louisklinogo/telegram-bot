-- 0013_add_ai_embeddings.sql
-- Enable pgvector and add embeddings/enrichment tables for semantic features

-- Enable extension (safe if already installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Transaction embeddings for similarity search
CREATE TABLE IF NOT EXISTS public.transaction_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  embedding vector(768),
  source_text text NOT NULL,
  model text NOT NULL DEFAULT 'gemini-embedding-001',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_transaction_embedding UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_embeddings_transaction_id 
  ON public.transaction_embeddings (transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_embeddings_team_id 
  ON public.transaction_embeddings (team_id);

-- Try HNSW; if not supported in this Postgres version, switch to IVFFLAT manually
DO $$ BEGIN
  BEGIN
    CREATE INDEX idx_transaction_embeddings_vector 
      ON public.transaction_embeddings 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  EXCEPTION WHEN undefined_object OR invalid_parameter_value OR feature_not_supported THEN
    -- Fallback to ivfflat
    CREATE INDEX IF NOT EXISTS idx_transaction_embeddings_vector 
      ON public.transaction_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END;
END $$;

-- Category embeddings for similarity matching
CREATE TABLE IF NOT EXISTS public.transaction_category_embeddings (
  name text PRIMARY KEY,
  embedding vector(768),
  model text NOT NULL DEFAULT 'gemini-embedding-001',
  system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  BEGIN
    CREATE INDEX idx_transaction_category_embeddings_vector 
      ON public.transaction_category_embeddings 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  EXCEPTION WHEN undefined_object OR invalid_parameter_value OR feature_not_supported THEN
    CREATE INDEX IF NOT EXISTS idx_transaction_category_embeddings_vector 
      ON public.transaction_category_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_transaction_category_embeddings_system 
  ON public.transaction_category_embeddings (system);

-- Enrichment tracking
CREATE TABLE IF NOT EXISTS public.transaction_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  suggested_category_slug text,
  confidence numeric(3,2),
  metadata jsonb,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_suggested_category 
    FOREIGN KEY (team_id, suggested_category_slug)
    REFERENCES public.transaction_categories(team_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_transaction_enrichments_transaction_id 
  ON public.transaction_enrichments (transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_enrichments_reviewed 
  ON public.transaction_enrichments (reviewed)
  WHERE reviewed = false;
