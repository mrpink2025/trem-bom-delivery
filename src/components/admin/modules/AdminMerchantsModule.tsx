import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminMerchantsModule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Lojistas</h1>
        <p className="text-muted-foreground">
          Módulo de aprovação KYB e gestão de lojistas
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