-- Create platform_settings table for global platform configuration
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description, category) VALUES
('default_commission_rate', '{"percentage": 15.0, "min_amount": 2.00}', 'Taxa de comissão padrão da plataforma', 'financial'),
('payment_fees', '{"credit_card": 3.29, "debit_card": 1.99, "pix": 0.99}', 'Taxas de pagamento por método', 'financial'),
('delivery_settings', '{"max_distance_km": 15, "base_fee": 5.00, "per_km_rate": 1.50}', 'Configurações padrão de entrega', 'delivery'),
('order_limits', '{"max_items_per_order": 50, "max_order_value": 500.00, "min_order_value": 10.00}', 'Limites de pedidos da plataforma', 'orders'),
('notification_settings', '{"email_enabled": true, "sms_enabled": false, "push_enabled": true}', 'Configurações de notificações', 'notifications'),
('business_hours', '{"default_open": "08:00", "default_close": "22:00", "timezone": "America/Sao_Paulo"}', 'Horário comercial padrão', 'operational');