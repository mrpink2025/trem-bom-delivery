import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Package, User, Truck } from 'lucide-react';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

const ReviewPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [completedReviews, setCompletedReviews] = useState<string[]>([]);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID not provided');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants(id, name, image_url)
        `)
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Check existing reviews
  const { data: existingReviews } = useQuery({
    queryKey: ['reviews', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select('target_type, target_id')
        .eq('order_id', orderId)
        .eq('user_id', user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Pedido não encontrado</p>
          <p className="text-muted-foreground mb-4">Não foi possível encontrar os detalhes deste pedido.</p>
          <Button onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const hasRestaurantReview = existingReviews?.some(r => r.target_type === 'restaurant');
  const hasCourierReview = existingReviews?.some(r => r.target_type === 'courier');

  const handleReviewComplete = (targetType: string) => {
    setCompletedReviews(prev => [...prev, targetType]);
    toast({
      title: "Avaliação enviada!",
      description: "Obrigado pelo seu feedback.",
    });
  };

  const isAllReviewsComplete = 
    (hasRestaurantReview || completedReviews.includes('restaurant')) && 
    (hasCourierReview || completedReviews.includes('courier') || !order.courier_id);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pedido Entregue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {order.restaurants && (
                  <img 
                    src={order.restaurants.image_url || ''} 
                    alt={order.restaurants.name || 'Restaurant'}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{order.restaurants?.name || 'Restaurante'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Pedido #{order.id.slice(0, 8)}
                  </p>
                  <Badge variant="default" className="mt-1">
                    Entregue
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Review */}
          {!hasRestaurantReview && !completedReviews.includes('restaurant') && (
            <ReviewForm
              orderId={order.id}
              targetType="restaurant"
              targetId={order.restaurant_id}
              targetName={order.restaurants?.name || 'Restaurante'}
              onSubmit={() => handleReviewComplete('restaurant')}
            />
          )}

          {/* Courier Review */}
          {order.courier_id && !hasCourierReview && !completedReviews.includes('courier') && (
            <ReviewForm
              orderId={order.id}
              targetType="courier"
              targetId={order.courier_id}
              targetName="Entregador"
              onSubmit={() => handleReviewComplete('courier')}
            />
          )}

          {/* Completion Message */}
          {isAllReviewsComplete && (
            <Card>
              <CardContent className="text-center py-8">
                <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Obrigado pelo seu feedback!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Suas avaliações nos ajudam a melhorar nosso serviço.
                </p>
                <Button onClick={() => navigate('/')}>
                  Fazer novo pedido
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;