-- Seed workshops to test the main dashboard
insert into public.workshops (id, name, address, phone, latitude, longitude, status)
values 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Taller Central Autofix', 'Av. Insurgentes 123, CDMX', '555-123-4567', 19.4326, -99.1332, 'active'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Especialistas en Frenos ABC', 'Calle 45 #89, Guadalajara', '333-987-6543', 20.6597, -103.3496, 'active'),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Mecánica Rápida Express', 'Bulevar Juárez 500, Monterrey', '818-111-2222', 25.6866, -100.3161, 'pending_review')
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status;
