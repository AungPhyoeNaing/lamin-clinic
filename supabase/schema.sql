-- Run this in the Supabase SQL editor to create the tables used by the app.

create table if not exists public.visits (
  id text primary key,
  date text not null,
  "patientName" text not null,
  age int,
  diagnosis text,
  fee numeric not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

create table if not exists public.articles (
  id text primary key,
  title text not null,
  body text not null,
  "authorEmail" text,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

-- Public read for articles (guest feed); visits readable only by authenticated users (doctor).
alter table public.articles enable row level security;
alter table public.visits enable row level security;

-- Only project administrators can maintain this allowlist through the SQL editor.
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.staff enable row level security;
revoke all on public.staff from anon, authenticated;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.staff where user_id = (select auth.uid())); $$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

drop policy if exists "articles are publicly readable" on public.articles;
drop policy if exists "only authenticated users can write articles" on public.articles;
drop policy if exists "only authenticated users can access visits" on public.visits;
drop policy if exists "staff can write articles" on public.articles;
drop policy if exists "staff can access visits" on public.visits;

create policy "articles are publicly readable" on public.articles
  for select using (true);

create policy "staff can write articles" on public.articles
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "staff can access visits" on public.visits
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create index if not exists visits_date_created_id_idx on public.visits (date, "createdAt", id);
create index if not exists articles_created_id_idx on public.articles ("createdAt" desc, id);

-- NOT VALID preserves legacy rows while checking all subsequent inserts and updates.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.visits'::regclass and conname = 'visits_valid_values') then
    alter table public.visits add constraint visits_valid_values check (
      date ~ '^\d{4}-\d{2}-\d{2}$' and to_char(date::date, 'YYYY-MM-DD') = date
      and length(trim("patientName")) > 0 and diagnosis is not null
      and (age is null or age between 0 and 130)
      and fee >= 0 and fee <= 9007199254740991 and fee = trunc(fee)
      and "createdAt" >= 0 and "updatedAt" >= "createdAt"
    ) not valid;
  end if;
end $$;

-- One transaction; concurrent edits newer than the backup win at conflict time.
create or replace function public.restore_visits(records jsonb) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare imported integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  insert into public.visits (id, date, "patientName", age, diagnosis, fee, "createdAt", "updatedAt")
  select id, date, "patientName", age, diagnosis, fee, "createdAt", "updatedAt"
  from jsonb_populate_recordset(null::public.visits, records)
  on conflict (id) do update set
    date = excluded.date, "patientName" = excluded."patientName", age = excluded.age,
    diagnosis = excluded.diagnosis, fee = excluded.fee,
    "createdAt" = excluded."createdAt", "updatedAt" = excluded."updatedAt"
  where excluded."updatedAt" > public.visits."updatedAt";
  get diagnostics imported = row_count;
  return imported;
end $$;
revoke all on function public.restore_visits(jsonb) from public;
grant execute on function public.restore_visits(jsonb) to authenticated;

-- Next, run supabase/feed.sql for knowledge-feed media and view counters.
