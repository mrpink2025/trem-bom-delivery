import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { StoreData, useStoreRegistration } from '@/hooks/useStoreRegistration';
import { useToast } from '@/hooks/use-toast';

interface DocumentsStepProps {
  formData: Partial<StoreData>;
  updateFormData: (updates: Partial<StoreData>) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isSaving: boolean;
  saveStore: () => void;
  canEdit: boolean;
}

const documentTypes = [
  {
    id: 'alvara_funcionamento',
    title: 'Alvará de Funcionamento',
    description: 'Documento que autoriza o funcionamento do estabelecimento',
    required: true
  },
  {
    id: 'licenca_sanitaria',
    title: 'Licença Sanitária',
    description: 'Autorização para manipulação de alimentos',
    required: true
  },
  {
    id: 'cnpj',
    title: 'CNPJ',
    description: 'Cartão CNPJ ou Certificado da Receita Federal',
    required: true
  },
  {
    id: 'contrato_social',
    title: 'Contrato Social',
    description: 'Documento de constituição da empresa',
    required: false
  }
];

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  isSaving,
  saveStore,
  canEdit
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const { uploadDocument } = useStoreRegistration();
  const { toast } = useToast();

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF, JPG ou PNG.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(docType);
      const docUrl = await uploadDocument(file, docType);
      setUploadedDocs(prev => ({ ...prev, [docType]: docUrl }));
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!",
      });
    } catch (error) {
      // Error is already handled in uploadDocument
    } finally {
      setUploading(null);
    }
  };

  const requiredDocsUploaded = documentTypes
    .filter(doc => doc.required)
    .every(doc => uploadedDocs[doc.id]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Documentos Necessários</h3>
          <p className="text-sm text-muted-foreground">
            Envie os documentos necessários para validação da sua loja
          </p>
        </div>

        <div className="space-y-4">
          {documentTypes.map((docType) => (
            <Card key={docType.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{docType.title}</CardTitle>
                    {docType.required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Obrigatório
                      </span>
                    )}
                  </div>
                  {uploadedDocs[docType.id] && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <CardDescription>{docType.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {uploadedDocs[docType.id] ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-4 h-4" />
                      <span>Documento enviado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4" />
                      <span>Aguardando upload</span>
                    </div>
                  )}
                  
                  {canEdit && (
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, docType.id)}
                        disabled={uploading === docType.id}
                        className="hidden"
                        id={`doc-upload-${docType.id}`}
                      />
                      <Label htmlFor={`doc-upload-${docType.id}`} className="cursor-pointer">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={uploading === docType.id}
                          asChild
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {uploading === docType.id ? 'Enviando...' : 
                             uploadedDocs[docType.id] ? 'Substituir' : 'Enviar'}
                          </span>
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Informações importantes:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Documentos devem estar legíveis e atualizados</li>
          <li>• Formatos aceitos: PDF, JPG, PNG</li>
          <li>• Tamanho máximo por arquivo: 10MB</li>
          <li>• Certifique-se de que todos os dados estão visíveis</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onPrev} 
          disabled={!canGoPrev}
        >
          Anterior
        </Button>
        
        <div className="space-x-2">
          {canEdit && (
            <Button 
              variant="outline" 
              onClick={saveStore}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          )}
          
          <Button 
            onClick={onNext} 
            disabled={!canGoNext || !requiredDocsUploaded}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};