import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, DollarSign, Navigation, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DispatchOffer {
  id: string;
  order_id: string;
  distance_km: number;
  eta_minutes: number;
  estimated_earnings_cents: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  expires_at: string;
  created_at: string;
  orders: {
    id: string;
    delivery_address: any;
    restaurants: {
      name: string;
      location: any;
    };
  };
}

export function CourierOffers() {
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOffers();
    
    // Realtime subscription para novas ofertas
    const channel = supabase
      .channel('courier_offers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_offers'
        },
        (payload) => {
          const newOffer = payload.new as any;
          if (newOffer.courier_id === supabase.auth.getUser()) {
            loadOffers(); // Recarregar para pegar dados completos
            
            // Notificação sonora/visual
            if ('Notification' in window) {
              new Notification('Nova Corrida Disponível!', {
                body: `${newOffer.distance_km}km - R$${(newOffer.estimated_earnings_cents/100).toFixed(2)}`,
                icon: '/icon-192x192.png'
              });
            }
          }
        }
      )
      .subscribe();

    // Auto refresh para atualizar timers
    const interval = setInterval(() => {
      setOffers(prev => [...prev]); // Trigger re-render para timers
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('dispatch_offers')
        .select(`
          id,
          order_id,
          distance_km,
          eta_minutes,
          estimated_earnings_cents,
          status,
          expires_at,
          created_at,
          orders!inner(
            id,
            delivery_address,
            restaurants(name, location)
          )
        `)
        .eq('courier_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Erro ao carregar ofertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToOffer = async (offerId: string, action: 'ACCEPT' | 'DECLINE') => {
    setResponding(offerId);
    
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-answer', {
        body: {
          offer_id: offerId,
          action
        }
      });

      if (error) throw error;

      toast({
        title: action === 'ACCEPT' ? "Corrida aceita!" : "Corrida recusada",
        description: action === 'ACCEPT' 
          ? `Vá para ${data.restaurant.name}` 
          : "Procurando novas corridas...",
        variant: action === 'ACCEPT' ? "default" : "default"
      });

      // Remover oferta da lista
      setOffers(prev => prev.filter(o => o.id !== offerId));

      if (action === 'ACCEPT') {
        // Redirecionar para tela de corrida ativa
        window.location.href = '/courier/active-route';
      }

    } catch (error: any) {
      console.error('Erro ao responder oferta:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao responder oferta",
        variant: "destructive"
      });
    } finally {
      setResponding(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    return {
      seconds: diffSeconds,
      percentage: Math.max(0, (diffSeconds / 30) * 100) // Assumindo 30s de timeout
    };
  };

  const formatAddress = (address: any) => {
    if (!address) return 'Endereço não disponível';
    return `${address.street}, ${address.number} - ${address.neighborhood}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando ofertas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Corridas Disponíveis</h2>
        <Badge variant="secondary">
          {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
        </Badge>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma corrida disponível</h3>
            <p className="text-muted-foreground">
              Fique online para receber novas ofertas de corrida
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => {
            const timeRemaining = getTimeRemaining(offer.expires_at);
            const isExpiring = timeRemaining.seconds <= 10;
            
            return (
              <Card 
                key={offer.id}
                className={`transition-all duration-200 ${
                  isExpiring ? 'border-red-500 shadow-lg' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {offer.orders.restaurants?.name || 'Restaurante'}
                    </CardTitle>
                    <Badge 
                      variant={isExpiring ? "destructive" : "secondary"}
                      className="font-mono"
                    >
                      {timeRemaining.seconds}s
                    </Badge>
                  </div>
                  
                  {/* Barra de progresso do tempo */}
                  <Progress 
                    value={timeRemaining.percentage} 
                    className={`h-2 ${isExpiring ? 'bg-red-100' : ''}`}
                  />
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Informações principais */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="font-semibold">{offer.distance_km.toFixed(1)} km</div>
                      <div className="text-xs text-muted-foreground">Distância</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="font-semibold">{offer.eta_minutes.toFixed(0)} min</div>
                      <div className="text-xs text-muted-foreground">Tempo</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="font-semibold text-green-600">
                        R$ {(offer.estimated_earnings_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Ganho</div>
                    </div>
                  </div>

                  {/* Endereço de entrega */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium mb-1">Entrega:</div>
                        <div className="text-muted-foreground">
                          {formatAddress(offer.orders.delivery_address)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => respondToOffer(offer.id, 'DECLINE')}
                      disabled={responding === offer.id}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Recusar
                    </Button>
                    
                    <Button
                      onClick={() => respondToOffer(offer.id, 'ACCEPT')}
                      disabled={responding === offer.id}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {responding === offer.id ? 'Aceitando...' : 'Aceitar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}