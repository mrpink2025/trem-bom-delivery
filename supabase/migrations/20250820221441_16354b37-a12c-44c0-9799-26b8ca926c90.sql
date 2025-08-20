-- Fix security warnings by setting search_path on functions

-- Update create_chat_thread_for_order function with proper search_path
CREATE OR REPLACE FUNCTION public.create_chat_thread_for_order()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.chat_threads (order_id, seller_id, courier_id, customer_id)
  SELECT 
    NEW.id,
    r.owner_id,
    NEW.courier_id,
    NEW.user_id
  FROM public.restaurants r
  WHERE r.id = NEW.restaurant_id;
  
  RETURN NEW;
END;
$$;

-- Update calculate_eta function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_eta(distance_km NUMERIC)
RETURNS INTEGER 
LANGUAGE plpgsql 
IMMUTABLE 
SET search_path = 'public'
AS $$
BEGIN
  -- Simple ETA calculation: assume 25 km/h average speed in city + 5 min buffer
  RETURN CEIL(distance_km / 25.0 * 60) + 5;
END;
$$;