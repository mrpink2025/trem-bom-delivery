import { useParams } from 'react-router-dom';
import { RealTimeDelivery } from '@/components/delivery/RealTimeDelivery';

const TrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Pedido não encontrado</h1>
          <p className="text-muted-foreground mt-2">
            ID do pedido inválido ou não fornecido
          </p>
        </div>
      </div>
    );
  }

  return <RealTimeDelivery orderId={orderId} />;
};

export default TrackingPage;