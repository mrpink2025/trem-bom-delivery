import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Zap } from 'lucide-react';

const SubscriptionBadge = () => {
  const { subscription } = useAuth();

  if (!subscription?.subscribed) {
    return null;
  }

  const getIcon = () => {
    switch (subscription.subscription_tier) {
      case 'Básico':
        return <Star className="w-3 h-3" />;
      case 'Premium':
        return <Crown className="w-3 h-3" />;
      case 'Empresarial':
        return <Zap className="w-3 h-3" />;
      default:
        return <Star className="w-3 h-3" />;
    }
  };

  const getVariant = () => {
    switch (subscription.subscription_tier) {
      case 'Básico':
        return 'secondary' as const;
      case 'Premium':
        return 'default' as const;
      case 'Empresarial':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getBgClass = () => {
    switch (subscription.subscription_tier) {
      case 'Básico':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Premium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Empresarial':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={getVariant()}
      className={`flex items-center gap-1 ${getBgClass()} shadow-sm`}
    >
      {getIcon()}
      <span className="font-medium">{subscription.subscription_tier}</span>
    </Badge>
  );
};

export default SubscriptionBadge;