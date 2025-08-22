-- RBAC administrativo
CREATE TYPE admin_role AS ENUM ('SUPERADMIN','ADMIN','SUPPORT','AUDITOR');

CREATE TABLE admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Função para verificar se usuário tem papel administrativo
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS admin_role AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função para verificar se usuário tem papel administrativo específico
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND (
      role = required_role OR 
      (required_role != 'SUPERADMIN' AND role = 'SUPERADMIN')
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Notas internas por usuário
CREATE TABLE user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_admin_id uuid NOT NULL REFERENCES auth.users(id),
  note text NOT NULL,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON user_notes(target_user_id, created_at DESC);

-- Flags e medidas disciplinares (suspensão/ban)
CREATE TYPE user_enforcement AS ENUM ('WARN','SUSPEND','BAN');
CREATE TABLE user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type user_enforcement NOT NULL,
  reason text NOT NULL,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz NULL, -- null = indefinido
  created_by_admin uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT false
);
CREATE INDEX ON user_suspensions(target_user_id, is_active);

-- Trigger para atualizar is_active em user_suspensions
CREATE OR REPLACE FUNCTION update_suspension_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active := (
    (NEW.ends_at IS NULL AND now() >= NEW.starts_at) OR 
    (now() BETWEEN NEW.starts_at AND NEW.ends_at)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_suspensions_active
  BEFORE INSERT OR UPDATE ON user_suspensions
  FOR EACH ROW EXECUTE FUNCTION update_suspension_status();

-- Ações administrativas (auditoria imutável)
CREATE TABLE admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_table text NULL,
  target_id text NULL,
  reason text NULL,
  diff jsonb NULL,         -- antes/depois quando aplicável
  ip_address inet NULL,
  user_agent text NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON admin_actions_log(actor_admin_id, created_at DESC);
CREATE INDEX ON admin_actions_log(action, created_at DESC);
CREATE INDEX ON admin_actions_log(target_table, target_id, created_at DESC);

-- Soft delete / Anonimização LGPD
CREATE TABLE gdpr_erasure_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  process_after timestamptz NOT NULL, -- janelar (ex.: 30 dias)
  processed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'PENDING',
  erasure_type text NOT NULL DEFAULT 'SOFT', -- SOFT, ANON, HARD
  requested_by_admin uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  notes text NULL
);
CREATE INDEX ON gdpr_erasure_queue(status, process_after);

-- Configurações do sistema (sem foreign key para permitir dados iniciais)
CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid NULL,
  updated_at timestamptz DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO system_settings (key, value, description, updated_by) VALUES
('take_rate_default', '{"percentage": 15.0}', 'Taxa padrão da plataforma (%)', NULL),
('service_fee', '{"percentage": 2.0}', 'Taxa de serviço (%)', NULL),
('delivery_margin_target', '{"percentage": 8.0}', 'Margem alvo para delivery (%)', NULL),
('max_orders_per_hour', '{"value": 100}', 'Máximo de pedidos por hora por loja', NULL),
('tracking_retention_days', '{"value": 30}', 'Dias de retenção dos dados de tracking', NULL);

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_erasure_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users
CREATE POLICY "Superadmins can manage all admin users" 
ON admin_users FOR ALL 
USING (has_admin_role('SUPERADMIN'));

CREATE POLICY "Admins can view non-superadmin users" 
ON admin_users FOR SELECT 
USING (has_admin_role('ADMIN') AND role != 'SUPERADMIN');

-- Políticas para user_notes
CREATE POLICY "Admin users can manage notes" 
ON user_notes FOR ALL 
USING (has_admin_role('ADMIN'));

CREATE POLICY "Support can view notes" 
ON user_notes FOR SELECT 
USING (has_admin_role('SUPPORT'));

-- Políticas para user_suspensions
CREATE POLICY "Admin users can manage suspensions" 
ON user_suspensions FOR ALL 
USING (has_admin_role('ADMIN'));

CREATE POLICY "Support can view suspensions" 
ON user_suspensions FOR SELECT 
USING (has_admin_role('SUPPORT'));

-- Políticas para admin_actions_log
CREATE POLICY "Admin users can view audit logs" 
ON admin_actions_log FOR SELECT 
USING (has_admin_role('AUDITOR'));

CREATE POLICY "System can insert audit logs" 
ON admin_actions_log FOR INSERT 
WITH CHECK (true);

-- Políticas para gdpr_erasure_queue
CREATE POLICY "Admin users can manage GDPR erasure" 
ON gdpr_erasure_queue FOR ALL 
USING (has_admin_role('ADMIN'));

-- Políticas para system_settings
CREATE POLICY "Superadmins can manage system settings" 
ON system_settings FOR ALL 
USING (has_admin_role('SUPERADMIN'));

CREATE POLICY "Admin users can view system settings" 
ON system_settings FOR SELECT 
USING (has_admin_role('ADMIN'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para aplicar anonimização LGPD
CREATE OR REPLACE FUNCTION apply_gdpr_anonymization(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Anonimizar dados na tabela profiles
  UPDATE profiles SET
    full_name = 'Usuário Anônimo',
    phone = NULL,
    avatar_url = NULL
  WHERE user_id = target_user_id;
  
  -- Marcar como processado na fila GDPR
  UPDATE gdpr_erasure_queue SET
    processed_at = now(),
    status = 'PROCESSED'
  WHERE user_id = target_user_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;