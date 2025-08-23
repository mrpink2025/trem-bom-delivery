import React from 'react';
import { OrderStatusDashboard } from '@/components/orders/OrderStatusDashboard';

export default function OrdersDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <OrderStatusDashboard />
      </div>
    </div>
  );
}