import React from 'react';
import { Button } from '@/components/ui/button';
import { CourierData } from '@/hooks/useCourierRegistration';

interface VehicleDocumentsStepProps {
  documents: any[];
  onUpload: (type: any, file: File) => Promise<any>;
  onDelete: (type: any) => Promise<boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export const VehicleDocumentsStep: React.FC<VehicleDocumentsStepProps> = ({
  onNext,
  onPrev
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Documentos do Veículo</h2>
        <p className="text-muted-foreground">
          Upload dos documentos do veículo necessários
        </p>
        
        {/* Document upload components will be implemented */}
        <div className="text-center py-8">
          <p>Componentes de upload em desenvolvimento</p>
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