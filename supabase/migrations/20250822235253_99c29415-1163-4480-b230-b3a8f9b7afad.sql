-- Criar um merchant de teste completo
INSERT INTO merchants (
  id,
  owner_user_id,
  legal_name,
  trade_name,
  cnpj,
  responsible_name,
  responsible_cpf,
  phone,
  email,
  address_json,
  status,
  submitted_at,
  created_at
) VALUES (
  gen_random_uuid(),
  '80b3df54-5c11-4b88-ad6f-81564ffe7da0',
  'Restaurante Teste Ltda',
  'Restaurante do Teste',
  '12.345.678/0001-90',
  'Artur Junior',
  '123.456.789-00',
  '(62) 99999-9999',
  'teste@restaurante.com',
  '{"street": "Rua Teste, 123", "city": "Goiânia", "state": "GO", "zipCode": "74000-000"}',
  'UNDER_REVIEW',
  now(),
  now()
);

-- Atualizar o courier para UNDER_REVIEW
UPDATE couriers SET 
  status = 'UNDER_REVIEW',
  submitted_at = now()
WHERE full_name = 'Kayo';