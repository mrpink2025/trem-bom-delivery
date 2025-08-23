
import React from 'react';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { UserBlockNotification } from '@/components/orders/UserBlockNotification';
import { Skeleton } from '@/components/ui/skeleton';

interface CheckoutBlockCheckProps {
  children: React.ReactNode;
  onContactSupport?: () => void;
}

export function CheckoutBlockCheck({ children, onContactSupport }: CheckoutBlockCheckProps) {
  const { isBlocked, activeBlock, loading } = useUserBlocks();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isBlocked && activeBlock) {
    return (
      <div className="space-y-6">
        <UserBlockNotification 
          block={activeBlock} 
          onContactSupport={onContactSupport}
        />
      </div>
    );
  }

  return <>{children}</>;
}
