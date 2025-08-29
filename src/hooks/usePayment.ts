import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentTransaction {
  id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
  payment_method: 'stripe' | 'pix' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  stripe_payment_intent_id?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  metadata?: any;
  created_at: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async (orderId: string, amountCents: number, paymentMethod: 'stripe' | 'pix' | 'cash') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          order_id: orderId,
          amount_cents: amountCents,
          payment_method: paymentMethod
        }
      });

      if (error) throw error;

      toast({
        title: "Pagamento criado",
        description: `Pagamento de R$ ${(amountCents / 100).toFixed(2)} criado com sucesso`,
      });

      return data.payment as PaymentTransaction;
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Falha ao criar pagamento",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentsByOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentTransaction[];
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao carregar pagamentos",
        variant: "destructive",
      });
      return [];
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: PaymentTransaction['status']) => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentTransaction;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do pagamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    loading,
    createPayment,
    getPaymentsByOrder,
    updatePaymentStatus
  };
};