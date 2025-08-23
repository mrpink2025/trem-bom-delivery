import React, { useState, useEffect } from 'react';
import { Camera, Edit, Check, X, Upload, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourierData {
  id: string;
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  status: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  plate?: string;
  selfie_url?: string;
  created_at: string;
}

interface ProfileSettings {
  notifications: {
    orders: boolean;
    payments: boolean;
    system: boolean;
    sound: boolean;
  };
  privacy: {
    showLocation: boolean;
    shareStats: boolean;
  };
  preferences: {
    darkMode: boolean;
    language: string;
  };
}

export function CourierProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courier, setCourier] = useState<CourierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    notifications: {
      orders: true,
      payments: true,
      system: true,
      sound: true,
    },
    privacy: {
      showLocation: true,
      shareStats: false,
    },
    preferences: {
      darkMode: false,
      language: 'pt-BR',
    },
  });

  useEffect(() => {
    if (user) {
      loadCourierData();
    }
  }, [user]);

  const loadCourierData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setCourier(data);
    } catch (error) {
      console.error('Erro ao carregar dados do entregador:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('courier-photos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('courier-photos')
        .getPublicUrl(fileName);

      // Update courier profile
      const { error: updateError } = await supabase
        .from('couriers')
        .update({ selfie_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setCourier(prev => prev ? { ...prev, selfie_url: urlData.publicUrl } : null);
      
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500';
      case 'UNDER_REVIEW': return 'bg-yellow-500';
      case 'REJECTED': return 'bg-red-500';
      case 'SUSPENDED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Aprovado';
      case 'UNDER_REVIEW': return 'Em Análise';
      case 'REJECTED': return 'Rejeitado';
      case 'SUSPENDED': return 'Suspenso';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com foto de perfil */}
      <Card>
        <CardHeader className="text-center">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src={courier?.selfie_url} />
              <AvatarFallback className="text-lg">
                {courier?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <Label htmlFor="photo-upload">
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full p-0"
                disabled={uploading}
                asChild
              >
                <div>
                  {uploading ? <Upload className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </div>
              </Button>
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          
          <CardTitle className="text-2xl mt-4">
            {courier?.full_name || 'Entregador'}
          </CardTitle>
          
          <div className="flex items-center justify-center gap-2">
            <Badge className={`${getStatusColor(courier?.status || '')} text-white`}>
              {getStatusLabel(courier?.status || '')}
            </Badge>
            <Badge variant="secondary">
              ID: {courier?.id?.slice(-8)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Informações pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações Pessoais</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </Label>
              <Input
                value={courier?.phone || ''}
                disabled={!editing}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Nascimento
              </Label>
              <Input
                type="date"
                value={courier?.birth_date || ''}
                disabled={!editing}
              />
            </div>
          </div>

          {courier?.cpf && (
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={courier.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                disabled
                className="bg-muted"
              />
            </div>
          )}
          
          {editing && (
            <div className="flex gap-2 pt-4">
              <Button size="sm" className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do veículo */}
      {(courier?.vehicle_brand || courier?.vehicle_model || courier?.plate) && (
        <Card>
          <CardHeader>
            <CardTitle>Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courier?.vehicle_brand && (
                <div>
                  <Label>Marca</Label>
                  <div className="text-sm font-medium">{courier.vehicle_brand}</div>
                </div>
              )}
              
              {courier?.vehicle_model && (
                <div>
                  <Label>Modelo</Label>
                  <div className="text-sm font-medium">{courier.vehicle_model}</div>
                </div>
              )}
            </div>
            
            {courier?.plate && (
              <div>
                <Label>Placa</Label>
                <div className="text-sm font-medium font-mono">{courier.plate}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notificações */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Notificações</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Novos pedidos</div>
                  <div className="text-sm text-muted-foreground">Receber ofertas de corrida</div>
                </div>
                <Switch
                  checked={settings.notifications.orders}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, orders: checked }
                    }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Pagamentos</div>
                  <div className="text-sm text-muted-foreground">Confirmações de pagamento</div>
                </div>
                <Switch
                  checked={settings.notifications.payments}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, payments: checked }
                    }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Som das notificações</div>
                  <div className="text-sm text-muted-foreground">Reproduzir sons</div>
                </div>
                <Switch
                  checked={settings.notifications.sound}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, sound: checked }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacidade */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Privacidade</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Compartilhar localização</div>
                  <div className="text-sm text-muted-foreground">Permitir rastreamento em tempo real</div>
                </div>
                <Switch
                  checked={settings.privacy.showLocation}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, showLocation: checked }
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Data de cadastro */}
          <div className="text-center text-sm text-muted-foreground">
            Membro desde {courier?.created_at ? new Date(courier.created_at).toLocaleDateString('pt-BR') : 'N/A'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}