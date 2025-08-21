import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCreateMarkupRule, useUpdateMarkupRule, MarkupRule } from '@/hooks/useDynamicPricing'
import { useQueryClient } from '@tanstack/react-query'

const ruleSchema = z.object({
  rule_type: z.enum(['PRODUCT', 'CATEGORY', 'STORE']),
  target_id: z.string().optional(),
  priority: z.coerce.number().min(1).max(999),
  margin_type: z.enum(['PERCENT', 'FIXED']),
  margin_value: z.coerce.number().min(0)
})

type RuleFormData = z.infer<typeof ruleSchema>

interface MarkupRuleFormProps {
  restaurantId: string
  rule?: MarkupRule | null
  onSuccess: () => void
  onCancel: () => void
}

export function MarkupRuleForm({ restaurantId, rule, onSuccess, onCancel }: MarkupRuleFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const createRule = useCreateMarkupRule()
  const updateRule = useUpdateMarkupRule()
  
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      rule_type: rule?.rule_type || 'STORE',
      target_id: rule?.target_id || '',
      priority: rule?.priority || 100,
      margin_type: rule?.margin_type || 'PERCENT',
      margin_value: rule?.margin_value || 0
    }
  })

  const onSubmit = async (data: RuleFormData) => {
    try {
      const ruleData = {
        restaurant_id: restaurantId,
        rule_type: data.rule_type,
        target_id: data.target_id || null,
        priority: data.priority,
        margin_type: data.margin_type,
        margin_value: data.margin_value,
        is_active: true
      }

      if (rule?.id) {
        await updateRule.mutateAsync({ id: rule.id, rule: ruleData })
        toast({
          title: 'Regra atualizada',
          description: 'A regra foi atualizada com sucesso.'
        })
      } else {
        await createRule.mutateAsync(ruleData)
        toast({
          title: 'Regra criada',
          description: 'A nova regra foi criada com sucesso.'
        })
      }

      queryClient.invalidateQueries({ queryKey: ['markup-rules', restaurantId] })
      onSuccess()
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a regra. Tente novamente.',
        variant: 'destructive'
      })
    }
  }

  const isSaving = createRule.isPending || updateRule.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rule_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo da Regra</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="STORE">Loja Geral</SelectItem>
                    <SelectItem value="CATEGORY">Categoria</SelectItem>
                    <SelectItem value="PRODUCT">Produto Específico</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Define o escopo de aplicação da regra
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="999" 
                    placeholder="100" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Menor número = maior prioridade
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {(form.watch('rule_type') === 'CATEGORY' || form.watch('rule_type') === 'PRODUCT') && (
          <FormField
            control={form.control}
            name="target_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch('rule_type') === 'CATEGORY' ? 'ID da Categoria' : 'ID do Produto'}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder={form.watch('rule_type') === 'CATEGORY' ? 'UUID da categoria' : 'UUID do produto'}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  {form.watch('rule_type') === 'CATEGORY' 
                    ? 'ID da categoria no sistema' 
                    : 'ID do produto específico no cardápio'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="margin_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Margem</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="margin_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch('margin_type') === 'PERCENT' ? 'Percentual (%)' : 'Valor (R$)'}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step={form.watch('margin_type') === 'PERCENT' ? '0.01' : '0.01'}
                    min="0"
                    placeholder={form.watch('margin_type') === 'PERCENT' ? '10' : '2.50'}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  {form.watch('margin_type') === 'PERCENT' 
                    ? 'Percentual de markup aplicado'
                    : 'Valor fixo em reais a ser adicionado'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Regra
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}