-- Apply AFTER schema.sql, before deploying the knowledge-feed update.
-- Safe to rerun. No existing articles or patient records are removed.
begin;

alter table public.articles add column if not exists media jsonb not null default '[]'::jsonb;
alter table public.articles add column if not exists "viewCount" bigint not null default 0;
alter table public.articles add column if not exists excerpt text generated always as (left(body, 360)) stored;

-- Guest readers can fetch post content, but never private author email addresses.
revoke select on public.articles from public, anon, authenticated;
revoke select ("authorEmail") on public.articles from public, anon, authenticated;
grant select (id, title, body, excerpt, media, "viewCount", "createdAt", "updatedAt") on public.articles to anon, authenticated;
revoke insert, update, delete on public.articles from anon;
grant insert, update, delete on public.articles to authenticated;

-- Keep publication rights tied to the staff allowlist even if signup is enabled.
drop policy if exists "only authenticated users can write articles" on public.articles;
drop policy if exists "staff can write articles" on public.articles;
create policy "staff can write articles" on public.articles
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-media', 'article-media', true, 31457280,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload article media" on storage.objects;
drop policy if exists "staff read article media metadata" on storage.objects;
drop policy if exists "staff delete article media" on storage.objects;
create policy "staff upload article media" on storage.objects for insert to authenticated
  with check (bucket_id = 'article-media' and (select public.is_staff())
    and name ~ '^[a-zA-Z0-9-]+\.(jpg|png|webp|mp4|webm)$');
create policy "staff read article media metadata" on storage.objects for select to authenticated
  using (bucket_id = 'article-media' and (select public.is_staff()));
create policy "staff delete article media" on storage.objects for delete to authenticated
  using (bucket_id = 'article-media' and (select public.is_staff()));

create or replace function public.validate_article_media() returns trigger
language plpgsql security definer set search_path = '' as $$
declare attachment jsonb;
begin
  if length(trim(new.title)) = 0 or length(new.title) > 160
    or length(trim(new.body)) = 0 or length(new.body) > 30000 then
    raise exception 'Invalid article title or content';
  end if;
  if jsonb_typeof(new.media) <> 'array' or jsonb_array_length(new.media) > 4 then
    raise exception 'Up to four media attachments are allowed';
  end if;
  if (select count(distinct item->>'path') from jsonb_array_elements(new.media) item) <> jsonb_array_length(new.media) then
    raise exception 'Media paths must be unique';
  end if;
  for attachment in select * from jsonb_array_elements(new.media) loop
    if jsonb_typeof(attachment) <> 'object'
      or coalesce(attachment->>'kind', '') not in ('image', 'video')
      or coalesce(attachment->>'path', '') !~ '^[a-zA-Z0-9-]+\.(jpg|png|webp|mp4|webm)$'
      or jsonb_typeof(attachment->'alt') is distinct from 'string'
      or length(attachment->>'alt') > 300
      or (attachment->>'kind' = 'image' and length(trim(attachment->>'alt')) = 0) then
      raise exception 'Invalid media attachment or missing image description';
    end if;
    if not exists (
      select 1 from storage.objects o where o.bucket_id = 'article-media' and o.name = attachment->>'path'
      and ((attachment->>'kind' = 'image' and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp') and (o.metadata->>'size')::bigint <= 8388608)
        or (attachment->>'kind' = 'video' and o.metadata->>'mimetype' in ('video/mp4', 'video/webm')))
    ) then raise exception 'Upload media before publishing'; end if;
  end loop;
  if tg_op = 'INSERT' then
    new."authorEmail" = (select email from auth.users where id = auth.uid());
  else
    new."authorEmail" = old."authorEmail";
  end if;
  return new;
end $$;
revoke all on function public.validate_article_media() from public;
drop trigger if exists validate_article_media on public.articles;
create trigger validate_article_media before insert or update of title, body, media on public.articles
  for each row execute function public.validate_article_media();

create index if not exists articles_media_idx on public.articles using gin (media jsonb_path_ops);
create index if not exists articles_feed_order_idx on public.articles ("createdAt" desc, id asc);

create table if not exists public.article_readers (
  article_id text not null references public.articles(id) on delete cascade,
  visitor_id uuid not null,
  view_day date not null,
  primary key (article_id, visitor_id, view_day)
);
alter table public.article_readers enable row level security;
revoke all on public.article_readers from public, anon, authenticated;
create index if not exists article_readers_day_idx on public.article_readers (view_day);

create or replace function public.record_article_view(article_id text, visitor_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare inserted integer; total bigint;
begin
  if $2 is null then raise exception 'Reader ID required'; end if;
  if not exists (select 1 from public.articles a where a.id = $1) then raise exception 'Post not found'; end if;
  insert into public.article_readers (article_id, visitor_id, view_day)
    values ($1, $2, (now() at time zone 'UTC')::date) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    update public.articles a set "viewCount" = a."viewCount" + 1 where a.id = $1;
  end if;
  select a."viewCount" into total from public.articles a where a.id = $1;
  return total;
end $$;
revoke all on function public.record_article_view(text, uuid) from public;
grant execute on function public.record_article_view(text, uuid) to anon, authenticated;

create or replace function public.feed_stats() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('posts', count(*), 'views', coalesce(sum("viewCount"), 0)) from public.articles;
$$;
revoke all on function public.feed_stats() from public;
grant execute on function public.feed_stats() to anon, authenticated;

commit;
