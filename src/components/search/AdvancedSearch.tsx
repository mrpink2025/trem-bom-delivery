import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Star, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
  Utensils,
  Truck,
  Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFilters {
  query: string;
  category: string;
  priceRange: [number, number];
  rating: number;
  deliveryTime: number;
  deliveryFee: [number, number];
  location: string;
  radius: number;
  sortBy: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  acceptsVouchers: boolean;
  isOpen: boolean;
  hasPromotions: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  distance: number;
  image: string;
  isOpen: boolean;
  hasPromotions: boolean;
  tags: string[];
}

const mockRestaurants: Restaurant[] = [
  {
    id: "rest-001",
    name: "Tempero Goiano",
    cuisine: "Goiana",
    rating: 4.7,
    deliveryTime: "25-35 min",
    deliveryFee: 5.0,
    minOrder: 30,
    distance: 2.1,
    image: "/api/placeholder/300/200",
    isOpen: true,
    hasPromotions: true,
    tags: ["tradicional", "caseira", "vegetariano"]
  },
  {
    id: "rest-002",
    name: "Pizzaria Trem Bom",
    cuisine: "Italiana",
    rating: 4.6,
    deliveryTime: "40-50 min",
    deliveryFee: 6.0,
    minOrder: 35,
    distance: 3.8,
    image: "/api/placeholder/300/200",
    isOpen: true,
    hasPromotions: false,
    tags: ["pizza", "italiana", "vegetariano"]
  },
  {
    id: "rest-003",
    name: "Dona Maria Cozinha Mineira",
    cuisine: "Mineira",
    rating: 4.8,
    deliveryTime: "30-40 min",
    deliveryFee: 4.5,
    minOrder: 25,
    distance: 1.5,
    image: "/api/placeholder/300/200",
    isOpen: false,
    hasPromotions: true,
    tags: ["mineira", "caseira", "tradicional"]
  }
];

const categories = [
  { value: "all", label: "Todas" },
  { value: "mineira", label: "Mineira" },
  { value: "goiana", label: "Goiana" },
  { value: "italiana", label: "Italiana" },
  { value: "brasileira", label: "Brasileira" },
  { value: "regional", label: "Regional" },
  { value: "lanche", label: "Lanches" },
  { value: "doces", label: "Doces" }
];

const sortOptions = [
  { value: "relevance", label: "Relevância" },
  { value: "rating", label: "Melhor Avaliado" },
  { value: "delivery_time", label: "Tempo de Entrega" },
  { value: "delivery_fee", label: "Taxa de Entrega" },
  { value: "distance", label: "Distância" },
  { value: "min_order", label: "Pedido Mínimo" }
];

export default function AdvancedSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "all",
    priceRange: [0, 100],
    rating: 0,
    deliveryTime: 60,
    deliveryFee: [0, 20],
    location: "",
    radius: 10,
    sortBy: "relevance",
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    acceptsVouchers: false,
    isOpen: false,
    hasPromotions: false
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filteredRestaurants, setFilteredRestaurants] = useState(mockRestaurants);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Filter restaurants based on current filters
  useEffect(() => {
    let filtered = mockRestaurants.filter(restaurant => {
      // Text search
      const matchesQuery = filters.query === "" || 
        restaurant.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(filters.query.toLowerCase()) ||
        restaurant.tags.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()));

      // Category filter
      const matchesCategory = filters.category === "all" || 
        restaurant.cuisine.toLowerCase() === filters.category;

      // Rating filter
      const matchesRating = restaurant.rating >= filters.rating;

      // Price range (using minOrder as proxy)
      const matchesPriceRange = restaurant.minOrder >= filters.priceRange[0] && 
        restaurant.minOrder <= filters.priceRange[1];

      // Delivery fee filter
      const matchesDeliveryFee = restaurant.deliveryFee >= filters.deliveryFee[0] && 
        restaurant.deliveryFee <= filters.deliveryFee[1];

      // Distance filter
      const matchesDistance = restaurant.distance <= filters.radius;

      // Open status
      const matchesOpenStatus = !filters.isOpen || restaurant.isOpen;

      // Promotions
      const matchesPromotions = !filters.hasPromotions || restaurant.hasPromotions;

      // Dietary restrictions
      const matchesVegetarian = !filters.isVegetarian || restaurant.tags.includes("vegetariano");
      const matchesVegan = !filters.isVegan || restaurant.tags.includes("vegano");
      const matchesGlutenFree = !filters.isGlutenFree || restaurant.tags.includes("sem-gluten");

      return matchesQuery && matchesCategory && matchesRating && matchesPriceRange && 
             matchesDeliveryFee && matchesDistance && matchesOpenStatus && 
             matchesPromotions && matchesVegetarian && matchesVegan && matchesGlutenFree;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "delivery_time":
          return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
        case "delivery_fee":
          return a.deliveryFee - b.deliveryFee;
        case "distance":
          return a.distance - b.distance;
        case "min_order":
          return a.minOrder - b.minOrder;
        default:
          return 0;
      }
    });

    setFilteredRestaurants(filtered);
  }, [filters]);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category !== "all") count++;
    if (filters.rating > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) count++;
    if (filters.deliveryFee[0] > 0 || filters.deliveryFee[1] < 20) count++;
    if (filters.radius < 10) count++;
    if (filters.isVegetarian || filters.isVegan || filters.isGlutenFree) count++;
    if (filters.isOpen || filters.hasPromotions || filters.acceptsVouchers) count++;
    
    setActiveFiltersCount(count);
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({
      query: "",
      category: "all",
      priceRange: [0, 100],
      rating: 0,
      deliveryTime: 60,
      deliveryFee: [0, 20],
      location: "",
      radius: 10,
      sortBy: "relevance",
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      acceptsVouchers: false,
      isOpen: false,
      hasPromotions: false
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar restaurantes, pratos ou tipos de culinária..."
                className="pl-10"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filtros Avançados</span>
                </CardTitle>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category */}
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Utensils className="w-4 h-4" />
                    <span>Categoria</span>
                  </Label>
                  <Select value={filters.category} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label>Ordenar Por</Label>
                  <Select value={filters.sortBy} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, sortBy: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location & Radius */}
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Localização</span>
                  </Label>
                  <Input 
                    placeholder="Digite seu endereço"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Raio: {filters.radius}km</Label>
                    <Slider
                      value={[filters.radius]}
                      onValueChange={([value]) => setFilters(prev => ({ ...prev, radius: value }))}
                      max={20}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Pedido Mínimo: R$ {filters.priceRange[0]} - R$ {filters.priceRange[1]}</span>
                  </Label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Delivery Fee */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Truck className="w-4 h-4" />
                    <span>Taxa de Entrega: R$ {filters.deliveryFee[0]} - R$ {filters.deliveryFee[1]}</span>
                  </Label>
                  <Slider
                    value={filters.deliveryFee}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, deliveryFee: value as [number, number] }))}
                    max={20}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <Star className="w-4 h-4" />
                  <span>Avaliação Mínima: {filters.rating > 0 ? `${filters.rating} estrelas` : "Qualquer"}</span>
                </Label>
                <Slider
                  value={[filters.rating]}
                  onValueChange={([value]) => setFilters(prev => ({ ...prev, rating: value }))}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Boolean Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={filters.isOpen}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, isOpen: checked }))}
                  />
                  <Label className="text-sm">Aberto Agora</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={filters.hasPromotions}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPromotions: checked }))}
                  />
                  <Label className="text-sm">Com Promoções</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={filters.isVegetarian}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, isVegetarian: checked }))}
                  />
                  <Label className="text-sm flex items-center space-x-1">
                    <Leaf className="w-3 h-3" />
                    <span>Vegetariano</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={filters.acceptsVouchers}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, acceptsVouchers: checked }))}
                  />
                  <Label className="text-sm">Aceita Vale</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredRestaurants.length} Restaurantes Encontrados
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Atualizado agora</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <Card key={restaurant.id} className="hover:shadow-card transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Restaurant Image */}
                    <div className="w-full h-32 bg-gradient-warm rounded-lg flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-primary-foreground" />
                    </div>

                    {/* Restaurant Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        {!restaurant.isOpen && (
                          <Badge variant="destructive" className="text-xs">Fechado</Badge>
                        )}
                        {restaurant.hasPromotions && (
                          <Badge className="bg-secondary text-secondary-foreground text-xs">Promoção</Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-secondary text-secondary" />
                          <span>{restaurant.rating}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{restaurant.distance}km</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Min. R$ {restaurant.minOrder}
                        </span>
                        <span className="font-medium">
                          Frete R$ {restaurant.deliveryFee.toFixed(2)}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {restaurant.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum restaurante encontrado com os filtros selecionados</p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}