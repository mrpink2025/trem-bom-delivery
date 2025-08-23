-- PHASE 1: Database Function Hardening (Critical) - Fixed
-- Fix search path manipulation vulnerabilities by adding SET search_path TO 'public'

-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.apply_psychological_rounding(numeric, text);

-- Create apply_psychological_rounding function with security hardening
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  base_price NUMERIC,
  rounding_type TEXT DEFAULT 'NEAREST_TENTH'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  CASE rounding_type
    WHEN 'NEAREST_TENTH' THEN
      -- Round to nearest 0.10 (e.g., 12.37 -> 12.40)
      RETURN ROUND(base_price * 10) / 10.0;
    WHEN 'PSYCHOLOGICAL_99' THEN
      -- Round down and add 0.99 (e.g., 12.37 -> 11.99)
      RETURN FLOOR(base_price) + 0.99;
    WHEN 'NEAREST_HALF' THEN
      -- Round to nearest 0.50 (e.g., 12.37 -> 12.50)
      RETURN ROUND(base_price * 2) / 2.0;
    WHEN 'EXACT' THEN
      -- No rounding
      RETURN base_price;
    ELSE
      -- Default to nearest tenth
      RETURN ROUND(base_price * 10) / 10.0;
  END CASE;
END;
$function$;

-- PHASE 2: RLS Policy Review & Tightening
-- Drop all existing conflicting policies first
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can manage their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Anyone can view active menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Users can view public reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

-- Enhance restaurant data protection
CREATE POLICY "Public can view basic restaurant info" ON public.restaurants
FOR SELECT USING (
  is_active = true AND 
  (SELECT EXTRACT(HOUR FROM NOW()) BETWEEN COALESCE(opening_hours->>'start', '0')::INTEGER 
   AND COALESCE(opening_hours->>'end', '23')::INTEGER)
);

CREATE POLICY "Restaurant owners can manage their restaurants" ON public.restaurants
FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERADMIN')
  )
);

-- Enhance menu items security - restrict pricing strategy visibility
CREATE POLICY "Public can view available menu items" ON public.menu_items
FOR SELECT USING (
  is_available = true AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_items.restaurant_id 
    AND r.is_active = true
  )
);

CREATE POLICY "Restaurant owners can manage their menu items" ON public.menu_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_items.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Enhance review system security
CREATE POLICY "Users can view public reviews" ON public.reviews
FOR SELECT USING (is_visible = true);

CREATE POLICY "Users can create reviews for their orders" ON public.reviews
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_id 
    AND o.user_id = auth.uid() 
    AND o.status = 'delivered'
  )
);

CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id);