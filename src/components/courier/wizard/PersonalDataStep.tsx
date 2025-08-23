import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CourierData } from '@/hooks/useCourierRegistration';
import { AutocompleteAddress } from '@/components/location/AutocompleteAddress';

interface PersonalDataStepProps {
  data: CourierData;
  onSave: (data: Partial<CourierData>) => Promise<boolean>;
  onNext: () => void;
}

export const PersonalDataStep: React.FC<PersonalDataStepProps> = ({
  data,
  onSave,
  onNext
}) => {
  const [localData, setLocalData] = React.useState(data || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(localData);
    if (success) {
      onNext();
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dados Pessoais</h2>
        
        <div>
          <Label htmlFor="full_name">Nome Completo</Label>
          <Input
            id="full_name"
            type="text"
            value={localData.full_name || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, full_name: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="birth_date">Data de Nascimento</Label>
          <Input
            id="birth_date"
            type="date"
            value={localData.birth_date || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, birth_date: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            type="text"
            value={localData.cpf || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, cpf: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            value={localData.phone || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>

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
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Próximo
        </Button>
      </div>
    </form>
  );
};