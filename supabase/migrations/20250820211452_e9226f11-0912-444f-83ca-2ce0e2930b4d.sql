-- Fix the get_analytics_data function to resolve nested aggregate issue
CREATE OR REPLACE FUNCTION public.get_analytics_data(days_back integer DEFAULT 30)
 RETURNS TABLE(total_revenue numeric, total_orders bigint, total_users bigint, avg_delivery_time numeric, revenue_growth numeric, orders_growth numeric, monthly_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_revenue numeric;
  previous_revenue numeric;
  current_orders bigint;
  previous_orders bigint;
  avg_delivery numeric;
  user_count bigint;
  monthly_data_result jsonb;
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

  -- Get average delivery time
  SELECT avg(extract(epoch from (updated_at - created_at))/60)
  INTO avg_delivery
  FROM public.orders 
  WHERE status = 'delivered' 
  AND updated_at > created_at
  AND created_at >= current_date - interval '1 day' * days_back;

  -- Get total users
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Get monthly data
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', month_data.month_name,
      'receita', month_data.receita,
      'pedidos', month_data.pedidos,
      'usuarios', month_data.usuarios
    ) ORDER BY month_data.month_date
  )
  INTO monthly_data_result
  FROM (
    SELECT 
      date_trunc('month', created_at) as month_date,
      TO_CHAR(date_trunc('month', created_at), 'Mon') as month_name,
      SUM(total_amount) as receita,
      COUNT(*) as pedidos,
      COUNT(DISTINCT user_id) as usuarios
    FROM public.orders 
    WHERE created_at >= current_date - interval '12 months'
    AND status = 'delivered'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  ) month_data;

  RETURN QUERY
  SELECT 
    current_revenue,
    current_orders,
    user_count,
    COALESCE(avg_delivery, 0),
    CASE WHEN previous_revenue > 0 THEN 
      ((current_revenue - previous_revenue) / previous_revenue * 100)
    ELSE 0 END,
    CASE WHEN previous_orders > 0 THEN 
      ((current_orders - previous_orders)::numeric / previous_orders * 100)
    ELSE 0 END,
    COALESCE(monthly_data_result, '[]'::jsonb);
END;
$function$;