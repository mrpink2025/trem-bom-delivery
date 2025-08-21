import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useCheckoutCalculation } from '@/hooks/useCheckoutCalculation';

interface AddressInputProps {
  onAddressChange?: (address: any) => void;
}

export function AddressInput({ onAddressChange }: AddressInputProps) {
  const { updateDeliveryAddress } = useCheckoutCalculation();
  
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    zipcode: ''
  });
  
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const geocodeAddress = async () => {
    if (!address.street || !address.number || !address.city) {
      return null;
    }

    // Simulação de geocoding - em produção usar Google Maps API ou similar
    const mockCoordinates = {
      lat: -23.550520 + (Math.random() - 0.5) * 0.1, // São Paulo com variação
      lng: -46.633308 + (Math.random() - 0.5) * 0.1
    };

    return mockCoordinates;
  };

  const handleConfirmAddress = async () => {
    if (!address.street || !address.number || !address.zipcode) {
      return;
    }

    setIsGeocoding(true);
    
    try {
      const coordinates = await geocodeAddress();
      
      if (coordinates) {
        const fullAddress = {
          ...address,
          ...coordinates
        };
        
        updateDeliveryAddress(fullAddress);
        onAddressChange?.(fullAddress);
      }
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço de Entrega
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="zipcode">CEP</Label>
            <Input
              id="zipcode"
              placeholder="00000-000"
              value={address.zipcode}
              onChange={(e) => handleInputChange('zipcode', e.target.value)}
              maxLength={9}
            />
          </div>
          
          <div>
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              placeholder="Nome da rua"
              value={address.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              placeholder="123"
              value={address.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              placeholder="Apto, bloco, etc."
              value={address.complement}
              onChange={(e) => handleInputChange('complement', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              placeholder="Nome do bairro"
              value={address.neighborhood}
              onChange={(e) => handleInputChange('neighborhood', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              maxLength={2}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleConfirmAddress}
          className="w-full"
          disabled={!address.street || !address.number || !address.zipcode || isGeocoding}
        >
          {isGeocoding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verificando endereço...
            </>
          ) : (
            'Confirmar Endereço'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}