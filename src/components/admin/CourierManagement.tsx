import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockCouriers = [
  {
    id: "COU-001",
    name: "João Silva",
    email: "joao@email.com",
    phone: "(31) 99999-1111",
    avatar: "",
    status: "online",
    rating: 4.8,
    totalDeliveries: 245,
    completionRate: 98.5,
    avgTime: "25 min",
    todayEarnings: 156.50,
    monthlyEarnings: 3420.80,
    vehicle: "Moto",
    region: "Centro",
    joinDate: "2024-01-15",
    currentLocation: { lat: -19.9208, lng: -43.9378 }
  },
  {
    id: "COU-002", 
    name: "Ana Costa",
    email: "ana@email.com",
    phone: "(31) 98888-2222",
    avatar: "",
    status: "busy",
    rating: 4.9,
    totalDeliveries: 312,
    completionRate: 99.2,
    avgTime: "22 min",
    todayEarnings: 203.40,
    monthlyEarnings: 4150.60,
    vehicle: "Bicicleta",
    region: "Savassi",
    joinDate: "2023-11-08",
    currentLocation: { lat: -19.9365, lng: -43.9352 }
  },
  {
    id: "COU-003",
    name: "Pedro Santos",
    email: "pedro@email.com", 
    phone: "(31) 97777-3333",
    avatar: "",
    status: "offline",
    rating: 4.6,
    totalDeliveries: 189,
    completionRate: 96.8,
    avgTime: "28 min",
    todayEarnings: 89.20,
    monthlyEarnings: 2890.40,
    vehicle: "Carro",
    region: "Pampulha",
    joinDate: "2024-03-22",
    currentLocation: { lat: -19.8744, lng: -43.9653 }
  }
];

export default function CourierManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-success text-success-foreground">Online</Badge>;
      case 'busy':
        return <Badge className="bg-warning text-warning-foreground">Ocupado</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredCouriers = mockCouriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         courier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || courier.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

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
                <Input id="name" placeholder="Nome do entregador" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" placeholder="(31) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Veículo</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Região</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="savassi">Savassi</SelectItem>
                    <SelectItem value="pampulha">Pampulha</SelectItem>
                    <SelectItem value="barreiro">Barreiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
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
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-xl font-bold">
                  {mockCouriers.filter(c => c.status === 'online').length}
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
                <p className="text-sm text-muted-foreground">Ocupados</p>
                <p className="text-xl font-bold">
                  {mockCouriers.filter(c => c.status === 'busy').length}
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
                  {(mockCouriers.reduce((sum, c) => sum + c.rating, 0) / mockCouriers.length).toFixed(1)}
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
                <p className="text-sm text-muted-foreground">Faturamento Médio</p>
                <p className="text-xl font-bold">
                  R$ {(mockCouriers.reduce((sum, c) => sum + c.monthlyEarnings, 0) / mockCouriers.length).toFixed(0)}
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
                    <AvatarImage src={courier.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {courier.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{courier.name}</h3>
                      {getStatusBadge(courier.status)}
                      <Badge variant="outline" className="text-xs">
                        {courier.vehicle}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{courier.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{courier.phone}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{courier.region}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Entregas</p>
                    <p className="font-semibold">{courier.totalDeliveries}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avaliação</p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-secondary text-secondary" />
                      <span className="font-semibold">{courier.rating}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Hoje</p>
                    <p className="font-semibold">R$ {courier.todayEarnings.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Mensal</p>
                    <p className="font-semibold">R$ {courier.monthlyEarnings.toLocaleString('pt-BR')}</p>
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
                        <MapPin className="w-4 h-4 mr-2" />
                        Localizar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="w-4 h-4 mr-2" />
                        Histórico
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