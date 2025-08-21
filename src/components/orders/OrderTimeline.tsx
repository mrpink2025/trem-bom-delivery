import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Truck, ChefHat, Package, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrderStatusHistory } from '@/hooks/useOrderStateMachine';

interface OrderTimelineProps {
  currentStatus: string;
  statusHistory: OrderStatusHistory[] | null;
  createdAt: string;
  progress: number;
  statusLabels: Record<string, string>;
  statusFlow: string[];
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'placed': MapPin,
  'confirmed': CheckCircle,
  'preparing': ChefHat,
  'ready': Package,
  'out_for_delivery': Truck,
  'delivered': CheckCircle,
  'cancelled': XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  'placed': 'bg-blue-100 text-blue-800 border-blue-200',
  'confirmed': 'bg-green-100 text-green-800 border-green-200',
  'preparing': 'bg-orange-100 text-orange-800 border-orange-200',
  'ready': 'bg-purple-100 text-purple-800 border-purple-200',
  'out_for_delivery': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'cancelled': 'bg-red-100 text-red-800 border-red-200',
};

export function OrderTimeline({
  currentStatus,
  statusHistory = [],
  createdAt,
  progress,
  statusLabels,
  statusFlow
}: OrderTimelineProps) {
  // Criar histórico completo incluindo criação do pedido
  const fullHistory = [
    {
      status: 'placed',
      timestamp: createdAt,
      user_id: null
    },
    ...(statusHistory || [])
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Remover duplicatas baseadas no status
  const uniqueHistory = fullHistory.filter((item, index, arr) => 
    arr.findIndex(h => h.status === item.status) === index
  );

  const getStepStatus = (stepStatus: string) => {
    const stepIndex = statusFlow.indexOf(stepStatus);
    const currentIndex = statusFlow.indexOf(currentStatus);
    
    if (currentStatus === 'cancelled') {
      return uniqueHistory.some(h => h.status === stepStatus) ? 'completed' : 'pending';
    }
    
    if (stepIndex <= currentIndex) return 'completed';
    return 'pending';
  };

  const getStatusTime = (status: string) => {
    const historyItem = uniqueHistory.find(h => h.status === status);
    return historyItem ? new Date(historyItem.timestamp) : null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline do Pedido
        </CardTitle>
        {currentStatus !== 'cancelled' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusFlow.map((status, index) => {
            const stepStatus = getStepStatus(status);
            const statusTime = getStatusTime(status);
            const Icon = STATUS_ICONS[status] || Clock;
            const isActive = status === currentStatus;
            const isCompleted = stepStatus === 'completed';
            const isPending = stepStatus === 'pending';

            return (
              <div key={status} className="flex items-start gap-4">
                {/* Ícone e linha */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                      ${isCompleted 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : isActive
                        ? 'bg-primary/20 text-primary border-primary'
                        : 'bg-muted text-muted-foreground border-muted-foreground/30'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < statusFlow.length - 1 && (
                    <div
                      className={`
                        w-0.5 h-8 mt-2 transition-all
                        ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}
                      `}
                    />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                      {statusLabels[status] || status}
                    </h4>
                    <Badge 
                      variant={isCompleted ? 'default' : isPending ? 'secondary' : 'outline'}
                      className={STATUS_COLORS[status]}
                    >
                      {isCompleted ? 'Concluído' : isActive ? 'Atual' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  {statusTime && (
                    <p className="text-sm text-muted-foreground">
                      {format(statusTime, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  
                  {isActive && !isCompleted && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Em andamento...
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {currentStatus === 'cancelled' && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 bg-destructive text-destructive-foreground border-destructive">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-destructive">Pedido Cancelado</h4>
                  <Badge variant="destructive">Cancelado</Badge>
                </div>
                {getStatusTime('cancelled') && (
                  <p className="text-sm text-muted-foreground">
                    {format(getStatusTime('cancelled')!, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}