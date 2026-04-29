-- Feedback system tables, votes, RLS, triggers, and the storage bucket
-- for screenshots/attachments. Role + is_admin live in 003_user_roles.

-- ── Status enum ────────────────────────────────────────────────
do $$ begin
  create type public.feedback_status as enum ('backlog', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

-- ── Feedback table ─────────────────────────────────────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (length(subject) between 3 and 200),
  message text not null check (length(message) between 5 and 5000),
  status public.feedback_status not null default 'backlog',
  attachments jsonb not null default '[]'::jsonb,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_status_idx on public.feedback(status);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
create index if not exists feedback_user_idx on public.feedback(user_id);
create index if not exists feedback_votes_idx on public.feedback(vote_count desc);

-- ── Votes (one per user per item) ──────────────────────────────
create table if not exists public.feedback_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feedback_id, user_id)
);

create index if not exists feedback_votes_user_idx on public.feedback_votes(user_id);

-- ── Triggers ───────────────────────────────────────────────────

-- Maintain vote_count atomically.
create or replace function public.update_feedback_vote_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    update public.feedback set vote_count = vote_count + 1 where id = new.feedback_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feedback set vote_count = vote_count - 1 where id = old.feedback_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists feedback_vote_count_trg on public.feedback_votes;
create trigger feedback_vote_count_trg
  after insert or delete on public.feedback_votes
  for each row execute function public.update_feedback_vote_count();

-- Touch updated_at on every row update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists feedback_touch_updated_at on public.feedback;
create trigger feedback_touch_updated_at
  before update on public.feedback
  for each row execute function public.touch_updated_at();

-- (is_admin() lives in 003_user_roles.sql)

-- Defense-in-depth: stop non-admins changing status server-side even if
-- somebody bypasses the UI. Also lock vote_count + author + created_at.
create or replace function public.feedback_guard_update()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.status is distinct from new.status and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change feedback status';
  end if;
  new.vote_count := old.vote_count;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists feedback_guard_update_trg on public.feedback;
create trigger feedback_guard_update_trg
  before update on public.feedback
  for each row execute function public.feedback_guard_update();

-- ── RLS ────────────────────────────────────────────────────────
alter table public.feedback enable row level security;
alter table public.feedback_votes enable row level security;

drop policy if exists "feedback read" on public.feedback;
create policy "feedback read" on public.feedback for select using (true);

drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own" on public.feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "feedback update author or admin" on public.feedback;
create policy "feedback update author or admin" on public.feedback for update
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "feedback delete author or admin" on public.feedback;
create policy "feedback delete author or admin" on public.feedback for delete
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "votes read" on public.feedback_votes;
create policy "votes read" on public.feedback_votes for select using (true);

drop policy if exists "votes insert own" on public.feedback_votes;
create policy "votes insert own" on public.feedback_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "votes delete own" on public.feedback_votes;
create policy "votes delete own" on public.feedback_votes for delete
  using (auth.uid() = user_id);

-- ── Storage bucket for attachments ─────────────────────────────
-- Public read so we can use stable getPublicUrl() for image previews.
-- Upload restricted to authenticated users into their own UUID folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('feedback-attachments', 'feedback-attachments', true, 10485760)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "feedback attachments upload own folder" on storage.objects;
create policy "feedback attachments upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "feedback attachments delete own or admin" on storage.objects;
create policy "feedback attachments delete own or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'feedback-attachments'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid()))
  );

-- (Banjo's admin promotion lives in 003_user_roles.sql)
