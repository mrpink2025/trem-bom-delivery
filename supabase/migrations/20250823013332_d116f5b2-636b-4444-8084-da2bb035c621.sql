-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Criar políticas RLS para o bucket product-images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Restaurant owners can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' AND 
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE owner_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Restaurant owners can update their product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' AND 
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE owner_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Restaurant owners can delete their product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' AND 
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE owner_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);