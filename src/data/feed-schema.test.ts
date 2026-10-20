/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const staff = '11111111-1111-4111-8111-111111111111'
const guestAccount = '22222222-2222-4222-8222-222222222222'
const reader = '33333333-3333-4333-8333-333333333333'
let db: PGlite
const role = async (name: 'anon' | 'authenticated', uid = '') => {
  await db.exec(`reset role; set role ${name}`)
  await db.query("select set_config('test.uid', $1, false)", [uid])
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth, storage, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (bucket_id text, name text, metadata jsonb);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    insert into auth.users values ('${staff}', 'doctor@example.com'), ('${guestAccount}', 'guest@example.com');
  `)
  const schema = await readFile(new URL('../../supabase/schema.sql', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../../supabase/feed.sql', import.meta.url), 'utf8')
  await db.exec(schema)
  await db.exec(migration)
  await db.exec(migration) // Existing deployments must be able to rerun it.
  await db.query('insert into public.staff values ($1)', [staff])
  await db.exec(`insert into public.articles (id, title, body, "createdAt", "updatedAt") values ('post', 'An article', 'Article content', 1, 1)`)
}, 30000)

afterAll(async () => { await db?.close() })
beforeEach(async () => { await db.exec('reset role'); await db.query("select set_config('test.uid', '', false)") })

describe('feed SQL permissions and counters (real PostgreSQL)', () => {
  it('lets guests read posts but hides private author email', async () => {
    await role('anon')
    expect((await db.query('select id, title, media, "viewCount" from public.articles')).rows).toHaveLength(1)
    await expect(db.query('select "authorEmail" from public.articles')).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from public.article_readers')).rejects.toThrow(/permission denied/)
  })
  it('rejects guest publication, edits, deletion, and media uploads', async () => {
    await role('anon')
    await expect(db.exec(`insert into public.articles (id,title,body,"createdAt","updatedAt") values ('bad','Title','Body',1,1)`)).rejects.toThrow(/permission denied/)
    await expect(db.exec(`update public.articles set title='Changed' where id='post'`)).rejects.toThrow(/permission denied/)
    await expect(db.exec(`delete from public.articles where id='post'`)).rejects.toThrow(/permission denied/)
    await expect(db.exec(`insert into storage.objects values ('article-media','bad.jpg','{}')`)).rejects.toThrow(/row-level security/)
  })
  it('rejects signed-in nonstaff while allowing approved staff', async () => {
    await role('authenticated', guestAccount)
    await expect(db.exec(`insert into public.articles (id,title,body,"createdAt","updatedAt") values ('bad','Title','Body',1,1)`)).rejects.toThrow(/row-level security/)
    await expect(db.exec(`insert into storage.objects values ('article-media','bad.jpg','{}')`)).rejects.toThrow(/row-level security/)
    await db.exec(`update public.articles set title='Unauthorized' where id='post'; delete from public.articles where id='post'`)
    expect((await db.query<{ title: string }>(`select title from public.articles where id='post'`)).rows[0].title).toBe('An article')
    await role('authenticated', staff)
    await db.exec(`insert into public.articles (id,title,body,"createdAt","updatedAt") values ('staff-post','Staff article','Body',1,1)`)
    expect((await db.query(`select id from public.articles where id='staff-post'`)).rows).toHaveLength(1)
    await db.exec(`delete from public.articles where id='staff-post'`)
  })
  it('increments atomically, deduplicates browser/day, and exposes only aggregate stats', async () => {
    await role('anon')
    expect((await db.query<{ count: number }>('select public.record_article_view($1,$2) as count', ['post', reader])).rows[0].count).toBe(1)
    expect((await db.query<{ count: number }>('select public.record_article_view($1,$2) as count', ['post', reader])).rows[0].count).toBe(1)
    const second = '44444444-4444-4444-8444-444444444444'
    expect((await db.query<{ count: number }>('select public.record_article_view($1,$2) as count', ['post', second])).rows[0].count).toBe(2)
    expect((await db.query<{ stats: { posts: number; views: number } }>('select public.feed_stats() as stats')).rows[0].stats).toEqual({ posts: 1, views: 2 })
    await expect(db.query('select public.record_article_view($1,$2)', ['missing', reader])).rejects.toThrow('Post not found')
  })
  it('requires real uploaded media and accessible image descriptions', async () => {
    await role('authenticated', staff)
    const media = [{ path: 'test-photo.webp', url: 'https://example.com/test.webp', kind: 'image', alt: 'A leaf' }]
    await expect(db.query(`insert into public.articles (id,title,body,media,"createdAt","updatedAt") values ('photo-post','Photo','Body',$1,1,1)`, [JSON.stringify(media)])).rejects.toThrow('Upload media')
    await db.exec(`insert into storage.objects values ('article-media','test-photo.webp','{"mimetype":"image/webp","size":1000}')`)
    await db.query(`insert into public.articles (id,title,body,media,"createdAt","updatedAt") values ('photo-post','Photo','Body',$1,1,1)`, [JSON.stringify(media)])
    await expect(db.query(`update public.articles set media=$1 where id='photo-post'`, [JSON.stringify([{ ...media[0], alt: '' }])])).rejects.toThrow('missing image description')
    await db.exec(`delete from public.articles where id='photo-post'`)
  })
})
