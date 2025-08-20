import React, { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestaurantCard } from './RestaurantCard';
import { CartSidebar } from '@/components/cart/CartSidebar';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import LoyaltyProgram from '@/components/loyalty/LoyaltyProgram';
import SubscriptionPlans from '@/components/subscription/SubscriptionPlans';
import { logger } from '@/utils/logger';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock,
  Star,
  Utensils,
  ShoppingCart,
  Gift,
  Crown
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

const ClientDashboard = memo(() => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedTab, setSelectedTab] = useState('restaurants');

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
      logger.error('Error loading data', error);
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
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Bem-vindo ao Trem Bão! 🚂
          </h1>
          <p className="text-lg text-muted-foreground">
            Descubra os melhores sabores de Minas e Goiás na sua mesa
          </p>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Restaurantes
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Assinatura
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Fidelidade
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrinho
            </TabsTrigger>
          </TabsList>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar restaurantes ou pratos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showAdvancedSearch ? "default" : "outline"}
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      size="sm"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {showAdvancedSearch && (
                <CardContent>
                  <AdvancedSearch />
                </CardContent>
              )}
            </Card>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="rounded-full"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Utensils className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{restaurants.length}</p>
                  <p className="text-sm text-muted-foreground">Restaurantes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <p className="text-2xl font-bold">25 min</p>
                  <p className="text-sm text-muted-foreground">Tempo médio</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold">4.8</p>
                  <p className="text-sm text-muted-foreground">Avaliação média</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MapPin className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">2 km</p>
                  <p className="text-sm text-muted-foreground">Raio de entrega</p>
                </CardContent>
              </Card>
            </div>

            {/* Restaurants Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index}>
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
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
                    discount={Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : undefined}
                    isOpen={restaurant.is_open}
                  />
                ))}
              </div>
            )}

            {filteredRestaurants.length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum restaurante encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Tente ajustar os filtros ou a pesquisa para encontrar restaurantes.
                  </p>
                  <Button onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <SubscriptionPlans />
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty">
            <LoyaltyProgram />
          </TabsContent>

          {/* Cart Tab */}
          <TabsContent value="cart">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Seu Carrinho</h3>
                  <p className="text-muted-foreground">
                    Acesse um restaurante para adicionar itens ao carrinho
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

ClientDashboard.displayName = 'ClientDashboard';

export default ClientDashboard;