import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { action, data } = await req.json();
    console.log(`Security Monitor Action: ${action}`);

    switch (action) {
      case 'comprehensive_scan':
        return await performComprehensiveScan(supabaseClient);
      
      case 'monitor_failed_logins':
        return await monitorFailedLogins(supabaseClient);
        
      case 'check_suspicious_patterns':
        return await checkSuspiciousPatterns(supabaseClient);
        
      case 'validate_rls_policies':
        return await validateRLSPolicies(supabaseClient);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Security Monitor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function performComprehensiveScan(supabase: any) {
  const checks: SecurityCheck[] = [];

  // 1. Check for tables without RLS
  try {
    const { data: tables } = await supabase.rpc('get_tables_without_rls');
    if (tables && tables.length > 0) {
      checks.push({
        id: 'rls_missing',
        name: 'Tables without RLS',
        status: 'fail',
        message: `${tables.length} table(s) found without Row Level Security enabled`,
        severity: 'critical',
        remediation: 'Enable RLS on all public tables: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;'
      });
    } else {
      checks.push({
        id: 'rls_enabled',
        name: 'Row Level Security',
        status: 'pass',
        message: 'All tables have RLS enabled',
        severity: 'low'
      });
    }
  } catch (error) {
    checks.push({
      id: 'rls_check_error',
      name: 'RLS Check Error', 
      status: 'warn',
      message: 'Could not verify RLS status',
      severity: 'medium'
    });
  }

  // 2. Check for recent failed login attempts
  const { data: failedLogins } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('operation', 'LOGIN_FAILED')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (failedLogins && failedLogins.length > 10) {
    checks.push({
      id: 'excessive_failed_logins',
      name: 'Failed Login Attempts',
      status: 'warn',
      message: `${failedLogins.length} failed login attempts in the last 24 hours`,
      severity: 'medium',
      remediation: 'Review authentication logs and consider implementing rate limiting'
    });
  } else {
    checks.push({
      id: 'normal_login_activity',
      name: 'Login Activity',
      status: 'pass',
      message: 'Normal login activity detected',
      severity: 'low'
    });
  }

  // 3. Check for blocked IPs
  const { data: blockedIPs } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('is_active', true);

  checks.push({
    id: 'blocked_ips',
    name: 'IP Blocking Status',
    status: blockedIPs && blockedIPs.length > 0 ? 'warn' : 'pass',
    message: `${blockedIPs?.length || 0} IP addresses currently blocked`,
    severity: blockedIPs && blockedIPs.length > 5 ? 'medium' : 'low'
  });

  // 4. Check for suspicious activity patterns
  const { data: suspiciousActivity } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('operation', 'SUSPICIOUS_ACTIVITY')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (suspiciousActivity && suspiciousActivity.length > 0) {
    checks.push({
      id: 'suspicious_activity',
      name: 'Suspicious Activity',
      status: 'fail',
      message: `${suspiciousActivity.length} suspicious activities detected`,
      severity: 'high',
      remediation: 'Review suspicious activity logs and investigate potential security threats'
    });
  } else {
    checks.push({
      id: 'no_suspicious_activity',
      name: 'Activity Monitoring',
      status: 'pass',
      message: 'No suspicious activity detected',
      severity: 'low'
    });
  }

  // Calculate overall security score
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const securityScore = Math.round((passedChecks / totalChecks) * 100);

  // Log security scan results
  await supabase.from('audit_logs').insert({
    table_name: 'security_monitor',
    operation: 'SECURITY_SCAN_COMPLETED',
    new_values: {
      security_score: securityScore,
      checks_passed: passedChecks,
      total_checks: totalChecks,
      scan_timestamp: new Date().toISOString(),
      checks: checks
    }
  });

  return new Response(
    JSON.stringify({
      security_score: securityScore,
      checks: checks,
      summary: {
        total_checks: totalChecks,
        passed: passedChecks,
        warnings: checks.filter(c => c.status === 'warn').length,
        failures: checks.filter(c => c.status === 'fail').length
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  );
}

async function monitorFailedLogins(supabase: any) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: failedLogins } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('operation', 'LOGIN_FAILED')
    .gte('timestamp', twentyFourHoursAgo)
    .order('timestamp', { ascending: false });

  // Group by IP address to detect brute force attempts
  const ipGrouped = (failedLogins || []).reduce((acc: any, log: any) => {
    const ip = log.ip_address || 'unknown';
    if (!acc[ip]) acc[ip] = [];
    acc[ip].push(log);
    return acc;
  }, {});

  const suspiciousIPs = Object.entries(ipGrouped)
    .filter(([_, logs]: [string, any]) => logs.length > 5)
    .map(([ip, logs]: [string, any]) => ({ ip, attempts: logs.length }));

  return new Response(
    JSON.stringify({
      total_failed_logins: failedLogins?.length || 0,
      suspicious_ips: suspiciousIPs,
      timeline: failedLogins || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  );
}

async function checkSuspiciousPatterns(supabase: any) {
  // Look for patterns that might indicate malicious activity
  const patterns = [];

  // 1. Rapid successive operations from same IP
  const { data: rapidOperations } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
    .order('timestamp', { ascending: false });

  if (rapidOperations) {
    const ipOperations = rapidOperations.reduce((acc: any, log: any) => {
      const ip = log.ip_address || 'unknown';
      if (!acc[ip]) acc[ip] = 0;
      acc[ip]++;
      return acc;
    }, {});

    Object.entries(ipOperations).forEach(([ip, count]: [string, any]) => {
      if (count > 100) { // More than 100 operations per hour
        patterns.push({
          type: 'rapid_operations',
          ip,
          count,
          severity: 'high',
          message: `Excessive operations from IP ${ip}: ${count} operations in last hour`
        });
      }
    });
  }

  // 2. Unusual access patterns (accessing data outside normal hours)
  const currentHour = new Date().getHours();
  if (currentHour < 6 || currentHour > 22) { // Outside 6 AM - 10 PM
    const { data: nightActivity } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (nightActivity && nightActivity.length > 10) {
      patterns.push({
        type: 'unusual_hours',
        count: nightActivity.length,
        severity: 'medium',
        message: `Unusual activity during off-hours: ${nightActivity.length} operations`
      });
    }
  }

  return new Response(
    JSON.stringify({ patterns }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  );
}

async function validateRLSPolicies(supabase: any) {
  // This would require specific queries to check RLS policy effectiveness
  // For now, return a basic validation
  const validation = {
    tables_checked: 0,
    policies_validated: 0,
    issues_found: []
  };

  return new Response(
    JSON.stringify({ validation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
  );
}