import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface AddressData {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AddressFormProps {
  address: AddressData;
  onAddressChange: (address: AddressData) => void;
  className?: string;
}

export function AddressForm({ address, onAddressChange, className }: AddressFormProps) {
  const updateField = (field: keyof AddressData, value: string) => {
    onAddressChange({
      ...address,
      [field]: value
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Endereço Completo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="street">Rua/Avenida *</Label>
            <Input
              id="street"
              value={address.street || ''}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="Nome da rua ou avenida"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número *</Label>
            <Input
              id="number"
              value={address.number || ''}
              onChange={(e) => updateField('number', e.target.value)}
              placeholder="123"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={address.complement || ''}
              onChange={(e) => updateField('complement', e.target.value)}
              placeholder="Apt 101, Bloco A, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro *</Label>
            <Input
              id="neighborhood"
              value={address.neighborhood || ''}
              onChange={(e) => updateField('neighborhood', e.target.value)}
              placeholder="Nome do bairro"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zipCode">CEP</Label>
            <Input
              id="zipCode"
              value={address.zipCode || ''}
              onChange={(e) => {
                // Formatação automática do CEP
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 5) {
                  value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
                }
                updateField('zipCode', value);
              }}
              placeholder="12345-678"
              maxLength={9}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              value={address.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Goiânia"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado *</Label>
            <Input
              id="state"
              value={address.state || ''}
              onChange={(e) => updateField('state', e.target.value)}
              placeholder="GO"
              maxLength={2}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          * Campos obrigatórios. As informações de endereço são importantes para entregas e localização.
        </p>
      </CardContent>
    </Card>
  );
}