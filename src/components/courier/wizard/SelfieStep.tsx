import React from 'react';
import { Button } from '@/components/ui/button';
import { CourierData } from '@/hooks/useCourierRegistration';

interface SelfieStepProps {
  document: any;
  onUpload: (type: any, file: File) => Promise<any>;
  onDelete: (type: any) => Promise<boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export const SelfieStep: React.FC<SelfieStepProps> = ({
  onNext,
  onPrev
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Selfie</h2>
        <p className="text-muted-foreground">
          Tire uma selfie para verificação de identidade
        </p>
        
        {/* Selfie capture component will be implemented */}
        <div className="text-center py-8">
          <p>Componente de selfie em desenvolvimento</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button onClick={onNext} className="flex-1">
          Próximo
        </Button>
      </div>
    </div>
  );
};