-- Create function to initialize customer rewards
CREATE OR REPLACE FUNCTION public.initialize_customer_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_rewards (user_id, current_points, total_points_earned)
  VALUES (NEW.id, 1000, 1000) -- Give 1000 initial credits
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically initialize rewards for new users
DROP TRIGGER IF EXISTS on_auth_user_created_rewards ON auth.users;
CREATE TRIGGER on_auth_user_created_rewards
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_customer_rewards();

-- Initialize rewards for all existing users that don't have an entry
INSERT INTO customer_rewards (user_id, current_points, total_points_earned, created_at, updated_at)
SELECT 
  u.id,
  1000, -- Initial credits
  1000, -- Total earned (same as current for initial)
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN customer_rewards cr ON u.id = cr.user_id
WHERE cr.user_id IS NULL;

-- Create function to add daily credits (bonus system)
CREATE OR REPLACE FUNCTION public.add_daily_bonus_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Give 100 credits daily to all users
  UPDATE customer_rewards 
  SET 
    current_points = current_points + 100,
    total_points_earned = total_points_earned + 100,
    updated_at = NOW()
  WHERE updated_at::date < CURRENT_DATE;
  
  -- Log the bonus
  INSERT INTO game_ledger (user_id, amount_credits, type, description, balance_after)
  SELECT 
    user_id,
    100,
    'DAILY_BONUS',
    'Daily bonus credits',
    current_points
  FROM customer_rewards
  WHERE updated_at::date = CURRENT_DATE;
END;
$$;