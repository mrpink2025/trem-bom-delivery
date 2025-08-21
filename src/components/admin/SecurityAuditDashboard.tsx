import React from 'react';
import { Shield, Play, RotateCcw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

export const SecurityAuditDashboard: React.FC = () => {
  const { auditState, runFullAudit, clearResults } = useSecurityAudit();

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ERROR':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getResultBadgeVariant = (result: string) => {
    switch (result) {
      case 'PASS':
        return 'default' as const;
      case 'FAIL':
        return 'destructive' as const;
      case 'ERROR':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Auditoria de Segurança RLS</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {auditState.results.length > 0 && (
            <Button
              variant="outline"
              onClick={clearResults}
              disabled={auditState.running}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
          <Button
            onClick={runFullAudit}
            disabled={auditState.running}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {auditState.running ? 'Executando...' : 'Executar Auditoria'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditState.summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Passou
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {auditState.summary.passed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Falhou
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {auditState.summary.failed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {auditState.summary.errors}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {auditState.running && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da Auditoria</span>
                <span>{auditState.progress}%</span>
              </div>
              <Progress value={auditState.progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {auditState.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {auditState.results.map((result, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      {getResultIcon(result.result)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{result.test.name}</h4>
                          <Badge variant={getResultBadgeVariant(result.result)}>
                            {result.result}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {result.test.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Tabela: {result.test.table}</span>
                          <span>Operação: {result.test.operation}</span>
                          <span>Esperado: {result.test.expected}</span>
                          <span>Tempo: {result.executionTime}ms</span>
                        </div>
                        {result.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <strong>Erro:</strong> {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Segurança</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">RLS Habilitado</h4>
                <p className="text-sm text-muted-foreground">
                  Verifique se todas as tabelas sensíveis têm Row Level Security habilitado.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Políticas Restritivas</h4>
                <p className="text-sm text-muted-foreground">
                  Garanta que as políticas seguem o princípio do menor privilégio.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Testes Regulares</h4>
                <p className="text-sm text-muted-foreground">
                  Execute esta auditoria regularmente, especialmente após mudanças no banco.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};