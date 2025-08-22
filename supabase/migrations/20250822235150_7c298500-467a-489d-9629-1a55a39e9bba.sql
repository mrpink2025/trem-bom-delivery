-- Atualizar apenas o courier para status UNDER_REVIEW
UPDATE couriers SET 
  status = 'UNDER_REVIEW',
  submitted_at = now()
WHERE full_name = 'Kayo';