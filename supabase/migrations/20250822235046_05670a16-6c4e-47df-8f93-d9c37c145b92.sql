-- Criar um merchant de teste com owner_user_id válido
INSERT INTO merchants (
  id,
  owner_user_id,
  legal_name,
  trade_name,
  cnpj,
  phone,
  email,
  status,
  submitted_at,
  created_at
) VALUES (
  gen_random_uuid(),
  '80b3df54-5c11-4b88-ad6f-81564ffe7da0', -- user ID do Artur
  'Restaurante Teste Ltda',
  'Restaurante do Teste',
  '12.345.678/0001-90',
  '(62) 99999-9999',
  'teste@restaurante.com',
  'UNDER_REVIEW',
  now(),
  now()
);

-- Atualizar o courier para UNDER_REVIEW
UPDATE couriers SET 
  status = 'UNDER_REVIEW',
  submitted_at = now()
WHERE full_name = 'Kayo';