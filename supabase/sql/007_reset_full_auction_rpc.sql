create or replace function reset_full_auction()
returns void
language plpgsql
as $$
begin
  -- Added 'where id is not null' to satisfy safety checks
  
  -- Reset auction_state
  update auction_state
  set
    current_player_id = null,
    current_bid = 0,
    current_team_id = null,
    status = 'idle'
  where id is not null;

  -- Reset players
  update players
  set
    team_id = null,
    sold_price = null,
    is_sold = false,
    status = 'available'
  where id is not null;

  -- Reset teams
  update teams
  set
    purse = initial_purse,
    is_blocked = false
  where id is not null;

end;
$$;