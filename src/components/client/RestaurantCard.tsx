import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Heart } from 'lucide-react';
import { ScooterIcon } from '@/components/ui/scooter-icon';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

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
    <Card className="group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] animate-fade-in backdrop-blur-sm border-none shadow-soft overflow-hidden">
      <div className="relative overflow-hidden">
        <ImageWithFallback 
          src={image} 
          alt={name}
          fallbackSrc={`https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80`}
          className="w-full h-52 object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Overlay for closed restaurants */}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-2">
              <Badge variant="destructive" className="text-sm font-medium bg-destructive/90 backdrop-blur-sm">
                Fechado
              </Badge>
              <p className="text-white/80 text-xs">Voltamos em breve!</p>
            </div>
          </div>
        )}

        {/* Discount Badge */}
        {discount && isOpen && (
          <Badge className="absolute top-4 left-4 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-bold shadow-lg animate-pulse border-none">
            {discount}% OFF
          </Badge>
        )}

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 shadow-lg border-none"
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
        >
          <Heart 
            className={`w-4 h-4 transition-all duration-300 ${isFavorite ? 'fill-primary text-primary scale-110' : ''}`} 
          />
        </Button>

        {/* Premium Status Indicator */}
        {isOpen && (
          <div className="absolute bottom-4 left-4 flex space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              Disponível
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-5 bg-gradient-to-b from-card to-muted/30">
        <div className="space-y-4">
          {/* Restaurant Name & Cuisine */}
          <div className="space-y-1">
            <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors duration-300">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{cuisine}</p>
          </div>

          {/* Rating & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-700">{rating}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{deliveryTime} min</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-muted-foreground">
              <ScooterIcon className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-accent">
                {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Link to={`/menu/${id}`}>
            <Button 
              className={`w-full font-semibold transition-all duration-300 ${
                isOpen 
                  ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/30 hover:scale-[1.02]' 
                  : 'bg-muted text-muted-foreground'
              }`}
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