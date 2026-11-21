-- Julieta Suite | Supabase / PostgreSQL
-- Julieta Suite: event management, receivables, deposits, and public access.

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
  damage_items jsonb not null default '[]'::jsonb,
  damage_notes text,
  status text not null default 'Tersimpan',
  deposited_at date not null default current_date,
  refunded_at date,
  created_at timestamptz not null default now(),
  constraint security_deposits_refund_status_check check (
    (status = 'Dikembalikan' and refunded_at is not null) or
    (status <> 'Dikembalikan' and refunded_at is null)
  ),
  constraint security_deposits_status_check check (status in ('Menunggu bayaran', 'Tersimpan', 'Dikembalikan'))
);

alter table public.events add column if not exists services jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists location_zone text not null default 'Zona 1';
alter table public.events add column if not exists location_surcharge numeric(14, 2) not null default 0 check (location_surcharge >= 0);
alter table public.events add column if not exists duration_days integer not null default 1;
alter table public.security_deposits add column if not exists damage_items jsonb not null default '[]'::jsonb;
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
alter table public.security_deposits drop constraint if exists security_deposits_damage_items_array_check;
alter table public.security_deposits add constraint security_deposits_damage_items_array_check
  check (jsonb_typeof(damage_items) = 'array');
alter table public.security_deposits drop constraint if exists security_deposits_status_check;
alter table public.security_deposits add constraint security_deposits_status_check
  check (status in ('Menunggu bayaran', 'Tersimpan', 'Dikembalikan'));

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
alter table public.deposits add column if not exists paid_at timestamptz;
alter table public.deposits drop constraint if exists deposits_paid_at_matches_status;
update public.deposits
set status = case
      when lower(btrim(status)) in ('dibayar', 'lunas', 'paid') or paid_at is not null then 'Dibayar'
      when lower(btrim(status)) in ('menunggu bayaran', 'menunggu pembayaran', 'pending') then 'Menunggu bayaran'
      when lower(btrim(status)) in ('terlambat', 'overdue') then 'Terlambat'
      when lower(btrim(status)) in ('dibatalkan', 'cancelled', 'canceled') then 'Dibatalkan'
      else 'Terjadwal'
    end,
    paid_at = case
      when lower(btrim(status)) in ('dibayar', 'lunas', 'paid') or paid_at is not null then coalesce(paid_at, created_at, now())
      else null
    end;
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

-- This coursework app intentionally allows anonymous read/write access.
grant usage on schema public to anon, authenticated;
alter table public.clients enable row level security;
alter table public.events enable row level security;
alter table public.receivables enable row level security;
alter table public.deposits enable row level security;
alter table public.security_deposits enable row level security;

revoke all on public.clients, public.events, public.receivables, public.deposits, public.security_deposits from anon, authenticated;
grant select, insert, update, delete on public.clients, public.events, public.receivables, public.deposits, public.security_deposits to anon, authenticated;
grant execute on function public.sync_client_status_from_events(uuid) to anon, authenticated;
grant execute on function public.refresh_receivable_totals(uuid) to anon, authenticated;
grant execute on function public.check_deposit_total() to anon, authenticated;

drop policy if exists clients_authenticated_all on public.clients;
drop policy if exists clients_public_demo on public.clients;
drop policy if exists clients_authenticated_only on public.clients;
drop policy if exists clients_admin_only on public.clients;
drop policy if exists clients_open_access on public.clients;
create policy clients_open_access on public.clients for all to anon, authenticated
  using (true) with check (true);

drop policy if exists events_authenticated_all on public.events;
drop policy if exists events_public_demo on public.events;
drop policy if exists events_authenticated_only on public.events;
drop policy if exists events_admin_only on public.events;
drop policy if exists events_open_access on public.events;
create policy events_open_access on public.events for all to anon, authenticated
  using (true) with check (true);

drop policy if exists receivables_authenticated_all on public.receivables;
drop policy if exists receivables_public_demo on public.receivables;
drop policy if exists receivables_authenticated_only on public.receivables;
drop policy if exists receivables_admin_only on public.receivables;
drop policy if exists receivables_open_access on public.receivables;
create policy receivables_open_access on public.receivables for all to anon, authenticated
  using (true) with check (true);

drop policy if exists deposits_authenticated_all on public.deposits;
drop policy if exists deposits_public_demo on public.deposits;
drop policy if exists deposits_authenticated_only on public.deposits;
drop policy if exists deposits_admin_only on public.deposits;
drop policy if exists deposits_open_access on public.deposits;
create policy deposits_open_access on public.deposits for all to anon, authenticated
  using (true) with check (true);

drop policy if exists security_deposits_authenticated_only on public.security_deposits;
drop policy if exists security_deposits_admin_only on public.security_deposits;
drop policy if exists security_deposits_open_access on public.security_deposits;
create policy security_deposits_open_access on public.security_deposits for all to anon, authenticated
  using (true) with check (true);

create table if not exists public.app_initialization (
  id text primary key,
  completed_at timestamptz not null default now()
);
alter table public.app_initialization enable row level security;
revoke all on public.app_initialization from anon, authenticated;

create or replace function public.mark_app_data_initialized()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('julieta-suite-default-demo-data-v1'));
  insert into public.app_initialization (id)
  values ('default-demo-data-v1')
  on conflict (id) do nothing;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_mark_app_initialized on public.clients;
create trigger clients_mark_app_initialized
before insert or update or delete on public.clients
for each row execute function public.mark_app_data_initialized();

drop trigger if exists events_mark_app_initialized on public.events;
create trigger events_mark_app_initialized
before insert or update or delete on public.events
for each row execute function public.mark_app_data_initialized();

drop trigger if exists receivables_mark_app_initialized on public.receivables;
create trigger receivables_mark_app_initialized
before insert or update or delete on public.receivables
for each row execute function public.mark_app_data_initialized();

drop trigger if exists deposits_mark_app_initialized on public.deposits;
create trigger deposits_mark_app_initialized
before insert or update or delete on public.deposits
for each row execute function public.mark_app_data_initialized();

drop trigger if exists security_deposits_mark_app_initialized on public.security_deposits;
create trigger security_deposits_mark_app_initialized
before insert or update or delete on public.security_deposits
for each row execute function public.mark_app_data_initialized();

create or replace function public.init_default_demo_data(p_allow_seed boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  vanesha_client_id uuid;
  bintang_client_id uuid;
  nadira_client_id uuid;
  vanesha_event_id uuid;
  bintang_event_id uuid;
  nadira_event_id uuid;
  vanesha_invoice_id uuid;
  bintang_invoice_id uuid;
  nadira_invoice_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('julieta-suite-default-demo-data-v1'));

  if exists (select 1 from public.app_initialization where id = 'default-demo-data-v1') then
    return jsonb_build_object('seeded', false, 'reason', 'already_initialized');
  end if;

  if not p_allow_seed
    or exists (select 1 from public.clients)
    or exists (select 1 from public.events)
    or exists (select 1 from public.receivables)
    or exists (select 1 from public.deposits)
    or exists (select 1 from public.security_deposits) then
    insert into public.app_initialization (id)
    values ('default-demo-data-v1')
    on conflict (id) do nothing;
    return jsonb_build_object('seeded', false, 'reason', 'data_already_exists');
  end if;

  insert into public.clients (name, company_name, status, bank_name, bank_account_name, bank_account_number)
  values ('Vanesha Aurelia, B.Bus', 'PT Vanesha Kreasi Nusantara', 'Aktif', 'BCA', 'Vanesha Aurelia, B.Bus', '1234567890')
  returning id into vanesha_client_id;

  insert into public.clients (name, company_name, status, bank_name, bank_account_name, bank_account_number)
  values ('Bintang Pratama, S.E.', 'PT Cakrawala Digital Semesta', 'Aktif', 'Mandiri', 'Bintang Pratama, S.E.', '1350098765432')
  returning id into bintang_client_id;

  insert into public.clients (name, company_name, status, bank_name, bank_account_name, bank_account_number)
  values ('Nadira Safitri', 'Perorangan', 'Aktif', 'BNI', 'Nadira Safitri', '0876543210')
  returning id into nadira_client_id;

  insert into public.events (
    client_id, name, event_type, event_date, end_date, duration_days, venue,
    services, location_zone, location_surcharge, pic_name, status
  ) values (
    vanesha_client_id, 'Royal Lavender Wedding Vanesha & Arkan', 'Wedding', '2026-12-15', '2026-12-15', 1,
    'Gumaya Tower Hotel Semarang',
    '[{"name":"Event Organizer (EO)","amount":45000000},{"name":"Decoration","amount":120000000},{"name":"MUA","amount":25000000}]'::jsonb,
    'Zona 1', 0, 'Vanesha Aurelia, B.Bus', 'Persiapan'
  ) returning id into vanesha_event_id;

  insert into public.events (
    client_id, name, event_type, event_date, end_date, duration_days, venue,
    services, location_zone, location_surcharge, pic_name, status
  ) values (
    bintang_client_id, 'Annual Tech Summit & Gala Dinner 2026', 'Corporate Event', '2026-12-20', '2026-12-20', 1,
    'Padma Hotel Semarang',
    '[{"name":"Event Organizer (EO)","amount":45000000},{"name":"Decoration","amount":120000000},{"name":"Photobooth","amount":15000000}]'::jsonb,
    'Zona 1', 0, 'Bintang Pratama, S.E.', 'Persiapan'
  ) returning id into bintang_event_id;

  insert into public.events (
    client_id, name, event_type, event_date, end_date, duration_days, venue,
    services, location_zone, location_surcharge, pic_name, status
  ) values (
    nadira_client_id, 'Garden Intimate Engagement Nadira & Dimas', 'Engagement', '2026-11-28', '2026-11-28', 1,
    'Koenokoeni Cafe Gallery Semarang',
    '[{"name":"Decoration","amount":60000000},{"name":"MUA","amount":15000000},{"name":"Wardrobe","amount":20000000}]'::jsonb,
    'Zona 1', 0, 'Nadira Safitri', 'Persiapan'
  ) returning id into nadira_event_id;

  insert into public.receivables (event_id, invoice_number, total_amount, issued_at, status)
  values (vanesha_event_id, 'JS-INV-2026-030', 190000000, '2026-11-01', 'Belum dibayar')
  returning id into vanesha_invoice_id;
  insert into public.receivables (event_id, invoice_number, total_amount, issued_at, status)
  values (bintang_event_id, 'JS-INV-2026-031', 180000000, '2026-11-01', 'Belum dibayar')
  returning id into bintang_invoice_id;
  insert into public.receivables (event_id, invoice_number, total_amount, issued_at, status)
  values (nadira_event_id, 'JS-INV-2026-032', 95000000, '2026-11-01', 'Belum dibayar')
  returning id into nadira_invoice_id;

  insert into public.deposits (receivable_id, label, installment_type, amount, due_date, paid_at, payment_method, status) values
    (vanesha_invoice_id, 'DP', 'DP', 57000000, '2026-11-10', '2026-11-10T12:00:00+07:00', 'Transfer Bank', 'Dibayar'),
    (vanesha_invoice_id, 'Termin 2', 'Termin 2', 76000000, '2026-11-18', '2026-11-18T12:00:00+07:00', 'Transfer Bank', 'Dibayar'),
    (vanesha_invoice_id, 'Pelunasan', 'Pelunasan', 57000000, '2026-11-20', '2026-11-20T12:00:00+07:00', 'Transfer Bank', 'Dibayar'),
    (bintang_invoice_id, 'DP', 'DP', 54000000, '2026-11-15', '2026-11-15T12:00:00+07:00', 'Transfer Bank', 'Dibayar'),
    (bintang_invoice_id, 'Termin 2', 'Termin 2', 72000000, '2026-12-05', null, null, 'Terjadwal'),
    (bintang_invoice_id, 'Pelunasan', 'Pelunasan', 54000000, '2026-12-20', null, null, 'Terjadwal'),
    (nadira_invoice_id, 'DP', 'DP', 28500000, '2026-11-18', null, null, 'Terlambat'),
    (nadira_invoice_id, 'Termin 2', 'Termin 2', 38000000, '2026-12-22', null, null, 'Terjadwal'),
    (nadira_invoice_id, 'Pelunasan', 'Pelunasan', 28500000, '2026-12-28', null, null, 'Terjadwal');

  insert into public.security_deposits (
    event_id, amount, damage_deduction, damage_items, damage_notes, status, deposited_at, refunded_at
  ) values (
    vanesha_event_id, 15000000, 1150000,
    '[{"id":"kursi-chiavari","name":"Kursi Chiavari","quantity":2,"unit":"unit","unit_price":250000,"total":500000},{"id":"spotlight-led","name":"Lampu Spotlight LED","quantity":1,"unit":"set","unit_price":450000,"total":450000},{"id":"table-runner","name":"Table Runner","quantity":4,"unit":"pcs","unit_price":50000,"total":200000}]'::jsonb,
    'Refund bersih Rp 13.850.000', 'Dikembalikan', '2026-12-15', '2026-12-16'
  ), (
    bintang_event_id, 10000000, 0, '[]'::jsonb, null, 'Tersimpan', '2026-12-20', null
  ), (
    nadira_event_id, 7500000, 0, '[]'::jsonb, null, 'Menunggu bayaran', '2026-11-21', null
  );

  insert into public.app_initialization (id)
  values ('default-demo-data-v1')
  on conflict (id) do nothing;

  return jsonb_build_object('seeded', true, 'clients', 3, 'events', 3, 'invoices', 3);
end;
$$;

revoke all on function public.init_default_demo_data(boolean) from public;
grant execute on function public.init_default_demo_data(boolean) to anon, authenticated;
