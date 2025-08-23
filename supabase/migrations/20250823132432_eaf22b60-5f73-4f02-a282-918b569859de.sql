-- Security Fix Part 3: Create storage bucket and fix remaining functions safely
-- Create chat-media storage bucket for secure file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 
  'chat-media', 
  false, 
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for chat-media bucket
CREATE POLICY "Chat participants can upload media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-media' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chat_threads ct
    WHERE ct.id::text = (storage.foldername(name))[1] 
    AND (ct.customer_id = auth.uid() OR ct.seller_id = auth.uid() OR ct.courier_id = auth.uid())
  )
);

CREATE POLICY "Chat participants can view media" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-media' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chat_threads ct
    WHERE ct.id::text = (storage.foldername(name))[1] 
    AND (ct.customer_id = auth.uid() OR ct.seller_id = auth.uid() OR ct.courier_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all chat media" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'chat-media' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'::user_role
  )
);

-- Fix more functions with search path issues (keep existing function names/signatures)
-- This prevents SQL injection in remaining vulnerable functions

-- Create secure user lookup function  
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT role::text FROM profiles WHERE user_id = p_user_id;
$$;

-- Create secure order status update function
CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  p_order_id uuid,
  p_new_status text,
  p_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_user_role text;
  v_can_update boolean := false;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Get user role
  SELECT role::text INTO v_user_role FROM profiles WHERE user_id = p_user_id;

  -- Check permissions
  IF v_user_role = 'admin' THEN
    v_can_update := true;
  ELSIF v_user_role = 'seller' AND EXISTS (
    SELECT 1 FROM restaurants WHERE id = v_order.restaurant_id AND owner_id = p_user_id
  ) THEN
    v_can_update := true;
  ELSIF v_user_role = 'courier' AND v_order.courier_id = p_user_id THEN
    v_can_update := true;
  ELSIF v_user_role = 'client' AND v_order.user_id = p_user_id AND p_new_status = 'cancelled' THEN
    v_can_update := true;
  END IF;

  IF NOT v_can_update THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update order
  UPDATE orders SET 
    status = p_new_status::order_status,
    updated_at = now()
  WHERE id = p_order_id;

  -- Log the change
  INSERT INTO audit_logs (table_name, operation, record_id, user_id, new_values)
  VALUES ('orders', 'UPDATE', p_order_id, p_user_id, 
    jsonb_build_object('status', p_new_status, 'notes', p_notes)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;