import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CourierData } from '@/hooks/useCourierRegistration';
import { AutocompleteAddress } from '@/components/location/AutocompleteAddress';

interface PersonalDocumentsStepProps {
  documents: any[];
  data?: CourierData;
  onUpload: (type: any, file: File) => Promise<any>;
  onDelete: (type: any) => Promise<boolean>;
  onSave: (data: Partial<CourierData>) => Promise<boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export const PersonalDocumentsStep: React.FC<PersonalDocumentsStepProps> = ({
  data,
  onSave,
  onNext,
  onPrev
}) => {
  const [localData, setLocalData] = React.useState(data || {});

  const handleAddressSelect = (address: any) => {
    setLocalData(prev => ({
      ...prev,
      address_json: {
        street: address.address_text,
        city: address.city,
        state: address.state,
        lat: address.lat,
        lng: address.lng,
        full_address: address.address_text
      }
    }));
  };

  const handleContinue = async () => {
    const success = await onSave(localData);
    if (success) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Endereço e Documentos Pessoais</h2>
        <p className="text-muted-foreground">
          Adicione seu endereço e faça o upload dos documentos pessoais necessários
        </p>
        
        {/* Campo de Endereço */}
        <div>
          <Label htmlFor="address">Endereço Completo</Label>
          <div className="space-y-2">
            <AutocompleteAddress 
              onAddressSelect={handleAddressSelect}
              initialAddress={localData.address_json?.full_address || ''}
            />
            {localData.address_json?.full_address && (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                📍 {localData.address_json.full_address}
              </div>
            )}
          </div>
        </div>
        
        {/* Document upload components will be implemented */}
        <div className="text-center py-8">
          <p>Componentes de upload em desenvolvimento</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button onClick={handleContinue} className="flex-1">
          Próximo
        </Button>
      </div>
    </div>
  );
};