import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCourierRegistration, CourierStatus } from '@/hooks/useCourierRegistration';
import { PersonalDataStep } from './wizard/PersonalDataStep';
import { PersonalDocumentsStep } from './wizard/PersonalDocumentsStep';
import { VehicleDataStep } from './wizard/VehicleDataStep';
import { VehicleDocumentsStep } from './wizard/VehicleDocumentsStep';
import { PaymentDataStep } from './wizard/PaymentDataStep';
import { SelfieStep } from './wizard/SelfieStep';
import { ReviewStep } from './wizard/ReviewStep';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileWizardLayout } from '@/components/mobile/MobileWizardLayout';

const STEPS = [
  { id: 'personal', title: 'Dados Pessoais', description: 'Nome, CPF, telefone e endereço' },
  { id: 'personal-docs', title: 'Documentos Pessoais', description: 'CNH e comprovantes' },
  { id: 'vehicle', title: 'Dados do Veículo', description: 'Informações da moto' },
  { id: 'vehicle-docs', title: 'Documentos do Veículo', description: 'CRLV e fotos' },
  { id: 'payment', title: 'Conta para Recebimento', description: 'Chave PIX' },
  { id: 'selfie', title: 'Foto de Perfil', description: 'Selfie para identificação' },
  { id: 'review', title: 'Revisão Final', description: 'Conferir e enviar' }
];

export const CourierRegistrationWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useIsMobile();
  const {
    courier,
    loading,
    submitting,
    saveCourierData,
    uploadDocument,
    deleteDocument,
    submitForReview,
    getDocument,
    canSubmit
  } = useCourierRegistration();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const getStatusInfo = (status?: CourierStatus) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return {
          icon: <Clock className="h-4 w-4" />,
          variant: 'secondary' as const,
          label: 'Em Análise',
          description: 'Seu cadastro está sendo analisado pela nossa equipe. Você receberá uma notificação quando for aprovado.'
        };
      case 'APPROVED':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          variant: 'default' as const,
          label: 'Aprovado',
          description: 'Parabéns! Seu cadastro foi aprovado. Você já pode começar a receber pedidos.'
        };
      case 'REJECTED':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'destructive' as const,
          label: 'Rejeitado',
          description: 'Seu cadastro foi rejeitado. Verifique os motivos abaixo e faça as correções necessárias.'
        };
      case 'SUSPENDED':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'destructive' as const,
          label: 'Suspenso',
          description: 'Sua conta foi suspensa. Entre em contato com o suporte para mais informações.'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'outline' as const,
          label: 'Rascunho',
          description: 'Complete o cadastro para começar a trabalhar como entregador.'
        };
    }
  };

  const statusInfo = getStatusInfo(courier?.status);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

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

  // Se está em análise ou aprovado, mostrar status
  if (courier?.status === 'UNDER_REVIEW' || courier?.status === 'APPROVED' || courier?.status === 'SUSPENDED') {
    return (
      <div className={isMobile ? "p-4" : "max-w-2xl mx-auto p-6"}>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Badge variant={statusInfo.variant} className="gap-2">
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
            </div>
            <CardTitle>Status do Cadastro</CardTitle>
            <CardDescription>{statusInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {courier?.status === 'APPROVED' && (
              <div className="text-center">
                <Button onClick={() => window.location.href = '/courier'} size="lg" className="w-full">
                  Acessar Painel do Entregador
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'personal':
        return (
          <PersonalDataStep 
            data={courier || {}} 
            onSave={saveCourierData}
            onNext={nextStep}
          />
        );
      case 'personal-docs':
        return (
          <PersonalDocumentsStep 
            documents={[
              getDocument('CNH_FRENTE'),
              getDocument('CNH_VERSO'),
              getDocument('CPF_RG'),
              getDocument('COMPROVANTE_ENDERECO')
            ].filter(Boolean)}
            onUpload={uploadDocument}
            onDelete={deleteDocument}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'vehicle':
        return (
          <VehicleDataStep 
            data={courier || {}} 
            onSave={saveCourierData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'vehicle-docs':
        return (
          <VehicleDocumentsStep 
            documents={[
              getDocument('CRLV'),
              getDocument('FOTO_VEICULO'),
              getDocument('FOTO_PLACA')
            ].filter(Boolean)}
            onUpload={uploadDocument}
            onDelete={deleteDocument}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'payment':
        return (
          <PaymentDataStep 
            data={courier || {}} 
            onSave={saveCourierData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'selfie':
        return (
          <SelfieStep 
            document={getDocument('SELFIE')}
            onUpload={uploadDocument}
            onDelete={deleteDocument}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 'review':
        return (
          <ReviewStep 
            courier={courier || {}}
            onSubmit={submitForReview}
            onPrev={prevStep}
            submitting={submitting}
            canSubmit={canSubmit()}
          />
        );
      default:
        return null;
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileWizardLayout
        currentStep={currentStep}
        totalSteps={STEPS.length}
        steps={STEPS}
        statusInfo={statusInfo}
        rejectionReason={courier?.status === 'REJECTED' ? courier.rejection_reason : undefined}
        canGoPrev={currentStep > 0}
        canGoNext={currentStep < STEPS.length - 1}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={currentStep === STEPS.length - 1 ? submitForReview : undefined}
        isSaving={false}
        isSubmitting={submitting}
        canSubmit={currentStep === STEPS.length - 1 ? canSubmit() : true}
        submitLabel="Enviar Cadastro"
      >
        {renderStep()}
      </MobileWizardLayout>
    );
  }

  // Desktop Layout
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header com status e progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Cadastro de Entregador</h1>
            <p className="text-muted-foreground">
              Complete todas as etapas para começar a trabalhar
            </p>
          </div>
          <Badge variant={statusInfo.variant} className="gap-2">
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>

        {/* Mostrar motivo da rejeição */}
        {courier?.status === 'REJECTED' && courier.rejection_reason && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Motivo da rejeição:</strong> {courier.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Etapa {currentStep + 1} de {STEPS.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between mt-4 text-xs">
          {STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`flex flex-col items-center ${
                index === currentStep ? 'text-primary font-medium' : 
                index < currentStep ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                index === currentStep ? 'bg-primary text-primary-foreground' :
                index < currentStep ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-center max-w-[80px] leading-tight">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo da etapa atual */}
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