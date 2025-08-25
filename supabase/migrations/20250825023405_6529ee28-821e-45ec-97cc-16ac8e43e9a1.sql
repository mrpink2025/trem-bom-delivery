-- Create delivery confirmations table for secure delivery verification
CREATE TABLE public.delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  confirmation_code TEXT NOT NULL,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  location_lat NUMERIC,
  location_lng NUMERIC,
  code_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies for delivery confirmations
CREATE POLICY "Couriers can insert delivery confirmations" 
ON public.delivery_confirmations 
FOR INSERT 
WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Couriers can view their delivery confirmations" 
ON public.delivery_confirmations 
FOR SELECT 
USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can update delivery confirmations" 
ON public.delivery_confirmations 
FOR UPDATE 
USING (auth.uid() = courier_id);

CREATE POLICY "Customers can view their delivery confirmations" 
ON public.delivery_confirmations 
FOR SELECT 
USING (auth.uid() = customer_id);

-- Add phone_number column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Enhanced audit logs table for location and delivery tracking
CREATE TABLE IF NOT EXISTS public.location_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL,
  order_id UUID,
  event_type TEXT NOT NULL, -- 'location_update', 'delivery_confirmation', 'status_change'
  location_lat NUMERIC,
  location_lng NUMERIC,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.location_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit logs
CREATE POLICY "System can insert location audit logs" 
ON public.location_audit_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all location audit logs" 
ON public.location_audit_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Couriers can view their location audit logs" 
ON public.location_audit_logs 
FOR SELECT 
USING (auth.uid() = courier_id);

-- Function to generate delivery confirmation code based on last 4 digits of phone
CREATE OR REPLACE FUNCTION public.generate_delivery_confirmation_code(p_customer_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_last_four TEXT;
BEGIN
  -- Extract last 4 digits from phone number
  v_last_four := RIGHT(REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g'), 4);
  
  -- If phone has less than 4 digits, pad with zeros
  IF LENGTH(v_last_four) < 4 THEN
    v_last_four := LPAD(v_last_four, 4, '0');
  END IF;
  
  RETURN v_last_four;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate delivery confirmation
CREATE OR REPLACE FUNCTION public.validate_delivery_confirmation(
  p_order_id UUID,
  p_courier_id UUID,
  p_confirmation_code TEXT,
  p_location_lat NUMERIC DEFAULT NULL,
  p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_customer_phone TEXT;
  v_expected_code TEXT;
  v_confirmation_record RECORD;
  v_result JSONB;
BEGIN
  -- Get customer phone from order
  SELECT p.phone_number INTO v_customer_phone
  FROM public.orders o
  JOIN public.profiles p ON p.user_id = o.user_id
  WHERE o.id = p_order_id AND p.phone_verified = TRUE;
  
  IF v_customer_phone IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer phone not found or not verified'
    );
  END IF;
  
  -- Generate expected code
  v_expected_code := generate_delivery_confirmation_code(v_customer_phone);
  
  -- Get existing confirmation record
  SELECT * INTO v_confirmation_record
  FROM public.delivery_confirmations
  WHERE order_id = p_order_id AND courier_id = p_courier_id;
  
  -- If no record exists, create one
  IF v_confirmation_record IS NULL THEN
    INSERT INTO public.delivery_confirmations (
      order_id, courier_id, customer_id, confirmation_code, location_lat, location_lng
    ) 
    SELECT p_order_id, p_courier_id, o.user_id, v_expected_code, p_location_lat, p_location_lng
    FROM public.orders o 
    WHERE o.id = p_order_id;
  ELSE
    -- Update attempt count
    UPDATE public.delivery_confirmations 
    SET code_attempts = code_attempts + 1,
        location_lat = COALESCE(p_location_lat, location_lat),
        location_lng = COALESCE(p_location_lng, location_lng)
    WHERE order_id = p_order_id AND courier_id = p_courier_id;
  END IF;
  
  -- Validate code
  IF p_confirmation_code = v_expected_code THEN
    -- Mark as confirmed
    UPDATE public.delivery_confirmations 
    SET is_confirmed = TRUE, 
        confirmed_at = NOW(),
        location_lat = COALESCE(p_location_lat, location_lat),
        location_lng = COALESCE(p_location_lng, location_lng)
    WHERE order_id = p_order_id AND courier_id = p_courier_id;
    
    -- Log successful confirmation
    INSERT INTO public.location_audit_logs (
      courier_id, order_id, event_type, location_lat, location_lng, metadata
    ) VALUES (
      p_courier_id, p_order_id, 'delivery_confirmation', 
      p_location_lat, p_location_lng,
      jsonb_build_object('confirmation_code', p_confirmation_code, 'success', true)
    );
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Delivery confirmed successfully'
    );
  ELSE
    -- Log failed attempt
    INSERT INTO public.location_audit_logs (
      courier_id, order_id, event_type, location_lat, location_lng, metadata
    ) VALUES (
      p_courier_id, p_order_id, 'delivery_confirmation_failed', 
      p_location_lat, p_location_lng,
      jsonb_build_object('confirmation_code', p_confirmation_code, 'expected_code', v_expected_code, 'success', false)
    );
    
    v_result := jsonb_build_object(
      'success', false,
      'error', 'Invalid confirmation code',
      'attempts', COALESCE((SELECT code_attempts FROM public.delivery_confirmations WHERE order_id = p_order_id AND courier_id = p_courier_id), 0)
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;