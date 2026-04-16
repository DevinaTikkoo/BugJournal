-- Run this in Supabase SQL Editor.
-- Creates comment threads for bug entries.

create extension if not exists pgcrypto;

create table if not exists public.bug_entry_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.bug_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bug_entry_comments_body_not_empty check (char_length(trim(body)) > 0)
);

create index if not exists bug_entry_comments_entry_id_idx
  on public.bug_entry_comments(entry_id, created_at);

create index if not exists bug_entry_comments_user_id_idx
  on public.bug_entry_comments(user_id);

create or replace function public.set_bug_entry_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bug_entry_comments_set_updated_at
  on public.bug_entry_comments;

create trigger bug_entry_comments_set_updated_at
before update on public.bug_entry_comments
for each row
execute function public.set_bug_entry_comment_updated_at();

alter table public.bug_entry_comments enable row level security;

-- Any authenticated user can read comments for entries they can view in-app.
drop policy if exists "comments_select_authenticated" on public.bug_entry_comments;
create policy "comments_select_authenticated"
  on public.bug_entry_comments
  for select
  to authenticated
  using (true);

-- Users can only create comments as themselves.
drop policy if exists "comments_insert_own_user" on public.bug_entry_comments;
create policy "comments_insert_own_user"
  on public.bug_entry_comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own comments.
drop policy if exists "comments_update_own" on public.bug_entry_comments;
create policy "comments_update_own"
  on public.bug_entry_comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own comments.
drop policy if exists "comments_delete_own" on public.bug_entry_comments;
create policy "comments_delete_own"
  on public.bug_entry_comments
  for delete
  to authenticated
  using (auth.uid() = user_id);
