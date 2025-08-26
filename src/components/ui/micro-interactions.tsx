import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  children,
  className,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 w-14 h-14 rounded-full",
        "bg-gradient-to-r from-primary to-primary/80",
        "text-white shadow-premium hover:shadow-glow",
        "transition-all duration-300 hover:scale-110",
        "flex items-center justify-center",
        "animate-bounce-in z-50",
        className
      )}
    >
      {children}
    </button>
  );
};

interface PulseElementProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export const PulseElement: React.FC<PulseElementProps> = ({
  children,
  className,
  intensity = 'medium'
}) => {
  const pulseIntensity = {
    subtle: 'animate-pulse',
    medium: 'animate-glow',
    strong: 'animate-bounce'
  };

  return (
    <div className={cn(pulseIntensity[intensity], className)}>
      {children}
    </div>
  );
};

interface HoverRevealProps {
  children: React.ReactNode;
  revealContent: React.ReactNode;
  className?: string;
}

export const HoverReveal: React.FC<HoverRevealProps> = ({
  children,
  revealContent,
  className
}) => {
  return (
    <div className={cn("group relative overflow-hidden", className)}>
      <div className="transition-all duration-300 group-hover:-translate-y-2">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-spring">
        {revealContent}
      </div>
    </div>
  );
};

interface GlassBubbleProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
}

export const GlassBubble: React.FC<GlassBubbleProps> = ({
  children,
  className,
  variant = 'light'
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border backdrop-blur-md transition-all duration-300",
        "hover:scale-105 hover:shadow-floating",
        variant === 'light' ? 'glass' : 'glass-dark',
        className
      )}
    >
      {children}
    </div>
  );
};

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({
  children,
  className
}) => {
  return (
    <span
      className={cn(
        "relative inline-block",
        "before:absolute before:inset-0 before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:translate-x-[-100%]",
        className
      )}
    >
      {children}
    </span>
  );
};

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  placeholderSrc
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      
      {/* Main image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "transition-all duration-700",
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
          className
        )}
      />
      
      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl mb-2">🖼️</div>
            <p className="text-sm">Imagem não disponível</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatusIndicatorProps {
  status: 'online' | 'busy' | 'offline';
  className?: string;
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  className,
  showLabel = false
}) => {
  const statusConfig = {
    online: { color: 'bg-success', label: 'Online', pulse: true },
    busy: { color: 'bg-warning', label: 'Ocupado', pulse: false },
    offline: { color: 'bg-muted-foreground', label: 'Offline', pulse: false }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <div className={cn("w-3 h-3 rounded-full", config.color)} />
        {config.pulse && (
          <div className={cn("absolute inset-0 w-3 h-3 rounded-full animate-ping", config.color, "opacity-75")} />
        )}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </div>
  );
};