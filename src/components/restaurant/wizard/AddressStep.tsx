import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StoreData } from '@/hooks/useStoreRegistration';

interface AddressStepProps {
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

export const AddressStep: React.FC<AddressStepProps> = ({
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
  const address = formData.address_json || {};

  const updateAddress = (field: string, value: string) => {
    updateFormData({
      address_json: {
        ...address,
        [field]: value
      }
    });
  };

  const isValid = address.street && address.number && address.neighborhood && 
                  address.city && address.state && address.zipcode;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street">Rua *</Label>
          <Input
            id="street"
            value={address?.street || ''}
            onChange={(e) => updateAddress('street', e.target.value)}
            placeholder="Nome da rua"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={address?.number || ''}
            onChange={(e) => updateAddress('number', e.target.value)}
            placeholder="123"
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro *</Label>
          <Input
            id="neighborhood"
            value={address?.neighborhood || ''}
            onChange={(e) => updateAddress('neighborhood', e.target.value)}
            placeholder="Nome do bairro"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address?.complement || ''}
            onChange={(e) => updateAddress('complement', e.target.value)}
            placeholder="Apto, sala, etc."
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={address?.city || ''}
            onChange={(e) => updateAddress('city', e.target.value)}
            placeholder="Nome da cidade"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado *</Label>
          <Input
            id="state"
            value={address?.state || ''}
            onChange={(e) => updateAddress('state', e.target.value)}
            placeholder="GO"
            maxLength={2}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipcode">CEP *</Label>
          <Input
            id="zipcode"
            value={address?.zipcode || ''}
            onChange={(e) => updateAddress('zipcode', e.target.value)}
            placeholder="74000-000"
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