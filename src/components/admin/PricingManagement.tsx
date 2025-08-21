import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calculator, Settings, TrendingUp, Clock, Target } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PricingConfigurationPanel } from './pricing/PricingConfigurationPanel'
import { MarkupRulesPanel } from './pricing/MarkupRulesPanel'
import { PricingSimulator } from './pricing/PricingSimulator'
import { PricingAnalytics } from './pricing/PricingAnalytics'
import { useMarkupConfiguration, useMarkupRules } from '@/hooks/useDynamicPricing'

interface PricingManagementProps {
  restaurantId: string
}

export function PricingManagement({ restaurantId }: PricingManagementProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('configuration')

  const { data: config, isLoading: configLoading } = useMarkupConfiguration(restaurantId)
  const { data: rules, isLoading: rulesLoading } = useMarkupRules(restaurantId)

  const hasConfiguration = !!config
  const hasRules = rules && rules.length > 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Preços</h1>
          <p className="text-muted-foreground">
            Configure margens, regras de precificação e simule resultados
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={hasConfiguration ? 'default' : 'secondary'}>
            {hasConfiguration ? 'Configurado' : 'Pendente'}
          </Badge>
          {hasRules && (
            <Badge variant="outline">
              {rules.length} regra{rules.length !== 1 ? 's' : ''} ativa{rules.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Global
              </CardTitle>
              <CardDescription>
                Configure taxas de pagamento, tetos e arredondamento psicológico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingConfigurationPanel 
                restaurantId={restaurantId} 
                config={config}
                isLoading={configLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Regras de Markup
              </CardTitle>
              <CardDescription>
                Defina margens por produto, categoria ou faixa de horário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkupRulesPanel 
                restaurantId={restaurantId} 
                rules={rules || []}
                isLoading={rulesLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulador de Preços
              </CardTitle>
              <CardDescription>
                Teste diferentes cenários e veja o impacto das suas regras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasConfiguration ? (
                <PricingSimulator restaurantId={restaurantId} />
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Configure primeiro
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Você precisa criar uma configuração básica antes de simular preços
                  </p>
                  <Button onClick={() => setActiveTab('configuration')}>
                    Ir para Configuração
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análise de Performance
              </CardTitle>
              <CardDescription>
                Monitore o impacto das suas estratégias de preço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingAnalytics restaurantId={restaurantId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}