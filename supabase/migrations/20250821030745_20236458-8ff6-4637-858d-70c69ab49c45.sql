-- 🔐 STORAGE RLS + PROTEÇÕES DE INTEGRIDADE

-- 1. Criar bucket para chat media se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 
  'chat-media', 
  false,  -- Privado
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies para Storage - Chat Media
-- Apenas participantes do thread podem ler arquivos
DROP POLICY IF EXISTS "Chat participants can view media" ON storage.objects;
CREATE POLICY "Chat participants can view media" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_threads t ON t.id = m.thread_id
    WHERE m.media_url = storage.objects.name
      AND (
        t.customer_id = auth.uid() OR 
        t.seller_id = auth.uid() OR 
        t.courier_id = auth.uid() OR
        get_current_user_role() = 'admin'
      )
  )
);

-- Apenas usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Authenticated users can upload to chat" ON storage.objects;
CREATE POLICY "Authenticated users can upload to chat" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
);

-- Usuários podem deletar seus próprios arquivos + admins podem moderar
DROP POLICY IF EXISTS "Users can delete own media or admins can moderate" ON storage.objects;
CREATE POLICY "Users can delete own media or admins can moderate" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND (
    owner = auth.uid() OR 
    get_current_user_role() = 'admin'
  )
);

-- 3. Proteção contra mutação de pedidos entregues
CREATE OR REPLACE FUNCTION public.prevent_delivered_order_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bloquear mudanças críticas em pedidos entregues
  IF OLD.status = 'delivered' AND TG_OP = 'UPDATE' THEN
    -- Permitir apenas mudanças em campos de review/feedback
    IF (
      OLD.total_amount != NEW.total_amount OR
      OLD.items != NEW.items OR
      OLD.delivery_address != NEW.delivery_address OR
      OLD.restaurant_id != NEW.restaurant_id OR
      OLD.user_id != NEW.user_id OR
      (NEW.status != 'delivered') -- Impedir mudança de status
    ) THEN
      -- Log da tentativa de mutação inválida
      INSERT INTO public.audit_logs (
        table_name, record_id, operation, 
        old_values, new_values, user_id, ip_address
      ) VALUES (
        'orders', NEW.id, 'BLOCKED_DELIVERED_MUTATION',
        row_to_json(OLD),
        row_to_json(NEW),
        auth.uid(),
        inet_client_addr()
      );
      
      RAISE EXCEPTION 'Cannot modify critical fields of delivered order. Order ID: %', OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger de proteção
DROP TRIGGER IF EXISTS trigger_prevent_delivered_mutations ON public.orders;
CREATE TRIGGER trigger_prevent_delivered_mutations
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delivered_order_mutations();

-- 4. Função para limpeza de tracking antigo (performance + LGPD)
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar tracking points mais antigos que 30 dias
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Deletar mensagens de chat mais antigas que 90 dias (apenas mídia, manter texto)
  UPDATE public.messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  -- Log da limpeza
  INSERT INTO public.audit_logs (
    table_name, operation, new_values, user_id
  ) VALUES (
    'system_cleanup', 'DATA_RETENTION_CLEANUP', 
    jsonb_build_object(
      'cleanup_date', now(),
      'tracking_retention_days', 30,
      'chat_media_retention_days', 90
    ),
    '00000000-0000-0000-0000-000000000000'
  );
END;
$$;