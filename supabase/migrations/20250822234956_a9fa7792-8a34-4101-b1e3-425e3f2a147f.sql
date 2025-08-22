-- Criar um merchant de teste em status UNDER_REVIEW para testar o painel
INSERT INTO merchants (
  id,
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
  'Restaurante Teste Ltda',
  'Restaurante do Teste',
  '12.345.678/0001-90',
  '(62) 99999-9999',
  'teste@restaurante.com',
  'UNDER_REVIEW',
  now(),
  now()
);

-- Atualizar o courier existente para UNDER_REVIEW também
UPDATE couriers SET 
  status = 'UNDER_REVIEW',
  submitted_at = now()
WHERE full_name = 'Kayo';