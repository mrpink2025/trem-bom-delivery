import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Truck,
  Phone,
  Mail,
  Edit,
  Eye,
  MoreHorizontal,
  Banknote,
  Activity,
  Calendar,
  Loader2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Courier {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export default function CourierManagement() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'courier')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os entregadores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourier = async () => {
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: "courier123", // Temporary password
        options: {
          data: {
            full_name: formData.full_name,
            role: 'courier'
          }
        }
      });

      if (authError) throw authError;

      // Profile will be created automatically by trigger
      toast({
        title: "Sucesso",
        description: "Entregador cadastrado com sucesso. Senha temporária: courier123"
      });

      setIsAddDialogOpen(false);
      resetForm();
      setTimeout(() => fetchCouriers(), 1000); // Allow time for trigger
    } catch (error) {
      console.error('Error creating courier:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o entregador",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCourier = async (userId: string) => {
    try {
      // This would require admin privileges to delete auth users
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Entregador removido com sucesso"
      });

      fetchCouriers();
    } catch (error) {
      console.error('Error deleting courier:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o entregador",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: ""
    });
  };
  
  const getStatusBadge = (status: string = "offline") => {
    switch (status) {
      case 'online':
        return <Badge className="bg-success text-success-foreground">Online</Badge>;
      case 'busy':
        return <Badge className="bg-warning text-warning-foreground">Ocupado</Badge>;
      case 'offline':
      default:
        return <Badge variant="secondary">Offline</Badge>;
    }
  };

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    // For now, all couriers are considered offline since we don't have status tracking
    const matchesStatus = selectedStatus === "all" || selectedStatus === "offline";
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando entregadores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Entregadores</h2>
          <p className="text-muted-foreground">Gerencie todos os entregadores da plataforma</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Entregador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Entregador</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Nome do entregador"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
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
                  placeholder="(31) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCourier}>
                Cadastrar Entregador
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
            placeholder="Buscar entregadores..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="busy">Ocupado</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
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
              <Activity className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  {couriers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-xl font-bold">
                  {couriers.length}
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
                <p className="text-sm text-muted-foreground">Cadastrados</p>
                <p className="text-xl font-bold">
                  {couriers.filter(c => c.full_name).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Banknote className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Com Telefone</p>
                <p className="text-xl font-bold">
                  {couriers.filter(c => c.phone).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Couriers List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredCouriers.map((courier) => (
              <div key={courier.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={courier.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {courier.full_name?.split(' ').map(n => n[0]).join('') || 'E'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{courier.full_name || 'Entregador'}</h3>
                      {getStatusBadge("offline")}
                      <Badge variant="outline" className="text-xs">
                        Entregador
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>Email não informado</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{courier.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>Região não definida</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Cadastro</p>
                    <p className="font-semibold">{new Date(courier.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">Ativo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-semibold">{courier.phone ? 'Sim' : 'Não'}</p>
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
                      <DropdownMenuItem onClick={() => handleDeleteCourier(courier.user_id)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Remover
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