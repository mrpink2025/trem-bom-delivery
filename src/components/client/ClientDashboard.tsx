import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Utensils, Pizza, Coffee, IceCream } from "lucide-react";
import RestaurantCard from "./RestaurantCard";

const mockRestaurants = [
  {
    id: "1",
    name: "Dona Maria Cozinha Mineira",
    cuisine: "Comida Mineira",
    rating: 4.8,
    deliveryTime: "25-35 min",
    deliveryFee: 0,
    image: "/placeholder.svg",
    discount: "20% OFF",
    isOpen: true
  },
  {
    id: "2", 
    name: "Tempero Goiano",
    cuisine: "Culinária Goiana",
    rating: 4.7,
    deliveryTime: "20-30 min",
    deliveryFee: 3.50,
    image: "/placeholder.svg",
    discount: "15% OFF",
    isOpen: true
  },
  {
    id: "3",
    name: "Pizzaria Trem Bom",
    cuisine: "Pizzas & Massas",
    rating: 4.6,
    deliveryTime: "30-45 min",
    deliveryFee: 4.99,
    image: "/placeholder.svg",
    isOpen: true
  },
  {
    id: "4",
    name: "Burguer da Roça",
    cuisine: "Hamburguers",
    rating: 4.7,
    deliveryTime: "20-30 min", 
    deliveryFee: 3.50,
    image: "/placeholder.svg",
    discount: "R$ 5 OFF",
    isOpen: false
  },
  {
    id: "5",
    name: "Pastelaria do Zé",
    cuisine: "Pastéis & Salgados",
    rating: 4.5,
    deliveryTime: "15-25 min",
    deliveryFee: 2.99,
    image: "/placeholder.svg",
    isOpen: true
  },
  {
    id: "6",
    name: "Pamonharia Central",
    cuisine: "Comida Goiana",
    rating: 4.9,
    deliveryTime: "35-45 min",
    deliveryFee: 0,
    image: "/placeholder.svg",
    discount: "Frete Grátis",
    isOpen: true
  }
];

const categories = [
  { id: "all", name: "Todos", icon: Utensils },
  { id: "mineira", name: "Mineira", icon: Utensils },
  { id: "goiana", name: "Goiana", icon: Utensils },
  { id: "pizza", name: "Pizza", icon: Pizza },
  { id: "cafe", name: "Café", icon: Coffee },
  { id: "doces", name: "Doces", icon: IceCream }
];

export default function ClientDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Olá! O que você quer comer hoje?
          </h1>
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Entregando em: Goiânia, GO</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex space-x-3 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar restaurantes, pratos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Categories */}
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className="flex-shrink-0 space-x-2"
              onClick={() => setSelectedCategory(category.id)}
            >
              <category.icon className="w-4 h-4" />
              <span>{category.name}</span>
            </Button>
          ))}
        </div>

        {/* Promotions Banner */}
        <Card className="bg-gradient-warm text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Promoções Especiais</h2>
                <p className="text-primary-foreground/90">
                  Conectando o sabor de Minas e Goiás • Frete grátis acima de R$ 30
                </p>
              </div>
              <Badge className="bg-secondary text-secondary-foreground text-lg px-4 py-2">
                FRETE GRÁTIS
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Restaurants Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Restaurantes perto de você
            </h2>
            <span className="text-sm text-muted-foreground">
              {mockRestaurants.length} restaurantes encontrados
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockRestaurants.map((restaurant, index) => (
              <div key={restaurant.id} style={{ animationDelay: `${index * 0.1}s` }}>
                <RestaurantCard {...restaurant} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Pedir novamente</span>
              <Badge variant="secondary">3</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockRestaurants.slice(0, 3).map((restaurant) => (
                <div key={`recent-${restaurant.id}`} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <img 
                    src={restaurant.image} 
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{restaurant.name}</p>
                    <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Pedir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}