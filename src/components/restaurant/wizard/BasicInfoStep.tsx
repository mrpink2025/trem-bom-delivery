import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StoreData } from '@/hooks/useStoreRegistration';

interface BasicInfoStepProps {
  formData: Partial<StoreData>;
  updateFormData: (updates: Partial<StoreData>) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isSaving: boolean;
  saveStore: () => void;
  canEdit: boolean;
}

const cuisineTypes = [
  'brasileira',
  'italiana',
  'japonesa',
  'chinesa',
  'mexicana',
  'americana',
  'francesa',
  'indiana',
  'arabe',
  'vegetariana',
  'vegana',
  'hamburgueria',
  'pizzaria',
  'lanchonete',
  'sorveteria',
  'doceria',
  'padaria',
  'cafeteria',
  'outro'
];

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  isSaving,
  saveStore,
  canEdit
}) => {
  const isValid = formData.name && formData.phone && formData.email && formData.cuisine_type;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Loja *</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Digite o nome da sua loja"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cuisine_type">Tipo de Cozinha *</Label>
          <Select
            value={formData.cuisine_type || ''}
            onValueChange={(value) => updateFormData({ cuisine_type: value })}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de cozinha" />
            </SelectTrigger>
            <SelectContent>
              {cuisineTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição da Loja</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Descreva sua loja, especialidades e diferenciais"
          rows={3}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            placeholder="(11) 99999-9999"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="contato@minhaloja.com"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onPrev} 
          disabled={!canGoPrev}
        >
          Anterior
        </Button>
        
        <div className="space-x-2">
          {canEdit && (
            <Button 
              variant="outline" 
              onClick={saveStore}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          )}
          
          <Button 
            onClick={onNext} 
            disabled={!canGoNext || !isValid}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};