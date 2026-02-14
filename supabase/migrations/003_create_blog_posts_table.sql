begin;

create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content text not null default '',
  cover_image_url text,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_status_check check (status in ('draft', 'published'))
);

create index if not exists idx_blog_posts_status_published_at
  on public.blog_posts(status, published_at desc);

create index if not exists idx_blog_posts_author_updated_at
  on public.blog_posts(author_id, updated_at desc);

create index if not exists idx_blog_posts_slug
  on public.blog_posts(slug);

alter table public.blog_posts enable row level security;

drop policy if exists "Anyone can read published posts" on public.blog_posts;
create policy "Anyone can read published posts"
  on public.blog_posts
  for select
  using (status = 'published' or auth.uid() = author_id);

drop policy if exists "Users can insert own blog posts" on public.blog_posts;
create policy "Users can insert own blog posts"
  on public.blog_posts
  for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users can update own blog posts" on public.blog_posts;
create policy "Users can update own blog posts"
  on public.blog_posts
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete own blog posts" on public.blog_posts;
create policy "Users can delete own blog posts"
  on public.blog_posts
  for delete
  using (auth.uid() = author_id);

create or replace function public.touch_blog_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_blog_posts_updated_at on public.blog_posts;
create trigger trg_touch_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.touch_blog_posts_updated_at();

commit;

