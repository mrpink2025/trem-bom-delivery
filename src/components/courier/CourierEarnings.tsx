import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EarningsSummary {
  total_earnings_reais: number;
  today_earnings_reais: number;
  pending_earnings_reais: number;
  delivery_count: number;
  avg_per_delivery_reais: number;
}

interface EarningsData {
  summary: EarningsSummary;
  recent_earnings: Array<{
    id: string;
    amount_reais: number;
    type: string;
    description: string;
    date: string;
    restaurant_name?: string;
  }>;
}

export function CourierEarnings() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    try {
      const now = new Date();
      let from: string;
      
      switch (period) {
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          from = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          from = now.toISOString().split('T')[0];
      }

      const response = await supabase.functions.invoke('courier-earnings', {
        method: 'GET',
        body: { from, group_by: 'day' }
      });

      if (response.error) throw response.error;
      setEarnings(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os ganhos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BASE': return 'bg-blue-100 text-blue-800';
      case 'BONUS': return 'bg-green-100 text-green-800';
      case 'SURGE': return 'bg-orange-100 text-orange-800';
      case 'REFUND': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6">Carregando ganhos...</div>;
  }

  if (!earnings) {
    return <div className="p-6">Erro ao carregar dados</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Resumo dos ganhos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">
                  R$ {earnings.summary.today_earnings_reais.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">
                  R$ {earnings.summary.total_earnings_reais.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky/10 rounded-lg">
                <Package className="w-5 h-5 text-sky" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entregas</p>
                <p className="text-2xl font-bold">{earnings.summary.delivery_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média/Entrega</p>
                <p className="text-2xl font-bold">
                  R$ {earnings.summary.avg_per_delivery_reais.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de período */}
      <div className="flex space-x-2">
        {[
          { key: 'day', label: 'Hoje' },
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mês' }
        ].map(p => (
          <Button
            key={p.key}
            variant={period === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Ganhos pendentes */}
      {earnings.summary.pending_earnings_reais > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ganhos Pendentes</p>
                <p className="text-sm text-muted-foreground">
                  Entregas em andamento
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">
                  R$ {earnings.summary.pending_earnings_reais.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico recente */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {earnings.recent_earnings.slice(0, 10).map(earning => (
              <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={getTypeColor(earning.type)}>
                      {earning.type}
                    </Badge>
                    <span className="font-medium">
                      R$ {earning.amount_reais.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {earning.description}
                  </p>
                  {earning.restaurant_name && (
                    <p className="text-xs text-muted-foreground">
                      {earning.restaurant_name}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {new Date(earning.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}

            {earnings.recent_earnings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum ganho registrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}