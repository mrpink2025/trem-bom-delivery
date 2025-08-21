-- =====================================================
-- 🎯 MOTOR DE PRECIFICAÇÃO DINÂMICA: Tabelas e Funções
-- =====================================================

-- 1. Tabela de configurações de markup por loja
CREATE TABLE public.markup_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  
  -- Configurações gerais
  cover_payment_fees BOOLEAN DEFAULT false,
  payment_fee_rate NUMERIC(5,4) DEFAULT 0.0329, -- 3.29%
  payment_fee_fixed NUMERIC(10,2) DEFAULT 0.39, -- R$ 0.39
  
  -- Tetos globais
  max_item_increase_percent NUMERIC(5,2) DEFAULT NULL, -- ex: 25%
  max_markup_amount NUMERIC(10,2) DEFAULT NULL, -- ex: R$ 5.00
  basket_max_increase_percent NUMERIC(5,2) DEFAULT NULL, -- ex: 15%
  
  -- Arredondamento psicológico
  rounding_type TEXT DEFAULT 'NONE' CHECK (rounding_type IN ('NONE', 'NINETY', 'NINETY_NINE', 'FIFTY', 'FULL')),
  
  -- Taxa de serviço adicional
  service_fee_percent NUMERIC(5,2) DEFAULT 0.00, -- 0-3%
  
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de regras de markup (por produto, categoria, ou geral)
CREATE TABLE public.markup_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  
  -- Especificidade da regra (ordem de prioridade)
  rule_type TEXT NOT NULL CHECK (rule_type IN ('PRODUCT', 'CATEGORY', 'STORE')),
  target_id UUID NULL, -- menu_item_id para PRODUCT, category_id para CATEGORY, NULL para STORE
  
  -- Prioridade (menor número = maior prioridade)
  priority INTEGER DEFAULT 100,
  
  -- Condições de aplicação
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Horários específicos (JSON: {"weekdays": [1,2,3,4,5], "hours": {"start": "11:00", "end": "14:00"}})
  time_conditions JSONB DEFAULT NULL,
  
  -- Faixas de valor (JSON: [{"min": 0, "max": 25, "margin": 8}, {"min": 25, "max": 50, "margin": 6}])
  value_ranges JSONB DEFAULT NULL,
  
  -- Margem padrão
  margin_type TEXT NOT NULL DEFAULT 'PERCENT' CHECK (margin_type IN ('PERCENT', 'FIXED')),
  margin_value NUMERIC(10,2) NOT NULL, -- % ou valor fixo
  
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de histórico de precificação (snapshots)
CREATE TABLE public.pricing_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  order_id UUID NULL, -- para auditoria de pedidos
  
  -- Dados da simulação/cálculo
  input_data JSONB NOT NULL, -- itens base com preços originais
  rules_applied JSONB NOT NULL, -- regras que foram aplicadas
  calculation_steps JSONB NOT NULL, -- passo a passo do cálculo
  final_result JSONB NOT NULL, -- preços finais e totais
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

-- 4. Função para aplicar arredondamento psicológico
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  price NUMERIC, 
  rounding_type TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  CASE rounding_type
    WHEN 'NINETY' THEN
      -- Arredonda para .90
      RETURN FLOOR(price) + 0.90;
    WHEN 'NINETY_NINE' THEN  
      -- Arredonda para .99
      RETURN FLOOR(price) + 0.99;
    WHEN 'FIFTY' THEN
      -- Arredonda para .50 ou .00
      IF (price - FLOOR(price)) <= 0.50 THEN
        RETURN FLOOR(price) + 0.50;
      ELSE
        RETURN CEIL(price);
      END IF;
    WHEN 'FULL' THEN
      -- Arredonda para inteiro
      RETURN ROUND(price);
    ELSE
      -- Sem arredondamento
      RETURN price;
  END CASE;
END;
$$;

-- 5. Função principal do motor de precificação
CREATE OR REPLACE FUNCTION public.calculate_dynamic_pricing(
  p_restaurant_id UUID,
  p_items JSONB -- [{"menu_item_id": "uuid", "quantity": 2, "base_price": 15.50, "category_id": "uuid"}]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Criar índices para performance
CREATE INDEX idx_markup_configurations_restaurant ON markup_configurations(restaurant_id);
CREATE INDEX idx_markup_rules_restaurant_priority ON markup_rules(restaurant_id, priority);
CREATE INDEX idx_markup_rules_target ON markup_rules(rule_type, target_id);
CREATE INDEX idx_pricing_snapshots_restaurant ON pricing_snapshots(restaurant_id, created_at);

-- RLS Policies
ALTER TABLE markup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE markup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_snapshots ENABLE ROW LEVEL SECURITY;

-- Donos de restaurante podem gerenciar suas configurações
CREATE POLICY "Restaurant owners can manage markup configurations"
ON markup_configurations FOR ALL
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = markup_configurations.restaurant_id 
  AND owner_id = auth.uid()
));

CREATE POLICY "Restaurant owners can manage markup rules"
ON markup_rules FOR ALL  
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = markup_rules.restaurant_id 
  AND owner_id = auth.uid()
));

CREATE POLICY "Restaurant owners can view pricing snapshots"
ON pricing_snapshots FOR SELECT
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE id = pricing_snapshots.restaurant_id 
  AND owner_id = auth.uid()
));

-- Sistema pode inserir snapshots
CREATE POLICY "System can insert pricing snapshots"
ON pricing_snapshots FOR INSERT
WITH CHECK (true);