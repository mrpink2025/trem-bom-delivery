import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface PricingItem {
  menu_item_id: string
  quantity: number
  base_price: number
  category_id?: string
}

export interface PricingResult {
  items: Array<{
    menu_item_id: string
    quantity: number
    base_price: number
    markup_delta: number
    final_price: number
    rule_applied: any
  }>
  base_total: number
  subtotal_after_markup: number
  final_total: number
  config_used: any
  calculation_steps: any[]
  timestamp: string
}

export interface MarkupConfiguration {
  id: string
  restaurant_id: string
  cover_payment_fees: boolean
  payment_fee_rate: number
  payment_fee_fixed: number
  max_item_increase_percent?: number
  max_markup_amount?: number
  basket_max_increase_percent?: number
  rounding_type: 'NONE' | 'NINETY' | 'NINETY_NINE' | 'FIFTY' | 'FULL'
  service_fee_percent: number
  is_active: boolean
}

export interface MarkupRule {
  id?: string
  restaurant_id: string
  rule_type: 'PRODUCT' | 'CATEGORY' | 'STORE'
  target_id?: string
  priority: number
  margin_type: 'PERCENT' | 'FIXED'
  margin_value: number
  time_conditions?: any
  value_ranges?: any
  is_active: boolean
}

export function useDynamicPricing() {
  const calculatePricing = useMutation({
    mutationFn: async ({ 
      restaurantId, 
      items 
    }: { 
      restaurantId: string
      items: PricingItem[] 
    }) => {
      const { data, error } = await supabase.functions.invoke('calculate-pricing', {
        body: {
          restaurant_id: restaurantId,
          items
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      return data.data as PricingResult
    }
  })

  return {
    calculatePricing: calculatePricing.mutateAsync,
    isCalculating: calculatePricing.isPending,
    calculationError: calculatePricing.error
  }
}

export function useMarkupConfiguration(restaurantId: string) {
  return useQuery({
    queryKey: ['markup-configuration', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('markup_configurations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error
      return data as MarkupConfiguration | null
    },
    enabled: !!restaurantId
  })
}

export function useMarkupRules(restaurantId: string) {
  return useQuery({
    queryKey: ['markup-rules', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('markup_rules')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('priority')

      if (error) throw error
      return data as MarkupRule[]
    },
    enabled: !!restaurantId
  })
}

export function useCreateMarkupConfiguration() {
  return useMutation({
    mutationFn: async (config: Omit<MarkupConfiguration, 'id'>) => {
      const { data, error } = await supabase
        .from('markup_configurations')
        .insert(config)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })
}

export function useUpdateMarkupConfiguration() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      config 
    }: { 
      id: string
      config: Partial<MarkupConfiguration> 
    }) => {
      const { data, error } = await supabase
        .from('markup_configurations')
        .update(config)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })
}

export function useCreateMarkupRule() {
  return useMutation({
    mutationFn: async (rule: Omit<MarkupRule, 'id'>) => {
      const { data, error } = await supabase
        .from('markup_rules')
        .insert(rule)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })
}

export function useUpdateMarkupRule() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      rule 
    }: { 
      id: string
      rule: Partial<MarkupRule> 
    }) => {
      const { data, error } = await supabase
        .from('markup_rules')
        .update(rule)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })
}

export function useDeleteMarkupRule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('markup_rules')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    }
  })
}