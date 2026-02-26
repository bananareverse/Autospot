-- Seed the service catalog with common services
insert into public.service_catalog (name, description, estimated_price)
values 
  ('Afinación Menor', 'Cambio de aceite, filtro de aceite y revisión de niveles.', 1200.00),
  ('Afinación Mayor', 'Cambio de aceite, filtros, bujías y limpieza de inyectores.', 2800.00),
  ('Revisión de Frenos', 'Inspección de balatas, discos y líquido de frenos.', 450.00),
  ('Cambio de Pastillas/Balatas', 'Reemplazo de balatas delanteras con rectificado de discos.', 1800.00),
  ('Lavado de Motor', 'Limpieza profunda de compartimento de motor a vapor.', 350.00),
  ('Diagnóstico Computarizado', 'Escaneo de códigos de falla y borrado de testigos.', 600.00),
  ('Cambio de Batería', 'Instalación de batería nueva con garantía.', 2200.00),
  ('Servicio de Aire Acondicionado', 'Recarga de gas refrigerante y revisión de fugas.', 950.00)
on conflict do nothing;
