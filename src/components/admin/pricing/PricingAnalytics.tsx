import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, BarChart3, Target, Clock } from 'lucide-react'

interface PricingAnalyticsProps {
  restaurantId: string
}

export function PricingAnalytics({ restaurantId }: PricingAnalyticsProps) {
  // TODO: Implementar queries reais para métricas de precificação
  const mockMetrics = {
    avgMarkupPercent: 12.3,
    totalOrdersWithMarkup: 1247,
    revenueIncrease: 8.7,
    mostProfitableCategory: 'Bebidas',
    avgOrderValue: 34.80,
    markupRevenue: 4302.50
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Markup Médio</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.avgMarkupPercent}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Adicional</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockMetrics.markupRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockMetrics.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              +{mockMetrics.revenueIncrease}% vs base
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance por Categoria
          </CardTitle>
          <CardDescription>
            Análise de markup por categoria de produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Bebidas', markup: 15.2, orders: 342, revenue: 1205.80 },
              { name: 'Pratos Principais', markup: 8.5, orders: 567, revenue: 2156.40 },
              { name: 'Sobremesas', markup: 18.7, orders: 234, revenue: 876.20 },
              { name: 'Entradas', markup: 12.1, orders: 189, revenue: 654.30 }
            ].map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.orders} pedidos
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(category.revenue)}</div>
                    <div className="text-sm text-muted-foreground">receita</div>
                  </div>
                  <Badge variant="outline">
                    {category.markup}% markup
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tendências Recentes
          </CardTitle>
          <CardDescription>
            Insights sobre performance de precificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Markup otimizado em Bebidas
                </h4>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Aumento de 23% na margem de bebidas resultou em +15% de receita
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  Horário de pico identificado
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  18h-20h mostra maior aceitação de markup elevado
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-orange-800 dark:text-orange-200">
                  Oportunidade em Sobremesas
                </h4>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  Baixa sensibilidade a preço permite markup mais agressivo
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Component to fix missing Percent icon
function Percent({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}