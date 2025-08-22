import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings, DollarSign, Shield, Bell, Database, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemSetting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export default function AdminSettingsModule() {
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value, 
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Configuração atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar configuração",
        description: error.message,
      });
    },
  });

  const getSettingValue = (key: string) => {
    if (localSettings[key] !== undefined) {
      return localSettings[key];
    }
    const setting = settings?.find(s => s.key === key);
    return setting?.value;
  };

  const updateLocalSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSetting = (key: string) => {
    if (localSettings[key] !== undefined) {
      updateSettingMutation.mutate({ key, value: localSettings[key] });
      // Remove from local state after saving
      setLocalSettings(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configurações financeiras, taxas e limites de segurança</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">Carregando configurações...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configurações financeiras, taxas e limites de segurança
        </p>
      </div>

      <Tabs defaultValue="financial">
        <TabsList>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Configurações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="take_rate">Taxa da Plataforma (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="take_rate"
                        type="number"
                        step="0.1"
                        value={getSettingValue('take_rate_default')?.percentage || 15}
                        onChange={(e) => updateLocalSetting('take_rate_default', { percentage: parseFloat(e.target.value) })}
                      />
                      <Button onClick={() => saveSetting('take_rate_default')} disabled={localSettings['take_rate_default'] === undefined}>
                        Salvar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Taxa padrão cobrada dos restaurantes</p>
                  </div>

                  <div>
                    <Label htmlFor="service_fee">Taxa de Serviço (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="service_fee"
                        type="number"
                        step="0.1"
                        value={getSettingValue('service_fee')?.percentage || 2}
                        onChange={(e) => updateLocalSetting('service_fee', { percentage: parseFloat(e.target.value) })}
                      />
                      <Button onClick={() => saveSetting('service_fee')} disabled={localSettings['service_fee'] === undefined}>
                        Salvar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Taxa adicional para o consumidor</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delivery_margin">Margem de Delivery (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="delivery_margin"
                        type="number"
                        step="0.1"
                        value={getSettingValue('delivery_margin_target')?.percentage || 8}
                        onChange={(e) => updateLocalSetting('delivery_margin_target', { percentage: parseFloat(e.target.value) })}
                      />
                      <Button onClick={() => saveSetting('delivery_margin_target')} disabled={localSettings['delivery_margin_target'] === undefined}>
                        Salvar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Margem alvo para delivery</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Configurações de Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Métodos de Pagamento Aceitos</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>PIX</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cartão de Crédito</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Cartão de Débito</span>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Dinheiro</span>
                        <Switch checked={false} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Operacionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="max_orders">Máximo de Pedidos por Hora</Label>
                    <div className="flex gap-2">
                      <Input
                        id="max_orders"
                        type="number"
                        value={getSettingValue('max_orders_per_hour')?.value || 100}
                        onChange={(e) => updateLocalSetting('max_orders_per_hour', { value: parseInt(e.target.value) })}
                      />
                      <Button onClick={() => saveSetting('max_orders_per_hour')} disabled={localSettings['max_orders_per_hour'] === undefined}>
                        Salvar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Limite por loja</p>
                  </div>

                  <div>
                    <Label htmlFor="tracking_retention">Retenção de Dados de Tracking (dias)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tracking_retention"
                        type="number"
                        value={getSettingValue('tracking_retention_days')?.value || 30}
                        onChange={(e) => updateLocalSetting('tracking_retention_days', { value: parseInt(e.target.value) })}
                      />
                      <Button onClick={() => saveSetting('tracking_retention_days')} disabled={localSettings['tracking_retention_days'] === undefined}>
                        Salvar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Tempo de armazenamento dos dados de localização</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Configurações de Tempo</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="prep_time">Tempo Médio de Preparo (min)</Label>
                        <Input id="prep_time" type="number" defaultValue={30} />
                      </div>
                      <div>
                        <Label htmlFor="delivery_time">Tempo Médio de Entrega (min)</Label>
                        <Input id="delivery_time" type="number" defaultValue={45} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Configurações de Automação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Auto-aceitar pedidos</span>
                      <p className="text-sm text-muted-foreground">Aceitar automaticamente pedidos de restaurantes verificados</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Limpeza automática de dados</span>
                      <p className="text-sm text-muted-foreground">Executar limpeza de dados antigos automaticamente</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Rate Limiting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api_rate_limit">Limite de API (req/min)</Label>
                    <Input id="api_rate_limit" type="number" defaultValue={1000} />
                  </div>
                  <div>
                    <Label htmlFor="login_attempts">Tentativas de Login Max</Label>
                    <Input id="login_attempts" type="number" defaultValue={5} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Sessões</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="session_timeout">Timeout de Sessão (min)</Label>
                    <Input id="session_timeout" type="number" defaultValue={60} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Forçar 2FA para admins</span>
                      <p className="text-sm text-muted-foreground">Obrigar autenticação de dois fatores para administradores</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Monitoramento</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Log de auditoria</span>
                      <p className="text-sm text-muted-foreground">Registrar todas as ações administrativas</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Detecção de anomalias</span>
                      <p className="text-sm text-muted-foreground">Alertar sobre comportamentos suspeitos</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Notificações Push</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Novos pedidos</span>
                      <p className="text-sm text-muted-foreground">Notificar sobre novos pedidos para restaurants</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Status de entrega</span>
                      <p className="text-sm text-muted-foreground">Atualizar status de entrega para clientes</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Problemas críticos</span>
                      <p className="text-sm text-muted-foreground">Alertar administradores sobre problemas críticos</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Emails</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Relatórios diários</span>
                      <p className="text-sm text-muted-foreground">Enviar relatórios diários para administradores</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Novos cadastros</span>
                      <p className="text-sm text-muted-foreground">Notificar sobre novos cadastros de restaurantes/couriers</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Configurações SMTP</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_host">Servidor SMTP</Label>
                    <Input id="smtp_host" placeholder="smtp.gmail.com" />
                  </div>
                  <div>
                    <Label htmlFor="smtp_port">Porta</Label>
                    <Input id="smtp_port" type="number" placeholder="587" />
                  </div>
                  <div>
                    <Label htmlFor="smtp_user">Usuário</Label>
                    <Input id="smtp_user" type="email" placeholder="email@domain.com" />
                  </div>
                  <div>
                    <Label htmlFor="smtp_from">Email de Envio</Label>
                    <Input id="smtp_from" type="email" placeholder="noreply@domain.com" />
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