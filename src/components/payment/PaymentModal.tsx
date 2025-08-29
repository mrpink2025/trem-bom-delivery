import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, QrCode, Banknote, Copy, CheckCircle } from 'lucide-react';
import { usePayment } from '@/hooks/usePayment';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  amount,
  onPaymentSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'pix' | 'cash'>('pix');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'process' | 'success'>('select');
  const { createPayment, loading } = usePayment();
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setStep('process');
      const payment = await createPayment(orderId, Math.round(amount * 100), selectedMethod);
      setPaymentData(payment);
      
      if (selectedMethod === 'cash') {
        setStep('success');
        onPaymentSuccess?.();
      }
    } catch (error) {
      setStep('select');
    }
  };

  const copyPixCode = async () => {
    if (paymentData?.pix_copy_paste) {
      await navigator.clipboard.writeText(paymentData.pix_copy_paste);
      toast({
        title: "Código copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }
  };

  const simulatePaymentSuccess = () => {
    setStep('success');
    onPaymentSuccess?.();
    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi confirmado e está sendo preparado",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderSelectMethod = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Total a pagar</h3>
        <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
      </div>

      <div className="grid gap-3">
        <Card 
          className={`cursor-pointer transition-all ${selectedMethod === 'pix' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedMethod('pix')}
        >
          <CardContent className="flex items-center p-4">
            <QrCode className="h-6 w-6 mr-3" />
            <div>
              <h4 className="font-medium">PIX</h4>
              <p className="text-sm text-muted-foreground">Instantâneo e sem taxas</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${selectedMethod === 'stripe' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedMethod('stripe')}
        >
          <CardContent className="flex items-center p-4">
            <CreditCard className="h-6 w-6 mr-3" />
            <div>
              <h4 className="font-medium">Cartão de Crédito</h4>
              <p className="text-sm text-muted-foreground">Visa, Mastercard, Elo</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${selectedMethod === 'cash' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedMethod('cash')}
        >
          <CardContent className="flex items-center p-4">
            <Banknote className="h-6 w-6 mr-3" />
            <div>
              <h4 className="font-medium">Dinheiro</h4>
              <p className="text-sm text-muted-foreground">Pagamento na entrega</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button 
        onClick={handlePayment} 
        className="w-full" 
        disabled={loading}
      >
        {loading ? 'Processando...' : 'Continuar'}
      </Button>
    </div>
  );

  const renderProcessPayment = () => {
    if (selectedMethod === 'pix' && paymentData?.pix_qr_code) {
      return (
        <div className="space-y-4 text-center">
          <h3 className="text-lg font-semibold">Pagamento PIX</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded flex items-center justify-center">
              <QrCode className="h-24 w-24 text-gray-400" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code ou copie o código PIX
            </p>
            <Button variant="outline" onClick={copyPixCode} className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              Copiar código PIX
            </Button>
          </div>
          <Button onClick={simulatePaymentSuccess} className="w-full">
            Simular Pagamento (Demo)
          </Button>
        </div>
      );
    }

    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p>Processando pagamento...</p>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h3 className="text-lg font-semibold">Pagamento confirmado!</h3>
      <p className="text-muted-foreground">
        Seu pedido foi confirmado e está sendo preparado
      </p>
      <Button onClick={onClose} className="w-full">
        Fechar
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Escolha a forma de pagamento'}
            {step === 'process' && 'Finalize seu pagamento'}
            {step === 'success' && 'Pagamento realizado!'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'select' && renderSelectMethod()}
        {step === 'process' && renderProcessPayment()}
        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
};