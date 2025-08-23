import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Package, AlertTriangle, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MenuItem = {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
};

export function StockManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    base_price: 0,
    is_active: true,
    stock_quantity: 0,
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

      // Fetch menu items without stock fields since they don't exist yet
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('id, name, base_price, is_active')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      setItems(itemsData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar estoque",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      base_price: item.base_price,
      is_active: item.is_active,
      stock_quantity: 0, // Default since we don't have stock data yet
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: formData.name,
          base_price: formData.base_price,
          is_active: formData.is_active,
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: "Item atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsEditDialogOpen(false);
      fetchData(); // Refresh the data
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando estoque...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Controle de Estoque</h2>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            Sistema de controle de estoque em desenvolvimento
          </p>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá gerenciar quantidades, receber alertas de estoque baixo e controlar a disponibilidade automática dos produtos.
          </p>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>R$ {item.base_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Alterar Estoque
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Editar Item</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Nome do Produto</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price">Preço (R$)</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={formData.base_price}
                                onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stock">Quantidade em Estoque</Label>
                              <Input
                                id="stock"
                                type="number"
                                value={formData.stock_quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                              />
                              <Label htmlFor="active">Produto Ativo</Label>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                              Salvar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}