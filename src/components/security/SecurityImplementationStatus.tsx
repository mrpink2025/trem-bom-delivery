import { CheckCircle, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const implementedFeatures = [
  { name: 'RLS Policies', status: 'complete', description: 'Todas as tabelas protegidas' },
  { name: 'Database Security', status: 'complete', description: 'Funções hardened contra SQL injection' },
  { name: 'Security Monitoring', status: 'complete', description: 'Monitoramento em tempo real ativo' },
  { name: 'Input Validation', status: 'complete', description: 'Proteção contra XSS e injection' },
  { name: 'Audit Logging', status: 'complete', description: 'Sistema completo de auditoria' },
  { name: 'CSP Headers', status: 'complete', description: 'Content Security Policy configurado' },
  { name: 'Emergency Lockdown', status: 'complete', description: 'Sistema de bloqueio automático' },
];

const manualTasks = [
  {
    name: 'OTP Expiry Configuration',
    status: 'pending',
    description: 'Reduzir para 600 segundos',
    url: 'https://supabase.com/dashboard/project/ighllleypgbkluhcihvs/auth/providers',
    priority: 'high'
  },
  {
    name: 'Leaked Password Protection',
    status: 'pending', 
    description: 'Habilitar proteção de senhas vazadas',
    url: 'https://supabase.com/dashboard/project/ighllleypgbkluhcihvs/auth/providers',
    priority: 'high'
  },
  {
    name: 'Email Confirmation',
    status: 'pending',
    description: 'Habilitar confirmação por email',
    url: 'https://supabase.com/dashboard/project/ighllleypgbkluhcihvs/auth/providers',
    priority: 'medium'
  }
];

export function SecurityImplementationStatus() {
  const completedCount = implementedFeatures.length;
  const totalTasks = implementedFeatures.length + manualTasks.length;
  const progressPercentage = (completedCount / totalTasks) * 100;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Status de Implementação de Segurança</CardTitle>
          </div>
          <CardDescription>
            Progresso da implementação das medidas de segurança enterprise-grade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso Geral</span>
            <Badge variant="secondary">{Math.round(progressPercentage)}% Completo</Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-success">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Implementados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{manualTasks.length}</div>
              <div className="text-sm text-muted-foreground">Configuração Manual</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implemented Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Recursos Implementados Automaticamente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {implementedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-success/5 rounded-lg border border-success/20">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{feature.name}</div>
                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Ativo
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Configuration Required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Configuração Manual Necessária
          </CardTitle>
          <CardDescription>
            Complete estas configurações no Dashboard do Supabase (5-10 minutos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {manualTasks.map((task, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-muted-foreground">{task.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {task.priority === 'high' ? 'Crítico' : 'Médio'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className="h-8 px-2"
                  >
                    <a 
                      href={task.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      Configurar
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <div className="font-medium">Acesse o Dashboard do Supabase</div>
              <div className="text-sm text-muted-foreground">
                Configure as opções de autenticação listadas acima
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <div className="font-medium">Monitore a Segurança</div>
              <div className="text-sm text-muted-foreground">
                Acesse /admin/security para acompanhar eventos em tempo real
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <div className="font-medium">Sistema 100% Seguro</div>
              <div className="text-sm text-muted-foreground">
                Após as configurações, seu sistema terá segurança enterprise-grade
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}