import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreData } from '@/hooks/useStoreRegistration';

interface OperationStepProps {
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

const daysOfWeek = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

const paymentMethodOptions = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito' },
  { id: 'money', label: 'Dinheiro' },
  { id: 'meal_voucher', label: 'Vale Refeição' },
];

const featureOptions = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'takeout', label: 'Retirada no Local' },
  { id: 'wifi', label: 'Wi-Fi Grátis' },
  { id: 'parking', label: 'Estacionamento' },
  { id: 'air_conditioning', label: 'Ar Condicionado' },
  { id: 'kids_area', label: 'Área Kids' },
  { id: 'pet_friendly', label: 'Pet Friendly' },
  { id: 'accessibility', label: 'Acessibilidade' },
];

export const OperationStep: React.FC<OperationStepProps> = ({
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
  const operatingHours = formData.operating_hours || {};
  const paymentMethods = formData.payment_methods || [];
  const features = formData.features || [];

  const updateOperatingHours = (day: string, field: string, value: string | boolean) => {
    updateFormData({
      operating_hours: {
        ...operatingHours,
        [day]: {
          ...operatingHours[day],
          [field]: value
        }
      }
    });
  };

  const updatePaymentMethods = (method: string, checked: boolean) => {
    const updated = checked 
      ? [...paymentMethods, method]
      : paymentMethods.filter(m => m !== method);
    updateFormData({ payment_methods: updated });
  };

  const updateFeatures = (feature: string, checked: boolean) => {
    const updated = checked 
      ? [...features, feature]
      : features.filter(f => f !== feature);
    updateFormData({ features: updated });
  };

  return (
    <div className="space-y-6">
      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
          <CardDescription>
            Configure os horários de funcionamento da sua loja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => {
            const dayData = operatingHours[day.id] || { open: '08:00', close: '22:00', closed: false };
            
            return (
              <div key={day.id} className="flex items-center gap-4">
                <div className="w-32">
                  <Label>{day.label}</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!dayData.closed}
                    onCheckedChange={(checked) => updateOperatingHours(day.id, 'closed', !checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm text-muted-foreground">
                    {dayData.closed ? 'Fechado' : 'Aberto'}
                  </span>
                </div>
                
                {!dayData.closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={dayData.open}
                      onChange={(e) => updateOperatingHours(day.id, 'open', e.target.value)}
                      className="w-32"
                      disabled={!canEdit}
                    />
                    <span>até</span>
                    <Input
                      type="time"
                      value={dayData.close}
                      onChange={(e) => updateOperatingHours(day.id, 'close', e.target.value)}
                      className="w-32"
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Formas de Pagamento</CardTitle>
          <CardDescription>
            Selecione as formas de pagamento aceitas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {paymentMethodOptions.map((method) => (
              <div key={method.id} className="flex items-center space-x-2">
                <Checkbox
                  id={method.id}
                  checked={paymentMethods.includes(method.id)}
                  onCheckedChange={(checked) => updatePaymentMethods(method.id, checked as boolean)}
                  disabled={!canEdit}
                />
                <Label htmlFor={method.id}>{method.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos e Comodidades</CardTitle>
          <CardDescription>
            Marque os recursos disponíveis na sua loja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featureOptions.map((feature) => (
              <div key={feature.id} className="flex items-center space-x-2">
                <Checkbox
                  id={feature.id}
                  checked={features.includes(feature.id)}
                  onCheckedChange={(checked) => updateFeatures(feature.id, checked as boolean)}
                  disabled={!canEdit}
                />
                <Label htmlFor={feature.id}>{feature.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas</CardTitle>
          <CardDescription>
            Configure valores e tempos básicos da sua loja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
              <Input
                id="min_order_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_order_value || ''}
                onChange={(e) => updateFormData({ min_order_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
              <Input
                id="delivery_fee"
                type="number"
                min="0"
                step="0.01"
                value={formData.delivery_fee || ''}
                onChange={(e) => updateFormData({ delivery_fee: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_delivery_time">Tempo de Entrega (min)</Label>
              <Input
                id="estimated_delivery_time"
                type="number"
                min="0"
                value={formData.estimated_delivery_time || ''}
                onChange={(e) => updateFormData({ estimated_delivery_time: parseInt(e.target.value) || 0 })}
                placeholder="30"
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
            disabled={!canGoNext}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};