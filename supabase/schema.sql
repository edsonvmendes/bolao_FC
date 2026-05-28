create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text not null,
  phone text,
  favorite_team text,
  avatar_url text,
  role text not null default 'participant' check (role in ('participant', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  entry_fee numeric(10,2) not null default 0 check (entry_fee >= 0),
  currency text not null default 'BRL',
  status text not null default 'setup' check (status in ('setup', 'open', 'locked', 'finished')),
  prize_first_percent numeric(5,2) not null default 70,
  prize_second_percent numeric(5,2) not null default 20,
  prize_third_percent numeric(5,2) not null default 10,
  deadline_type text not null default 'per_match' check (deadline_type in ('per_match', 'global')),
  minutes_before_match int not null default 30 check (minutes_before_match >= 0),
  global_deadline timestamptz,
  allow_predictions_without_payment boolean not null default true,
  show_predictions_after_deadline boolean not null default true,
  ranking_is_public boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prize_split_100 check (
    prize_first_percent + prize_second_percent + prize_third_percent = 100
  )
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  payment_amount numeric(10,2),
  payment_confirmed_by uuid references public.profiles(id),
  payment_confirmed_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pool_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_pt text not null,
  country_code text not null unique,
  confederation text,
  flag_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  phase text not null default 'group_stage',
  group_name text,
  round_number int,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  match_datetime timestamptz not null,
  prediction_deadline timestamptz,
  home_score int check (home_score is null or home_score >= 0),
  away_score int check (away_score is null or away_score >= 0),
  winner_team_id uuid references public.teams(id),
  qualified_team_id uuid references public.teams(id),
  status text not null default 'scheduled' check (status in ('scheduled', 'locked', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_teams check (home_team_id <> away_team_id)
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  predicted_home_score int not null check (predicted_home_score >= 0),
  predicted_away_score int not null check (predicted_away_score >= 0),
  predicted_winner_team_id uuid references public.teams(id),
  predicted_qualified_team_id uuid references public.teams(id),
  points int not null default 0,
  exact_score_hit boolean not null default false,
  outcome_hit boolean not null default false,
  one_team_score_hits int not null default 0,
  goal_difference_hit boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, participant_id)
);

create table if not exists public.special_predictions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  champion_team_id uuid references public.teams(id),
  runner_up_team_id uuid references public.teams(id),
  semifinalist_1_team_id uuid references public.teams(id),
  semifinalist_2_team_id uuid references public.teams(id),
  semifinalist_3_team_id uuid references public.teams(id),
  semifinalist_4_team_id uuid references public.teams(id),
  top_scorer text,
  points int not null default 0,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pool_id, participant_id)
);

create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade unique,
  exact_score_points int not null default 10,
  outcome_points int not null default 5,
  one_team_score_points int not null default 2,
  goal_difference_points int not null default 2,
  qualified_team_points int not null default 5,
  champion_points int not null default 30,
  runner_up_points int not null default 20,
  semifinalist_points int not null default 10,
  top_scorer_points int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists pools_touch_updated_at on public.pools;
create trigger pools_touch_updated_at before update on public.pools
for each row execute function public.touch_updated_at();

drop trigger if exists participants_touch_updated_at on public.participants;
create trigger participants_touch_updated_at before update on public.participants
for each row execute function public.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at before update on public.matches
for each row execute function public.touch_updated_at();

drop trigger if exists predictions_touch_updated_at on public.predictions;
create trigger predictions_touch_updated_at before update on public.predictions
for each row execute function public.touch_updated_at();

drop trigger if exists special_predictions_touch_updated_at on public.special_predictions;
create trigger special_predictions_touch_updated_at before update on public.special_predictions
for each row execute function public.touch_updated_at();

drop trigger if exists scoring_rules_touch_updated_at on public.scoring_rules;
create trigger scoring_rules_touch_updated_at before update on public.scoring_rules
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nickname, phone, favorite_team)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'favorite_team'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.match_prediction_deadline(match_row public.matches)
returns timestamptz
language sql
stable
as $$
  select coalesce(
    match_row.prediction_deadline,
    case
      when p.deadline_type = 'global' then p.global_deadline
      else match_row.match_datetime - make_interval(mins => p.minutes_before_match)
    end,
    match_row.match_datetime
  )
  from public.pools p
  where p.id = match_row.pool_id;
$$;

create or replace function public.calculate_match_points(
  predicted_home int,
  predicted_away int,
  real_home int,
  real_away int,
  exact_points int,
  outcome_points int,
  one_team_points int,
  goal_diff_points int
)
returns table (
  points int,
  exact_score_hit boolean,
  outcome_hit boolean,
  one_team_score_hits int,
  goal_difference_hit boolean
)
language plpgsql
immutable
as $$
declare
  predicted_outcome int;
  real_outcome int;
begin
  if predicted_home = real_home and predicted_away = real_away then
    return query select exact_points, true, true, 2, true;
    return;
  end if;

  predicted_outcome := sign(predicted_home - predicted_away);
  real_outcome := sign(real_home - real_away);

  points := 0;
  exact_score_hit := false;
  outcome_hit := predicted_outcome = real_outcome;
  one_team_score_hits := 0;
  goal_difference_hit := (predicted_home - predicted_away) = (real_home - real_away);

  if outcome_hit then
    points := points + outcome_points;
  end if;
  if predicted_home = real_home then
    one_team_score_hits := one_team_score_hits + 1;
    points := points + one_team_points;
  end if;
  if predicted_away = real_away then
    one_team_score_hits := one_team_score_hits + 1;
    points := points + one_team_points;
  end if;
  if goal_difference_hit then
    points := points + goal_diff_points;
  end if;

  return next;
end;
$$;

create or replace function public.join_pool(target_pool_id uuid)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  participant_row public.participants;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into profile_row from public.profiles where id = auth.uid();
  if profile_row.id is null then
    raise exception 'profile_not_found';
  end if;

  insert into public.participants (pool_id, user_id, nickname)
  values (target_pool_id, auth.uid(), profile_row.nickname)
  on conflict (pool_id, user_id)
  do update set active = true, nickname = excluded.nickname
  returning * into participant_row;

  return participant_row;
end;
$$;

create or replace function public.save_my_predictions(
  target_pool_id uuid,
  predictions jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_row public.participants;
  item jsonb;
  match_row public.matches;
  item_match_id uuid;
  item_home_score int;
  item_away_score int;
  saved_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into participant_row
  from public.participants
  where pool_id = target_pool_id and user_id = auth.uid() and active = true;

  if participant_row.id is null then
    raise exception 'participant_not_found';
  end if;

  if exists (
    select 1 from public.pools p
    where p.id = target_pool_id
      and p.allow_predictions_without_payment = false
      and participant_row.payment_status <> 'paid'
  ) then
    raise exception 'payment_required';
  end if;

  for item in select * from jsonb_array_elements(predictions) loop
    item_match_id := (item->>'match_id')::uuid;
    item_home_score := (item->>'home_score')::int;
    item_away_score := (item->>'away_score')::int;

    if item_home_score is null or item_away_score is null or item_home_score < 0 or item_away_score < 0 then
      raise exception 'invalid_score';
    end if;

    select * into match_row
    from public.matches
    where id = item_match_id and pool_id = target_pool_id;

    if match_row.id is null then
      raise exception 'match_not_found';
    end if;

    if public.match_prediction_deadline(match_row) <= now() then
      raise exception 'prediction_deadline_closed';
    end if;

    insert into public.predictions (
      pool_id,
      match_id,
      participant_id,
      predicted_home_score,
      predicted_away_score
    )
    values (
      target_pool_id,
      item_match_id,
      participant_row.id,
      item_home_score,
      item_away_score
    )
    on conflict (match_id, participant_id)
    do update set
      predicted_home_score = excluded.predicted_home_score,
      predicted_away_score = excluded.predicted_away_score,
      updated_at = now();

    saved_count := saved_count + 1;
  end loop;

  return saved_count;
end;
$$;

create or replace function public.admin_set_payment(
  target_participant_id uuid,
  paid boolean
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_row public.participants;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  update public.participants
  set
    payment_status = case when paid then 'paid' else 'pending' end,
    payment_confirmed_by = case when paid then auth.uid() else null end,
    payment_confirmed_at = case when paid then now() else null end
  where id = target_participant_id
  returning * into participant_row;

  return participant_row;
end;
$$;

create or replace function public.admin_set_match_result(
  target_match_id uuid,
  home_goals int,
  away_goals int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;
  if home_goals < 0 or away_goals < 0 then
    raise exception 'invalid_score';
  end if;

  update public.matches
  set
    home_score = home_goals,
    away_score = away_goals,
    status = 'finished',
    winner_team_id = case
      when home_goals > away_goals then home_team_id
      when away_goals > home_goals then away_team_id
      else null
    end
  where id = target_match_id
  returning * into match_row;

  return match_row;
end;
$$;

create or replace function public.admin_recalculate_pool(target_pool_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  update public.predictions pr
  set
    points = calc.points,
    exact_score_hit = calc.exact_score_hit,
    outcome_hit = calc.outcome_hit,
    one_team_score_hits = calc.one_team_score_hits,
    goal_difference_hit = calc.goal_difference_hit,
    updated_at = now()
  from (
    select
      pr2.id as prediction_id,
      score.points,
      score.exact_score_hit,
      score.outcome_hit,
      score.one_team_score_hits,
      score.goal_difference_hit
    from public.predictions pr2
    join public.matches m on m.id = pr2.match_id
    join public.scoring_rules sr on sr.pool_id = m.pool_id
    cross join lateral public.calculate_match_points(
      pr2.predicted_home_score,
      pr2.predicted_away_score,
      m.home_score,
      m.away_score,
      sr.exact_score_points,
      sr.outcome_points,
      sr.one_team_score_points,
      sr.goal_difference_points
    ) score
    where pr2.pool_id = target_pool_id
      and m.home_score is not null
      and m.away_score is not null
  ) calc
  where pr.id = calc.prediction_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace view public.ranking_view as
select
  p.pool_id,
  p.id as participant_id,
  p.nickname,
  p.payment_status,
  coalesce(sum(pr.points), 0) + coalesce(sp.points, 0) as total_points,
  coalesce(sum(case when pr.exact_score_hit then 1 else 0 end), 0) as exact_score_hits,
  coalesce(sum(case when pr.outcome_hit then 1 else 0 end), 0) as outcome_hits,
  coalesce(sp.points, 0) as special_points,
  rank() over (
    partition by p.pool_id
    order by
      coalesce(sum(pr.points), 0) + coalesce(sp.points, 0) desc,
      coalesce(sum(case when pr.exact_score_hit then 1 else 0 end), 0) desc,
      coalesce(sum(case when pr.outcome_hit then 1 else 0 end), 0) desc,
      coalesce(sp.points, 0) desc,
      p.created_at asc
  ) as position
from public.participants p
left join public.predictions pr on pr.participant_id = p.id
left join public.special_predictions sp on sp.participant_id = p.id and sp.pool_id = p.pool_id
where p.active = true
group by p.pool_id, p.id, p.nickname, p.payment_status, sp.points, p.created_at;

alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.participants enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.special_predictions enable row level security;
alter table public.scoring_rules enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_limited on public.profiles;
create policy profiles_update_own_limited on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists pools_read_public_or_admin on public.pools;
create policy pools_read_public_or_admin on public.pools
for select using (ranking_is_public = true or public.is_admin());

drop policy if exists pools_admin_all on public.pools;
create policy pools_admin_all on public.pools
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists participants_read_restricted on public.participants;
create policy participants_read_restricted on public.participants
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.pools p
    where p.id = pool_id and p.ranking_is_public = true
  )
);

drop policy if exists participants_insert_own on public.participants;
create policy participants_insert_own on public.participants
for insert with check (user_id = auth.uid());

drop policy if exists participants_admin_update on public.participants;
create policy participants_admin_update on public.participants
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists teams_read_all on public.teams;
create policy teams_read_all on public.teams for select using (true);

drop policy if exists teams_admin_all on public.teams;
create policy teams_admin_all on public.teams
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists matches_read_all on public.matches;
create policy matches_read_all on public.matches for select using (true);

drop policy if exists matches_admin_all on public.matches;
create policy matches_admin_all on public.matches
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists predictions_read_own_or_after_deadline on public.predictions;
create policy predictions_read_own_or_after_deadline on public.predictions
for select using (
  public.is_admin()
  or exists (
    select 1 from public.participants pa
    where pa.id = participant_id and pa.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.matches m
    join public.pools po on po.id = m.pool_id
    where m.id = match_id
      and po.show_predictions_after_deadline = true
      and public.match_prediction_deadline(m) <= now()
  )
);

drop policy if exists predictions_insert_own_before_deadline on public.predictions;
create policy predictions_insert_own_before_deadline on public.predictions
for insert with check (
  exists (
    select 1
    from public.participants pa
    join public.matches m on m.id = match_id
    join public.pools po on po.id = pa.pool_id
    where pa.id = participant_id
      and pa.user_id = auth.uid()
      and pa.pool_id = predictions.pool_id
      and (po.allow_predictions_without_payment or pa.payment_status = 'paid')
      and public.match_prediction_deadline(m) > now()
  )
);

drop policy if exists predictions_update_own_before_deadline on public.predictions;
create policy predictions_update_own_before_deadline on public.predictions
for update using (
  exists (
    select 1
    from public.participants pa
    join public.matches m on m.id = match_id
    where pa.id = participant_id
      and pa.user_id = auth.uid()
      and public.match_prediction_deadline(m) > now()
  )
) with check (
  exists (
    select 1
    from public.participants pa
    join public.matches m on m.id = match_id
    where pa.id = participant_id
      and pa.user_id = auth.uid()
      and public.match_prediction_deadline(m) > now()
  )
);

drop policy if exists special_predictions_read_own_or_admin on public.special_predictions;
create policy special_predictions_read_own_or_admin on public.special_predictions
for select using (
  public.is_admin()
  or exists (
    select 1 from public.participants pa
    where pa.id = participant_id and pa.user_id = auth.uid()
  )
);

drop policy if exists special_predictions_write_own on public.special_predictions;
create policy special_predictions_write_own on public.special_predictions
for all using (
  exists (
    select 1 from public.participants pa
    where pa.id = participant_id and pa.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.participants pa
    where pa.id = participant_id and pa.user_id = auth.uid()
  )
);

drop policy if exists scoring_rules_read_all on public.scoring_rules;
create policy scoring_rules_read_all on public.scoring_rules for select using (true);

drop policy if exists scoring_rules_admin_all on public.scoring_rules;
create policy scoring_rules_admin_all on public.scoring_rules
for all using (public.is_admin()) with check (public.is_admin());

revoke all on function public.admin_set_payment(uuid, boolean) from anon, authenticated;
revoke all on function public.admin_set_match_result(uuid, int, int) from anon, authenticated;
revoke all on function public.admin_recalculate_pool(uuid) from anon, authenticated;
grant execute on function public.join_pool(uuid) to authenticated;
grant execute on function public.save_my_predictions(uuid, jsonb) to authenticated;
grant execute on function public.admin_set_payment(uuid, boolean) to authenticated;
grant execute on function public.admin_set_match_result(uuid, int, int) to authenticated;
grant execute on function public.admin_recalculate_pool(uuid) to authenticated;
