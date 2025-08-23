import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Gerenciar Estoque",
                            description: `Alterando estoque de ${item.name}`,
                          });
                        }}
                      >
                        Alterar Estoque
                      </Button>
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