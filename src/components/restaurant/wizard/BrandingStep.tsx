import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { StoreData, useStoreRegistration } from '@/hooks/useStoreRegistration';
import { useToast } from '@/hooks/use-toast';

interface BrandingStepProps {
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

export const BrandingStep: React.FC<BrandingStepProps> = ({
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
  const [uploading, setUploading] = useState(false);
  const { uploadDocument } = useStoreRegistration();
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const logoUrl = await uploadDocument(file, 'logo');
      updateFormData({ logo_url: logoUrl });
      toast({
        title: "Sucesso",
        description: "Logo enviado com sucesso!",
      });
    } catch (error) {
      // Error is already handled in uploadDocument
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Logo da Loja</Label>
          <p className="text-sm text-muted-foreground">
            Faça upload do logo da sua loja. Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {formData.logo_url ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={formData.logo_url} 
                  alt="Logo da loja" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Logo enviado</p>
                <p className="text-sm text-muted-foreground">
                  Você pode substituir fazendo upload de uma nova imagem
                </p>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          {canEdit && (
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
                id="logo-upload"
              />
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button 
                  variant="outline" 
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Fazer Upload'}
                  </span>
                </Button>
              </Label>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Dicas para um bom logo:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Use uma imagem quadrada ou com proporção próxima</li>
          <li>• Prefira formatos PNG para logos com transparência</li>
          <li>• Certifique-se de que o logo está visível em fundo claro e escuro</li>
          <li>• Evite textos muito pequenos que podem ficar ilegíveis</li>
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
            disabled={!canGoNext}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};