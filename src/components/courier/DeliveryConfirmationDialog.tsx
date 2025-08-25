import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { useDeliveryConfirmation } from '@/hooks/useDeliveryConfirmation';

interface DeliveryConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  customerPhone?: string;
  onConfirmed: () => void;
}

export function DeliveryConfirmationDialog({
  open,
  onOpenChange,
  orderId,
  customerPhone,
  onConfirmed
}: DeliveryConfirmationDialogProps) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const { confirmDelivery, isConfirming, attempts } = useDeliveryConfirmation();

  const handleConfirm = async () => {
    if (confirmationCode.length !== 4) {
      return;
    }

    const result = await confirmDelivery(orderId, confirmationCode);
    
    if (result.success) {
      onConfirmed();
      onOpenChange(false);
      setConfirmationCode('');
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '****';
    const cleanPhone = phone.replace(/\D/g, '');
    return `****${cleanPhone.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Confirmar Entrega
          </DialogTitle>
          <DialogDescription>
            Para confirmar a entrega, digite o código de 4 dígitos fornecido pelo cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Código baseado no telefone</p>
                  <p className="text-xs text-muted-foreground">
                    O código são os 4 últimos dígitos do telefone cadastrado ({formatPhone(customerPhone)})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Code Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation-code">Código de Confirmação</Label>
            <Input
              id="confirmation-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={confirmationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setConfirmationCode(value);
              }}
              placeholder="0000"
              className="text-center text-lg font-mono tracking-widest"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Peça ao cliente para informar os 4 últimos dígitos do telefone cadastrado
            </p>
          </div>

          {/* Attempts Warning */}
          {attempts > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    {attempts} tentativa{attempts > 1 ? 's' : ''} incorreta{attempts > 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            Sua localização será registrada por segurança
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isConfirming}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmationCode.length !== 4 || isConfirming}
              className="flex-1"
            >
              {isConfirming ? 'Confirmando...' : 'Confirmar Entrega'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}