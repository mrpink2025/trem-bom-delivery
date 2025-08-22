-- Verificar e criar buckets necessários para uploads
-- Primeiro verificar se os buckets existem e criá-los
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

-- Políticas RLS para bucket 'avatars' usando CREATE POLICY
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Políticas RLS para bucket 'restaurants'
CREATE POLICY IF NOT EXISTS "Restaurant owners can upload images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Restaurant owners can update images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Restaurant owners can delete images" ON storage.objects
    FOR DELETE USING (bucket_id = 'restaurants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Restaurant images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'restaurants');

-- Políticas RLS para bucket 'menu-items'
CREATE POLICY IF NOT EXISTS "Restaurant owners can upload menu item images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Restaurant owners can update menu item images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Restaurant owners can delete menu item images" ON storage.objects
    FOR DELETE USING (bucket_id = 'menu-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Menu item images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'menu-items');

-- Políticas RLS para bucket 'documents'
CREATE POLICY IF NOT EXISTS "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Admins can view all documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Políticas RLS para bucket 'chat-media'
CREATE POLICY IF NOT EXISTS "Users can upload chat media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Chat participants can view media" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-media' AND 
        EXISTS(SELECT 1 FROM chat_threads ct WHERE 
            ct.id = (storage.foldername(name))[2]::uuid AND 
            (ct.customer_id = auth.uid() OR ct.seller_id = auth.uid() OR ct.courier_id = auth.uid())));

CREATE POLICY IF NOT EXISTS "Users can delete their own chat media" ON storage.objects
    FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas RLS para bucket 'pod-media'
CREATE POLICY IF NOT EXISTS "Couriers can upload POD media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'pod-media' AND 
        EXISTS(SELECT 1 FROM orders o WHERE 
            o.id = (storage.foldername(name))[1]::uuid AND 
            o.courier_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Order participants can view POD media" ON storage.objects
    FOR SELECT USING (bucket_id = 'pod-media' AND 
        EXISTS(SELECT 1 FROM orders o WHERE 
            o.id = (storage.foldername(name))[1]::uuid AND 
            (o.user_id = auth.uid() OR o.courier_id = auth.uid() OR 
             EXISTS(SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid()))));

CREATE POLICY IF NOT EXISTS "Admins can view all POD media" ON storage.objects
    FOR SELECT USING (bucket_id = 'pod-media' AND 
        EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));