-- Verificar e criar buckets necessários para uploads
-- Primeiro verificar se os buckets existem
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

-- Políticas RLS para bucket 'avatars' (público)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('avatars', 'Users can upload their own avatar', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'INSERT', true),
    ('avatars', 'Users can update their own avatar', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'UPDATE', true),
    ('avatars', 'Users can delete their own avatar', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'DELETE', true),
    ('avatars', 'Avatar images are publicly accessible', 'true', null, 'SELECT', true)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Políticas RLS para bucket 'restaurants' (público)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('restaurants', 'Restaurant owners can upload images', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'INSERT', true),
    ('restaurants', 'Restaurant owners can update images', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'UPDATE', true),
    ('restaurants', 'Restaurant owners can delete images', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'DELETE', true),
    ('restaurants', 'Restaurant images are publicly accessible', 'true', null, 'SELECT', true)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Políticas RLS para bucket 'menu-items' (público)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('menu-items', 'Restaurant owners can upload menu item images', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'INSERT', true),
    ('menu-items', 'Restaurant owners can update menu item images', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'UPDATE', true),
    ('menu-items', 'Restaurant owners can delete menu item images', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'DELETE', true),
    ('menu-items', 'Menu item images are publicly accessible', 'true', null, 'SELECT', true)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Políticas RLS para bucket 'documents' (privado)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('documents', 'Users can upload their own documents', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'INSERT', true),
    ('documents', 'Users can view their own documents', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'SELECT', true),
    ('documents', 'Users can update their own documents', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'UPDATE', true),
    ('documents', 'Users can delete their own documents', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'DELETE', true),
    ('documents', 'Admins can view all documents', 'EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin'')', null, 'SELECT', true)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Políticas RLS para bucket 'chat-media' (privado)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('chat-media', 'Users can upload chat media', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'auth.uid() = (storage.foldername(name))[1]::uuid', 'INSERT', true),
    ('chat-media', 'Chat participants can view media', 'EXISTS(SELECT 1 FROM chat_threads ct WHERE ct.id = (storage.foldername(name))[2]::uuid AND (ct.customer_id = auth.uid() OR ct.seller_id = auth.uid() OR ct.courier_id = auth.uid()))', null, 'SELECT', true),
    ('chat-media', 'Users can delete their own chat media', 'auth.uid() = (storage.foldername(name))[1]::uuid', null, 'DELETE', true)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Políticas RLS para bucket 'pod-media' (privado)
INSERT INTO storage.policies (
    bucket_id, 
    name, 
    definition, 
    check_definition,
    command,
    is_using_defined_definition
)
VALUES 
    ('pod-media', 'Couriers can upload POD media', 'EXISTS(SELECT 1 FROM orders o WHERE o.id = (storage.foldername(name))[1]::uuid AND o.courier_id = auth.uid())', 'EXISTS(SELECT 1 FROM orders o WHERE o.id = (storage.foldername(name))[1]::uuid AND o.courier_id = auth.uid())', 'INSERT', true),
    ('pod-media', 'Order participants can view POD media', 'EXISTS(SELECT 1 FROM orders o WHERE o.id = (storage.foldername(name))[1]::uuid AND (o.user_id = auth.uid() OR o.courier_id = auth.uid() OR EXISTS(SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())))', null, 'SELECT', true),
    ('pod-media', 'Admins can view all POD media', 'EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin'')', null, 'SELECT', true)
ON CONFLICT (bucket_id, name) DO NOTHING;