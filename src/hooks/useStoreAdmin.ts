import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminStoreActions {
  approve: (storeId: string) => void;
  reject: (storeId: string, reason: string) => void;
  suspend: (storeId: string, reason: string) => void;
  reactivate: (storeId: string) => void;
}

export const useStoreAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending stores
  const { data: pendingStores, isLoading: loadingPending } = useQuery({
    queryKey: ['stores', 'pending'],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        throw new Error('Acesso negado - apenas administradores');
      }

      const { data, error } = await supabase.functions.invoke(
        'store-admin-pending',
        {
          body: {},
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      return data?.stores || [];
    },
    enabled: !!user?.id,
  });

  // Approve store mutation
  const approveMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'store-admin-approve',
        {
          body: { storeId },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Loja aprovada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (error: any) => {
      console.error('Error approving store:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar a loja.",
        variant: "destructive",
      });
    },
  });

  // Reject store mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ storeId, reason }: { storeId: string; reason: string }) => {
      if (!reason.trim()) {
        throw new Error('Motivo da rejeição é obrigatório');
      }

      const { data, error } = await supabase.functions.invoke(
        'store-admin-reject',
        {
          body: { storeId, reason },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Loja rejeitada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (error: any) => {
      console.error('Error rejecting store:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível rejeitar a loja.",
        variant: "destructive",
      });
    },
  });

  // Suspend store mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ storeId, reason }: { storeId: string; reason: string }) => {
      if (!reason.trim()) {
        throw new Error('Motivo da suspensão é obrigatório');
      }

      const { data, error } = await supabase.functions.invoke(
        'store-admin-suspend',
        {
          body: { storeId, reason },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Loja suspensa com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (error: any) => {
      console.error('Error suspending store:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível suspender a loja.",
        variant: "destructive",
      });
    },
  });

  return {
    pendingStores,
    loadingPending,
    actions: {
      approve: (storeId: string) => approveMutation.mutate(storeId),
      reject: (storeId: string, reason: string) => rejectMutation.mutate({ storeId, reason }),
      suspend: (storeId: string, reason: string) => suspendMutation.mutate({ storeId, reason }),
      reactivate: (storeId: string) => approveMutation.mutate(storeId), // Same as approve for reactivation
    },
    isProcessing: approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending,
  };
};