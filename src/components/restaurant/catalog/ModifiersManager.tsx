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
      // Since these tables don't exist yet, use empty arrays
      setOptionGroups([]);
      setOptionValues([]);
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
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A gestão de modificadores será implementada em breve.",
      });

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
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A gestão de modificadores será implementada em breve.",
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
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A gestão de modificadores será implementada em breve.",
      });

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
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A gestão de modificadores será implementada em breve.",
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

      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            Sistema de modificadores em desenvolvimento
          </p>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá criar grupos de modificadores como tamanhos, extras e molhos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}