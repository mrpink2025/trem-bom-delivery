import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingCourier {
  id: string;
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
  address_json: any;
  cnh_valid_until: string;
  crlv_valid_until: string;
  pix_key_type: string;
  pix_key: string;
  submitted_at: string;
  status: string;
  document_types: string[];
  verified_documents: number;
  total_documents: number;
  completion_percentage: number;
  cnh_expiring_soon: boolean;
  crlv_expiring_soon: boolean;
  days_waiting: number;
}

export interface CourierFilters {
  page?: number;
  limit?: number;
  city?: string;
  plate?: string;
  submitted_after?: string;
  submitted_before?: string;
  expiring_soon?: boolean;
}

export const useCourierAdmin = () => {
  const [pendingCouriers, setPendingCouriers] = useState<PendingCourier[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  const { toast } = useToast();

  // Buscar couriers pendentes
  const fetchPendingCouriers = async (filters: CourierFilters = {}) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se é admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Acesso negado - apenas administradores');
      }

      // Construir query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const { data, error } = await supabase.functions.invoke(
        'courier-admin-pending',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (error) {
        throw error;
      }

      setPendingCouriers(data.data || []);
      setPagination(data.pagination || pagination);

    } catch (error: any) {
      console.error('Error fetching pending couriers:', error);
      toast({
        title: "Erro ao carregar",
        description: error.message || "Não foi possível carregar os couriers pendentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Aprovar courier
  const approveCourier = async (courierId: string, notes?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'courier-admin-approve',
        {
          body: {
            courier_id: courierId,
            notes
          }
        }
      );

      if (error) {
        throw error;
      }

      // Remover da lista de pendentes
      setPendingCouriers(prev => prev.filter(c => c.id !== courierId));

      toast({
        title: "Courier aprovado",
        description: "O entregador foi aprovado com sucesso.",
      });

      return true;
    } catch (error: any) {
      console.error('Error approving courier:', error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar o entregador.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Rejeitar courier
  const rejectCourier = async (courierId: string, reason: string) => {
    try {
      if (!reason.trim()) {
        throw new Error('Motivo da rejeição é obrigatório');
      }

      const { data, error } = await supabase.functions.invoke(
        'courier-admin-reject',
        {
          body: {
            courier_id: courierId,
            reason
          }
        }
      );

      if (error) {
        throw error;
      }

      // Remover da lista de pendentes
      setPendingCouriers(prev => prev.filter(c => c.id !== courierId));

      toast({
        title: "Courier rejeitado",
        description: "O entregador foi rejeitado.",
      });

      return true;
    } catch (error: any) {
      console.error('Error rejecting courier:', error);
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Não foi possível rejeitar o entregador.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Suspender courier
  const suspendCourier = async (courierId: string, reason: string) => {
    try {
      if (!reason.trim()) {
        throw new Error('Motivo da suspensão é obrigatório');
      }

      const { data, error } = await supabase.functions.invoke(
        'courier-admin-suspend',
        {
          body: {
            courier_id: courierId,
            reason
          }
        }
      );

      if (error) {
        throw error;
      }

      toast({
        title: "Courier suspenso",
        description: "O entregador foi suspenso.",
      });

      return true;
    } catch (error: any) {
      console.error('Error suspending courier:', error);
      toast({
        title: "Erro ao suspender",
        description: error.message || "Não foi possível suspender o entregador.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Obter URL assinada para visualizar documento
  const getDocumentUrl = async (path: string) => {
    try {
      const bucket = path.includes('SELFIE') ? 'courier-photos' : 'courier-docs';
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 300); // 5 minutos

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  // Obter detalhes completos do courier com documentos
  const getCourierDetails = async (courierId: string) => {
    try {
      const { data: courier, error: courierError } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', courierId)
        .single();

      if (courierError) {
        throw courierError;
      }

      const { data: documents, error: docsError } = await supabase
        .from('courier_documents')
        .select('*')
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false });

      if (docsError) {
        throw docsError;
      }

      const { data: reviewLog, error: logError } = await supabase
        .from('courier_reviews_log')
        .select('*')
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false });

      if (logError) {
        console.warn('Error fetching review log:', logError);
      }

      return {
        courier,
        documents,
        reviewLog: reviewLog || []
      };
    } catch (error) {
      console.error('Error fetching courier details:', error);
      throw error;
    }
  };

  // Helper para formatar endereço
  const formatAddress = (addressJson: any): string => {
    if (!addressJson) return 'Não informado';
    
    const { street, number, neighborhood, city, state, zip_code } = addressJson;
    return `${street}, ${number} - ${neighborhood}, ${city}/${state} - CEP: ${zip_code}`;
  };

  // Helper para calcular tempo de espera
  const getDaysWaiting = (submittedAt: string): number => {
    const submitted = new Date(submittedAt);
    const now = new Date();
    return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper para verificar documentos expirados
  const isDocumentExpiring = (validUntil: string, days: number = 30): boolean => {
    const expiry = new Date(validUntil);
    const now = new Date();
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  };

  useEffect(() => {
    fetchPendingCouriers();
  }, []);

  return {
    pendingCouriers,
    loading,
    pagination,
    fetchPendingCouriers,
    approveCourier,
    rejectCourier,
    suspendCourier,
    getDocumentUrl,
    getCourierDetails,
    formatAddress,
    getDaysWaiting,
    isDocumentExpiring
  };
};