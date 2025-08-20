import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RestaurantCard } from './RestaurantCard';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock,
  Star,
  Utensils,
  ShoppingCart
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string; 
  description: string;
  cuisine_type: string;
  image_url: string;
  rating: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
}

interface Category {
  id: string;
  name: string;
}

const ClientDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (restaurantsError) throw restaurantsError;

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      setRestaurants(restaurantsData || []);
      setCategories([{ id: 'all', name: 'Todos' }, ...(categoriesData || [])]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || restaurant.cuisine_type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Bem-vindo ao <span className="text-primary">Trem Bão</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Descubra os melhores restaurantes da sua região
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>Entregando em São Paulo, SP</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar restaurantes ou pratos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <CartSidebar>
          <Button variant="outline" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Carrinho
          </Button>
        </CartSidebar>
      </div>

      {/* Categories */}
      {loading ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2"
            >
              <Utensils className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Featured Restaurant */}
      {filteredRestaurants.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Restaurante em Destaque
            </CardTitle>
            <CardDescription>
              {filteredRestaurants[0].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-primary">
                Desconto especial: 20% OFF
              </Badge>
              <span className="text-sm text-muted-foreground">Válido até o final do mês</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restaurants Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Restaurantes Disponíveis</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.name}
                cuisine={restaurant.cuisine_type}
                rating={restaurant.rating}
                deliveryTime={`${restaurant.delivery_time_min}-${restaurant.delivery_time_max}`}
                deliveryFee={restaurant.delivery_fee}
                image={restaurant.image_url}
                isOpen={restaurant.is_open}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum restaurante encontrado.</p>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {!loading && filteredRestaurants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pedir Novamente
            </CardTitle>
            <CardDescription>
              Seus últimos pedidos favoritos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredRestaurants.slice(0, 3).map((restaurant) => (
                <div key={`recent-${restaurant.id}`} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <img 
                    src={restaurant.image_url} 
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{restaurant.name}</p>
                    <p className="text-xs text-muted-foreground">{restaurant.cuisine_type}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Pedir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;