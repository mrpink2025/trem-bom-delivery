-- Verificar e criar buckets necessários para uploads
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Verificar e criar bucket 'avatars'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
    END IF;

    -- Verificar e criar bucket 'restaurants'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'restaurants') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('restaurants', 'restaurants', true);
    END IF;

    -- Verificar e criar bucket 'menu-items'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'menu-items') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('menu-items', 'menu-items', true);
    END IF;

    -- Verificar e criar bucket 'documents'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'documents') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
    END IF;

    -- Verificar e criar bucket 'chat-media'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'chat-media') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false);
    END IF;

    -- Verificar e criar bucket 'pod-media'
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'pod-media') INTO bucket_exists;
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('pod-media', 'pod-media', false);
    END IF;
END $$;

-- Remover políticas existentes e criar novas
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Restaurant owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant images are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Restaurant owners can upload menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can update menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant owners can delete menu item images" ON storage.objects;
DROP POLICY IF EXISTS "Menu item images are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;

-- Políticas RLS para bucket 'avatars'
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas RLS para bucket 'restaurants'
CREATE POLICY "Restaurant owners can upload images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Restaurant images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'restaurants');

CREATE POLICY "Restaurant owners can update images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Restaurant owners can delete images" ON storage.objects
    FOR DELETE USING (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas RLS para bucket 'menu-items'
CREATE POLICY "Restaurant owners can upload menu item images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Menu item images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'menu-items');

CREATE POLICY "Restaurant owners can update menu item images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Restaurant owners can delete menu item images" ON storage.objects
    FOR DELETE USING (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas RLS para bucket 'documents'
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));