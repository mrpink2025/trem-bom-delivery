import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Settings,
  Calendar,
  HardDrive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  include_files: boolean;
  compression: boolean;
}

interface BackupRecord {
  id: string;
  created_at: string;
  size: string;
  status: 'completed' | 'in_progress' | 'failed';
  type: 'manual' | 'automatic';
  tables_count: number;
}

const BackupManagement = () => {
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    frequency: 'daily',
    retention_days: 30,
    include_files: true,
    compression: true
  });
  
  const [backups] = useState<BackupRecord[]>([
    {
      id: '1',
      created_at: new Date().toISOString(),
      size: '2.4 MB',
      status: 'completed',
      type: 'automatic',
      tables_count: 8
    },
    {
      id: '2',
      created_at: addDays(new Date(), -1).toISOString(),
      size: '2.1 MB',
      status: 'completed',
      type: 'automatic',
      tables_count: 8
    },
    {
      id: '3',
      created_at: addDays(new Date(), -2).toISOString(),
      size: '1.9 MB',
      status: 'failed',
      type: 'automatic',
      tables_count: 0
    }
  ]);

  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { toast } = useToast();

  const createManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Simulação de criação de backup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Backup criado com sucesso",
        description: "O backup manual foi gerado e está disponível para download."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar backup",
        description: "Não foi possível criar o backup manual."
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const updateConfig = (updates: Partial<BackupConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    toast({
      title: "Configuração atualizada",
      description: "As configurações de backup foram salvas."
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in_progress':
        return 'Em Progresso';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Backup</h2>
          <p className="text-muted-foreground">
            Configure e monitore backups automáticos do sistema
          </p>
        </div>
        <Button 
          onClick={createManualBackup} 
          disabled={isCreatingBackup}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          {isCreatingBackup ? 'Criando...' : 'Backup Manual'}
        </Button>
      </div>

      {/* Status Geral */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">Backup Automático</span>
              <Badge className={config.enabled ? 'bg-green-500' : 'bg-red-500'}>
                {config.enabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">Próximo Backup</span>
              <span className="text-sm font-medium">
                {format(addDays(new Date(), 1), 'dd/MM HH:mm')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usado</span>
                <span>8.4 MB / 100 MB</span>
              </div>
              <Progress value={8.4} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {config.retention_days} dias de retenção
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Última Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium text-green-600">Sucesso</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </p>
              <p className="text-xs text-muted-foreground">
                8 tabelas • 2.4 MB
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Backup
          </CardTitle>
          <CardDescription>
            Personalize como e quando os backups são criados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Ativar backups automáticos regulares
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select 
                value={config.frequency} 
                onValueChange={(frequency: 'daily' | 'weekly' | 'monthly') => 
                  updateConfig({ frequency })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Retenção (dias)</Label>
              <Select 
                value={config.retention_days.toString()} 
                onValueChange={(value) => updateConfig({ retention_days: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Incluir Arquivos</Label>
              <p className="text-sm text-muted-foreground">
                Fazer backup de imagens e outros arquivos
              </p>
            </div>
            <Switch
              checked={config.include_files}
              onCheckedChange={(include_files) => updateConfig({ include_files })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Compressão</Label>
              <p className="text-sm text-muted-foreground">
                Comprimir backups para economizar espaço
              </p>
            </div>
            <Switch
              checked={config.compression}
              onCheckedChange={(compression) => updateConfig({ compression })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription>
            Últimos backups realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {backup.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {backup.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                    {backup.status === 'in_progress' && <Clock className="h-5 w-5 text-blue-500 animate-pulse" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                      <Badge variant="outline">
                        {backup.type === 'manual' ? 'Manual' : 'Automático'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {backup.tables_count} tabelas • {backup.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(backup.status)}>
                    {getStatusText(backup.status)}
                  </Badge>
                  {backup.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;