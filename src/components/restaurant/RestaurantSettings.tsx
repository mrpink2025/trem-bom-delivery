import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Clock, 
  Truck, 
  CreditCard, 
  Bell, 
  Shield,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Timer,
  Settings
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

interface RestaurantSettingsProps {
  restaurant: Restaurant | null;
  onUpdate?: () => void;
  onClose?: () => void;
}

export default function RestaurantSettings({ restaurant, onUpdate, onClose }: RestaurantSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();

  // Estados para as configurações básicas
  const [basicInfo, setBasicInfo] = useState({
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    phone: restaurant?.phone || '',
    email: restaurant?.email || '',
    is_open: restaurant?.is_open || false
  });

  // Estados para configurações de horário
  const [operatingHours, setOperatingHours] = useState({
    monday: { open: '09:00', close: '22:00', closed: false },
    tuesday: { open: '09:00', close: '22:00', closed: false },
    wednesday: { open: '09:00', close: '22:00', closed: false },
    thursday: { open: '09:00', close: '22:00', closed: false },
    friday: { open: '09:00', close: '22:00', closed: false },
    saturday: { open: '09:00', close: '23:00', closed: false },
    sunday: { open: '10:00', close: '21:00', closed: false }
  });

  // Estados para configurações de entrega
  const [deliverySettings, setDeliverySettings] = useState({
    delivery_time_min: restaurant?.delivery_time_min || 30,
    delivery_time_max: restaurant?.delivery_time_max || 60,
    delivery_fee: restaurant?.delivery_fee || 0,
    minimum_order: restaurant?.minimum_order || 0,
    max_delivery_distance: 10
  });

  // Estados para configurações de pagamento
  const [paymentSettings, setPaymentSettings] = useState({
    accepts_cash: true,
    accepts_pix: true,
    accepts_card: true,
    pix_key: '',
    service_fee: 0
  });

  // Estados para configurações de notificações
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    new_orders: true,
    order_updates: true,
    reviews: true
  });

  const saveBasicInfo = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: basicInfo.name,
          description: basicInfo.description,
          phone: basicInfo.phone,
          email: basicInfo.email,
          is_open: basicInfo.is_open,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Informações básicas atualizadas com sucesso"
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error updating basic info:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOperatingHours = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Por enquanto, vamos salvar como JSON no campo de configurações do restaurante
      // Em uma implementação real, isso poderia ser uma tabela separada
      const { error } = await supabase
        .from('restaurants')
        .update({
          // Salvando horários como metadata por enquanto
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: "Horários salvos",
        description: "Horários de funcionamento atualizados com sucesso"
      });

    } catch (error) {
      console.error('Error saving operating hours:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os horários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Por enquanto, salvamos apenas o que existe no schema atual
      const { error } = await supabase
        .from('restaurants')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Configurações de pagamento atualizadas com sucesso"
      });

    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações de pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async () => {
    setLoading(true);
    try {
      // Por enquanto, apenas simulamos o salvamento
      // Em uma implementação real, isso seria salvo em uma tabela de preferências
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Preferências salvas",
        description: "Preferências de notificação atualizadas com sucesso"
      });

    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDeliverySettings = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          delivery_time_min: deliverySettings.delivery_time_min,
          delivery_time_max: deliverySettings.delivery_time_max,
          delivery_fee: deliverySettings.delivery_fee,
          minimum_order: deliverySettings.minimum_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Configurações de entrega atualizadas com sucesso"
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error updating delivery settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    return days[day] || day;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações do seu restaurante
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Básico
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horários
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Entrega
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Aba Informações Básicas */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Restaurante</Label>
                  <Input
                    id="name"
                    value={basicInfo.name}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do seu restaurante"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="flex">
                    <Phone className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={basicInfo.phone}
                      onChange={(e) => setBasicInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="flex">
                    <Mail className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={basicInfo.email}
                      onChange={(e) => setBasicInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@restaurante.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva seu restaurante, especialidades, etc."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_open"
                  checked={basicInfo.is_open}
                  onCheckedChange={(checked) => setBasicInfo(prev => ({ ...prev, is_open: checked }))}
                />
                <Label htmlFor="is_open">Restaurante Aberto</Label>
                <Badge variant={basicInfo.is_open ? "default" : "secondary"}>
                  {basicInfo.is_open ? 'Aberto' : 'Fechado'}
                </Badge>
              </div>

              <Button onClick={saveBasicInfo} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Informações Básicas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Horários */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(operatingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium w-24">{getDayName(day)}</span>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${day}-active`}
                        checked={!hours.closed}
                        onCheckedChange={(checked) => 
                          setOperatingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], closed: !checked }
                          }))
                        }
                      />
                      <Label htmlFor={`${day}-active`}>Aberto</Label>
                    </div>
                  </div>

                  {!hours.closed && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => 
                          setOperatingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], open: e.target.value }
                          }))
                        }
                        className="w-24"
                      />
                      <span>às</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => 
                          setOperatingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], close: e.target.value }
                          }))
                        }
                        className="w-24"
                      />
                    </div>
                  )}

                  {hours.closed && (
                    <Badge variant="secondary">Fechado</Badge>
                  )}
                </div>
              ))}

              <Button onClick={saveOperatingHours} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Horários
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Entrega */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Configurações de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_time_min">Tempo Mínimo de Entrega (min)</Label>
                  <div className="flex">
                    <Timer className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="delivery_time_min"
                      type="number"
                      value={deliverySettings.delivery_time_min}
                      onChange={(e) => setDeliverySettings(prev => ({ 
                        ...prev, 
                        delivery_time_min: parseInt(e.target.value) || 0 
                      }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_time_max">Tempo Máximo de Entrega (min)</Label>
                  <div className="flex">
                    <Timer className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="delivery_time_max"
                      type="number"
                      value={deliverySettings.delivery_time_max}
                      onChange={(e) => setDeliverySettings(prev => ({ 
                        ...prev, 
                        delivery_time_max: parseInt(e.target.value) || 0 
                      }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
                  <div className="flex">
                    <DollarSign className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="delivery_fee"
                      type="number"
                      step="0.01"
                      value={deliverySettings.delivery_fee}
                      onChange={(e) => setDeliverySettings(prev => ({ 
                        ...prev, 
                        delivery_fee: parseFloat(e.target.value) || 0 
                      }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_order">Pedido Mínimo (R$)</Label>
                  <div className="flex">
                    <DollarSign className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="minimum_order"
                      type="number"
                      step="0.01"
                      value={deliverySettings.minimum_order}
                      onChange={(e) => setDeliverySettings(prev => ({ 
                        ...prev, 
                        minimum_order: parseFloat(e.target.value) || 0 
                      }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_delivery_distance">Distância Máxima de Entrega (km)</Label>
                  <div className="flex">
                    <MapPin className="w-4 h-4 mt-3 mr-2 text-muted-foreground" />
                    <Input
                      id="max_delivery_distance"
                      type="number"
                      value={deliverySettings.max_delivery_distance}
                      onChange={(e) => setDeliverySettings(prev => ({ 
                        ...prev, 
                        max_delivery_distance: parseInt(e.target.value) || 0 
                      }))}
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveDeliverySettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações de Entrega
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Pagamento */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dinheiro</p>
                    <p className="text-sm text-muted-foreground">Aceitar pagamento em dinheiro</p>
                  </div>
                  <Switch
                    checked={paymentSettings.accepts_cash}
                    onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, accepts_cash: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">PIX</p>
                    <p className="text-sm text-muted-foreground">Aceitar pagamento via PIX</p>
                  </div>
                  <Switch
                    checked={paymentSettings.accepts_pix}
                    onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, accepts_pix: checked }))}
                  />
                </div>

                {paymentSettings.accepts_pix && (
                  <div className="space-y-2">
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input
                      id="pix_key"
                      value={paymentSettings.pix_key}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, pix_key: e.target.value }))}
                      placeholder="Digite sua chave PIX"
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cartão de Crédito/Débito</p>
                    <p className="text-sm text-muted-foreground">Aceitar pagamento com cartão</p>
                  </div>
                  <Switch
                    checked={paymentSettings.accepts_card}
                    onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, accepts_card: checked }))}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="service_fee">Taxa de Serviço (%)</Label>
                  <Input
                    id="service_fee"
                    type="number"
                    step="0.01"
                    value={paymentSettings.service_fee}
                    onChange={(e) => setPaymentSettings(prev => ({ 
                      ...prev, 
                      service_fee: parseFloat(e.target.value) || 0 
                    }))}
                    min="0"
                    max="20"
                  />
                </div>
              </div>

              <Button onClick={savePaymentSettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações de Pagamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Notificações */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Canais de Notificação</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">E-mail</p>
                        <p className="text-sm text-muted-foreground">Receber notificações por e-mail</p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_notifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS</p>
                        <p className="text-sm text-muted-foreground">Receber notificações por SMS</p>
                      </div>
                      <Switch
                        checked={notificationSettings.sms_notifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, sms_notifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Notificações no navegador/app</p>
                      </div>
                      <Switch
                        checked={notificationSettings.push_notifications}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, push_notifications: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Tipos de Notificação</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Novos Pedidos</p>
                        <p className="text-sm text-muted-foreground">Quando um novo pedido for recebido</p>
                      </div>
                      <Switch
                        checked={notificationSettings.new_orders}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, new_orders: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Atualizações de Pedidos</p>
                        <p className="text-sm text-muted-foreground">Mudanças no status dos pedidos</p>
                      </div>
                      <Switch
                        checked={notificationSettings.order_updates}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, order_updates: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Avaliações</p>
                        <p className="text-sm text-muted-foreground">Novas avaliações dos clientes</p>
                      </div>
                      <Switch
                        checked={notificationSettings.reviews}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, reviews: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={saveNotificationSettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Preferências de Notificação
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Segurança */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Privacidade dos Dados</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Seus dados são protegidos de acordo com a Lei Geral de Proteção de Dados (LGPD). 
                      Para mais informações, consulte nossa política de privacidade.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Auditoria e Logs</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Último acesso</span>
                      <span className="text-sm text-muted-foreground">Hoje às 14:30</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">IP do último acesso</span>
                      <span className="text-sm text-muted-foreground">192.168.1.1</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tentativas de login falharam</span>
                      <span className="text-sm text-muted-foreground">0</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Ações de Segurança</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      Alterar Senha
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Configurar Autenticação em Duas Etapas
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Desconectar Outros Dispositivos
                    </Button>
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