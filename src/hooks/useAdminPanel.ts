import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  user_id: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'SUPPORT' | 'AUDITOR';
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  avatar_url?: string;
  user_suspensions?: any[];
  admin_users?: AdminUser[];
}

interface UserActionRequest {
  action: 'suspend' | 'ban' | 'warn' | 'restore' | 'delete' | 'force_logout' | 'change_role';
  user_id: string;
  reason: string;
  type?: 'SOFT' | 'ANON' | 'HARD';
  ends_at?: string;
  new_role?: string;
  new_admin_role?: string;
}

interface ReportQuery {
  from?: string;
  to?: string;
  store_id?: string;
  report_type?: 'kpi' | 'orders' | 'revenue' | 'performance';
}

export const useAdminPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Verificar se o usuário atual é admin
  const { data: currentAdminRole, isLoading: isCheckingRole } = useQuery({
    queryKey: ['current-admin-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return data?.role || null;
    },
  });

  // Buscar usuários
  const fetchUsers = async (params: any = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-users');

    if (error) throw error;
    return data;
  };

  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchUsers(),
    enabled: !!currentAdminRole,
  });

  // Executar ação em usuário
  const userActionMutation = useMutation({
    mutationFn: async (request: UserActionRequest) => {
      const { data, error } = await supabase.functions.invoke('admin-user-action', {
        method: 'POST',
        body: request
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Ação executada com sucesso",
        description: `Ação "${variables.action}" aplicada ao usuário.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao executar ação",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  // Buscar relatórios
  const fetchReports = async (params: ReportQuery) => {
    const { data, error } = await supabase.functions.invoke('admin-reports');

    if (error) throw error;
    return data;
  };

  const { data: reportsData, isLoading: isLoadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => fetchReports({ report_type: 'kpi' }),
    enabled: !!currentAdminRole,
  });

  // Funções de conveniência
  const suspendUser = (userId: string, reason: string, endsAt?: string) => {
    return userActionMutation.mutateAsync({
      action: 'suspend',
      user_id: userId,
      reason,
      ends_at: endsAt
    });
  };

  const banUser = (userId: string, reason: string) => {
    return userActionMutation.mutateAsync({
      action: 'ban',
      user_id: userId,
      reason
    });
  };

  const restoreUser = (userId: string, reason: string) => {
    return userActionMutation.mutateAsync({
      action: 'restore',
      user_id: userId,
      reason
    });
  };

  const deleteUser = (userId: string, reason: string, type: 'SOFT' | 'ANON' | 'HARD' = 'SOFT') => {
    return userActionMutation.mutateAsync({
      action: 'delete',
      user_id: userId,
      reason,
      type
    });
  };

  const forceLogoutUser = (userId: string, reason: string) => {
    return userActionMutation.mutateAsync({
      action: 'force_logout',
      user_id: userId,
      reason
    });
  };

  const changeUserRole = (userId: string, reason: string, newRole?: string, newAdminRole?: string) => {
    return userActionMutation.mutateAsync({
      action: 'change_role',
      user_id: userId,
      reason,
      new_role: newRole,
      new_admin_role: newAdminRole
    });
  };

  const searchUsers = (query: string) => {
    return queryClient.fetchQuery({
      queryKey: ['admin-users', { q: query }],
      queryFn: () => fetchUsers({ q: query })
    });
  };

  const generateReport = (params: ReportQuery) => {
    return queryClient.fetchQuery({
      queryKey: ['admin-reports', params],
      queryFn: () => fetchReports(params)
    });
  };

  return {
    // Estado
    currentAdminRole,
    isCheckingRole,
    isAdmin: !!currentAdminRole,
    
    // Usuários
    users: usersData?.users || [],
    usersPagination: usersData?.pagination,
    isLoadingUsers,
    refetchUsers,
    
    // Relatórios
    reports: reportsData,
    isLoadingReports,
    refetchReports,
    
    // Ações
    suspendUser,
    banUser,
    restoreUser,
    deleteUser,
    forceLogoutUser,
    changeUserRole,
    searchUsers,
    generateReport,
    
    // Estado das mutações
    isProcessingUserAction: userActionMutation.isPending,
  };
};