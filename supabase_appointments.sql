-- Create the appointments table
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  service_id uuid references public.service_catalog(id),
  scheduled_at timestamp with time zone not null,
  status text check (status in ('scheduled', 'confirmed', 'completed', 'cancelled')) default 'scheduled',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.appointments enable row level security;

-- Policies
drop policy if exists "Users can view their own appointments" on public.appointments;
drop policy if exists "Users can insert their own appointments" on public.appointments;
drop policy if exists "Users can update their own appointments" on public.appointments;
drop policy if exists "Users can delete their own appointments" on public.appointments;

create policy "Users can view their own appointments"
  on public.appointments for select
  using (
    exists (
      select 1 from public.clients
      where clients.id = appointments.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can insert their own appointments"
  on public.appointments for insert
  with check (
    exists (
      select 1 from public.clients
      where clients.id = appointments.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can update their own appointments"
  on public.appointments for update
  using (
    exists (
      select 1 from public.clients
      where clients.id = appointments.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can delete their own appointments"
  on public.appointments for delete
  using (
    exists (
      select 1 from public.clients
      where clients.id = appointments.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );
