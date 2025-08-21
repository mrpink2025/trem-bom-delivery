import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  DollarSign, 
  CreditCard, 
  Truck, 
  Bell, 
  Clock,
  Save,
  RefreshCw,
  Shield,
  Globe,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  category: string;
  is_active: boolean;
}

export default function PlatformSettings() {
  const [activeTab, setActiveTab] = useState("financial");
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form states for different categories
  const [financialSettings, setFinancialSettings] = useState({
    commission_rate: 15.0,
    min_commission: 2.0,
    credit_card_fee: 3.29,
    debit_card_fee: 1.99,
    pix_fee: 0.99
  });

  const [deliverySettings, setDeliverySettings] = useState({
    max_distance: 15,
    base_fee: 5.0,
    per_km_rate: 1.5,
    free_delivery_threshold: 50.0
  });

  const [orderSettings, setOrderSettings] = useState({
    max_items: 50,
    max_value: 500.0,
    min_value: 10.0,
    auto_accept_time: 5
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    order_notifications: true,
    payment_notifications: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setSettings(data || []);
      
      // Parse settings into form states
      data?.forEach((setting) => {
        const value = setting.setting_value as any;
        switch (setting.setting_key) {
          case 'default_commission_rate':
            setFinancialSettings(prev => ({
              ...prev,
              commission_rate: value?.percentage || 15.0,
              min_commission: value?.min_amount || 2.0
            }));
            break;
          case 'payment_fees':
            setFinancialSettings(prev => ({
              ...prev,
              credit_card_fee: value?.credit_card || 3.29,
              debit_card_fee: value?.debit_card || 1.99,
              pix_fee: value?.pix || 0.99
            }));
            break;
          case 'delivery_settings':
            setDeliverySettings(prev => ({
              ...prev,
              max_distance: value?.max_distance_km || 15,
              base_fee: value?.base_fee || 5.0,
              per_km_rate: value?.per_km_rate || 1.5
            }));
            break;
          case 'order_limits':
            setOrderSettings(prev => ({
              ...prev,
              max_items: value?.max_items_per_order || 50,
              max_value: value?.max_order_value || 500.0,
              min_value: value?.min_order_value || 10.0
            }));
            break;
          case 'notification_settings':
            setNotificationSettings(prev => ({
              ...prev,
              email_enabled: value?.email_enabled || true,
              sms_enabled: value?.sms_enabled || false,
              push_enabled: value?.push_enabled || true
            }));
            break;
        }
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, category: string) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: value,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) throw error;
    } catch (error: any) {
      console.error(`Error updating ${key}:`, error);
      throw error;
    }
  };

  const saveFinancialSettings = async () => {
    try {
      setSaving(true);

      await Promise.all([
        updateSetting('default_commission_rate', {
          percentage: financialSettings.commission_rate,
          min_amount: financialSettings.min_commission
        }, 'financial'),
        updateSetting('payment_fees', {
          credit_card: financialSettings.credit_card_fee,
          debit_card: financialSettings.debit_card_fee,
          pix: financialSettings.pix_fee
        }, 'financial')
      ]);

      toast({
        title: "Configurações salvas",
        description: "Configurações financeiras atualizadas com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDeliverySettings = async () => {
    try {
      setSaving(true);

      await updateSetting('delivery_settings', {
        max_distance_km: deliverySettings.max_distance,
        base_fee: deliverySettings.base_fee,
        per_km_rate: deliverySettings.per_km_rate
      }, 'delivery');

      toast({
        title: "Configurações salvas",
        description: "Configurações de entrega atualizadas com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveOrderSettings = async () => {
    try {
      setSaving(true);

      await updateSetting('order_limits', {
        max_items_per_order: orderSettings.max_items,
        max_order_value: orderSettings.max_value,
        min_order_value: orderSettings.min_value
      }, 'orders');

      toast({
        title: "Configurações salvas",
        description: "Configurações de pedidos atualizadas com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSaving(true);

      await updateSetting('notification_settings', {
        email_enabled: notificationSettings.email_enabled,
        sms_enabled: notificationSettings.sms_enabled,
        push_enabled: notificationSettings.push_enabled
      }, 'notifications');

      toast({
        title: "Configurações salvas",
        description: "Configurações de notificações atualizadas com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações da Plataforma</h2>
          <p className="text-muted-foreground">
            Configure as regras globais e padrões do Trem Bão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Configurações Globais
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Entrega
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Financial Settings */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configurações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Comissões Padrão</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="commission">Taxa de Comissão (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        step="0.01"
                        value={financialSettings.commission_rate}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          commission_rate: parseFloat(e.target.value)
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Taxa padrão cobrada dos restaurantes por pedido
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minCommission">Comissão Mínima (R$)</Label>
                      <Input
                        id="minCommission"
                        type="number"
                        step="0.01"
                        value={financialSettings.min_commission}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          min_commission: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Taxas de Pagamento</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="creditFee">Cartão de Crédito (%)</Label>
                      <Input
                        id="creditFee"
                        type="number"
                        step="0.01"
                        value={financialSettings.credit_card_fee}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          credit_card_fee: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debitFee">Cartão de Débito (%)</Label>
                      <Input
                        id="debitFee"
                        type="number"
                        step="0.01"
                        value={financialSettings.debit_card_fee}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          debit_card_fee: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixFee">PIX (%)</Label>
                      <Input
                        id="pixFee"
                        type="number"
                        step="0.01"
                        value={financialSettings.pix_fee}
                        onChange={(e) => setFinancialSettings(prev => ({
                          ...prev,
                          pix_fee: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveFinancialSettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações Financeiras
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 w-5" />
                Configurações de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="maxDistance">Distância Máxima (km)</Label>
                  <Input
                    id="maxDistance"
                    type="number"
                    step="0.1"
                    value={deliverySettings.max_distance}
                    onChange={(e) => setDeliverySettings(prev => ({
                      ...prev,
                      max_distance: parseFloat(e.target.value)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Distância máxima para entrega na plataforma
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="baseFee">Taxa Base (R$)</Label>
                  <Input
                    id="baseFee"
                    type="number"
                    step="0.01"
                    value={deliverySettings.base_fee}
                    onChange={(e) => setDeliverySettings(prev => ({
                      ...prev,
                      base_fee: parseFloat(e.target.value)
                    }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="perKmRate">Taxa por KM (R$)</Label>
                  <Input
                    id="perKmRate"
                    type="number"
                    step="0.01"
                    value={deliverySettings.per_km_rate}
                    onChange={(e) => setDeliverySettings(prev => ({
                      ...prev,
                      per_km_rate: parseFloat(e.target.value)
                    }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveDeliverySettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações de Entrega
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Settings */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 w-5" />
                Configurações de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="maxItems">Máximo de Itens por Pedido</Label>
                  <Input
                    id="maxItems"
                    type="number"
                    value={orderSettings.max_items}
                    onChange={(e) => setOrderSettings(prev => ({
                      ...prev,
                      max_items: parseInt(e.target.value)
                    }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="maxValue">Valor Máximo do Pedido (R$)</Label>
                  <Input
                    id="maxValue"
                    type="number"
                    step="0.01"
                    value={orderSettings.max_value}
                    onChange={(e) => setOrderSettings(prev => ({
                      ...prev,
                      max_value: parseFloat(e.target.value)
                    }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="minValue">Valor Mínimo do Pedido (R$)</Label>
                  <Input
                    id="minValue"
                    type="number"
                    step="0.01"
                    value={orderSettings.min_value}
                    onChange={(e) => setOrderSettings(prev => ({
                      ...prev,
                      min_value: parseFloat(e.target.value)
                    }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveOrderSettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações de Pedidos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 w-5" />
                Configurações de Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações via email para usuários
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      email_enabled: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notificações por SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações via SMS (taxas aplicáveis)
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.sms_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      sms_enabled: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações push para apps móveis
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.push_enabled}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      push_enabled: checked
                    }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveNotificationSettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações de Notificações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}