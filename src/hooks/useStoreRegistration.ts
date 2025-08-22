import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
        .from('stores')
        .select('*')
        .eq('created_by', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
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

      // Obter signed URL da edge function
      const { data, error } = await supabase.functions.invoke('store-sign-upload', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          docType: type,
          storeId: user.id
        }
      });

      if (error) {
        console.error('Error getting signed URL:', error);
        throw new Error('Falha ao gerar URL de upload');
      }

      if (!data?.upload_url) {
        throw new Error('URL de upload não recebida');
      }

      // Fazer upload do arquivo usando a signed URL
      const uploadResponse = await fetch(data.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Falha no upload: ${uploadResponse.status}`);
      }

      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from(data.bucket)
        .getPublicUrl(data.path);

      toast({
        title: "Upload realizado com sucesso",
        description: "Documento enviado com sucesso!",
      });

      return urlData.publicUrl;

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