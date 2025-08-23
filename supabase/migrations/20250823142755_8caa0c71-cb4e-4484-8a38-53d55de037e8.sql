-- CRITICAL SECURITY FIXES: Storage Security (Final)
-- Implement essential storage security and create security monitoring

-- Ensure storage buckets exist with proper security settings
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('restaurants', 'restaurants', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop ALL existing storage policies to start fresh
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects; 
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can manage their images" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can view media" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can access media" ON storage.objects;

-- Create comprehensive avatar storage security
CREATE POLICY "Secure avatar uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Public avatar access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users manage own avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Restaurant image security
CREATE POLICY "Restaurant owner image uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.owner_id = auth.uid() 
    AND r.id::text = (storage.foldername(name))[1]
  ) AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Public restaurant image access" ON storage.objects
FOR SELECT USING (bucket_id = 'restaurants');

-- Secure chat media access
CREATE POLICY "Chat media participant access" ON storage.objects
FOR ALL USING (
  bucket_id = 'chat-media' AND 
  EXISTS (
    SELECT 1 FROM chat_threads ct 
    WHERE ct.id::text = (storage.foldername(name))[1] 
    AND (
      ct.customer_id = auth.uid() OR 
      ct.seller_id = auth.uid() OR 
      ct.courier_id = auth.uid()
    )
  )
);

-- Create security monitoring functions with proper search path
CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type TEXT,
  details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    new_values,
    user_id
  ) VALUES (
    'security_violations',
    violation_type,
    jsonb_build_object(
      'severity', 'HIGH',
      'details', details,
      'timestamp', now(),
      'source', 'security_monitor'
    ),
    auth.uid()
  );
END;
$function$;

-- Create data retention management function
CREATE OR REPLACE FUNCTION public.schedule_data_cleanup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log cleanup scheduling
  INSERT INTO audit_logs (
    table_name,
    operation,
    new_values,
    user_id
  ) VALUES (
    'data_retention',
    'CLEANUP_SCHEDULED',
    jsonb_build_object(
      'scheduled_at', now(),
      'retention_policy', '30_days_tracking_90_days_media'
    ),
    '00000000-0000-0000-0000-000000000000'
  );
END;
$function$;