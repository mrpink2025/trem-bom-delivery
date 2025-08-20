import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Settings,
  Loader2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisine_type: string;
  phone: string | null;
  email: string | null;
  address: any;
  is_active: boolean;
  is_open: boolean;
  rating: number;
  delivery_time_min: number;
  delivery_time_max: number;
  minimum_order: number;
  delivery_fee: number;
  created_at: string;
  owner_id: string | null;
}

export default function RestaurantManagement() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cuisine_type: "",
    phone: "",
    email: "",
    address: "",
    delivery_time_min: 30,
    delivery_time_max: 60,
    minimum_order: 20,
    delivery_fee: 5,
    is_open: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os restaurantes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async () => {
    try {
      const addressJson = {
        street: formData.address,
        city: "Belo Horizonte",
        state: "MG",
        zipCode: "30000-000"
      };

      const { error } = await supabase
        .from('restaurants')
        .insert([{
          ...formData,
          address: addressJson
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Restaurante cadastrado com sucesso"
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchRestaurants();
    } catch (error) {
      console.error('Error creating restaurant:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o restaurante",
        variant: "destructive"
      });
    }
  };

  const handleEditRestaurant = async () => {
    if (!editingRestaurant) return;

    try {
      const addressJson = {
        street: formData.address,
        city: "Belo Horizonte", 
        state: "MG",
        zipCode: "30000-000"
      };

      const { error } = await supabase
        .from('restaurants')
        .update({
          ...formData,
          address: addressJson
        })
        .eq('id', editingRestaurant.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Restaurante atualizado com sucesso"
      });

      setEditingRestaurant(null);
      resetForm();
      fetchRestaurants();
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o restaurante",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Restaurante excluído com sucesso"
      });

      fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o restaurante",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      cuisine_type: "",
      phone: "",
      email: "",
      address: "",
      delivery_time_min: 30,
      delivery_time_max: 60,
      minimum_order: 20,
      delivery_fee: 5,
      is_open: true
    });
  };

  const openEditDialog = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || "",
      cuisine_type: restaurant.cuisine_type,
      phone: restaurant.phone || "",
      email: restaurant.email || "",
      address: restaurant.address?.street || "",
      delivery_time_min: restaurant.delivery_time_min,
      delivery_time_max: restaurant.delivery_time_max,
      minimum_order: restaurant.minimum_order,
      delivery_fee: restaurant.delivery_fee,
      is_open: restaurant.is_open
    });
    setIsAddDialogOpen(true);
  };
  
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-success text-success-foreground">Ativo</Badge>
    ) : (
      <Badge variant="destructive">Inativo</Badge>
    );
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.cuisine_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || 
                         (selectedStatus === "active" && restaurant.is_active) ||
                         (selectedStatus === "inactive" && !restaurant.is_active);
    const matchesCuisine = selectedCuisine === "all" || restaurant.cuisine_type === selectedCuisine;
    return matchesSearch && matchesStatus && matchesCuisine;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando restaurantes...</span>
      </div>
    );
  }

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
                    <Input 
                      id="name" 
                      placeholder="Nome do restaurante"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      placeholder="(31) 3333-3333"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cuisine">Tipo de Cozinha</Label>
                    <Select value={formData.cuisine_type} onValueChange={(value) => setFormData({...formData, cuisine_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mineira">Mineira</SelectItem>
                        <SelectItem value="Goiana">Goiana</SelectItem>
                        <SelectItem value="Italiana">Italiana</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                        <SelectItem value="Brasileira">Brasileira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input 
                      id="address" 
                      placeholder="Endereço completo"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Descreva o restaurante..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="operational" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTimeMin">Tempo Mínimo (min)</Label>
                    <Input 
                      id="deliveryTimeMin" 
                      type="number" 
                      placeholder="20"
                      value={formData.delivery_time_min}
                      onChange={(e) => setFormData({...formData, delivery_time_min: parseInt(e.target.value) || 20})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTimeMax">Tempo Máximo (min)</Label>
                    <Input 
                      id="deliveryTimeMax" 
                      type="number" 
                      placeholder="45"
                      value={formData.delivery_time_max}
                      onChange={(e) => setFormData({...formData, delivery_time_max: parseInt(e.target.value) || 45})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isOpen" 
                      checked={formData.is_open}
                      onCheckedChange={(checked) => setFormData({...formData, is_open: checked})}
                    />
                    <Label htmlFor="isOpen">Restaurante Aberto</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder">Pedido Mínimo (R$)</Label>
                    <Input 
                      id="minimumOrder" 
                      type="number" 
                      step="0.01" 
                      placeholder="25.00"
                      value={formData.minimum_order}
                      onChange={(e) => setFormData({...formData, minimum_order: parseFloat(e.target.value) || 20})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                    <Input 
                      id="deliveryFee" 
                      type="number" 
                      step="0.01" 
                      placeholder="5.00"
                      value={formData.delivery_fee}
                      onChange={(e) => setFormData({...formData, delivery_fee: parseFloat(e.target.value) || 5})}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setEditingRestaurant(null);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={editingRestaurant ? handleEditRestaurant : handleCreateRestaurant}>
                {editingRestaurant ? 'Atualizar' : 'Cadastrar'} Restaurante
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
                  {restaurants.filter(r => r.is_active).length}
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
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-xl font-bold">
                  {restaurants.filter(r => !r.is_active).length}
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
                  {restaurants.length > 0 ? (restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1) : '0.0'}
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
                <p className="text-sm text-muted-foreground">Taxa Média</p>
                <p className="text-xl font-bold">
                  R$ {restaurants.length > 0 ? (restaurants.reduce((sum, r) => sum + r.delivery_fee, 0) / restaurants.length).toFixed(2) : '0.00'}
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
                      {getStatusBadge(restaurant.is_active)}
                      <Badge variant="outline" className="text-xs">
                        {restaurant.cuisine_type}
                      </Badge>
                      {restaurant.is_open ? (
                        <Badge className="bg-success text-success-foreground text-xs">Aberto</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Fechado</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{restaurant.email || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{restaurant.address?.street || 'Endereço não informado'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Taxa Delivery</p>
                    <p className="font-semibold">R$ {restaurant.delivery_fee.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avaliação</p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-secondary text-secondary" />
                      <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pedido Mínimo</p>
                    <p className="font-semibold">R$ {restaurant.minimum_order.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-semibold">{restaurant.phone || 'N/A'}</p>
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
                      <DropdownMenuItem onClick={() => openEditDialog(restaurant)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ChefHat className="w-4 h-4 mr-2" />
                        Gerenciar Menu
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteRestaurant(restaurant.id)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Excluir
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