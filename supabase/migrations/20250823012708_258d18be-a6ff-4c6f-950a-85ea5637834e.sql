-- Adicionar colunas para configurações de restaurante
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{
  "acceptsCash": true,
  "acceptsCard": true,
  "acceptsPix": true,
  "requiresMinOrder": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{
  "emailNewOrders": true,
  "emailOrderUpdates": true,
  "smsNewOrders": false,
  "smsOrderUpdates": false,
  "pushNotifications": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS estimated_delivery_time integer DEFAULT 45;