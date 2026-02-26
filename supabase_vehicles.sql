-- Create the vehicles table (Schema actual en Supabase)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  license_plate text UNIQUE,
  vin text,
  color text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);

-- Enable Row Level Security (RLS)
alter table public.vehicles enable row level security;

-- Limpieza de políticas antiguas (que usaban user_id)
drop policy if exists "Users can view their own vehicles" on public.vehicles;
drop policy if exists "Users can insert their own vehicles" on public.vehicles;
drop policy if exists "Users can update their own vehicles" on public.vehicles;
drop policy if exists "Users can delete their own vehicles" on public.vehicles;

-- Nuevas políticas basadas en el email del cliente (consistente con el resto de la app)
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
