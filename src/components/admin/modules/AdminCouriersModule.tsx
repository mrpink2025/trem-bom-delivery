import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCouriersModule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Motoboys</h1>
        <p className="text-muted-foreground">
          Módulo de aprovação KYC e gestão de couriers
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Este módulo está sendo desenvolvido.</p>
        </CardContent>
      </Card>
    </div>
  );
}