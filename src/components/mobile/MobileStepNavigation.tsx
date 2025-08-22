import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle, Save } from 'lucide-react';

interface MobileStepNavigationProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  isSaving?: boolean;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  saveLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
}

export const MobileStepNavigation: React.FC<MobileStepNavigationProps> = ({
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onSave,
  onSubmit,
  isLastStep,
  isFirstStep,
  isSaving = false,
  isSubmitting = false,
  canSubmit = true,
  saveLabel = "Salvar",
  nextLabel = "Próximo",
  submitLabel = "Enviar para Análise"
}) => {
  return (
    <div className="sticky bottom-0 z-10 bg-background border-t border-border p-4 space-y-3">
      {/* Save Button (if save function provided) */}
      {onSave && (
        <Button
          onClick={onSave}
          variant="outline"
          className="w-full h-12 text-base"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {saveLabel}
            </>
          )}
        </Button>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {/* Previous Button */}
        <Button
          onClick={onPrev}
          variant="outline"
          className="h-12 px-6"
          disabled={!canGoPrev}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Next/Submit Button */}
        <Button
          onClick={isLastStep ? onSubmit : onNext}
          className="flex-1 h-12 text-base font-medium"
          disabled={isLastStep ? !canSubmit || isSubmitting : !canGoNext}
        >
          {isLastStep ? (
            isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {submitLabel}
              </>
            )
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};