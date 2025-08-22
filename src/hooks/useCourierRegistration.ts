import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';

export type CourierStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type DocType = 'CNH_FRENTE' | 'CNH_VERSO' | 'SELFIE' | 'CPF_RG' | 'COMPROVANTE_ENDERECO' | 'CRLV' | 'FOTO_VEICULO' | 'FOTO_PLACA';
export type PixKeyType = 'CPF' | 'PHONE' | 'EMAIL' | 'EVP';

export interface CourierData {
  id?: string;
  status?: CourierStatus;
  full_name?: string;
  birth_date?: string;
  cpf?: string;
  phone?: string;
  selfie_url?: string;
  address_json?: any;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  plate?: string;
  cnh_valid_until?: string;
  crlv_valid_until?: string;
  pix_key_type?: PixKeyType;
  pix_key?: string;
  rejection_reason?: string;
  suspended_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourierDocument {
  id: string;
  type: DocType;
  file_url: string;
  verified: boolean;
  notes?: string;
  created_at: string;
}

export const useCourierRegistration = () => {
  const [courier, setCourier] = useState<CourierData | null>(null);
  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { uploadFile } = useFileUpload();

  // Carregar dados do courier
  const fetchCourierData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do courier
      const { data: courierData, error: courierError } = await supabase
        .from('couriers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (courierError && courierError.code !== 'PGRST116') {
        throw courierError;
      }

      // Buscar documentos
      const { data: docsData, error: docsError } = await supabase
        .from('courier_documents')
        .select('*')
        .eq('courier_id', user.id)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.warn('Error fetching documents:', docsError);
      }

      setCourier(courierData);
      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error fetching courier data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar seus dados de entregador.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar dados do courier
  const saveCourierData = async (data: Partial<CourierData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Create proper courier data with required fields
      const courierData = {
        id: user.id,
        full_name: data.full_name || '',
        birth_date: data.birth_date || '',
        cpf: data.cpf || '',
        phone: data.phone || '',
        ...data
      };

      const { error } = await supabase
        .from('couriers')
        .upsert(courierData);

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setCourier(prev => prev ? { ...prev, ...data } : data as CourierData);

      toast({
        title: "Dados salvos",
        description: "Suas informações foram salvas com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error saving courier data:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Upload de documento
  const uploadDocument = async (type: DocType, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Determinar bucket e pasta baseado no tipo
      let bucket: 'avatars' | 'restaurants' | 'menu-items' | 'documents' = 'documents';
      let folder = 'courier-docs';
      
      if (type === 'SELFIE') {
        bucket = 'avatars';
        folder = 'courier-photos';
      }

      // Fazer upload usando useFileUpload
      const result = await uploadFile(file, {
        bucket,
        folder,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (!result?.url) {
        throw new Error('URL do arquivo não recebida');
      }

      // Registrar documento na base de dados
      const { data: docData, error: docError } = await supabase
        .from('courier_documents')
        .upsert({
          courier_id: user.id,
          type,
          file_url: result.url,
          mime: file.type,
          size_bytes: file.size
        })
        .select()
        .single();

      if (docError) {
        throw docError;
      }

      // Atualizar lista de documentos
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.type !== type);
        return [...filtered, docData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      toast({
        title: "Documento enviado",
        description: `${getDocumentLabel(type)} foi enviado com sucesso.`,
      });

      return docData;
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  // Deletar documento
  const deleteDocument = async (type: DocType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('courier_documents')
        .delete()
        .eq('courier_id', user.id)
        .eq('type', type);

      if (error) {
        throw error;
      }

      // Atualizar lista de documentos
      setDocuments(prev => prev.filter(doc => doc.type !== type));

      toast({
        title: "Documento removido",
        description: `${getDocumentLabel(type)} foi removido.`,
      });

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o documento.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Submeter para análise
  const submitForReview = async () => {
    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke(
        'courier-submit-application'
      );

      if (error) {
        throw error;
      }

      // Atualizar dados locais
      setCourier(prev => prev ? {
        ...prev,
        status: 'UNDER_REVIEW',
        submitted_at: new Date().toISOString()
      } : null);

      toast({
        title: "Enviado para análise",
        description: "Seu cadastro foi enviado para análise. Você receberá uma notificação quando for aprovado.",
      });

      return true;
    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      let errorMessage = "Não foi possível enviar para análise.";
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao enviar",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Helper para obter label do documento
  const getDocumentLabel = (type: DocType): string => {
    const labels: Record<DocType, string> = {
      'CNH_FRENTE': 'CNH (Frente)',
      'CNH_VERSO': 'CNH (Verso)',
      'SELFIE': 'Selfie',
      'CPF_RG': 'CPF/RG',
      'COMPROVANTE_ENDERECO': 'Comprovante de Endereço',
      'CRLV': 'CRLV',
      'FOTO_VEICULO': 'Foto do Veículo',
      'FOTO_PLACA': 'Foto da Placa'
    };
    return labels[type];
  };

  // Helper para verificar se documento existe
  const getDocument = (type: DocType): CourierDocument | undefined => {
    return documents.find(doc => doc.type === type);
  };

  // Helper para verificar se todos documentos obrigatórios estão presentes
  const hasRequiredDocuments = (): boolean => {
    const requiredDocs: DocType[] = ['CNH_FRENTE', 'SELFIE', 'COMPROVANTE_ENDERECO', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA'];
    return requiredDocs.every(type => getDocument(type));
  };

  // Helper para verificar se dados básicos estão completos
  const hasCompleteBasicData = (): boolean => {
    if (!courier) return false;
    
    return !!(
      courier.full_name &&
      courier.birth_date &&
      courier.cpf &&
      courier.phone &&
      courier.address_json &&
      courier.vehicle_brand &&
      courier.vehicle_model &&
      courier.plate &&
      courier.cnh_valid_until &&
      courier.crlv_valid_until &&
      courier.pix_key_type &&
      courier.pix_key
    );
  };

  // Verificar se pode submeter
  const canSubmit = (): boolean => {
    return (
      courier?.status === 'DRAFT' || courier?.status === 'REJECTED'
    ) && hasCompleteBasicData() && hasRequiredDocuments();
  };

  useEffect(() => {
    fetchCourierData();
  }, []);

  return {
    courier,
    documents,
    loading,
    submitting,
    saveCourierData,
    uploadDocument,
    deleteDocument,
    submitForReview,
    fetchCourierData,
    getDocumentLabel,
    getDocument,
    hasRequiredDocuments,
    hasCompleteBasicData,
    canSubmit
  };
};