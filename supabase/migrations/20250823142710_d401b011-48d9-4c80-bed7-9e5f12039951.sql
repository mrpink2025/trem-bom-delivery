-- CRITICAL SECURITY FIXES: Storage Security & Audit System
-- Implement comprehensive storage security and audit logging

-- Add storage buckets with proper security settings
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('restaurants', 'restaurants', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects; 
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can upload media" ON storage.objects;

-- Avatar storage policies with file type restrictions
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Restaurant image policies
CREATE POLICY "Restaurant owners can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.owner_id = auth.uid() 
    AND r.id::text = (storage.foldername(name))[1]
  ) AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Anyone can view restaurant images" ON storage.objects
FOR SELECT USING (bucket_id = 'restaurants');

CREATE POLICY "Restaurant owners can manage their images" ON storage.objects
FOR ALL USING (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.owner_id = auth.uid() 
    AND r.id::text = (storage.foldername(name))[1]
  )
);

-- Chat media policies with strict access control  
CREATE POLICY "Chat participants can upload media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-media' AND 
  EXISTS (
    SELECT 1 FROM chat_threads ct 
    WHERE ct.id::text = (storage.foldername(name))[1] 
    AND (
      ct.customer_id = auth.uid() OR 
      ct.seller_id = auth.uid() OR 
      ct.courier_id = auth.uid()
    )
  ) AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'mp3', 'wav', 'pdf')
);

CREATE POLICY "Chat participants can view media" ON storage.objects
FOR SELECT USING (
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

-- Enhanced security audit trigger
CREATE OR REPLACE FUNCTION public.audit_file_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access to sensitive files
  IF COALESCE(NEW.bucket_id, OLD.bucket_id) IN ('chat-media', 'restaurants') THEN
    INSERT INTO audit_logs (
      table_name,
      operation, 
      new_values,
      user_id
    ) VALUES (
      'storage_access',
      TG_OP,
      jsonb_build_object(
        'bucket_id', COALESCE(NEW.bucket_id, OLD.bucket_id),
        'file_path', COALESCE(NEW.name, OLD.name),
        'file_size', COALESCE(NEW.metadata->>'size', OLD.metadata->>'size'),
        'content_type', COALESCE(NEW.metadata->>'mimetype', OLD.metadata->>'mimetype'),
        'timestamp', now()
      ),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for file access auditing
CREATE TRIGGER storage_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION audit_file_access();