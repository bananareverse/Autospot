-- Create the vehicles table
create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  make text not null,
  model text not null,
  year integer not null,
  license_plate text,
  vin text,
  color text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.vehicles enable row level security;

-- Drop existing policies
drop policy if exists "Users can view their own vehicles" on public.vehicles;
drop policy if exists "Users can insert their own vehicles" on public.vehicles;
drop policy if exists "Users can update their own vehicles" on public.vehicles;
drop policy if exists "Users can delete their own vehicles" on public.vehicles;

-- Create policies based on client email (consistent with appointments)
create policy "Users can view their own vehicles"
  on public.vehicles for select
  using (
    exists (
      select 1 from public.clients
      where clients.id = vehicles.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can insert their own vehicles"
  on public.vehicles for insert
  with check (
    exists (
      select 1 from public.clients
      where clients.id = vehicles.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can update their own vehicles"
  on public.vehicles for update
  using (
    exists (
      select 1 from public.clients
      where clients.id = vehicles.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );

create policy "Users can delete their own vehicles"
  on public.vehicles for delete
  using (
    exists (
      select 1 from public.clients
      where clients.id = vehicles.client_id
      and clients.email = auth.jwt() ->> 'email'
    )
  );
