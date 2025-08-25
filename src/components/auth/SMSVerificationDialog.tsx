import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { useSMSVerification } from '@/hooks/useSMSVerification';

interface SMSVerificationDialogProps {
  open: boolean;
  phone: string;
  onVerified: (phone: string, code: string) => void;
  onClose: () => void;
}

export const SMSVerificationDialog = ({ 
  open, 
  phone, 
  onVerified, 
  onClose 
}: SMSVerificationDialogProps) => {
  const [inputCode, setInputCode] = useState('');
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    isLoading,
    isVerified,
    codeSent,
    timeRemaining,
    canResend,
    verificationCode,
    sendVerificationCode,
    verifyCode,
    resetVerification,
    formatTime,
    setVerificationCode
  } = useSMSVerification();

  // Memoize callbacks to prevent re-renders
  const handleVerified = useCallback((verifiedPhone: string, code: string) => {
    onVerified(verifiedPhone, code);
  }, [onVerified]);

  const handleClose = useCallback(() => {
    resetVerification();
    setInputCode('');
    setHasAutoSent(false);
    onClose();
  }, [onClose, resetVerification]);

  // Auto-send code when dialog opens (only once per phone/session)
  useEffect(() => {
    if (open && phone && !codeSent && !hasAutoSent && !isLoading) {
      setHasAutoSent(true);
      sendVerificationCode(phone);
    }
  }, [open, phone, codeSent, hasAutoSent, isLoading, sendVerificationCode]);

  // Reset auto-send flag when dialog closes
  useEffect(() => {
    if (!open) {
      setHasAutoSent(false);
    }
  }, [open]);

  // Auto-focus input when code is sent
  useEffect(() => {
    if (codeSent && inputRef.current && open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [codeSent, open]);

  // Handle verification success - use callback to prevent loops
  useEffect(() => {
    if (isVerified && verificationCode) {
      handleVerified(phone, verificationCode);
    }
  }, [isVerified, verificationCode, phone, handleVerified]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setInputCode(value);
    setVerificationCode(value);
  }, [setVerificationCode]);

  const handleVerify = useCallback(() => {
    if (inputCode.length === 6) {
      verifyCode(inputCode, phone);
    }
  }, [inputCode, phone, verifyCode]);

  const handleResend = useCallback(async () => {
    setInputCode('');
    setVerificationCode('');
    setHasAutoSent(false);
    await sendVerificationCode(phone);
  }, [phone, sendVerificationCode, setVerificationCode]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Verificar Telefone
          </DialogTitle>
          <DialogDescription>
            Enviamos um código de 6 dígitos para <strong>{phone}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!codeSent && isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Enviando código...
              </span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="text-sm font-medium">
                  Código de verificação
                </Label>
                <Input
                  ref={inputRef}
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={inputCode}
                  onChange={handleInputChange}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest h-12"
                  autoComplete="one-time-code"
                />
              </div>

              {timeRemaining > 0 && (
                <Alert>
                  <AlertDescription>
                    Código válido por mais {formatTime(timeRemaining)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleVerify}
                  disabled={inputCode.length !== 6 || isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar código
                </Button>

                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {canResend 
                    ? 'Reenviar código' 
                    : `Reenviar em ${formatTime(timeRemaining)}`
                  }
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Não recebeu o código? Verifique se o número está correto e tente reenviar.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};