import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  className,
  loadingText = "Carregando..." 
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="text-center space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function LoadingSpinner({ 
  size = "default", 
  className 
}: { 
  size?: "sm" | "default" | "lg"; 
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <RefreshCw 
      className={cn(
        "animate-spin text-primary", 
        sizeClasses[size], 
        className
      )} 
    />
  );
}

export function FullPageLoader({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{text}</h2>
          <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
        </div>
      </div>
    </div>
  );
}