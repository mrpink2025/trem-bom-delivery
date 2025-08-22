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
  const courierData = courier || {};
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Revisão dos Dados</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Nome:</strong> {courierData.full_name || 'Não informado'}</p>
            <p><strong>CPF:</strong> {courierData.cpf || 'Não informado'}</p>
            <p><strong>Telefone:</strong> {courierData.phone || 'Não informado'}</p>
            <p><strong>Data de Nascimento:</strong> {courierData.birth_date || 'Não informado'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Marca:</strong> {courierData.vehicle_brand || 'Não informado'}</p>
            <p><strong>Modelo:</strong> {courierData.vehicle_model || 'Não informado'}</p>
            <p><strong>Ano:</strong> {courierData.vehicle_year || 'Não informado'}</p>
            <p><strong>Placa:</strong> {courierData.plate || 'Não informado'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Tipo de Chave PIX:</strong> {courierData.pix_key_type || 'Não informado'}</p>
            <p><strong>Chave PIX:</strong> {courierData.pix_key || 'Não informado'}</p>
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