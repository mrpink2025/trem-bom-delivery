-- Fix remaining functions with mutable search paths
-- Update all security definer functions in the system

-- Update log_order_event function
CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar evento de mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (
      order_id, 
      status, 
      actor_id, 
      actor_role,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      COALESCE((SELECT role::text FROM public.profiles WHERE user_id = auth.uid()), 'system'),
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Pedido confirmado pelo restaurante'
        WHEN NEW.status = 'preparing' THEN 'Pedido em preparação'
        WHEN NEW.status = 'ready' THEN 'Pedido pronto para retirada'
        WHEN NEW.status = 'out_for_delivery' THEN 'Pedido saiu para entrega'
        WHEN NEW.status = 'delivered' THEN 'Pedido entregue'
        WHEN NEW.status = 'cancelled' THEN 'Pedido cancelado'
        ELSE 'Status alterado'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'courier_id', NEW.courier_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update validate_order_status_transition function
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se é inserção, permitir qualquer status inicial
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Validar transições permitidas
  CASE OLD.status
    WHEN 'placed' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('preparing', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'preparing' THEN
      IF NEW.status NOT IN ('ready', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'ready' THEN
      IF NEW.status NOT IN ('out_for_delivery', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'out_for_delivery' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'delivered' THEN
      -- Estado final - não pode mudar
      RAISE EXCEPTION 'Cannot change status from delivered';
    WHEN 'cancelled' THEN
      -- Estado final - não pode mudar  
      RAISE EXCEPTION 'Cannot change status from cancelled';
  END CASE;

  RETURN NEW;
END;
$$;

-- Update other security definer functions that may need fixing
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Note: Auth settings (OTP expiry and password protection) need to be configured 
-- via Supabase Dashboard as they are platform-level settings, not database settings