import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Truck, Heart } from "lucide-react";
import { useState } from "react";

interface RestaurantCardProps {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  discount?: string;
  isOpen: boolean;
}

export default function RestaurantCard({
  id,
  name,
  cuisine,
  rating,
  deliveryTime,
  deliveryFee,
  image,
  discount,
  isOpen
}: RestaurantCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-card hover:scale-[1.02] animate-bounce-in">
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
            {discount}
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
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="text-sm font-medium">{rating}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{deliveryTime}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">
                {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            className="w-full mt-3" 
            variant={isOpen ? "default" : "secondary"}
            disabled={!isOpen}
          >
            {isOpen ? 'Ver Cardápio' : 'Indisponível'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}