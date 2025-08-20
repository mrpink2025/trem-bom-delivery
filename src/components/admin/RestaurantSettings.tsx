import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Settings, 
  Store, 
  Clock, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  Upload,
  Bell,
  Shield,
  CreditCard,
  Truck,
  Star,
  Users,
  ChefHat,
  Camera,
  Save,
  AlertTriangle
} from "lucide-react";

export default function RestaurantSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isAutoAcceptEnabled, setIsAutoAcceptEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações do Restaurante</h2>
          <p className="text-muted-foreground">Gerencie as configurações e preferências do seu restaurante</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Cancelar</Button>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="delivery">Entrega</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Store className="w-5 h-5" />
                <span>Informações do Restaurante</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image */}
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    TG
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-2" />
                    Alterar Foto
                  </Button>
                  <p className="text-sm text-muted-foreground">JPG, PNG até 5MB</p>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                  <Input id="restaurantName" defaultValue="Tempero Goiano" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nome do Proprietário</Label>
                  <Input id="ownerName" defaultValue="Sebastião Goiás" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="sebastiao@temperogoiano.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue="(31) 3333-2222" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Tipo de Cozinha</Label>
                  <Select defaultValue="goiana">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mineira">Mineira</SelectItem>
                      <SelectItem value="goiana">Goiana</SelectItem>
                      <SelectItem value="italiana">Italiana</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document">CNPJ</Label>
                  <Input id="document" defaultValue="12.345.678/0001-90" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  defaultValue="Sabores autênticos de Goiás direto para sua mesa. Comida caseira feita com carinho e ingredientes frescos."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <Input id="address" defaultValue="Av. Goiás, 456 - Savassi, Belo Horizonte - MG" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Configurações Operacionais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Operating Hours */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Horário de Funcionamento</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day) => (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-20">
                        <Label className="text-sm">{day}</Label>
                      </div>
                      <Switch defaultChecked={day !== 'Domingo'} />
                      <Input placeholder="08:00" className="w-20" defaultValue={day !== 'Domingo' ? '08:00' : ''} />
                      <span className="text-muted-foreground">às</span>
                      <Input placeholder="22:00" className="w-20" defaultValue={day !== 'Domingo' ? '22:00' : ''} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Delivery Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Tempo de Preparo (min)</Label>
                  <div className="flex space-x-2">
                    <Input id="prepTimeMin" placeholder="Min" defaultValue="25" />
                    <Input id="prepTimeMax" placeholder="Max" defaultValue="40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderLimit">Limite de Pedidos/Hora</Label>
                  <Input id="orderLimit" type="number" defaultValue="20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidade Atual</Label>
                  <Select defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Auto Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Configurações Automáticas</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Aceitar Pedidos Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">Aceita pedidos automaticamente durante horário comercial</p>
                    </div>
                    <Switch checked={isAutoAcceptEnabled} onCheckedChange={setIsAutoAcceptEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pausar Pedidos Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">Pausa pedidos quando atingir limite de capacidade</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Atualizar Status Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">Atualiza status dos pedidos automaticamente</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Configurações Financeiras</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumOrder">Pedido Mínimo (R$)</Label>
                  <Input id="minimumOrder" type="number" step="0.01" defaultValue="30.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                  <Input id="deliveryFee" type="number" step="0.01" defaultValue="5.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceFee">Taxa de Serviço (%)</Label>
                  <Input id="serviceFee" type="number" step="0.01" defaultValue="10.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Comissão da Plataforma (%)</Label>
                  <Input id="commission" type="number" step="0.01" defaultValue="15.00" disabled />
                </div>
              </div>

              <Separator />

              {/* Payment Methods */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Métodos de Pagamento Aceitos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'pix', name: 'PIX', enabled: true },
                    { id: 'credit', name: 'Cartão de Crédito', enabled: true },
                    { id: 'debit', name: 'Cartão de Débito', enabled: true },
                    { id: 'cash', name: 'Dinheiro', enabled: false }
                  ].map((method) => (
                    <div key={method.id} className="flex items-center space-x-2">
                      <Switch defaultChecked={method.enabled} />
                      <Label className="text-sm">{method.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Bank Account */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Conta Bancária</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco</Label>
                    <Select defaultValue="itau">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="itau">Itaú</SelectItem>
                        <SelectItem value="bradesco">Bradesco</SelectItem>
                        <SelectItem value="bb">Banco do Brasil</SelectItem>
                        <SelectItem value="santander">Santander</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input id="agency" defaultValue="1234" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account">Conta</Label>
                    <Input id="account" defaultValue="12345-6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="w-5 h-5" />
                <span>Configurações de Entrega</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delivery Area */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Área de Entrega</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryRadius">Raio de Entrega (km)</Label>
                    <Input id="deliveryRadius" type="number" step="0.1" defaultValue="10.0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDistance">Distância Máxima (km)</Label>
                    <Input id="maxDistance" type="number" step="0.1" defaultValue="15.0" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delivery Zones */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Zonas de Entrega</Label>
                <div className="space-y-3">
                  {[
                    { zone: 'Centro', fee: 5.00, time: '25-35 min' },
                    { zone: 'Savassi', fee: 6.00, time: '30-40 min' },
                    { zone: 'Pampulha', fee: 8.00, time: '40-50 min' }
                  ].map((zone) => (
                    <div key={zone.zone} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{zone.zone}</p>
                        <p className="text-sm text-muted-foreground">{zone.time}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">R$ {zone.fee.toFixed(2)}</Badge>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Delivery Partners */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Entregadores Preferenciais</Label>
                <div className="space-y-3">
                  {[
                    { name: 'João Silva', rating: 4.8, trips: 245 },
                    { name: 'Ana Costa', rating: 4.9, trips: 312 },
                    { name: 'Pedro Santos', rating: 4.6, trips: 189 }
                  ].map((courier) => (
                    <div key={courier.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{courier.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{courier.name}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Star className="w-3 h-3 fill-secondary text-secondary" />
                            <span>{courier.rating}</span>
                            <span>•</span>
                            <span>{courier.trips} entregas</span>
                          </div>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Configurações de Notificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General Notifications */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Notificações Gerais</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Novos Pedidos</Label>
                      <p className="text-sm text-muted-foreground">Receba notificações de novos pedidos</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Cancelamentos</Label>
                      <p className="text-sm text-muted-foreground">Notificações de pedidos cancelados</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Avaliações</Label>
                      <p className="text-sm text-muted-foreground">Novas avaliações dos clientes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Email Notifications */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Notificações por Email</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Relatórios Semanais</Label>
                      <p className="text-sm text-muted-foreground">Resumo semanal de performance</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Promocões e Ofertas</Label>
                      <p className="text-sm text-muted-foreground">Informações sobre promoções da plataforma</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Atualizações do Sistema</Label>
                      <p className="text-sm text-muted-foreground">Novidades e atualizações da plataforma</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SMS Notifications */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Notificações por SMS</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alertas Críticos</Label>
                      <p className="text-sm text-muted-foreground">Problemas urgentes que precisam de atenção</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Verificação de Segurança</Label>
                      <p className="text-sm text-muted-foreground">Códigos de verificação para login</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Configurações de Segurança</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Alterar Senha</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                </div>
                <Button variant="outline">Alterar Senha</Button>
              </div>

              <Separator />

              {/* Two Factor */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Autenticação em Duas Etapas</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p>Autenticação em Duas Etapas</p>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                  <Button variant="outline">Configurar</Button>
                </div>
              </div>

              <Separator />

              {/* Sessions */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Sessões Ativas</Label>
                <div className="space-y-3">
                  {[
                    { device: 'Chrome - Windows', location: 'Belo Horizonte, MG', current: true },
                    { device: 'Safari - iPhone', location: 'Belo Horizonte, MG', current: false },
                    { device: 'Firefox - Linux', location: 'São Paulo, SP', current: false }
                  ].map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.device}</p>
                        <p className="text-sm text-muted-foreground">{session.location}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {session.current && <Badge className="bg-success text-success-foreground">Atual</Badge>}
                        {!session.current && <Button variant="outline" size="sm">Revogar</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <Label className="text-base font-medium text-destructive flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Zona de Perigo</span>
                </Label>
                <div className="p-4 border border-destructive rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Desativar Conta</p>
                      <p className="text-sm text-muted-foreground">Pausar temporariamente sua conta</p>
                    </div>
                    <Button variant="outline">Desativar</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Excluir Conta</p>
                      <p className="text-sm text-muted-foreground">Excluir permanentemente sua conta e dados</p>
                    </div>
                    <Button variant="destructive">Excluir</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}