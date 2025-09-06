import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  operation: string;
  table_name: string;
  timestamp: string;
  user_id?: string;
  ip_address?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface SecurityMetrics {
  failed_logins_24h: number;
  blocked_ips_24h: number;
  active_users_1h: number;
  total_blocked_ips: number;
  security_score: number;
  last_updated: string;
}

interface ThreatDetection {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  details?: any;
}

export function useSecurityMonitor() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load security metrics
  const loadMetrics = useCallback(async () => {
    try {
      // Get audit log data for calculations
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('operation, timestamp, user_id')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: blockedData } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true);

      const failed_logins_24h = auditData?.filter(log => log.operation.includes('FAILED_LOGIN')).length || 0;
      const blocked_ips_24h = auditData?.filter(log => log.operation === 'BLOCKED_IP').length || 0;
      const active_users_1h = new Set(
        auditData?.filter(log => 
          new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ).map(log => log.user_id)
      ).size || 0;
      const total_blocked_ips = blockedData?.length || 0;

      // Calculate security score based on metrics
      let score = 100;
      if (failed_logins_24h > 20) score -= 30;
      else if (failed_logins_24h > 10) score -= 15;
      
      if (total_blocked_ips > 10) score -= 20;
      else if (total_blocked_ips > 5) score -= 10;
      
      if (blocked_ips_24h > 5) score -= 15;

      setMetrics({
        failed_logins_24h,
        blocked_ips_24h,
        active_users_1h,
        total_blocked_ips,
        security_score: Math.max(0, score),
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load security metrics:', error);
    }
  }, []);

  // Load recent security events
  const loadEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('operation', ['FAILED_LOGIN', 'BLOCKED_IP', 'SECURITY_VIOLATION', 'SUSPICIOUS_ACTIVITY', 'HIGH_RISK_INPUT_DETECTED'])
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading security events:', error);
        return;
      }

      const formattedEvents: SecurityEvent[] = (data || []).map(event => ({
        id: event.id,
        operation: event.operation,
        table_name: event.table_name || 'unknown',
        timestamp: event.timestamp,
        user_id: event.user_id,
        ip_address: event.ip_address?.toString() || 'unknown',
        severity: event.operation.includes('CRITICAL') ? 'CRITICAL' : 
                 event.operation.includes('FAILED') ? 'WARNING' : 'INFO'
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  }, []);

  // Analyze threats using advanced database functions
  const analyzeThreats = useCallback(async () => {
    if (!events || events.length === 0) return;

    try {
      // Use the enhanced security monitor to detect anomalous patterns
      const { data: anomalies, error } = await supabase.functions.invoke('enhanced-security-monitor', {
        body: { action: 'detect_anomalous_access' }
      });

      if (error) {
        console.error('Failed to detect anomalies:', error);
        return;
      }

      const detectedThreats: ThreatDetection[] = [];

      // Convert anomalies to threat format
      if (anomalies?.anomalies) {
        anomalies.anomalies.forEach((anomaly: any) => {
          detectedThreats.push({
            type: anomaly.anomaly_type,
            severity: anomaly.risk_score > 70 ? 'critical' : anomaly.risk_score > 50 ? 'high' : 'medium',
            description: `${anomaly.anomaly_type}: Risk Score ${anomaly.risk_score}`,
            timestamp: new Date().toISOString(),
            details: anomaly.details
          });
        });
      }

      // Traditional threat detection as fallback
      const recentEvents = events.filter(event => {
        const eventTime = new Date(event.timestamp);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return eventTime > oneHourAgo;
      });

      // Group events by IP address
      const eventsByIP = recentEvents.reduce((acc: Record<string, any[]>, event) => {
        if (event.ip_address) {
          if (!acc[event.ip_address]) acc[event.ip_address] = [];
          acc[event.ip_address].push(event);
        }
        return acc;
      }, {});

      // Detect brute force attempts
      Object.entries(eventsByIP).forEach(([ip, ipEvents]) => {
        if (ipEvents.length > 10) {
          detectedThreats.push({
            type: 'brute_force',
            severity: ipEvents.length > 20 ? 'critical' : 'high',
            description: `${ipEvents.length} operations from IP ${ip} in the last hour`,
            timestamp: new Date().toISOString(),
            details: { ip_address: ip, event_count: ipEvents.length }
          });
        }
      });

      // Detect potential injection attempts
      const injectionEvents = recentEvents.filter(event => 
        event.operation.includes('INJECTION') || 
        event.operation.includes('XSS') ||
        event.operation.includes('SQL')
      );

      if (injectionEvents.length > 0) {
        detectedThreats.push({
          type: 'injection_attempt',
          severity: 'high',
          description: `${injectionEvents.length} potential injection attempts detected`,
          timestamp: new Date().toISOString(),
          details: { attempt_count: injectionEvents.length }
        });
      }

      // Auto-block suspicious IPs if critical threats detected
      const criticalThreats = detectedThreats.filter(t => t.severity === 'critical');
      if (criticalThreats.length > 0) {
        supabase.functions.invoke('enhanced-security-monitor', {
          body: { action: 'auto_block_ips' }
        }).then(({ data, error }) => {
          if (error) {
            console.error('Failed to auto-block IPs:', error);
          } else {
            console.log('Auto-blocked suspicious IPs:', data);
            if (data?.blocked_count > 0) {
              toast.success(`Automatically blocked ${data.blocked_count} suspicious IPs`);
            }
          }
        });
      }

      setThreats(detectedThreats);

      // Alert on critical threats
      if (criticalThreats.length > 0) {
        toast.error(`${criticalThreats.length} critical security threats detected!`);
      }
    } catch (error) {
      console.error('Failed to analyze threats:', error);
    }
  }, [events]);

  // Block suspicious IP
  const blockIP = useCallback(async (ipAddress: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: ipAddress,
          reason: reason,
          blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) {
        console.error('Error blocking IP:', error);
        toast.error('Failed to block IP address');
        return false;
      }

      // Log the blocking action
      await supabase.rpc('log_security_event', {
        p_event_type: 'IP_BLOCKED',
        p_table_name: 'blocked_ips',
        p_details: { ip_address: ipAddress, reason, severity: 'WARNING' }
      });

      toast.success(`IP ${ipAddress} has been blocked`);
      return true;
    } catch (error) {
      console.error('Failed to block IP:', error);
      return false;
    }
  }, []);

  // Start real-time monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    // Subscribe to audit logs for real-time updates
    const subscription = supabase
      .channel('security_monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'operation=in.(FAILED_LOGIN,BLOCKED_IP,SECURITY_VIOLATION,SUSPICIOUS_ACTIVITY,HIGH_RISK_INPUT_DETECTED)'
        },
        (payload) => {
          const newEvent: SecurityEvent = {
            id: payload.new.id,
            operation: payload.new.operation,
            table_name: payload.new.table_name || 'unknown',
            timestamp: payload.new.timestamp,
            user_id: payload.new.user_id,
            ip_address: payload.new.ip_address?.toString() || 'unknown',
            severity: payload.new.operation.includes('CRITICAL') ? 'CRITICAL' : 
                     payload.new.operation.includes('FAILED') ? 'WARNING' : 'INFO'
          };

          setEvents(prev => [newEvent, ...prev].slice(0, 50));
          
          // Show toast for critical events
          if (newEvent.severity === 'CRITICAL') {
            toast.error(`Critical security event: ${newEvent.operation}`);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      setIsMonitoring(false);
    };
  }, [isMonitoring]);

  // Initialize monitoring
  useEffect(() => {
    const initializeMonitoring = async () => {
      setIsLoading(true);
      await Promise.all([loadMetrics(), loadEvents()]);
      setIsLoading(false);
      
      const cleanup = startMonitoring();
      return cleanup;
    };

    const cleanup = initializeMonitoring();

    // Refresh metrics every 5 minutes
    const metricsInterval = setInterval(loadMetrics, 5 * 60 * 1000);

    return () => {
      metricsInterval && clearInterval(metricsInterval);
      cleanup?.then(fn => fn?.());
    };
  }, [loadMetrics, loadEvents, startMonitoring]);

  // Analyze threats when events change
  useEffect(() => {
    if (events.length > 0) {
      analyzeThreats();
    }
  }, [events, analyzeThreats]);

  return {
    metrics,
    events,
    threats,
    isLoading,
    isMonitoring,
    blockIP,
    refreshMetrics: loadMetrics,
    refreshEvents: loadEvents
  };
}