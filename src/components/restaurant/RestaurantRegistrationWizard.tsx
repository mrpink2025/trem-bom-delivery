import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useStoreRegistration } from '@/hooks/useStoreRegistration';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileWizardLayout } from '@/components/mobile/MobileWizardLayout';

// Import wizard steps
import { BasicInfoStep } from './wizard/BasicInfoStep';
import { AddressStep } from './wizard/AddressStep';
import { BrandingStep } from './wizard/BrandingStep';
import { DocumentsStep } from './wizard/DocumentsStep';
import { OperationStep } from './wizard/OperationStep';
import { DeliveryStep } from './wizard/DeliveryStep';
import { PricingStep } from './wizard/PricingStep';
import { ReviewStep } from './wizard/ReviewStep';

const STEPS = [
  { id: 'basic', title: 'Informações Básicas', description: 'Nome, descrição e contato' },
  { id: 'address', title: 'Endereço', description: 'Localização da loja' },
  { id: 'branding', title: 'Visual', description: 'Logo e aparência' },
  { id: 'documents', title: 'Documentos', description: 'Licenças e alvarás' },
  { id: 'operation', title: 'Funcionamento', description: 'Horários e pagamento' },
  { id: 'delivery', title: 'Entrega', description: 'Áreas e taxas' },
  { id: 'pricing', title: 'Preços', description: 'Markup e configurações' },
  { id: 'review', title: 'Revisão', description: 'Conferir e enviar' },
];

export const RestaurantRegistrationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useIsMobile();
  const { 
    store, 
    formData, 
    updateFormData, 
    saveStore, 
    submitForReview,
    isLoading, 
    isSaving,
    isSubmitting 
  } = useStoreRegistration();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const getStatusInfo = () => {
    if (!store) return null;

    switch (store.status) {
      case 'DRAFT':
        return {
          icon: <Clock className="w-5 h-5" />,
          badge: <Badge variant="secondary">Rascunho</Badge>,
          message: 'Complete o cadastro e envie para análise'
        };
      case 'UNDER_REVIEW':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          badge: <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Análise</Badge>,
          message: 'Sua loja está sendo analisada pela nossa equipe'
        };
      case 'APPROVED':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          badge: <Badge variant="default" className="bg-green-100 text-green-800">Aprovada</Badge>,
          message: 'Parabéns! Sua loja foi aprovada e está ativa'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          badge: <Badge variant="destructive">Rejeitada</Badge>,
          message: 'Sua loja foi rejeitada. Corrija os problemas e envie novamente'
        };
      case 'SUSPENDED':
        return {
          icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
          badge: <Badge variant="destructive" className="bg-orange-100 text-orange-800">Suspensa</Badge>,
          message: 'Sua loja foi suspensa. Entre em contato para mais informações'
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const canEdit = !store || store.status === 'DRAFT' || store.status === 'REJECTED';

  const renderStep = () => {
    const step = STEPS[currentStep];
    const commonProps = {
      formData,
      updateFormData,
      onNext: nextStep,
      onPrev: prevStep,
      canGoNext: currentStep < STEPS.length - 1,
      canGoPrev: currentStep > 0,
      isSaving,
      saveStore,
      canEdit
    };

    switch (step.id) {
      case 'basic':
        return <BasicInfoStep {...commonProps} />;
      case 'address':
        return <AddressStep {...commonProps} />;
      case 'branding':
        return <BrandingStep {...commonProps} />;
      case 'documents':
        return <DocumentsStep {...commonProps} />;
      case 'operation':
        return <OperationStep {...commonProps} />;
      case 'delivery':
        return <DeliveryStep {...commonProps} />;
      case 'pricing':
        return <PricingStep {...commonProps} />;
      case 'review':
        return <ReviewStep 
          {...commonProps} 
          onSubmit={submitForReview}
          isSubmitting={isSubmitting}
        />;
      default:
        return null;
    }
  };

  if (store?.status === 'APPROVED') {
    return (
      <div className={isMobile ? "p-4" : "container mx-auto py-8"}>
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Loja Aprovada!</CardTitle>
            <CardDescription>
              Sua loja "{store.name}" foi aprovada e está ativa na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileWizardLayout
        currentStep={currentStep}
        totalSteps={STEPS.length}
        steps={STEPS}
        statusInfo={statusInfo ? {
          icon: statusInfo.icon,
          variant: statusInfo.badge?.props.variant || 'secondary',
          label: statusInfo.badge?.props.children || 'Status'
        } : undefined}
        rejectionReason={store?.rejection_reason}
        canGoPrev={currentStep > 0}
        canGoNext={currentStep < STEPS.length - 1}
        onPrev={prevStep}
        onNext={nextStep}
        onSave={saveStore}
        onSubmit={currentStep === STEPS.length - 1 ? submitForReview : undefined}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        canSubmit={currentStep === STEPS.length - 1}
        saveLabel="Salvar Rascunho"
        submitLabel="Enviar para Análise"
      >
        {renderStep()}
      </MobileWizardLayout>
    );
  }

  // Desktop Layout
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header with status */}
      {statusInfo && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">Status da Loja</CardTitle>
                  {statusInfo.badge}
                </div>
                <CardDescription>{statusInfo.message}</CardDescription>
              </div>
            </div>
            {store?.rejection_reason && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Motivo da rejeição:</strong> {store.rejection_reason}
                </AlertDescription>
              </Alert>
            )}
            {store?.status === 'SUSPENDED' && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Loja suspensa:</strong> Entre em contato com o suporte para mais informações.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Progress */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-lg">Progresso do Cadastro</CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="mb-4" />
          
          {/* Step indicators */}
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs text-center max-w-20">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Current step */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
};