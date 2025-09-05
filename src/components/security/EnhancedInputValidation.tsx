import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;
}

interface ValidationRules {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  requiredFields?: string[];
  suspiciousPatterns?: RegExp[];
  sqlInjectionPatterns?: RegExp[];
  xssPatterns?: RegExp[];
}

// Enhanced security validation patterns
const SECURITY_PATTERNS = {
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /([\';]|\-\-|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*=.*(\bOR\b|\bAND\b)/i
  ],
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi
  ],
  suspicious: [
    /admin|root|password|123456|qwerty/gi,
    /\b\d{16}\b/, // Credit card patterns
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN patterns
    /(DROP|DELETE).*TABLE/gi
  ]
};

export function useEnhancedValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateInput = async (
    input: string | Record<string, any>,
    rules: ValidationRules = {}
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const inputString = typeof input === 'string' ? input : JSON.stringify(input);
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        riskScore: 0
      };

      // Length validation
      if (rules.maxLength && inputString.length > rules.maxLength) {
        result.errors.push(`Input exceeds maximum length of ${rules.maxLength} characters`);
        result.isValid = false;
        result.riskScore += 10;
      }

      if (rules.minLength && inputString.length < rules.minLength) {
        result.errors.push(`Input must be at least ${rules.minLength} characters`);
        result.isValid = false;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(inputString)) {
        result.errors.push('Input format is invalid');
        result.isValid = false;
        result.riskScore += 5;
      }

      // SQL Injection detection
      SECURITY_PATTERNS.sqlInjection.forEach(pattern => {
        if (pattern.test(inputString)) {
          result.errors.push('Potential SQL injection detected');
          result.isValid = false;
          result.riskScore += 50;
        }
      });

      // XSS detection
      SECURITY_PATTERNS.xss.forEach(pattern => {
        if (pattern.test(inputString)) {
          result.errors.push('Potential XSS payload detected');
          result.isValid = false;
          result.riskScore += 40;
        }
      });

      // Suspicious content detection
      SECURITY_PATTERNS.suspicious.forEach(pattern => {
        if (pattern.test(inputString)) {
          result.warnings.push('Input contains potentially suspicious content');
          result.riskScore += 15;
        }
      });

      // Log high-risk validation events
      if (result.riskScore > 30) {
        await supabase.rpc('log_security_event', {
          p_event_type: 'HIGH_RISK_INPUT_DETECTED',
          p_table_name: 'input_validation',
          p_details: {
            risk_score: result.riskScore,
            errors: result.errors,
            warnings: result.warnings,
            input_length: inputString.length,
            severity: result.riskScore > 50 ? 'CRITICAL' : 'WARNING'
          }
        });
      }

      return result;

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation service temporarily unavailable'],
        warnings: [],
        riskScore: 0
      };
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = async (
    formData: Record<string, any>,
    fieldRules: Record<string, ValidationRules> = {}
  ): Promise<Record<string, ValidationResult>> => {
    const results: Record<string, ValidationResult> = {};

    for (const [fieldName, value] of Object.entries(formData)) {
      const rules = fieldRules[fieldName] || {};
      results[fieldName] = await validateInput(value, rules);
    }

    return results;
  };

  return {
    validateInput,
    validateForm,
    isValidating,
    SECURITY_PATTERNS
  };
}

// Enhanced form validation component
export function EnhancedValidationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize client-side security monitoring
    const detectSuspiciousActivity = () => {
      // Monitor for rapid form submissions
      let formSubmissionCount = 0;
      const resetCount = () => { formSubmissionCount = 0; };
      
      document.addEventListener('submit', () => {
        formSubmissionCount++;
        if (formSubmissionCount > 10) {
          supabase.rpc('log_security_event', {
            p_event_type: 'RAPID_FORM_SUBMISSION',
            p_table_name: 'client_monitoring',
            p_details: { count: formSubmissionCount, severity: 'WARNING' }
          });
        }
      });

      // Reset counter every minute
      setInterval(resetCount, 60000);
    };

    detectSuspiciousActivity();
  }, []);

  return <>{children}</>;
}