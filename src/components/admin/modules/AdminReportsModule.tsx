import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminReportsModule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios e KPIs</h1>
        <p className="text-muted-foreground">
          Análises detalhadas e métricas da plataforma
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