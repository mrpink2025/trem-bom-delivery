import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, CreditCard, Percent, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCreateMarkupConfiguration, useUpdateMarkupConfiguration, MarkupConfiguration } from '@/hooks/useDynamicPricing'
import { useQueryClient } from '@tanstack/react-query'

const configSchema = z.object({
  cover_payment_fees: z.boolean(),
  payment_fee_rate: z.coerce.number().min(0).max(1),
  payment_fee_fixed: z.coerce.number().min(0),
  max_item_increase_percent: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  max_markup_amount: z.coerce.number().min(0).optional().or(z.literal('')),
  basket_max_increase_percent: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  rounding_type: z.enum(['NONE', 'NINETY', 'NINETY_NINE', 'FIFTY', 'FULL']),
  service_fee_percent: z.coerce.number().min(0).max(10)
})

type ConfigFormData = z.infer<typeof configSchema>

interface PricingConfigurationPanelProps {
  restaurantId: string
  config?: MarkupConfiguration | null
  isLoading: boolean
}

export function PricingConfigurationPanel({ restaurantId, config, isLoading }: PricingConfigurationPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const createConfig = useCreateMarkupConfiguration()
  const updateConfig = useUpdateMarkupConfiguration()
  
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      cover_payment_fees: false,
      payment_fee_rate: 0.0329,
      payment_fee_fixed: 0.39,
      max_item_increase_percent: '',
      max_markup_amount: '',
      basket_max_increase_percent: '',
      rounding_type: 'NONE',
      service_fee_percent: 0
    }
  })

  useEffect(() => {
    if (config) {
      form.reset({
        cover_payment_fees: config.cover_payment_fees,
        payment_fee_rate: config.payment_fee_rate,
        payment_fee_fixed: config.payment_fee_fixed,
        max_item_increase_percent: config.max_item_increase_percent || '',
        max_markup_amount: config.max_markup_amount || '',
        basket_max_increase_percent: config.basket_max_increase_percent || '',
        rounding_type: config.rounding_type,
        service_fee_percent: config.service_fee_percent
      })
    }
  }, [config, form])

  const onSubmit = async (data: ConfigFormData) => {
    try {
      const configData = {
        restaurant_id: restaurantId,
        cover_payment_fees: data.cover_payment_fees,
        payment_fee_rate: data.payment_fee_rate,
        payment_fee_fixed: data.payment_fee_fixed,
        max_item_increase_percent: data.max_item_increase_percent || null,
        max_markup_amount: data.max_markup_amount || null,
        basket_max_increase_percent: data.basket_max_increase_percent || null,
        rounding_type: data.rounding_type,
        service_fee_percent: data.service_fee_percent,
        is_active: true
      }

      if (config) {
        await updateConfig.mutateAsync({ id: config.id, config: configData })
        toast({
          title: 'Configuração atualizada',
          description: 'As configurações de preço foram salvas com sucesso.'
        })
      } else {
        await createConfig.mutateAsync(configData)
        toast({
          title: 'Configuração criada',
          description: 'A configuração de preço foi criada com sucesso.'
        })
      }

      queryClient.invalidateQueries({ queryKey: ['markup-configuration', restaurantId] })
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração. Tente novamente.',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isSaving = createConfig.isPending || updateConfig.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Taxas de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Taxas de Pagamento
              </CardTitle>
              <CardDescription>
                Configure se deseja cobrir as taxas do processador de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="cover_payment_fees"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cobrir taxas de pagamento</FormLabel>
                      <FormDescription>
                        Incluir taxa do Stripe no preço final
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('cover_payment_fees') && (
                <>
                  <FormField
                    control={form.control}
                    name="payment_fee_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa percentual (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.0001" 
                            placeholder="0.0329" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Taxa percentual do Stripe (ex: 0.0329 = 3.29%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_fee_fixed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa fixa (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.39" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Taxa fixa do Stripe por transação
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Tetos e Limites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5" />
                Tetos e Limites
              </CardTitle>
              <CardDescription>
                Defina limites máximos para os markups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="max_item_increase_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teto por item (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="25" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo aumento permitido por item (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_markup_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor máximo de markup (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="5.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Valor máximo de markup por item (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="basket_max_increase_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teto por carrinho (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="15" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo aumento total do carrinho (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Arredondamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Arredondamento Psicológico
              </CardTitle>
              <CardDescription>
                Configure como os preços serão arredondados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="rounding_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de arredondamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Sem arredondamento</SelectItem>
                        <SelectItem value="NINETY">Terminar em .90</SelectItem>
                        <SelectItem value="NINETY_NINE">Terminar em .99</SelectItem>
                        <SelectItem value="FIFTY">Terminar em .50 ou .00</SelectItem>
                        <SelectItem value="FULL">Arredondar para inteiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Como os preços finais serão arredondados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Taxa de Serviço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxa de Serviço</CardTitle>
              <CardDescription>
                Taxa adicional aplicada no final (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="service_fee_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de serviço (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="10" 
                        placeholder="0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Taxa de 0% a 10% aplicada no total final
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="min-w-32">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}