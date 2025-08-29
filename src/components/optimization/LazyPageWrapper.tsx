import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingCard, ErrorState } from '@/components/ui/enhanced-loading';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyPageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  preload?: boolean;
  threshold?: number;
}

// Enhanced lazy loading with intersection observer
export const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  preload = false,
  threshold = 0.1
}) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold,
    triggerOnce: true
  });

  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoadingCard 
        title="Carregando página..."
        description="Preparando conteúdo para você"
        className="w-full max-w-md"
      />
    </div>
  );

  const defaultErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState
        title="Erro ao carregar página"
        description={error.message || "Não foi possível carregar esta página"}
        onRetry={resetErrorBoundary}
        className="w-full max-w-md"
      />
    </div>
  );

  if (!preload && !isIntersecting) {
    return <div ref={ref} className="min-h-screen" />;
  }

  return (
    <ErrorBoundary 
      FallbackComponent={typeof errorFallback === 'function' ? errorFallback : defaultErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Factory function for creating lazy-loaded pages
export const createLazyPage = <P extends object = {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    preload?: boolean;
  }
) => {
  const LazyComponent = lazy(importFunc);
  
  return React.memo((props: P) => (
    <LazyPageWrapper
      fallback={options?.fallback}
      errorFallback={options?.errorFallback}
      preload={options?.preload}
    >
      <LazyComponent {...(props as any)} />
    </LazyPageWrapper>
  ));
};

// Specific page loaders with optimized fallbacks
export const LazyAdminPage = createLazyPage(
  () => import('@/pages/AdminPanel'),
  {
    fallback: (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingCard 
            title="Carregando painel administrativo..."
            description="Inicializando ferramentas de gestão"
            variant="skeleton"
          />
        </div>
      </div>
    )
  }
);

export const LazyProfilePage = createLazyPage(
  () => import('@/pages/Profile'),
  {
    fallback: (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingCard 
            title="Carregando perfil..."
            description="Buscando informações do usuário"
            variant="skeleton"
          />
        </div>
      </div>
    )
  }
);

export const LazyMenuPage = createLazyPage(
  () => import('@/pages/MenuPage'),
  {
    fallback: (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-muted rounded-lg h-64" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
);

export const LazyCheckoutPage = createLazyPage(
  () => import('@/pages/CheckoutPage'),
  {
    fallback: (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingCard 
            title="Preparando checkout..."
            description="Calculando valores e validando pedido"
            variant="skeleton"
          />
        </div>
      </div>
    )
  }
);

export const LazyTrackingPage = createLazyPage(
  () => import('@/pages/TrackingPage'),
  {
    fallback: (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <LoadingCard 
            title="Carregando rastreamento..."
            description="Localizando seu pedido"
            variant="skeleton"
          />
        </div>
      </div>
    ),
    preload: true // Preload tracking as it's time-sensitive
  }
);

// Component preloader utility
export const preloadComponent = (importFunc: () => Promise<any>) => {
  const componentImport = importFunc();
  return componentImport;
};

// Batch preloader for multiple components
export const preloadComponents = (importFuncs: (() => Promise<any>)[]) => {
  return Promise.all(importFuncs.map(func => func()));
};

// Route-based preloading
export const useRoutePreloader = () => {
  React.useEffect(() => {
    const preloadOnIdle = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          // Preload commonly accessed routes
          preloadComponents([
            () => import('@/pages/Profile'),
            () => import('@/pages/MenuPage'),
            () => import('@/components/admin/AdminDashboard')
          ]);
        });
      }
    };

    // Preload after initial render
    setTimeout(preloadOnIdle, 2000);
  }, []);
};