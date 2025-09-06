-- Enable RLS on tables that don't have it
ALTER TABLE public.pool_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_match_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pool_matches
CREATE POLICY "Users can view matches they participate in" 
ON public.pool_matches 
FOR SELECT 
USING (
  creator_user_id = auth.uid() OR 
  opponent_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(players) as player 
    WHERE (player->>'userId')::uuid = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create matches" 
ON public.pool_matches 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Players can update their own matches" 
ON public.pool_matches 
FOR UPDATE 
USING (
  creator_user_id = auth.uid() OR 
  opponent_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(players) as player 
    WHERE (player->>'userId')::uuid = auth.uid()
  )
);

-- Create RLS policies for pool_match_participants  
CREATE POLICY "Users can view their own participation records" 
ON public.pool_match_participants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own participation records" 
ON public.pool_match_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation records" 
ON public.pool_match_participants 
FOR UPDATE 
USING (user_id = auth.uid());