-- Pool matches and related tables
CREATE TABLE public.pool_matches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('RANKED', 'CASUAL')),
    buy_in INTEGER NOT NULL DEFAULT 10,
    rake_pct DECIMAL(3,2) NOT NULL DEFAULT 0.05,
    status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'LIVE', 'FINISHED', 'CANCELLED')),
    max_players INTEGER NOT NULL DEFAULT 2,
    players JSONB NOT NULL DEFAULT '[]',
    table_config JSONB NOT NULL DEFAULT '{}',
    balls JSONB NOT NULL DEFAULT '[]',
    turn_user_id UUID,
    game_phase TEXT NOT NULL DEFAULT 'BREAK' CHECK (game_phase IN ('BREAK', 'OPEN', 'GROUPS_SET', 'EIGHT_BALL')),
    ball_in_hand BOOLEAN DEFAULT false,
    shot_clock INTEGER DEFAULT 60,
    rules JSONB NOT NULL DEFAULT '{"shotClockSec": 60, "assistLevel": "SHORT"}',
    history JSONB NOT NULL DEFAULT '[]',
    winner_user_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pool_matches ENABLE ROW LEVEL SECURITY;

-- Pool match participants
CREATE TABLE public.pool_match_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.pool_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    seat INTEGER NOT NULL,
    connected BOOLEAN DEFAULT true,
    mmr INTEGER DEFAULT 1000,
    group_type TEXT CHECK (group_type IN ('SOLID', 'STRIPE')),
    credits_reserved INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pool_match_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for pool matches
CREATE POLICY "Users can view pool matches they participate in" 
ON public.pool_matches 
FOR SELECT 
USING (
    auth.uid() IN (
        SELECT user_id FROM pool_match_participants WHERE match_id = pool_matches.id
    )
);

CREATE POLICY "Users can create pool matches" 
ON public.pool_matches 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for participants  
CREATE POLICY "Users can view match participants for their matches"
ON public.pool_match_participants
FOR SELECT
USING (
    match_id IN (
        SELECT id FROM pool_matches WHERE 
        auth.uid() IN (SELECT user_id FROM pool_match_participants WHERE match_id = pool_matches.id)
    )
);

CREATE POLICY "Users can join matches"
ON public.pool_match_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_pool_matches_status ON public.pool_matches(status);
CREATE INDEX idx_pool_matches_created_at ON public.pool_matches(created_at);
CREATE INDEX idx_pool_match_participants_match_id ON public.pool_match_participants(match_id);
CREATE INDEX idx_pool_match_participants_user_id ON public.pool_match_participants(user_id);

-- Update trigger for pool_matches
CREATE TRIGGER update_pool_matches_updated_at
BEFORE UPDATE ON public.pool_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();