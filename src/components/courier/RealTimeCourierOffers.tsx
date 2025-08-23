import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  X,
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DispatchOffer {
  id: string;
  order_id: string;
  distance_km: number;
  eta_minutes: number;
  estimated_earnings_cents: number;
  status: string;
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

export function RealTimeCourierOffers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    loadOffers();
    setupRealtimeSubscription();
  }, [user]);

  const loadOffers = async () => {
    try {
      const { data } = await supabase
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
            restaurants(
              name,
              location
            )
          )
        `)
        .eq('courier_id', user?.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      setOffers(data || []);
    } catch (error) {
      console.error('Erro ao carregar ofertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('dispatch-offers')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dispatch_offers',
        filter: `courier_id=eq.${user?.id}`
      }, (payload) => {
        const newOffer = payload.new as any;
        setOffers(prev => [newOffer, ...prev]);
        
        toast({
          title: 'Nova Oferta de Entrega!',
          description: `R$ ${(newOffer.estimated_earnings_cents / 100).toFixed(2)} - ${newOffer.distance_km}km`,
        });

        // Play notification sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dispatch_offers',
        filter: `courier_id=eq.${user?.id}`
      }, (payload) => {
        const updatedOffer = payload.new as any;
        setOffers(prev => 
          prev.map(offer => 
            offer.id === updatedOffer.id ? updatedOffer : offer
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const respondToOffer = async (offerId: string, action: 'ACCEPTED' | 'REJECTED') => {
    setResponding(offerId);
    
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-answer', {
        body: {
          offer_id: offerId,
          action: action
        }
      });

      if (error) throw error;

      toast({
        title: action === 'ACCEPTED' ? 'Oferta aceita!' : 'Oferta recusada',
        description: action === 'ACCEPTED' 
          ? 'Você aceitou a entrega. Vá até o restaurante.'
          : 'Oferta recusada com sucesso.'
      });

      // Remove offer from list
      setOffers(prev => prev.filter(offer => offer.id !== offerId));

    } catch (error) {
      console.error('Erro ao responder oferta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar sua resposta',
        variant: 'destructive'
      });
    } finally {
      setResponding(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = Math.max(0, expiry - now);
    return Math.floor(diff / 1000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Ofertas de Entrega</h2>
        <Badge variant={offers.length > 0 ? "default" : "secondary"}>
          {offers.length} disponível(is)
        </Badge>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma oferta disponível</h3>
            <p className="text-muted-foreground">
              Mantenha-se online para receber ofertas de entrega
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onRespond={respondToOffer}
              isResponding={responding === offer.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OfferCardProps {
  offer: DispatchOffer;
  onRespond: (offerId: string, action: 'ACCEPTED' | 'REJECTED') => void;
  isResponding: boolean;
}

function OfferCard({ offer, onRespond, isResponding }: OfferCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(offer.expires_at).getTime();
      const diff = Math.max(0, expiry - now);
      setTimeRemaining(Math.floor(diff / 1000));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [offer.expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeRemaining === 0;

  return (
    <Card className={`${isExpired ? 'opacity-50' : 'border-primary/20 bg-primary/5'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Entrega #{offer.order_id.slice(-6)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isExpired ? "destructive" : "default"}>
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
            <Badge variant="secondary">
              R$ {(offer.estimated_earnings_cents / 100).toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Restaurant */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
            <div>
              <p className="font-medium">Retirada</p>
              <p className="text-sm text-muted-foreground">
                {offer.orders.restaurants.name}
              </p>
            </div>
          </div>

          {/* Customer */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
            <div>
              <p className="font-medium">Entrega</p>
              <p className="text-sm text-muted-foreground">
                {offer.orders.delivery_address?.street || 'Endereço não informado'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              <span>{offer.distance_km} km</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{offer.eta_minutes} min</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span>R$ {(offer.estimated_earnings_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          {!isExpired && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onRespond(offer.id, 'ACCEPTED')}
                className="flex-1"
                disabled={isResponding}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aceitar
              </Button>
              <Button
                onClick={() => onRespond(offer.id, 'REJECTED')}
                variant="outline"
                disabled={isResponding}
              >
                <X className="w-4 h-4 mr-2" />
                Recusar
              </Button>
            </div>
          )}

          {isExpired && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Oferta expirou</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}