import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CourierData } from '@/hooks/useCourierRegistration';

interface VehicleDataStepProps {
  data: CourierData;
  onSave: (data: Partial<CourierData>) => Promise<boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export const VehicleDataStep: React.FC<VehicleDataStepProps> = ({
  data,
  onSave,
  onNext,
  onPrev
}) => {
  const [localData, setLocalData] = React.useState(data || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(localData);
    if (success) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dados do Veículo</h2>
        
        <div>
          <Label htmlFor="vehicle_brand">Marca</Label>
          <Input
            id="vehicle_brand"
            type="text"
            value={localData.vehicle_brand || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, vehicle_brand: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="vehicle_model">Modelo</Label>
          <Input
            id="vehicle_model"
            type="text"
            value={localData.vehicle_model || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, vehicle_model: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="vehicle_year">Ano</Label>
          <Input
            id="vehicle_year"
            type="number"
            value={localData.vehicle_year || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, vehicle_year: parseInt(e.target.value) }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="plate">Placa</Label>
          <Input
            id="plate"
            type="text"
            value={localData.plate || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, plate: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="cnh_valid_until">CNH Válida até</Label>
          <Input
            id="cnh_valid_until"
            type="date"
            value={localData.cnh_valid_until || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, cnh_valid_until: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="crlv_valid_until">CRLV Válido até</Label>
          <Input
            id="crlv_valid_until"
            type="date"
            value={localData.crlv_valid_until || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, crlv_valid_until: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button type="submit" className="flex-1">
          Próximo
        </Button>
      </div>
    </form>
  );
};