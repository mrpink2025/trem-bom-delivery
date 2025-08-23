-- Security Fix: Add search_path to all database functions to prevent SQL injection
-- This fixes the critical "Function Search Path Mutable" security vulnerabilities

-- 1. Fix cleanup_old_tracking_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Deletar tracking points mais antigos que 30 dias
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Deletar mensagens de chat mais antigas que 90 dias (apenas mídia, manter texto)
  UPDATE public.messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  -- Log da limpeza
  INSERT INTO public.audit_logs (
    table_name, operation, new_values, user_id
  ) VALUES (
    'system_cleanup', 'DATA_RETENTION_CLEANUP', 
    jsonb_build_object(
      'cleanup_date', now(),
      'tracking_retention_days', 30,
      'chat_media_retention_days', 90
    ),
    '00000000-0000-0000-0000-000000000000'
  );
END;
$function$;

-- 2. Fix calculate_dynamic_pricing function  
CREATE OR REPLACE FUNCTION public.calculate_dynamic_pricing(p_restaurant_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_item JSONB;
  v_rule RECORD;
  v_base_price NUMERIC;
  v_markup_delta NUMERIC;
  v_item_final_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_base_total NUMERIC := 0;
  v_final_total NUMERIC;
  v_steps JSONB := '[]'::JSONB;
  v_items_result JSONB := '[]'::JSONB;
  v_step JSONB;
BEGIN
  -- Buscar configuração da loja
  SELECT * INTO v_config 
  FROM markup_configurations 
  WHERE restaurant_id = p_restaurant_id AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Markup configuration not found for restaurant %', p_restaurant_id;
  END IF;
  
  -- Processar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_base_price := (v_item->>'base_price')::NUMERIC;
    v_base_total := v_base_total + (v_base_price * (v_item->>'quantity')::INTEGER);
    
    -- 🎯 STEP 1: Encontrar regra vencedora (mais específica primeiro)
    SELECT * INTO v_rule
    FROM markup_rules mr
    WHERE mr.restaurant_id = p_restaurant_id
      AND mr.is_active = true
      AND (mr.valid_until IS NULL OR mr.valid_until > now())
      AND (
        -- Produto específico (mais específico)
        (mr.rule_type = 'PRODUCT' AND mr.target_id = (v_item->>'menu_item_id')::UUID) OR
        -- Categoria (meio específico)
        (mr.rule_type = 'CATEGORY' AND mr.target_id = (v_item->>'category_id')::UUID) OR
        -- Loja geral (menos específico)
        (mr.rule_type = 'STORE' AND mr.target_id IS NULL)
      )
    ORDER BY 
      CASE mr.rule_type 
        WHEN 'PRODUCT' THEN 1
        WHEN 'CATEGORY' THEN 2  
        WHEN 'STORE' THEN 3
      END,
      mr.priority ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- Sem regra = sem markup
      v_markup_delta := 0;
    ELSE
      -- 🎯 STEP 2: Calcular markup bruto
      IF v_rule.margin_type = 'PERCENT' THEN
        v_markup_delta := v_base_price * (v_rule.margin_value / 100.0);
      ELSE
        v_markup_delta := v_rule.margin_value;
      END IF;
      
      -- 🎯 STEP 3: Aplicar tetos por item
      IF v_config.max_item_increase_percent IS NOT NULL THEN
        v_markup_delta := LEAST(v_markup_delta, v_base_price * (v_config.max_item_increase_percent / 100.0));
      END IF;
      
      IF v_config.max_markup_amount IS NOT NULL THEN
        v_markup_delta := LEAST(v_markup_delta, v_config.max_markup_amount);
      END IF;
    END IF;
    
    -- 🎯 STEP 4: Preço provisório + arredondamento
    v_item_final_price := apply_psychological_rounding(
      v_base_price + v_markup_delta, 
      v_config.rounding_type
    );
    
    -- Somar ao subtotal
    v_subtotal := v_subtotal + (v_item_final_price * (v_item->>'quantity')::INTEGER);
    
    -- Adicionar item ao resultado
    v_items_result := v_items_result || jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'quantity', (v_item->>'quantity')::INTEGER,
      'base_price', v_base_price,
      'markup_delta', v_markup_delta,
      'final_price', v_item_final_price,
      'rule_applied', COALESCE(row_to_json(v_rule), 'null'::JSON)
    );
    
    -- Log do passo
    v_step := jsonb_build_object(
      'item_id', v_item->>'menu_item_id',
      'base_price', v_base_price,
      'markup_delta', v_markup_delta,
      'after_rounding', v_item_final_price,
      'rule_type', COALESCE(v_rule.rule_type, 'NONE')
    );
    v_steps := v_steps || v_step;
  END LOOP;
  
  -- 🎯 STEP 5: Cobertura de taxa de pagamento
  v_final_total := v_subtotal;
  IF v_config.cover_payment_fees THEN
    v_final_total := (v_subtotal + v_config.payment_fee_fixed) / (1 - v_config.payment_fee_rate);
  END IF;
  
  -- 🎯 STEP 6: Taxa de serviço
  IF v_config.service_fee_percent > 0 THEN
    v_final_total := v_final_total * (1 + v_config.service_fee_percent / 100.0);
  END IF;
  
  -- 🎯 STEP 7: Teto por carrinho (se necessário, recalcular tudo proporcionalmente)
  IF v_config.basket_max_increase_percent IS NOT NULL THEN
    DECLARE
      v_total_increase_percent NUMERIC;
    BEGIN
      v_total_increase_percent := ((v_final_total - v_base_total) / v_base_total) * 100;
      
      IF v_total_increase_percent > v_config.basket_max_increase_percent THEN
        -- Reduzir markup proporcionalmente
        DECLARE
          v_reduction_factor NUMERIC;
        BEGIN
          v_reduction_factor := v_config.basket_max_increase_percent / v_total_increase_percent;
          -- Seria necessário recalcular todos os itens aqui...
          -- Para simplificar, apenas aplicamos o fator no total
          v_final_total := v_base_total * (1 + v_config.basket_max_increase_percent / 100.0);
        END;
      END IF;
    END;
  END IF;
  
  -- Retornar resultado completo
  RETURN jsonb_build_object(
    'items', v_items_result,
    'base_total', v_base_total,
    'subtotal_after_markup', v_subtotal,
    'final_total', v_final_total,
    'config_used', row_to_json(v_config),
    'calculation_steps', v_steps,
    'timestamp', now()
  );
END;
$function$;

-- 3. Create missing helper function apply_psychological_rounding
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  p_price NUMERIC,
  p_rounding_type TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE p_rounding_type
    WHEN 'UP_99' THEN
      -- Round up to .99 (e.g., 12.34 -> 12.99)
      RETURN FLOOR(p_price) + 0.99;
    WHEN 'UP_95' THEN
      -- Round up to .95 (e.g., 12.34 -> 12.95)  
      RETURN FLOOR(p_price) + 0.95;
    WHEN 'NEAREST_50' THEN
      -- Round to nearest .50 (e.g., 12.34 -> 12.50)
      RETURN FLOOR(p_price) + 
        CASE 
          WHEN (p_price - FLOOR(p_price)) <= 0.50 THEN 0.50
          ELSE 1.00
        END;
    WHEN 'UP_INTEGER' THEN
      -- Round up to next integer
      RETURN CEIL(p_price);
    ELSE
      -- No rounding
      RETURN ROUND(p_price, 2);
  END CASE;
END;
$function$;

-- 4. Create security definer functions for role checking to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.has_role(p_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE  
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = p_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_admin_role(p_role admin_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = p_role
  );
$function$;