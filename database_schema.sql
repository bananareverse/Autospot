-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text check (role in ('admin', 'mechanic', 'client')) default 'client',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 2. CLIENTS (Desoupled from auth for flexibility, but can link if needed)
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clients enable row level security;

-- Permissive policy for staff (admin/mechanic) would go here. 
-- For now, allowing authenticated users to read/write for simplicity of development.
create policy "Authenticated users can manage clients"
  on clients for all
  using ( auth.role() = 'authenticated' );

-- 3. VEHICLES
create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  make text not null,   -- Marca (e.g., Toyota)
  model text not null,  -- Modelo (e.g., Corolla)
  year integer,
  license_plate text unique,
  vin text,
  color text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vehicles enable row level security;

create policy "Authenticated users can manage vehicles"
  on vehicles for all
  using ( auth.role() = 'authenticated' );

-- 4. SERVICE CATALOG (Standard services)
create table public.service_catalog (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  estimated_price decimal(10,2),
  active boolean default true
);

alter table public.service_catalog enable row level security;

create policy "Everyone can read services"
  on service_catalog for select
  using ( true );

-- 5. WORK ORDERS (Ordenes de Trabajo)
create table public.work_orders (
  id uuid default uuid_generate_v4() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  mechanic_id uuid references public.profiles(id), -- Optional: assigned mechanic
  status text check (status in ('pending', 'in_progress', 'completed', 'cancelled', 'invoiced')) default 'pending',
  description text, -- Diagnosis or customer issue
  odometer_reading integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

alter table public.work_orders enable row level security;

create policy "Authenticated users can manage work orders"
  on work_orders for all
  using ( auth.role() = 'authenticated' );

-- 6. WORK ORDER ITEMS (Line items within an order)
create table public.work_order_items (
  id uuid default uuid_generate_v4() primary key,
  work_order_id uuid references public.work_orders(id) on delete cascade not null,
  service_id uuid references public.service_catalog(id), -- Link to catalog if applicable
  description text, -- Custom description usually copied from service name or manual entry
  quantity integer default 1,
  unit_price decimal(10,2) not null,
  total_price decimal(10,2) generated always as (quantity * unit_price) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.work_order_items enable row level security;

create policy "Authenticated users can manage work order items"
  on work_order_items for all
  using ( auth.role() = 'authenticated' );

-- 7. INVENTORY PARTS (Simple inventory)
create table public.inventory_parts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sku text unique,
  description text,
  stock_quantity integer default 0,
  min_stock_level integer default 5,
  price decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.inventory_parts enable row level security;

create policy "Authenticated users can manage inventory"
  on inventory_parts for all
  using ( auth.role() = 'authenticated' );

-- HELPER FUNCTIONS
-- Function to handle new user signup automatically creating a profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA (Optional - Just to have something to look at)
insert into public.service_catalog (name, description, estimated_price) values
('Cambio de Aceite Sintético', 'Incluye filtro y hasta 5 litros de aceite', 1200.00),
('Afinación Mayor', 'Bujías, filtros, limpieza de inyectores', 2500.00),
('Diagnóstico por Escáner', 'Lectura de códigos OBD-II', 500.00);
