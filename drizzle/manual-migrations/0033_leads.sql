-- Create leads table for sales pipeline, scoped by team
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  thread_id uuid references public.communication_threads(id) on delete set null,
  customer_id uuid references public.clients(id) on delete set null,
  owner_user_id uuid references public.users(id) on delete set null,
  source varchar(32) not null, -- whatsapp|instagram|email|telegram
  status varchar(32) not null default 'new', -- new|interested|qualified|converted|lost
  score integer not null default 0,
  qualification varchar(16) not null default 'cold', -- hot|warm|cold
  message_count integer not null default 0,
  last_interaction_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_leads_team on public.leads(team_id);
create index if not exists idx_leads_team_status on public.leads(team_id, status);
create index if not exists idx_leads_team_score on public.leads(team_id, score);
create index if not exists idx_leads_last_interaction on public.leads(team_id, last_interaction_at, id);
create unique index if not exists uq_leads_team_thread on public.leads(team_id, thread_id);

-- Note: RLS policies should be managed centrally; ensure RLS is enabled for this table in Supabase
-- and that policies scope by team_id.
