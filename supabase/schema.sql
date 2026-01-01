create extension if not exists "pgcrypto";

-- Profiles for role-based access
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  client_id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  constraint clients_phone_unique unique (phone)
);

create index if not exists clients_by_phone on public.clients(phone);

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'cancelled', 'rescheduled', 'completed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.appointments (
  appointment_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete restrict,
  service_type text not null,
  date date not null,
  time time not null,
  status public.appointment_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint appointments_no_double_booking unique (date, time)
);

create index if not exists appointments_by_date_time on public.appointments(date, time);
create index if not exists appointments_by_client on public.appointments(client_id);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- Helper function: admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

-- PROFILES
create policy "profiles_admin_read" on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "profiles_admin_write" on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CLIENTS
-- Public users can insert a client record (no reads).
create policy "clients_public_insert" on public.clients
for insert
to anon
with check (true);

create policy "clients_admin_read" on public.clients
for select
to authenticated
using (public.is_admin());

create policy "clients_admin_update" on public.clients
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- APPOINTMENTS
-- Public users can insert appointments (no reads).
create policy "appointments_public_insert" on public.appointments
for insert
to anon, authenticated
with check (status = 'pending');

-- Public users need limited read access to check availability
create policy "appointments_public_read_availability" on public.appointments
for select
to anon, authenticated
using (true);

create policy "appointments_admin_read" on public.appointments
for select
to authenticated
using (public.is_admin());

create policy "appointments_admin_update" on public.appointments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "appointments_admin_delete" on public.appointments
for delete
to authenticated
using (public.is_admin());
