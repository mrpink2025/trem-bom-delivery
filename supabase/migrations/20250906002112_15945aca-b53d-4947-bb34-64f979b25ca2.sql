-- Criação das tabelas para o módulo de Jogos com Créditos

-- Enum types para jogos
CREATE TYPE game_type AS ENUM ('TRUCO', 'SINUCA', 'DAMAS', 'VELHA');
CREATE TYPE match_status AS ENUM ('LOBBY', 'LIVE', 'FINISHED', 'CANCELLED');
CREATE TYPE match_mode AS ENUM ('RANKED', 'CASUAL');
CREATE TYPE ledger_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE ledger_reason AS ENUM ('BUY_IN', 'PRIZE', 'RAKE', 'REFUND', 'ADMIN_ADJUST', 'PURCHASE');
CREATE TYPE report_reason AS ENUM ('CHEAT', 'ABUSE', 'OTHER');

-- Carteira de créditos dos usuários
CREATE TABLE public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    locked_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Histórico de transações da carteira
CREATE TABLE public.wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type ledger_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason ledger_reason NOT NULL,
    match_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partidas/Salas de jogo
CREATE TABLE public.game_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game game_type NOT NULL,
    mode match_mode NOT NULL,
    buy_in DECIMAL(10,2) NOT NULL,
    rake_pct DECIMAL(3,2) NOT NULL DEFAULT 0.05, -- 5% default
    status match_status NOT NULL DEFAULT 'LOBBY',
    max_players INTEGER NOT NULL,
    current_players INTEGER NOT NULL DEFAULT 0,
    rng_seed TEXT,
    game_state JSONB NOT NULL DEFAULT '{}',
    winner_user_ids UUID[],
    prize_pool DECIMAL(10,2),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE
);

-- Jogadores em cada partida
CREATE TABLE public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    score INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(match_id, user_id),
    UNIQUE(match_id, seat_number)
);

-- Espectadores em partidas públicas
CREATE TABLE public.match_spectators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(match_id, user_id)
);

-- Sistema de ranking/ELO por jogo
CREATE TABLE public.player_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game game_type NOT NULL,
    mode match_mode NOT NULL,
    elo_rating INTEGER NOT NULL DEFAULT 1200,
    matches_played INTEGER NOT NULL DEFAULT 0,
    matches_won INTEGER NOT NULL DEFAULT 0,
    matches_lost INTEGER NOT NULL DEFAULT 0,
    win_streak INTEGER NOT NULL DEFAULT 0,
    best_win_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, game, mode)
);

-- Denúncias de usuários
CREATE TABLE public.game_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES game_matches(id),
    reporter_user_id UUID NOT NULL REFERENCES auth.users(id),
    reported_user_id UUID NOT NULL REFERENCES auth.users(id),
    reason report_reason NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Log de eventos de auditoria para partidas
CREATE TABLE public.match_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES game_matches(id),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    sequence_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(match_id, sequence_number)
);

-- Configurações do sistema de jogos
CREATE TABLE public.game_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_spectators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_wallets
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage wallets" ON public.user_wallets
    FOR ALL USING (is_system_operation());

-- Políticas RLS para wallet_ledger
CREATE POLICY "Users can view their own transactions" ON public.wallet_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage ledger" ON public.wallet_ledger
    FOR ALL USING (is_system_operation());

-- Políticas RLS para game_matches
CREATE POLICY "Anyone can view public matches" ON public.game_matches
    FOR SELECT USING (true);

CREATE POLICY "Users can create matches" ON public.game_matches
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Match participants can update" ON public.game_matches
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM match_players WHERE match_id = id AND user_id = auth.uid())
    );

CREATE POLICY "System can manage matches" ON public.game_matches
    FOR ALL USING (is_system_operation());

-- Políticas RLS para match_players
CREATE POLICY "Anyone can view match players" ON public.match_players
    FOR SELECT USING (true);

CREATE POLICY "Users can join matches" ON public.match_players
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their status" ON public.match_players
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage players" ON public.match_players
    FOR ALL USING (is_system_operation());

-- Políticas RLS para match_spectators
CREATE POLICY "Anyone can view spectators" ON public.match_spectators
    FOR SELECT USING (true);

CREATE POLICY "Users can become spectators" ON public.match_spectators
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave as spectators" ON public.match_spectators
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para player_rankings
CREATE POLICY "Anyone can view rankings" ON public.player_rankings
    FOR SELECT USING (true);

CREATE POLICY "System can manage rankings" ON public.player_rankings
    FOR ALL USING (is_system_operation());

-- Políticas RLS para game_reports
CREATE POLICY "Users can view their reports" ON public.game_reports
    FOR SELECT USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can create reports" ON public.game_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can manage reports" ON public.game_reports
    FOR ALL USING (has_role('admin'::user_role));

-- Políticas RLS para match_audit_log
CREATE POLICY "Match participants can view audit log" ON public.match_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM match_players WHERE match_id = match_audit_log.match_id AND user_id = auth.uid()) OR
        has_role('admin'::user_role)
    );

CREATE POLICY "System can manage audit log" ON public.match_audit_log
    FOR ALL USING (is_system_operation());

-- Políticas RLS para game_config
CREATE POLICY "Anyone can view game config" ON public.game_config
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage config" ON public.game_config
    FOR ALL USING (has_role('admin'::user_role));

-- Índices para performance
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX idx_wallet_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX idx_wallet_ledger_match_id ON public.wallet_ledger(match_id);
CREATE INDEX idx_game_matches_status ON public.game_matches(status);
CREATE INDEX idx_game_matches_game ON public.game_matches(game);
CREATE INDEX idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX idx_match_players_user_id ON public.match_players(user_id);
CREATE INDEX idx_player_rankings_user_id ON public.player_rankings(user_id);
CREATE INDEX idx_player_rankings_game_mode ON public.player_rankings(game, mode);
CREATE INDEX idx_match_audit_log_match_id ON public.match_audit_log(match_id);

-- Triggers para atualização automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_wallets_updated_at 
    BEFORE UPDATE ON public.user_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_matches_updated_at 
    BEFORE UPDATE ON public.game_matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_rankings_updated_at 
    BEFORE UPDATE ON public.player_rankings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para inicializar carteira do usuário
CREATE OR REPLACE FUNCTION initialize_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id, balance, locked_balance)
    VALUES (NEW.id, 0.00, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar carteira automaticamente quando usuário é criado
CREATE TRIGGER on_auth_user_created_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_wallet();

-- Inserir configurações padrão
INSERT INTO public.game_config (key, value, description) VALUES 
('default_rake_pct', '0.05', 'Taxa padrão da casa (5%)'),
('credit_conversion_rate', '1.0', 'Taxa de conversão R$ para créditos (1:1)'),
('max_buy_in', '100.0', 'Buy-in máximo permitido'),
('min_buy_in', '1.0', 'Buy-in mínimo permitido'),
('turn_timer_seconds', '30', 'Tempo limite por turno em segundos'),
('reconnect_timeout_seconds', '60', 'Tempo para reconexão antes de considerar abandono'),
('min_age_restriction', '18', 'Idade mínima para jogar'),
('truco_rules', '{"variant": "paulista", "deck_size": 40, "manilhas": true}', 'Regras do Truco'),
('sinuca_rules', '{"type": "8ball", "physics_engine": "deterministic"}', 'Regras da Sinuca'),
('damas_rules', '{"board_size": "8x8", "variant": "brazilian"}', 'Regras das Damas'),
('velha_rules', '{"best_of": 5, "turn_timer": 10}', 'Regras do Jogo da Velha')
ON CONFLICT (key) DO NOTHING;