begin;

create extension if not exists pgcrypto;

create table if not exists public.player_bid_events (
  id uuid primary key default gen_random_uuid(),
  auction_state_id uuid not null references public.auction_state(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  franchise_code text not null references public.franchises(code) on delete cascade,
  bid_lakhs integer not null check (bid_lakhs >= 0),
  created_at timestamptz not null default now()
);

create index if not exists player_bid_events_player_idx
  on public.player_bid_events(player_id, bid_lakhs desc, created_at asc);

alter table public.player_bid_events enable row level security;

-- Read access for all clients to render live bid boards.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_bid_events'
      and policyname = 'public_can_read_player_bid_events'
  ) then
    create policy "public_can_read_player_bid_events"
      on public.player_bid_events
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

commit;
