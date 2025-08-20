import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Heart } from 'lucide-react';
import { ScooterIcon } from '@/components/ui/scooter-icon';

interface RestaurantCardProps {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  discount?: number;
  isOpen: boolean;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = memo(({
  id,
  name,
  cuisine,
  rating,
  deliveryTime,
  deliveryFee,
  image,
  discount,
  isOpen
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-bounce-in">
      <div className="relative overflow-hidden rounded-t-lg">
        <img 
          src={image} 
          alt={name}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Overlay for closed restaurants */}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-medium">
              Fechado
            </Badge>
          </div>
        )}

        {/* Discount Badge */}
        {discount && isOpen && (
          <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground font-bold">
            {discount}% OFF
          </Badge>
        )}

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-primary text-primary' : ''}`} 
          />
        </Button>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Restaurant Name & Cuisine */}
          <div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{cuisine}</p>
          </div>

          {/* Rating & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{rating}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{deliveryTime} min</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-muted-foreground">
              <ScooterIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Link to={`/menu/${id}`}>
            <Button 
              className="w-full" 
              disabled={!isOpen}
              variant={isOpen ? "default" : "secondary"}
            >
              {isOpen ? "Ver Cardápio" : "Indisponível"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

RestaurantCard.displayName = 'RestaurantCard';