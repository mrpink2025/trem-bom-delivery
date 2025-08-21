-- =====================================================
-- 🗓️ JOB AGENDADO: Cleanup automático de dados antigos
-- =====================================================

-- Ativar extensões necessárias para CRON jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Job agendado diário para limpeza de dados (executa às 2:00 AM)
SELECT cron.schedule(
    'cleanup-old-data',
    '0 2 * * *', -- Todos os dias às 2:00 AM
    $$
    SELECT
      net.http_post(
          url:='https://ighllleypgbkluhcihvs.supabase.co/functions/v1/cleanup-old-data',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaGxsbGV5cGdia2x1aGNpaHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcwODQzMiwiZXhwIjoyMDcxMjg0NDMyfQ.puFdXPvhop8DhaUhzLUNYcTrxlf1TIGN-SGCiZJdVJs"}'::jsonb,
          body:=concat('{"scheduled_run": true, "timestamp": "', now(), '"}')::jsonb
      ) as request_id;
    $$
);

-- Tabela para métricas de execução do cleanup
CREATE TABLE IF NOT EXISTS public.cleanup_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    tracking_records_removed INTEGER DEFAULT 0,
    chat_media_cleaned INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    error_message TEXT,
    triggered_by TEXT DEFAULT 'cron_job'
);

-- RLS para métricas (apenas admins visualizam)
ALTER TABLE public.cleanup_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup metrics" ON public.cleanup_metrics
FOR SELECT USING (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "System can insert cleanup metrics" ON public.cleanup_metrics
FOR INSERT WITH CHECK (true);