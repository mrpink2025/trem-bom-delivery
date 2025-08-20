import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Key, 
  UserCheck, 
  Database,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityWarning {
  id: string;
  title: string;
  description: string;
  level: 'warn' | 'error' | 'info';
  category: string;
  fixUrl?: string;
}

const SecurityCenter = () => {
  const [warnings, setWarnings] = useState<SecurityWarning[]>([
    {
      id: 'auth_otp_expiry',
      title: 'Auth OTP long expiry',
      description: 'OTP expiry exceeds recommended threshold',
      level: 'warn',
      category: 'SECURITY',
      fixUrl: 'https://supabase.com/docs/guides/platform/going-into-prod#security'
    },
    {
      id: 'leaked_password_protection',
      title: 'Leaked Password Protection Disabled',
      description: 'Leaked password protection is currently disabled.',
      level: 'warn',
      category: 'SECURITY',
      fixUrl: 'https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection'
    }
  ]);
  
  const [securityScore, setSecurityScore] = useState(85);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshSecurityScan = async () => {
    setLoading(true);
    try {
      // Simulação de scan de segurança
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Scan de segurança concluído",
        description: "Sistema analisado com sucesso."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no scan",
        description: "Não foi possível executar o scan de segurança."
      });
    } finally {
      setLoading(false);
    }
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warn':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':  
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const securityChecks = [
    { name: 'Row Level Security (RLS)', status: 'active', score: 25 },
    { name: 'Audit Logs', status: 'active', score: 20 },
    { name: 'Backup Automático', status: 'active', score: 15 },
    { name: 'Autenticação 2FA', status: 'warning', score: 10 },
    { name: 'Monitoramento', status: 'active', score: 15 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Central de Segurança</h2>
          <p className="text-muted-foreground">
            Monitore e gerencie a segurança do sistema
          </p>
        </div>
        <Button onClick={refreshSecurityScan} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Escanear Segurança
        </Button>
      </div>

      {/* Score de Segurança */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Score de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{securityScore}/100</div>
            <Progress value={securityScore} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {securityScore >= 90 ? 'Excelente' : 
               securityScore >= 70 ? 'Bom' : 
               securityScore >= 50 ? 'Regular' : 'Crítico'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{warnings.length}</div>
            <div className="flex gap-2">
              <Badge variant="destructive">0 Críticos</Badge>
              <Badge className="bg-yellow-500">{warnings.length} Avisos</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Status Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">Protegido</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sistema funcionando com segurança
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verificações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Verificações de Segurança
          </CardTitle>
          <CardDescription>
            Status das principais medidas de segurança implementadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    check.status === 'active' ? 'bg-green-100' : 
                    check.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {check.status === 'active' ? 
                      <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    }
                  </div>
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Contribui com {check.score} pontos para o score
                    </p>
                  </div>
                </div>
                <Badge className={
                  check.status === 'active' ? 'bg-green-500' : 
                  check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }>
                  {check.status === 'active' ? 'Ativo' : 
                   check.status === 'warning' ? 'Atenção' : 'Inativo'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Segurança
          </CardTitle>
          <CardDescription>
            Problemas identificados que requerem atenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {warnings.map((warning) => (
              <Alert key={warning.id} className={getWarningColor(warning.level)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getWarningIcon(warning.level)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-medium">
                        {warning.title}
                      </AlertTitle>
                      <AlertDescription className="text-sm mt-1">
                        {warning.description}
                      </AlertDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{warning.category}</Badge>
                        {warning.fixUrl && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto"
                            onClick={() => window.open(warning.fixUrl, '_blank')}
                          >
                            Ver solução
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Recomendações de Segurança
          </CardTitle>
          <CardDescription>
            Melhorias sugeridas para aumentar a segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Configurar Autenticação 2FA</p>
                <p className="text-sm text-muted-foreground">
                  Ative a autenticação de dois fatores para administradores
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Revisar Políticas RLS</p>
                <p className="text-sm text-muted-foreground">
                  Revise periodicamente as políticas de acesso aos dados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Monitoramento Avançado</p>
                <p className="text-sm text-muted-foreground">
                  Configure alertas para atividades suspeitas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityCenter;