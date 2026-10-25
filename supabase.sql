-- Julieta Suite | Supabase / PostgreSQL
-- Julieta Suite: event management, receivables, deposits, and authentication.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  email text,
  phone text,
  status text not null default 'Aktif',
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  event_type text not null default 'Lainnya',
  event_date date not null,
  end_date date,
  duration_days integer not null default 1 check (duration_days between 1 and 3),
  venue text,
  special_needs text[] not null default '{}',
  pic_name text,
  budget numeric(14, 2) not null default 0 check (budget >= 0),
  status text not null default 'Persiapan',
  created_at timestamptz not null default now()
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete restrict,
  invoice_number text not null unique,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0),
  remaining_amount numeric(14, 2) not null default 0 check (remaining_amount >= 0),
  status text not null default 'Belum dibayar',
  issued_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  label text not null default 'Termin pembayaran',
  installment_type text not null default 'DP',
  amount numeric(14, 2) not null check (amount > 0),
  due_date date not null,
  paid_at timestamptz,
  payment_method text,
  reminder_sent_at timestamptz,
  status text not null default 'Terjadwal',
  created_at timestamptz not null default now(),
  constraint deposits_paid_at_matches_status check (
    (status = 'Dibayar' and paid_at is not null) or (status <> 'Dibayar' and paid_at is null)
  )
);

create table if not exists public.security_deposits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  damage_deduction numeric(14, 2) not null default 0 check (damage_deduction >= 0 and damage_deduction <= amount),
  damage_notes text,
  status text not null default 'Tersimpan',
  deposited_at date not null default current_date,
  refunded_at date,
  created_at timestamptz not null default now(),
  constraint security_deposits_refund_status_check check (
    (status = 'Dikembalikan' and refunded_at is not null) or
    (status <> 'Dikembalikan' and refunded_at is null)
  ),
  constraint security_deposits_status_check check (status in ('Tersimpan', 'Dikembalikan'))
);

alter table public.events add column if not exists services jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists location_zone text not null default 'Zona 1';
alter table public.events add column if not exists location_surcharge numeric(14, 2) not null default 0 check (location_surcharge >= 0);
alter table public.events add column if not exists duration_days integer not null default 1;
alter table public.events drop constraint if exists events_duration_days_check;
alter table public.events add constraint events_duration_days_check check (duration_days between 1 and 3) not valid;
alter table public.events drop constraint if exists events_location_zone_fee_check;
alter table public.events add constraint events_location_zone_fee_check check (
 (location_zone = 'Zona 1' and location_surcharge = 0) or
 (location_zone = 'Zona 2' and location_surcharge = 5000000) or
 (location_zone = 'Zona 3' and location_surcharge = 25000000) or
 (location_zone = 'Zona 4' and location_surcharge = 75000000)
) not valid;
alter table public.security_deposits drop constraint if exists security_deposits_damage_deduction_check;
alter table public.security_deposits add constraint security_deposits_damage_deduction_check
  check (damage_deduction >= 0 and damage_deduction <= amount);
alter table public.security_deposits drop constraint if exists security_deposits_status_check;
alter table public.security_deposits add constraint security_deposits_status_check
  check (status in ('Tersimpan', 'Dikembalikan'));

alter table public.clients add column if not exists status text not null default 'Aktif';
alter table public.clients add column if not exists bank_name text;
alter table public.clients add column if not exists bank_account_name text;
alter table public.clients add column if not exists bank_account_number text;
alter table public.events add column if not exists end_date date;
alter table public.events add column if not exists special_needs text[] not null default '{}';
alter table public.events add column if not exists pic_name text;
alter table public.receivables add column if not exists amount_paid numeric(14, 2) not null default 0;
alter table public.receivables add column if not exists remaining_amount numeric(14, 2) not null default 0;
alter table public.receivables add column if not exists status text not null default 'Belum dibayar';
alter table public.deposits add column if not exists installment_type text not null default 'DP';
alter table public.deposits add column if not exists payment_method text;

alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check check (status in ('Aktif', 'Nonaktif', 'Selesai'));

alter table public.events drop constraint if exists events_status_check;
update public.events set status = 'Persiapan' where status = 'Prospek';
alter table public.events add constraint events_status_check check (status in ('Persiapan', 'Berlangsung', 'Selesai', 'Dibatalkan'));
alter table public.events drop constraint if exists events_end_date_check;
alter table public.events add constraint events_end_date_check check (end_date is null or end_date >= event_date);

alter table public.receivables drop constraint if exists receivables_status_check;
alter table public.receivables add constraint receivables_status_check check (status in ('Draft', 'Belum dibayar', 'Dibayar sebagian', 'Lunas', 'Terlambat'));

alter table public.deposits drop constraint if exists deposits_status_check;
alter table public.deposits drop constraint if exists deposits_paid_at_matches_status;
update public.deposits set status = 'Dibayar' where status = 'Lunas';
alter table public.deposits add constraint deposits_status_check check (status in ('Terjadwal', 'Menunggu bayaran', 'Terlambat', 'Dibayar', 'Dibatalkan'));
alter table public.deposits add constraint deposits_paid_at_matches_status check (
  (status = 'Dibayar' and paid_at is not null) or (status <> 'Dibayar' and paid_at is null)
);
alter table public.deposits drop constraint if exists deposits_installment_type_check;
alter table public.deposits add constraint deposits_installment_type_check check (installment_type in ('DP', 'Termin 2', 'Termin 3', 'Pelunasan'));

create or replace function public.sync_client_status_from_events(target_client_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.clients c
  set status = case
    when exists (
      select 1 from public.events e
      where e.client_id = target_client_id and e.status in ('Persiapan', 'Berlangsung')
    ) then 'Aktif'
    when exists (select 1 from public.events e where e.client_id = target_client_id) then 'Selesai'
    else c.status
  end
  where c.id = target_client_id;
end;
$$;

create or replace function public.sync_client_status_after_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_client_status_from_events(old.client_id);
    return old;
  end if;
  perform public.sync_client_status_from_events(new.client_id);
  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    perform public.sync_client_status_from_events(old.client_id);
  end if;
  return new;
end;
$$;

drop trigger if exists events_sync_client_status on public.events;
create trigger events_sync_client_status
after insert or update of client_id, status or delete on public.events
for each row execute function public.sync_client_status_after_event();

create or replace function public.refresh_receivable_totals(target_receivable_id uuid)
returns void
language sql
set search_path = public
as $$
  update public.receivables r
  set amount_paid = coalesce((
        select sum(d.amount) from public.deposits d
        where d.receivable_id = r.id and d.status = 'Dibayar'
      ), 0),
      remaining_amount = greatest(r.total_amount - coalesce((
        select sum(d.amount) from public.deposits d
        where d.receivable_id = r.id and d.status = 'Dibayar'
      ), 0), 0),
      status = case
        when r.status = 'Draft' then 'Draft'
        when coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0) >= r.total_amount then 'Lunas'
        when exists (select 1 from public.deposits d where d.receivable_id = r.id and d.status = 'Terlambat') then 'Terlambat'
        when coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0) > 0 then 'Dibayar sebagian'
        else 'Belum dibayar'
      end
  where r.id = target_receivable_id;
$$;

create or replace function public.sync_receivable_after_deposit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_receivable_totals(old.receivable_id);
    return old;
  end if;
  perform public.refresh_receivable_totals(new.receivable_id);
  if tg_op = 'UPDATE' and old.receivable_id is distinct from new.receivable_id then
    perform public.refresh_receivable_totals(old.receivable_id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_receivable_after_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.refresh_receivable_totals(new.id);
  return new;
end;
$$;

drop trigger if exists deposits_sync_receivable on public.deposits;
create trigger deposits_sync_receivable
after insert or update or delete on public.deposits
for each row execute function public.sync_receivable_after_deposit();

drop trigger if exists receivables_sync_totals on public.receivables;
create trigger receivables_sync_totals
after insert or update of total_amount on public.receivables
for each row execute function public.sync_receivable_after_invoice();

create or replace function public.check_deposit_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  invoice_total numeric(14, 2);
  other_deposits numeric(14, 2);
begin
  if new.status = 'Dibatalkan' then return new; end if;
  select total_amount into invoice_total from public.receivables where id = new.receivable_id;
  select coalesce(sum(amount), 0) into other_deposits from public.deposits
  where receivable_id = new.receivable_id and status <> 'Dibatalkan' and id is distinct from new.id;
  if other_deposits + new.amount > invoice_total then
    raise exception 'Total termin melebihi nilai invoice';
  end if;
  return new;
end;
$$;

drop trigger if exists deposits_check_invoice_total on public.deposits;
create trigger deposits_check_invoice_total
before insert or update of receivable_id, amount, status on public.deposits
for each row execute function public.check_deposit_total();

create or replace function public.calculate_event_contract_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_surcharge numeric(14, 2);
  service_total numeric(14, 2);
begin
  expected_surcharge := case new.location_zone
    when 'Zona 1' then 0
    when 'Zona 2' then 5000000
    when 'Zona 3' then 25000000
    when 'Zona 4' then 75000000
    else null
  end;
  if expected_surcharge is null or new.location_surcharge <> expected_surcharge then
    raise exception 'Zona lokasi atau biaya wilayah tidak valid';
  end if;
  if new.duration_days not between 1 and 3 then
    raise exception 'Durasi event harus antara 1 dan 3 hari';
  end if;
  if jsonb_typeof(new.services) <> 'array' then
    raise exception 'Daftar jasa event harus berupa array';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.services) as items(service)
    where jsonb_typeof(service) <> 'object'
      or coalesce(service ->> 'name', '') = ''
      or coalesce(service ->> 'amount', '') !~ '^\d+(\.\d{1,2})?$'
  ) then
    raise exception 'Rincian jasa event tidak valid';
  end if;
  select coalesce(sum((service ->> 'amount')::numeric), 0)
  into service_total
  from jsonb_array_elements(new.services) as items(service);
  new.budget := service_total * new.duration_days + new.location_surcharge;
  return new;
end;
$$;

drop trigger if exists events_calculate_contract_total on public.events;
create trigger events_calculate_contract_total
before insert or update of services, location_zone, location_surcharge, duration_days on public.events
for each row execute function public.calculate_event_contract_total();

update public.receivables r
set amount_paid = coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0),
    remaining_amount = greatest(r.total_amount - coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0), 0),
    status = case
      when r.status = 'Draft' then 'Draft'
      when coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0) >= r.total_amount then 'Lunas'
      when exists (select 1 from public.deposits d where d.receivable_id = r.id and d.status = 'Terlambat') then 'Terlambat'
      when coalesce((select sum(d.amount) from public.deposits d where d.receivable_id = r.id and d.status = 'Dibayar'), 0) > 0 then 'Dibayar sebagian'
      else 'Belum dibayar'
    end;

do $$
begin
  perform public.sync_client_status_from_events(c.id)
  from public.clients c;
end;
$$;

create index if not exists events_client_id_idx on public.events(client_id);
create index if not exists events_event_date_idx on public.events(event_date);
create index if not exists deposits_receivable_id_idx on public.deposits(receivable_id);
create index if not exists deposits_due_date_idx on public.deposits(due_date);

-- Financial data requires an authenticated JWT with app_metadata.role = 'admin'.
alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.receivables enable row level security;
alter table public.deposits enable row level security;
alter table public.security_deposits enable row level security;

revoke all on public.clients, public.events, public.receivables, public.deposits, public.security_deposits from anon, authenticated;
grant select, insert, update, delete on public.clients, public.events, public.receivables, public.deposits, public.security_deposits to authenticated;
revoke execute on function public.sync_client_status_from_events(uuid) from public, anon;
revoke execute on function public.refresh_receivable_totals(uuid) from public, anon;
revoke execute on function public.check_deposit_total() from public, anon;
grant execute on function public.sync_client_status_from_events(uuid) to authenticated;
grant execute on function public.refresh_receivable_totals(uuid) to authenticated;
grant execute on function public.check_deposit_total() to authenticated;

drop policy if exists clients_authenticated_all on public.clients;
drop policy if exists clients_public_demo on public.clients;
drop policy if exists clients_authenticated_only on public.clients;
drop policy if exists clients_admin_only on public.clients;
create policy clients_admin_only on public.clients for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists events_authenticated_all on public.events;
drop policy if exists events_public_demo on public.events;
drop policy if exists events_authenticated_only on public.events;
drop policy if exists events_admin_only on public.events;
create policy events_admin_only on public.events for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists receivables_authenticated_all on public.receivables;
drop policy if exists receivables_public_demo on public.receivables;
drop policy if exists receivables_authenticated_only on public.receivables;
drop policy if exists receivables_admin_only on public.receivables;
create policy receivables_admin_only on public.receivables for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists deposits_authenticated_all on public.deposits;
drop policy if exists deposits_public_demo on public.deposits;
drop policy if exists deposits_authenticated_only on public.deposits;
drop policy if exists deposits_admin_only on public.deposits;
create policy deposits_admin_only on public.deposits for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists security_deposits_authenticated_only on public.security_deposits;
drop policy if exists security_deposits_admin_only on public.security_deposits;
create policy security_deposits_admin_only on public.security_deposits for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
