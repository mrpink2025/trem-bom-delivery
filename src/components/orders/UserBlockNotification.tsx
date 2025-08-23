
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Clock, 
  Ban, 
  Calendar,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserBlock {
  id: string;
  user_id: string;
  block_type: string;
  blocked_at: string;
  blocked_until: string;
  reason: string;
  cancelled_orders_count: number;
  is_active: boolean;
}

interface UserBlockNotificationProps {
  block: UserBlock;
  onContactSupport?: () => void;
}

export function UserBlockNotification({ block, onContactSupport }: UserBlockNotificationProps) {
  const blockedUntil = new Date(block.blocked_until);
  const isExpired = blockedUntil <= new Date();

  if (isExpired) return null;

  const getBlockTypeInfo = (type: string) => {
    switch (type) {
      case 'PAYMENT_ISSUES':
        return {
          title: 'Problemas de Pagamento',
          icon: AlertTriangle,
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        };
      default:
        return {
          title: 'Bloqueio Temporário',
          icon: Ban,
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
    }
  };

  const blockInfo = getBlockTypeInfo(block.block_type);
  const BlockIcon = blockInfo.icon;

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <BlockIcon className="w-5 h-5 text-orange-600" />
          <span className="text-orange-800 dark:text-orange-200">
            Conta Temporariamente Bloqueada
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Novos pedidos suspensos</AlertTitle>
          <AlertDescription className="mt-2">
            {block.reason}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={blockInfo.color}>
              {blockInfo.title}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Bloqueado até: {blockedUntil.toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-orange-600" />
          <span className="text-orange-700 dark:text-orange-300">
            Tempo restante: {formatDistanceToNow(blockedUntil, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
        </div>

        {block.cancelled_orders_count > 0 && (
          <div className="text-sm text-muted-foreground">
            <strong>Pedidos cancelados nas últimas 24h:</strong> {block.cancelled_orders_count}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Durante o período de bloqueio, você não poderá criar novos pedidos. 
            Esta medida visa melhorar a experiência para todos os usuários.
          </p>
          
          {onContactSupport && (
            <Button 
              variant="outline" 
              onClick={onContactSupport}
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Entrar em Contato com o Suporte
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
