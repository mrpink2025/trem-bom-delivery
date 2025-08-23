import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MenuItem = {
  id: string;
  name: string;
  base_price: number;
  stock_quantity?: number;
  min_stock_level?: number;
  is_active: boolean;
};

export function StockManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateValues, setUpdateValues] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userData.user.id)
        .single();

      if (!restaurant) return;

      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, base_price, stock_quantity, min_stock_level, is_active')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
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

  const handleStockUpdate = async (itemId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock_quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Estoque atualizado",
        description: "A quantidade em estoque foi atualizada com sucesso.",
      });

      fetchMenuItems();
      setUpdateValues(prev => {
        const newValues = { ...prev };
        delete newValues[itemId];
        return newValues;
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar estoque",
        description: error.message,
      });
    }
  };

  const getStockStatus = (item: MenuItem) => {
    const currentStock = item.stock_quantity || 0;
    const minLevel = item.min_stock_level || 0;

    if (currentStock === 0) {
      return { status: 'out', label: 'Sem Estoque', color: 'destructive', icon: AlertTriangle };
    } else if (currentStock <= minLevel) {
      return { status: 'low', label: 'Estoque Baixo', color: 'secondary', icon: TrendingDown };
    } else {
      return { status: 'good', label: 'Em Estoque', color: 'default', icon: TrendingUp };
    }
  };

  const lowStockItems = menuItems.filter(item => {
    const currentStock = item.stock_quantity || 0;
    const minLevel = item.min_stock_level || 0;
    return currentStock <= minLevel && currentStock > 0;
  });

  const outOfStockItems = menuItems.filter(item => (item.stock_quantity || 0) === 0);

  if (loading) {
    return <div className="flex justify-center p-8">Carregando estoque...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Controle de Estoque</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produtos em Estoque</p>
                <p className="text-2xl font-bold">
                  {menuItems.filter(item => (item.stock_quantity || 0) > (item.min_stock_level || 0)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead>Estoque Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                menuItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const StatusIcon = stockStatus.icon;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!item.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                          <span className={!item.is_active ? 'text-muted-foreground' : 'font-medium'}>
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>R$ {item.base_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="w-20"
                            value={updateValues[item.id] ?? (item.stock_quantity || 0)}
                            onChange={(e) => setUpdateValues(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0
                            }))}
                          />
                          {updateValues[item.id] !== undefined && updateValues[item.id] !== (item.stock_quantity || 0) && (
                            <Button
                              size="sm"
                              onClick={() => handleStockUpdate(item.id, updateValues[item.id])}
                            >
                              Salvar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.min_stock_level || 0}</TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.color as any} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockUpdate(item.id, (item.stock_quantity || 0) + 1)}
                          >
                            +1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockUpdate(item.id, Math.max(0, (item.stock_quantity || 0) - 1))}
                          >
                            -1
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}