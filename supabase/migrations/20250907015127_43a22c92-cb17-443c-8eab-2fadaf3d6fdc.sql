-- Create game_wallets table
CREATE TABLE IF NOT EXISTS game_wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 1000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE game_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wallet" ON game_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON game_wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage wallets" ON game_wallets
  FOR ALL USING (is_system_operation());

CREATE POLICY "Users can insert their own wallet" ON game_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_wallets_updated_at
  BEFORE UPDATE ON game_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create wallet for existing user
INSERT INTO game_wallets (user_id, balance) 
VALUES ('80b3df54-5c11-4b88-ad6f-81564ffe7da0', 1000)
ON CONFLICT (user_id) DO NOTHING;