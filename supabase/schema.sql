-- ACHIEVE — Covenant Circle backend
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY MODEL — read this before you trust it with anything.
--
-- There are no user accounts. A circle is reached by knowing its code, which
-- is a 16-character random string (31^16 ≈ 4.6 × 10^23 possibilities). This
-- is the "secret link" model: possession of the code IS the authorisation.
--
-- The important consequence is that the tables must NEVER be readable
-- directly with the anon key. If they were, anyone holding the publishable
-- key could run `select * from messages` and read every circle on the
-- server. So:
--
--   • RLS is enabled and DENIES everything by default.
--   • The anon role has NO table privileges at all.
--   • All access goes through SECURITY DEFINER functions that REQUIRE the
--     circle code as an argument.
--
-- That means an attacker must guess a 16-character code to read anything,
-- rather than simply omitting a filter.
--
-- What this still does NOT protect against:
--   • Anyone you give the code to can read that circle's messages and
--     members, and can post as any display name. Share codes accordingly.
--   • Messages are not end-to-end encrypted; a database administrator can
--     read them.
--   • Your private Why is never sent here at all — it never leaves the
--     device. That is enforced in the client, in state.js.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── tables ───────────────────────────────────────────────────────────────

create table if not exists public.circles (
  code        text primary key,
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  circle_code  text not null references public.circles(code) on delete cascade,
  player_id    text not null,
  display_name text not null default 'A runner',
  new_name     text,
  snapshot     jsonb not null default '{}'::jsonb,
  joined_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (circle_code, player_id)
);

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  circle_code  text not null references public.circles(code) on delete cascade,
  player_id    text not null,
  display_name text not null default 'A runner',
  new_name     text,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists messages_circle_time_idx
  on public.messages (circle_code, created_at desc);

-- ── lock everything down ─────────────────────────────────────────────────

alter table public.circles  enable row level security;
alter table public.members  enable row level security;
alter table public.messages enable row level security;

-- No policies are created, so RLS denies all direct access. Belt and braces:
-- strip the privileges too, so a future permissive policy cannot open a hole.
revoke all on public.circles  from anon, authenticated;
revoke all on public.members  from anon, authenticated;
revoke all on public.messages from anon, authenticated;

-- ── the only way in: code-gated functions ────────────────────────────────

-- Codes must look like codes. Rejects empty-string probing.
create or replace function public.assert_code(p_code text)
returns text
language plpgsql
immutable
as $$
begin
  if p_code is null or length(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) < 12 then
    raise exception 'invalid circle code';
  end if;
  return upper(p_code);
end;
$$;

create or replace function public.join_circle(
  p_code text,
  p_player_id text,
  p_display_name text,
  p_new_name text default null,
  p_snapshot jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := assert_code(p_code);

  insert into circles (code) values (v_code)
    on conflict (code) do nothing;

  insert into members (circle_code, player_id, display_name, new_name, snapshot, updated_at)
    values (v_code, p_player_id, coalesce(p_display_name, 'A runner'), p_new_name, coalesce(p_snapshot, '{}'::jsonb), now())
    on conflict (circle_code, player_id) do update
      set display_name = excluded.display_name,
          new_name     = excluded.new_name,
          snapshot     = excluded.snapshot,
          updated_at   = now();
end;
$$;

create or replace function public.leave_circle(p_code text, p_player_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := assert_code(p_code);
  delete from members where circle_code = v_code and player_id = p_player_id;
end;
$$;

create or replace function public.get_members(p_code text)
returns table (
  player_id text, display_name text, new_name text,
  snapshot jsonb, joined_at timestamptz, updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := assert_code(p_code);
  return query
    select m.player_id, m.display_name, m.new_name, m.snapshot, m.joined_at, m.updated_at
    from members m
    where m.circle_code = v_code
    order by m.joined_at asc
    limit 200;
end;
$$;

create or replace function public.get_messages(p_code text, p_limit int default 200)
returns table (
  id uuid, player_id text, display_name text,
  new_name text, body text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_code text;
begin
  v_code := assert_code(p_code);
  return query
    select t.id, t.player_id, t.display_name, t.new_name, t.body, t.created_at
    from (
      select m.* from messages m
      where m.circle_code = v_code
      order by m.created_at desc
      limit least(coalesce(p_limit, 200), 300)
    ) t
    order by t.created_at asc;
end;
$$;

create or replace function public.post_message(
  p_code text,
  p_player_id text,
  p_display_name text,
  p_body text,
  p_new_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
  v_recent int;
begin
  v_code := assert_code(p_code);

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty message';
  end if;

  -- Cheap flood control: 20 messages per player per minute.
  select count(*) into v_recent
  from messages
  where circle_code = v_code
    and player_id = p_player_id
    and created_at > now() - interval '1 minute';

  if v_recent >= 20 then
    raise exception 'slow down';
  end if;

  insert into messages (circle_code, player_id, display_name, new_name, body)
    values (v_code, p_player_id, coalesce(p_display_name, 'A runner'), p_new_name, left(p_body, 2000))
    returning id into v_id;

  return v_id;
end;
$$;

-- Grant execute on the functions only. This is the entire public surface.
grant execute on function public.join_circle(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.leave_circle(text, text)                   to anon, authenticated;
grant execute on function public.get_members(text)                          to anon, authenticated;
grant execute on function public.get_messages(text, int)                    to anon, authenticated;
grant execute on function public.post_message(text, text, text, text, text) to anon, authenticated;

-- assert_code is an internal helper; nobody needs to call it directly.
revoke all on function public.assert_code(text) from anon, authenticated;

-- ── optional housekeeping ────────────────────────────────────────────────
-- Uncomment to drop circles that nobody has touched in 180 days.
--
-- create or replace function public.prune_dead_circles() returns void
-- language sql security definer set search_path = public as $$
--   delete from circles c
--   where not exists (
--     select 1 from members m where m.circle_code = c.code and m.updated_at > now() - interval '180 days'
--   );
-- $$;
