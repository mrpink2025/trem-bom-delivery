import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourierData, PixKeyType } from '@/hooks/useCourierRegistration';

interface PaymentDataStepProps {
  data: CourierData;
  onSave: (data: Partial<CourierData>) => Promise<boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export const PaymentDataStep: React.FC<PaymentDataStepProps> = ({
  data,
  onSave,
  onNext,
  onPrev
}) => {
  const [localData, setLocalData] = React.useState(data);

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
        <h2 className="text-xl font-semibold">Dados de Pagamento</h2>
        
        <div>
          <Label htmlFor="pix_key_type">Tipo de Chave PIX</Label>
          <Select
            value={localData.pix_key_type || ''}
            onValueChange={(value) => setLocalData(prev => ({ ...prev, pix_key_type: value as PixKeyType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CPF">CPF</SelectItem>
              <SelectItem value="PHONE">Telefone</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="EVP">Chave Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="pix_key">Chave PIX</Label>
          <Input
            id="pix_key"
            type="text"
            value={localData.pix_key || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, pix_key: e.target.value }))}
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