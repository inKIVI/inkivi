create extension if not exists pgcrypto;

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  release_date timestamptz not null,
  type text default 'single',
  cover_url text,
  source_url text,
  presave_url text,
  platforms jsonb not null default '{}'::jsonb,
  tracklist jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visuals (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  title text,
  preview_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table releases enable row level security;
alter table visuals enable row level security;
alter table site_settings enable row level security;

drop policy if exists "public read releases" on releases;
drop policy if exists "public read visuals" on visuals;
drop policy if exists "public read settings" on site_settings;
drop policy if exists "admin write releases" on releases;
drop policy if exists "admin write visuals" on visuals;
drop policy if exists "admin write settings" on site_settings;

create policy "public read releases" on releases for select using (published = true or auth.role() = 'authenticated');
create policy "public read visuals" on visuals for select using (published = true or auth.role() = 'authenticated');
create policy "public read settings" on site_settings for select using (true);

create policy "admin write releases" on releases for all to authenticated using (true) with check (true);
create policy "admin write visuals" on visuals for all to authenticated using (true) with check (true);
create policy "admin write settings" on site_settings for all to authenticated using (true) with check (true);
