-- Adicionar zona de entrega padrão para Goiânia se não existir
INSERT INTO public.delivery_zones (name, base_fee, per_km_rate, min_time_minutes, max_time_minutes, max_distance_km, is_active, polygon)
SELECT 'Goiânia Centro', 5.00, 1.50, 20, 60, 50.0, true, '{"type":"Polygon","coordinates":[[[-49.4,-16.5],[-49.1,-16.5],[-49.1,-16.8],[-49.4,-16.8],[-49.4,-16.5]]]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_zones WHERE name = 'Goiânia Centro'
);