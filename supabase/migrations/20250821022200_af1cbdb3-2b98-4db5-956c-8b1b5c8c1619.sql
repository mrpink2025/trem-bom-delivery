-- RLS Policies para Storage - Moderação de conteúdo

-- 1. Política para bucket 'documents' - Arquivos privados dos chats
-- Autor e admin podem ler
CREATE POLICY "Chat participants can view documents"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' AND
  (
    -- Admin pode ver tudo
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' OR
    -- Participantes do thread podem ver
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Verificar se é participante do chat baseado no nome do arquivo
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id::text = (storage.foldername(name))[2]
      AND (ct.seller_id = auth.uid() OR ct.courier_id = auth.uid() OR ct.customer_id = auth.uid())
    )
  )
);

-- Apenas participantes podem fazer upload
CREATE POLICY "Chat participants can upload documents"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND
  (
    -- Verificar se é participante do thread
    EXISTS (
      SELECT 1 FROM public.chat_threads ct
      WHERE ct.id::text = (storage.foldername(name))[2]
      AND (ct.seller_id = auth.uid() OR ct.courier_id = auth.uid() OR ct.customer_id = auth.uid())
    )
  )
);

-- 2. Política para moderação - Admin pode deletar conteúdo reportado
CREATE POLICY "Admins can delete reported content"
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents' AND
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- 3. Bloquear acesso público aos documentos
CREATE POLICY "Block public access to documents"
ON storage.objects FOR SELECT 
USING (
  bucket_id != 'documents' OR auth.uid() IS NOT NULL
);