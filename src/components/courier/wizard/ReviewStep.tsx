import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourierData } from '@/hooks/useCourierRegistration';

interface ReviewStepProps {
  courier: CourierData;
  onSubmit: () => Promise<boolean>;
  onPrev: () => void;
  submitting: boolean;
  canSubmit: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  courier,
  onSubmit,
  onPrev,
  submitting,
  canSubmit
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Revisão dos Dados</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Nome:</strong> {courier.full_name}</p>
            <p><strong>CPF:</strong> {courier.cpf}</p>
            <p><strong>Telefone:</strong> {courier.phone}</p>
            <p><strong>Data de Nascimento:</strong> {courier.birth_date}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Marca:</strong> {courier.vehicle_brand}</p>
            <p><strong>Modelo:</strong> {courier.vehicle_model}</p>
            <p><strong>Ano:</strong> {courier.vehicle_year}</p>
            <p><strong>Placa:</strong> {courier.plate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Tipo de Chave PIX:</strong> {courier.pix_key_type}</p>
            <p><strong>Chave PIX:</strong> {courier.pix_key}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button 
          onClick={onSubmit} 
          className="flex-1"
          disabled={submitting || !canSubmit}
        >
          {submitting ? 'Enviando...' : 'Enviar para Análise'}
        </Button>
      </div>
    </div>
  );
};