import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { MobileProgressIndicator } from './MobileProgressIndicator';
import { MobileStepNavigation } from './MobileStepNavigation';

interface MobileWizardLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  steps: Array<{ id: string; title: string; description: string }>;
  statusInfo?: {
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    label: string;
  };
  rejectionReason?: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  saveLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
}

export const MobileWizardLayout: React.FC<MobileWizardLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  steps,
  statusInfo,
  rejectionReason,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onSave,
  onSubmit,
  isSaving = false,
  isSubmitting = false,
  canSubmit = true,
  saveLabel,
  nextLabel,
  submitLabel
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Header */}
      <MobileProgressIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={steps}
        statusInfo={statusInfo}
      />

      {/* Rejection Alert */}
      {rejectionReason && (
        <div className="px-4 mb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Motivo da rejeição:</strong> {rejectionReason}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 pb-24 overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4">
            {children}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <MobileStepNavigation
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={onPrev}
        onNext={onNext}
        onSave={onSave}
        onSubmit={onSubmit}
        isLastStep={isLastStep}
        isFirstStep={isFirstStep}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        saveLabel={saveLabel}
        nextLabel={nextLabel}
        submitLabel={submitLabel}
      />
    </div>
  );
};