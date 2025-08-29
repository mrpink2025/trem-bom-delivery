import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'skeleton';
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  title = "Carregando...",
  description = "Aguarde enquanto buscamos os dados",
  variant = 'default',
  className = ''
}) => {
  if (variant === 'skeleton') {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-dashed border-muted ${className}`}>
      <CardContent className="p-8 text-center">
        <LoadingSpinner size="lg" />
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Ops! Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  onRetry,
  retryText = "Tentar novamente",
  className = ''
}) => {
  return (
    <Card className={`border-destructive/50 bg-destructive/5 ${className}`}>
      <CardContent className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <div className="space-y-2 mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {retryText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Nenhum item encontrado",
  description = "Não há dados para exibir no momento.",
  action,
  icon,
  className = ''
}) => {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="p-8 text-center">
        {icon && <div className="mb-4">{icon}</div>}
        <div className="space-y-2 mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

interface ProgressLoadingProps {
  progress: number;
  title?: string;
  description?: string;
  className?: string;
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
  progress,
  title = "Processando...",
  description,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton components for different layouts
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-20 h-8" />
      </div>
    ))}
  </div>
);

export const GridSkeleton: React.FC<{ items?: number; cols?: number }> = ({ 
  items = 6, 
  cols = 3 
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>
    {Array.from({ length: items }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);