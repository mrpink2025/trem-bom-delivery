import { Helmet } from 'react-helmet-async';

/**
 * Content Security Policy (CSP) Meta Component
 * Implements strict CSP headers to prevent XSS and other injection attacks
 */
export function CSPMeta() {
  // Define strict CSP directives
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.openai.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://ighllleypgbkluhcihvs.supabase.co wss://ighllleypgbkluhcihvs.supabase.co https://api.openai.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  const securityHeaders = {
    // Content Security Policy
    'Content-Security-Policy': cspDirectives,
    
    // Additional security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), microphone=(self), camera=(self)',
    
    // HSTS (only for HTTPS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };

  return (
    <Helmet>
      {Object.entries(securityHeaders).map(([name, content]) => (
        <meta 
          key={name}
          httpEquiv={name}
          content={content}
        />
      ))}
      
      {/* DNS Prefetch Control */}
      <meta httpEquiv="x-dns-prefetch-control" content="off" />
      
      {/* Prevent MIME type sniffing */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      
      {/* Security-focused viewport */}
      <meta 
        name="viewport" 
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />
    </Helmet>
  );
}