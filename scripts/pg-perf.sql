-- Enable pg_stat_statements if available (ignore error if already enabled)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Postgres 14+ uses total_exec_time / mean_exec_time
SELECT
  ROUND((total_exec_time/1000.0/60.0)::numeric, 2) AS total_minutes,
  ROUND((mean_exec_time)::numeric, 2)              AS ms_per_call,
  calls,
  rows,
  LEFT(query, 400)                 AS query
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

SELECT
  ROUND((mean_exec_time)::numeric, 2) AS ms_per_call,
  calls,
  rows,
  LEFT(query, 400)        AS query
FROM pg_stat_statements
WHERE calls >= 5
ORDER BY mean_exec_time DESC
LIMIT 20;

SELECT
  calls,
  ROUND((total_exec_time)::numeric, 2) AS total_ms,
  rows,
  LEFT(query, 400)         AS query
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 20;

-- 4) Index vs seq scan balance per table
SELECT
  relname                            AS table,
  seq_scan,
  idx_scan,
  n_live_tup,
  (CASE WHEN (seq_scan + idx_scan) > 0 THEN ROUND(idx_scan::numeric * 100 / (seq_scan + idx_scan),2) ELSE 0 END) AS idx_pct
FROM pg_stat_user_tables
ORDER BY (seq_scan - idx_scan) DESC
LIMIT 30;

-- 5) Unused indexes (candidate cleanup). Keep for at least a week before removing.
SELECT
  schemaname,
  relname       AS table,
  indexrelname  AS index,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY relname, indexrelname;

-- 6) Largest tables
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid))       AS table_size,
  pg_size_pretty(pg_indexes_size(relid))        AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 7) Vacuum/analyze recency (maintenance health)
SELECT
  relname AS table,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY GREATEST(COALESCE(EXTRACT(EPOCH FROM now() - last_autovacuum),0), COALESCE(EXTRACT(EPOCH FROM now() - last_autoanalyze),0)) DESC
LIMIT 20;

-- 8) Optional: reset stats window (run only when starting a measurement period)
-- SELECT pg_stat_statements_reset();
