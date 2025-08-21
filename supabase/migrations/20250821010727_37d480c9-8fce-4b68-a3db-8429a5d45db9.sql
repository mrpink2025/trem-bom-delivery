-- 1. Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('restaurants', 'restaurants', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('menu-items', 'menu-items', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

-- 2. RLS policies for avatars bucket (public read, user-specific write)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. RLS policies for restaurants bucket (public read, restaurant owner write)
CREATE POLICY "Restaurant images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'restaurants');

CREATE POLICY "Restaurant owners can upload restaurant images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update restaurant images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete restaurant images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

-- 4. RLS policies for menu-items bucket (public read, restaurant owner write)
CREATE POLICY "Menu item images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'menu-items');

CREATE POLICY "Restaurant owners can upload menu item images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'menu-items' AND 
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update menu item images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'menu-items' AND 
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete menu item images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'menu-items' AND 
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id::text = (storage.foldername(name))[1] 
    AND r.owner_id = auth.uid()
  )
);

-- 5. RLS policies for documents bucket (private, user-specific access)
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Admin access to all storage objects
CREATE POLICY "Admins can manage all storage objects" 
ON storage.objects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_owner 
ON storage.objects(bucket_id, owner);

CREATE INDEX IF NOT EXISTS idx_storage_objects_created_at 
ON storage.objects(created_at);

-- 8. Create function to get file URLs
CREATE OR REPLACE FUNCTION public.get_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN bucket_name IN ('avatars', 'restaurants', 'menu-items') THEN
      'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path
    ELSE
      'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/sign/' || bucket_name || '/' || file_path
  END;
$$;