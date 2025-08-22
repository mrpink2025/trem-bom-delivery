import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, Star, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import type { NearbyRestaurant } from '@/hooks/useNearbyRestaurants';

interface NearbyRestaurantCardProps {
  restaurant: NearbyRestaurant;
  showDistance?: boolean;
}

export const NearbyRestaurantCard = ({ restaurant, showDistance = true }: NearbyRestaurantCardProps) => {
  const navigate = useNavigate();

  const getDeliveryTime = () => {
    // Estimar tempo baseado na distância (assumindo 25km/h + 5min buffer)
    const estimatedTime = Math.round(restaurant.distance_km * 2.4 + 5);
    return `${estimatedTime}-${estimatedTime + 10}`;
  };

  const getDeliveryFee = () => {
    // Taxa base + por distância
    const baseFee = 3.99;
    const distanceFee = restaurant.distance_km * 0.8;
    return baseFee + distanceFee;
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={() => navigate(`/menu/${restaurant.id}`)}
    >
      <div className="relative">
        <ImageWithFallback
          src={restaurant.image_url || ''}
          alt={restaurant.name}
          fallbackSrc="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80"
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Status badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant={restaurant.is_active ? "default" : "secondary"}>
            {restaurant.is_active ? "Aberto" : "Fechado"}
          </Badge>
        </div>
        
        {/* Distance badge */}
        {showDistance && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-white/90 text-gray-700">
            <MapPin className="w-3 h-3 mr-1" />
            {restaurant.distance_km.toFixed(1)}km
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{restaurant.name}</CardTitle>
          {restaurant.score && restaurant.score > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{restaurant.score.toFixed(1)}</span>
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {restaurant.description || `Deliciosa ${restaurant.cuisine_type}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            <span>{getDeliveryTime()} min</span>
            <span className="mx-2">•</span>
            <span>R$ {getDeliveryFee().toFixed(2)} entrega</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Navigation className="w-4 h-4 mr-2" />
            <span>{restaurant.city}, {restaurant.state}</span>
            {restaurant.neighborhood && (
              <>
                <span className="mx-2">•</span>
                <span>{restaurant.neighborhood}</span>
              </>
            )}
          </div>
          
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              {restaurant.cuisine_type}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};