-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Used by the Vercel /api routes with SUPABASE_SERVICE_ROLE_KEY only.

create table if not exists public.visibility_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null default '',
  fn text not null default '',
  subj text not null default '',
  topic text not null default '',
  niche text not null default '',
  loc text not null default ''
);

create index if not exists visibility_submissions_created_at_idx
  on public.visibility_submissions (created_at desc);

create table if not exists public.admin_kv (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Optional: lock tables to service role only (anon/authenticated have no policies).
alter table public.visibility_submissions enable row level security;
alter table public.admin_kv enable row level security;

-- No policies: only the service role key (used on Vercel) bypasses RLS.
