-- Workshop features: service mapping + user reviews
-- Run this script in Supabase SQL editor after base schema creation.

create extension if not exists "uuid-ossp";

-- 0) Workshops core data and staff mapping
create table if not exists public.workshops (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text not null, 
  phone text,
  description text,
  opening_hours text,
  categories text[] default '{}',
  payment_methods text[] default '{}',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status text default 'pending_review' check (status in ('pending_review', 'active', 'suspended', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workshops
  add column if not exists phone text,
  add column if not exists description text,
  add column if not exists opening_hours text,
  add column if not exists categories text[] default '{}',
  add column if not exists payment_methods text[] default '{}',
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists status text default 'pending_review';

create index if not exists idx_workshops_status on public.workshops(status);

-- Automatic approval rule:
-- A workshop becomes active only when profile completeness rules are met.
create or replace function public.apply_workshop_auto_status()
returns trigger as $$
declare
  profile_complete boolean;
begin
  profile_complete :=
    coalesce(length(trim(new.name)) > 0, false)
    and coalesce(length(trim(new.address)) > 0, false)
    and coalesce(length(trim(new.phone)) > 0, false)
    and coalesce(length(trim(new.opening_hours)) > 0, false)
    and coalesce(array_length(new.categories, 1), 0) > 0
    and coalesce(array_length(new.payment_methods, 1), 0) > 0;

  if profile_complete then
    new.status := 'active';
  else
    new.status := 'pending_review';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_apply_workshop_auto_status on public.workshops;
create trigger trg_apply_workshop_auto_status
before insert or update on public.workshops
for each row execute procedure public.apply_workshop_auto_status();

create table if not exists public.workshop_staff (
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_in_workshop text default 'staff' check (role_in_workshop in ('owner', 'manager', 'staff')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (workshop_id, user_id)
);

create index if not exists idx_workshop_staff_user_id on public.workshop_staff(user_id);

alter table public.workshops enable row level security;
alter table public.workshop_staff enable row level security;

drop policy if exists "Everyone can read active workshops" on public.workshops;
drop policy if exists "Authenticated users can create workshops" on public.workshops;
drop policy if exists "Workshop staff can manage own workshop" on public.workshops;
drop policy if exists "Workshop staff can read own links" on public.workshop_staff;
drop policy if exists "Workshop owners can manage staff" on public.workshop_staff;
drop policy if exists "Workshop owners can insert staff" on public.workshop_staff;
drop policy if exists "Workshop owners can update staff" on public.workshop_staff;
drop policy if exists "Workshop owners can delete staff" on public.workshop_staff;
drop policy if exists "Users can create own staff link" on public.workshop_staff;

create policy "Everyone can read active workshops"
  on public.workshops for select
  using (status = 'active' or auth.role() = 'authenticated');

create policy "Authenticated users can create workshops"
  on public.workshops for insert
  with check (auth.role() = 'authenticated');

create policy "Workshop staff can manage own workshop"
  on public.workshops for all
  using (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = workshops.id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = workshops.id
        and ws.user_id = auth.uid()
    )
  );

create policy "Workshop staff can read own links"
  on public.workshop_staff for select
  using (user_id = auth.uid());

create policy "Users can create own staff link"
  on public.workshop_staff for insert
  with check (user_id = auth.uid());

create policy "Workshop owners can insert staff"
  on public.workshop_staff for insert
  with check (
    exists (
      select 1 from public.workshop_staff owner_row
      where owner_row.workshop_id = workshop_staff.workshop_id
        and owner_row.user_id = auth.uid()
        and owner_row.role_in_workshop in ('owner', 'manager')
    )
  );

create policy "Workshop owners can update staff"
  on public.workshop_staff for update
  using (
    exists (
      select 1 from public.workshop_staff owner_row
      where owner_row.workshop_id = workshop_staff.workshop_id
        and owner_row.user_id = auth.uid()
        and owner_row.role_in_workshop in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.workshop_staff owner_row
      where owner_row.workshop_id = workshop_staff.workshop_id
        and owner_row.user_id = auth.uid()
        and owner_row.role_in_workshop in ('owner', 'manager')
    )
  );

create policy "Workshop owners can delete staff"
  on public.workshop_staff for delete
  using (
    exists (
      select 1 from public.workshop_staff owner_row
      where owner_row.workshop_id = workshop_staff.workshop_id
        and owner_row.user_id = auth.uid()
        and owner_row.role_in_workshop in ('owner', 'manager')
    )
  );

-- Link appointments with workshops so each workshop can view/handle their queue.
alter table public.appointments
  add column if not exists workshop_id uuid references public.workshops(id);

create index if not exists idx_appointments_workshop_id on public.appointments(workshop_id);

drop policy if exists "Workshop staff can view workshop appointments" on public.appointments;
drop policy if exists "Workshop staff can update workshop appointments" on public.appointments;

create policy "Workshop staff can view workshop appointments"
  on public.appointments for select
  using (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = appointments.workshop_id
        and ws.user_id = auth.uid()
    )
  );

create policy "Workshop staff can update workshop appointments"
  on public.appointments for update
  using (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = appointments.workshop_id
        and ws.user_id = auth.uid()
    )
  );

-- 1) Services offered by each workshop
create table if not exists public.workshop_services (
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  service_id uuid references public.service_catalog(id) on delete cascade not null,
  estimated_price decimal(10,2),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (workshop_id, service_id)
);

create index if not exists idx_workshop_services_workshop_id
  on public.workshop_services(workshop_id);

create index if not exists idx_workshop_services_service_id
  on public.workshop_services(service_id);

alter table public.workshop_services enable row level security;

drop policy if exists "Everyone can read workshop services" on public.workshop_services;
drop policy if exists "Authenticated users can manage workshop services" on public.workshop_services;
drop policy if exists "Workshop staff can manage own workshop services" on public.workshop_services;

create policy "Everyone can read workshop services"
  on public.workshop_services for select
  using (true);

create policy "Workshop staff can manage own workshop services"
  on public.workshop_services for all
  using (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = workshop_services.workshop_id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workshop_staff ws
      where ws.workshop_id = workshop_services.workshop_id
        and ws.user_id = auth.uid()
    )
  );

-- 2) Reviews per workshop
create table if not exists public.workshop_reviews (
  id uuid default uuid_generate_v4() primary key,
  workshop_id uuid not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workshop_id, client_id)
);

create index if not exists idx_workshop_reviews_workshop_id
  on public.workshop_reviews(workshop_id);

create index if not exists idx_workshop_reviews_created_at
  on public.workshop_reviews(created_at desc);

alter table public.workshop_reviews enable row level security;

drop policy if exists "Everyone can read workshop reviews" on public.workshop_reviews;
drop policy if exists "Users can insert their own workshop review" on public.workshop_reviews;
drop policy if exists "Users can update their own workshop review" on public.workshop_reviews;
drop policy if exists "Users can delete their own workshop review" on public.workshop_reviews;

create policy "Everyone can read workshop reviews"
  on public.workshop_reviews for select
  using (true);

create policy "Users can insert their own workshop review"
  on public.workshop_reviews for insert
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = workshop_reviews.client_id
        and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can update their own workshop review"
  on public.workshop_reviews for update
  using (
    exists (
      select 1
      from public.clients
      where clients.id = workshop_reviews.client_id
        and clients.email = auth.jwt() ->> 'email'
    )
  )
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = workshop_reviews.client_id
        and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can delete their own workshop review"
  on public.workshop_reviews for delete
  using (
    exists (
      select 1
      from public.clients
      where clients.id = workshop_reviews.client_id
        and clients.email = auth.jwt() ->> 'email'
    )
  );

-- Convenience view used by app listing/map screens.
drop view if exists public.workshops_with_coords;

create or replace view public.workshops_with_coords as
select
  w.id,
  w.name,
  w.address,
  w.phone,
  w.description,
  w.opening_hours,
  w.categories,
  w.payment_methods,
  w.latitude,
  w.longitude,
  coalesce(avg(r.rating)::numeric(10,2), 0) as rating,
  count(r.id)::int as total_reviews
from public.workshops w
left join public.workshop_reviews r on r.workshop_id = w.id
where w.status = 'active' or w.status = 'pending_review'
group by w.id, w.name, w.address, w.phone, w.description, w.opening_hours, w.categories, w.payment_methods, w.latitude, w.longitude;
