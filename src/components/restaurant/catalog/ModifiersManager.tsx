import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Settings, ListPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type OptionGroup = {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
};

type OptionValue = {
  id: string;
  name: string;
  price_delta: number;
  option_group_id: string;
  option_group?: OptionGroup;
  created_at: string;
  updated_at: string;
};

export function ModifiersManager() {
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  
  // Groups state
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    min_selections: 0,
    max_selections: 1,
    is_required: false,
  });

  // Values state
  const [isValueCreateOpen, setIsValueCreateOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<OptionValue | null>(null);
  const [valueFormData, setValueFormData] = useState({
    name: '',
    price_delta: 0,
    option_group_id: '',
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

      // Fetch option groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('menu_item_option_groups')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;
      setOptionGroups(groupsData || []);

      // Fetch option values with join
      const { data: valuesData, error: valuesError } = await supabase
        .from('menu_item_option_values')
        .select(`
          id,
          name,
          price_delta,
          option_group_id,
          created_at,
          updated_at,
          menu_item_option_groups!inner(id, name, restaurant_id)
        `)
        .eq('menu_item_option_groups.restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (valuesError) throw valuesError;
      
      // Map the data to match our type structure
      const mappedValues: OptionValue[] = (valuesData || []).map(item => ({
        id: item.id,
        name: item.name,
        price_delta: item.price_delta,
        option_group_id: item.option_group_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        option_group: {
          id: item.menu_item_option_groups.id,
          name: item.menu_item_option_groups.name
        }
      }));
      
      setOptionValues(mappedValues);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar modificadores",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Group functions
  const handleGroupSubmit = async (e: React.FormEvent) => {
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

      const groupData = {
        ...groupFormData,
        restaurant_id: restaurant.id,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('menu_item_option_groups')
          .update(groupData)
          .eq('id', editingGroup.id);
        
        if (error) throw error;
        
        toast({
          title: "Grupo atualizado",
          description: "O grupo de opções foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('menu_item_option_groups')
          .insert([groupData]);
        
        if (error) throw error;
        
        toast({
          title: "Grupo criado",
          description: "O grupo de opções foi criado com sucesso.",
        });
      }

      resetGroupForm();
      setIsGroupCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar grupo",
        description: error.message,
      });
    }
  };

  const handleGroupEdit = (group: OptionGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      min_selections: group.min_selections,
      max_selections: group.max_selections,
      is_required: group.is_required,
    });
    setIsGroupCreateOpen(true);
  };

  const handleGroupDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Todas as opções relacionadas serão removidas.')) return;

    try {
      const { error } = await supabase
        .from('menu_item_option_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Grupo excluído",
        description: "O grupo de opções foi excluído com sucesso.",
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir grupo",
        description: error.message,
      });
    }
  };

  // Value functions
  const handleValueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingValue) {
        const { error } = await supabase
          .from('menu_item_option_values')
          .update(valueFormData)
          .eq('id', editingValue.id);
        
        if (error) throw error;
        
        toast({
          title: "Opção atualizada",
          description: "A opção foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('menu_item_option_values')
          .insert([valueFormData]);
        
        if (error) throw error;
        
        toast({
          title: "Opção criada",
          description: "A opção foi criada com sucesso.",
        });
      }

      resetValueForm();
      setIsValueCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar opção",
        description: error.message,
      });
    }
  };

  const handleValueEdit = (value: OptionValue) => {
    setEditingValue(value);
    setValueFormData({
      name: value.name,
      price_delta: value.price_delta,
      option_group_id: value.option_group_id,
    });
    setIsValueCreateOpen(true);
  };

  const handleValueDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta opção?')) return;

    try {
      const { error } = await supabase
        .from('menu_item_option_values')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Opção excluída",
        description: "A opção foi excluída com sucesso.",
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir opção",
        description: error.message,
      });
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      min_selections: 0,
      max_selections: 1,
      is_required: false,
    });
    setEditingGroup(null);
  };

  const resetValueForm = () => {
    setValueFormData({
      name: '',
      price_delta: 0,
      option_group_id: '',
    });
    setEditingValue(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando modificadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Modificadores</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups">Grupos de Opções</TabsTrigger>
          <TabsTrigger value="values">Opções</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Gerencie grupos de modificadores (ex: Tamanho, Extras, Molhos)
            </p>
            
            <Dialog open={isGroupCreateOpen} onOpenChange={setIsGroupCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetGroupForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Opções'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_name">Nome do Grupo *</Label>
                    <Input
                      id="group_name"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      placeholder="Ex: Tamanho, Extras, Molhos"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_selections">Mín. Seleções</Label>
                      <Input
                        id="min_selections"
                        type="number"
                        min="0"
                        value={groupFormData.min_selections}
                        onChange={(e) => setGroupFormData({ ...groupFormData, min_selections: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max_selections">Máx. Seleções</Label>
                      <Input
                        id="max_selections"
                        type="number"
                        min="1"
                        value={groupFormData.max_selections}
                        onChange={(e) => setGroupFormData({ ...groupFormData, max_selections: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_required"
                      checked={groupFormData.is_required}
                      onCheckedChange={(checked) => setGroupFormData({ ...groupFormData, is_required: checked })}
                    />
                    <Label htmlFor="is_required">Seleção Obrigatória</Label>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingGroup ? 'Atualizar' : 'Criar'} Grupo
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsGroupCreateOpen(false)}
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
                    <TableHead>Nome do Grupo</TableHead>
                    <TableHead>Seleções Min/Max</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optionGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum grupo encontrado. Crie seu primeiro grupo de opções.
                      </TableCell>
                    </TableRow>
                  ) : (
                    optionGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.min_selections} - {group.max_selections}</TableCell>
                        <TableCell>
                          <Badge variant={group.is_required ? 'default' : 'secondary'}>
                            {group.is_required ? 'Obrigatório' : 'Opcional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGroupEdit(group)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGroupDelete(group.id)}
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
        </TabsContent>

        <TabsContent value="values" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Gerencie as opções dentro de cada grupo (ex: Pequeno, Médio, Grande)
            </p>
            
            <Dialog open={isValueCreateOpen} onOpenChange={setIsValueCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetValueForm} disabled={optionGroups.length === 0}>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Nova Opção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingValue ? 'Editar Opção' : 'Nova Opção'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleValueSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="value_name">Nome da Opção *</Label>
                    <Input
                      id="value_name"
                      value={valueFormData.name}
                      onChange={(e) => setValueFormData({ ...valueFormData, name: e.target.value })}
                      placeholder="Ex: Pequeno, Bacon Extra"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="option_group_id">Grupo *</Label>
                    <select
                      id="option_group_id"
                      className="w-full p-2 border rounded-md"
                      value={valueFormData.option_group_id}
                      onChange={(e) => setValueFormData({ ...valueFormData, option_group_id: e.target.value })}
                      required
                    >
                      <option value="">Selecione um grupo</option>
                      {optionGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price_delta">Acréscimo no Preço (R$)</Label>
                    <Input
                      id="price_delta"
                      type="number"
                      step="0.01"
                      value={valueFormData.price_delta}
                      onChange={(e) => setValueFormData({ ...valueFormData, price_delta: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingValue ? 'Atualizar' : 'Criar'} Opção
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsValueCreateOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {optionGroups.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-2">
                  Você precisa criar pelo menos um grupo antes de adicionar opções.
                </p>
                <Button variant="outline" onClick={() => setActiveTab('groups')}>
                  Criar Grupo
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Opção</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Acréscimo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optionValues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma opção encontrada. Crie sua primeira opção.
                      </TableCell>
                    </TableRow>
                  ) : (
                    optionValues.map((value) => (
                      <TableRow key={value.id}>
                        <TableCell className="font-medium">{value.name}</TableCell>
                        <TableCell>{value.option_group?.name || '-'}</TableCell>
                        <TableCell>
                          {value.price_delta === 0 
                            ? 'Gratuito' 
                            : `+ R$ ${value.price_delta.toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleValueEdit(value)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleValueDelete(value.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}