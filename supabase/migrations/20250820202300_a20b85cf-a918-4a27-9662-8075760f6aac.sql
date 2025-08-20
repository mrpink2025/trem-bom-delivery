-- Create admin access policies

-- Policy for admin users to view all system data
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'::user_role
  )
);

-- Policy for admin users to view all orders  
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'::user_role
  )
);

-- Policy for admin users to view all restaurants
CREATE POLICY "Admins can view all restaurants" 
ON public.restaurants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'::user_role
  )
);

-- Create RPC function for real analytics data
CREATE OR REPLACE FUNCTION public.get_analytics_data(days_back integer DEFAULT 30)
RETURNS TABLE(
  total_revenue numeric,
  total_orders bigint,
  total_users bigint,
  avg_delivery_time numeric,
  revenue_growth numeric,
  orders_growth numeric,
  monthly_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_revenue numeric;
  previous_revenue numeric;
  current_orders bigint;
  previous_orders bigint;
BEGIN
  -- Get current period data
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO current_revenue, current_orders
  FROM public.orders 
  WHERE created_at >= current_date - interval '1 day' * days_back
  AND status = 'delivered';

  -- Get previous period data for growth calculation
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO previous_revenue, previous_orders
  FROM public.orders 
  WHERE created_at >= current_date - interval '1 day' * (days_back * 2)
  AND created_at < current_date - interval '1 day' * days_back
  AND status = 'delivered';

  RETURN QUERY
  SELECT 
    current_revenue,
    current_orders,
    (SELECT COUNT(*) FROM public.profiles)::bigint,
    (SELECT avg(extract(epoch from (updated_at - created_at))/60) 
     FROM public.orders 
     WHERE status = 'delivered' 
     AND updated_at > created_at
     AND created_at >= current_date - interval '1 day' * days_back),
    CASE WHEN previous_revenue > 0 THEN 
      ((current_revenue - previous_revenue) / previous_revenue * 100)
    ELSE 0 END,
    CASE WHEN previous_orders > 0 THEN 
      ((current_orders - previous_orders)::numeric / previous_orders * 100)
    ELSE 0 END,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'month', TO_CHAR(date_trunc('month', created_at), 'Mon'),
        'receita', SUM(total_amount),
        'pedidos', COUNT(*),
        'usuarios', COUNT(DISTINCT user_id)
      )
    )
    FROM public.orders 
    WHERE created_at >= current_date - interval '12 months'
    AND status = 'delivered'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at));
END;
$$;