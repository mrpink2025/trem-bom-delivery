import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Calculator, Plus, Trash2, Zap, TrendingUp, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDynamicPricing, PricingItem, PricingResult } from '@/hooks/useDynamicPricing'

interface PricingSimulatorProps {
  restaurantId: string
}

interface SimulatorItem extends PricingItem {
  id: string
  name: string
}

export function PricingSimulator({ restaurantId }: PricingSimulatorProps) {
  const [items, setItems] = useState<SimulatorItem[]>([
    {
      id: '1',
      name: 'Produto Exemplo',
      menu_item_id: '',
      quantity: 1,
      base_price: 15.50,
      category_id: ''
    }
  ])
  const [result, setResult] = useState<PricingResult | null>(null)
  const { toast } = useToast()
  const { calculatePricing, isCalculating } = useDynamicPricing()

  const addItem = () => {
    const newItem: SimulatorItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      menu_item_id: '',
      quantity: 1,
      base_price: 0,
      category_id: ''
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, updates: Partial<SimulatorItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const runSimulation = async () => {
    try {
      // Validar se todos os itens têm preço
      const validItems = items.filter(item => item.base_price > 0)
      
      if (validItems.length === 0) {
        toast({
          title: 'Itens inválidos',
          description: 'Adicione pelo menos um item com preço maior que zero.',
          variant: 'destructive'
        })
        return
      }

      const pricingItems: PricingItem[] = validItems.map(item => ({
        menu_item_id: item.menu_item_id || 'simulator-' + item.id,
        quantity: item.quantity,
        base_price: item.base_price,
        category_id: item.category_id || undefined
      }))

      const pricingResult = await calculatePricing({
        restaurantId,
        items: pricingItems
      })

      setResult(pricingResult)
      
      toast({
        title: 'Simulação concluída',
        description: `Calculado preço para ${validItems.length} item${validItems.length !== 1 ? 's' : ''}.`
      })
    } catch (error) {
      toast({
        title: 'Erro na simulação',
        description: 'Não foi possível calcular os preços. Verifique se existe uma configuração válida.',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getIncreasePercent = (baseTotal: number, finalTotal: number) => {
    if (baseTotal === 0) return 0
    return ((finalTotal - baseTotal) / baseTotal * 100)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Itens para Simulação
          </CardTitle>
          <CardDescription>
            Adicione produtos com preços base para testar suas regras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Item {index + 1}</Label>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    placeholder="Ex: Hambúrguer"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Preço Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="15.50"
                    value={item.base_price || ''}
                    onChange={(e) => updateItem(item.id, { base_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ID Categoria (opcional)</Label>
                  <Input
                    placeholder="UUID"
                    value={item.category_id}
                    onChange={(e) => updateItem(item.id, { category_id: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={addItem} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
            <Button onClick={runSimulation} disabled={isCalculating} className="flex-1">
              {isCalculating ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Simular
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resultado da Simulação
          </CardTitle>
          <CardDescription>
            Preços calculados com suas regras de markup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(result.base_total)}
                  </div>
                  <div className="text-sm text-muted-foreground">Preço Base</div>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(result.final_total)}
                  </div>
                  <div className="text-sm text-muted-foreground">Preço Final</div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  +{getIncreasePercent(result.base_total, result.final_total).toFixed(1)}%
                </Badge>
              </div>

              <Separator />

              {/* Detalhes por Item */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Detalhes por Item
                </h4>
                <div className="space-y-2">
                  {result.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {items.find(i => i.menu_item_id === item.menu_item_id)?.name || `Item ${index + 1}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity}x • Base: {formatCurrency(item.base_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {formatCurrency(item.final_price * item.quantity)}
                        </div>
                        <div className="text-sm text-green-600">
                          +{formatCurrency(item.markup_delta * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal após markup:</span>
                  <span>{formatCurrency(result.subtotal_after_markup)}</span>
                </div>
                {result.config_used?.cover_payment_fees && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de pagamento:</span>
                    <span>+{formatCurrency(result.final_total - result.subtotal_after_markup)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total Final:</span>
                  <span>{formatCurrency(result.final_total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Pronto para simular
              </h3>
              <p className="text-muted-foreground">
                Configure os itens e clique em "Simular" para ver os preços calculados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}