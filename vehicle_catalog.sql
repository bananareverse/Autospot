-- 1. Create tables for brands and models
create table if not exists public.vehicle_brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.vehicle_models (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references public.vehicle_brands(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.vehicle_brands enable row level security;
alter table public.vehicle_models enable row level security;

-- Public read access
create policy "Everyone can read brands" on public.vehicle_brands for select using (true);
create policy "Everyone can read models" on public.vehicle_models for select using (true);

-- 2. Seed Data (30+ Common Vehicles)
do $$
declare
  -- Japanese
  toyota_id uuid;
  nissan_id uuid;
  honda_id uuid;
  mazda_id uuid;
  
  -- American
  ford_id uuid;
  chevrolet_id uuid;
  jeep_id uuid;
  
  -- European
  vw_id uuid;
  bmw_id uuid;
  mercedes_id uuid;
  audi_id uuid;

  -- Korean
  kia_id uuid;
  hyundai_id uuid;
begin
  -- Brands
  insert into public.vehicle_brands (name) values ('Toyota') returning id into toyota_id;
  insert into public.vehicle_brands (name) values ('Nissan') returning id into nissan_id;
  insert into public.vehicle_brands (name) values ('Honda') returning id into honda_id;
  insert into public.vehicle_brands (name) values ('Mazda') returning id into mazda_id;
  insert into public.vehicle_brands (name) values ('Ford') returning id into ford_id;
  insert into public.vehicle_brands (name) values ('Chevrolet') returning id into chevrolet_id;
  insert into public.vehicle_brands (name) values ('Jeep') returning id into jeep_id;
  insert into public.vehicle_brands (name) values ('Volkswagen') returning id into vw_id;
  insert into public.vehicle_brands (name) values ('BMW') returning id into bmw_id;
  insert into public.vehicle_brands (name) values ('Mercedes-Benz') returning id into mercedes_id;
  insert into public.vehicle_brands (name) values ('Audi') returning id into audi_id;
  insert into public.vehicle_brands (name) values ('Kia') returning id into kia_id;
  insert into public.vehicle_brands (name) values ('Hyundai') returning id into hyundai_id;

  -- Toyota (7 models)
  insert into public.vehicle_models (brand_id, name) values 
  (toyota_id, 'Corolla'), (toyota_id, 'Camry'), (toyota_id, 'RAV4'), (toyota_id, 'Prius'), (toyota_id, 'Yaris'), (toyota_id, 'Hilux'), (toyota_id, 'Tacoma');

  -- Nissan (7 models)
  insert into public.vehicle_models (brand_id, name) values 
  (nissan_id, 'Versa'), (nissan_id, 'Sentra'), (nissan_id, 'Altima'), (nissan_id, 'March'), (nissan_id, 'Kicks'), (nissan_id, 'NP300'), (nissan_id, 'Frontier');

  -- Honda (6 models)
  insert into public.vehicle_models (brand_id, name) values 
  (honda_id, 'Civic'), (honda_id, 'Accord'), (honda_id, 'CR-V'), (honda_id, 'HR-V'), (honda_id, 'City'), (honda_id, 'Pilot');

  -- Ford (7 models)
  insert into public.vehicle_models (brand_id, name) values 
  (ford_id, 'Fiesta'), (ford_id, 'Focus'), (ford_id, 'Mustang'), (ford_id, 'Escape'), (ford_id, 'Explorer'), (ford_id, 'Ranger'), (ford_id, 'Lobo');

  -- Volkswagen (6 models)
  insert into public.vehicle_models (brand_id, name) values 
  (vw_id, 'Jetta'), (vw_id, 'Golf'), (vw_id, 'Vento'), (vw_id, 'Polo'), (vw_id, 'Tiguan'), (vw_id, 'Virtus');

  -- Mazda (6 models)
  insert into public.vehicle_models (brand_id, name) values 
  (mazda_id, 'Mazda2'), (mazda_id, 'Mazda3'), (mazda_id, 'Mazda6'), (mazda_id, 'CX-3'), (mazda_id, 'CX-5'), (mazda_id, 'CX-30');

  -- Kia (5 models)
  insert into public.vehicle_models (brand_id, name) values 
  (kia_id, 'Rio'), (kia_id, 'Forte'), (kia_id, 'Sportage'), (kia_id, 'Seltos'), (kia_id, 'Soul');

  -- Chevrolet (5 models)
  insert into public.vehicle_models (brand_id, name) values 
  (chevrolet_id, 'Aveo'), (chevrolet_id, 'Onix'), (chevrolet_id, 'Cavalier'), (chevrolet_id, 'Spark'), (chevrolet_id, 'Trax');

  -- Premium & Others (6 models)
  insert into public.vehicle_models (brand_id, name) values 
  (bmw_id, 'Serie 3'), (bmw_id, 'X5'),
  (mercedes_id, 'Clase C'), (mercedes_id, 'GLC'),
  (audi_id, 'A3'), (audi_id, 'Q5');

  -- Jeep (3 models)
  insert into public.vehicle_models (brand_id, name) values 
  (jeep_id, 'Wrangler'), (jeep_id, 'Cherokee'), (jeep_id, 'Grand Cherokee');

end $$;
