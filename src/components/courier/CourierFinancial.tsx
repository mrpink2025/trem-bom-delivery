import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  CreditCard,
  Wallet,
  Target,
  Award,
  Clock,
  BarChart3
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Earning {
  id: string;
  amount_cents: number;
  type: string;
  description: string;
  reference_date: string;
  created_at: string;
  order_id?: string;
}

interface FinancialStats {
  today: number;
  week: number;
  month: number;
  total: number;
  deliveries_count: number;
  average_per_delivery: number;
  pending_withdrawal: number;
}

export const CourierFinancial: React.FC = () => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    deliveries_count: 0,
    average_per_delivery: 0,
    pending_withdrawal: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar ganhos
      const { data: earningsData, error: earningsError } = await supabase
        .from('courier_earnings')
        .select('*')
        .eq('courier_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (earningsError) {
        throw earningsError;
      }

      setEarnings(earningsData || []);

      // Calcular estatísticas
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = startOfWeek(now, { locale: ptBR });
      const monthStart = startOfMonth(now);

      const todayEarnings = earningsData?.filter(e => 
        new Date(e.reference_date) >= todayStart && e.type !== 'REFUND'
      ) || [];

      const weekEarnings = earningsData?.filter(e => 
        new Date(e.reference_date) >= weekStart && e.type !== 'REFUND'
      ) || [];

      const monthEarnings = earningsData?.filter(e => 
        new Date(e.reference_date) >= monthStart && e.type !== 'REFUND'
      ) || [];

      const totalEarnings = earningsData?.filter(e => e.type !== 'REFUND') || [];
      
      const deliveryEarnings = totalEarnings.filter(e => e.type === 'BASE');

      setStats({
        today: todayEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
        week: weekEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
        month: monthEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
        total: totalEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
        deliveries_count: deliveryEarnings.length,
        average_per_delivery: deliveryEarnings.length > 0 
          ? (deliveryEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100) / deliveryEarnings.length
          : 0,
        pending_withdrawal: Math.max(0, totalEarnings.reduce((sum, e) => sum + e.amount_cents, 0) / 100)
      });

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestWithdrawal = async () => {
    try {
      if (stats.pending_withdrawal < 10) {
        toast({
          title: "Saldo insuficiente",
          description: "Saldo mínimo para saque é R$ 10,00",
          variant: "destructive"
        });
        return;
      }

      // Aqui você implementaria a lógica de saque
      // Por exemplo, criar uma solicitação de saque na base de dados
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saque foi enviada para análise"
      });

    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        title: "Erro",
        description: "Não foi possível solicitar o saque",
        variant: "destructive"
      });
    }
  };

  const getEarningTypeLabel = (type: string) => {
    switch (type) {
      case 'BASE':
        return 'Taxa de Entrega';
      case 'BONUS':
        return 'Bônus';
      case 'ADJUST':
        return 'Ajuste';
      case 'REFUND':
        return 'Estorno';
      default:
        return type;
    }
  };

  const getEarningTypeColor = (type: string) => {
    switch (type) {
      case 'BASE':
        return 'bg-green-100 text-green-800';
      case 'BONUS':
        return 'bg-blue-100 text-blue-800';
      case 'ADJUST':
        return 'bg-yellow-100 text-yellow-800';
      case 'REFUND':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {stats.today.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {stats.week.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este Mês</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {stats.month.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {stats.pending_withdrawal.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Total de Entregas</p>
            <p className="text-xl font-semibold">{stats.deliveries_count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-muted-foreground">Média por Entrega</p>
            <p className="text-xl font-semibold">R$ {stats.average_per_delivery.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Total Acumulado</p>
            <p className="text-xl font-semibold">R$ {stats.total.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ação de Saque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Solicitar Saque</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Saldo disponível para saque</p>
              <p className="text-sm text-muted-foreground">Saque mínimo: R$ 10,00</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                R$ {stats.pending_withdrawal.toFixed(2)}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={requestWithdrawal}
            disabled={stats.pending_withdrawal < 10}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {stats.pending_withdrawal < 10 ? 'Saldo Insuficiente' : 'Solicitar Saque'}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Histórico de Ganhos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {earnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum ganho registrado ainda</p>
                <p className="text-sm">Aceite entregas para ver seus ganhos aqui</p>
              </div>
            ) : (
              earnings.map((earning) => (
                <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge className={getEarningTypeColor(earning.type)}>
                        {getEarningTypeLabel(earning.type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(earning.reference_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{earning.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      earning.type === 'REFUND' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {earning.type === 'REFUND' ? '-' : '+'}R$ {Math.abs(earning.amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(earning.created_at), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};