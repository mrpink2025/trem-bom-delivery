import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileDashboardWrapperProps {
  children: ReactNode;
  className?: string;
}

export const MobileDashboardWrapper = ({ 
  children, 
  className 
}: MobileDashboardWrapperProps) => {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      // Mobile-first container with proper spacing
      "px-2 sm:px-4 lg:px-6",
      "py-3 sm:py-6",
      // Ensure good scroll behavior
      "scroll-smooth-mobile",
      className
    )}>
      <div className={cn(
        "mx-auto max-w-7xl",
        // Mobile layout spacing
        "space-y-3 sm:space-y-6 lg:space-y-8"
      )}>
        {children}
      </div>
    </div>
  );
};

interface MobileDashboardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const MobileDashboardHeader = ({
  title,
  description,
  actions,
  className
}: MobileDashboardHeaderProps) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-start sm:items-center justify-between",
      "gap-3 sm:gap-4",
      className
    )}>
      <div className="space-y-1 flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

interface MobileDashboardGridProps {
  children: ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: string;
  className?: string;
}

export const MobileDashboardGrid = ({
  children,
  columns = { default: 1, sm: 2, lg: 4 },
  gap = "gap-3 sm:gap-4 lg:gap-6",
  className
}: MobileDashboardGridProps) => {
  const gridCols = [
    `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(
      "grid",
      gridCols,
      gap,
      className
    )}>
      {children}
    </div>
  );
};

interface MobileTabsWrapperProps {
  children: ReactNode;
  className?: string;
}

export const MobileTabsWrapper = ({
  children,
  className
}: MobileTabsWrapperProps) => {
  return (
    <div className={cn(
      "w-full",
      "overflow-x-auto",
      "mobile-tabs",
      // Add scrollbar styling for better UX
      "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
      className
    )}>
      {children}
    </div>
  );
};