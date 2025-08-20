import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  Database, 
  Shield,
  Bug
} from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  type?: 'network' | 'database' | 'permission' | 'bug' | 'generic';
  className?: string;
}

export function ErrorState({ 
  title, 
  description, 
  action, 
  type = 'generic',
  className 
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <Wifi className="w-12 h-12 text-muted-foreground" />;
      case 'database':
        return <Database className="w-12 h-12 text-muted-foreground" />;
      case 'permission':
        return <Shield className="w-12 h-12 text-muted-foreground" />;
      case 'bug':
        return <Bug className="w-12 h-12 text-muted-foreground" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'network':
        return 'Erro de Conexão';
      case 'database':
        return 'Erro no Banco de Dados';
      case 'permission':
        return 'Acesso Negado';
      case 'bug':
        return 'Algo deu errado';
      default:
        return 'Erro Inesperado';
    }
  };

  const getDefaultDescription = () => {
    switch (type) {
      case 'network':
        return 'Verifique sua conexão com a internet e tente novamente.';
      case 'database':
        return 'Não foi possível acessar os dados. Tente novamente em alguns instantes.';
      case 'permission':
        return 'Você não tem permissão para acessar este recurso.';
      case 'bug':
        return 'Ocorreu um erro inesperado. Nossa equipe foi notificada.';
      default:
        return 'Algo deu errado. Tente recarregar a página.';
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          {getIcon()}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {title || getDefaultTitle()}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {description || getDefaultDescription()}
            </p>
          </div>
          {action && (
            <Button 
              onClick={action.onClick} 
              disabled={action.loading}
              variant="outline"
            >
              {action.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                action.label
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized error states
export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState 
      type="network"
      action={{
        label: "Tentar Novamente",
        onClick: onRetry
      }}
    />
  );
}

export function DatabaseError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState 
      type="database"
      action={{
        label: "Recarregar Dados",
        onClick: onRetry
      }}
    />
  );
}

export function PermissionError() {
  return (
    <ErrorState 
      type="permission"
      title="Acesso Restrito"
      description="Entre em contato com o administrador para obter acesso a este recurso."
    />
  );
}

export function EmptyState({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description: string; 
  action?: { label: string; onClick: () => void } 
}) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {description}
            </p>
          </div>
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}