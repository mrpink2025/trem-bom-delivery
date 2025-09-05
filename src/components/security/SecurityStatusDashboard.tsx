import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Users, Ban } from 'lucide-react';
import { toast } from 'sonner';

interface SecurityMetrics {
  failed_logins_24h: number;
  blocked_ips_24h: number;
  active_users_1h: number;
  total_blocked_ips: number;
  last_updated: string;
}

interface SecurityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export default function SecurityStatusDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [securityScore, setSecurityScore] = useState<number>(0);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      // Get security metrics with fallback calculation
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('operation, timestamp')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: blockedData } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true);

      const metricsData: SecurityMetrics = {
        failed_logins_24h: auditData?.filter(log => log.operation.includes('FAILED_LOGIN')).length || 0,
        blocked_ips_24h: auditData?.filter(log => log.operation === 'BLOCKED_IP').length || 0,
        active_users_1h: auditData?.filter(log => 
          new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ).length || 0,
        total_blocked_ips: blockedData?.length || 0,
        last_updated: new Date().toISOString()
      };

      setMetrics(metricsData);

      // Calculate security score
      let score = 100;
      if (metricsData.failed_logins_24h > 10) score -= 20;
      if (metricsData.total_blocked_ips > 5) score -= 15;
      if (metricsData.blocked_ips_24h > 3) score -= 10;
      setSecurityScore(Math.max(0, score));

      // Get recent security alerts from audit logs
      const { data: alertsData, error: alertsError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('operation', ['FAILED_LOGIN', 'BLOCKED_IP', 'SECURITY_VIOLATION', 'SUSPICIOUS_ACTIVITY'])
        .order('timestamp', { ascending: false })
        .limit(10);

      if (alertsError) {
        console.error('Error loading security alerts:', alertsError);
      } else {
        const formattedAlerts: SecurityAlert[] = (alertsData || []).map(alert => ({
          id: alert.id,
          type: alert.operation.includes('FAILED') ? 'warning' : 
                alert.operation.includes('BLOCKED') ? 'critical' : 'info',
          message: `${alert.operation}: ${alert.table_name || 'System'}`,
          timestamp: alert.timestamp
        }));
        setAlerts(formattedAlerts);
      }

    } catch (error) {
      console.error('Security data loading error:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return ShieldCheck;
    if (score >= 70) return Shield;
    return ShieldAlert;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return ShieldAlert;
      case 'warning': return AlertTriangle;
      default: return Shield;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const ScoreIcon = getScoreIcon(securityScore);

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScoreIcon className="w-6 h-6" />
            Security Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-3xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}%
              </div>
              <p className="text-sm text-muted-foreground">Security Score</p>
            </div>
            <Badge variant={securityScore >= 90 ? 'default' : securityScore >= 70 ? 'secondary' : 'destructive'}>
              {securityScore >= 90 ? 'Excellent' : securityScore >= 70 ? 'Good' : 'Needs Attention'}
            </Badge>
          </div>
          
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-semibold">{metrics.failed_logins_24h}</div>
                <div className="text-xs text-muted-foreground">Failed Logins (24h)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-semibold">{metrics.total_blocked_ips}</div>
                <div className="text-xs text-muted-foreground">Blocked IPs</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-semibold">{metrics.active_users_1h}</div>
                <div className="text-xs text-muted-foreground">Active Users (1h)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-semibold">{metrics.blocked_ips_24h}</div>
                <div className="text-xs text-muted-foreground">New Blocks (24h)</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No security alerts in the last 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const AlertIcon = getAlertIcon(alert.type);
                return (
                  <Alert key={alert.id} className="p-3">
                    <AlertIcon className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{alert.message}</span>
                      <Badge variant={getAlertVariant(alert.type) as any}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Badge>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityScore < 90 && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your security score can be improved. Consider reviewing authentication settings and monitoring for unusual activity patterns.
              </AlertDescription>
            </Alert>
          )}
          
          {metrics && metrics.failed_logins_24h > 10 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                High number of failed login attempts detected. Consider implementing additional rate limiting.
              </AlertDescription>
            </Alert>
          )}
          
          {metrics && metrics.total_blocked_ips > 5 && (
            <Alert className="border-red-200 bg-red-50">
              <Ban className="h-4 w-4 text-red-600" />
              <AlertDescription>
                Multiple IPs have been blocked. Review the blocked IP list to ensure legitimate users aren't affected.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}