import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ReviewSystem from '@/components/reviews/ReviewSystem';
import { ArrowLeft, Plus, Minus, Star, Clock, MapPin, Phone, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  address: any;
  phone: string;
  image_url: string;
  rating: number;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  preparation_time: number;
  ingredients: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

const MenuPage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState<Record<string, string>>({});
  const [showReviews, setShowReviews] = useState(false);
  const { addToCart, loading: cartLoading } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantData();
    }
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    if (!restaurantId) return;

    try {
      // Load restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Load menu items with categories
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*, category_id')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true);

      if (menuError) throw menuError;

      // Load categories separately for proper mapping
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true);

      // Group items by category
      const groupedItems = (menuData || []).reduce((acc: Record<string, MenuItem[]>, item) => {
        const category = categoriesData?.find(c => c.id === item.category_id);
        const categoryName = category?.name || 'Outros';
        const categoryId = category?.id || 'outros';
        
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        
        // Map item to match MenuItem interface
        const mappedItem: MenuItem = {
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.base_price || item.price || 0,
          image_url: item.image_url,
          preparation_time: 15, // default value
          ingredients: [],
          is_vegetarian: false,
          is_vegan: false, 
          is_gluten_free: false,
          category: {
            id: categoryId,
            name: categoryName
          }
        };
        
        acc[categoryId].push(mappedItem);
        return acc;
      }, {});

      const categoriesWithItems: Category[] = Object.entries(groupedItems).map(([categoryId, items]) => ({
        id: categoryId,
        name: items[0]?.category?.name || 'Outros',
        items,
      }));

      setCategories(categoriesWithItems);
    } catch (error) {
      logger.error('Error loading restaurant data', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do restaurante',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change),
    }));
  };

  const handleAddToCart = async (item: MenuItem) => {
    const quantity = quantities[item.id] || 1;
    const instructions = specialInstructions[item.id] || '';
    
    await addToCart(item.id, restaurantId!, quantity, instructions);
    
    // Reset form
    setQuantities(prev => ({ ...prev, [item.id]: 0 }));
    setSpecialInstructions(prev => ({ ...prev, [item.id]: '' }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-8" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-8">
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-48" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Restaurante não encontrado</h1>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </div>

        {/* Restaurant Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full md:w-48 h-48 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{restaurant.name}</h1>
                  {!restaurant.is_open && (
                    <Badge variant="destructive">Fechado</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">{restaurant.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{restaurant.rating}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Taxa: R$ {restaurant.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{restaurant.phone}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  {restaurant.minimum_order > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Pedido mínimo: R$ {restaurant.minimum_order.toFixed(2)}
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReviews(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ver Avaliações
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Categories */}
        {categories && categories.length > 0 ? categories.map((category) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{category.name}</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.items && category.items.length > 0 ? category.items.map((item) => (
                <Card key={item.id} className="h-full">
                  <CardHeader>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {item.is_vegetarian && (
                        <Badge variant="secondary" className="text-xs">Vegetariano</Badge>
                      )}
                      {item.is_vegan && (
                        <Badge variant="secondary" className="text-xs">Vegano</Badge>
                      )}
                      {item.is_gluten_free && (
                        <Badge variant="secondary" className="text-xs">Sem Glúten</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">
                        R$ {item.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.preparation_time} min
                      </span>
                    </div>
                    
                    {item.ingredients && item.ingredients.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.ingredients.join(', ')}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={!quantities[item.id] || quantities[item.id] <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{quantities[item.id] || 1}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Textarea
                        placeholder="Observações especiais..."
                        value={specialInstructions[item.id] || ''}
                        onChange={(e) => setSpecialInstructions(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))}
                        className="text-sm"
                        rows={2}
                      />
                      
                      <Button
                        onClick={() => handleAddToCart(item)}
                        disabled={!restaurant.is_open || cartLoading}
                        className="w-full"
                      >
                        {!restaurant.is_open ? 'Restaurante Fechado' : 'Adicionar ao Carrinho'}
                      </Button>
                      
                      <Link to="/checkout">
                        <Button variant="outline" className="w-full">
                          Ver Carrinho
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-6">
                  <p className="text-muted-foreground">Nenhum item disponível nesta categoria.</p>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando cardápio...</p>
          </div>
        )}
        
        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum item disponível no momento.</p>
          </div>
        )}

        {/* Reviews Modal */}
        {showReviews && restaurant && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Avaliações - {restaurant.name}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowReviews(false)}
                >
                  ✕
                </Button>
              </div>
              <ReviewSystem />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;