import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SMSVerificationState {
  isLoading: boolean;
  isVerified: boolean;
  verificationCode: string;
  codeSent: boolean;
  timeRemaining: number;
  canResend: boolean;
}

export const useSMSVerification = () => {
  const [state, setState] = useState<SMSVerificationState>({
    isLoading: false,
    isVerified: false,
    verificationCode: '',
    codeSent: false,
    timeRemaining: 0,
    canResend: true
  });

  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [verifiedPhone, setVerifiedPhone] = useState<string>('');
  const [currentTimer, setCurrentTimer] = useState<NodeJS.Timeout | null>(null);

  const generateCode = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  const sendVerificationCode = useCallback(async (phone: string) => {
    if (!phone) {
      toast({
        title: "Erro",
        description: "Número de telefone é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    
    // Limpar timer anterior se existir
    if (currentTimer) {
      clearInterval(currentTimer);
    }

    try {
      const code = generateCode();
      setGeneratedCode(code);

      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phone, code }
      });

      if (error) {
        console.error('SMS error:', error);
        let errorMessage = "Não foi possível enviar o código. Tente novamente.";
        
        // Personalizar mensagens de erro
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
          errorMessage = "Problema de conexão. Verifique sua internet e tente novamente.";
        } else if (error.message?.includes('rate limit') || error.message?.includes('limit')) {
          errorMessage = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
        } else if (error.message?.includes('invalid') || error.message?.includes('phone')) {
          errorMessage = "Número de telefone inválido. Verifique o formato.";
        }
        
        toast({
          title: "Erro ao enviar SMS",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }

      setState(prev => ({ 
        ...prev, 
        codeSent: true, 
        timeRemaining: 300, // 5 minutos
        canResend: false 
      }));

      // Countdown timer com cleanup melhorado
      const timer = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timer);
            setCurrentTimer(null);
            return { ...prev, timeRemaining: 0, canResend: true };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
      
      setCurrentTimer(timer);

      toast({
        title: "Código enviado!",
        description: `Código de verificação enviado para ${phone}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar código",
        variant: "destructive"
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [generateCode, toast, currentTimer]);

  const verifyCode = useCallback((inputCode: string, phone: string) => {
    if (!inputCode || inputCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Digite um código de 6 dígitos",
        variant: "destructive"
      });
      return false;
    }

    if (inputCode === generatedCode) {
      setState(prev => ({ 
        ...prev, 
        isVerified: true, 
        verificationCode: inputCode 
      }));
      setVerifiedPhone(phone);
      
      toast({
        title: "Telefone verificado!",
        description: "Seu número foi verificado com sucesso",
      });
      return true;
    } else {
      toast({
        title: "Código incorreto",
        description: "O código digitado não confere. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [generatedCode, toast]);

  const resetVerification = useCallback(() => {
    // Limpar timer se existir
    if (currentTimer) {
      clearInterval(currentTimer);
      setCurrentTimer(null);
    }
    
    setState({
      isLoading: false,
      isVerified: false,
      verificationCode: '',
      codeSent: false,
      timeRemaining: 0,
      canResend: true
    });
    setGeneratedCode('');
    setVerifiedPhone('');
  }, [currentTimer]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    verifiedPhone,
    sendVerificationCode,
    verifyCode,
    resetVerification,
    formatTime,
    setVerificationCode: (code: string) => 
      setState(prev => ({ ...prev, verificationCode: code }))
  };
};