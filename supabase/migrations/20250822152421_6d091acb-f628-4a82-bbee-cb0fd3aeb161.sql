-- Add coordinates to existing restaurants in Goiânia area
UPDATE restaurants SET 
  latitude = -16.686882,
  longitude = -49.264493,
  city = 'Goiânia',
  state = 'GO'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE restaurants SET 
  latitude = -16.678934,
  longitude = -49.253847,
  city = 'Goiânia',
  state = 'GO'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE restaurants SET 
  latitude = -16.693521,
  longitude = -49.280145,
  city = 'Goiânia',
  state = 'GO'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE restaurants SET 
  latitude = -16.704832,
  longitude = -49.258934,
  city = 'Goiânia',
  state = 'GO'
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

UPDATE restaurants SET 
  latitude = -16.672341,
  longitude = -49.271892,
  city = 'Goiânia',
  state = 'GO'
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

-- Add coordinates to remaining restaurants
UPDATE restaurants SET 
  latitude = -16.681543,
  longitude = -49.245123,
  city = 'Goiânia',
  state = 'GO'
WHERE latitude IS NULL AND longitude IS NULL;