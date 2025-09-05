import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

interface SecurityMetrics {
  failed_logins: number;
  blocked_ips: number;
  active_sessions: number;
  recent_events: SecurityEvent[];
}

export function SecurityMonitor() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failed_logins: 0,
    blocked_ips: 0,
    active_sessions: 0,
    recent_events: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityMetrics();
    
    // Set up real-time monitoring
    const interval = setInterval(loadSecurityMetrics, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      // Get blocked IPs count
      const { count: blockedIpsCount } = await supabase
        .from('blocked_ips')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get recent audit logs for security events
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .in('operation', ['SECURITY_VALIDATION', 'LOGIN_FAILED', 'SUSPICIOUS_ACTIVITY'])
        .order('timestamp', { ascending: false })
        .limit(10);

      // Transform audit logs to security events
      const securityEvents: SecurityEvent[] = (auditLogs || []).map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        event_type: log.operation,
        severity: determineSeverity(log.operation),
        details: log.new_values
      }));

      setMetrics({
        failed_logins: auditLogs?.filter(log => log.operation === 'LOGIN_FAILED').length || 0,
        blocked_ips: blockedIpsCount || 0,
        active_sessions: 0, // Would need session tracking
        recent_events: securityEvents
      });

      // Check for critical events
      const criticalEvents = securityEvents.filter(e => e.severity === 'critical');
      if (criticalEvents.length > 0) {
        toast({
          title: "Alerta de Segurança Crítico",
          description: `${criticalEvents.length} evento(s) de segurança crítico(s) detectado(s)`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erro ao carregar métricas de segurança:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineSeverity = (operation: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (operation) {
      case 'LOGIN_FAILED':
        return 'medium';
      case 'SUSPICIOUS_ACTIVITY':
        return 'high';
      case 'SECURITY_VALIDATION':
        return 'critical';
      default:
        return 'low';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitor de Segurança
          </CardTitle>
          <CardDescription>Carregando métricas de segurança...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitor de Segurança
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real de eventos de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-destructive">{metrics.failed_logins}</div>
              <div className="text-sm text-muted-foreground">Tentativas de Login Falharam</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-destructive">{metrics.blocked_ips}</div>
              <div className="text-sm text-muted-foreground">IPs Bloqueados</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{metrics.active_sessions}</div>
              <div className="text-sm text-muted-foreground">Sessões Ativas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos de Segurança Recentes</CardTitle>
          <CardDescription>
            Últimos 10 eventos de segurança detectados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recent_events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
              <p>Nenhum evento de segurança recente detectado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.recent_events.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(event.severity)}
                    <div>
                      <div className="font-medium">{event.event_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getSeverityColor(event.severity) as any}>
                    {event.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}