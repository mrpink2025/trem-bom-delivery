import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, AlertCircle, MapPin, Clock, CreditCard, Star } from 'lucide-react';
import { StoreData } from '@/hooks/useStoreRegistration';

interface ReviewStepProps {
  formData: Partial<StoreData>;
  updateFormData: (updates: Partial<StoreData>) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isSaving: boolean;
  saveStore: () => void;
  canEdit: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  isSaving,
  saveStore,
  canEdit,
  onSubmit,
  isSubmitting
}) => {
  const address = formData.address_json || {};
  const operatingHours = formData.operating_hours || {};
  const paymentMethods = formData.payment_methods || [];
  const features = formData.features || [];

  const formatAddress = () => {
    if (!address?.street) return 'Endereço não informado';
    return `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood}, ${address.city}/${address.state} - ${address.zipcode}`;
  };

  const formatOperatingHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    
    return days.map((day, index) => {
      const dayData = operatingHours[day];
      if (!dayData || dayData.closed) {
        return `${dayLabels[index]}: Fechado`;
      }
      return `${dayLabels[index]}: ${dayData.open} - ${dayData.close}`;
    }).join(' | ');
  };

  const formatPaymentMethods = () => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      money: 'Dinheiro',
      meal_voucher: 'Vale Refeição'
    };
    
    return paymentMethods.map(method => labels[method] || method).join(', ');
  };

  const formatFeatures = () => {
    const labels: Record<string, string> = {
      delivery: 'Delivery',
      takeout: 'Retirada',
      wifi: 'Wi-Fi',
      parking: 'Estacionamento',
      air_conditioning: 'Ar Condicionado',
      kids_area: 'Área Kids',
      pet_friendly: 'Pet Friendly',
      accessibility: 'Acessibilidade'
    };
    
    return features.map(feature => labels[feature] || feature).join(', ');
  };

  const isComplete = formData.name && formData.phone && formData.email && 
                    formData.cuisine_type && address?.street && address?.city;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Revisão Final</h2>
        <p className="text-muted-foreground">
          Confira todos os dados da sua loja antes de enviar para análise
        </p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            {formData.logo_url && (
              <img 
                src={formData.logo_url} 
                alt="Logo" 
                className="w-16 h-16 rounded-lg object-cover border"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-medium">{formData.name}</h3>
              <p className="text-muted-foreground">{formData.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{formData.cuisine_type}</Badge>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Telefone:</span> {formData.phone}
            </div>
            <div>
              <span className="font-medium">E-mail:</span> {formData.email}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{formatAddress()}</p>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Horários:</span>
            <div className="mt-1 text-muted-foreground">
              {formatOperatingHours()}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Pedido Mínimo:</span> R$ {formData.min_order_value?.toFixed(2) || '0,00'}
            </div>
            <div>
              <span className="font-medium">Taxa de Entrega:</span> R$ {formData.delivery_fee?.toFixed(2) || '0,00'}
            </div>
            <div>
              <span className="font-medium">Tempo de Entrega:</span> {formData.estimated_delivery_time || 0} min
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagamento & Recursos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Formas de Pagamento:</span>
            <p className="mt-1 text-muted-foreground">{formatPaymentMethods()}</p>
          </div>
          {features.length > 0 && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="font-medium">Recursos:</span>
                <p className="mt-1 text-muted-foreground">{formatFeatures()}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Alert */}
      {!isComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Informações Incompletas</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Alguns campos obrigatórios ainda não foram preenchidos. 
              Volte às etapas anteriores para completar o cadastro.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <Check className="w-5 h-5" />
            <span className="font-medium">Pronto para Enviar</span>
          </div>
          <p className="text-sm text-green-600 mb-4">
            Ao enviar, sua loja será analisada pela nossa equipe. 
            Você receberá uma notificação sobre o resultado em até 24 horas.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={onSubmit}
              disabled={!isComplete || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar para Análise'}
            </Button>
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
        </div>
      </div>
    </div>
  );
};