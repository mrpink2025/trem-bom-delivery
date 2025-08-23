import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFileUpload } from '@/hooks/useFileUpload';

export interface StoreData {
  id?: string;
  name: string;
  description?: string;
  phone: string;
  email: string;
  address_json: any;
  logo_url?: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  cuisine_type?: string;
  min_order_value?: number;
  delivery_fee?: number;
  estimated_delivery_time?: number;
  operating_hours?: any;
  payment_methods?: string[];
  features?: string[];
  rejection_reason?: string;
  suspended_reason?: string;
}

export const useStoreRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile } = useFileUpload();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<StoreData>>({
    status: 'DRAFT',
    operating_hours: {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '08:00', close: '22:00', closed: false },
    },
    payment_methods: ['pix', 'credit_card', 'debit_card'],
    features: []
  });

  // Query store data
  const { data: store, isLoading, error } = useQuery({
    queryKey: ['store', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
        // Transform restaurant data to match StoreData interface
      if (data) {
        // Determinar status baseado nos campos do banco
        let status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' = 'DRAFT';
        
        if (data.is_active) {
          status = 'APPROVED';
        } else if (data.submitted_for_review_at) {
          status = 'UNDER_REVIEW';
        }
        
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          phone: data.phone,
          email: data.email,
          address_json: data.address,
          logo_url: data.image_url,
          status,
          cuisine_type: data.cuisine_type,
          min_order_value: data.minimum_order,
          delivery_fee: data.delivery_fee,
          estimated_delivery_time: data.delivery_time_max,
          operating_hours: data.opening_hours,
          payment_methods: ['pix', 'credit_card', 'debit_card'],
          features: [],
          rejection_reason: undefined,
          suspended_reason: undefined
        } as StoreData;
      }
      
      return null;
    },
    enabled: !!user?.id,
  });

  // Submit store registration
  const submitRegistrationMutation = useMutation({
    mutationFn: async (data: Partial<StoreData>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase.functions.invoke('store-submit-review', {
        body: { storeData: { ...data, id: user.id } }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Loja enviada para análise. Você receberá uma notificação quando for aprovada.",
      });
      queryClient.invalidateQueries({ queryKey: ['store'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a loja para análise.",
        variant: "destructive",
      });
    },
  });

  // Save store data
  const saveStoreMutation = useMutation({
    mutationFn: async (data: Partial<StoreData>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase.functions.invoke('store-create', {
        body: { storeData: { ...data, id: user.id } }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Dados da loja salvos com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['store'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar os dados da loja.",
        variant: "destructive",
      });
    },
  });

  // Update form data when store data is loaded
  useEffect(() => {
    if (store) {
      setFormData(store);
    }
  }, [store]);

  const updateFormData = (updates: Partial<StoreData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const saveStore = (data?: Partial<StoreData>) => {
    const dataToSave = data || formData;
    saveStoreMutation.mutate(dataToSave);
  };

  const submitForReview = () => {
    submitRegistrationMutation.mutate(formData);
  };

  const uploadDocument = async (file: File, type: string) => {
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Determinar bucket baseado no tipo de documento
      let bucket: 'avatars' | 'restaurants' | 'menu-items' | 'documents' = 'restaurants';
      let folder = type;
      
      if (type === 'logo') {
        bucket = 'restaurants';
        folder = 'logos';
      } else {
        bucket = 'documents';
        folder = 'restaurant-docs';
      }

      const result = await uploadFile(file, {
        bucket,
        folder,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return result?.url || '';

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    store,
    formData,
    updateFormData,
    saveStore,
    submitForReview,
    uploadDocument,
    isLoading,
    error,
    isSaving: saveStoreMutation.isPending,
    isSubmitting: submitRegistrationMutation.isPending,
  };
};