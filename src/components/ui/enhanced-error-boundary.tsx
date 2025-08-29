import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: Math.random().toString(36).substr(2, 9)
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
        error_id: this.state.errorId
      });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: '' 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
          <Card className="w-full max-w-2xl border-destructive/50 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                {/* Error Icon */}
                <div className="relative">
                  <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Badge variant="destructive" className="text-xs">
                      Erro #{this.state.errorId}
                    </Badge>
                  </div>
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    Ops! Algo deu errado
                  </h1>
                  <p className="text-muted-foreground">
                    Encontramos um problema inesperado. Nossa equipe foi notificada 
                    e está trabalhando para resolver.
                  </p>
                </div>

                {/* Error Details */}
                {this.props.showDetails && this.state.error && (
                  <details className="text-left bg-muted/50 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-sm mb-2 flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Detalhes técnicos
                    </summary>
                    <div className="text-xs font-mono bg-background rounded p-3 overflow-auto">
                      <div className="mb-2">
                        <strong>Erro:</strong> {this.state.error.message}
                      </div>
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={this.handleRetry} 
                    className="gap-2"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload} 
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recarregar Página
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome} 
                    variant="ghost"
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Ir para Início
                  </Button>
                </div>

                {/* Help Text */}
                <div className="text-xs text-muted-foreground">
                  Se o problema persistir, entre em contato conosco informando o código do erro: 
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">
                    #{this.state.errorId}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
interface UseErrorBoundaryReturn {
  showError: (error: Error) => void;
  resetError: () => void;
}

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const [error, setError] = React.useState<Error | null>(null);

  const showError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { showError, resetError };
};

// HOC version
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}