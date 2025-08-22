import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  FileText,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string; // Changed from union type to string
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  description: string;
  metadata: any;
  created_at: string;
}

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  recent_events: number;
  unique_users: number;
  blocked_attempts: number;
}

export const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load recent security events from audit_logs
      const { data: eventsData, error: eventsError } = await supabase
        .from('audit_logs')
        .select('id, table_name, operation, new_values, user_id, timestamp')
        .or('operation.ilike.%SECURITY%,operation.ilike.%SUSPICIOUS%,operation.ilike.%BLOCKED%')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // Transform audit logs to security events format
      const transformedEvents = eventsData?.map(log => ({
        id: log.id,
        event_type: log.operation,
        severity: getSeverityFromOperation(log.operation),
        user_id: log.user_id,
        ip_address: null,
        user_agent: null,
        description: `${log.operation.replace(/_/g, ' ')} - ${log.table_name}`,
        metadata: log.new_values,
        created_at: log.timestamp
      })) || [];

      setEvents(transformedEvents);

      // Calculate metrics
      const now = new Date();
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      const recentEvents = transformedEvents?.filter(event => 
        new Date(event.created_at) > last24Hours
      ) || [];

      const uniqueUsers = [...new Set(
        transformedEvents?.map(event => event.user_id).filter(Boolean) || []
      )].length;

      const blockedAttempts = transformedEvents?.filter(event => 
        event.event_type.includes('BLOCKED') || 
        event.event_type.includes('RATE_LIMIT') ||
        event.event_type.includes('SUSPICIOUS')
      ).length || 0;

      setMetrics({
        total_events: transformedEvents?.length || 0,
        critical_events: transformedEvents?.filter(e => e.severity === 'critical').length || 0,
        high_events: transformedEvents?.filter(e => e.severity === 'high').length || 0,
        medium_events: transformedEvents?.filter(e => e.severity === 'medium').length || 0,
        low_events: transformedEvents?.filter(e => e.severity === 'low').length || 0,
        recent_events: recentEvents.length,
        unique_users: uniqueUsers,
        blocked_attempts: blockedAttempts
      });

    } catch (error: any) {
      console.error('❌ Error loading security data:', error);
      toast.error('Erro ao carregar dados de segurança: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityFromOperation = (operation: string): string => {
    if (operation.includes('SUSPICIOUS') || operation.includes('BLOCKED')) {
      return 'high';
    }
    if (operation.includes('RATE_LIMIT') || operation.includes('FAILED')) {
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Eye className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const exportSecurityReport = async () => {
    try {
      const reportData = {
        generated_at: new Date().toISOString(),
        metrics,
        events: events.slice(0, 50), // Last 50 events
        period: '30 days'
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Relatório de segurança exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando dados de segurança...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Dashboard de Segurança</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadSecurityData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            onClick={exportSecurityReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Eventos Totais</p>
                <p className="text-2xl font-bold">{metrics?.total_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Eventos Críticos</p>
                <p className="text-2xl font-bold text-red-500">{metrics?.critical_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários Únicos</p>
                <p className="text-2xl font-bold">{metrics?.unique_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tentativas Bloqueadas</p>
                <p className="text-2xl font-bold">{metrics?.blocked_attempts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Eventos de Segurança</TabsTrigger>
          <TabsTrigger value="details">Detalhes do Evento</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Eventos Recentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(event.severity)}
                      <div>
                        <p className="font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum evento de segurança registrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedEvent ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getSeverityIcon(selectedEvent.severity)}
                  <span>Detalhes do Evento</span>
                  <Badge className={getSeverityColor(selectedEvent.severity)}>
                    {selectedEvent.severity}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações Básicas</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Tipo:</strong> {selectedEvent.event_type.replace(/_/g, ' ')}</p>
                      <p><strong>Descrição:</strong> {selectedEvent.description}</p>
                      <p><strong>Data:</strong> {new Date(selectedEvent.created_at).toLocaleString()}</p>
                      {selectedEvent.user_id && (
                        <p><strong>Usuário:</strong> {selectedEvent.user_id}</p>
                      )}
                      {selectedEvent.ip_address && (
                        <p><strong>IP:</strong> {selectedEvent.ip_address}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Metadados</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
                
                {selectedEvent.user_agent && (
                  <div>
                    <h4 className="font-medium mb-2">User Agent</h4>
                    <p className="text-sm bg-muted p-2 rounded">
                      {selectedEvent.user_agent}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Selecione um evento na lista para ver os detalhes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};