import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CartSidebar } from '@/components/cart/CartSidebar';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import LoyaltyProgram from '@/components/loyalty/LoyaltyProgram';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NearbyRestaurantCard } from './NearbyRestaurantCard';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { DeliveryRadiusSelector } from './DeliveryRadiusSelector';
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
  Pizza,
  Coffee,
  ChefHat,
  Beef,
  Sandwich,
  UtensilsCrossed,
  Beer,
  Cake,
  Zap,
  ShoppingBag,
  Home,
  Wifi,
  WifiOff,
  Navigation,
  RefreshCw,
  ClipboardList,
  ChevronDown
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

interface ClientDashboardProps {
  userLocation?: any;
}

const ClientDashboard = ({ userLocation: propLocation }: ClientDashboardProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showLoyaltyProgram, setShowLoyaltyProgram] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [onlyOpen, setOnlyOpen] = useState(true);

  // Hooks de localização e restaurantes próximos
  const { location: hookLocation, getLocation: refreshLocation } = useUserLocation();
  
  // Usar a localização passada por prop se disponível, senão usar do hook
  const location = propLocation || hookLocation;
  
  // Monitor detalhado do estado da localização
  useEffect(() => {
    console.log('🌟 LOCATION STATE CHANGED:', {
      timestamp: new Date().toISOString(),
      location: {
        lat: location.lat,
        lng: location.lng,
        city: location.city,
        state: location.state,
        source: location.source,
        loading: location.loading,
        error: location.error,
        hasCoordinates: !!(location.lat && location.lng),
        hasAddress: !!(location.city && location.state),
        fullObject: location
      },
      usingProp: !!propLocation,
      propLocation,
      hookLocation
    });
  }, [location, propLocation, hookLocation]);
  
  console.log('🏠 ClientDashboard location state:', {
    lat: location.lat,
    lng: location.lng,
    source: location.source,
    hasLocation: !!(location.lat && location.lng),
    timestamp: new Date().toISOString(),
    usingProp: !!propLocation
  });
  
  const { 
    restaurants, 
    loading, 
    error, 
    isOffline, 
    lastFetched, 
    refetch,
    searchMeta 
  } = useNearbyRestaurants({
    lat: location.lat,
    lng: location.lng,
    radiusKm,
    onlyOpen,
    filters: {
      category: selectedCategory !== 'all' ? selectedCategory : undefined
    },
    clientCity: location.city // Passar a cidade do cliente
  });

  console.log('🏙️ Client city for restaurant search:', location.city);
  console.log('🔍 Search meta:', searchMeta);

  // Function to get category icon
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'todos':
        return Utensils;
      case 'lanches':
        return Sandwich;
      case 'pizzas':
        return Pizza;
      case 'comida mineira':
        return ChefHat;
      case 'comida goiana':
        return Beef;
      case 'pamonharia':
        return Coffee;
      case 'pastéis':
        return UtensilsCrossed;
      case 'bebidas':
        return Beer;
      case 'sobremesas':
        return Cake;
      case 'comida de buteco':
        return Beer;
      case 'conveniência':
        return ShoppingBag;
      case 'espetinhos':
        return Beef;
      case 'jantinha':
        return Home;
      default:
        return Utensils;
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      setCategories([{ id: 'all', name: 'Todos' }, ...(categoriesData || [])]);
    } catch (error) {
      logger.error('Error loading categories', error);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Fix category filtering - compare by name instead of ID
    const selectedCategoryName = categories.find(cat => cat.id === selectedCategory)?.name;
    const matchesCategory = selectedCategory === 'all' || 
                           restaurant.cuisine_type === selectedCategoryName ||
                           restaurant.cuisine_type?.toLowerCase().includes(selectedCategoryName?.toLowerCase() || '');
    
    // Apply advanced search filters if active
    let matchesFilters = true;
    if (searchFilters) {
      if (searchFilters.minRating && restaurant.score && restaurant.score < searchFilters.minRating) {
        matchesFilters = false;
      }
      if (searchFilters.maxDeliveryTime && restaurant.distance_km && restaurant.distance_km * 3 > searchFilters.maxDeliveryTime) {
        matchesFilters = false;
      }
      if (searchFilters.cuisineTypes && searchFilters.cuisineTypes.length > 0) {
        if (!searchFilters.cuisineTypes.includes(restaurant.cuisine_type)) {
          matchesFilters = false;
        }
      }
      if (searchFilters.openNow && !restaurant.is_active) {
        matchesFilters = false;
      }
    }
    
    return matchesSearch && matchesCategory && matchesFilters;
  });

  const getLocationStatus = () => {
    const now = new Date().toISOString();
    console.log(`🔍 getLocationStatus CALLED at ${now}`);
    console.log('🔍 getLocationStatus - RAW VALUES:', { 
      'location.lat': location.lat,
      'location.lng': location.lng,
      'typeof lat': typeof location.lat,
      'typeof lng': typeof location.lng,
      'lat === null': location.lat === null,
      'lng === null': location.lng === null,
      'lat === undefined': location.lat === undefined,
      'lng === undefined': location.lng === undefined,
      '!!lat': !!location.lat,
      '!!lng': !!location.lng,
      'Boolean(lat)': Boolean(location.lat),
      'Boolean(lng)': Boolean(location.lng)
    });
    
    console.log('🔍 getLocationStatus - FULL DEBUG:', { 
      lat: location.lat, 
      lng: location.lng, 
      hasLocation: !!(location.lat && location.lng),
      city: location.city,
      state: location.state,
      source: location.source,
      loading: location.loading,
      error: location.error,
      timestamp: now,
      fullLocationObject: location
    });
    
    // CRÍTICO: Verificar apenas lat/lng, não city/state
    const hasCoordinates = !!(location.lat && location.lng);
    console.log(`🔍 hasCoordinates: ${hasCoordinates}`);
    
    if (!location.lat || !location.lng) {
      console.log('❌ Localização não definida - sem coordenadas', {
        lat: location.lat,
        lng: location.lng,
        condition1: !location.lat,
        condition2: !location.lng,
        overall: !location.lat || !location.lng
      });
      return {
        text: "Localização não definida",
        description: "Defina sua localização para ver restaurantes próximos",
        variant: "secondary" as const,
        icon: MapPin
      };
    }

    if (isOffline) {
      console.log('📱 Modo offline detectado');
      return {
        text: "Modo offline",
        description: "Dados podem estar desatualizados",
        variant: "secondary" as const,
        icon: WifiOff
      };
    }

    if (location.source === 'ip') {
      console.log('🌐 Localização por IP');
      return {
        text: `Localização aproximada (${location.city || 'Desconhecida'})`,
        description: "Baseada no seu IP - pode ser imprecisa",
        variant: "secondary" as const,
        icon: MapPin
      };
    }

    // Localização precisa (GPS ou manual)
    console.log('🎯 Localização precisa encontrada');
    const cityName = location.city || 'Localização obtida';
    const stateName = location.state || '';
    const locationText = stateName ? `${cityName}, ${stateName}` : cityName;
    
    return {
      text: locationText,
      description: `${restaurants.length} restaurantes em ${radiusKm}km`,
      variant: "default" as const,
      icon: Navigation
    };
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          <span className="text-primary">Trem Bão</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Descubra os melhores restaurantes da sua região
        </p>
        
        {/* Location Status with update button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {(() => {
            const status = getLocationStatus();
            const IconComponent = status.icon;
            return (
              <div className="flex items-center gap-2">
                <Badge variant={status.variant} className="flex items-center gap-2 px-4 py-2">
                  <IconComponent className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{status.text}</div>
                    <div className="text-xs opacity-80">{status.description}</div>
                  </div>
                </Badge>
                
                {/* Show update button if location needs refresh */}
                {location.lat && location.lng && (!location.city || location.source === 'cache') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={async () => {
                      console.log('🔄 Atualizando localização...');
                      try {
                        await refreshLocation();
                      } catch (error) {
                        console.error('Erro ao atualizar localização:', error);
                      }
                    }}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Atualizar
                  </Button>
                )}
              </div>
            );
          })()}
          
          {/* Delivery Radius Selector */}
          {location.lat && location.lng && (
            <DeliveryRadiusSelector
              currentRadius={radiusKm}
              restaurantCount={restaurants.length}
              onRadiusChange={setRadiusKm}
              loading={loading}
            />
          )}
        </div>

        {/* Offline indicator */}
        {isOffline && (
          <Alert className="max-w-md mx-auto">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Você está offline. Exibindo dados salvos que podem estar desatualizados.
            </AlertDescription>
          </Alert>
        )}

        {/* Location error */}
        {error && !isOffline && (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar restaurantes ou pratos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 min-h-[44px] text-sm sm:text-base"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Meus Pedidos</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedSearch(true)}
            className="flex items-center gap-2 min-h-[44px] text-sm sm:text-base"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowLoyaltyProgram(true)}
            className="flex items-center gap-2 min-h-[44px] text-sm sm:text-base"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Fidelidade</span>
          </Button>
          <CartSidebar>
            <Button variant="outline" className="flex items-center gap-2 min-h-[44px] text-sm sm:text-base">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Carrinho</span>
            </Button>
          </CartSidebar>
        </div>
      </div>

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pesquisa Avançada</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAdvancedSearch(false)}
              >
                ✕
              </Button>
            </div>
            <AdvancedSearch />
          </div>
        </div>
      )}

      {/* Loyalty Program Modal */}
      {showLoyaltyProgram && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Programa de Fidelidade</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowLoyaltyProgram(false)}
              >
                ✕
              </Button>
            </div>
            <LoyaltyProgram />
          </div>
        </div>
      )}

      {/* Search expansion info */}
      {searchMeta?.search_expanded_count > 0 && (
        <Alert className="max-w-4xl mx-auto mb-6">
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Encontramos apenas {searchMeta.nearby_count || 0} restaurantes próximos. 
                Expandimos a busca e incluímos mais {searchMeta.search_expanded_count} restaurantes da sua cidade ({searchMeta.client_city}).
              </span>
              <Badge variant="secondary" className="text-xs">
                Busca expandida
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Categories Dropdown */}
      <div className="space-y-3 text-center">
        <h3 className="text-lg font-semibold text-foreground">Categorias</h3>
        {loading ? (
          <div className="flex justify-center">
            <Skeleton className="h-12 w-48" />
          </div>
        ) : (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 min-h-[44px] min-w-[200px] justify-between">
                  {(() => {
                    const selectedCategoryItem = categories.find(cat => cat.id === selectedCategory);
                    const IconComponent = getCategoryIcon(selectedCategoryItem?.name || 'Todos');
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          <span>{selectedCategoryItem?.name || 'Todos'}</span>
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    );
                  })()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-background border shadow-lg z-50">
                {categories.map((category) => {
                  const IconComponent = getCategoryIcon(category.name);
                  return (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center justify-center gap-2 cursor-pointer ${
                        selectedCategory === category.id ? 'bg-muted text-primary' : ''
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{category.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Featured Restaurant */}
      {filteredRestaurants.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Restaurante em Destaque
            </CardTitle>
            <CardDescription>
              {filteredRestaurants[0].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
        <h2 className="text-2xl font-bold mb-6 text-center">Restaurantes Disponíveis</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRestaurants.map((restaurant) => (
              <NearbyRestaurantCard 
                key={restaurant.id}
                restaurant={restaurant}
                showDistance={true}
              />
            ))}
          </div>
        ) : location.lat && location.lng ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhum restaurante encontrado nesta área.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Tente aumentar o raio de busca ou verificar uma localização diferente.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setRadiusKm(Math.min(radiusKm + 2, 15))}
              disabled={radiusKm >= 15}
            >
              Expandir busca para {Math.min(radiusKm + 2, 15)}km
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Configure sua localização para ver restaurantes próximos.</p>
            <p className="text-sm text-muted-foreground">
              Usaremos sua localização para mostrar opções de entrega na sua área.
            </p>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {!loading && filteredRestaurants.length > 0 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
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
                  <ImageWithFallback 
                    src={restaurant.image_url} 
                    alt={restaurant.name}
                    fallbackSrc="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{restaurant.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{restaurant.cuisine_type}</span>
                      <span>•</span>
                      <span>{restaurant.distance_km.toFixed(1)}km</span>
                    </div>
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