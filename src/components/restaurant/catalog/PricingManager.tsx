import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, DollarSign, Settings, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MarkupConfiguration = {
  id: string;
  restaurant_id: string;
  cover_payment_fees: boolean;
  payment_fee_rate: number;
  payment_fee_fixed: number;
  service_fee_percent: number;
  max_item_increase_percent?: number;
  max_markup_amount?: number;
  basket_max_increase_percent?: number;
  rounding_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MarkupRule = {
  id: string;
  restaurant_id: string;
  rule_type: string;
  target_id?: string;
  margin_type: string;
  margin_value: number;
  priority: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function PricingManager() {
  const [configurations, setConfigurations] = useState<MarkupConfiguration[]>([]);
  const [rules, setRules] = useState<MarkupRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('configuration');
  
  // Configuration state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MarkupConfiguration | null>(null);
  const [configData, setConfigData] = useState({
    cover_payment_fees: false,
    payment_fee_rate: 0.0329,
    payment_fee_fixed: 0.39,
    service_fee_percent: 0,
    max_item_increase_percent: null as number | null,
    max_markup_amount: null as number | null,
    basket_max_increase_percent: null as number | null,
    rounding_type: 'NONE',
    is_active: true,
  });

  // Rules state
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MarkupRule | null>(null);
  const [ruleData, setRuleData] = useState({
    rule_type: 'STORE',
    margin_type: 'PERCENT',
    margin_value: 0,
    priority: 100,
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

      // Fetch configurations
      const { data: configsData, error: configsError } = await supabase
        .from('markup_configurations')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (configsError) throw configsError;
      setConfigurations(configsData || []);

      // Fetch rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('markup_rules')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('priority', { ascending: true });

      if (rulesError) throw rulesError;
      setRules(rulesData || []);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Configuration functions
  const handleConfigSubmit = async (e: React.FormEvent) => {
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

      const configurationData = {
        ...configData,
        restaurant_id: restaurant.id,
      };

      if (editingConfig) {
        const { error } = await supabase
          .from('markup_configurations')
          .update(configurationData)
          .eq('id', editingConfig.id);
        
        if (error) throw error;
        
        toast({
          title: "Configuração atualizada",
          description: "A configuração de preços foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('markup_configurations')
          .insert([configurationData]);
        
        if (error) throw error;
        
        toast({
          title: "Configuração criada",
          description: "A configuração de preços foi criada com sucesso.",
        });
      }

      resetConfigForm();
      setIsConfigOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configuração",
        description: error.message,
      });
    }
  };

  // Rules functions
  const handleRuleSubmit = async (e: React.FormEvent) => {
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

      const ruleDataWithRestaurant = {
        ...ruleData,
        restaurant_id: restaurant.id,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('markup_rules')
          .update(ruleDataWithRestaurant)
          .eq('id', editingRule.id);
        
        if (error) throw error;
        
        toast({
          title: "Regra atualizada",
          description: "A regra de markup foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('markup_rules')
          .insert([ruleDataWithRestaurant]);
        
        if (error) throw error;
        
        toast({
          title: "Regra criada",
          description: "A regra de markup foi criada com sucesso.",
        });
      }

      resetRuleForm();
      setIsRuleOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar regra",
        description: error.message,
      });
    }
  };

  const resetConfigForm = () => {
    setConfigData({
      cover_payment_fees: false,
      payment_fee_rate: 0.0329,
      payment_fee_fixed: 0.39,
      service_fee_percent: 0,
      max_item_increase_percent: null,
      max_markup_amount: null,
      basket_max_increase_percent: null,
      rounding_type: 'NONE',
      is_active: true,
    });
    setEditingConfig(null);
  };

  const resetRuleForm = () => {
    setRuleData({
      rule_type: 'STORE',
      margin_type: 'PERCENT',
      margin_value: 0,
      priority: 100,
    });
    setEditingRule(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando configurações de preço...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Gestão de Preços</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configuration">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="rules">Regras de Markup</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Configure as regras gerais de precificação da sua loja
            </p>
            
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetConfigForm}>
                  <Settings className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConfig ? 'Editar Configuração' : 'Nova Configuração de Preços'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleConfigSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cover_payment_fees"
                        checked={configData.cover_payment_fees}
                        onCheckedChange={(checked) => setConfigData({ ...configData, cover_payment_fees: checked })}
                      />
                      <Label htmlFor="cover_payment_fees">Cobrir Taxas de Pagamento</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment_fee_rate">Taxa de Pagamento (%)</Label>
                        <Input
                          id="payment_fee_rate"
                          type="number"
                          step="0.0001"
                          value={configData.payment_fee_rate}
                          onChange={(e) => setConfigData({ ...configData, payment_fee_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="payment_fee_fixed">Taxa Fixa (R$)</Label>
                        <Input
                          id="payment_fee_fixed"
                          type="number"
                          step="0.01"
                          value={configData.payment_fee_fixed}
                          onChange={(e) => setConfigData({ ...configData, payment_fee_fixed: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="service_fee_percent">Taxa de Serviço (%)</Label>
                      <Input
                        id="service_fee_percent"
                        type="number"
                        step="0.01"
                        value={configData.service_fee_percent}
                        onChange={(e) => setConfigData({ ...configData, service_fee_percent: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rounding_type">Tipo de Arredondamento</Label>
                      <Select 
                        value={configData.rounding_type} 
                        onValueChange={(value) => setConfigData({ ...configData, rounding_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Nenhum</SelectItem>
                          <SelectItem value="ROUND_UP">Arredondar para cima</SelectItem>
                          <SelectItem value="ROUND_DOWN">Arredondar para baixo</SelectItem>
                          <SelectItem value="PSYCHOLOGICAL">Preço psicológico (.99)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={configData.is_active}
                        onCheckedChange={(checked) => setConfigData({ ...configData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Configuração Ativa</Label>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingConfig ? 'Atualizar' : 'Criar'} Configuração
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsConfigOpen(false)}
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
                    <TableHead>Taxa de Pagamento</TableHead>
                    <TableHead>Taxa de Serviço</TableHead>
                    <TableHead>Arredondamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma configuração encontrada. Crie sua primeira configuração.
                      </TableCell>
                    </TableRow>
                  ) : (
                    configurations.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          {config.payment_fee_rate * 100}% + R$ {config.payment_fee_fixed}
                        </TableCell>
                        <TableCell>{config.service_fee_percent}%</TableCell>
                        <TableCell>{config.rounding_type}</TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? 'default' : 'secondary'}>
                            {config.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingConfig(config);
                                setConfigData({
                                  cover_payment_fees: config.cover_payment_fees,
                                  payment_fee_rate: config.payment_fee_rate,
                                  payment_fee_fixed: config.payment_fee_fixed,
                                  service_fee_percent: config.service_fee_percent,
                                  max_item_increase_percent: config.max_item_increase_percent,
                                  max_markup_amount: config.max_markup_amount,
                                  basket_max_increase_percent: config.basket_max_increase_percent,
                                  rounding_type: config.rounding_type,
                                  is_active: config.is_active,
                                });
                                setIsConfigOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
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

        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Configure regras específicas de markup por produto, categoria ou loja
            </p>
            
            <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetRuleForm}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Editar Regra' : 'Nova Regra de Markup'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleRuleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule_type">Tipo de Regra</Label>
                    <Select 
                      value={ruleData.rule_type} 
                      onValueChange={(value) => setRuleData({ ...ruleData, rule_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STORE">Loja Geral</SelectItem>
                        <SelectItem value="CATEGORY">Por Categoria</SelectItem>
                        <SelectItem value="PRODUCT">Por Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="margin_type">Tipo de Margem</Label>
                    <Select 
                      value={ruleData.margin_type} 
                      onValueChange={(value) => setRuleData({ ...ruleData, margin_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">Percentual (%)</SelectItem>
                        <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="margin_value">
                      Valor da Margem {ruleData.margin_type === 'PERCENT' ? '(%)' : '(R$)'}
                    </Label>
                    <Input
                      id="margin_value"
                      type="number"
                      step="0.01"
                      value={ruleData.margin_value}
                      onChange={(e) => setRuleData({ ...ruleData, margin_value: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={ruleData.priority}
                      onChange={(e) => setRuleData({ ...ruleData, priority: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Menor número = maior prioridade
                    </p>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingRule ? 'Atualizar' : 'Criar'} Regra
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsRuleOpen(false)}
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma regra encontrada. Crie sua primeira regra de markup.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.rule_type === 'STORE' ? 'Loja' : 
                             rule.rule_type === 'CATEGORY' ? 'Categoria' : 'Produto'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.margin_type === 'PERCENT' 
                            ? `${rule.margin_value}%` 
                            : `R$ ${rule.margin_value.toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRule(rule);
                                setRuleData({
                                  rule_type: rule.rule_type,
                                  margin_type: rule.margin_type,
                                  margin_value: rule.margin_value,
                                  priority: rule.priority,
                                });
                                setIsRuleOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
                                try {
                                  const { error } = await supabase
                                    .from('markup_rules')
                                    .delete()
                                    .eq('id', rule.id);
                                  if (error) throw error;
                                  toast({ title: "Regra excluída com sucesso" });
                                  fetchData();
                                } catch (error: any) {
                                  toast({ variant: "destructive", title: "Erro ao excluir regra", description: error.message });
                                }
                              }}
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