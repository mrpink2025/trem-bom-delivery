import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { Search, Filter, Save, Clock, Star, MapPin } from 'lucide-react';

export function AdvancedSearchPanel() {
  const { results, filters, activeFilter, loading, searchHistory, setActiveFilter, saveFilter, searchRestaurants } = useAdvancedSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    cuisineType: [] as string[],
    priceRange: [0, 100] as [number, number],
    rating: 0,
    deliveryTime: 60,
    dietaryRestrictions: [] as string[],
    location: ''
  });

  const cuisineTypes = [
    'Brasileira', 'Pizza', 'Hamburger', 'Japonesa', 'Italiana', 
    'Mexicana', 'Chinesa', 'Árabe', 'Vegetariana', 'Sobremesas'
  ];

  const dietaryOptions = [
    'Vegetariano', 'Vegano', 'Sem Glúten', 'Sem Lactose', 'Low Carb'
  ];

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    searchRestaurants(searchTerm, tempFilters);
  };

  const handleFilterChange = (key: string, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleCuisineType = (cuisine: string) => {
    setTempFilters(prev => ({
      ...prev,
      cuisineType: prev.cuisineType.includes(cuisine)
        ? prev.cuisineType.filter(c => c !== cuisine)
        : [...prev.cuisineType, cuisine]
    }));
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setTempFilters(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const clearFilters = () => {
    setTempFilters({
      cuisineType: [],
      priceRange: [0, 100],
      rating: 0,
      deliveryTime: 60,
      dietaryRestrictions: [],
      location: ''
    });
  };

  const saveCurrentFilter = async () => {
    const name = prompt('Nome para este filtro:');
    if (name) {
      await saveFilter(name, tempFilters);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar restaurantes, pratos, tipos de cozinha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Buscas recentes:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {searchHistory.map((term, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearch(term);
                    }}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros Avançados</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={saveCurrentFilter}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Saved Filters */}
            {filters.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Filtros Salvos</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <Badge
                      key={filter.id}
                      variant={activeFilter?.id === filter.id ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => {
                      setActiveFilter(filter);
                      setTempFilters({
                        cuisineType: filter.filters.cuisineType || [],
                        priceRange: filter.filters.priceRange || [0, 100],
                        rating: filter.filters.rating || 0,
                        deliveryTime: filter.filters.deliveryTime || 60,
                        dietaryRestrictions: filter.filters.dietaryRestrictions || [],
                        location: filter.filters.location || ''
                      });
                      }}
                    >
                      {filter.name}
                      {filter.is_default && " (Padrão)"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Cuisine Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de Cozinha</Label>
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={tempFilters.cuisineType.includes(cuisine) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCuisineType(cuisine)}
                  >
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Pedido Mínimo: R$ {tempFilters.priceRange[0]} - R$ {tempFilters.priceRange[1]}
              </Label>
              <Slider
                value={tempFilters.priceRange}
                onValueChange={(value) => handleFilterChange('priceRange', value as [number, number])}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            {/* Rating */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Avaliação Mínima: {tempFilters.rating} {tempFilters.rating > 0 && '⭐'}
              </Label>
              <Slider
                value={[tempFilters.rating]}
                onValueChange={(value) => handleFilterChange('rating', value[0])}
                max={5}
                step={0.5}
                className="mt-2"
              />
            </div>

            {/* Delivery Time */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Tempo de Entrega Máximo: {tempFilters.deliveryTime} min
              </Label>
              <Slider
                value={[tempFilters.deliveryTime]}
                onValueChange={(value) => handleFilterChange('deliveryTime', value[0])}
                min={15}
                max={120}
                step={15}
                className="mt-2"
              />
            </div>

            {/* Dietary Restrictions */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Restrições Alimentares</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <Badge
                    key={option}
                    variant={tempFilters.dietaryRestrictions.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDietaryRestriction(option)}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite seu bairro ou endereço"
                  value={tempFilters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button className="w-full" onClick={() => handleSearch()}>
              Aplicar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden">
            {restaurant.image_url && (
              <div className="aspect-video relative">
                <img 
                  src={restaurant.image_url} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                {!restaurant.is_open && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Fechado</Badge>
                  </div>
                )}
              </div>
            )}
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg leading-tight">{restaurant.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{restaurant.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {restaurant.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{restaurant.cuisine_type}</Badge>
                  <span className="text-muted-foreground">
                    {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa: R$ {restaurant.delivery_fee.toFixed(2)}</span>
                  <span>Mín: R$ {restaurant.minimum_order.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {results.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar seus filtros ou termo de busca</p>
          </div>
        )}
      </div>
    </div>
  );
}