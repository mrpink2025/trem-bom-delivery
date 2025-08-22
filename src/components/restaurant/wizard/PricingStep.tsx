import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { StoreData } from '@/hooks/useStoreRegistration';

interface PricingStepProps {
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

export const PricingStep: React.FC<PricingStepProps> = ({
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
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Configurações de Preço
          </CardTitle>
          <CardDescription>
            As configurações de markup serão disponibilizadas após a aprovação
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Configuração Posterior</h3>
            <p className="text-muted-foreground">
              Após a aprovação da sua loja, você terá acesso a:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Sistema de markup dinâmico</li>
              <li>• Regras de preço por categoria</li>
              <li>• Configurações de taxa de pagamento</li>
              <li>• Arredondamento psicológico</li>
              <li>• Limites de aumento por item</li>
              <li>• Taxa de serviço</li>
            </ul>
            <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
              Por enquanto, utilizaremos as configurações padrão da plataforma.
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