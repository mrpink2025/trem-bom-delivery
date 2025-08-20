import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  Download,
  Calendar
} from "lucide-react";

// Mock data for charts
const revenueData = [
  { month: 'Jan', receita: 45000, pedidos: 1200, usuarios: 350 },
  { month: 'Fev', receita: 52000, pedidos: 1450, usuarios: 420 },
  { month: 'Mar', receita: 48000, pedidos: 1300, usuarios: 380 },
  { month: 'Abr', receita: 61000, pedidos: 1680, usuarios: 510 },
  { month: 'Mai', receita: 58000, pedidos: 1590, usuarios: 475 },
  { month: 'Jun', receita: 67000, pedidos: 1820, usuarios: 580 },
  { month: 'Jul', receita: 72000, pedidos: 1950, usuarios: 620 },
  { month: 'Ago', receita: 69000, pedidos: 1870, usuarios: 595 },
  { month: 'Set', receita: 75000, pedidos: 2050, usuarios: 650 },
  { month: 'Out', receita: 78000, pedidos: 2150, usuarios: 685 },
  { month: 'Nov', receita: 82000, pedidos: 2280, usuarios: 720 },
  { month: 'Dez', receita: 89000, pedidos: 2450, usuarios: 780 }
];

const orderStatusData = [
  { name: 'Entregues', value: 1850, color: 'hsl(var(--success))' },
  { name: 'Em Preparo', value: 245, color: 'hsl(var(--warning))' },
  { name: 'Em Trânsito', value: 156, color: 'hsl(var(--sky))' },
  { name: 'Cancelados', value: 89, color: 'hsl(var(--destructive))' }
];

const popularItemsData = [
  { item: 'Pão de Açúcar', vendas: 245 },
  { item: 'Feijão Tropeiro', vendas: 198 },
  { item: 'Pizza Margherita', vendas: 167 },
  { item: 'Pamonha Doce', vendas: 143 },
  { item: 'Frango com Quiabo', vendas: 128 },
  { item: 'Pastel de Queijo', vendas: 115 }
];

const deliveryTimeData = [
  { time: '0-15 min', count: 245 },
  { time: '15-30 min', count: 456 },
  { time: '30-45 min', count: 678 },
  { time: '45-60 min', count: 234 },
  { time: '60+ min', count: 87 }
];

const regionData = [
  { regiao: 'Centro', pedidos: 450, receita: 23400 },
  { regiao: 'Savassi', pedidos: 380, receita: 21800 },
  { regiao: 'Pampulha', pedidos: 320, receita: 18600 },
  { regiao: 'Barreiro', pedidos: 280, receita: 15200 },
  { regiao: 'Norte', pedidos: 240, receita: 12800 },
  { regiao: 'Outros', pedios: 180, receita: 9600 }
];

export default function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Avançados</h2>
          <p className="text-muted-foreground">Análises detalhadas de performance e métricas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select defaultValue="30">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">R$ 89.2K</p>
                      <div className="flex items-center text-success text-sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12.5%
                      </div>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Pedidos</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">2,450</p>
                      <div className="flex items-center text-success text-sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +8.2%
                      </div>
                    </div>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Novos Usuários</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">780</p>
                      <div className="flex items-center text-success text-sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +15.3%
                      </div>
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold">32 min</p>
                      <div className="flex items-center text-destructive text-sm">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        +2.1 min
                      </div>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Itens Mais Populares</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={popularItemsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="item" stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deliveryTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pedidos" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Pedidos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="usuarios" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={3}
                    name="Novos Usuários"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Região</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="regiao" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="pedidos" fill="hsl(var(--primary))" name="Pedidos" />
                  <Bar dataKey="receita" fill="hsl(var(--secondary))" name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Visitantes → Pedidos</span>
                    <span className="font-bold">12.4%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '12.4%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Carrinho → Checkout</span>
                    <span className="font-bold">68.7%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: '68.7%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Checkout → Pagamento</span>
                    <span className="font-bold">89.2%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-success h-2 rounded-full" style={{ width: '89.2%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Satisfação do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">4.7</div>
                    <div className="text-sm text-muted-foreground">Avaliação média</div>
                  </div>
                  
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center space-x-2">
                        <span className="text-sm w-3">{stars}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full" 
                            style={{ width: `${stars === 5 ? 65 : stars === 4 ? 25 : stars === 3 ? 8 : stars === 2 ? 2 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-8">
                          {stars === 5 ? '65%' : stars === 4 ? '25%' : stars === 3 ? '8%' : stars === 2 ? '2%' : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}