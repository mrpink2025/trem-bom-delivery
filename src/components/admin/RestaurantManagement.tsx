import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Clock, 
  Star, 
  Store,
  Phone,
  Mail,
  Edit,
  Eye,
  MoreHorizontal,
  DollarSign,
  Users,
  TrendingUp,
  ChefHat,
  Settings
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockRestaurants = [
  {
    id: "REST-001",
    name: "Dona Maria Cozinha Mineira",
    owner: "Maria Oliveira",
    email: "maria@donamaria.com",
    phone: "(31) 3333-1111",
    cuisine: "Mineira",
    status: "active",
    rating: 4.8,
    totalOrders: 1245,
    monthlyRevenue: 18750.50,
    avgOrderValue: 45.20,
    deliveryTime: "30-45 min",
    isOpen: true,
    address: "Rua das Flores, 123 - Centro",
    description: "Comida mineira tradicional com ingredientes frescos",
    minimumOrder: 25.00,
    deliveryFee: 4.50,
    joinDate: "2023-08-15",
    menuItems: 78,
    activePromotions: 3
  },
  {
    id: "REST-002", 
    name: "Tempero Goiano",
    owner: "Sebastião Goiás",
    email: "sebastiao@temperogoiano.com",
    phone: "(31) 3333-2222",
    cuisine: "Goiana",
    status: "active",
    rating: 4.7,
    totalOrders: 2103,
    monthlyRevenue: 24680.80,
    avgOrderValue: 52.30,
    deliveryTime: "25-40 min",
    isOpen: true,
    address: "Av. Goiás, 456 - Savassi",
    description: "Sabores autênticos de Goiás direto para sua mesa",
    minimumOrder: 30.00,
    deliveryFee: 5.00,
    joinDate: "2023-05-10",
    menuItems: 65,
    activePromotions: 2
  },
  {
    id: "REST-003",
    name: "Pizzaria Trem Bom",
    owner: "Giuseppe Romano",
    email: "giuseppe@pizzariatrembom.com",
    phone: "(31) 3333-3333",
    cuisine: "Italiana",
    status: "active", 
    rating: 4.6,
    totalOrders: 1876,
    monthlyRevenue: 31240.60,
    avgOrderValue: 58.90,
    deliveryTime: "40-60 min",
    isOpen: false,
    address: "Rua Itália, 789 - Pampulha",
    description: "Pizzas artesanais com massa especial e ingredientes importados",
    minimumOrder: 35.00,
    deliveryFee: 6.00,
    joinDate: "2023-03-22",
    menuItems: 42,
    activePromotions: 1
  },
  {
    id: "REST-004",
    name: "Pamonharia Central",
    owner: "Antônio Silva",
    email: "antonio@pamonhariacentral.com",
    phone: "(31) 3333-4444",
    cuisine: "Regional",
    status: "pending",
    rating: 4.9,
    totalOrders: 567,
    monthlyRevenue: 8965.40,
    avgOrderValue: 28.70,
    deliveryTime: "20-35 min",
    isOpen: true,
    address: "Rua Central, 321 - Centro",
    description: "Pamonhas tradicionais e doces regionais",
    minimumOrder: 20.00, 
    deliveryFee: 3.50,
    joinDate: "2024-01-08",
    menuItems: 32,
    activePromotions: 0
  }
];

export default function RestaurantManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredRestaurants = mockRestaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || restaurant.status === selectedStatus;
    const matchesCuisine = selectedCuisine === "all" || restaurant.cuisine === selectedCuisine;
    return matchesSearch && matchesStatus && matchesCuisine;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Restaurantes</h2>
          <p className="text-muted-foreground">Gerencie todos os restaurantes parceiros</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Restaurante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Restaurante</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="operational">Operacional</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Restaurante</Label>
                    <Input id="name" placeholder="Nome do restaurante" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner">Proprietário</Label>
                    <Input id="owner" placeholder="Nome do proprietário" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="(31) 3333-3333" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cuisine">Tipo de Cozinha</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mineira">Mineira</SelectItem>
                        <SelectItem value="goiana">Goiana</SelectItem>
                        <SelectItem value="italiana">Italiana</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="brasileira">Brasileira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input id="address" placeholder="Endereço completo" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" placeholder="Descreva o restaurante..." />
                </div>
              </TabsContent>
              
              <TabsContent value="operational" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTimeMin">Tempo Mínimo (min)</Label>
                    <Input id="deliveryTimeMin" type="number" placeholder="20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTimeMax">Tempo Máximo (min)</Label>
                    <Input id="deliveryTimeMax" type="number" placeholder="45" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="isOpen" />
                    <Label htmlFor="isOpen">Restaurante Aberto</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder">Pedido Mínimo (R$)</Label>
                    <Input id="minimumOrder" type="number" step="0.01" placeholder="25.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                    <Input id="deliveryFee" type="number" step="0.01" placeholder="5.00" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Cadastrar Restaurante
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar restaurantes..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cozinha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Mineira">Mineira</SelectItem>
            <SelectItem value="Goiana">Goiana</SelectItem>
            <SelectItem value="Italiana">Italiana</SelectItem>
            <SelectItem value="Regional">Regional</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-xl font-bold">
                  {mockRestaurants.filter(r => r.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold">
                  {mockRestaurants.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-xl font-bold">
                  {(mockRestaurants.reduce((sum, r) => sum + r.rating, 0) / mockRestaurants.length).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Receita Média</p>
                <p className="text-xl font-bold">
                  R$ {(mockRestaurants.reduce((sum, r) => sum + r.monthlyRevenue, 0) / mockRestaurants.length / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurants List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-warm rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary-foreground" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      {getStatusBadge(restaurant.status)}
                      <Badge variant="outline" className="text-xs">
                        {restaurant.cuisine}
                      </Badge>
                      {restaurant.isOpen ? (
                        <Badge className="bg-success text-success-foreground text-xs">Aberto</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Fechado</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{restaurant.owner}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{restaurant.address}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="font-semibold">{restaurant.totalOrders}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avaliação</p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-secondary text-secondary" />
                      <span className="font-semibold">{restaurant.rating}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="font-semibold">R$ {restaurant.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Receita Mensal</p>
                    <p className="font-semibold">R$ {restaurant.monthlyRevenue.toLocaleString('pt-BR')}</p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ChefHat className="w-4 h-4 mr-2" />
                        Gerenciar Menu
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}