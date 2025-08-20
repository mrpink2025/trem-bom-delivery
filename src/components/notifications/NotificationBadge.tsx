import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function NotificationBadge({ children, className }: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();

  return (
    <div className={`relative ${className}`}>
      {children}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  );
}