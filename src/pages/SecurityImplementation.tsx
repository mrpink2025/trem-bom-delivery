import { SecurityImplementationStatus } from '@/components/security/SecurityImplementationStatus';

export function SecurityImplementation() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Implementação de Segurança</h1>
        <p className="text-muted-foreground">
          Status completo da implementação das medidas de segurança enterprise-grade
        </p>
      </div>
      
      <SecurityImplementationStatus />
    </div>
  );
}