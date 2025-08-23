import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DeliveryZone = {
  id: string;
  name: string;
  base_fee: number;
  per_km_rate: number;
  min_time_minutes: number;
  max_time_minutes: number;
  max_distance_km: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function DeliveryZonesManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    base_fee: 0,
    per_km_rate: 0,
    min_time_minutes: 30,
    max_time_minutes: 60,
    max_distance_km: 10,
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar zonas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const zoneData = {
        name: formData.name,
        base_fee: formData.base_fee,
        per_km_rate: formData.per_km_rate,
        min_time_minutes: formData.min_time_minutes,
        max_time_minutes: formData.max_time_minutes,
        max_distance_km: formData.max_distance_km,
        is_active: formData.is_active,
        polygon: JSON.stringify({}), // Empty polygon for now
      };

      if (editingZone) {
        const { error } = await supabase
          .from('delivery_zones')
          .update(zoneData)
          .eq('id', editingZone.id);
        
        if (error) throw error;
        
        toast({
          title: "Zona atualizada",
          description: "A zona de entrega foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert([zoneData]);
        
        if (error) throw error;
        
        toast({
          title: "Zona criada",
          description: "A zona de entrega foi criada com sucesso.",
        });
      }

      resetForm();
      setIsCreateOpen(false);
      fetchZones();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar zona",
        description: error.message,
      });
    }
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      base_fee: zone.base_fee,
      per_km_rate: zone.per_km_rate,
      min_time_minutes: zone.min_time_minutes,
      max_time_minutes: zone.max_time_minutes,
      max_distance_km: zone.max_distance_km,
      is_active: zone.is_active,
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta zona de entrega?')) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Zona excluída",
        description: "A zona de entrega foi excluída com sucesso.",
      });
      
      fetchZones();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir zona",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      base_fee: 0,
      per_km_rate: 0,
      min_time_minutes: 30,
      max_time_minutes: 60,
      max_distance_km: 10,
      is_active: true,
    });
    setEditingZone(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando zonas de entrega...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Zonas de Entrega</h2>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Zona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Editar Zona' : 'Nova Zona de Entrega'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Zona *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Centro, Zona Norte"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_fee">Taxa Base (R$)</Label>
                  <Input
                    id="base_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_fee}
                    onChange={(e) => setFormData({ ...formData, base_fee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="per_km_rate">Por Km (R$)</Label>
                  <Input
                    id="per_km_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.per_km_rate}
                    onChange={(e) => setFormData({ ...formData, per_km_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_distance_km">Distância Máxima (km)</Label>
                <Input
                  id="max_distance_km"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.max_distance_km}
                  onChange={(e) => setFormData({ ...formData, max_distance_km: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_time">Tempo Min (min)</Label>
                  <Input
                    id="min_time"
                    type="number"
                    min="0"
                    value={formData.min_time_minutes}
                    onChange={(e) => setFormData({ ...formData, min_time_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_time">Tempo Max (min)</Label>
                  <Input
                    id="max_time"
                    type="number"
                    min="0"
                    value={formData.max_time_minutes}
                    onChange={(e) => setFormData({ ...formData, max_time_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Zona Ativa</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingZone ? 'Atualizar' : 'Criar'} Zona
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Taxa Base</TableHead>
                <TableHead>Por Km</TableHead>
                <TableHead>Distância Máx</TableHead>
                <TableHead>Tempo Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma zona encontrada. Crie sua primeira zona de entrega.
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>R$ {zone.base_fee.toFixed(2)}</TableCell>
                    <TableCell>R$ {zone.per_km_rate.toFixed(2)}/km</TableCell>
                    <TableCell>{zone.max_distance_km} km</TableCell>
                    <TableCell>{zone.min_time_minutes} - {zone.max_time_minutes} min</TableCell>
                    <TableCell>
                      <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                        {zone.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(zone)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(zone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}