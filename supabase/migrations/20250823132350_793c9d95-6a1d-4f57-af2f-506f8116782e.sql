-- Security Fix Part 2: Drop and recreate all functions with proper search_path
-- Drop existing functions that need to be fixed
DROP FUNCTION IF EXISTS public.has_role(user_role);
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.has_admin_role(admin_role);

-- Create security definer functions for role checking to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE  
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_role(p_role admin_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = p_role
  );
$$;

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
  has_role('admin'::user_role)
);

-- Tighten overly permissive RLS policies - Replace dangerous "WITH CHECK (true)" policies
-- Update chat_rooms policy to be more specific
DROP POLICY IF EXISTS "System can manage chat rooms" ON chat_rooms;
CREATE POLICY "System can create chat rooms for valid orders" 
ON chat_rooms 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id 
    AND (o.user_id = ANY(array(SELECT jsonb_array_elements_text(participants)::uuid))
         OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = ANY(array(SELECT jsonb_array_elements_text(participants)::uuid))))
  )
);

CREATE POLICY "System can update chat rooms" 
ON chat_rooms 
FOR UPDATE 
USING (true);

-- Update chat_threads policy
DROP POLICY IF EXISTS "System can create chat threads" ON chat_threads;
CREATE POLICY "System can create chat threads for valid orders" 
ON chat_threads 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
    AND (o.user_id = customer_id OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = seller_id))
  )
);

-- Update device_sessions policy  
DROP POLICY IF EXISTS "System can manage device sessions" ON device_sessions;
CREATE POLICY "System can insert device sessions" 
ON device_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update device sessions" 
ON device_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update audit_logs policy
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" 
ON audit_logs 
FOR INSERT 
WITH CHECK (
  -- Allow system operations and authenticated user operations
  (user_id IS NULL OR user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000')
);