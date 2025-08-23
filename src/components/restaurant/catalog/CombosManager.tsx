import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Layers, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MenuItem = {
  id: string;
  name: string;
  price: number;
};

type Combo = {
  id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
};

type ComboItem = {
  id: string;
  combo_id: string;
  item_id: string;
  delta_price: number;
  sort_order: number;
  min_select: number;
  max_select: number;
  item?: MenuItem;
};

export function CombosManager() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    is_available: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userData.user.id)
        .single();

      if (!restaurant) return;

      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('id, name, base_price')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('name');

      setMenuItems((itemsData || []).map(item => ({
        id: item.id,
        name: item.name,
        price: item.base_price
      })));

      // Since menu_combos table doesn't exist yet, use empty arrays for now
      setCombos([]);
      setComboItems([]);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar combos",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userData.user.id)
        .single();

      if (!restaurant) return;

      const comboData = {
        ...formData,
        restaurant_id: restaurant.id,
      };

      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A gestão de combos será implementada em breve.",
      });

      resetForm();
      setIsCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar combo",
        description: error.message,
      });
    }
  };

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price,
      is_available: combo.is_available,
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este combo? Todos os itens relacionados serão removidos.')) return;

    try {
      const { error } = await supabase
        .from('menu_combos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Combo excluído",
        description: "O combo foi excluído com sucesso.",
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir combo",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      is_available: true,
    });
    setEditingCombo(null);
  };

  const getComboItems = (comboId: string) => {
    return comboItems.filter(item => item.combo_id === comboId);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando combos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Combos</h2>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCombo ? 'Editar Combo' : 'Novo Combo'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Combo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Combo Burger + Batata + Refrigerante"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva o que está incluído no combo"
                />
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="price">Preço do Combo (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                     value={formData.price}
                     onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label htmlFor="is_available">Combo Disponível</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCombo ? 'Atualizar' : 'Criar'} Combo
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

      {menuItems.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              Você precisa ter produtos cadastrados antes de criar combos.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Atualizar Página
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {combos.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Nenhum combo encontrado. Crie seu primeiro combo.
              </p>
              <p className="text-sm text-muted-foreground">
                Combos permitem agrupar produtos com preço promocional.
              </p>
            </CardContent>
          </Card>
        ) : (
          combos.map((combo) => {
            const items = getComboItems(combo.id);
            const totalItemsPrice = items.reduce((sum, item) => {
              return sum + ((item.item?.price || 0) + item.delta_price);
            }, 0);
            const discount = totalItemsPrice - combo.price;
            
            return (
              <Card key={combo.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        {combo.name}
                        <Badge variant={combo.is_available ? 'default' : 'secondary'}>
                          {combo.is_available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </CardTitle>
                      {combo.description && (
                        <p className="text-sm text-muted-foreground">
                          {combo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(combo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(combo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Preço do Combo</p>
                      <p className="text-2xl font-bold text-primary">R$ {combo.price.toFixed(2)}</p>
                      {discount > 0 && (
                        <p className="text-sm text-green-600">
                          Economia de R$ {discount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {totalItemsPrice > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Preço individual dos itens</p>
                        <p className="line-through text-muted-foreground">R$ {totalItemsPrice.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Nenhum item adicionado ao combo ainda.</p>
                      <p className="text-sm">Use a seção "Itens do Combo" para adicionar produtos.</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium mb-2">Itens inclusos:</h4>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                            <span>{item.item?.name || 'Item não encontrado'}</span>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                R$ {((item.item?.price || 0) + item.delta_price).toFixed(2)}
                              </span>
                              {item.delta_price !== 0 && (
                                <p className="text-xs text-muted-foreground">
                                  ({item.delta_price > 0 ? '+' : ''}R$ {item.delta_price.toFixed(2)})
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}