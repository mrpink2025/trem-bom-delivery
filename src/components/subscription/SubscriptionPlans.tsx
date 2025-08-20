import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

const SubscriptionPlans = () => {
  const { session, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: 'basic',
      name: 'Trem Bão Básico',
      price: 'R$ 9,99',
      icon: <Star className="w-8 h-8 text-secondary" />,
      description: 'Perfeito para começar',
      features: [
        'Pedidos ilimitados',
        'Suporte básico por email',
        'Taxa de entrega reduzida em 50%',
        'Histórico de pedidos'
      ],
      recommended: false
    },
    {
      id: 'premium',
      name: 'Trem Bão Premium',
      price: 'R$ 19,99',
      icon: <Crown className="w-8 h-8 text-secondary" />,
      description: 'Mais popular entre nossos clientes',
      features: [
        'Tudo do plano Básico',
        'Entrega grátis em todos os pedidos',
        'Suporte prioritário via chat',
        'Cashback de 5% em cada pedido',
        'Acesso a ofertas exclusivas'
      ],
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Trem Bão Empresarial',
      price: 'R$ 49,99',
      icon: <Zap className="w-8 h-8 text-secondary" />,
      description: 'Para empresas e grandes consumidores',
      features: [
        'Tudo do plano Premium',
        'API personalizada para empresas',
        'Suporte dedicado 24/7',
        'Cashback de 10% em cada pedido',
        'Relatórios detalhados de gastos',
        'Pedidos em massa com desconto'
      ],
      recommended: false
    }
  ];

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para assinar um plano',
        variant: 'destructive',
      });
      return;
    }

    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: 'Redirecionando...',
        description: 'Você será redirecionado para o checkout do Stripe',
      });
    } catch (error) {
      logger.error('Error creating checkout', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    setLoading('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: 'Redirecionando...',
        description: 'Você será redirecionado para gerenciar sua assinatura',
      });
    } catch (error) {
      logger.error('Error opening customer portal', error);
      toast({
        title: 'Erro',
        description: 'Erro ao abrir portal de gerenciamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const refreshSubscription = async () => {
    setLoading('refresh');
    await checkSubscription();
    setLoading(null);
    toast({
      title: 'Status atualizado',
      description: 'Status da assinatura foi atualizado',
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {subscription && (
        <Card className="bg-gradient-primary border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-primary-foreground">
              <span>Sua Assinatura Atual</span>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={refreshSubscription}
                disabled={loading === 'refresh'}
              >
                {loading === 'refresh' ? 'Atualizando...' : 'Atualizar Status'}
              </Button>
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              {subscription.subscribed ? (
                <>
                  Plano ativo: <strong>{subscription.subscription_tier}</strong>
                  {subscription.subscription_end && (
                    <span className="block">
                      Renova em: {new Date(subscription.subscription_end).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </>
              ) : (
                'Nenhuma assinatura ativa'
              )}
            </CardDescription>
          </CardHeader>
          {subscription.subscribed && (
            <CardContent>
              <Button 
                onClick={handleManageSubscription}
                disabled={loading === 'manage'}
                variant="secondary"
              >
                {loading === 'manage' ? 'Carregando...' : 'Gerenciar Assinatura'}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.subscribed && 
            subscription.subscription_tier === plan.name.split(' ')[2]; // Extract tier name
          const isActive = loading === plan.id;

          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-lg ${
                plan.recommended ? 'ring-2 ring-primary shadow-warm' : ''
              } ${isCurrentPlan ? 'bg-secondary/20 border-secondary' : ''}`}
            >
              {plan.recommended && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-foreground">
                  Mais Popular
                </Badge>
              )}
              
              {isCurrentPlan && (
                <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
                  Seu Plano
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-3xl font-bold text-primary mt-2">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isActive || isCurrentPlan}
                  variant={plan.recommended ? "default" : "outline"}
                >
                  {isActive ? 'Processando...' : 
                   isCurrentPlan ? 'Plano Atual' : 
                   'Assinar Agora'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2 text-sm text-muted-foreground">
            <p>✓ Cancele a qualquer momento</p>
            <p>✓ Suporte dedicado para assinantes</p>
            <p>✓ Preços em reais, sem taxa de conversão</p>
            <p>✓ Renovação automática (pode ser cancelada)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPlans;